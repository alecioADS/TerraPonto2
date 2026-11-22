import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';

import { gerarCsv, gerarCsvAreas, leiaMe, nomeFoto } from './csv';
import { gerarKml } from './kml';
import { Poligono } from './poligonos';
import { Ponto } from './storage';

export interface ArquivoExportado {
  uri: string; // arquivo temporário no cache do app
  nome: string;
  mimeType: string;
  fotos: number;
  faltando: number; // fotos registradas que não existem mais no aparelho
}

export type Destino = 'compartilhar' | 'salvar';

// "Salvar no aparelho" usa o seletor de pastas do Android (Storage Access Framework)
export const podeSalvarNoAparelho = Platform.OS === 'android';

function carimbo(data: Date): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}${d(data.getMonth() + 1)}${d(data.getDate())}_${d(data.getHours())}${d(data.getMinutes())}`;
}

// Gera somente a planilha CSV
export async function gerarArquivoCsv(pontos: Ponto[]): Promise<ArquivoExportado> {
  if (pontos.length === 0) throw new Error('Não há pontos para exportar.');

  const nome = `terraponto_pontos_${carimbo(new Date())}.csv`;
  const uri = `${FileSystem.cacheDirectory}${nome}`;
  await FileSystem.writeAsStringAsync(uri, gerarCsv(pontos, false), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { uri, nome, mimeType: 'text/csv', fotos: 0, faltando: 0 };
}

// Gera um KML com pontos e áreas (Google Earth / QGIS)
export async function gerarArquivoKml(pontos: Ponto[], areas: Poligono[]): Promise<ArquivoExportado> {
  if (pontos.length === 0 && areas.length === 0) throw new Error('Não há pontos nem áreas para exportar.');

  const agora = new Date();
  const nome = `terraponto_${carimbo(agora)}.kml`;
  const uri = `${FileSystem.cacheDirectory}${nome}`;
  await FileSystem.writeAsStringAsync(uri, gerarKml(pontos, areas, `TerraPonto ${agora.toLocaleDateString('pt-BR')}`), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { uri, nome, mimeType: 'application/vnd.google-earth.kml+xml', fotos: 0, faltando: 0 };
}

// Gera um ZIP com pontos.csv + areas.csv + KML + pasta de fotos + LEIA-ME
export async function gerarArquivoZip(pontos: Ponto[], areas: Poligono[] = []): Promise<ArquivoExportado> {
  if (pontos.length === 0 && areas.length === 0) throw new Error('Não há pontos nem áreas para exportar.');

  const agora = new Date();
  const zip = new JSZip();
  const pastaFotos = zip.folder('fotos');
  let fotos = 0;
  let faltando = 0;

  for (let i = 0; i < pontos.length; i++) {
    const uri = pontos[i].fotoUri;
    if (!uri) continue;
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      faltando++;
      continue;
    }
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    pastaFotos?.file(nomeFoto(i, pontos[i].nome), base64, { base64: true });
    fotos++;
  }

  zip.file('pontos.csv', gerarCsv(pontos, true));
  if (areas.length > 0) zip.file('areas.csv', gerarCsvAreas(areas));
  zip.file('terraponto.kml', gerarKml(pontos, areas, `TerraPonto ${agora.toLocaleDateString('pt-BR')}`));
  zip.file('LEIA-ME.txt', leiaMe(pontos.length, fotos, agora, areas.length));

  // JPG já é comprimido: "STORE" evita gastar CPU/bateria sem ganho de tamanho
  const conteudo = await zip.generateAsync({ type: 'base64', compression: 'STORE' });
  const nome = `terraponto_exportacao_${carimbo(agora)}.zip`;
  const uri = `${FileSystem.cacheDirectory}${nome}`;
  await FileSystem.writeAsStringAsync(uri, conteudo, { encoding: FileSystem.EncodingType.Base64 });

  return { uri, nome, mimeType: 'application/zip', fotos, faltando };
}

// Abre a folha de compartilhamento (WhatsApp, e-mail, Drive...)
async function compartilhar(arquivo: ArquivoExportado): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('O compartilhamento de arquivos não está disponível neste aparelho.');
  }
  await Sharing.shareAsync(arquivo.uri, { mimeType: arquivo.mimeType, dialogTitle: arquivo.nome });
}

// Salva o arquivo numa pasta escolhida pelo usuário (Android). Retorna false se ele cancelar.
async function salvarNoAparelho(arquivo: ArquivoExportado): Promise<boolean> {
  const SAF = FileSystem.StorageAccessFramework;
  const permissao = await SAF.requestDirectoryPermissionsAsync();
  if (!permissao.granted) return false;

  const nomeSemExtensao = arquivo.nome.replace(/\.[^.]+$/, '');
  const destino = await SAF.createFileAsync(permissao.directoryUri, nomeSemExtensao, arquivo.mimeType);
  const base64 = await FileSystem.readAsStringAsync(arquivo.uri, { encoding: FileSystem.EncodingType.Base64 });
  await FileSystem.writeAsStringAsync(destino, base64, { encoding: FileSystem.EncodingType.Base64 });
  return true;
}

// Entrega o arquivo gerado ao destino escolhido e limpa o temporário
// O temporário fica na pasta de cache (o sistema limpa quando precisar), pois apps como
// o Gmail só leem o anexo no momento do envio.
export async function entregarArquivo(arquivo: ArquivoExportado, destino: Destino): Promise<boolean> {
  if (destino === 'salvar') return salvarNoAparelho(arquivo);
  await compartilhar(arquivo);
  return true;
}
