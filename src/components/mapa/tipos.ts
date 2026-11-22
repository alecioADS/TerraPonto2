import { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';

import { LatLng } from '../../services/geodesia';

// Contrato comum dos dois motores de mapa (MapLibre no APK, react-native-maps no Expo Go).
// As telas só conhecem estes tipos, nunca a biblioteca de mapa diretamente.

export interface Regiao {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface AreaMapa {
  id: string;
  vertices: LatLng[];
  cor: string; // '#RRGGBB'
  destaque?: boolean;
}

export interface PontoMapa {
  id: string;
  latitude: number;
  longitude: number;
}

/** Polígono (3+ vértices) ou linha (2 vértices) do desenho em andamento. */
export interface DesenhoMapa {
  vertices: LatLng[];
  cor: string;
}

export interface Margens {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Imagem de fundo: satélite (Esri) ou mapa de ruas (OpenStreetMap). */
export type CamadaBase = 'satelite' | 'ruas';

export interface MapaBaseProps {
  regiaoInicial: Regiao;
  camadaBase?: CamadaBase;
  areas?: AreaMapa[];
  pontos?: PontoMapa[];
  desenho?: DesenhoMapa | null;
  /** Vértices numerados e arrastáveis (segurar e arrastar). */
  verticesEditaveis?: LatLng[];
  corVertices?: string;
  mostrarRotulos?: boolean;
  /** false = mapa estático (sem gestos), usado nas prévias. */
  interativo?: boolean;
  mostrarUsuario?: boolean;
  onPronto?: () => void;
  onToque?: (c: LatLng) => void;
  /** Sem handler, as áreas não recebem toque (o toque vai para o mapa). */
  onToqueArea?: (id: string) => void;
  onToquePonto?: (id: string) => void;
  onMoverVertice?: (indice: number, c: LatLng) => void;
  onRegiao?: (r: Regiao) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}

export interface MapaBaseRef {
  /** Centraliza em c mostrando aproximadamente `delta` graus de lado. */
  irPara: (c: LatLng, delta?: number, animado?: boolean) => void;
  /** Move o centro sem mudar o zoom. */
  centralizar: (c: LatLng) => void;
  /** Enquadra todas as coordenadas, respeitando as margens (em dp). */
  enquadrar: (coords: LatLng[], margens?: Margens, animado?: boolean) => void;
}

export const URL_SATELITE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
// Mesmo servidor de ruas usado no CortexGeo. Política de uso do OSM: uso leve, com atribuição.
export const URL_RUAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const ZOOM_MAX_RUAS = 19;
export const URL_ROTULOS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export const ZOOM_MAX_IMAGEM = 18; // acima disso a imagem do zoom 18 é ampliada
export const ZOOM_MAX = 20;

/** Região que enquadra as coordenadas, com folga nas bordas. */
export function regiaoPara(coords: LatLng[], folga = 1.6, minimo = 0.004): Regiao {
  const lats = coords.map((c) => c.latitude);
  const lons = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * folga, minimo),
    longitudeDelta: Math.max((maxLon - minLon) * folga, minimo),
  };
}

/** '#RRGGBB' -> 'rgba(r,g,b,a)' */
export function comAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
