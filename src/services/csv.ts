// Geração do CSV dos pontos (funções puras, sem dependência do Expo)
import { paraUtm } from './geodesia';

export interface PontoExportavel {
  id: string;
  nome: string;
  tipo: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  precisao: number | null;
  coletadoEm: string;
  atualizadoEm: string;
  responsavel: string;
  descricao: string;
  fotoUri: string | null;
  historico: unknown[];
}

const SEPARADOR = ';'; // padrão do Excel em português (a vírgula é o separador decimal)

// Escapa um campo: aspas, separador ou quebra de linha exigem aspas duplas
function campo(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (/[";\r\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

// Data/hora local em ISO 8601 com fuso (ex.: 2026-11-21T21:01:09-03:00)
export function isoLocal(iso: string): string {
  const data = new Date(iso);
  const d = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const offset = -data.getTimezoneOffset(); // minutos a leste de UTC
  const sinal = offset >= 0 ? '+' : '-';
  return (
    `${data.getFullYear()}-${d(data.getMonth() + 1)}-${d(data.getDate())}` +
    `T${d(data.getHours())}:${d(data.getMinutes())}:${d(data.getSeconds())}` +
    `${sinal}${d(offset / 60)}:${d(offset % 60)}`
  );
}

// Nome de arquivo seguro: sem acentos, espaços ou caracteres especiais
export function nomeSeguro(texto: string): string {
  return (
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'ponto'
  );
}

// Nome da foto dentro do ZIP (ex.: P001_divisa-norte-cerca.jpg)
export function nomeFoto(indice: number, nome: string): string {
  return `P${String(indice + 1).padStart(3, '0')}_${nomeSeguro(nome)}.jpg`;
}

const CABECALHO = [
  'codigo',
  'nome',
  'tipo',
  'latitude',
  'longitude',
  'altitude_m',
  'precisao_m',
  'utm_zona',
  'utm_leste_m',
  'utm_norte_m',
  'coletado_em',
  'atualizado_em',
  'responsavel',
  'observacoes',
  'foto',
  'recoletas',
];

// Gera o CSV. `comFotos` indica se a coluna "foto" deve apontar para o arquivo no ZIP.
export function gerarCsv(pontos: PontoExportavel[], comFotos: boolean): string {
  const linhas = pontos.map((p, i) => {
    const utm = paraUtm(p.latitude, p.longitude);
    return [
      `P${String(i + 1).padStart(3, '0')}`,
      p.nome,
      p.tipo,
      p.latitude.toFixed(8),
      p.longitude.toFixed(8),
      p.altitude != null ? p.altitude.toFixed(2) : '',
      p.precisao != null ? p.precisao.toFixed(2) : '',
      `${utm.zona}${utm.banda}`,
      utm.leste.toFixed(3),
      utm.norte.toFixed(3),
      isoLocal(p.coletadoEm),
      isoLocal(p.atualizadoEm),
      p.responsavel,
      p.descricao,
      p.fotoUri ? (comFotos ? `fotos/${nomeFoto(i, p.nome)}` : 'sim') : '',
      p.historico.length,
    ]
      .map(campo)
      .join(SEPARADOR);
  });

  // BOM (﻿) faz o Excel reconhecer UTF-8 e exibir os acentos corretamente
  return '﻿' + [CABECALHO.join(SEPARADOR), ...linhas].join('\r\n') + '\r\n';
}

export interface AreaExportavel {
  nome: string;
  observacoes: string;
  cor: string;
  vertices: { latitude: number; longitude: number }[];
  areaM2: number;
  perimetroM: number;
  criadoEm: string;
  atualizadoEm: string;
}

const CABECALHO_AREAS = [
  'codigo',
  'nome',
  'area_m2',
  'area_ha',
  'alqueire_mineiro',
  'perimetro_m',
  'vertices',
  'cor',
  'observacoes',
  'criado_em',
  'atualizado_em',
  'wkt',
];

// CSV das áreas. A coluna "wkt" traz o polígono em Well-Known Text (lon lat),
// formato que o QGIS lê direto como geometria.
export function gerarCsvAreas(areas: AreaExportavel[]): string {
  const linhas = areas.map((a, i) => {
    const anel = [...a.vertices, a.vertices[0]]
      .map((v) => `${v.longitude.toFixed(8)} ${v.latitude.toFixed(8)}`)
      .join(', ');
    return [
      `A${String(i + 1).padStart(3, '0')}`,
      a.nome,
      a.areaM2.toFixed(2),
      (a.areaM2 / 10000).toFixed(4),
      (a.areaM2 / 48400).toFixed(4),
      a.perimetroM.toFixed(2),
      a.vertices.length,
      a.cor,
      a.observacoes,
      isoLocal(a.criadoEm),
      isoLocal(a.atualizadoEm),
      `POLYGON((${anel}))`,
    ]
      .map(campo)
      .join(SEPARADOR);
  });
  return '﻿' + [CABECALHO_AREAS.join(SEPARADOR), ...linhas].join('\r\n') + '\r\n';
}

export function leiaMe(total: number, fotos: number, geradoEm: Date, areas = 0): string {
  return [
    'TerraPonto - Exportação de pontos de campo',
    `Gerado em: ${geradoEm.toLocaleString('pt-BR')}`,
    `Pontos: ${total} | Áreas: ${areas} | Fotos: ${fotos}`,
    '',
    'Conteúdo:',
    '  pontos.csv      -> uma linha por ponto (separador ";", codificação UTF-8)',
    '  areas.csv       -> uma linha por área, com a geometria em WKT (coluna "wkt")',
    '  terraponto.kml  -> pontos e áreas com nomes e cores (abre no Google Earth e no QGIS)',
    '  fotos/          -> fotos dos pontos; a coluna "foto" do CSV indica o arquivo',
    '',
    'Coordenadas:',
    '  latitude/longitude em graus decimais (WGS84 ~ SIRGAS 2000, ponto como separador decimal)',
    '  utm_leste_m / utm_norte_m em metros, na zona indicada em utm_zona',
    '  coletado_em / atualizado_em em ISO 8601, horário local com fuso (ex.: -03:00)',
    '',
    'Aviso: a precisão é uma estimativa do GPS do celular e não substitui',
    'um levantamento com receptor topográfico/RTK.',
    '',
  ].join('\r\n');
}
