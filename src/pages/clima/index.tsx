/**
 * Tela de Clima (View) — consumo de API REST (requisito do trabalho).
 *
 * Busca na API pública Open-Meteo (sem chave) o tempo atual e a previsão de 7 dias para
 * a cidade escolhida — ou para a coordenada de um ponto, quando aberta a partir dele.
 * Trata os três estados de uma requisição: carregando, erro (com "Tentar novamente") e
 * sucesso. A lista de cidades é uma FlatList horizontal.
 *
 * Hooks: useState (local, dados, carregando, erro, tentativa) e useEffect com dependências
 * [local, tentativa] — refaz a busca ao trocar de cidade ou ao tentar de novo.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Botao } from '../../components/Botao';
import { colors } from '../../global/colors';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import { buscarClima, descreverTempo, RespostaClima } from '../../services/api';

interface Local {
  nome: string;
  latitude: number;
  longitude: number;
}

// Cidades sugeridas (região do Triângulo Mineiro e capitais próximas)
const CIDADES: Local[] = [
  { nome: 'Araguari', latitude: -18.6486, longitude: -48.1934 },
  { nome: 'Uberlândia', latitude: -18.9186, longitude: -48.2772 },
  { nome: 'Belo Horizonte', latitude: -19.9167, longitude: -43.9345 },
  { nome: 'Brasília', latitude: -15.7939, longitude: -47.8828 },
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Clima({ route }: ScreenProps<'Clima'>) {
  // Se veio da lista de pontos, usa a coordenada do ponto
  const localInicial: Local = route.params ?? CIDADES[0];
  const opcoes = route.params ? [localInicial, ...CIDADES] : CIDADES;

  const [local, setLocal] = useState<Local>(localInicial);
  const [clima, setClima] = useState<RespostaClima | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0); // incrementar = refazer a requisição

  // useEffect com dependências: busca de novo sempre que o local muda
  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      try {
        const dados = await buscarClima(local.latitude, local.longitude);
        if (ativo) setClima(dados);
      } catch {
        if (ativo) setErro('Falha ao conectar com o servidor de clima. Verifique sua internet.');
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    carregar();
    return () => {
      ativo = false; // evita atualizar estado se o usuário sair da tela
    };
  }, [local, tentativa]);

  const tempoAtual = clima ? descreverTempo(clima.atual.codigo) : null;

  return (
    <ScrollView style={globalStyles.tela} contentContainerStyle={globalStyles.conteudo}>
      <FlatList
        horizontal
        data={opcoes}
        keyExtractor={(item) => `${item.nome}-${item.latitude}`}
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16, flexGrow: 0 }}
        renderItem={({ item }) => {
          const selecionado = item.nome === local.nome && item.latitude === local.latitude;
          return (
            <Pressable
              onPress={() => setLocal(item)}
              style={[styles.chip, selecionado && styles.chipAtivo]}
            >
              <Text style={[styles.chipTexto, selecionado && styles.chipTextoAtivo]}>
                {item.nome}
              </Text>
            </Pressable>
          );
        }}
      />

      {carregando ? (
        <View style={[globalStyles.centralizado, { paddingVertical: 60 }]}>
          <ActivityIndicator size="large" color={colors.laranjaMarco} />
          <Text style={[globalStyles.textoClaro, { marginTop: 10 }]}>Buscando previsão...</Text>
        </View>
      ) : erro ? (
        <View style={[globalStyles.card, { alignItems: 'center' }]}>
          <Text style={{ fontSize: 40 }}>📡</Text>
          <Text style={[globalStyles.erro, { textAlign: 'center', fontSize: 15 }]}>{erro}</Text>
          <Botao
            titulo="Tentar novamente"
            onPress={() => setTentativa((t) => t + 1)}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      ) : clima && tempoAtual ? (
        <>
          <View style={styles.atual}>
            <Text style={styles.local}>{local.nome}</Text>
            <Text style={styles.coordenada}>
              {local.latitude.toFixed(4)}, {local.longitude.toFixed(4)}
            </Text>
            <Text style={styles.icone}>{tempoAtual.icone}</Text>
            <Text style={styles.temperatura}>{Math.round(clima.atual.temperatura)}°C</Text>
            <Text style={styles.descricao}>{tempoAtual.texto}</Text>

            <View style={styles.detalhes}>
              <View style={styles.detalhe}>
                <Text style={styles.detalheValor}>{clima.atual.umidade}%</Text>
                <Text style={styles.detalheRotulo}>Umidade</Text>
              </View>
              <View style={styles.detalhe}>
                <Text style={styles.detalheValor}>{Math.round(clima.atual.vento)} km/h</Text>
                <Text style={styles.detalheRotulo}>Vento</Text>
              </View>
              <View style={styles.detalhe}>
                <Text style={styles.detalheValor}>{clima.dias[0]?.chuva ?? 0}%</Text>
                <Text style={styles.detalheRotulo}>Chuva hoje</Text>
              </View>
            </View>
          </View>

          <Text style={styles.secao}>Próximos 7 dias</Text>
          {clima.dias.map((dia, i) => {
            const tempo = descreverTempo(dia.codigo);
            const data = new Date(`${dia.data}T12:00:00`);
            return (
              <View key={dia.data} style={styles.dia}>
                <Text style={styles.diaNome}>{i === 0 ? 'Hoje' : DIAS_SEMANA[data.getDay()]}</Text>
                <Text style={styles.diaIcone}>{tempo.icone}</Text>
                <Text style={styles.diaChuva}>💧 {dia.chuva}%</Text>
                <Text style={styles.diaTemp}>
                  {Math.round(dia.minima)}° / <Text style={{ fontWeight: '800' }}>{Math.round(dia.maxima)}°</Text>
                </Text>
              </View>
            );
          })}
          <Text style={[globalStyles.textoClaro, { fontSize: 11, marginTop: 8, textAlign: 'center' }]}>
            Dados: Open-Meteo.com
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderColor: '#475569',
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipAtivo: {
    backgroundColor: colors.laranjaMarco,
    borderColor: colors.laranjaMarco,
  },
  chipTexto: {
    color: '#C7D8E8',
    fontWeight: '600',
  },
  chipTextoAtivo: {
    color: colors.branco,
  },
  atual: {
    alignItems: 'center',
    backgroundColor: colors.azulGnss,
    borderRadius: 18,
    marginBottom: 20,
    padding: 24,
  },
  local: {
    color: colors.branco,
    fontSize: 22,
    fontWeight: '800',
  },
  coordenada: {
    color: '#93A8C0',
    fontSize: 12,
    marginTop: 2,
  },
  icone: {
    fontSize: 64,
    marginTop: 12,
  },
  temperatura: {
    color: colors.branco,
    fontSize: 52,
    fontWeight: '300',
  },
  descricao: {
    color: colors.laranjaMarco,
    fontSize: 16,
    fontWeight: '700',
  },
  detalhes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    width: '100%',
  },
  detalhe: {
    alignItems: 'center',
  },
  detalheValor: {
    color: colors.branco,
    fontSize: 16,
    fontWeight: '800',
  },
  detalheRotulo: {
    color: '#93A8C0',
    fontSize: 12,
    marginTop: 2,
  },
  secao: {
    color: colors.branco,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  dia: {
    alignItems: 'center',
    backgroundColor: colors.brancoMineral,
    borderRadius: 10,
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  diaNome: {
    color: colors.azulGnss,
    fontSize: 15,
    fontWeight: '800',
    width: 52,
  },
  diaIcone: {
    fontSize: 22,
    width: 40,
  },
  diaChuva: {
    color: colors.cinzaPrecisao,
    flex: 1,
    fontSize: 13,
  },
  diaTemp: {
    color: colors.texto,
    fontSize: 15,
  },
});
