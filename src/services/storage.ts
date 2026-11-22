import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// ================== Modelos de dados (camada Model) ==================

export interface Usuario {
  nome: string;
  email: string;
  senha: string;
}

export const TIPOS_PONTO = ['Marco', 'Divisa', 'Vértice', 'Árvore', 'Construção', 'Outro'] as const;
export type TipoPonto = (typeof TIPOS_PONTO)[number];

// Coleta substituída por uma recoleta (mantida para auditoria)
export interface ColetaAnterior {
  latitude: number;
  longitude: number;
  altitude: number | null;
  precisao: number | null;
  coletadoEm: string;
}

export interface Ponto {
  id: string;
  // Dados capturados pelo GPS do aparelho (não editáveis)
  latitude: number;
  longitude: number;
  altitude: number | null;
  precisao: number | null; // metros (estimativa do aparelho)
  coletadoEm: string; // ISO 8601
  // Detalhes preenchidos pelo usuário
  nome: string;
  tipo: TipoPonto;
  responsavel: string;
  descricao: string;
  fotoUri: string | null;
  atualizadoEm: string;
  historico: ColetaAnterior[]; // coletas anteriores, da mais recente para a mais antiga
}

export type DadosGps = Pick<Ponto, 'latitude' | 'longitude' | 'altitude' | 'precisao'>;
export type DetalhesPonto = Pick<Ponto, 'nome' | 'tipo' | 'responsavel' | 'descricao' | 'fotoUri'>;

const CHAVE_USUARIOS = '@terraponto:usuarios';
const chavePontos = (email: string) => `@terraponto:pontos:${email.toLowerCase()}`;
const PASTA_FOTOS = `${FileSystem.documentDirectory}fotos/`;

// ================== Usuários ==================

async function listarUsuarios(): Promise<Usuario[]> {
  const json = await AsyncStorage.getItem(CHAVE_USUARIOS);
  return json ? (JSON.parse(json) as Usuario[]) : [];
}

export async function cadastrarUsuario(usuario: Usuario): Promise<void> {
  const usuarios = await listarUsuarios();
  const email = usuario.email.trim().toLowerCase();

  if (usuarios.some((u) => u.email === email)) {
    throw new Error('Já existe uma conta com este e-mail.');
  }

  usuarios.push({ ...usuario, email });
  await AsyncStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios));
}

export async function autenticar(email: string, senha: string): Promise<Usuario> {
  const usuarios = await listarUsuarios();
  const usuario = usuarios.find((u) => u.email === email.trim().toLowerCase());

  if (!usuario || usuario.senha !== senha) {
    throw new Error('E-mail ou senha incorretos.');
  }

  return usuario;
}

// ================== Pontos de campo (CRUD) ==================

async function gravarPontos(email: string, pontos: Ponto[]) {
  await AsyncStorage.setItem(chavePontos(email), JSON.stringify(pontos));
}

// Garante compatibilidade com pontos salvos na versão anterior do app
function normalizar(p: Partial<Ponto> & { criadoEm?: string }): Ponto {
  const data = p.coletadoEm ?? p.criadoEm ?? new Date().toISOString();
  return {
    id: p.id ?? `${Date.now()}`,
    latitude: p.latitude ?? 0,
    longitude: p.longitude ?? 0,
    altitude: p.altitude ?? null,
    precisao: p.precisao ?? null,
    coletadoEm: data,
    nome: p.nome ?? 'Ponto',
    tipo: p.tipo ?? 'Marco',
    responsavel: p.responsavel ?? '',
    descricao: p.descricao ?? '',
    fotoUri: p.fotoUri ?? null,
    atualizadoEm: p.atualizadoEm ?? data,
    historico: p.historico ?? [],
  };
}

// READ - todos
export async function listarPontos(email: string): Promise<Ponto[]> {
  const json = await AsyncStorage.getItem(chavePontos(email));
  return json ? (JSON.parse(json) as Partial<Ponto>[]).map(normalizar) : [];
}

// READ - um
export async function obterPonto(email: string, id: string): Promise<Ponto | null> {
  const pontos = await listarPontos(email);
  return pontos.find((p) => p.id === id) ?? null;
}

// CREATE - a partir da leitura do GPS
export async function criarPonto(email: string, gps: DadosGps, responsavel: string): Promise<Ponto> {
  const pontos = await listarPontos(email);
  const agora = new Date().toISOString();
  const numero = String(pontos.length + 1).padStart(3, '0');

  const novo: Ponto = {
    ...gps,
    id: `${Date.now()}`,
    coletadoEm: agora,
    atualizadoEm: agora,
    nome: `Ponto ${numero}`,
    tipo: 'Marco',
    responsavel,
    descricao: '',
    fotoUri: null,
    historico: [],
  };

  await gravarPontos(email, [novo, ...pontos]);
  return novo;
}

// UPDATE - recoleta: substitui a localização por uma nova leitura do GPS
// e guarda a coleta anterior no histórico
export async function recoletarPonto(email: string, id: string, gps: DadosGps): Promise<Ponto> {
  const pontos = await listarPontos(email);
  const indice = pontos.findIndex((p) => p.id === id);
  if (indice < 0) throw new Error('Ponto não encontrado.');

  const anterior = pontos[indice];
  const agora = new Date().toISOString();
  const atualizado: Ponto = {
    ...anterior,
    ...gps,
    coletadoEm: agora,
    atualizadoEm: agora,
    historico: [
      {
        latitude: anterior.latitude,
        longitude: anterior.longitude,
        altitude: anterior.altitude,
        precisao: anterior.precisao,
        coletadoEm: anterior.coletadoEm,
      },
      ...anterior.historico,
    ],
  };
  pontos[indice] = atualizado;
  await gravarPontos(email, pontos);
  return atualizado;
}

// UPDATE - detalhes do ponto (coordenadas e hora da coleta não mudam)
export async function atualizarPonto(
  email: string,
  id: string,
  detalhes: DetalhesPonto,
): Promise<Ponto> {
  const pontos = await listarPontos(email);
  const indice = pontos.findIndex((p) => p.id === id);
  if (indice < 0) throw new Error('Ponto não encontrado.');

  const anterior = pontos[indice];
  // Se a foto foi trocada ou removida, apaga o arquivo antigo
  if (anterior.fotoUri && anterior.fotoUri !== detalhes.fotoUri) {
    await excluirArquivo(anterior.fotoUri);
  }

  const atualizado: Ponto = { ...anterior, ...detalhes, atualizadoEm: new Date().toISOString() };
  pontos[indice] = atualizado;
  await gravarPontos(email, pontos);
  return atualizado;
}

// DELETE
export async function excluirPonto(email: string, id: string): Promise<void> {
  const pontos = await listarPontos(email);
  const ponto = pontos.find((p) => p.id === id);
  if (ponto?.fotoUri) await excluirArquivo(ponto.fotoUri);
  await gravarPontos(
    email,
    pontos.filter((p) => p.id !== id),
  );
}

// ================== Fotos ==================

// Copia a foto do cache da câmera para a pasta permanente do app
export async function guardarFoto(uriTemporaria: string, pontoId: string): Promise<string> {
  const info = await FileSystem.getInfoAsync(PASTA_FOTOS);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PASTA_FOTOS, { intermediates: true });
  }
  const destino = `${PASTA_FOTOS}ponto_${pontoId}_${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uriTemporaria, to: destino });
  return destino;
}

export async function excluirArquivo(uri: string): Promise<void> {
  // Só apaga arquivos que pertencem ao app
  if (uri.startsWith(PASTA_FOTOS)) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
