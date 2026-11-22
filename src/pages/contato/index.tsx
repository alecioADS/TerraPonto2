/**
 * Tela "Fale conosco" (View) — FORMULÁRIO + API (requisitos do trabalho).
 *
 * Formulário com nome, e-mail, assunto (botões de escolha) e mensagem, com validação.
 * Ao enviar, faz um POST na API JSONPlaceholder (services/api.ts → enviarContato) e mostra
 * o número de protocolo devolvido pelo servidor.
 *
 * Hooks: useState (campos, erros, enviando), useRef (focar a mensagem quando ela é o campo
 * com erro) e useAuth (preencher nome e e-mail com os dados do usuário logado).
 */
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Botao } from '../../components/Botao';
import { CampoTexto } from '../../components/CampoTexto';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../global/colors';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import { enviarContato } from '../../services/api';

const ASSUNTOS = ['Dúvida', 'Sugestão', 'Problema', 'Outro'];

export default function Contato({ navigation }: ScreenProps<'Contato'>) {
  const { usuario } = useAuth();
  // Já preenche com os dados de quem está logado
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [assunto, setAssunto] = useState(ASSUNTOS[0]);
  const [mensagem, setMensagem] = useState('');
  const [erros, setErros] = useState<Partial<Record<'nome' | 'email' | 'mensagem', string>>>({});
  const [enviando, setEnviando] = useState(false);

  const mensagemRef = useRef<TextInput>(null);

  // Valida os campos e envia para a API
  async function handleEnviar() {
    const novos: typeof erros = {};
    if (nome.trim().length < 3) novos.nome = 'Informe seu nome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) novos.email = 'E-mail inválido.';
    if (mensagem.trim().length < 10) novos.mensagem = 'Escreva ao menos 10 caracteres.';
    setErros(novos);

    if (Object.keys(novos).length > 0) {
      if (novos.mensagem) mensagemRef.current?.focus();
      return;
    }

    setEnviando(true);
    try {
      const protocolo = await enviarContato({ nome, email, assunto, mensagem });
      setMensagem('');
      Alert.alert(
        'Mensagem enviada!',
        `Protocolo nº ${protocolo}. Responderemos em breve no e-mail ${email}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={globalStyles.tela}
    >
      <ScrollView contentContainerStyle={globalStyles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={globalStyles.card}>
          <Text style={globalStyles.titulo}>Fale conosco</Text>
          <Text style={globalStyles.subtitulo}>
            Envie dúvidas, sugestões ou relate problemas com o app.
          </Text>

          <CampoTexto label="Nome" value={nome} onChangeText={setNome} erro={erros.nome} />
          <CampoTexto
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            erro={erros.email}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Assunto</Text>
          <View style={styles.assuntos}>
            {ASSUNTOS.map((a) => (
              <Pressable
                key={a}
                onPress={() => setAssunto(a)}
                style={[styles.assunto, assunto === a && styles.assuntoAtivo]}
              >
                <Text style={[styles.assuntoTexto, assunto === a && styles.assuntoTextoAtivo]}>
                  {a}
                </Text>
              </Pressable>
            ))}
          </View>

          <CampoTexto
            ref={mensagemRef}
            label="Mensagem"
            placeholder="Descreva aqui..."
            value={mensagem}
            onChangeText={setMensagem}
            erro={erros.mensagem}
            multiline
            maxLength={500}
          />
          <Text style={styles.contador}>{mensagem.length}/500</Text>

          <Botao titulo="Enviar mensagem" onPress={handleEnviar} carregando={enviando} />
        </View>

        <View style={globalStyles.card}>
          <Text style={[globalStyles.titulo, { fontSize: 18 }]}>Outros canais</Text>
          <Text style={styles.canal}>📧 suporte@terraponto.app</Text>
          <Text style={styles.canal}>📞 (34) 3000-0000</Text>
          <Text style={styles.canal}>🕘 Seg a sex, 8h às 18h</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.texto,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  assuntos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  assunto: {
    borderColor: '#CBD5E1',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  assuntoAtivo: {
    backgroundColor: colors.azulGnss,
    borderColor: colors.azulGnss,
  },
  assuntoTexto: {
    color: colors.texto,
    fontSize: 13,
  },
  assuntoTextoAtivo: {
    color: colors.branco,
    fontWeight: '700',
  },
  contador: {
    color: colors.cinzaPrecisao,
    fontSize: 12,
    marginTop: -8,
    textAlign: 'right',
  },
  canal: {
    color: colors.texto,
    fontSize: 15,
    marginTop: 10,
  },
});
