import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
// Vercel 앱의 카드 레이아웃을 그대로 재사용 (esbuild가 번들).
import {
  CardView,
  FONT_SPECS,
  WIDTH,
  HEIGHT,
  SCALE,
  type Card,
} from "../../app/card";

type SatoriFont = {
  name: string;
  data: ArrayBuffer | Buffer;
  weight: 400 | 600 | 700;
  style: "normal";
};

// 폰트(woff)를 1회 로드해 캐시.
// TODO(prod): jsdelivr fetch 대신 woff를 배포 패키지에 번들해 fs로 읽기(콜드스타트·안정성).
let fontsPromise: Promise<SatoriFont[]> | null = null;
function loadFonts(): Promise<SatoriFont[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_SPECS.map(async (f) => {
        const res = await fetch(f.url);
        const data = Buffer.from(await res.arrayBuffer());
        return { name: f.family, data, weight: f.weight, style: "normal" as const };
      })
    );
  }
  return fontsPromise;
}

// 카드 전체를 PNG로 렌더 (satori → SVG → resvg → PNG).
export async function renderFull(card: Card): Promise<Buffer> {
  const fonts = await loadFonts();
  const element = CardView({ card, scale: SCALE }) as unknown as Parameters<typeof satori>[0];
  const svg = await satori(element, {
    width: WIDTH * SCALE,
    height: HEIGHT * SCALE,
    fonts,
  });
  const png = new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
  return Buffer.from(png);
}

// 1x 좌표 [x,y,w,h]를 2x 픽셀로 crop.
export async function cropPng(
  full: Buffer,
  [x, y, w, h]: [number, number, number, number]
): Promise<Buffer> {
  const FW = WIDTH * SCALE;
  const FH = HEIGHT * SCALE;
  const left = Math.max(0, Math.min(Math.round(x * SCALE), FW - 1));
  const top = Math.max(0, Math.min(Math.round(y * SCALE), FH - 1));
  const width = Math.max(1, Math.min(Math.round(w * SCALE), FW - left));
  const height = Math.max(1, Math.min(Math.round(h * SCALE), FH - top));
  return sharp(full).extract({ left, top, width, height }).png().toBuffer();
}
