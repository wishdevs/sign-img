"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  CardView,
  WIDTH,
  HEIGHT,
  SCALE,
  EMAIL_DOMAIN,
  TEL,
  normalizePhone,
  type Card,
} from "../card";

// 가변 필드(JSON)만 base64url로 인코딩. 한글 포함되므로 UTF-8 안전 처리.
function encodeD(card: Card): string {
  const json = JSON.stringify(card);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// 클라이언트 텍스트 폭 측정(이메일 줄 수 판단용).
let _measureCtx: CanvasRenderingContext2D | null = null;
function measureWidth(text: string, font: string): number {
  if (typeof document === "undefined") return 0;
  if (!_measureCtx) _measureCtx = document.createElement("canvas").getContext("2d");
  if (!_measureCtx) return 0;
  _measureCtx.font = font;
  return _measureCtx.measureText(text).width;
}

// 연락처 레이아웃(1x): 좌 208 / 상 52 / 우폭 272 / 줄높이 28.
const C_TOP = 52;
const C_LEFT = 208;
const C_RIGHT_W = WIDTH - C_LEFT; // 272
const LINE_H = 28;

// 하단 검정 띠(주소/전화/팩스) 위치(1x) — card.tsx와 일치: bottom 26, height 18.
const BAR_BOTTOM = 26;
const BAR_H = 18;
const BAR_TOP = HEIGHT - BAR_BOTTOM - BAR_H; // 236

function emailLineCount(emailId: string): 1 | 2 {
  return measureWidth(`${emailId}${EMAIL_DOMAIN}`, "400 21px 'Red Hat Display', sans-serif") >
    WIDTH - C_LEFT - 20
    ? 2
    : 1;
}

type Rect = [number, number, number, number];
type Slices = {
  top: Rect;
  midleft: Rect;
  phone: Rect;
  email: Rect;
  web: Rect;
  aboveBar: Rect; // 연락처 밴드 아래 ~ 띠 위 (ETRIBE 상부)
  bar: Rect; // 검정 띠(주소/전화/팩스) → tel 링크
  belowBar: Rect; // 띠 아래 (ETRIBE 하부)
  contactH: number;
  aboveBarH: number;
};

// 카드를 8조각으로 분할 (1x 좌표). 연락처 3줄 + 띠(전화)만 클릭 셀.
function computeSlices(lines: number): Slices {
  const contactH = LINE_H * (2 + lines); // phone + email(lines) + web
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

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  borderRadius: 6,
  border: "1px solid #374151",
  background: "#161922",
  color: "#e5e7eb",
  boxSizing: "border-box",
};

const btnStyle: CSSProperties = {
  padding: "8px 14px",
  fontSize: 13,
  borderRadius: 6,
  border: "1px solid #374151",
  background: "#1f2937",
  color: "#e5e7eb",
  cursor: "pointer",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

// 전화 → 국제번호 tel: 링크 (+82, 앞자리 0 제거).
function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "");
  return `tel:+82${digits}`;
}

const rectStr = (r: Rect) => r.join(",");
const sliceSrc = (dd: string, r: Rect, bust?: number) =>
  `/slice?d=${dd}&crop=${rectStr(r)}${bust ? `&t=${bust}` : ""}`;

