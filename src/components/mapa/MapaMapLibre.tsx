import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  CameraRef,
  CircleLayer,
  FillLayer,
  LineLayer,
  MapView,
  MapViewRef,
  MarkerView,
  OfflineManager,
  RasterLayer,
  RasterSource,
  setConnected,
  ShapeSource,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';

import { colors } from '../../global/colors';
import { LatLng } from '../../services/geodesia';
import {
  MapaBaseProps,
  MapaBaseRef,
  Regiao,
  URL_ROTULOS,
  URL_RUAS,
  URL_SATELITE,
  ZOOM_MAX,
  ZOOM_MAX_IMAGEM,
  ZOOM_MAX_RUAS,
} from './tipos';

// MapLibre: motor de mapa aberto, sem chave de API. As imagens baixadas ficam no cache
// do próprio MapLibre (banco SQLite no aparelho) e continuam disponíveis sem internet.
OfflineManager.setMaximumAmbientCacheSize(300 * 1024 * 1024).catch(() => {});

// Estilo mínimo: só um fundo escuro. A imagem de satélite entra como camada (RasterSource).
const ESTILO = {
  version: 8,
  sources: {},
  layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#0B1220' } }],
};

const VAZIO: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

const paraPos = (c: LatLng): GeoJSON.Position => [c.longitude, c.latitude];
const anel = (v: LatLng[]): GeoJSON.Position[] => [...v.map(paraPos), paraPos(v[0])];

// Limites (nordeste/sudoeste) de uma região, no formato [lon, lat] do MapLibre
function limites(r: Regiao) {
  return {
    ne: [r.longitude + r.longitudeDelta / 2, r.latitude + r.latitudeDelta / 2],
    sw: [r.longitude - r.longitudeDelta / 2, r.latitude - r.latitudeDelta / 2],
  };
}

