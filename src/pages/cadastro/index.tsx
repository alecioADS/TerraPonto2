import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { Botao } from '../../components/Botao';
import { CampoTexto } from '../../components/CampoTexto';
import { globalStyles } from '../../global/styles';
import { ScreenProps } from '../../routes';
import { cadastrarUsuario } from '../../services/storage';

type Erros = Partial<Record<'nome' | 'email' | 'senha' | 'confirmar', string>>;

export default function Cadastro({ navigation }: ScreenProps<'Cadastro'>) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [carregando, setCarregando] = useState(false);

  // useRef: pular de um campo para o outro sem re-renderizar a tela
  const emailRef = useRef<TextInput>(null);
  const senhaRef = useRef<TextInput>(null);
  const confirmarRef = useRef<TextInput>(null);

  function validar(): boolean {
    const novos: Erros = {};
    if (nome.trim().length < 3) novos.nome = 'Informe seu nome completo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) novos.email = 'E-mail inválido.';
    if (senha.length < 6) novos.senha = 'A senha deve ter pelo menos 6 caracteres.';
    if (confirmar !== senha) novos.confirmar = 'As senhas não conferem.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleCadastrar() {
    if (!validar()) return;

    setCarregando(true);
    try {
      await cadastrarUsuario({ nome: nome.trim(), email, senha });
      Alert.alert('Conta criada!', 'Agora é só entrar com seu e-mail e senha.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setErros({ email: (e as Error).message });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={globalStyles.tela}
    >
      <ScrollView contentContainerStyle={globalStyles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={globalStyles.card}>
          <Text style={globalStyles.titulo}>Crie sua conta</Text>
          <Text style={globalStyles.subtitulo}>
            Cadastre-se para registrar seus pontos de campo.
          </Text>

          <CampoTexto
            label="Nome completo"
            placeholder="Seu nome"
            value={nome}
            onChangeText={setNome}
            erro={erros.nome}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <CampoTexto
            ref={emailRef}
            label="E-mail"
            placeholder="nome@exemplo.com"
            value={email}
            onChangeText={setEmail}
            erro={erros.email}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => senhaRef.current?.focus()}
          />
          <CampoTexto
            ref={senhaRef}
            label="Senha"
            placeholder="Mínimo 6 caracteres"
            value={senha}
            onChangeText={setSenha}
            erro={erros.senha}
            secureTextEntry
            returnKeyType="next"
            onSubmitEditing={() => confirmarRef.current?.focus()}
          />
          <CampoTexto
            ref={confirmarRef}
            label="Confirmar senha"
            placeholder="Repita a senha"
            value={confirmar}
            onChangeText={setConfirmar}
            erro={erros.confirmar}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleCadastrar}
          />

          <Botao titulo="Cadastrar" onPress={handleCadastrar} carregando={carregando} />
          <Botao
            titulo="Já tenho conta"
            variante="secundario"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
