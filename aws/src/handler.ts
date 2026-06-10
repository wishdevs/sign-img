import { createHash } from "node:crypto";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { decodeCard, emailLineCount, ASSET_VERSION, type Card } from "../../app/card";
import { renderFull, cropPng } from "./render";
import {
  computeSlices,
  buildSignatureHtml,
  toTelHref,
  SLICE_KEYS,
  type Rect,
  type SliceKey,
} from "./slices";
import { exists, putPng } from "./s3";

const EMAIL_DOMAIN = "@etribe.co.kr";
const CDN_BASE = process.env.CDN_BASE ?? ""; // 예: https://sign.etribe.co.kr

// CORS는 Function URL의 Cors 설정이 처리(헤더 중복 방지 위해 핸들러에선 추가하지 않음).
const png = (buf: Buffer): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 200,
  headers: {
    "content-type": "image/png",
    "cache-control": "public, max-age=31536000, immutable",
  },
  isBase64Encoded: true,
  body: buf.toString("base64"),
});

const json = (code: number, obj: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode: code,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(obj),
});

const hashKey = (d: string) =>
  createHash("sha256").update(`${ASSET_VERSION}:${d}`).digest("hex").slice(0, 16);
const parseCrop = (raw?: string): Rect | null => {
  if (!raw) return null;
  const p = raw.split(",").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n)) || p[2] <= 0 || p[3] <= 0) return null;
  return p as Rect;
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const method = event.requestContext?.http?.method ?? "GET";
  if (method === "OPTIONS") return { statusCode: 204 }; // 보통 Function URL이 가로챔

  try {
    // ── POST /generate : 전체+8조각 렌더 → S3 저장 → 서명 HTML 반환 ──
    if (method === "POST") {
      const body = JSON.parse(event.body ?? "{}");
      const d: string | undefined = body.d;
      if (!d) return json(400, { error: "missing d" });
      const card = decodeCard(d);
      const lines = emailLineCount(card.emailId); // 글자폭 테이블 기반(편집기와 동일·결정적)

      const base = `${hashKey(d)}`;
      const slices = computeSlices(lines);

      // 멱등: 이미 있으면 재생성 skip.
      const fullKey = `${base}/full.png`;
      if (!(await exists(fullKey))) {
        const full = await renderFull(card);
        await putPng(fullKey, full);
        await Promise.all(
          SLICE_KEYS.map(async (k) => {
            const out = await cropPng(full, slices[k] as Rect);
            await putPng(`${base}/${k}.png`, out);
          })
        );
      }

      const url = (k: SliceKey) => `${CDN_BASE}/${base}/${k}.png`;
      const signatureHtml = buildSignatureHtml({
        url,
        slices,
        lines,
        telHref: toTelHref(card.phone),
        mailHref: `mailto:${card.emailId}${EMAIL_DOMAIN}`,
      });
      return json(200, {
        base,
        fullUrl: `${CDN_BASE}/${fullKey}`,
        slices: Object.fromEntries(SLICE_KEYS.map((k) => [k, url(k)])),
        signatureHtml,
      });
    }

    // ── GET : 즉석 렌더 (?d=... [&crop=x,y,w,h]) ──
    const q = event.queryStringParameters ?? {};
    if (!q.d) return json(400, { error: "missing d" });
    let card: Card;
    try {
      card = decodeCard(q.d);
    } catch (e) {
      return json(400, { error: "invalid d" });
    }
    const full = await renderFull(card);
    const crop = parseCrop(q.crop);
    return png(crop ? await cropPng(full, crop) : full);
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    return json(500, { error: message });
  }
};
