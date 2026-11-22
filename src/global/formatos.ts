import { colors } from './colors';

// Funções de formatação usadas em várias telas

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Converte graus decimais para graus, minutos e segundos (ex.: 18°38'55,0"S)
export function paraGMS(valor: number, eixo: 'lat' | 'lon'): string {
  const hemisferio = eixo === 'lat' ? (valor < 0 ? 'S' : 'N') : valor < 0 ? 'O' : 'L';
  const abs = Math.abs(valor);
  const graus = Math.floor(abs);
  const minutosDec = (abs - graus) * 60;
  const minutos = Math.floor(minutosDec);
  const segundos = (minutosDec - minutos) * 60;
  const seg = segundos.toFixed(1).padStart(4, '0').replace('.', ',');
  return `${graus}°${String(minutos).padStart(2, '0')}'${seg}"${hemisferio}`;
}

/** Distância/altura em metros com vírgula decimal (ex.: "950,0 m"). */
export const metrosBR = (valor: number, casas = 1) => `${numeroBR(valor, casas)} m`;

// Semáforo de precisão (sempre com ícone + texto + cor)
export function classificarPrecisao(precisao: number | null) {
  if (precisao === null) return { cor: colors.cinzaPrecisao, icone: '⚪', texto: 'Sem estimativa' };
  if (precisao <= 5) return { cor: colors.verdeCampo, icone: '🟢', texto: 'Boa precisão' };
  if (precisao <= 15) return { cor: '#D97706', icone: '🟠', texto: 'Precisão moderada' };
  return { cor: colors.vermelhoErro, icone: '🔴', texto: 'Precisão baixa' };
}

// Número no padrão brasileiro (1.234,56)
export function numeroBR(valor: number, casas = 2): string {
  const [inteiro, decimal] = valor.toFixed(casas).split('.');
  const comPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal ? `${comPontos},${decimal}` : comPontos;
}

// Área em hectares (ou m² quando pequena) para etiquetas
export function formatarArea(m2: number): string {
  if (m2 < 10000) return `${numeroBR(m2, 0)} m²`;
  return `${numeroBR(m2 / 10000, 2)} ha`;
}

export function formatarDistancia(m: number): string {
  if (m < 1000) return `${numeroBR(m, 1)} m`;
  return `${numeroBR(m / 1000, 3)} km`;
}

export const ICONE_TIPO: Record<string, string> = {
  Marco: '📍',
  Divisa: '🚧',
  Vértice: '📐',
  Árvore: '🌳',
  Construção: '🏠',
  Outro: '📌',
};
