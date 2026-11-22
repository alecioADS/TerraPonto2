import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FormatoCoordenada = 'gms' | 'decimal' | 'utm';

const CHAVE_FORMATO = '@terraponto:formatoCoordenada';

interface PreferenciasData {
  formato: FormatoCoordenada;
  setFormato: (formato: FormatoCoordenada) => void;
}

const PreferenciasContext = createContext<PreferenciasData>({
  formato: 'gms',
  setFormato: () => {},
});

// Guarda o formato de coordenada escolhido pelo usuário (vale para todas as telas)
export function PreferenciasProvider({ children }: { children: React.ReactNode }) {
  const [formato, setFormatoState] = useState<FormatoCoordenada>('gms');

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_FORMATO).then((valor) => {
      if (valor === 'gms' || valor === 'decimal' || valor === 'utm') setFormatoState(valor);
    });
  }, []);

  function setFormato(novo: FormatoCoordenada) {
    setFormatoState(novo);
    AsyncStorage.setItem(CHAVE_FORMATO, novo);
  }

  return (
    <PreferenciasContext.Provider value={{ formato, setFormato }}>
      {children}
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias() {
  return useContext(PreferenciasContext);
}
