import { ImageResponse } from "next/og";
import sharp from "sharp";
import { CardView, decodeCard, WIDTH, HEIGHT, SCALE, type Card } from "../card";
import { loadFonts } from "../fonts";

// sharp는 Node 런타임 필요.
export const runtime = "nodejs";

function parseCrop(raw: string | null) {
  if (!raw) return null;
  const p = raw.split(",").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return null;
  const [x, y, w, h] = p;
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

const HEADERS = {
  "content-type": "image/png",
  "cache-control": "public, max-age=31536000, immutable",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  let card: Card;
  try {
    card = decodeCard(searchParams.get("d"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid payload";
    return new Response(`invalid 'd' param: ${message}`, { status: 400 });
  }

  const crop = parseCrop(searchParams.get("crop"));
  const fonts = await loadFonts();

  // 카드 전체를 한 번 렌더한 뒤 sharp로 해당 영역만 추출.
  const full = new ImageResponse(<CardView card={card} scale={SCALE} />, {
    width: WIDTH * SCALE,
    height: HEIGHT * SCALE,
    fonts,
  });
  const buf = Buffer.from(await full.arrayBuffer());

  if (!crop) return new Response(buf, { headers: HEADERS });

  // 2x 픽셀 기준으로 추출, 카드 경계로 클램프.
  const FW = WIDTH * SCALE;
  const FH = HEIGHT * SCALE;
  const left = Math.max(0, Math.min(Math.round(crop.x * SCALE), FW - 1));
  const top = Math.max(0, Math.min(Math.round(crop.y * SCALE), FH - 1));
  const width = Math.max(1, Math.min(Math.round(crop.w * SCALE), FW - left));
  const height = Math.max(1, Math.min(Math.round(crop.h * SCALE), FH - top));

  const out = await sharp(buf).extract({ left, top, width, height }).png().toBuffer();
  return new Response(new Uint8Array(out), { headers: HEADERS });
}
