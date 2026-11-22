import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { Botao } from '../../components/Botao';
import { formatarMetros, linhasCoordenada, SeletorFormato, textoCoordenada } from '../../components/Coordenadas';
import { useAuth } from '../../context/AuthContext';
import { usePreferencias } from '../../context/PreferenciasContext';
import { colors } from '../../global/colors';
import { classificarPrecisao, formatarDataHora } from '../../global/formatos';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import { azimuteGraus, distanciaMetros } from '../../services/geodesia';
import { criarPonto, obterPonto, Ponto, recoletarPonto } from '../../services/storage';

type Status = 'pedindo' | 'negado' | 'buscando' | 'ativo' | 'erro';

// Tela de coleta: lê o GPS do aparelho em tempo real e registra o ponto.
// Com o parâmetro recoletarId, funciona como RECOLETA de um ponto existente.
export default function NovoPonto({ navigation, route }: ScreenProps<'NovoPonto'>) {
  const recoletarId = route.params?.recoletarId;
  const { usuario } = useAuth();
  const { formato } = usePreferencias();
  const [pontoOriginal, setPontoOriginal] = useState<Ponto | null>(null);
  const [status, setStatus] = useState<Status>('pedindo');
  const [leitura, setLeitura] = useState<Location.LocationObject | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  // useRef guarda a "assinatura" do GPS para encerrar ao sair da tela
  const assinaturaRef = useRef<Location.LocationSubscription | null>(null);

  // Modo recoleta: carrega o ponto para comparar a posição nova com a antiga
  useEffect(() => {
    if (!recoletarId || !usuario) return;
    obterPonto(usuario.email, recoletarId).then((p) => {
      setPontoOriginal(p);
      if (p) navigation.setOptions({ title: `Recoletar: ${p.nome}` });
    });
  }, [recoletarId, usuario, navigation]);

  useEffect(() => {
    let ativo = true;

    async function iniciarGps() {
      setStatus('pedindo');
      const { status: permissao } = await Location.requestForegroundPermissionsAsync();
      if (!ativo) return;
      if (permissao !== 'granted') {
        setStatus('negado');
        return;
      }

      setStatus('buscando');
      const aoReceber = (posicao: Location.LocationObject) => {
        if (!ativo) return;
        setLeitura(posicao);
        setStatus('ativo');
      };
      const opcoes: Location.LocationOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
      };

      try {
        assinaturaRef.current = await Location.watchPositionAsync(opcoes, aoReceber);
      } catch {
        // O usuário recusou o "modo de alta precisão" do Android:
        // tenta novamente usando apenas o GPS, sem exibir o diálogo do sistema.
        try {
          if (!ativo) return;
          assinaturaRef.current = await Location.watchPositionAsync(
            { ...opcoes, mayShowUserSettingsDialog: false },
            aoReceber,
          );
        } catch {
          if (ativo) setStatus('erro');
        }
      }
      if (!ativo) assinaturaRef.current?.remove();
    }

    iniciarGps();
    return () => {
      ativo = false;
      assinaturaRef.current?.remove(); // para o GPS e economiza bateria
    };
  }, [tentativa]);

  async function registrar() {
    if (!usuario || !leitura) return;

    const precisao = leitura.coords.accuracy ?? null;
    if (precisao !== null && precisao > 15) {
      const continuar = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Precisão baixa',
          `A precisão atual é de ±${precisao.toFixed(1)} m. Deseja registrar mesmo assim?`,
          [
            { text: 'Aguardar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Registrar', onPress: () => resolve(true) },
          ],
        ),
      );
      if (!continuar) return;
    }

    const gps = {
      latitude: leitura.coords.latitude,
      longitude: leitura.coords.longitude,
      altitude: leitura.coords.altitude ?? null,
      precisao,
    };

    // ---------- Recoleta de um ponto existente ----------
    if (recoletarId) {
      const metros = pontoOriginal
        ? distanciaMetros(pontoOriginal.latitude, pontoOriginal.longitude, gps.latitude, gps.longitude)
        : 0;
      const confirmar = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Atualizar localização?',
          `O ponto será movido ${formatarMetros(metros)} m. A coordenada anterior fica guardada no histórico do ponto.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Atualizar', onPress: () => resolve(true) },
          ],
        ),
      );
      if (!confirmar) return;

      setSalvando(true);
      try {
        await recoletarPonto(usuario.email, recoletarId, gps);
        navigation.goBack(); // volta para a página do ponto, já atualizada
      } catch {
        Alert.alert('Erro', 'Não foi possível atualizar a localização.');
        setSalvando(false);
      }
      return;
    }

    // ---------- Nova coleta ----------
    setSalvando(true);
    try {
      const ponto = await criarPonto(usuario.email, gps, usuario.nome);
      // Vai direto para a página do ponto para completar os detalhes e a foto
      navigation.replace('DetalhePonto', { id: ponto.id, novo: true });
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar o ponto.');
      setSalvando(false);
    }
  }

  if (status === 'negado' || status === 'erro') {
    return (
      <View style={[globalStyles.tela, globalStyles.centralizado]}>
        <View style={[globalStyles.card, { alignItems: 'center', alignSelf: 'stretch' }]}>
          <Text style={{ fontSize: 44 }}>📵</Text>
          <Text style={[globalStyles.titulo, { fontSize: 18, marginTop: 8, textAlign: 'center' }]}>
            {status === 'negado' ? 'Permissão de localização negada' : 'GPS indisponível'}
          </Text>
          <Text style={[globalStyles.subtitulo, { textAlign: 'center' }]}>
            {status === 'negado'
              ? 'O TerraPonto precisa da sua localização para registrar pontos de campo.'
              : 'Verifique se a localização do aparelho está ligada.'}
          </Text>
          <Botao titulo="Tentar novamente" onPress={() => setTentativa((t) => t + 1)} style={{ alignSelf: 'stretch' }} />
          {status === 'negado' && (
            <Botao
              titulo="Abrir configurações"
              variante="secundario"
              onPress={() => Linking.openSettings()}
              style={{ alignSelf: 'stretch', marginTop: 12 }}
            />
          )}
        </View>
      </View>
    );
  }

  if (!leitura) {
    return (
      <View style={[globalStyles.tela, globalStyles.centralizado]}>
        <ActivityIndicator size="large" color={colors.laranjaMarco} />
        <Text style={[globalStyles.textoClaro, { marginTop: 12, textAlign: 'center' }]}>
          {status === 'pedindo' ? 'Solicitando permissão...' : 'Buscando sinal do GPS...\nProcure um local com céu aberto.'}
        </Text>
      </View>
    );
  }

  const { latitude, longitude, altitude, accuracy } = leitura.coords;
  const semaforo = classificarPrecisao(accuracy ?? null);
  const linhas = linhasCoordenada(latitude, longitude, formato);
  const deslocamento = pontoOriginal
    ? {
        metros: distanciaMetros(pontoOriginal.latitude, pontoOriginal.longitude, latitude, longitude),
        azimute: azimuteGraus(pontoOriginal.latitude, pontoOriginal.longitude, latitude, longitude),
      }
    : null;

  return (
    <ScrollView style={globalStyles.tela} contentContainerStyle={globalStyles.conteudo}>
      <View style={styles.aoVivo}>
        <View style={styles.pulso} />
        <Text style={styles.aoVivoTexto}>GPS ativo • atualizando em tempo real</Text>
      </View>

      <View style={styles.painel}>
        <View style={{ marginBottom: 18 }}>
          <SeletorFormato />
        </View>
        {linhas.map((l, i) => (
          <View key={l.rotulo} style={i > 0 ? { marginTop: 16 } : undefined}>
            <Text style={styles.rotulo}>{l.rotulo.toUpperCase()}</Text>
            <Text style={styles.valor} adjustsFontSizeToFit numberOfLines={1}>
              {l.valor}
            </Text>
            <Text style={styles.gms}>{l.detalhe}</Text>
          </View>
        ))}

        <View style={styles.linha}>
          <View style={styles.bloco}>
            <Text style={styles.rotulo}>ALTITUDE</Text>
            <Text style={styles.valorMenor}>{altitude != null ? `${altitude.toFixed(1)} m` : '—'}</Text>
          </View>
          <View style={styles.bloco}>
            <Text style={styles.rotulo}>PRECISÃO</Text>
            <Text style={styles.valorMenor}>{accuracy != null ? `±${accuracy.toFixed(1)} m` : '—'}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.semaforo, { borderColor: semaforo.cor }]}>
        <Text style={styles.semaforoIcone}>{semaforo.icone}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.semaforoTexto, { color: semaforo.cor }]}>{semaforo.texto}</Text>
          <Text style={styles.semaforoHora}>Última leitura: {formatarDataHora(new Date(leitura.timestamp).toISOString())}</Text>
        </View>
      </View>

      {recoletarId && pontoOriginal && deslocamento && (
        <View style={styles.recoleta}>
          <Text style={styles.recoletaTitulo}>📡 Recoleta de "{pontoOriginal.nome}"</Text>
          <Text style={styles.recoletaTexto}>
            Coordenada atual do ponto: {textoCoordenada(pontoOriginal.latitude, pontoOriginal.longitude, formato)}
          </Text>
          <Text style={styles.recoletaTexto}>
            Coletada em {formatarDataHora(pontoOriginal.coletadoEm)}
            {pontoOriginal.precisao != null ? ` • ±${pontoOriginal.precisao.toFixed(1)} m` : ''}
          </Text>
          <View style={styles.deslocamento}>
            <View style={{ flex: 1 }}>
              <Text style={styles.deslocRotulo}>DESLOCAMENTO</Text>
              <Text style={styles.deslocValor}>{formatarMetros(deslocamento.metros)} m</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deslocRotulo}>AZIMUTE</Text>
              <Text style={styles.deslocValor}>{formatarMetros(deslocamento.azimute, 1)}°</Text>
            </View>
          </View>
        </View>
      )}

      <Botao
        titulo={recoletarId ? '📡  Atualizar localização do ponto' : '📍  Registrar ponto aqui'}
        onPress={registrar}
        carregando={salvando}
      />
      <Text style={styles.aviso}>
        A precisão exibida é uma estimativa do aparelho. O GPS do celular não substitui um receptor
        topográfico/RTK.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  recoleta: {
    backgroundColor: colors.brancoMineral,
    borderLeftColor: colors.laranjaMarco,
    borderLeftWidth: 6,
    borderRadius: 12,
    marginBottom: 16,
    padding: 14,
  },
  recoletaTitulo: {
    color: colors.azulGnss,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  recoletaTexto: {
    color: colors.cinzaPrecisao,
    fontSize: 12,
    marginTop: 2,
  },
  deslocamento: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
  },
  deslocRotulo: {
    color: colors.cinzaPrecisao,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  deslocValor: {
    color: colors.laranjaMarco,
    fontFamily: 'monospace',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  aoVivo: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  pulso: {
    backgroundColor: colors.verdeCampo,
    borderRadius: 6,
    height: 12,
    marginRight: 8,
    width: 12,
  },
  aoVivoTexto: {
    color: '#C7D8E8',
    fontSize: 13,
  },
  painel: {
    backgroundColor: colors.azulGnss,
    borderRadius: 18,
    padding: 22,
  },
  rotulo: {
    color: '#93A8C0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  valor: {
    color: colors.branco,
    fontFamily: 'monospace',
    fontSize: 30,
    fontWeight: '700',
    marginTop: 2,
  },
  gms: {
    color: colors.laranjaMarco,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  linha: {
    borderTopColor: '#1E4468',
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 14,
  },
  bloco: {
    flex: 1,
  },
  valorMenor: {
    color: colors.branco,
    fontFamily: 'monospace',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  semaforo: {
    alignItems: 'center',
    backgroundColor: colors.brancoMineral,
    borderLeftWidth: 6,
    borderRadius: 12,
    flexDirection: 'row',
    marginVertical: 16,
    padding: 14,
  },
  semaforoIcone: {
    fontSize: 22,
    marginRight: 12,
  },
  semaforoTexto: {
    fontSize: 16,
    fontWeight: '800',
  },
  semaforoHora: {
    color: colors.cinzaPrecisao,
    fontSize: 12,
    marginTop: 2,
  },
  aviso: {
    color: '#93A8C0',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 14,
    textAlign: 'center',
  },
});
