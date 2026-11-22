import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors } from '../global/colors';

interface Props {
  titulo: string;
  onPress: () => void;
  carregando?: boolean;
  variante?: 'primario' | 'secundario';
  style?: ViewStyle;
}

// Botão padrão do TerraPonto
export function Botao({ titulo, onPress, carregando = false, variante = 'primario', style }: Props) {
  const secundario = variante === 'secundario';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={carregando}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botao,
        secundario && styles.secundario,
        (pressed || carregando) && styles.pressionado,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={secundario ? colors.azulGnss : colors.branco} />
      ) : (
        <Text style={[styles.texto, secundario && styles.textoSecundario]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    alignItems: 'center',
    backgroundColor: colors.laranjaMarco,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
  },
  secundario: {
    backgroundColor: 'transparent',
    borderColor: colors.azulGnss,
    borderWidth: 1.5,
  },
  pressionado: {
    opacity: 0.8,
  },
  texto: {
    color: colors.branco,
    fontSize: 16,
    fontWeight: '800',
  },
  textoSecundario: {
    color: colors.azulGnss,
  },
});
