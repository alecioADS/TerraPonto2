/**
 * Navegação do app (React Navigation – Native Stack).
 *
 * Implementa o padrão "rotas públicas x privadas": sem usuário logado só existem as telas
 * Login e Cadastro; depois do login, o mesmo navegador passa a ter Home e as demais telas.
 * Como as rotas dependem de `usuario` (AuthContext), entrar/sair troca a pilha sozinho —
 * não é preciso chamar navigate('Home') nem tratar o botão voltar para o Login.
 *
 * `RootStackParamList` tipa os parâmetros de cada rota; `ScreenProps<'Nome'>` dá às telas
 * os tipos corretos de `navigation` e `route.params` (TypeScript acusa navegação errada).
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { colors } from '../global/colors';
import Login from '../pages/login';
import Cadastro from '../pages/cadastro';
import Home from '../pages/home';
import NovoPonto from '../pages/novoPonto';
import MeusPontos from '../pages/meusPontos';
import DetalhePonto from '../pages/detalhePonto';
import Clima from '../pages/clima';
import Contato from '../pages/contato';
import Mapa from '../pages/mapa';
import Areas from '../pages/areas';
import DetalhePoligono from '../pages/detalhePoligono';

// Tipagem das rotas e seus parâmetros (undefined = rota sem parâmetros)
export type RootStackParamList = {
  Login: undefined;
  Cadastro: undefined;
  Home: undefined;
  NovoPonto: { recoletarId?: string } | undefined; // recoletarId: refazer a coleta de um ponto existente
  MeusPontos: undefined;
  DetalhePonto: { id: string; novo?: boolean }; // novo: acabou de ser coletado (mostra aviso)
  Clima: { latitude: number; longitude: number; nome: string } | undefined;
  Contato: undefined;
  Mapa:
    | {
        focoPontoId?: string; // abre centralizado num ponto
        focoPoligonoId?: string; // abre enquadrando e selecionando uma área
        editarPoligonoId?: string; // abre já editando os vértices de uma área
        novoDesenho?: boolean; // abre já no modo de desenhar área
      }
    | undefined;
  Areas: undefined;
  DetalhePoligono: { id: string; novo?: boolean };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Routes() {
  const { usuario, carregando } = useAuth();

  // Enquanto verifica se há sessão salva
  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cinzaFundo }}>
        <ActivityIndicator size="large" color={colors.laranjaMarco} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.azulGnss },
          headerTintColor: colors.branco,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.cinzaFundo },
        }}
      >
        {usuario ? (
          // Rotas privadas: só aparecem depois do login
          <>
            <Stack.Screen name="Home" component={Home} options={{ title: 'TerraPonto' }} />
            <Stack.Screen name="NovoPonto" component={NovoPonto} options={{ title: 'Coletar ponto' }} />
            <Stack.Screen name="MeusPontos" component={MeusPontos} options={{ title: 'Meus pontos' }} />
            <Stack.Screen name="DetalhePonto" component={DetalhePonto} options={{ title: 'Ponto' }} />
            <Stack.Screen name="Clima" component={Clima} options={{ title: 'Clima no campo' }} />
            <Stack.Screen name="Contato" component={Contato} options={{ title: 'Fale conosco' }} />
            <Stack.Screen name="Mapa" component={Mapa} options={{ title: 'Mapa' }} />
            <Stack.Screen name="Areas" component={Areas} options={{ title: 'Áreas' }} />
            <Stack.Screen name="DetalhePoligono" component={DetalhePoligono} options={{ title: 'Área' }} />
          </>
        ) : (
          // Rotas públicas
          <>
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="Cadastro" component={Cadastro} options={{ title: 'Criar conta' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
