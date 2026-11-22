import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Usuario } from '../services/storage';

const CHAVE_SESSAO = '@terraponto:sessao';

interface AuthContextData {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (usuario: Usuario) => void;
  sair: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Restaura a sessão salva ao abrir o app (usuário continua logado)
  useEffect(() => {
    AsyncStorage.getItem(CHAVE_SESSAO)
      .then((json) => json && setUsuario(JSON.parse(json) as Usuario))
      .finally(() => setCarregando(false));
  }, []);

  function entrar(novo: Usuario) {
    setUsuario(novo);
    AsyncStorage.setItem(CHAVE_SESSAO, JSON.stringify(novo));
  }

  function sair() {
    setUsuario(null);
    AsyncStorage.removeItem(CHAVE_SESSAO);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
