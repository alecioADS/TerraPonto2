import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { PreferenciasProvider } from './src/context/PreferenciasContext';
import Routes from './src/routes';

/**
 * Ponto de entrada do aplicativo TerraPonto.
 *
 * Monta a árvore de "providers" (Context API) que ficam disponíveis para todas as telas:
 *  1. SafeAreaProvider     → margens seguras (notch, barra de status, barra de navegação);
 *  2. AuthProvider         → usuário logado + sessão persistida (src/context/AuthContext);
 *  3. PreferenciasProvider → formato de coordenada e camada do mapa (src/context/PreferenciasContext);
 *  4. Routes               → navegação: rotas públicas (Login/Cadastro) ou privadas (Home...).
 *
 * A ordem importa: as rotas precisam do AuthProvider para saber se há usuário logado.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferenciasProvider>
          <StatusBar style="light" />
          <Routes />
        </PreferenciasProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
