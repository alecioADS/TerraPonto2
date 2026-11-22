import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

import { AreaMapa, MapaBase, MapaBaseRef, Regiao, regiaoPara } from '../../components/mapa';
import { useAuth } from '../../context/AuthContext';
import { usePreferencias } from '../../context/PreferenciasContext';
import { colors } from '../../global/colors';
import { formatarArea, formatarDistancia, numeroBR } from '../../global/formatos';
import { ScreenProps } from '../../routes';
import {
  areaPoligono,
  centroPoligono,
  LatLng,
  M2_POR_ALQUEIRE_MINEIRO,
  perimetroPoligono,
  temAutointersecao,
} from '../../services/geodesia';
import {
  atualizarVertices,
  criarPoligono,
  listarPoligonos,
  Poligono,
} from '../../services/poligonos';
import { permissaoLocalizacao } from '../../services/permissoes';
import { listarPontos, Ponto } from '../../services/storage';

// Região usada quando não há pontos, áreas nem localização conhecida (Araguari-MG)
const REGIAO_PADRAO: Regiao = { latitude: -18.6486, longitude: -48.1934, latitudeDelta: 0.05, longitudeDelta: 0.05 };
const COR_DESENHO = colors.laranjaMarco;
// Folga ao enquadrar: deixa espaço para o cabeçalho, os botões laterais e o painel inferior
const MARGENS_MAPA = { top: 120, right: 80, bottom: 260, left: 80 };

/**
 * Tela do Mapa (View) — a mais complexa do app.
 *
 * Modo "ver": imagem de satélite (ou ruas) com as áreas coloridas e etiquetadas e os
 * pontos coletados; tocar numa área abre um cartão com as medidas, tocar num ponto abre
 * o detalhe. Botões: satélite/ruas, rótulos, enquadrar tudo, minha posição.
 * Modo "desenhar": cada toque cria um vértice (ou usa um ponto coletado), "Vértice GPS"
 * usa a posição atual, vértices são arrastáveis, desfazer, área/perímetro ao vivo e
 * alerta de lados que se cruzam. Também edita os vértices de uma área já salva.
 *
 * O mapa em si é o componente MapaBase (MapLibre no APK, react-native-maps no Expo Go);
 * esta tela só entrega dados e recebe eventos. Os nomes e etiquetas são Views comuns
 * posicionadas por cima do mapa com a projeção Web Mercator (função `projetar`).
 *
 * Hooks: useState (dados, modo, vértices, seleção, região visível), useRef (mapa e flags
 * que não devem re-renderizar), useMemo (camadas do mapa — a tela re-renderiza a cada
 * quadro durante o arrasto), useCallback + useFocusEffect (recarregar dados), useEffect
 * (região inicial e aviso antes de sair com desenho não salvo) e useLayoutEffect (título
 * e botões do cabeçalho conforme o modo).
 */
