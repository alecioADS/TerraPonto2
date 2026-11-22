/**
 * Contexto de autenticação (estado global do usuário logado).
 *
 * Papel na arquitetura (MVVM): funciona como um ViewModel global — guarda o estado da
 * sessão e expõe as ações `entrar` e `sair`. As telas (View) só consomem via `useAuth()`.
 * A validação de e-mail/senha fica no Model (services/storage.ts → autenticar).
 *
 * Hooks usados: createContext/useContext (compartilhar o estado), useState (usuário e
 * carregamento) e useEffect (restaurar a sessão salva quando o app abre).
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Usuario } from '../services/storage';

// Chave do AsyncStorage onde a sessão fica salva (o usuário não precisa logar de novo)
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

  // Ao mudar `usuario`, o componente Routes troca automaticamente para as rotas privadas
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

/** Hook de conveniência: `const { usuario, entrar, sair } = useAuth();` */
export function useAuth() {
  return useContext(AuthContext);
}
