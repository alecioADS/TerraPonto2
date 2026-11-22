import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { colors } from '../global/colors';
import {
  ArquivoExportado,
  Destino,
  entregarArquivo,
  gerarArquivoCsv,
  gerarArquivoKml,
  gerarArquivoZip,
  podeSalvarNoAparelho,
} from '../services/exportacao';
import { listarPoligonos } from '../services/poligonos';
import { listarPontos } from '../services/storage';

type Tipo = 'csv' | 'kml' | 'zip';

const MENSAGENS: Record<Tipo, string> = {
  csv: 'Gerando planilha CSV...',
  kml: 'Gerando arquivo KML...',
  zip: 'Compactando pontos, áreas e fotos...',
};

// Hook com todo o fluxo de exportação (usado em "Meus pontos" e em "Áreas").
// Sempre lê os dados mais recentes do armazenamento no momento de exportar.
export function useExportacao() {
  const { usuario } = useAuth();
  const [exportando, setExportando] = useState<string | null>(null);
  // Menu próprio: o Alert do Android mostra no máximo 3 botões
  const [menu, setMenu] = useState<{ resumo: string; temPontos: boolean } | null>(null);

  function escolherDestino(arquivo: ArquivoExportado): Promise<Destino | null> {
    if (!podeSalvarNoAparelho) return Promise.resolve('compartilhar');
    const fotos = arquivo.mimeType === 'application/zip' ? `\n${arquivo.fotos} foto(s) incluída(s).` : '';
    const aviso =
      arquivo.faltando > 0 ? `\n\n⚠️ ${arquivo.faltando} foto(s) não foram encontradas e ficaram de fora.` : '';
    return new Promise((resolve) =>
      Alert.alert(
        'Arquivo pronto',
        `${arquivo.nome}${fotos}${aviso}`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Salvar no aparelho', onPress: () => resolve('salvar') },
          { text: 'Compartilhar', onPress: () => resolve('compartilhar') },
        ],
        { cancelable: true, onDismiss: () => resolve(null) },
      ),
    );
  }

  async function executar(tipo: Tipo) {
    if (!usuario) return;
    setExportando(MENSAGENS[tipo]);
    try {
      const [pontos, areas] = await Promise.all([listarPontos(usuario.email), listarPoligonos(usuario.email)]);
      const arquivo =
        tipo === 'csv'
          ? await gerarArquivoCsv(pontos)
          : tipo === 'kml'
            ? await gerarArquivoKml(pontos, areas)
            : await gerarArquivoZip(pontos, areas);
      setExportando(null);

      const destino = await escolherDestino(arquivo);
      if (!destino) return;
      const concluido = await entregarArquivo(arquivo, destino);
      if (concluido && destino === 'salvar') {
        Alert.alert('Arquivo salvo', `${arquivo.nome} foi salvo na pasta escolhida.`);
      }
    } catch (e) {
      Alert.alert('Não foi possível exportar', (e as Error).message);
    } finally {
      setExportando(null);
    }
  }

  async function iniciar() {
    if (!usuario) return;
    const [pontos, areas] = await Promise.all([listarPontos(usuario.email), listarPoligonos(usuario.email)]);
    if (pontos.length === 0 && areas.length === 0) {
      Alert.alert('Nada para exportar', 'Registre pontos ou desenhe áreas antes de exportar.');
      return;
    }
    const comFoto = pontos.filter((p) => p.fotoUri).length;
    setMenu({
      resumo:
        `${pontos.length} ${pontos.length === 1 ? 'ponto' : 'pontos'} (${comFoto} com foto) • ` +
        `${areas.length} ${areas.length === 1 ? 'área' : 'áreas'}`,
      temPontos: pontos.length > 0,
    });
  }

  function escolher(tipo: Tipo) {
    setMenu(null);
    executar(tipo);
  }

  // Elementos visuais do fluxo (menu + "carregando"): renderize no fim da tela
  const elementos = (
    <>
      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.fundo} onPress={() => setMenu(null)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            <Text style={styles.menuTitulo}>Exportar levantamento</Text>
            <Text style={styles.menuResumo}>{menu?.resumo}</Text>
            <OpcaoMenu
              icone="📦"
              titulo="Completo (ZIP)"
              descricao="pontos.csv, areas.csv, KML e fotos"
              onPress={() => escolher('zip')}
            />
            <OpcaoMenu
              icone="🌍"
              titulo="Google Earth (KML)"
              descricao="Pontos e áreas com nomes e cores"
              onPress={() => escolher('kml')}
            />
            {menu?.temPontos && (
              <OpcaoMenu
                icone="📊"
                titulo="Pontos (CSV)"
                descricao="Planilha para Excel / QGIS"
                onPress={() => escolher('csv')}
              />
            )}
            <Pressable onPress={() => setMenu(null)} style={styles.cancelar}>
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <SobreposicaoExportando mensagem={exportando} />
    </>
  );

  return { iniciar, exportando, elementos };
}

function OpcaoMenu({
  icone,
  titulo,
  descricao,
  onPress,
}: {
  icone: string;
  titulo: string;
  descricao: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.opcao, pressed && { opacity: 0.7 }]}>
      <Text style={styles.opcaoIcone}>{icone}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.opcaoTitulo}>{titulo}</Text>
        <Text style={styles.opcaoDescricao}>{descricao}</Text>
      </View>
    </Pressable>
  );
}

export function BotaoExportar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.botao}>
      <Text style={styles.botaoTexto}>⬇️ Exportar</Text>
    </Pressable>
  );
}

export function SobreposicaoExportando({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <View style={styles.sobreposicao}>
      <View style={styles.caixa}>
        <ActivityIndicator size="large" color={colors.laranjaMarco} />
        <Text style={styles.texto}>{mensagem}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  menu: {
    backgroundColor: colors.brancoMineral,
    borderRadius: 18,
    padding: 20,
    width: '100%',
  },
  menuTitulo: {
    color: colors.azulGnss,
    fontSize: 20,
    fontWeight: '800',
  },
  menuResumo: {
    color: colors.cinzaPrecisao,
    fontSize: 13,
    marginBottom: 14,
    marginTop: 4,
  },
  opcao: {
    alignItems: 'center',
    backgroundColor: colors.branco,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    minHeight: 60,
    padding: 12,
  },
  opcaoIcone: {
    fontSize: 26,
    marginRight: 12,
  },
  opcaoTitulo: {
    color: colors.azulGnss,
    fontSize: 16,
    fontWeight: '800',
  },
  opcaoDescricao: {
    color: colors.cinzaPrecisao,
    fontSize: 12,
    marginTop: 2,
  },
  cancelar: {
    alignItems: 'center',
    marginTop: 4,
    padding: 12,
  },
  cancelarTexto: {
    color: colors.cinzaPrecisao,
    fontSize: 15,
    fontWeight: '700',
  },
  botao: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  botaoTexto: {
    color: colors.laranjaMarco,
    fontSize: 15,
    fontWeight: '800',
  },
  sobreposicao: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
  },
  caixa: {
    alignItems: 'center',
    backgroundColor: colors.brancoMineral,
    borderRadius: 16,
    padding: 24,
    width: '75%',
  },
  texto: {
    color: colors.azulGnss,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
});
