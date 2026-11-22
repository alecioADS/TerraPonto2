import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

// Primeiro CONSULTA a permissão e só PEDE se ainda não foi concedida.
// Motivo: em versões recentes do Android, pedir uma permissão que já está concedida
// não abre diálogo e o sistema não devolve resposta ("No requestable permission in the
// request") — a promessa do request*PermissionsAsync ficaria pendente para sempre.

interface RespostaPermissao {
  granted: boolean;
  canAskAgain: boolean;
}

async function garantir(
  consultar: () => Promise<RespostaPermissao>,
  pedir: () => Promise<RespostaPermissao>,
): Promise<boolean> {
  const atual = await consultar();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false; // negada de vez: só pelas configurações do Android
  return (await pedir()).granted;
}

export const permissaoLocalizacao = () =>
  garantir(Location.getForegroundPermissionsAsync, Location.requestForegroundPermissionsAsync);

export const permissaoCamera = () =>
  garantir(ImagePicker.getCameraPermissionsAsync, ImagePicker.requestCameraPermissionsAsync);

export const permissaoGaleria = () =>
  garantir(
    () => ImagePicker.getMediaLibraryPermissionsAsync(),
    () => ImagePicker.requestMediaLibraryPermissionsAsync(),
  );
