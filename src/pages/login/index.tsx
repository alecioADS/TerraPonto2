/**
 * Tela de Login (View).
 *
 * Formulário de e-mail e senha com validação local antes de consultar o Model
 * (`autenticar` em services/storage.ts). Se der certo, chama `entrar()` do AuthContext,
 * e as rotas trocam sozinhas para a Home.
 *
 * Hooks: useState (campos, erro, carregando, mostrar senha) e useRef (pular do e-mail
 * para a senha ao apertar "próximo" no teclado, sem re-renderizar a tela).
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Logo from '../../assets/images/logo-selo.png';
import { useAuth } from '../../context/AuthContext';
import { ScreenProps } from '../../routes';
import { autenticar } from '../../services/storage';
import { styles } from './styles';

export default function Login({ navigation }: ScreenProps<'Login'>) {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const senhaRef = useRef<TextInput>(null); // referência direta ao campo de senha (dar foco)

  // Valida o formulário e tenta autenticar
  async function handleEntrar() {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (!emailValido) {
      setErro('Digite um e-mail válido.');
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setErro('');
    setCarregando(true);
    try {
      const usuario = await autenticar(email, senha);
      entrar(usuario); // troca automaticamente para as rotas privadas (Home)
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.boxTop}>
            <Image source={Logo} style={styles.logo} accessibilityLabel="Logo TerraPonto" />
            <Text style={styles.brand}>
              Terra<Text style={styles.brandAccent}>Ponto</Text>
            </Text>
            <Text style={styles.slogan}>Do ponto ao terreno.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Entre para continuar seu trabalho em campo.</Text>

            <Text style={styles.label}>Endereço de e-mail</Text>
            <TextInput
              accessibilityLabel="Endereço de e-mail"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              onSubmitEditing={() => senhaRef.current?.focus()}
              placeholder="nome@exemplo.com"
              placeholderTextColor="#8491A3"
              returnKeyType="next"
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordRow}>
              <TextInput
                ref={senhaRef}
                accessibilityLabel="Senha"
                autoComplete="password"
                onChangeText={setSenha}
                onSubmitEditing={handleEntrar}
                placeholder="Digite sua senha"
                placeholderTextColor="#8491A3"
                returnKeyType="done"
                secureTextEntry={!mostrarSenha}
                style={styles.passwordInput}
                value={senha}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setMostrarSenha((valor) => !valor)}
                style={styles.showPassword}
              >
                <Text style={styles.showPasswordText}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</Text>
              </Pressable>
            </View>

            {/* Mensagem de erro de validação ou de autenticação */}
            {erro ? <Text style={styles.error}>{erro}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={carregando}
              onPress={handleEntrar}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              {carregando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Entrar</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="link"
              onPress={() => navigation.navigate('Cadastro')}
              style={styles.linkBox}
            >
              <Text style={styles.linkText}>
                Ainda não tem conta? <Text style={styles.linkAccent}>Cadastre-se</Text>
              </Text>
            </Pressable>
          </View>

          <View style={styles.boxBottom}>
            <View style={styles.statusDot} />
            <Text style={styles.footer}>Pronto para o campo, mesmo offline.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