export function Editor({ initial }: { initial: Card }) {
  const [nameKo, setNameKo] = useState(initial.nameKo);
  const [titleKo, setTitleKo] = useState(initial.titleKo);
  const [enLines, setEnLines] = useState(
    Array.isArray(initial.enLines) ? initial.enLines.join("\n") : initial.enLines
  );
  const [phone, setPhone] = useState(initial.phone);
  const [emailId, setEmailId] = useState(initial.emailId);

  // 현재 입력(라이브 HTML 카드 + 복사용).
  const card: Card = { nameKo, titleKo, enLines, phone: normalizePhone(phone), emailId };
  const d = encodeD(card);

  // 슬라이스 테이블(이미지)은 커밋(새로고침) 기준 — 잦은 재요청 방지.
  const [committed, setCommitted] = useState<Card>(card);
  const [imgKey, setImgKey] = useState(0);
  const committedD = encodeD(committed);
  const refresh = () => {
    setCommitted(card);
    setImgKey((k) => k + 1);
  };

  const webHref = "https://www.etribe.co.kr";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // 링크 (라이브=복사용 / 커밋=렌더용)
  const telHref = toTelHref(card.phone);
  const mailHref = `mailto:${emailId}${EMAIL_DOMAIN}`;
  const cTelHref = toTelHref(committed.phone);
  const cMailHref = `mailto:${committed.emailId}${EMAIL_DOMAIN}`;
  const barTelHref = toTelHref(TEL); // 하단 띠 전화(02-844-0090)

  const liveLines = emailLineCount(emailId);
  const liveSlices = computeSlices(liveLines);
  const cLines = emailLineCount(committed.emailId);
  const cSlices = computeSlices(cLines);

  // 복사용 서명 HTML(중첩 table). 절대 URL.
  function buildTableHtml(): string {
    const img = (r: Rect, w: number, h: number, alt: string) =>
      `<img src="${origin}${sliceSrc(d, r)}" width="${w}" height="${h}" border="0" style="display:block;border:0" alt="${alt}" />`;
    const RW = C_RIGHT_W;
    const T = `border-collapse:collapse;line-height:0`;
    return [
      `<table cellpadding="0" cellspacing="0" border="0" style="${T}">`,
      `  <tr><td>${img(liveSlices.top, WIDTH, C_TOP, "")}</td></tr>`,
      `  <tr><td>`,
      `    <table cellpadding="0" cellspacing="0" border="0" style="${T}"><tr>`,
      `      <td>${img(liveSlices.midleft, C_LEFT, liveSlices.contactH, "")}</td>`,
      `      <td>`,
      `        <a href="${telHref}" style="display:block">${img(liveSlices.phone, RW, LINE_H, "전화")}</a>`,
      `        <a href="${mailHref}" style="display:block">${img(liveSlices.email, RW, LINE_H * liveLines, "이메일")}</a>`,
      `        <a href="${webHref}" target="_blank" style="display:block">${img(liveSlices.web, RW, LINE_H, "홈페이지")}</a>`,
      `      </td>`,
      `    </tr></table>`,
      `  </td></tr>`,
      `  <tr><td>${img(liveSlices.aboveBar, WIDTH, liveSlices.aboveBarH, "")}</td></tr>`,
      `  <tr><td><a href="${barTelHref}" style="display:block">${img(liveSlices.bar, WIDTH, BAR_H, "전화")}</a></td></tr>`,
      `  <tr><td>${img(liveSlices.belowBar, WIDTH, HEIGHT - (BAR_TOP + BAR_H), "")}</td></tr>`,
      `</table>`,
    ].join("\n");
  }
  const liveTableHtml = buildTableHtml();

  const [copied, setCopied] = useState(false);
  async function copySignature() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([liveTableHtml], { type: "text/html" }),
          "text/plain": new Blob([liveTableHtml], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard?.writeText(liveTableHtml);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // 렌더용(커밋) 슬라이스 이미지 src
  const cu = (r: Rect) => sliceSrc(committedD, r, imgKey);

  return (
    <div style={{ display: "flex", gap: 36, flexWrap: "wrap", alignItems: "flex-start" }}>
      {/* 입력 폼 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 320 }}>
        <Field label="이름 (nameKo)">
          <input style={inputStyle} value={nameKo} onChange={(e) => setNameKo(e.target.value)} />
        </Field>
        <Field label="직급 (titleKo)">
          <input style={inputStyle} value={titleKo} onChange={(e) => setTitleKo(e.target.value)} />
        </Field>
        <Field label="영문이름·부서 (enLines · 줄바꿈으로 구분)">
          <textarea
            style={{ ...inputStyle, height: 92, resize: "vertical", fontFamily: "monospace" }}
            value={enLines}
            onChange={(e) => setEnLines(e.target.value)}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            <span>부서명에 가운뎃점이 필요하면 복사해서 사용하세요:</span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText("·")}
              title="가운뎃점(·) 복사"
              style={{ ...btnStyle, padding: "2px 10px", fontSize: 14 }}
            >
              · 복사
            </button>
          </div>
        </Field>
        <Field label="전화 (점 뒤 공백 자동 강제)">
          <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="이메일 ID (도메인 고정)">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
            />
            <span style={{ fontSize: 13, color: "#9ca3af", whiteSpace: "nowrap" }}>
              {EMAIL_DOMAIN}
            </span>
          </div>
        </Field>
        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
          브랜드·주소·전화띠·팩스·홈페이지(www)·이메일 도메인은 고정값입니다.
        </p>
      </div>

      {/* 라이브 미리보기(HTML) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
          라이브(HTML) — {WIDTH * SCALE}×{HEIGHT * SCALE}px · 입력 시 즉시 반영
        </div>
        <div style={{ width: WIDTH * SCALE, height: HEIGHT * SCALE }}>
          <CardView card={card} scale={SCALE} />
        </div>

        {/* 이메일 서명 — 슬라이스 테이블(전 클라이언트 클릭) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
            이메일 서명 — 테이블 분리 (전화→tel · 이메일→mailto · 홈페이지→링크)
          </div>
          <button type="button" onClick={refresh} style={btnStyle}>
            ↻ 서명 갱신
          </button>
        </div>

        {/* 실제 붙여넣을 서명 요소(table + 조각 이미지) — 연락처 셀만 클릭 가능 */}
        <table
          cellPadding={0}
          cellSpacing={0}
          style={{ borderCollapse: "collapse", lineHeight: 0 }}
        >
          <tbody>
            <tr>
              <td>
                <img src={cu(cSlices.top)} width={WIDTH} height={C_TOP} alt="" style={{ display: "block" }} />
              </td>
            </tr>
            <tr>
              <td>
                <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", lineHeight: 0 }}>
                  <tbody>
                    <tr>
                      <td>
                        <img
                          src={cu(cSlices.midleft)}
                          width={C_LEFT}
                          height={cSlices.contactH}
                          alt=""
                          style={{ display: "block" }}
                        />
                      </td>
                      <td>
                        <a href={cTelHref} style={{ display: "block" }}>
                          <img src={cu(cSlices.phone)} width={C_RIGHT_W} height={LINE_H} alt="전화" style={{ display: "block" }} />
                        </a>
                        <a href={cMailHref} style={{ display: "block" }}>
                          <img
                            src={cu(cSlices.email)}
                            width={C_RIGHT_W}
                            height={LINE_H * cLines}
                            alt="이메일"
                            style={{ display: "block" }}
                          />
                        </a>
                        <a href={webHref} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                          <img src={cu(cSlices.web)} width={C_RIGHT_W} height={LINE_H} alt="홈페이지" style={{ display: "block" }} />
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <img src={cu(cSlices.aboveBar)} width={WIDTH} height={cSlices.aboveBarH} alt="" style={{ display: "block" }} />
              </td>
            </tr>
            <tr>
              <td>
                <a href={barTelHref} style={{ display: "block" }}>
                  <img src={cu(cSlices.bar)} width={WIDTH} height={BAR_H} alt="전화" style={{ display: "block" }} />
                </a>
              </td>
            </tr>
            <tr>
              <td>
                <img
                  src={cu(cSlices.belowBar)}
                  width={WIDTH}
                  height={HEIGHT - (BAR_TOP + BAR_H)}
                  alt=""
                  style={{ display: "block" }}
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          ↑ 실제 서명 요소(테이블 분리). 전화/이메일/홈페이지 영역을 클릭해보세요. (이미지는 “갱신”
          기준, 복사 HTML은 현재 입력 기준)
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={copySignature}
            style={{ ...btnStyle, background: "#2563eb", borderColor: "#2563eb", color: "#fff" }}
          >
            {copied ? "✓ 복사됨" : "이메일 서명 HTML 복사"}
          </button>
          <a href={`/sign?d=${committedD}`} target="_blank" rel="noopener noreferrer" style={btnStyle}>
            전체 이미지 새 탭 ↗
          </a>
        </div>

        <textarea
          readOnly
          value={liveTableHtml}
          onFocus={(e) => e.currentTarget.select()}
          style={{ ...inputStyle, height: 150, fontFamily: "monospace", fontSize: 11, lineHeight: 1.5 }}
        />
        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
          테이블+조각이미지 방식은 <b>Gmail·Outlook·Apple Mail 등 전 클라이언트</b>에서 클릭이
          동작합니다. 단, 이미지가 보이려면 src가 <b>배포된 공개 URL</b>이어야 합니다(로컬 주소는
          메일에서 안 보임).
        </p>
      </div>
    </div>
  );
}
