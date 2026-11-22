import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, UrlTile } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';

import { colors } from '../../global/colors';
import {
  comAlpha,
  MapaBaseProps,
  MapaBaseRef,
  URL_ROTULOS,
  URL_RUAS,
  URL_SATELITE,
  ZOOM_MAX,
  ZOOM_MAX_IMAGEM,
  ZOOM_MAX_RUAS,
} from './tipos';

// Motor usado só dentro do Expo Go (que já traz o Google Maps com a chave do Expo).
// No APK o app usa o MapLibre, que não precisa de chave (ver MapaMapLibre.tsx).

// O cache nativo do react-native-maps espera um caminho de pasta comum (sem "file://").
const pastaCache = (nome: string) =>
  `${(FileSystem.documentDirectory ?? '').replace(/^file:\/\//, '')}mapa-cache/${nome}`;
const TRINTA_DIAS = 30 * 24 * 60 * 60; // segundos

export const MapaGoogle = forwardRef<MapaBaseRef, MapaBaseProps>(function MapaGoogle(
  {
    regiaoInicial,
    camadaBase = 'satelite',
    areas = [],
    pontos = [],
    desenho,
    verticesEditaveis = [],
    corVertices = colors.laranjaMarco,
    mostrarRotulos = false,
    interativo = true,
    mostrarUsuario = false,
    onPronto,
    onToque,
    onToqueArea,
    onToquePonto,
    onMoverVertice,
    onRegiao,
    onLayout,
    style,
  },
  ref,
) {
  const mapa = useRef<MapView>(null);
  const [offline, setOffline] = useState(false);

  useEffect(
    () =>
      // Só "offline" sem conexão alguma: isInternetReachable dá falso negativo em hotspot
      NetInfo.addEventListener((estado) => setOffline(estado.isConnected === false)),
    [],
  );

  useImperativeHandle(ref, () => ({
    irPara(c, delta = 0.003, animado = true) {
      mapa.current?.animateToRegion(
        { latitude: c.latitude, longitude: c.longitude, latitudeDelta: delta, longitudeDelta: delta },
        animado ? 600 : 0,
      );
    },
    centralizar(c) {
      mapa.current?.animateCamera({ center: c }, { duration: 400 });
    },
    enquadrar(coords, margens, animado = true) {
      if (coords.length === 0) return;
      if (coords.length === 1) {
        mapa.current?.animateToRegion({ ...coords[0], latitudeDelta: 0.003, longitudeDelta: 0.003 }, animado ? 600 : 0);
        return;
      }
      mapa.current?.fitToCoordinates(coords, {
        edgePadding: margens ?? { top: 40, right: 40, bottom: 40, left: 40 },
        animated: animado,
      });
    },
  }));

  const v = desenho?.vertices ?? [];

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        initialRegion={regiaoInicial}
        mapType="none" // sem o mapa do Google por baixo: só a imagem de satélite
        rotateEnabled={false}
        pitchEnabled={false}
        scrollEnabled={interativo}
        zoomEnabled={interativo}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        showsUserLocation={mostrarUsuario}
        showsMyLocationButton={false}
        onMapReady={onPronto}
        onPress={(e) => onToque?.(e.nativeEvent.coordinate)}
        onRegionChange={onRegiao}
        onRegionChangeComplete={onRegiao}
      >
        {/* key: troca o componente ao mudar de camada (o UrlTile não atualiza a URL sozinho) */}
        <UrlTile
          key={camadaBase}
          urlTemplate={camadaBase === 'ruas' ? URL_RUAS : URL_SATELITE}
          maximumZ={ZOOM_MAX}
          maximumNativeZ={camadaBase === 'ruas' ? ZOOM_MAX_RUAS : ZOOM_MAX_IMAGEM}
          tileCachePath={pastaCache(camadaBase)}
          tileCacheMaxAge={TRINTA_DIAS}
          offlineMode={offline}
          zIndex={-2}
        />
        {mostrarRotulos && camadaBase === 'satelite' && (
          <UrlTile
            urlTemplate={URL_ROTULOS}
            maximumZ={ZOOM_MAX}
            maximumNativeZ={ZOOM_MAX_IMAGEM}
            tileCachePath={pastaCache('rotulos')}
            tileCacheMaxAge={TRINTA_DIAS}
            offlineMode={offline}
            zIndex={-1}
          />
        )}

        {areas.map((a) => (
          <Polygon
            key={a.id}
            coordinates={a.vertices}
            strokeColor={a.cor}
            strokeWidth={a.destaque ? 4 : 2}
            fillColor={comAlpha(a.cor, a.destaque ? 0.45 : 0.22)}
            tappable={!!onToqueArea}
            onPress={() => onToqueArea?.(a.id)}
          />
        ))}

        {/* tracksViewChanges ligado: no Fabric (Expo Go) o marcador sai cortado se desligado */}
        {pontos.map((p) => (
          <Marker
            key={`pt-${p.id}`}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges
            onPress={() => onToquePonto?.(p.id)}
          >
            <View style={styles.pino} />
          </Marker>
        ))}

        {desenho && v.length >= 3 && (
          <Polygon
            coordinates={v}
            strokeColor={desenho.cor}
            strokeWidth={3}
            fillColor={comAlpha(desenho.cor, 0.25)}
            tappable={false}
          />
        )}
        {desenho && v.length === 2 && <Polyline coordinates={v} strokeColor={desenho.cor} strokeWidth={3} />}

        {verticesEditaveis.map((c, i) => (
          <Marker
            key={`v-${i}`}
            coordinate={c}
            anchor={{ x: 0.5, y: 0.5 }}
            draggable
            onDragEnd={(e) => onMoverVertice?.(i, e.nativeEvent.coordinate)}
            tracksViewChanges
          >
            <View style={[styles.vertice, { borderColor: corVertices }]}>
              <Text style={styles.verticeTexto}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B1220',
    flex: 1,
    overflow: 'hidden',
  },
  pino: {
    backgroundColor: colors.laranjaMarco,
    borderColor: '#FFFFFF',
    borderRadius: 9,
    borderWidth: 3,
    height: 18,
    width: 18,
  },
  vertice: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 3,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  verticeTexto: {
    color: colors.azulGnss,
    fontSize: 11,
    fontWeight: '800',
  },
});
