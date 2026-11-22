/**
 * Persistência das áreas/polígonos (Model) — CRUD no AsyncStorage, por usuário
 * (`@terraponto:poligonos:<email>`).
 *
 * A área (m²) e o perímetro (m) são calculados aqui sempre que os vértices mudam
 * (services/geodesia.ts) e guardados junto, para a lista não recalcular tudo.
 * Novas áreas recebem nome automático ("Área 01", "Área 02"...) e a próxima cor da paleta.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { areaPoligono, LatLng, perimetroPoligono } from './geodesia';

// Paleta de cores para os polígonos (boa visibilidade sobre imagem de satélite)
export const CORES_POLIGONO = [
  '#FF6A00', // laranja marco
  '#FACC15', // amarelo
  '#22C55E', // verde
  '#38BDF8', // azul claro
  '#A855F7', // roxo
  '#F43F5E', // vermelho rosado
  '#FFFFFF', // branco
] as const;

export interface Poligono {
  id: string;
  nome: string;
  observacoes: string;
  cor: string;
  vertices: LatLng[];
  areaM2: number;
  perimetroM: number;
  criadoEm: string;
  atualizadoEm: string;
}

export type DetalhesPoligono = Pick<Poligono, 'nome' | 'observacoes' | 'cor'>;

const chave = (email: string) => `@terraponto:poligonos:${email.toLowerCase()}`;

async function gravar(email: string, lista: Poligono[]) {
  await AsyncStorage.setItem(chave(email), JSON.stringify(lista));
}

// READ - todos
export async function listarPoligonos(email: string): Promise<Poligono[]> {
  const json = await AsyncStorage.getItem(chave(email));
  return json ? (JSON.parse(json) as Poligono[]) : [];
}

// READ - um
export async function obterPoligono(email: string, id: string): Promise<Poligono | null> {
  return (await listarPoligonos(email)).find((p) => p.id === id) ?? null;
}

// CREATE - a partir dos vértices desenhados no mapa
export async function criarPoligono(email: string, vertices: LatLng[]): Promise<Poligono> {
  const lista = await listarPoligonos(email);
  const agora = new Date().toISOString();
  const novo: Poligono = {
    id: `${Date.now()}`,
    nome: `Área ${String(lista.length + 1).padStart(2, '0')}`,
    observacoes: '',
    cor: CORES_POLIGONO[lista.length % CORES_POLIGONO.length],
    vertices,
    areaM2: areaPoligono(vertices),
    perimetroM: perimetroPoligono(vertices),
    criadoEm: agora,
    atualizadoEm: agora,
  };
  await gravar(email, [novo, ...lista]);
  return novo;
}

async function alterar(email: string, id: string, mudanca: (p: Poligono) => Poligono): Promise<Poligono> {
  const lista = await listarPoligonos(email);
  const i = lista.findIndex((p) => p.id === id);
  if (i < 0) throw new Error('Polígono não encontrado.');
  lista[i] = { ...mudanca(lista[i]), atualizadoEm: new Date().toISOString() };
  await gravar(email, lista);
  return lista[i];
}

// UPDATE - nome, observações e cor
export function atualizarPoligono(email: string, id: string, detalhes: DetalhesPoligono) {
  return alterar(email, id, (p) => ({ ...p, ...detalhes }));
}

// UPDATE - geometria (recalcula área e perímetro)
export function atualizarVertices(email: string, id: string, vertices: LatLng[]) {
  return alterar(email, id, (p) => ({
    ...p,
    vertices,
    areaM2: areaPoligono(vertices),
    perimetroM: perimetroPoligono(vertices),
  }));
}

// DELETE
export async function excluirPoligono(email: string, id: string): Promise<void> {
  const lista = await listarPoligonos(email);
  await gravar(
    email,
    lista.filter((p) => p.id !== id),
  );
}
