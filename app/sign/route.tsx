import { ImageResponse } from "next/og";
import {
  CardView,
  decodeCard,
  FONT_SPECS,
  WIDTH,
  HEIGHT,
  SCALE,
  type Card,
} from "../card";

export const runtime = "edge";

// 폰트(woff)를 인스턴스당 1회만 로드해 캐시한다.
let fontsPromise: Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" }[]
> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_SPECS.map(async ({ family, url, weight }) => {
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        return { name: family, data, weight, style: "normal" as const };
      })
    );
  }
  return fontsPromise;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  let card: Card;
  try {
    card = decodeCard(searchParams.get("d"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid payload";
    return new Response(`invalid 'd' param: ${message}`, { status: 400 });
  }

  const fonts = await loadFonts();

  return new ImageResponse(<CardView card={card} scale={SCALE} />, {
    width: WIDTH * SCALE,
    height: HEIGHT * SCALE,
    fonts,
  });
}
