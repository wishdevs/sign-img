// AWS 정적 프리뷰 엔트리 — Vercel 편집기(Editor)를 그대로 재사용.
// 조각/전체 이미지 베이스는 config.js의 window.__IMG_BASE__(Lambda URL)를 따른다.
import { createRoot } from "react-dom/client";
import { Editor } from "../../app/preview/editor";
import { DEFAULT_CARD } from "../../app/card";

const root = document.getElementById("root");
if (root) {
  try {
    createRoot(root).render(<Editor initial={DEFAULT_CARD} />);
  } catch (e) {
    root.textContent = "render error: " + (e instanceof Error ? e.stack || e.message : String(e));
  }
}
window.addEventListener("error", (ev) => {
  if (root && !root.innerHTML) root.textContent = "JS error: " + ev.message;
});
