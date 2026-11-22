/**
 * Gera a logo recortada e os ícones do app a partir da arte original.
 * Uso: node scripts/gerar-icones.js
 */
const path = require('path');
const Jimp = require('jimp-compact');

const PASTA = path.join(__dirname, '..', 'src', 'assets', 'images');
const ORIGINAL = path.join(PASTA, 'terraponto-logo-v2.png');
const BRANCO_MINERAL = 0xf8faf5ff;

const criar = (w, h, cor) =>
  new Promise((ok, erro) => new Jimp(w, h, cor, (e, img) => (e ? erro(e) : ok(img))));

// Remove o "halo" semitransparente das bordas e calcula o retângulo útil da arte
function limparERecortar(img) {
  const { width, height, data } = img.bitmap;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 110) {
        data[i + 3] = 0;
      } else {
        data[i + 3] = 255;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  // Recorte quadrado, centralizado na arte, com pequena margem
  const lado = Math.round(Math.max(maxX - minX, maxY - minY) * 1.04);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const x = Math.max(0, Math.round(cx - lado / 2));
  const y = Math.max(0, Math.round(cy - lado / 2));
  return img.crop(x, y, Math.min(lado, width - x), Math.min(lado, height - y));
}

// Aplica máscara circular (para o selo da logo)
function mascaraCircular(img) {
  const { width, data } = img.bitmap;
  const r = width / 2;
  img.scan(0, 0, width, width, (x, y, i) => {
    const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
    if (d > r) data[i + 3] = 0;
    else if (d > r - 1.5) data[i + 3] = Math.round(data[i + 3] * (r - d) / 1.5);
  });
  return img;
}

async function centralizar(logo, tamanhoCanvas, proporcao, corFundo) {
  const canvas = await criar(tamanhoCanvas, tamanhoCanvas, corFundo);
  const lado = Math.round(tamanhoCanvas * proporcao);
  const copia = logo.clone().resize(lado, lado, Jimp.RESIZE_BICUBIC);
  const pos = Math.round((tamanhoCanvas - lado) / 2);
  return canvas.composite(copia, pos, pos);
}

(async () => {
  const logo = limparERecortar(await Jimp.read(ORIGINAL));

  // 1) Logo recortada, fundo transparente
  await logo.clone().resize(1024, 1024, Jimp.RESIZE_BICUBIC).writeAsync(path.join(PASTA, 'logo.png'));

  // 2) Selo: logo dentro de um círculo claro (contraste no fundo escuro do app)
  const selo = mascaraCircular(await centralizar(logo, 600, 0.8, BRANCO_MINERAL));
  await selo.writeAsync(path.join(PASTA, 'logo-selo.png'));

  // 3) Ícone geral (iOS / web): fundo claro, logo ocupando 80%
  await (await centralizar(logo, 1024, 0.8, BRANCO_MINERAL)).writeAsync(path.join(PASTA, 'icon.png'));

  // 4) Ícone adaptativo Android: só o desenho, dentro da zona segura (~62%)
  await (await centralizar(logo, 1024, 0.62, 0x00000000)).writeAsync(path.join(PASTA, 'adaptive-icon.png'));

  // 5) Splash
  await (await centralizar(logo, 1024, 0.7, 0x00000000)).writeAsync(path.join(PASTA, 'splash.png'));

  console.log('Ícones gerados em', PASTA);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