export const MapaMapLibre = forwardRef<MapaBaseRef, MapaBaseProps>(function MapaMapLibre(
  {
    regiaoInicial,
    camadaBase = 'satelite',
    areas = [],
    pontos = [],
    desenho,
    verticesEditaveis = [],
    corVertices = colors.laranjaMarco,
    mostrarRotulos = false,
    interativo = true,
    mostrarUsuario = false,
    onPronto,
    onToque,
    onToqueArea,
    onToquePonto,
    onMoverVertice,
    onRegiao,
    onLayout,
    style,
  },
  ref,
) {
  const camera = useRef<CameraRef>(null);
  const mapa = useRef<MapViewRef>(null);
  const container = useRef<View>(null);
  const [temPermissao, setTemPermissao] = useState(false);
  const inicial = useRef(limites(regiaoInicial)).current;
  // Região visível e posição do mapa na tela, para converter o dedo -> coordenada no arrasto
  const regiao = useRef<Regiao>(regiaoInicial);
  const caixa = useRef({ x: 0, y: 0, largura: 0, altura: 0 });

  const medir = useCallback(() => {
    container.current?.measure((_x, _y, largura, altura, x, y) => {
      caixa.current = { x, y, largura, altura };
    });
  }, []);

  const atualizarRegiao = (b: GeoJSON.Position[]) => {
    regiao.current = regiaoDoPayload(b);
    onRegiao?.(regiao.current);
  };

  // Posição do dedo (pageX/pageY) -> coordenada, pela projeção Web Mercator da região visível
  const telaParaCoord = useCallback((pageX: number, pageY: number): LatLng | null => {
    const { x: x0, y: y0, largura, altura } = caixa.current;
    const r = regiao.current;
    if (!largura || !altura) return null;
    const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const norte = mercY(r.latitude + r.latitudeDelta / 2);
    const sul = mercY(r.latitude - r.latitudeDelta / 2);
    const fx = (pageX - x0) / largura;
    const fy = (pageY - y0) / altura;
    const m = norte - fy * (norte - sul);
    return {
      latitude: ((2 * Math.atan(Math.exp(m)) - Math.PI / 2) * 180) / Math.PI,
      longitude: r.longitude - r.longitudeDelta / 2 + fx * r.longitudeDelta,
    };
  }, []);

  const arrastarVertice = useCallback(
    (indice: number, pageX: number, pageY: number) => {
      const c = telaParaCoord(pageX, pageY);
      if (c) onMoverVertice?.(indice, c);
    },
    [telaParaCoord, onMoverVertice],
  );

  // Sem conexão, avisa o MapLibre para usar só o cache (não fica tentando baixar)
  useEffect(
    () => NetInfo.addEventListener((estado) => setConnected(estado.isConnected !== false)),
    [],
  );

  // O ponto azul do usuário só pode ser ligado com a permissão já concedida
  useEffect(() => {
    if (!mostrarUsuario) return;
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => setTemPermissao(status === 'granted'))
      .catch(() => {});
  }, [mostrarUsuario]);

  useImperativeHandle(ref, () => ({
    irPara(c, delta = 0.003, animado = true) {
      const l = limites({ ...c, latitudeDelta: delta, longitudeDelta: delta });
      camera.current?.fitBounds(l.ne, l.sw, 0, animado ? 600 : 0);
    },
    centralizar(c) {
      camera.current?.moveTo(paraPos(c), 400);
    },
    enquadrar(coords, margens, animado = true) {
      if (coords.length === 0) return;
      if (coords.length === 1) {
        this.irPara(coords[0], 0.003, animado);
        return;
      }
      const lats = coords.map((c) => c.latitude);
      const lons = coords.map((c) => c.longitude);
      const m = margens ?? { top: 40, right: 40, bottom: 40, left: 40 };
      camera.current?.fitBounds(
        [Math.max(...lons), Math.max(...lats)],
        [Math.min(...lons), Math.min(...lats)],
        [m.top, m.right, m.bottom, m.left],
        animado ? 600 : 0,
      );
    },
  }));

  // ---------- GeoJSON das camadas ----------
  const geoAreas = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: areas
        .filter((a) => a.vertices.length >= 3)
        .map((a) => ({
          type: 'Feature',
          id: a.id,
          properties: { id: a.id, cor: a.cor, destaque: !!a.destaque },
          geometry: { type: 'Polygon', coordinates: [anel(a.vertices)] },
        })),
    }),
    [areas],
  );

  const geoPontos = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: pontos.map((p) => ({
        type: 'Feature',
        id: p.id,
        properties: { id: p.id },
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      })),
    }),
    [pontos],
  );

  const geoDesenho = useMemo<GeoJSON.FeatureCollection>(() => {
    const v = desenho?.vertices ?? [];
    if (v.length >= 3) {
      return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [anel(v)] } }],
      };
    }
    if (v.length === 2) {
      return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: v.map(paraPos) } }],
      };
    }
    return VAZIO;
  }, [desenho]);

  const idDoToque = (e: { features: GeoJSON.Feature[] }) =>
    (e.features[0]?.properties?.id as string | undefined) ?? (e.features[0]?.id as string | undefined);

  return (
    <View
      ref={container}
      style={[styles.container, style]}
      onLayout={(e) => {
        medir();
        onLayout?.(e);
      }}
    >
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        mapStyle={ESTILO}
        rotateEnabled={false}
        pitchEnabled={false} // vista sempre de cima (os rótulos da tela usam projeção 2D)
        scrollEnabled={interativo}
        zoomEnabled={interativo}
        attributionEnabled={false} // a atribuição é exibida pelo MapaBase
        logoEnabled={false}
        compassEnabled={false}
        onDidFinishLoadingMap={() => {
          mapa.current
            ?.getVisibleBounds()
            .then(atualizarRegiao)
            .catch(() => {});
          onPronto?.();
        }}
        onPress={(f) => {
          const c = (f.geometry as GeoJSON.Point).coordinates;
          onToque?.({ latitude: c[1], longitude: c[0] });
        }}
        onRegionIsChanging={(f) => atualizarRegiao(f.properties.visibleBounds)}
        onRegionDidChange={(f) => atualizarRegiao(f.properties.visibleBounds)}
      >
        <Camera
          ref={camera}
          defaultSettings={{ bounds: inicial }}
          maxZoomLevel={ZOOM_MAX}
          minZoomLevel={2}
        />

        <RasterSource
          id="satelite"
          tileUrlTemplates={[URL_SATELITE]}
          tileSize={256}
          maxZoomLevel={ZOOM_MAX_IMAGEM}
        >
          <RasterLayer
            id="satelite-camada"
            style={{ visibility: camadaBase === 'satelite' ? 'visible' : 'none' }}
          />
        </RasterSource>
        <RasterSource id="ruas" tileUrlTemplates={[URL_RUAS]} tileSize={256} maxZoomLevel={ZOOM_MAX_RUAS}>
          <RasterLayer id="ruas-camada" style={{ visibility: camadaBase === 'ruas' ? 'visible' : 'none' }} />
        </RasterSource>
        <RasterSource id="rotulos" tileUrlTemplates={[URL_ROTULOS]} tileSize={256} maxZoomLevel={ZOOM_MAX_IMAGEM}>
          <RasterLayer
            id="rotulos-camada"
            style={{ visibility: mostrarRotulos && camadaBase === 'satelite' ? 'visible' : 'none' }}
          />
        </RasterSource>

        {/* Áreas salvas: cor de cada uma vem da propriedade "cor" do GeoJSON */}
        <ShapeSource
          id="areas"
          shape={geoAreas}
          onPress={
            onToqueArea
              ? (e) => {
                  const id = idDoToque(e);
                  if (id) onToqueArea(id);
                }
              : undefined
          }
        >
          <FillLayer
            id="areas-preenchimento"
            style={{
              fillColor: ['get', 'cor'],
              fillOpacity: ['case', ['get', 'destaque'], 0.45, 0.22],
            }}
          />
          <LineLayer
            id="areas-borda"
            style={{
              lineColor: ['get', 'cor'],
              lineWidth: ['case', ['get', 'destaque'], 4, 2],
              lineJoin: 'round',
            }}
          />
        </ShapeSource>

        {/* Desenho em andamento */}
        <ShapeSource id="desenho" shape={geoDesenho}>
          <FillLayer
            id="desenho-preenchimento"
            filter={['==', ['geometry-type'], 'Polygon']}
            style={{ fillColor: desenho?.cor ?? corVertices, fillOpacity: 0.25 }}
          />
          <LineLayer
            id="desenho-borda"
            style={{ lineColor: desenho?.cor ?? corVertices, lineWidth: 3, lineJoin: 'round' }}
          />
        </ShapeSource>

        {/* Posição do usuário ANTES dos pontos: assim o ponto coletado fica por cima e
            recebe o toque mesmo quando está no mesmo lugar da bolinha azul. */}
        {mostrarUsuario && temPermissao && <UserLocation visible animated />}

        {/* Pontos coletados */}
        <ShapeSource
          id="pontos"
          shape={geoPontos}
          hitbox={{ width: 40, height: 40 }}
          onPress={
            onToquePonto
              ? (e) => {
                  const id = idDoToque(e);
                  if (id) onToquePonto(id);
                }
              : undefined
          }
        >
          <CircleLayer
            id="pontos-circulo"
            style={{
              circleRadius: 7,
              circleColor: colors.laranjaMarco,
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 3,
            }}
          />
        </ShapeSource>

        {/* Vértices do desenho. MarkerView desenha Views comuns sobre o mapa (o PointAnnotation
            não aparece no Android com o MapLibre v10); o arrasto é feito em JS: a cada movimento
            do dedo o vértice recebe a coordenada sob o dedo e o polígono acompanha ao vivo. */}
        {verticesEditaveis.map((v, i) => (
          <MarkerView key={`v-${i}`} coordinate={paraPos(v)} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
            <VerticeArrastavel indice={i} cor={corVertices} onInicio={medir} onArrastar={arrastarVertice} />
          </MarkerView>
        ))}
      </MapView>
    </View>
  );
});

