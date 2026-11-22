/**
 * Tela de detalhe do ponto (View) — FORMULÁRIO de edição e o "R", "U" e "D" do CRUD.
 *
 * Mostra as coordenadas coletadas (somente leitura, no formato GMS/Decimal/UTM escolhido),
 * altitude, precisão e hora da coleta. Permite editar nome, tipo, responsável e
 * observações, tirar/escolher foto (expo-image-picker), recoletar a localização, abrir no
 * mapa, ver o histórico de recoletas e excluir o ponto.
 *
 * Hooks: useState (campos), useRef (foco, fotos pendentes, formulário já carregado),
 * useCallback + useFocusEffect (recarregar ao voltar da recoleta) e useEffect (apagar
 * fotos tiradas e não salvas quando o usuário sai da tela).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

import { Botao } from '../../components/Botao';
import { CampoTexto } from '../../components/CampoTexto';
import { formatarMetros, linhasCoordenada, SeletorFormato, textoCoordenada } from '../../components/Coordenadas';
import { useAuth } from '../../context/AuthContext';
import { usePreferencias } from '../../context/PreferenciasContext';
import { colors } from '../../global/colors';
import { classificarPrecisao, formatarDataHora, ICONE_TIPO, metrosBR } from '../../global/formatos';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import { distanciaMetros } from '../../services/geodesia';
import { permissaoCamera, permissaoGaleria } from '../../services/permissoes';
import {
  atualizarPonto,
  excluirArquivo,
  excluirPonto,
  guardarFoto,
  obterPonto,
  Ponto,
  TIPOS_PONTO,
  TipoPonto,
} from '../../services/storage';

export default function DetalhePonto({ navigation, route }: ScreenProps<'DetalhePonto'>) {
  const { id, novo } = route.params;
  const { usuario } = useAuth();
  const { formato } = usePreferencias();

  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Campos editáveis
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoPonto>('Marco');
  const [responsavel, setResponsavel] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [erroNome, setErroNome] = useState('');

  const descricaoRef = useRef<TextInput>(null);
  // Fotos tiradas nesta edição e ainda não salvas (para limpar se o usuário descartar)
  const fotosPendentes = useRef<string[]>([]);
  const formularioCarregado = useRef(false);

  // Carrega o ponto sempre que a tela ganha foco (ex.: voltando de uma recoleta).
  // Os campos do formulário só são preenchidos na primeira vez, para não
  // apagar o que o usuário digitou e ainda não salvou.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      async function carregar() {
        if (!usuario) return;
        const encontrado = await obterPonto(usuario.email, id);
        if (!ativo) return;
        if (encontrado) {
          setPonto(encontrado);
          if (!formularioCarregado.current) {
            formularioCarregado.current = true;
            setNome(encontrado.nome);
            setTipo(encontrado.tipo);
            setResponsavel(encontrado.responsavel);
            setDescricao(encontrado.descricao);
            setFotoUri(encontrado.fotoUri);
            navigation.setOptions({ title: encontrado.nome });
          }
        }
        setCarregando(false);
      }
      carregar();
      return () => {
        ativo = false;
      };
    }, [id, usuario, navigation]),
  );

  // Ao sair sem salvar, apaga fotos novas que não foram usadas
  useEffect(() => {
    return () => {
      fotosPendentes.current.forEach((uri) => excluirArquivo(uri));
    };
  }, []);

  async function escolherFoto(origem: 'camera' | 'galeria') {
    const permitido = origem === 'camera' ? await permissaoCamera() : await permissaoGaleria();

    if (!permitido) {
      Alert.alert('Permissão necessária', 'Autorize o acesso para anexar fotos ao ponto.');
      return;
    }

    const opcoes: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    };
    const resultado =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);

    if (resultado.canceled || !resultado.assets[0]) return;

    const uri = await guardarFoto(resultado.assets[0].uri, id);
    fotosPendentes.current.push(uri);
    setFotoUri(uri);
  }

  function opcoesFoto() {
    Alert.alert('Foto do ponto', 'Escolha a origem da foto', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Galeria', onPress: () => escolherFoto('galeria') },
      { text: 'Câmera', onPress: () => escolherFoto('camera') },
    ]);
  }

  async function salvar() {
    if (!usuario || !ponto) return;
    if (!nome.trim()) {
      setErroNome('Informe um nome para o ponto.');
      return;
    }
    setErroNome('');
    setSalvando(true);
    try {
      const atualizado = await atualizarPonto(usuario.email, id, {
        nome: nome.trim(),
        tipo,
        responsavel: responsavel.trim(),
        descricao: descricao.trim(),
        fotoUri,
      });
      // A foto escolhida agora pertence ao ponto; as demais pendentes são descartadas
      fotosPendentes.current = fotosPendentes.current.filter((uri) => uri !== fotoUri);
      fotosPendentes.current.forEach((uri) => excluirArquivo(uri));
      fotosPendentes.current = [];

      setPonto(atualizado);
      navigation.setOptions({ title: atualizado.nome });
      Alert.alert('Ponto salvo', 'Os detalhes do ponto foram atualizados.', [
        { text: 'OK', onPress: () => novo && navigation.replace('MeusPontos') },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir ponto', `Deseja excluir "${ponto?.nome}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!usuario) return;
          await excluirPonto(usuario.email, id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (carregando) {
    return (
      <View style={[globalStyles.tela, globalStyles.centralizado]}>
        <ActivityIndicator size="large" color={colors.laranjaMarco} />
      </View>
    );
  }

  if (!ponto) {
    return (
      <View style={[globalStyles.tela, globalStyles.centralizado]}>
        <Text style={globalStyles.textoClaro}>Ponto não encontrado.</Text>
      </View>
    );
  }

  const semaforo = classificarPrecisao(ponto.precisao);
  const linhas = linhasCoordenada(ponto.latitude, ponto.longitude, formato);
  const anterior = ponto.historico[0];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={globalStyles.tela}
    >
      <ScrollView contentContainerStyle={globalStyles.conteudo} keyboardShouldPersistTaps="handled">
        {novo && (
          <View style={styles.banner}>
            <Text style={styles.bannerTexto}>✅ Ponto registrado! Agora complete os detalhes e tire uma foto.</Text>
          </View>
        )}

        {/* -------- Coordenadas coletadas (somente leitura) -------- */}
        <View style={styles.coordenadas}>
          <Text style={styles.secaoClara}>COORDENADAS COLETADAS</Text>
          <View style={{ marginBottom: 14 }}>
            <SeletorFormato />
          </View>
          <View style={styles.linhaCoord}>
            {linhas.map((l) => (
              <View key={l.rotulo} style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.rotulo}>{l.rotulo}</Text>
                <Text style={styles.valor} adjustsFontSizeToFit numberOfLines={1}>
                  {l.valor}
                </Text>
                <Text style={styles.gms}>{l.detalhe}</Text>
              </View>
            ))}
          </View>
          <View style={styles.linhaCoord}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rotulo}>Altitude</Text>
              <Text style={styles.valor}>{ponto.altitude != null ? metrosBR(ponto.altitude) : '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rotulo}>Precisão</Text>
              <Text style={[styles.valor, { color: semaforo.cor === colors.cinzaPrecisao ? colors.branco : semaforo.cor }]}>
                {semaforo.icone} {ponto.precisao != null ? `±${metrosBR(ponto.precisao)}` : '—'}
              </Text>
            </View>
          </View>
          <View style={styles.rodapeCoord}>
            <Text style={styles.rotulo}>🕒 {ponto.historico.length > 0 ? 'Recoletado em' : 'Coletado em'}</Text>
            <Text style={styles.hora}>{formatarDataHora(ponto.coletadoEm)}</Text>
          </View>

          {anterior && (
            <View style={styles.historico}>
              <Text style={styles.rotulo}>
                📜 Histórico: {ponto.historico.length} {ponto.historico.length === 1 ? 'coleta anterior' : 'coletas anteriores'}
              </Text>
              <Text style={styles.historicoTexto}>
                Anterior: {textoCoordenada(anterior.latitude, anterior.longitude, formato)}
              </Text>
              <Text style={styles.historicoTexto}>
                {formatarDataHora(anterior.coletadoEm)} • deslocamento de{' '}
                {formatarMetros(distanciaMetros(anterior.latitude, anterior.longitude, ponto.latitude, ponto.longitude))} m
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('NovoPonto', { recoletarId: ponto.id })}
            style={({ pressed }) => [styles.recoletar, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.recoletarTexto}>📡  Recoletar localização</Text>
          </Pressable>
        </View>

        {/* -------- Foto -------- */}
        <View style={globalStyles.card}>
          <Text style={styles.secao}>Foto do ponto</Text>
          {fotoUri ? (
            <>
              <Image source={{ uri: fotoUri }} style={styles.foto} />
              <View style={styles.linhaBotoes}>
                <Botao titulo="Trocar foto" variante="secundario" onPress={opcoesFoto} style={{ flex: 1, marginRight: 8 }} />
                <Botao
                  titulo="Remover"
                  variante="secundario"
                  onPress={() => setFotoUri(null)}
                  style={{ flex: 1, marginLeft: 8, borderColor: colors.vermelhoErro }}
                />
              </View>
            </>
          ) : (
            <Pressable onPress={opcoesFoto} style={styles.semFoto}>
              <Text style={{ fontSize: 40 }}>📷</Text>
              <Text style={styles.semFotoTexto}>Tirar ou escolher uma foto</Text>
            </Pressable>
          )}
        </View>

        {/* -------- Detalhes (editáveis) -------- */}
        <View style={globalStyles.card}>
          <Text style={styles.secao}>Detalhes</Text>

          <CampoTexto
            label="Nome do ponto *"
            value={nome}
            onChangeText={setNome}
            erro={erroNome}
            returnKeyType="next"
            onSubmitEditing={() => descricaoRef.current?.focus()}
          />

          <Text style={styles.label}>Tipo</Text>
          <View style={styles.tipos}>
            {TIPOS_PONTO.map((t) => (
              <Pressable key={t} onPress={() => setTipo(t)} style={[styles.tipo, tipo === t && styles.tipoAtivo]}>
                <Text style={[styles.tipoTexto, tipo === t && styles.tipoTextoAtivo]}>
                  {ICONE_TIPO[t]} {t}
                </Text>
              </Pressable>
            ))}
          </View>

          <CampoTexto label="Responsável pela coleta" value={responsavel} onChangeText={setResponsavel} />

          <CampoTexto
            ref={descricaoRef}
            label="Observações"
            placeholder="Tipo de marco, condições do local, acesso, referências..."
            value={descricao}
            onChangeText={setDescricao}
            multiline
          />

          <Text style={styles.atualizado}>Última alteração: {formatarDataHora(ponto.atualizadoEm)}</Text>

          <Botao titulo="Salvar alterações" onPress={salvar} carregando={salvando} />
          <Botao
            titulo="🗺️  Ver no mapa"
            variante="secundario"
            style={{ marginTop: 12 }}
            onPress={() => navigation.navigate('Mapa', { focoPontoId: ponto.id })}
          />
          <Botao
            titulo="🌦️  Ver clima neste local"
            variante="secundario"
            style={{ marginTop: 12 }}
            onPress={() =>
              navigation.navigate('Clima', { latitude: ponto.latitude, longitude: ponto.longitude, nome: ponto.nome })
            }
          />
        </View>

        <Pressable onPress={confirmarExclusao} style={styles.excluir}>
          <Text style={styles.excluirTexto}>🗑️  Excluir ponto</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#14532D',
    borderRadius: 12,
    marginBottom: 14,
    padding: 14,
  },
  bannerTexto: {
    color: '#DCFCE7',
    fontSize: 14,
    fontWeight: '600',
  },
  coordenadas: {
    backgroundColor: colors.azulGnss,
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
  },
  secaoClara: {
    color: colors.laranjaMarco,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  linhaCoord: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  rotulo: {
    color: '#93A8C0',
    fontSize: 12,
  },
  valor: {
    color: colors.branco,
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  gms: {
    color: '#C7D8E8',
    fontSize: 12,
    marginTop: 2,
  },
  rodapeCoord: {
    borderTopColor: '#1E4468',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  historico: {
    backgroundColor: '#071C33',
    borderRadius: 10,
    marginTop: 14,
    padding: 12,
  },
  historicoTexto: {
    color: '#C7D8E8',
    fontSize: 12,
    marginTop: 4,
  },
  recoletar: {
    alignItems: 'center',
    borderColor: colors.laranjaMarco,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  recoletarTexto: {
    color: colors.laranjaMarco,
    fontSize: 15,
    fontWeight: '800',
  },
  hora: {
    color: colors.branco,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  secao: {
    color: colors.azulGnss,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  foto: {
    aspectRatio: 4 / 3,
    borderRadius: 12,
    width: '100%',
  },
  linhaBotoes: {
    flexDirection: 'row',
    marginTop: 4,
  },
  semFoto: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 2,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  semFotoTexto: {
    color: colors.azulGnss,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  label: {
    color: colors.texto,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tipo: {
    borderColor: '#CBD5E1',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tipoAtivo: {
    backgroundColor: colors.azulGnss,
    borderColor: colors.azulGnss,
  },
  tipoTexto: {
    color: colors.texto,
    fontSize: 13,
  },
  tipoTextoAtivo: {
    color: colors.branco,
    fontWeight: '700',
  },
  atualizado: {
    color: colors.cinzaPrecisao,
    fontSize: 12,
    marginBottom: 4,
  },
  excluir: {
    alignItems: 'center',
    padding: 14,
  },
  excluirTexto: {
    color: '#F87171',
    fontSize: 15,
    fontWeight: '700',
  },
});
