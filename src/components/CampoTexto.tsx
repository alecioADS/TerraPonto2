import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '../global/colors';

interface Props extends TextInputProps {
  label: string;
  erro?: string;
}

// Componente reutilizável de campo de formulário.
// forwardRef permite usar useRef na tela para focar o próximo campo.
export const CampoTexto = forwardRef<TextInput, Props>(({ label, erro, style, ...props }, ref) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      ref={ref}
      placeholderTextColor="#8491A3"
      style={[styles.input, props.multiline && styles.multiline, !!erro && styles.inputErro, style]}
      {...props}
    />
    {erro ? <Text style={styles.erro}>{erro}</Text> : null}
  </View>
));

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    color: colors.texto,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.branco,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    color: colors.texto,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  multiline: {
    minHeight: 110,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputErro: {
    borderColor: colors.vermelhoErro,
  },
  erro: {
    color: colors.vermelhoErro,
    fontSize: 12,
    marginTop: 4,
  },
});
