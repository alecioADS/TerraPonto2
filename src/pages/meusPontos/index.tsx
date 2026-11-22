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
import { classificarPrecisao, formatarDataHora, ICONE_TIPO, metrosBR } from '../../global/formatos';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import { BotaoExportar, useExportacao } from '../../components/Exportacao';
import { excluirPonto, listarPontos, Ponto } from '../../services/storage';

export default function MeusPontos({ navigation }: ScreenProps<'MeusPontos'>) {
  const { usuario } = useAuth();
  const { formato } = usePreferencias();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const { iniciar: iniciarExportacao, elementos: elementosExportacao } = useExportacao();

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

  // Botão "Exportar" no cabeçalho da tela (pontos, áreas, KML e fotos)
  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: () => <BotaoExportar onPress={iniciarExportacao} /> });
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
                    {item.precisao != null ? `±${metrosBR(item.precisao)}` : ''}
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

      {elementosExportacao}
    </View>
  );
}

const styles = StyleSheet.create({
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
