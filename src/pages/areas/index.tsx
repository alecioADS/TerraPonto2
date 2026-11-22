/**
 * Tela Áreas (View) — LISTA das áreas (polígonos) desenhadas no mapa.
 *
 * FlatList com nome, cor, área, perímetro e observações de cada área, resumo com a soma
 * em hectares e estado vazio. Tocar abre o detalhe; o cabeçalho tem atalho para o Mapa
 * e o botão Exportar (CSV/KML/ZIP, ver components/Exportacao.tsx).
 *
 * Hooks: useState, useCallback + useFocusEffect (recarregar ao voltar do detalhe/mapa),
 * useLayoutEffect (configurar os botões do cabeçalho antes de pintar a tela) e o hook
 * personalizado useExportacao.
 */
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Botao } from '../../components/Botao';
import { BotaoExportar, useExportacao } from '../../components/Exportacao';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../global/colors';
import { formatarArea, formatarDistancia, numeroBR } from '../../global/formatos';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import { M2_POR_HECTARE } from '../../services/geodesia';
import { listarPoligonos, Poligono } from '../../services/poligonos';

export default function Areas({ navigation }: ScreenProps<'Areas'>) {
  const { usuario } = useAuth();
  const [areas, setAreas] = useState<Poligono[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { iniciar: iniciarExportacao, elementos: elementosExportacao } = useExportacao();

  // Recarrega a lista sempre que a tela volta a ficar visível
  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      listarPoligonos(usuario.email).then((lista) => {
        setAreas(lista);
        setCarregando(false);
      });
    }, [usuario]),
  );

  // Botões do cabeçalho: abrir o mapa e exportar
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerAcoes}>
          <Pressable onPress={() => navigation.navigate('Mapa')} hitSlop={10}>
            <Text style={styles.headerBotao}>🗺️ Mapa</Text>
          </Pressable>
          <BotaoExportar onPress={iniciarExportacao} />
        </View>
      ),
    });
  });

  if (carregando) {
    return (
      <View style={[globalStyles.tela, globalStyles.centralizado]}>
        <ActivityIndicator size="large" color={colors.laranjaMarco} />
      </View>
    );
  }

  const total = areas.reduce((s, a) => s + a.areaM2, 0); // soma de todas as áreas (m²)

  return (
    <View style={globalStyles.tela}>
      <FlatList
        data={areas}
        keyExtractor={(a) => a.id}
        contentContainerStyle={[globalStyles.conteudo, { paddingBottom: 110 }]}
        ListHeaderComponent={
          areas.length > 0 ? (
            <View style={styles.resumo}>
              <Text style={styles.resumoRotulo}>
                {areas.length} {areas.length === 1 ? 'área' : 'áreas'} • total
              </Text>
              <Text style={styles.resumoValor}>{numeroBR(total / M2_POR_HECTARE, 4)} ha</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={[globalStyles.card, { alignItems: 'center' }]}>
            <Text style={{ fontSize: 40 }}>🗺️</Text>
            <Text style={[globalStyles.titulo, { fontSize: 18, marginTop: 8 }]}>Nenhuma área ainda</Text>
            <Text style={[globalStyles.subtitulo, { textAlign: 'center' }]}>
              Desenhe polígonos sobre a imagem de satélite para medir áreas.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('DetalhePoligono', { id: item.id })}
            style={({ pressed }) => [styles.item, { borderLeftColor: item.cor }, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.cor, { backgroundColor: item.cor }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nome} numberOfLines={1}>
                {item.nome}
              </Text>
              <Text style={styles.area}>{formatarArea(item.areaM2)}</Text>
              <Text style={styles.info}>
                Perímetro {formatarDistancia(item.perimetroM)} • {item.vertices.length} vértices
              </Text>
              {item.observacoes ? (
                <Text style={styles.obs} numberOfLines={1}>
                  {item.observacoes}
                </Text>
              ) : null}
            </View>
            <Text style={styles.seta}>›</Text>
          </Pressable>
        )}
      />
      <View style={styles.rodape}>
        <Botao titulo="✏️  Desenhar nova área" onPress={() => navigation.navigate('Mapa', { novoDesenho: true })} />
      </View>
      {elementosExportacao}
    </View>
  );
}

const styles = StyleSheet.create({
  headerAcoes: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  headerBotao: {
    color: colors.laranjaMarco,
    fontSize: 15,
    fontWeight: '800',
  },
  resumo: {
    backgroundColor: colors.azulClaro,
    borderLeftColor: colors.laranjaMarco,
    borderLeftWidth: 5,
    borderRadius: 12,
    marginBottom: 14,
    padding: 16,
  },
  resumoRotulo: {
    color: '#C7D8E8',
    fontSize: 13,
  },
  resumoValor: {
    color: colors.branco,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.brancoMineral,
    borderLeftWidth: 5,
    borderRadius: 12,
    elevation: 3,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 14,
  },
  cor: {
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    marginRight: 12,
    width: 40,
  },
  nome: {
    color: colors.azulGnss,
    fontSize: 16,
    fontWeight: '800',
  },
  area: {
    color: colors.laranjaMarco,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  info: {
    color: colors.cinzaPrecisao,
    fontSize: 12,
    marginTop: 2,
  },
  obs: {
    color: colors.texto,
    fontSize: 12,
    marginTop: 4,
  },
  seta: {
    color: colors.cinzaPrecisao,
    fontSize: 28,
    marginLeft: 8,
  },
  rodape: {
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
