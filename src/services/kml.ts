// Geração de KML (Google Earth / QGIS) — funções puras, sem dependência do Expo.
// Especificação: OGC KML 2.2. Coordenadas em "lon,lat[,alt]" (WGS84).

export interface PontoKml {
  nome: string;
  tipo: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  precisao: number | null;
  coletadoEm: string;
  responsavel: string;
  descricao: string;
}

export interface PoligonoKml {
  nome: string;
  observacoes: string;
  cor: string; // #RRGGBB
  vertices: { latitude: number; longitude: number }[];
  areaM2: number;
  perimetroM: number;
}

// Escapa texto para XML
function xml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// KML usa cor no formato aabbggrr (alfa, azul, verde, vermelho)
export function corKml(hex: string, alfa: number): string {
  const limpo = hex.replace('#', '').padStart(6, '0').slice(0, 6);
  const r = limpo.slice(0, 2);
  const g = limpo.slice(2, 4);
  const b = limpo.slice(4, 6);
  const a = Math.round(Math.max(0, Math.min(1, alfa)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${a}${b}${g}${r}`.toLowerCase();
}

const num = (v: number, casas: number) => v.toFixed(casas);

function dados(campos: [string, string][]): string {
  const itens = campos
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `        <Data name="${xml(k)}"><value>${xml(v)}</value></Data>`)
    .join('\n');
  return itens ? `      <ExtendedData>\n${itens}\n      </ExtendedData>\n` : '';
}

export function gerarKml(pontos: PontoKml[], poligonos: PoligonoKml[], titulo = 'TerraPonto'): string {
  const estilosArea = poligonos
    .map(
      (p, i) => `    <Style id="area${i}">
      <LineStyle><color>${corKml(p.cor, 1)}</color><width>3</width></LineStyle>
      <PolyStyle><color>${corKml(p.cor, 0.35)}</color></PolyStyle>
    </Style>`,
    )
    .join('\n');

  const placemarksPontos = pontos
    .map((p) => {
      const coord = `${num(p.longitude, 8)},${num(p.latitude, 8)}${p.altitude != null ? `,${num(p.altitude, 2)}` : ''}`;
      return `    <Placemark>
      <name>${xml(p.nome)}</name>
      <description>${xml(p.descricao)}</description>
      <TimeStamp><when>${xml(p.coletadoEm)}</when></TimeStamp>
      <styleUrl>#ponto</styleUrl>
${dados([
  ['tipo', p.tipo],
  ['altitude_m', p.altitude != null ? num(p.altitude, 2) : ''],
  ['precisao_m', p.precisao != null ? num(p.precisao, 2) : ''],
  ['responsavel', p.responsavel],
])}      <Point><coordinates>${coord}</coordinates></Point>
    </Placemark>`;
    })
    .join('\n');

  const placemarksAreas = poligonos
    .map((p, i) => {
      // O anel precisa ser fechado: o último vértice repete o primeiro
      const anel = [...p.vertices, p.vertices[0]]
        .map((v) => `${num(v.longitude, 8)},${num(v.latitude, 8)},0`)
        .join(' ');
      return `    <Placemark>
      <name>${xml(p.nome)}</name>
      <description>${xml(`${num(p.areaM2 / 10000, 4)} ha${p.observacoes ? ` — ${p.observacoes}` : ''}`)}</description>
      <styleUrl>#area${i}</styleUrl>
${dados([
  ['area_m2', num(p.areaM2, 2)],
  ['area_ha', num(p.areaM2 / 10000, 4)],
  ['perimetro_m', num(p.perimetroM, 2)],
  ['observacoes', p.observacoes],
])}      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs><LinearRing><coordinates>${anel}</coordinates></LinearRing></outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xml(titulo)}</name>
    <Style id="ponto">
      <IconStyle><color>ff006aff</color><scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/orange-circle.png</href></Icon>
      </IconStyle>
    </Style>
${estilosArea}
    <Folder>
      <name>Pontos (${pontos.length})</name>
${placemarksPontos}
    </Folder>
    <Folder>
      <name>Áreas (${poligonos.length})</name>
${placemarksAreas}
    </Folder>
  </Document>
</kml>
`;
}
