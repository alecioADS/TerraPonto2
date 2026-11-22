import { StyleSheet } from 'react-native';

import { colors } from './colors';

// Estilos compartilhados pelas telas internas do app
export const globalStyles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: colors.cinzaFundo,
  },
  conteudo: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.brancoMineral,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  titulo: {
    color: colors.azulGnss,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitulo: {
    color: colors.cinzaPrecisao,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  centralizado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textoClaro: {
    color: '#C7D8E8',
    fontSize: 14,
  },
  erro: {
    color: colors.vermelhoErro,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
});
