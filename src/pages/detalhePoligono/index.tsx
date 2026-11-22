import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Botao } from '../../components/Botao';
import { CampoTexto } from '../../components/CampoTexto';
import { MapaBase, MapaBaseRef, regiaoPara } from '../../components/mapa';
import { useAuth } from '../../context/AuthContext';
import { usePreferencias } from '../../context/PreferenciasContext';
import { colors } from '../../global/colors';
import { formatarDataHora, formatarDistancia, numeroBR } from '../../global/formatos';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import {
  M2_POR_ALQUEIRE_MINEIRO,
  M2_POR_ALQUEIRE_PAULISTA,
  M2_POR_HECTARE,
  temAutointersecao,
} from '../../services/geodesia';
import {
  atualizarPoligono,
  CORES_POLIGONO,
  excluirPoligono,
  obterPoligono,
  Poligono,
} from '../../services/poligonos';

export default function DetalhePoligono({ navigation, route }: ScreenProps<'DetalhePoligono'>) {
  const { id, novo } = route.params;
  const { usuario } = useAuth();
  const mapaRef = useRef<MapaBaseRef>(null);
  const { camadaMapa } = usePreferencias();

  const [poligono, setPoligono] = useState<Poligono | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [cor, setCor] = useState<string>(CORES_POLIGONO[0]);
  const [erroNome, setErroNome] = useState('');
  const formularioCarregado = useRef(false);

  // Recarrega ao voltar da edição de vértices (área/perímetro mudam);
  // o formulário só é preenchido na primeira vez para não perder o que foi digitado.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      (async () => {
        if (!usuario) return;
        const encontrado = await obterPoligono(usuario.email, id);
        if (!ativo) return;
        setPoligono(encontrado);
        if (encontrado && !formularioCarregado.current) {
          formularioCarregado.current = true;
          setNome(encontrado.nome);
          setObservacoes(encontrado.observacoes);
          setCor(encontrado.cor);
          navigation.setOptions({ title: encontrado.nome });
        }
        if (encontrado) {
          // reenquadra ao voltar da edição de vértices (a região inicial só vale na montagem)
          setTimeout(
            () =>
              mapaRef.current?.enquadrar(encontrado.vertices, { top: 30, right: 30, bottom: 30, left: 30 }, false),
            300,
          );
        }
        setCarregando(false);
      })();
      return () => {
        ativo = false;
      };
    }, [id, usuario, navigation]),
  );

  async function salvar() {
    if (!usuario || !poligono) return;
    if (!nome.trim()) {
      setErroNome('Informe um nome para a área.');
      return;
    }
    setErroNome('');
    setSalvando(true);
    try {
      const atualizado = await atualizarPoligono(usuario.email, id, {
        nome: nome.trim(),
        observacoes: observacoes.trim(),
        cor,
      });
      setPoligono(atualizado);
      navigation.setOptions({ title: atualizado.nome });
      Alert.alert('Área salva', 'Os dados da área foram atualizados.', [
        { text: 'OK', onPress: () => novo && navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir área', `Deseja excluir "${poligono?.nome}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!usuario) return;
          await excluirPoligono(usuario.email, id);
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
  if (!poligono) {
    return (
      <View style={[globalStyles.tela, globalStyles.centralizado]}>
        <Text style={globalStyles.textoClaro}>Área não encontrada.</Text>
      </View>
    );
  }

  const area = poligono.areaM2;
  const cruzando = temAutointersecao(poligono.vertices);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={globalStyles.tela}>
      <ScrollView contentContainerStyle={globalStyles.conteudo} keyboardShouldPersistTaps="handled">
        {novo && (
          <View style={styles.banner}>
            <Text style={styles.bannerTexto}>✅ Área criada! Dê um nome, escolha a cor e anote observações.</Text>
          </View>
        )}

        {/* Prévia no mapa (toque para abrir no mapa grande) */}
        <Pressable onPress={() => navigation.navigate('Mapa', { focoPoligonoId: poligono.id })}>
          <View style={styles.previa} pointerEvents="none">
            <MapaBase
              ref={mapaRef}
              regiaoInicial={regiaoPara(poligono.vertices, 1.3)}
              camadaBase={camadaMapa}
              areas={[{ id: poligono.id, vertices: poligono.vertices, cor, destaque: true }]}
              interativo={false}
            />
          </View>
          <Text style={styles.previaDica}>Toque para abrir no mapa</Text>
        </Pressable>

        {/* Medidas */}
        <View style={styles.medidas}>
          <Text style={styles.secaoClara}>MEDIDAS</Text>
          <Text style={styles.areaPrincipal}>{numeroBR(area / M2_POR_HECTARE, 4)} ha</Text>
          <View style={styles.linha}>
            <Medida rotulo="Metros quadrados" valor={`${numeroBR(area, 2)} m²`} />
            <Medida rotulo="Perímetro" valor={formatarDistancia(poligono.perimetroM)} />
          </View>
          <View style={styles.linha}>
            <Medida rotulo="Alqueire mineiro" valor={numeroBR(area / M2_POR_ALQUEIRE_MINEIRO, 4)} />
            <Medida rotulo="Alqueire paulista" valor={numeroBR(area / M2_POR_ALQUEIRE_PAULISTA, 4)} />
          </View>
          <Text style={styles.info}>
            {poligono.vertices.length} vértices • área calculada no elipsoide WGS84/SIRGAS 2000
          </Text>
          {cruzando && <Text style={styles.alerta}>⚠️ Lados se cruzam: a área pode estar incorreta.</Text>}
          <Pressable
            onPress={() => navigation.navigate('Mapa', { editarPoligonoId: poligono.id })}
            style={({ pressed }) => [styles.editarVertices, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.editarVerticesTexto}>✏️  Editar vértices no mapa</Text>
          </Pressable>
        </View>

        {/* Detalhes */}
        <View style={globalStyles.card}>
          <Text style={styles.secao}>Detalhes</Text>
          <CampoTexto label="Nome da área *" value={nome} onChangeText={setNome} erro={erroNome} />

          <Text style={styles.label}>Cor no mapa</Text>
          <View style={styles.cores}>
            {CORES_POLIGONO.map((c) => (
              <Pressable
                key={c}
                accessibilityLabel={`Cor ${c}`}
                onPress={() => setCor(c)}
                style={[styles.cor, { backgroundColor: c }, cor === c && styles.corAtiva]}
              >
                {cor === c && <Text style={styles.corCheck}>✓</Text>}
              </Pressable>
            ))}
          </View>

          <CampoTexto
            label="Observações"
            placeholder="Uso do solo, confrontantes, cultura, situação da cerca..."
            value={observacoes}
            onChangeText={setObservacoes}
            multiline
          />
          <Text style={styles.datas}>
            Criada em {formatarDataHora(poligono.criadoEm)}
            {'\n'}Última alteração: {formatarDataHora(poligono.atualizadoEm)}
          </Text>
          <Botao titulo="Salvar alterações" onPress={salvar} carregando={salvando} />
        </View>

        <Pressable onPress={confirmarExclusao} style={styles.excluir}>
          <Text style={styles.excluirTexto}>🗑️  Excluir área</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Medida({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={{ flex: 1, paddingRight: 8 }}>
      <Text style={styles.medidaRotulo}>{rotulo}</Text>
      <Text style={styles.medidaValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
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
  previa: {
    borderRadius: 16,
    height: 220,
    overflow: 'hidden',
  },
  previaDica: {
    color: '#93A8C0',
    fontSize: 12,
    marginBottom: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  medidas: {
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
  },
  areaPrincipal: {
    color: colors.branco,
    fontFamily: 'monospace',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 4,
  },
  linha: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  medidaRotulo: {
    color: '#93A8C0',
    fontSize: 12,
  },
  medidaValor: {
    color: colors.branco,
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  info: {
    color: '#93A8C0',
    fontSize: 12,
  },
  alerta: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  editarVertices: {
    alignItems: 'center',
    borderColor: colors.laranjaMarco,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  editarVerticesTexto: {
    color: colors.laranjaMarco,
    fontSize: 15,
    fontWeight: '800',
  },
  secao: {
    color: colors.azulGnss,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  label: {
    color: colors.texto,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  cores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  cor: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  corAtiva: {
    borderColor: colors.azulGnss,
    borderWidth: 3,
  },
  corCheck: {
    color: colors.azulGnss,
    fontSize: 18,
    fontWeight: '900',
  },
  datas: {
    color: colors.cinzaPrecisao,
    fontSize: 12,
    lineHeight: 18,
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
