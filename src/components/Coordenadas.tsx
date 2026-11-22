import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormatoCoordenada, usePreferencias } from '../context/PreferenciasContext';
import { colors } from '../global/colors';
import { paraGMS } from '../global/formatos';
import { paraUtm } from '../services/geodesia';

export interface LinhaCoordenada {
  rotulo: string;
  valor: string;
  detalhe: string;
}

// Formata metros no padrão brasileiro: 7.935.733,14
export function formatarMetros(valor: number, casas = 2): string {
  const [inteiro, decimal] = valor.toFixed(casas).split('.');
  const comPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal ? `${comPontos},${decimal}` : comPontos;
}

// Monta as duas linhas (lat/lon ou E/N) conforme o formato escolhido
export function linhasCoordenada(lat: number, lon: number, formato: FormatoCoordenada): LinhaCoordenada[] {
  if (formato === 'utm') {
    const u = paraUtm(lat, lon);
    const meridiano = (u.zona - 1) * 6 - 180 + 3;
    return [
      {
        rotulo: 'Leste (E)',
        valor: `${formatarMetros(u.leste)} m`,
        detalhe: `Zona ${u.zona}${u.banda} • Hemisfério ${u.hemisferio === 'S' ? 'Sul' : 'Norte'}`,
      },
      {
        rotulo: 'Norte (N)',
        valor: `${formatarMetros(u.norte)} m`,
        detalhe: `MC ${meridiano}° • WGS84/SIRGAS 2000`,
      },
    ];
  }
  if (formato === 'decimal') {
    return [
      { rotulo: 'Latitude', valor: lat.toFixed(7), detalhe: paraGMS(lat, 'lat') },
      { rotulo: 'Longitude', valor: lon.toFixed(7), detalhe: paraGMS(lon, 'lon') },
    ];
  }
  return [
    { rotulo: 'Latitude', valor: paraGMS(lat, 'lat'), detalhe: lat.toFixed(7) },
    { rotulo: 'Longitude', valor: paraGMS(lon, 'lon'), detalhe: lon.toFixed(7) },
  ];
}

// Versão em uma linha (usada na lista)
export function textoCoordenada(lat: number, lon: number, formato: FormatoCoordenada): string {
  if (formato === 'utm') {
    const u = paraUtm(lat, lon);
    return `${u.zona}${u.banda}  E ${u.leste.toFixed(0)}  N ${u.norte.toFixed(0)}`;
  }
  if (formato === 'decimal') return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  return `${paraGMS(lat, 'lat')}  ${paraGMS(lon, 'lon')}`;
}

const OPCOES: { valor: FormatoCoordenada; rotulo: string }[] = [
  { valor: 'gms', rotulo: 'GMS' },
  { valor: 'decimal', rotulo: 'Decimal' },
  { valor: 'utm', rotulo: 'UTM' },
];

// Chave para alternar o formato das coordenadas
export function SeletorFormato({ tema = 'escuro' }: { tema?: 'escuro' | 'claro' }) {
  const { formato, setFormato } = usePreferencias();
  const claro = tema === 'claro';

  return (
    <View style={[styles.seletor, claro && styles.seletorClaro]} accessibilityRole="radiogroup">
      {OPCOES.map((op) => {
        const ativo = formato === op.valor;
        return (
          <Pressable
            key={op.valor}
            accessibilityRole="radio"
            accessibilityState={{ selected: ativo }}
            onPress={() => setFormato(op.valor)}
            style={[styles.opcao, ativo && styles.opcaoAtiva]}
          >
            <Text style={[styles.texto, claro && styles.textoClaro, ativo && styles.textoAtivo]}>{op.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seletor: {
    backgroundColor: '#071C33',
    borderRadius: 10,
    flexDirection: 'row',
    padding: 3,
  },
  seletorClaro: {
    backgroundColor: '#E2E8F0',
  },
  opcao: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 8,
  },
  opcaoAtiva: {
    backgroundColor: colors.laranjaMarco,
  },
  texto: {
    color: '#93A8C0',
    fontSize: 13,
    fontWeight: '700',
  },
  textoClaro: {
    color: colors.cinzaPrecisao,
  },
  textoAtivo: {
    color: colors.branco,
  },
});