export default function Mapa({ navigation, route }: ScreenProps<'Mapa'>) {
  const params = route.params ?? {};
  const { usuario } = useAuth();
  const mapaRef = useRef<MapaBaseRef>(null);

  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [poligonos, setPoligonos] = useState<Poligono[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [regiaoInicial, setRegiaoInicial] = useState<Regiao | null>(null);
  const [regiaoAtual, setRegiaoAtual] = useState<Regiao | null>(null);
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });
  const [rotulos, setRotulos] = useState(false);
  const { camadaMapa, setCamadaMapa } = usePreferencias();
  const [modo, setModo] = useState<'ver' | 'desenhar'>('ver');
  const [vertices, setVertices] = useState<LatLng[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<Poligono | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const parametrosAplicados = useRef(false);
  const saindoSemPerguntar = useRef(false);

  const regiaoVisivel = regiaoAtual ?? regiaoInicial;
  const mostrarNomes = (regiaoVisivel?.latitudeDelta ?? 1) < 0.05; // nomes só com zoom suficiente

  // Converte coordenada -> posição na tela (dp), usando a mesma projeção do mapa
  // (Web Mercator) e a região visível. Retorna null se estiver fora da tela.
  function projetar(c: LatLng): { x: number; y: number } | null {
    const r = regiaoVisivel;
    if (!r || tamanho.largura === 0) return null;
    const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const oeste = r.longitude - r.longitudeDelta / 2;
    const norte = mercY(r.latitude + r.latitudeDelta / 2);
    const sul = mercY(r.latitude - r.latitudeDelta / 2);
    const x = ((c.longitude - oeste) / r.longitudeDelta) * tamanho.largura;
    const y = ((norte - mercY(c.latitude)) / (norte - sul)) * tamanho.altura;
    if (x < -100 || y < -100 || x > tamanho.largura + 100 || y > tamanho.altura + 100) return null;
    return { x, y };
  }

  // ---------- Carregamento (sempre que a tela ganha foco) ----------
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      (async () => {
        if (!usuario) return;
        const [p, g] = await Promise.all([listarPontos(usuario.email), listarPoligonos(usuario.email)]);
        if (!ativo) return;
        setPontos(p);
        setPoligonos(g);
        setSelecionado((s) => (s ? g.find((x) => x.id === s.id) ?? null : null));
        setCarregado(true);
      })();
      return () => {
        ativo = false;
      };
    }, [usuario]),
  );

  // ---------- Região inicial: tudo o que foi coletado, ou a posição atual ----------
  useEffect(() => {
    if (!carregado || regiaoInicial) return;
    (async () => {
      const coords = [
        ...pontos.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        ...poligonos.flatMap((p) => p.vertices),
      ];
      if (coords.length > 0) {
        setRegiaoInicial(regiaoPara(coords));
        return;
      }
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const ultima = await Location.getLastKnownPositionAsync();
          if (ultima) {
            setRegiaoInicial({ ...ultima.coords, latitudeDelta: 0.01, longitudeDelta: 0.01 });
            return;
          }
        }
      } catch {
        // sem localização: usa a região padrão
      }
      setRegiaoInicial(REGIAO_PADRAO);
    })();
  }, [carregado, regiaoInicial, pontos, poligonos]);


  // ---------- Parâmetros vindos de outras telas ----------
  function aplicarParametros() {
    if (parametrosAplicados.current) return;
    parametrosAplicados.current = true;

    if (params.editarPoligonoId) {
      const alvo = poligonos.find((p) => p.id === params.editarPoligonoId);
      if (alvo) {
        setEditandoId(alvo.id);
        setVertices(alvo.vertices);
        setModo('desenhar');
        enquadrar(alvo.vertices);
      }
    } else if (params.focoPoligonoId) {
      const alvo = poligonos.find((p) => p.id === params.focoPoligonoId);
      if (alvo) {
        setSelecionado(alvo);
        enquadrar(alvo.vertices);
      }
    } else if (params.focoPontoId) {
      const alvo = pontos.find((p) => p.id === params.focoPontoId);
      if (alvo) mapaRef.current?.irPara(alvo, 0.003);
    } else if (params.novoDesenho) {
      iniciarDesenho();
    }
  }

  function enquadrar(coords: LatLng[]) {
    mapaRef.current?.enquadrar(coords, MARGENS_MAPA);
  }

  function enquadrarTudo() {
    enquadrar([
      ...pontos.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      ...poligonos.flatMap((p) => p.vertices),
    ]);
  }

  async function irParaMinhaPosicao() {
    try {
      if (!(await permissaoLocalizacao())) return;
      const pos =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ mayShowUserSettingsDialog: false }));
      mapaRef.current?.irPara(pos.coords, 0.004);
    } catch {
      Alert.alert('Localização indisponível', 'Não foi possível obter sua posição agora.');
    }
  }

  // ---------- Desenho / edição de polígonos ----------
  function iniciarDesenho() {
    setSelecionado(null);
    setEditandoId(null);
    setVertices([]);
    setModo('desenhar');
  }

  const adicionarVertice = (c: LatLng) => setVertices((v) => [...v, { latitude: c.latitude, longitude: c.longitude }]);
  const desfazer = () => setVertices((v) => v.slice(0, -1));
  const moverVertice = (i: number, c: LatLng) =>
    setVertices((v) => v.map((x, j) => (j === i ? { latitude: c.latitude, longitude: c.longitude } : x)));

  function encerrarDesenho() {
    setModo('ver');
    setVertices([]);
    setEditandoId(null);
    // veio da tela de detalhes só para editar os vértices: volta para ela
    if (params.editarPoligonoId) {
      saindoSemPerguntar.current = true;
      navigation.goBack();
    }
  }

  function cancelarDesenho() {
    if (vertices.length === 0) return encerrarDesenho();
    Alert.alert('Descartar desenho?', 'Os vértices não salvos serão perdidos.', [
      { text: 'Continuar desenhando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: encerrarDesenho },
    ]);
  }

  async function verticeNoGps() {
    setBuscandoGps(true);
    try {
      if (!(await permissaoLocalizacao())) throw new Error('Permissão de localização negada.');
      let pos: Location.LocationObject;
      try {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      } catch {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
          mayShowUserSettingsDialog: false,
        });
      }
      adicionarVertice(pos.coords);
      mapaRef.current?.centralizar(pos.coords);
    } catch (e) {
      Alert.alert('GPS', (e as Error).message || 'Não foi possível obter a posição.');
    } finally {
      setBuscandoGps(false);
    }
  }

  async function concluirDesenho() {
    if (!usuario) return;
    if (vertices.length < 3) {
      Alert.alert('Poucos vértices', 'Uma área precisa de pelo menos 3 vértices.');
      return;
    }
    if (temAutointersecao(vertices)) {
      const continuar = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Lados se cruzam',
          'O polígono tem lados que se cruzam ("formato de 8"), e a área calculada pode não representar o terreno.',
          [
            { text: 'Corrigir', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Salvar assim', onPress: () => resolve(true) },
          ],
        ),
      );
      if (!continuar) return;
    }

    setSalvando(true);
    try {
      if (editandoId) {
        await atualizarVertices(usuario.email, editandoId, vertices);
        encerrarDesenho();
      } else {
        const novo = await criarPoligono(usuario.email, vertices);
        setModo('ver');
        setVertices([]);
        navigation.navigate('DetalhePoligono', { id: novo.id, novo: true });
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a área.');
    } finally {
      setSalvando(false);
    }
  }

  // Pergunta antes de sair da tela com um desenho em andamento
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (saindoSemPerguntar.current || modo !== 'desenhar' || vertices.length === 0) return;
        e.preventDefault();
        Alert.alert('Descartar desenho?', 'Os vértices não salvos serão perdidos.', [
          { text: 'Continuar desenhando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]);
      }),
    [navigation, modo, vertices.length],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: modo === 'desenhar' ? (editandoId ? 'Editar vértices' : 'Nova área') : 'Mapa',
      headerRight:
        modo === 'ver'
          ? () => (
              <Pressable onPress={() => navigation.navigate('Areas')} hitSlop={10}>
                <Text style={styles.headerBotao}>📋 Áreas</Text>
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, modo, editandoId]);

  function aoTocarMapa(c: LatLng) {
    if (modo === 'desenhar') adicionarVertice(c);
    else setSelecionado(null);
  }

  function aoTocarPonto(p: Ponto) {
    if (modo === 'desenhar') adicionarVertice({ latitude: p.latitude, longitude: p.longitude });
    else navigation.navigate('DetalhePonto', { id: p.id });
  }

  // Dados do mapa memorizados: a tela re-renderiza a cada quadro durante o arrasto
  // (regiaoAtual), e recriar as camadas a cada quadro deixaria o mapa lento.
  const visiveis = useMemo(() => poligonos.filter((p) => p.id !== editandoId), [poligonos, editandoId]);
  const areasMapa = useMemo<AreaMapa[]>(
    () => visiveis.map((p) => ({ id: p.id, vertices: p.vertices, cor: p.cor, destaque: selecionado?.id === p.id })),
    [visiveis, selecionado],
  );
  const pontosMapa = useMemo(
    () => pontos.map((p) => ({ id: p.id, latitude: p.latitude, longitude: p.longitude })),
    [pontos],
  );
  const cruzando = useMemo(() => temAutointersecao(vertices), [vertices]);
  const desenhoMapa = useMemo(
    () => (modo === 'desenhar' ? { vertices, cor: cruzando ? colors.vermelhoErro : COR_DESENHO } : null),
    [modo, vertices, cruzando],
  );

  // ---------- Renderização ----------
  if (!regiaoInicial) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color={colors.laranjaMarco} />
        <Text style={styles.carregandoTexto}>Carregando mapa...</Text>
      </View>
    );
  }

  const areaDesenho = areaPoligono(vertices);
  const perimetroDesenho = perimetroPoligono(vertices, vertices.length >= 3);

  return (
    <View style={styles.tela}>
      <MapaBase
        ref={mapaRef}
        regiaoInicial={regiaoInicial}
        areas={areasMapa}
        pontos={pontosMapa}
        desenho={desenhoMapa}
        verticesEditaveis={modo === 'desenhar' ? vertices : undefined}
        corVertices={COR_DESENHO}
        camadaBase={camadaMapa}
        mostrarRotulos={rotulos}
        mostrarUsuario
        onPronto={aplicarParametros}
        onToque={aoTocarMapa}
        onToqueArea={
          modo === 'ver'
            ? (id) => setSelecionado(poligonos.find((p) => p.id === id) ?? null)
            : undefined
        }
        onToquePonto={(id) => {
          const p = pontos.find((x) => x.id === id);
          if (p) aoTocarPonto(p);
        }}
        onMoverVertice={moverVertice}
        onRegiao={setRegiaoAtual}
        onLayout={(e) =>
          setTamanho({ largura: e.nativeEvent.layout.width, altura: e.nativeEvent.layout.height })
        }
      />

      {/* Camada de rótulos: Views comuns posicionadas sobre o mapa pela projeção Web Mercator.
          Funciona igual nos dois motores de mapa (MapLibre e react-native-maps). */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {modo === 'ver' &&
          visiveis.map((p) => {
            const pos = projetar(centroPoligono(p.vertices));
            if (!pos) return null;
            return (
              <Pressable
                key={`etq-${p.id}`}
                onPress={() => setSelecionado(p)}
                style={[styles.etiquetaArea, { borderColor: p.cor, left: pos.x - 80, top: pos.y - 22 }]}
              >
                <Text style={styles.etiquetaAreaNome} numberOfLines={1}>
                  {p.nome}
                </Text>
                <Text style={styles.etiquetaAreaValor}>{formatarArea(p.areaM2)}</Text>
              </Pressable>
            );
          })}
        {mostrarNomes &&
          pontos.map((p) => {
            const pos = projetar(p);
            if (!pos) return null;
            return (
              <Pressable
                key={`nome-${p.id}`}
                onPress={() => aoTocarPonto(p)}
                style={[styles.marcadorNome, { left: pos.x - 70, top: pos.y - 40 }]}
              >
                <Text style={styles.marcadorNomeTexto} numberOfLines={1}>
                  {p.nome}
                </Text>
              </Pressable>
            );
          })}
      </View>

      {/* Controles laterais */}
      <View style={styles.controles}>
        {/* mostra o ícone da camada para a qual o botão vai trocar */}
        <BotaoRedondo
          icone={camadaMapa === 'satelite' ? '🗺️' : '🛰️'}
          onPress={() => setCamadaMapa(camadaMapa === 'satelite' ? 'ruas' : 'satelite')}
        />
        {camadaMapa === 'satelite' && (
          <BotaoRedondo icone="🏷️" ativo={rotulos} onPress={() => setRotulos((r) => !r)} />
        )}
        <BotaoRedondo icone="🔍" onPress={enquadrarTudo} />
        <BotaoRedondo icone="🎯" onPress={irParaMinhaPosicao} />
      </View>

      {modo === 'desenhar' && (
        <View style={styles.dica} pointerEvents="none">
          <Text style={styles.dicaTexto}>
            Toque no mapa para adicionar vértices • toque num ponto coletado para usá-lo • segure e arraste
            um vértice para ajustar
          </Text>
        </View>
      )}

      {/* Painel inferior */}
      {modo === 'desenhar' ? (
        <View style={styles.painel}>
          <View style={styles.medidas}>
            <Medida rotulo="Vértices" valor={String(vertices.length)} />
            <Medida rotulo="Área" valor={vertices.length >= 3 ? formatarArea(areaDesenho) : '—'} />
            <Medida rotulo="Perímetro" valor={vertices.length >= 2 ? formatarDistancia(perimetroDesenho) : '—'} />
          </View>
          {cruzando && <Text style={styles.alerta}>⚠️ Há lados se cruzando. Ajuste os vértices.</Text>}
          <View style={styles.linhaBotoes}>
            <BotaoPainel texto="↩️ Desfazer" onPress={desfazer} desabilitado={vertices.length === 0} />
            <BotaoPainel texto={buscandoGps ? 'GPS...' : '📡 Vértice GPS'} onPress={verticeNoGps} desabilitado={buscandoGps} />
          </View>
          <View style={styles.linhaBotoes}>
            <BotaoPainel texto="Cancelar" onPress={cancelarDesenho} />
            <BotaoPainel
              texto={salvando ? 'Salvando...' : editandoId ? '✔️ Salvar vértices' : '✔️ Concluir área'}
              onPress={concluirDesenho}
              destaque
              desabilitado={vertices.length < 3 || salvando}
            />
          </View>
        </View>
      ) : selecionado ? (
        <View style={styles.painel}>
          <View style={styles.cartaoTopo}>
            <View style={[styles.corAmostra, { backgroundColor: selecionado.cor }]} />
            <Text style={styles.cartaoNome} numberOfLines={1}>
              {selecionado.nome}
            </Text>
            <Pressable onPress={() => setSelecionado(null)} hitSlop={12}>
              <Text style={styles.fechar}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.medidas}>
            <Medida rotulo="Área" valor={`${numeroBR(selecionado.areaM2 / 10000, 4)} ha`} />
            <Medida rotulo="m²" valor={numeroBR(selecionado.areaM2, 0)} />
            <Medida rotulo="Alq. mineiro" valor={numeroBR(selecionado.areaM2 / M2_POR_ALQUEIRE_MINEIRO, 3)} />
          </View>
          <Text style={styles.cartaoInfo}>
            Perímetro {formatarDistancia(selecionado.perimetroM)} • {selecionado.vertices.length} vértices
          </Text>
          {selecionado.observacoes ? (
            <Text style={styles.cartaoObs} numberOfLines={2}>
              {selecionado.observacoes}
            </Text>
          ) : null}
          <BotaoPainel
            texto="Ver detalhes e editar"
            destaque
            onPress={() => navigation.navigate('DetalhePoligono', { id: selecionado.id })}
          />
        </View>
      ) : (
        <View style={styles.acoes}>
          <BotaoPainel texto="✏️ Desenhar área" destaque onPress={iniciarDesenho} />
          <BotaoPainel texto="🛰️ Coletar ponto" onPress={() => navigation.navigate('NovoPonto')} />
        </View>
      )}
    </View>
  );
}

