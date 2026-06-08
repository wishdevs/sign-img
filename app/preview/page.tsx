import { decodeCard, FONT_SPECS, DEFAULT_CARD, type Card } from "../card";
import { Editor } from "./editor";

// 항상 요청 시 렌더(쿼리 반영).
export const dynamic = "force-dynamic";

// 브라우저용 @font-face (라이브 카드도 동일 폰트로 렌더).
const fontFaceCss = FONT_SPECS.map(
  (f) =>
    `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:swap;src:url('${f.url}') format('woff');}`
).join("\n");

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const sp = await searchParams;
  const raw = sp.d ?? null;

  let initial: Card;
  try {
    initial = decodeCard(raw);
  } catch {
    initial = DEFAULT_CARD;
  }

  return (
    <>
      <style>{fontFaceCss}</style>
      <main
        style={{
          minHeight: "100vh",
          background: "#0f1115",
          color: "#e5e7eb",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>명함 편집기 (라이브 미리보기)</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
            왼쪽에서 텍스트를 바꾸면 오른쪽 카드가 즉시 갱신됩니다. 요소를 검사하면 실제 px/폰트
            값을 볼 수 있고, 디자인 수치는 <code>app/card.tsx</code>에서 수정합니다.
          </p>
        </div>

        <Editor initial={initial} />
      </main>
    </>
  );
}
