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

// Converte graus decimais para graus, minutos e segundos (ex.: 18°38'55.0"S)
export function paraGMS(valor: number, eixo: 'lat' | 'lon'): string {
  const hemisferio = eixo === 'lat' ? (valor < 0 ? 'S' : 'N') : valor < 0 ? 'O' : 'L';
  const abs = Math.abs(valor);
  const graus = Math.floor(abs);
  const minutosDec = (abs - graus) * 60;
  const minutos = Math.floor(minutosDec);
  const segundos = (minutosDec - minutos) * 60;
  return `${graus}°${String(minutos).padStart(2, '0')}'${segundos.toFixed(1).padStart(4, '0')}"${hemisferio}`;
}

// Semáforo de precisão (sempre com ícone + texto + cor)
export function classificarPrecisao(precisao: number | null) {
  if (precisao === null) return { cor: colors.cinzaPrecisao, icone: '⚪', texto: 'Sem estimativa' };
  if (precisao <= 5) return { cor: colors.verdeCampo, icone: '🟢', texto: 'Boa precisão' };
  if (precisao <= 15) return { cor: '#D97706', icone: '🟠', texto: 'Precisão moderada' };
  return { cor: colors.vermelhoErro, icone: '🔴', texto: 'Precisão baixa' };
}

export const ICONE_TIPO: Record<string, string> = {
  Marco: '📍',
  Divisa: '🚧',
  Vértice: '📐',
  Árvore: '🌳',
  Construção: '🏠',
  Outro: '📌',
};