// Vértice numerado que pode ser arrastado com o dedo. A cada movimento informa a posição
// do dedo na tela (pageX/pageY); o mapa converte em coordenada e o vértice vai junto.
function VerticeArrastavel({
  indice,
  cor,
  onInicio,
  onArrastar,
}: {
  indice: number;
  cor: string;
  onInicio: () => void;
  onArrastar: (indice: number, pageX: number, pageY: number) => void;
}) {
  const [arrastando, setArrastando] = useState(false);
  // O PanResponder é criado uma vez só (recriá-lo no meio do gesto perde o arrasto);
  // as funções mais recentes ficam numa ref.
  const atual = useRef({ indice, onInicio, onArrastar });
  atual.current = { indice, onInicio, onArrastar };

  const gesto = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false, // o mapa não "rouba" o arrasto
        onPanResponderGrant: () => {
          atual.current.onInicio(); // remede a posição do mapa na tela
          setArrastando(true);
        },
        onPanResponderMove: (_, g) => atual.current.onArrastar(atual.current.indice, g.moveX, g.moveY),
        onPanResponderRelease: () => setArrastando(false),
        onPanResponderTerminate: () => setArrastando(false),
      }),
    [],
  );

  return (
    <View {...gesto.panHandlers} style={styles.verticeToque}>
      <View style={[styles.vertice, { borderColor: cor }, arrastando && styles.verticeArrastando]}>
        <Text style={styles.verticeTexto}>{indice + 1}</Text>
      </View>
    </View>
  );
}

function regiaoDoPayload(b: GeoJSON.Position[]): Regiao {
  const [ne, sw] = b;
  return {
    latitude: (ne[1] + sw[1]) / 2,
    longitude: (ne[0] + sw[0]) / 2,
    latitudeDelta: Math.abs(ne[1] - sw[1]),
    longitudeDelta: Math.abs(ne[0] - sw[0]),
  };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B1220',
    flex: 1,
    overflow: 'hidden',
  },
  // área de toque maior que a bolinha (44 dp, tamanho mínimo recomendado)
  verticeToque: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  verticeArrastando: {
    transform: [{ scale: 1.3 }],
  },
  vertice: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 3,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  verticeTexto: {
    color: colors.azulGnss,
    fontSize: 11,
    fontWeight: '800',
  },
});
