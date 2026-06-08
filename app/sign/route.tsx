import { ImageResponse } from "next/og";
import { CardView, decodeCard, WIDTH, HEIGHT, SCALE, type Card } from "../card";
import { loadFonts } from "../fonts";

export const runtime = "edge";

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
