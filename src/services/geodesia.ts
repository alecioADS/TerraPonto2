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
