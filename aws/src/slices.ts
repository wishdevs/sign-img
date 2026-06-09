// 슬라이스 좌표 계산 + 서명 table HTML 생성.
// (app/preview/editor.tsx의 computeSlices/buildTableHtml 로직을 서버용으로 포팅)
import { WIDTH, HEIGHT, TEL } from "../../app/card";

// 레이아웃 상수(1x) — editor.tsx와 동일하게 유지.
const C_TOP = 52;
const C_LEFT = 208;
const C_RIGHT_W = WIDTH - C_LEFT; // 272
const LINE_H = 28;
const BAR_BOTTOM = 26;
const BAR_H = 18;
const BAR_TOP = HEIGHT - BAR_BOTTOM - BAR_H; // 236

export type Rect = [number, number, number, number];
export type SliceKey =
  | "top"
  | "midleft"
  | "phone"
  | "email"
  | "web"
  | "aboveBar"
  | "bar"
  | "belowBar";

export type Slices = Record<SliceKey, Rect> & { contactH: number; aboveBarH: number };

export function computeSlices(lines: number): Slices {
  const contactH = LINE_H * (2 + lines);
  const bottomTop = C_TOP + contactH;
  const aboveBarH = BAR_TOP - bottomTop;
  return {
    top: [0, 0, WIDTH, C_TOP],
    midleft: [0, C_TOP, C_LEFT, contactH],
    phone: [C_LEFT, C_TOP, C_RIGHT_W, LINE_H],
    email: [C_LEFT, C_TOP + LINE_H, C_RIGHT_W, LINE_H * lines],
    web: [C_LEFT, C_TOP + LINE_H + LINE_H * lines, C_RIGHT_W, LINE_H],
    aboveBar: [0, bottomTop, WIDTH, aboveBarH],
    bar: [0, BAR_TOP, WIDTH, BAR_H],
    belowBar: [0, BAR_TOP + BAR_H, WIDTH, HEIGHT - (BAR_TOP + BAR_H)],
    contactH,
    aboveBarH,
  };
}

export function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "");
  return `tel:+82${digits}`;
}

const WEB_HREF = "https://www.etribe.co.kr";

// HTML 속성 컨텍스트 이스케이프 (수동 HTML 빌드 시 XSS 방지).
const attr = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// 슬라이스별 공개 URL을 받아 서명 table HTML 생성.
export function buildSignatureHtml(opts: {
  url: (key: SliceKey) => string;
  slices: Slices;
  lines: number;
  telHref: string; // 연락처 전화
  mailHref: string;
}): string {
  const { url, slices, lines, telHref, mailHref } = opts;
  const barTel = toTelHref(TEL);
  const RW = C_RIGHT_W;
  const img = (key: SliceKey, w: number, h: number, alt: string) =>
    `<img src="${attr(url(key))}" width="${w}" height="${h}" border="0" style="display:block;border:0;vertical-align:top" alt="${attr(alt)}" />`;
  const T = "border-collapse:collapse;line-height:0";
  const TD = "font-size:0;line-height:0;padding:0"; // Outlook 이미지 틈 방지
  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="${T}">`,
    `  <tr><td style="${TD}">${img("top", WIDTH, C_TOP, "")}</td></tr>`,
    `  <tr><td style="${TD}">`,
    `    <table cellpadding="0" cellspacing="0" border="0" style="${T}"><tr>`,
    `      <td style="${TD}">${img("midleft", C_LEFT, slices.contactH, "")}</td>`,
    `      <td style="${TD}">`,
    `        <a href="${attr(telHref)}" style="display:block">${img("phone", RW, LINE_H, "전화")}</a>`,
    `        <a href="${attr(mailHref)}" style="display:block">${img("email", RW, LINE_H * lines, "이메일")}</a>`,
    `        <a href="${attr(WEB_HREF)}" target="_blank" style="display:block">${img("web", RW, LINE_H, "홈페이지")}</a>`,
    `      </td>`,
    `    </tr></table>`,
    `  </td></tr>`,
    `  <tr><td style="${TD}">${img("aboveBar", WIDTH, slices.aboveBarH, "")}</td></tr>`,
    `  <tr><td style="${TD}"><a href="${attr(barTel)}" style="display:block">${img("bar", WIDTH, BAR_H, "전화")}</a></td></tr>`,
    `  <tr><td style="${TD}">${img("belowBar", WIDTH, HEIGHT - (BAR_TOP + BAR_H), "")}</td></tr>`,
    `</table>`,
  ].join("\n");
}

export const SLICE_KEYS: SliceKey[] = [
  "top",
  "midleft",
  "phone",
  "email",
  "web",
  "aboveBar",
  "bar",
  "belowBar",
];
