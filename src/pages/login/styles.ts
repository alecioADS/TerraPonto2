import { StyleSheet } from 'react-native';

import { colors } from '../../global/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cinzaFundo,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  boxTop: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 132,
    height: 132,
    resizeMode: 'contain',
    borderRadius: 66,
    borderWidth: 3,
    borderColor: colors.laranjaMarco,
  },
  brand: {
    color: colors.branco,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 12,
  },
  brandAccent: {
    color: colors.laranjaMarco,
  },
  slogan: {
    color: '#C7D8E8',
    fontSize: 14,
    marginTop: 2,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: colors.brancoMineral,
    borderRadius: 16,
    maxWidth: 440,
    padding: 24,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  title: {
    color: colors.azulGnss,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.cinzaPrecisao,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    marginTop: 4,
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
    height: 52,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  passwordRow: {
    alignItems: 'center',
    backgroundColor: colors.branco,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 52,
  },
  passwordInput: {
    color: colors.texto,
    flex: 1,
    fontSize: 16,
    height: '100%',
    paddingHorizontal: 14,
  },
  showPassword: {
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  showPasswordText: {
    color: colors.azulGnss,
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    color: colors.vermelhoErro,
    fontSize: 13,
    marginTop: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.laranjaMarco,
    borderRadius: 8,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    color: colors.branco,
    fontSize: 16,
    fontWeight: '800',
  },
  buttonArrow: {
    color: colors.branco,
    fontSize: 24,
    marginLeft: 10,
    marginTop: -2,
  },
  linkBox: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  linkText: {
    color: colors.cinzaPrecisao,
    fontSize: 14,
  },
  linkAccent: {
    color: colors.azulGnss,
    fontWeight: '800',
  },
  boxBottom: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  statusDot: {
    backgroundColor: colors.verdeCampo,
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  footer: {
    color: '#C7D8E8',
    fontSize: 13,
  },
});