// ---------- Componentes auxiliares ----------

function BotaoRedondo({ icone, onPress, ativo }: { icone: string; onPress: () => void; ativo?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.redondo, ativo && styles.redondoAtivo]}>
      <Text style={styles.redondoIcone}>{icone}</Text>
    </Pressable>
  );
}

function BotaoPainel({
  texto,
  onPress,
  destaque,
  desabilitado,
}: {
  texto: string;
  onPress: () => void;
  destaque?: boolean;
  desabilitado?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      style={({ pressed }) => [
        styles.botaoPainel,
        destaque && styles.botaoPainelDestaque,
        (pressed || desabilitado) && { opacity: desabilitado ? 0.45 : 0.8 },
      ]}
    >
      <Text style={[styles.botaoPainelTexto, destaque && { color: colors.branco }]}>{texto}</Text>
    </Pressable>
  );
}

function Medida({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.medida}>
      <Text style={styles.medidaRotulo}>{rotulo}</Text>
      <Text style={styles.medidaValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
  },
  carregando: {
    alignItems: 'center',
    backgroundColor: colors.cinzaFundo,
    flex: 1,
    justifyContent: 'center',
  },
  carregandoTexto: {
    color: '#C7D8E8',
    marginTop: 10,
  },
  headerBotao: {
    color: colors.laranjaMarco,
    fontSize: 15,
    fontWeight: '800',
  },
  // Rótulos (camada sobre o mapa)
  etiquetaArea: {
    alignItems: 'center',
    backgroundColor: 'rgba(11,42,74,0.88)',
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    width: 160,
  },
  etiquetaAreaNome: {
    color: colors.branco,
    fontSize: 12,
    fontWeight: '800',
  },
  etiquetaAreaValor: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '700',
  },
  marcadorNome: {
    alignItems: 'center',
    position: 'absolute',
    width: 140,
  },
  marcadorNomeTexto: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    color: colors.branco,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  // Controles
  controles: {
    position: 'absolute',
    right: 12,
    top: 50,
  },
  redondo: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    elevation: 4,
    height: 48,
    justifyContent: 'center',
    marginBottom: 10,
    width: 48,
  },
  redondoAtivo: {
    backgroundColor: colors.laranjaMarco,
  },
  redondoIcone: {
    fontSize: 20,
  },
  dica: {
    backgroundColor: 'rgba(11,42,74,0.9)',
    borderRadius: 10,
    left: 12,
    padding: 10,
    position: 'absolute',
    right: 72,
    top: 50,
  },
  dicaTexto: {
    color: colors.branco,
    fontSize: 12,
    lineHeight: 17,
  },
  // Painel inferior
  painel: {
    backgroundColor: colors.brancoMineral,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    bottom: 0,
    elevation: 10,
    left: 0,
    paddingBottom: 26,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 0,
  },
  acoes: {
    bottom: 26,
    flexDirection: 'row',
    gap: 10,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  medidas: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  medida: {
    flex: 1,
  },
  medidaRotulo: {
    color: colors.cinzaPrecisao,
    fontSize: 11,
    fontWeight: '700',
  },
  medidaValor: {
    color: colors.azulGnss,
    fontSize: 18,
    fontWeight: '800',
  },
  alerta: {
    color: colors.vermelhoErro,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  linhaBotoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  botaoPainel: {
    alignItems: 'center',
    backgroundColor: colors.branco,
    borderColor: colors.azulGnss,
    borderRadius: 10,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 8,
  },
  botaoPainelDestaque: {
    backgroundColor: colors.laranjaMarco,
    borderColor: colors.laranjaMarco,
  },
  botaoPainelTexto: {
    color: colors.azulGnss,
    fontSize: 15,
    fontWeight: '800',
  },
  cartaoTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  corAmostra: {
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 1,
    height: 20,
    marginRight: 10,
    width: 20,
  },
  cartaoNome: {
    color: colors.azulGnss,
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
  },
  fechar: {
    color: colors.cinzaPrecisao,
    fontSize: 20,
    fontWeight: '700',
  },
  cartaoInfo: {
    color: colors.cinzaPrecisao,
    fontSize: 13,
  },
  cartaoObs: {
    color: colors.texto,
    fontSize: 13,
    marginBottom: 4,
    marginTop: 6,
  },
});
