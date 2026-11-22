// Permite importar imagens .png no TypeScript (`import Logo from './logo.png'`).
// O Metro (bundler do React Native) transforma o arquivo num número de recurso.
declare module '*.png' {
  const value: number;
  export default value;
}
