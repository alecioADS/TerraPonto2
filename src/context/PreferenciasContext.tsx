/**
 * Contexto de preferências do usuário (estado global persistido).
 *
 * - formato: como as coordenadas aparecem (GMS, Decimal ou UTM) — usado na coleta, na
 *   lista e no detalhe do ponto;
 * - camadaMapa: imagem de fundo do mapa (satélite ou ruas).
 * Trocar em qualquer tela atualiza todas (Context API) e a escolha fica salva no
 * AsyncStorage para a próxima vez que o app abrir.
 *
 * Hooks: createContext/useContext, useState e useEffect (ler as preferências salvas).
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FormatoCoordenada = 'gms' | 'decimal' | 'utm';
export type CamadaMapa = 'satelite' | 'ruas';

const CHAVE_FORMATO = '@terraponto:formatoCoordenada';
const CHAVE_CAMADA = '@terraponto:camadaMapa';

interface PreferenciasData {
  formato: FormatoCoordenada;
  setFormato: (formato: FormatoCoordenada) => void;
  camadaMapa: CamadaMapa;
  setCamadaMapa: (camada: CamadaMapa) => void;
}

const PreferenciasContext = createContext<PreferenciasData>({
  formato: 'gms',
  setFormato: () => {},
  camadaMapa: 'satelite',
  setCamadaMapa: () => {},
});

// Preferências do usuário que valem para todas as telas (formato de coordenada e
// imagem de fundo do mapa), guardadas no aparelho.
export function PreferenciasProvider({ children }: { children: React.ReactNode }) {
  const [formato, setFormatoState] = useState<FormatoCoordenada>('gms');
  const [camadaMapa, setCamadaState] = useState<CamadaMapa>('satelite');

  useEffect(() => {
    AsyncStorage.multiGet([CHAVE_FORMATO, CHAVE_CAMADA]).then(([[, f], [, c]]) => {
      if (f === 'gms' || f === 'decimal' || f === 'utm') setFormatoState(f);
      if (c === 'satelite' || c === 'ruas') setCamadaState(c);
    });
  }, []);

  function setFormato(novo: FormatoCoordenada) {
    setFormatoState(novo);
    AsyncStorage.setItem(CHAVE_FORMATO, novo);
  }

  function setCamadaMapa(nova: CamadaMapa) {
    setCamadaState(nova);
    AsyncStorage.setItem(CHAVE_CAMADA, nova);
  }

  return (
    <PreferenciasContext.Provider value={{ formato, setFormato, camadaMapa, setCamadaMapa }}>
      {children}
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias() {
  return useContext(PreferenciasContext);
}
