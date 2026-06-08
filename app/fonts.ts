import { FONT_SPECS } from "./card";

// 폰트(woff)를 인스턴스당 1회만 로드해 캐시한다. (/sign·/slice 공용)
type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 700;
  style: "normal";
};

let fontsPromise: Promise<LoadedFont[]> | null = null;

export function loadFonts(): Promise<LoadedFont[]> {
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
