import { build } from "esbuild";

// 네이티브 모듈은 번들하지 않고 node_modules에서 로드(아키텍처 일치 필요).
const external = ["@resvg/resvg-js", "sharp"];

await build({
  entryPoints: ["src/handler.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: ".build/handler.mjs",
  jsx: "automatic", // app/card.tsx의 JSX 변환 (react/jsx-runtime)
  external,
  // ESM 출력에서 require 사용하는 네이티브 모듈 호환
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});

// Lambda 패키지용 package.json(ESM + 네이티브 의존성만) 생성.
import { writeFileSync } from "fs";
writeFileSync(
  ".build/package.json",
  JSON.stringify(
    {
      type: "module",
      dependencies: { "@resvg/resvg-js": "^2.6.2", sharp: "^0.34.5" },
    },
    null,
    2
  )
);

console.log("built .build/handler.mjs (+ package.json)");
