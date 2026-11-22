import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Logo from '../../assets/images/logo-selo.png';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../global/colors';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import { listarPoligonos } from '../../services/poligonos';
import { listarPontos } from '../../services/storage';

interface ItemMenu {
  rota: 'NovoPonto' | 'MeusPontos' | 'Mapa' | 'Areas' | 'Clima' | 'Contato';
  icone: string;
  titulo: string;
  descricao: string;
}

const MENU: ItemMenu[] = [
  { rota: 'NovoPonto', icone: '🛰️', titulo: 'Coletar ponto', descricao: 'Usar o GPS do aparelho' },
  { rota: 'MeusPontos', icone: '🗂️', titulo: 'Meus pontos', descricao: 'Lista do levantamento' },
  { rota: 'Mapa', icone: '🗺️', titulo: 'Mapa', descricao: 'Satélite, pontos e áreas' },
  { rota: 'Areas', icone: '📐', titulo: 'Áreas', descricao: 'Polígonos e medições' },
  { rota: 'Clima', icone: '🌦️', titulo: 'Clima', descricao: 'Previsão para o campo' },
  { rota: 'Contato', icone: '✉️', titulo: 'Fale conosco', descricao: 'Suporte TerraPonto' },
];

export default function Home({ navigation }: ScreenProps<'Home'>) {
  const { usuario, sair } = useAuth();
  const [totalPontos, setTotalPontos] = useState(0);
  const [totalAreas, setTotalAreas] = useState(0);

  // Recarrega os contadores sempre que a Home volta a ficar visível
  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      listarPontos(usuario.email).then((p) => setTotalPontos(p.length));
      listarPoligonos(usuario.email).then((a) => setTotalAreas(a.length));
    }, [usuario]),
  );

  function confirmarSaida() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);
  }

  const primeiroNome = usuario?.nome.split(' ')[0] ?? '';

  return (
    <ScrollView style={globalStyles.tela} contentContainerStyle={globalStyles.conteudo}>
      <View style={styles.cabecalho}>
        <Image source={Logo} style={styles.logo} accessibilityLabel="Logo TerraPonto" />
        <View style={{ flex: 1 }}>
          <Text style={styles.ola}>Olá, {primeiroNome} 👋</Text>
          <Text style={globalStyles.textoClaro}>O que vamos fazer em campo hoje?</Text>
        </View>
      </View>

      <View style={styles.resumo}>
        <Text style={styles.resumoNumero}>{totalPontos}</Text>
        <Text style={styles.resumoTexto}>{totalPontos === 1 ? 'ponto' : 'pontos'}</Text>
        <View style={styles.resumoDivisor} />
        <Text style={styles.resumoNumero}>{totalAreas}</Text>
        <Text style={styles.resumoTexto}>{totalAreas === 1 ? 'área' : 'áreas'}</Text>
      </View>

      <View style={styles.grade}>
        {MENU.map((item) => (
          <Pressable
            key={item.rota}
            accessibilityRole="button"
            onPress={() => navigation.navigate(item.rota)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.icone}>{item.icone}</Text>
            <Text style={styles.itemTitulo}>{item.titulo}</Text>
            <Text style={styles.itemDescricao}>{item.descricao}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={confirmarSaida} style={styles.sair}>
        <Text style={styles.sairTexto}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  logo: {
    borderColor: colors.laranjaMarco,
    borderRadius: 32,
    borderWidth: 2,
    height: 64,
    marginRight: 14,
    width: 64,
  },
  ola: {
    color: colors.branco,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  resumo: {
    alignItems: 'center',
    backgroundColor: colors.azulClaro,
    borderLeftColor: colors.laranjaMarco,
    borderLeftWidth: 5,
    borderRadius: 12,
    flexDirection: 'row',
    marginVertical: 20,
    padding: 18,
  },
  resumoNumero: {
    color: colors.laranjaMarco,
    fontSize: 36,
    fontWeight: '800',
    marginRight: 12,
  },
  resumoDivisor: {
    backgroundColor: '#1E4468',
    height: 36,
    marginHorizontal: 18,
    width: 1,
  },
  resumoTexto: {
    color: colors.branco,
    fontSize: 16,
    fontWeight: '600',
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  item: {
    backgroundColor: colors.brancoMineral,
    borderRadius: 14,
    elevation: 3,
    marginBottom: 14,
    minHeight: 130,
    padding: 16,
    width: '48%',
  },
  icone: {
    fontSize: 30,
    marginBottom: 10,
  },
  itemTitulo: {
    color: colors.azulGnss,
    fontSize: 16,
    fontWeight: '800',
  },
  itemDescricao: {
    color: colors.cinzaPrecisao,
    fontSize: 12,
    marginTop: 4,
  },
  sair: {
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
  },
  sairTexto: {
    color: '#F87171',
    fontSize: 15,
    fontWeight: '700',
  },
});
