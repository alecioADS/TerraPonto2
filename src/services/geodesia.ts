// Cálculos geodésicos usados pelo app (WGS84 ≈ SIRGAS 2000).
// Fórmulas da projeção Transversa de Mercator: J. P. Snyder,
// "Map Projections – A Working Manual", USGS Professional Paper 1395 (1987), pp. 57-64.

const A = 6378137.0; // semieixo maior WGS84 (m)
const F = 1 / 298.257223563; // achatamento WGS84
const E2 = F * (2 - F); // primeira excentricidade ao quadrado
const EP2 = E2 / (1 - E2); // segunda excentricidade ao quadrado
const K0 = 0.9996; // fator de escala no meridiano central (UTM)
const FALSO_LESTE = 500000;
const FALSO_NORTE_SUL = 10000000;
const RAIO_MEDIO = 6371008.8; // raio médio da Terra (IUGG) para distâncias curtas

const rad = (graus: number) => (graus * Math.PI) / 180;

export interface CoordenadaUtm {
  zona: number;
  hemisferio: 'N' | 'S';
  banda: string; // letra da faixa de latitude (ex.: K)
  leste: number; // E (m)
  norte: number; // N (m)
}

export function zonaUtm(longitude: number): number {
  return Math.min(60, Math.floor((longitude + 180) / 6) + 1);
}

function bandaLatitude(latitude: number): string {
  const letras = 'CDEFGHJKLMNPQRSTUVWXX';
  const i = Math.floor((latitude + 80) / 8);
  return letras[Math.max(0, Math.min(letras.length - 1, i))];
}

// Converte coordenadas geográficas (graus decimais) para UTM
export function paraUtm(latitude: number, longitude: number): CoordenadaUtm {
  const zona = zonaUtm(longitude);
  const lon0 = rad((zona - 1) * 6 - 180 + 3); // meridiano central da zona
  const phi = rad(latitude);
  const lambda = rad(longitude);

  const sen = Math.sin(phi);
  const cos = Math.cos(phi);
  const tan = Math.tan(phi);

  const N = A / Math.sqrt(1 - E2 * sen * sen);
  const T = tan * tan;
  const C = EP2 * cos * cos;
  const Aa = cos * (lambda - lon0);

  const e4 = E2 * E2;
  const e6 = e4 * E2;
  const M =
    A *
    ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi));

  const leste =
    FALSO_LESTE +
    K0 *
      N *
      (Aa +
        ((1 - T + C) * Aa ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5) / 120);

  let norte =
    K0 *
    (M +
      N *
        tan *
        ((Aa * Aa) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Aa ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6) / 720));

  const hemisferio = latitude < 0 ? 'S' : 'N';
  if (hemisferio === 'S') norte += FALSO_NORTE_SUL;

  return { zona, hemisferio, banda: bandaLatitude(latitude), leste, norte };
}

// Distância horizontal entre dois pontos (fórmula de Haversine), em metros
export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_MEDIO * Math.asin(Math.sqrt(a));
}

// Azimute (rumo) de 1 para 2, em graus a partir do Norte
export function azimuteGraus(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p1 = rad(lat1);
  const p2 = rad(lat2);
  const dL = rad(lon2 - lon1);
  const y = Math.sin(dL) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dL);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ======================= Polígonos =======================

export interface LatLng {
  latitude: number;
  longitude: number;
}

// Projeta os vértices num plano tangente local (Leste/Norte em metros) centrado em
// (lat0, lon0), usando os raios de curvatura do elipsóide WGS84 naquela latitude:
//   M = a(1-e²)/(1-e²sen²φ)^(3/2)  (meridiano)   N = a/(1-e²sen²φ)^(1/2)  (primeiro vertical)
// Para áreas de propriedades rurais (até dezenas de km) o erro é desprezível e,
// diferente do UTM, não carrega o fator de escala da projeção (área "real" no elipsóide).
function planoLocal(vertices: LatLng[]): { x: number; y: number }[] {
  const lat0 = vertices.reduce((s, v) => s + v.latitude, 0) / vertices.length;
  const lon0 = vertices.reduce((s, v) => s + v.longitude, 0) / vertices.length;
  const sen = Math.sin(rad(lat0));
  const w = 1 - E2 * sen * sen;
  const M = (A * (1 - E2)) / Math.pow(w, 1.5);
  const N = A / Math.sqrt(w);
  const cos0 = Math.cos(rad(lat0));
  return vertices.map((v) => ({
    x: rad(v.longitude - lon0) * N * cos0,
    y: rad(v.latitude - lat0) * M,
  }));
}

// Área (m²) pela fórmula de Gauss (shoelace) no plano local
export function areaPoligono(vertices: LatLng[]): number {
  if (vertices.length < 3) return 0;
  const p = planoLocal(vertices);
  let soma = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    soma += p[i].x * p[j].y - p[j].x * p[i].y;
  }
  return Math.abs(soma) / 2;
}

// Perímetro (m). Com `fechado=false` mede só a linha (útil durante o desenho).
export function perimetroPoligono(vertices: LatLng[], fechado = true): number {
  if (vertices.length < 2) return 0;
  const p = planoLocal(vertices);
  let total = 0;
  const n = fechado ? p.length : p.length - 1;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % p.length;
    total += Math.hypot(p[j].x - p[i].x, p[j].y - p[i].y);
  }
  return total;
}

// Centro de massa do polígono (para posicionar a etiqueta no mapa)
export function centroPoligono(vertices: LatLng[]): LatLng {
  const n = vertices.length;
  const media = {
    latitude: vertices.reduce((s, v) => s + v.latitude, 0) / n,
    longitude: vertices.reduce((s, v) => s + v.longitude, 0) / n,
  };
  if (n < 3) return media;

  let a2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const xi = vertices[i].longitude;
    const yi = vertices[i].latitude;
    const xj = vertices[(i + 1) % n].longitude;
    const yj = vertices[(i + 1) % n].latitude;
    const cruz = xi * yj - xj * yi;
    a2 += cruz;
    cx += (xi + xj) * cruz;
    cy += (yi + yj) * cruz;
  }
  if (Math.abs(a2) < 1e-14) return media;
  return { latitude: cy / (3 * a2), longitude: cx / (3 * a2) };
}

// Verifica se algum lado cruza outro lado não adjacente (polígono "em forma de 8")
export function temAutointersecao(vertices: LatLng[]): boolean {
  const n = vertices.length;
  if (n < 4) return false;
  const p = planoLocal(vertices);
  const orient = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));

  for (let i = 0; i < n; i++) {
    const a1 = p[i];
    const a2 = p[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // ignora lados adjacentes (compartilham um vértice)
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      const b1 = p[j];
      const b2 = p[(j + 1) % n];
      if (
        orient(a1, a2, b1) * orient(a1, a2, b2) < 0 &&
        orient(b1, b2, a1) * orient(b1, b2, a2) < 0
      ) {
        return true;
      }
    }
  }
  return false;
}

// Unidades agrárias usadas no Brasil
export const M2_POR_HECTARE = 10000;
export const M2_POR_ALQUEIRE_MINEIRO = 48400; // MG, GO, RJ
export const M2_POR_ALQUEIRE_PAULISTA = 24200; // SP, PR
