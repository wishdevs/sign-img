import { build } from "esbuild";
import path from "node:path";

// react/react-dom을 aws/node_modules 한 곳으로 강제(인스턴스 2개 방지).
const nm = (p) => path.resolve(process.cwd(), "node_modules", p);

await build({
  entryPoints: ["web-src/main.tsx"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  minify: true,
  outfile: "web/app.js",
  alias: {
    react: nm("react"),
    "react-dom": nm("react-dom"),
  },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});

console.log("built web/app.js");
