import React, { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { MapViewProps, UrlTile } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';

import { colors } from '../global/colors';

// Imagens de satélite: Esri World Imagery (uso acadêmico/não comercial com atribuição).
// A URL da Esri usa a ordem {z}/{y}/{x}.
const URL_SATELITE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const URL_ROTULOS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

// O cache nativo do react-native-maps espera um caminho de pasta comum (sem "file://").
// Fica em documentDirectory para o sistema não apagar como faria com o cache temporário.
const pastaCache = (nome: string) =>
  `${(FileSystem.documentDirectory ?? '').replace(/^file:\/\//, '')}mapa-cache/${nome}`;

export const PASTA_CACHE_MAPA = `${FileSystem.documentDirectory}mapa-cache/`;
const TRINTA_DIAS = 30 * 24 * 60 * 60; // segundos

interface Props extends MapViewProps {
  mostrarRotulos?: boolean;
  children?: React.ReactNode;
}

// Mapa de satélite com cache em disco: o que já foi visto com internet continua
// disponível sem sinal. Sem conexão, entra em "modo offline" e usa só o cache.
export const MapaSatelite = forwardRef<MapView, Props>(
  ({ mostrarRotulos = false, children, style, ...props }, ref) => {
    const [offline, setOffline] = useState(false);

    useEffect(() => {
      // Só considera offline quando não há conexão alguma. O teste de alcance
      // (isInternetReachable) dá falso negativo em algumas redes (ex.: hotspot de celular)
      // e bloquearia o download das imagens. Se a rede existir mas falhar, o próprio
      // componente nativo cai para o cache.
      const cancelar = NetInfo.addEventListener((estado) => {
        setOffline(estado.isConnected === false);
      });
      return cancelar;
    }, []);

    return (
      <View style={[styles.container, style]}>
        <MapView
          ref={ref}
          style={StyleSheet.absoluteFill}
          mapType="none" // sem o mapa do Google por baixo: só a imagem de satélite
          rotateEnabled={false}
          pitchEnabled={false} // vista sempre de cima (os rótulos usam projeção 2D)
          toolbarEnabled={false}
          moveOnMarkerPress={false} // Android: não recentraliza o mapa ao tocar num marcador
          {...props}
        >
          <UrlTile
            urlTemplate={URL_SATELITE}
            maximumZ={20}
            maximumNativeZ={18} // acima disso amplia a imagem do zoom 18
            tileCachePath={pastaCache('satelite')}
            tileCacheMaxAge={TRINTA_DIAS}
            offlineMode={offline}
            zIndex={-2}
          />
          {mostrarRotulos && (
            <UrlTile
              urlTemplate={URL_ROTULOS}
              maximumZ={20}
              maximumNativeZ={18}
              tileCachePath={pastaCache('rotulos')}
              tileCacheMaxAge={TRINTA_DIAS}
              offlineMode={offline}
              zIndex={-1}
            />
          )}
          {children}
        </MapView>

        {offline && (
          <View style={styles.offline} pointerEvents="none">
            <Text style={styles.offlineTexto}>📴 Sem internet — exibindo o mapa salvo no aparelho</Text>
          </View>
        )}
        <Text style={styles.atribuicao} pointerEvents="none">
          Imagens © Esri, Maxar, Earthstar Geographics
        </Text>
      </View>
    );
  },
);

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
