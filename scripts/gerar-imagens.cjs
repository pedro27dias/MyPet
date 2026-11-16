/* Gera os ícones do app, a silhueta da logo e a foto de exemplo (rodar: node scripts/gerar-imagens.cjs). */
const { PNG } = require("pngjs");
const fs = require("fs");

const read = (f) => PNG.sync.read(fs.readFileSync(f));
const write = (f, p) => fs.writeFileSync(f, PNG.sync.write(p));

/** Reduz com média de área (boa qualidade). */
function resize(src, w, h, sx = 0, sy = 0, sw = src.width, sh = src.height) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const x0 = sx + (x * sw) / w, x1 = sx + ((x + 1) * sw) / w;
      const y0 = sy + (y * sh) / h, y1 = sy + ((y + 1) * sh) / h;
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++)
        for (let xx = Math.floor(x0); xx < Math.ceil(x1); xx++) {
          const i = (yy * src.width + xx) * 4;
          const al = src.data[i + 3];
          r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al; a += al; n++;
        }
      const o = (y * w + x) * 4;
      out.data[o] = a ? r / a : 0; out.data[o + 1] = a ? g / a : 0; out.data[o + 2] = a ? b / a : 0; out.data[o + 3] = a / n;
    }
  return out;
}

// Ícones (logo quadrada: cachorro rosa no fundo oliva)
const logo = read("public/brand/logo-quadrada.png");
for (const s of [512, 192]) write(`public/icons/icon-${s}.png`, resize(logo, s, s));
write("src/app/apple-icon.png", resize(logo, 180, 180));
write("src/app/icon.png", resize(logo, 64, 64));

// Silhueta (branca, fundo transparente) para colorir em qualquer cor com CSS mask
const olive = [123, 132, 80], pink = [248, 205, 215];
const dist = (d, i, c) => Math.hypot(d[i] - c[0], d[i + 1] - c[1], d[i + 2] - c[2]);
const full = Math.hypot(pink[0] - olive[0], pink[1] - olive[1], pink[2] - olive[2]);
let minX = 1e9, minY = 1e9, maxX = 0, maxY = 0;
const mask = new PNG({ width: logo.width, height: logo.height });
for (let y = 0; y < logo.height; y++)
  for (let x = 0; x < logo.width; x++) {
    const i = (y * logo.width + x) * 4;
    const t = Math.max(0, Math.min(1, (dist(logo.data, i, olive) / full - 0.25) / 0.5));
    mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = 255;
    mask.data[i + 3] = Math.round(t * 255);
    if (t > 0.5) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
const pad = 8, bw = maxX - minX + 1 + pad * 2, bh = maxY - minY + 1 + pad * 2;
const target = 400;
const sil = resize(mask, target, Math.round((target * bh) / bw), minX - pad, minY - pad, bw, bh);
write("public/brand/silhueta.png", sil);
console.log("silhueta", sil.width, sil.height);

// Canela: foto inteira menor e um recorte quadrado do rosto (avatar)
const canela = read("public/exemplo/canela-original.png");
write("public/exemplo/canela.png", resize(canela, 480, Math.round((480 * canela.height) / canela.width)));
write("public/exemplo/canela-avatar.png", resize(canela, 360, 360, 120, 40, 900, 900));
