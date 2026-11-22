import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { PreferenciasProvider } from './src/context/PreferenciasContext';
import Routes from './src/routes';

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
