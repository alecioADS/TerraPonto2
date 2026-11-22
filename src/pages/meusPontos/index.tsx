import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Botao } from '../../components/Botao';
import { SeletorFormato, textoCoordenada } from '../../components/Coordenadas';
import { useAuth } from '../../context/AuthContext';
import { usePreferencias } from '../../context/PreferenciasContext';
import { colors } from '../../global/colors';
import { classificarPrecisao, formatarDataHora, ICONE_TIPO } from '../../global/formatos';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import {
  ArquivoExportado,
  Destino,
  entregarArquivo,
  gerarArquivoCsv,
  gerarArquivoZip,
  podeSalvarNoAparelho,
} from '../../services/exportacao';
import { excluirPonto, listarPontos, Ponto } from '../../services/storage';

export default function MeusPontos({ navigation }: ScreenProps<'MeusPontos'>) {
  const { usuario } = useAuth();
  const { formato } = usePreferencias();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!usuario) return;
    setPontos(await listarPontos(usuario.email));
    setCarregando(false);
  }, [usuario]);

  // Recarrega a lista sempre que a tela ganha foco (ex.: voltando da edição)
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  function confirmarExclusao(ponto: Ponto) {
    Alert.alert('Excluir ponto', `Deseja excluir "${ponto.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!usuario) return;
          await excluirPonto(usuario.email, ponto.id);
          setPontos((atual) => atual.filter((p) => p.id !== ponto.id));
        },
      },
    ]);
  }

  // Pergunta para onde enviar o arquivo já gerado
  function escolherDestino(arquivo: ArquivoExportado): Promise<Destino | null> {
    if (!podeSalvarNoAparelho) return Promise.resolve('compartilhar');
    const aviso =
      arquivo.faltando > 0 ? `\n\n⚠️ ${arquivo.faltando} foto(s) não foram encontradas e ficaram de fora.` : '';
    return new Promise((resolve) =>
      Alert.alert(
        'Arquivo pronto',
        `${arquivo.nome}${arquivo.mimeType === 'application/zip' ? `\n${arquivo.fotos} foto(s) incluída(s).` : ''}${aviso}`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Salvar no aparelho', onPress: () => resolve('salvar') },
          { text: 'Compartilhar', onPress: () => resolve('compartilhar') },
        ],
        { cancelable: true, onDismiss: () => resolve(null) },
      ),
    );
  }

  async function executarExportacao(tipo: 'csv' | 'zip') {
    setExportando(tipo === 'csv' ? 'Gerando planilha CSV...' : 'Compactando pontos e fotos...');
    try {
      const arquivo = tipo === 'csv' ? await gerarArquivoCsv(pontos) : await gerarArquivoZip(pontos);
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

  function escolherExportacao() {
    if (pontos.length === 0) {
      Alert.alert('Nada para exportar', 'Registre pelo menos um ponto antes de exportar.');
      return;
    }
    const comFoto = pontos.filter((p) => p.fotoUri).length;
    Alert.alert(
      'Exportar pontos',
      `${pontos.length} ${pontos.length === 1 ? 'ponto' : 'pontos'} • ${comFoto} com foto.\nEscolha o formato:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Somente CSV', onPress: () => executarExportacao('csv') },
        { text: 'CSV + fotos (ZIP)', onPress: () => executarExportacao('zip') },
      ],
    );
  }

  // Botão "Exportar" no cabeçalho da tela
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={escolherExportacao} hitSlop={10} style={styles.botaoExportar}>
          <Text style={styles.botaoExportarTexto}>⬇️ Exportar</Text>
        </Pressable>
      ),
    });
  });

  const termo = busca.trim().toLowerCase();
  const filtrados = pontos.filter((p) =>
    `${p.nome} ${p.tipo} ${p.descricao} ${p.responsavel}`.toLowerCase().includes(termo),
  );

  if (carregando) {
    return (
      <View style={[globalStyles.tela, globalStyles.centralizado]}>
        <ActivityIndicator size="large" color={colors.laranjaMarco} />
        <Text style={[globalStyles.textoClaro, { marginTop: 10 }]}>Carregando pontos...</Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.tela}>
      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[globalStyles.conteudo, { paddingBottom: 110 }]}
        ListHeaderComponent={
          pontos.length > 0 ? (
            <>
              <TextInput
                placeholder="🔎  Buscar por nome, tipo ou observação"
                placeholderTextColor="#8491A3"
                value={busca}
                onChangeText={setBusca}
                style={styles.busca}
              />
              <View style={{ marginBottom: 10 }}>
                <SeletorFormato />
              </View>
              <Text style={styles.contador}>
                {filtrados.length} de {pontos.length} {pontos.length === 1 ? 'ponto' : 'pontos'} • toque para abrir
              </Text>
            </>
          ) : null
        }
        ListEmptyComponent={
          <View style={[globalStyles.card, { alignItems: 'center' }]}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={[globalStyles.titulo, { fontSize: 18, marginTop: 8 }]}>
              {pontos.length === 0 ? 'Nenhum ponto ainda' : 'Nada encontrado'}
            </Text>
            <Text style={[globalStyles.subtitulo, { textAlign: 'center' }]}>
              {pontos.length === 0
                ? 'Vá a campo e registre seu primeiro ponto com o GPS.'
                : 'Tente buscar por outro termo.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const semaforo = classificarPrecisao(item.precisao);
          return (
            <Pressable
              onPress={() => navigation.navigate('DetalhePonto', { id: item.id })}
              onLongPress={() => confirmarExclusao(item)}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
            >
              {item.fotoUri ? (
                <Image source={{ uri: item.fotoUri }} style={styles.miniatura} />
              ) : (
                <View style={[styles.miniatura, styles.semFoto]}>
                  <Text style={{ fontSize: 26 }}>{ICONE_TIPO[item.tipo] ?? '📍'}</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <View style={styles.topo}>
                  <Text style={styles.nome} numberOfLines={1}>
                    {item.nome}
                  </Text>
                  <Text style={styles.tipo}>{item.tipo}</Text>
                </View>
                <Text style={styles.coord} numberOfLines={1} adjustsFontSizeToFit>
                  {textoCoordenada(item.latitude, item.longitude, formato)}
                </Text>
                <View style={styles.rodape}>
                  <Text style={styles.data}>🕒 {formatarDataHora(item.coletadoEm)}</Text>
                  <Text style={[styles.precisao, { color: semaforo.cor }]}>
                    {item.precisao != null ? `±${item.precisao.toFixed(1)} m` : ''}
                  </Text>
                </View>
              </View>

              <Pressable onPress={() => confirmarExclusao(item)} hitSlop={12} style={styles.lixeira}>
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />

      {/* Botão flutuante para nova coleta */}
      <View style={styles.fabArea}>
        <Botao titulo="🛰️  Coletar novo ponto" onPress={() => navigation.navigate('NovoPonto')} />
      </View>

      {exportando && (
        <View style={styles.sobreposicao}>
          <View style={styles.caixaExportando}>
            <ActivityIndicator size="large" color={colors.laranjaMarco} />
            <Text style={styles.textoExportando}>{exportando}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  botaoExportar: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  botaoExportarTexto: {
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
  caixaExportando: {
    alignItems: 'center',
    backgroundColor: colors.brancoMineral,
    borderRadius: 16,
    padding: 24,
    width: '75%',
  },
  textoExportando: {
    color: colors.azulGnss,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  busca: {
    backgroundColor: colors.branco,
    borderRadius: 10,
    color: colors.texto,
    fontSize: 15,
    height: 48,
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  contador: {
    color: '#93A8C0',
    fontSize: 12,
    marginBottom: 12,
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.brancoMineral,
    borderRadius: 14,
    elevation: 3,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
  },
  miniatura: {
    borderRadius: 10,
    height: 64,
    marginRight: 12,
    width: 64,
  },
  semFoto: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
  },
  topo: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  nome: {
    color: colors.azulGnss,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
  tipo: {
    backgroundColor: '#FFEDD5',
    borderRadius: 8,
    color: '#9A3412',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  coord: {
    color: colors.texto,
    fontFamily: 'monospace',
    fontSize: 13,
    marginTop: 4,
  },
  rodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  data: {
    color: colors.cinzaPrecisao,
    fontSize: 12,
  },
  precisao: {
    fontSize: 12,
    fontWeight: '800',
  },
  lixeira: {
    marginLeft: 8,
    padding: 4,
  },
  fabArea: {
    backgroundColor: colors.cinzaFundo,
    borderTopColor: '#334155',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
  },
});
