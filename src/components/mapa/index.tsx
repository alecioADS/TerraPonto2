import React, { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';

import { colors } from '../../global/colors';
import { MapaBaseProps, MapaBaseRef } from './tipos';

export * from './tipos';

// Qual motor de mapa usar:
// - APK (build nativo): MapLibre — aberto, sem chave de API, com cache de imagens no aparelho.
// - Expo Go: o MapLibre não vem embutido no Expo Go, então usa o react-native-maps
//   (que no Expo Go já tem a chave do Google Maps do próprio Expo).
// O require condicional evita carregar o módulo nativo que não existe no ambiente atual.
export const NO_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const Motor: React.ForwardRefExoticComponent<MapaBaseProps & React.RefAttributes<MapaBaseRef>> = NO_EXPO_GO
  ? require('./MapaGoogle').MapaGoogle
  : require('./MapaMapLibre').MapaMapLibre;

/** Mapa de satélite (Esri) com áreas, pontos e desenho, independente do motor. */
export const MapaBase = forwardRef<MapaBaseRef, MapaBaseProps>(function MapaBase({ style, ...props }, ref) {
  const [offline, setOffline] = useState(false);

  useEffect(
    () =>
      // Só considera offline sem conexão alguma (isInternetReachable dá falso negativo em hotspot)
      NetInfo.addEventListener((estado) => setOffline(estado.isConnected === false)),
    [],
  );

  return (
    <View style={[styles.container, style]}>
      <Motor ref={ref} {...props} style={StyleSheet.absoluteFill} />
      {offline && (
        <View style={styles.offline} pointerEvents="none">
          <Text style={styles.offlineTexto}>📴 Sem internet — exibindo o mapa salvo no aparelho</Text>
        </View>
      )}
      <Text style={styles.atribuicao} pointerEvents="none">
        {props.camadaBase === 'ruas'
          ? '© Colaboradores do OpenStreetMap'
          : 'Imagens © Esri, Maxar, Earthstar Geographics'}
        {NO_EXPO_GO ? '' : ' • MapLibre'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B1220',
    flex: 1,
    overflow: 'hidden',
  },
  offline: {
    alignSelf: 'center',
    backgroundColor: 'rgba(11,42,74,0.92)',
    borderColor: colors.laranjaMarco,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    position: 'absolute',
    top: 10,
  },
  offlineTexto: {
    color: colors.branco,
    fontSize: 12,
    fontWeight: '700',
  },
  atribuicao: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    bottom: 0,
    color: '#E2E8F0',
    fontSize: 9,
    left: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    position: 'absolute',
  },
});
