"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  CardView,
  WIDTH,
  HEIGHT,
  SCALE,
  EMAIL_DOMAIN,
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

// 연락처 클릭영역(이미지맵) — 이미지 intrinsic(960×560=2x) 좌표.
// 이미지맵은 원본 기준이라, 이미지가 반응형으로 줄어도 영역이 함께 스케일된다.
const C_LEFT_1X = 208;
const C_WIDTH_1X = 252;
const C_TOP_1X = 52;
const LINE_H_1X = 28;

function signatureRegions(emailId: string) {
  const emailFull = `${emailId}${EMAIL_DOMAIN}`;
  // 줄 수는 1x(21px·252폭) 기준으로 판정 — 이미지 내부 줄바꿈과 동일.
  const lines =
    measureWidth(emailFull, "400 21px 'Red Hat Display', sans-serif") > C_WIDTH_1X ? 2 : 1;
  // 이미지맵은 표시 크기와 좌표가 일치해야 동작 → 480×280 고정 표시 기준(1x).
  const L = C_LEFT_1X;
  const W = C_WIDTH_1X;
  const T = C_TOP_1X;
  const H = LINE_H_1X;
  const right = L + W;
  const phone = [L, T, right, T + H];
  const eTop = T + H;
  const email = [L, eTop, right, eTop + H * lines];
  const wTop = eTop + H * lines;
  const web = [L, wTop, right, wTop + H];
  return { phone, email, web };
}

export function Editor({ initial }: { initial: Card }) {
  const [nameKo, setNameKo] = useState(initial.nameKo);
  const [titleKo, setTitleKo] = useState(initial.titleKo);
  const [enLines, setEnLines] = useState(
    Array.isArray(initial.enLines) ? initial.enLines.join("\n") : initial.enLines
  );
  const [phone, setPhone] = useState(initial.phone);
  const [emailId, setEmailId] = useState(initial.emailId);

  // 현재 입력(라이브 HTML 카드용).
  const card: Card = {
    nameKo,
    titleKo,
    enLines,
    phone: normalizePhone(phone),
    emailId,
  };
  const d = encodeD(card);
  const signUrl = `/sign?d=${d}`;

  // PNG·이미지맵은 "커밋된 데이터" 기준 — 새로고침 시 함께 갱신(이미지와 클릭영역 일치).
  const [committed, setCommitted] = useState<Card>(card);
  const [imgKey, setImgKey] = useState(0);
  const committedD = encodeD(committed);
  const committedSignUrl = `/sign?d=${committedD}`;
  const imgUrl = `${committedSignUrl}${imgKey ? `&t=${imgKey}` : ""}`;
  const refresh = () => {
    setCommitted(card);
    setImgKey((k) => k + 1);
  };

  const webHref = "https://www.etribe.co.kr";

  // 라이브(서명 HTML·복사·textarea — 입력 즉시 반영).
  const telHref = `tel:${card.phone.replace(/\D/g, "")}`;
  const mailHref = `mailto:${emailId}${EMAIL_DOMAIN}`;
  const reg = signatureRegions(emailId);

  // 커밋(화면에 표시되는 PNG + 그 위 이미지맵 — 새로고침 시 갱신).
  const cTelHref = `tel:${committed.phone.replace(/\D/g, "")}`;
  const cMailHref = `mailto:${committed.emailId}${EMAIL_DOMAIN}`;
  const cReg = signatureRegions(committed.emailId);

  function buildSigHtml(
    absImg: string,
    regions: ReturnType<typeof signatureRegions>,
    tel: string,
    mail: string,
    mapName: string
  ): string {
    return [
      `<img src="${absImg}" width="${WIDTH}" height="${HEIGHT}" usemap="#${mapName}" border="0" style="display:block;border:0" alt="ETRIBE 명함" />`,
      `<map name="${mapName}">`,
      `  <area shape="rect" coords="${regions.phone.join(",")}" href="${tel}" alt="전화" />`,
      `  <area shape="rect" coords="${regions.email.join(",")}" href="${mail}" alt="이메일" />`,
      `  <area shape="rect" coords="${regions.web.join(",")}" href="${webHref}" target="_blank" alt="홈페이지" />`,
      `</map>`,
    ].join("\n");
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // 복사/textarea용 — 라이브(현재 입력) 기준, 깔끔한 URL.
  const liveSigHtml = buildSigHtml(origin + signUrl, reg, telHref, mailHref, "etribeSig");

  const [copied, setCopied] = useState(false);
  async function copySignature() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([liveSigHtml], { type: "text/html" }),
          "text/plain": new Blob([liveSigHtml], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard?.writeText(liveSigHtml);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
          브랜드·주소·전화띠·팩스·홈페이지(www)·이메일 도메인은 고정값입니다. 이메일이 길면{" "}
          <code>@etribe.co.kr</code> 앞에서 개행됩니다.
        </p>
      </div>

      {/* 라이브 미리보기(HTML) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
          라이브(HTML) — {WIDTH * SCALE}×{HEIGHT * SCALE}px · 입력 시 즉시 반영
        </div>
        <div style={{ width: WIDTH * SCALE, height: HEIGHT * SCALE, outline: "1px solid #374151" }}>
          <CardView card={card} scale={SCALE} />
        </div>

        {/* 이메일 서명 — 생성 이미지(이미지맵) + 복사 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
            이메일 서명 (전화→tel · 이메일→mailto · 홈페이지→링크)
          </div>
          <button type="button" onClick={refresh} style={btnStyle}>
            ↻ 이미지·서명 갱신
          </button>
        </div>

        {/* 실제 붙여넣어질 서명 요소(img + 이미지맵) — JSX로 렌더(자동 이스케이프), 영역 클릭 가능.
            이미지맵은 표시 크기와 좌표가 일치해야 동작하므로 480×280 고정. */}
        <img
          src={imgUrl}
          width={WIDTH}
          height={HEIGHT}
          alt="ETRIBE 명함"
          useMap="#etribeSigPreview"
          style={{ display: "block", outline: "1px solid #374151" }}
        />
        <map name="etribeSigPreview">
          <area shape="rect" coords={cReg.phone.join(",")} href={cTelHref} alt="전화" />
          <area shape="rect" coords={cReg.email.join(",")} href={cMailHref} alt="이메일" />
          <area
            shape="rect"
            coords={cReg.web.join(",")}
            href={webHref}
            target="_blank"
            rel="noreferrer"
            alt="홈페이지"
          />
        </map>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          ↑ 실제 서명 요소(이미지맵 적용). 전화/이메일/홈페이지 영역을 클릭해보세요. (이미지·맵은
          “갱신” 기준, 복사 HTML은 현재 입력 기준)
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={copySignature}
            style={{ ...btnStyle, background: "#2563eb", borderColor: "#2563eb", color: "#fff" }}
          >
            {copied ? "✓ 복사됨" : "이메일 서명 HTML 복사"}
          </button>
          <a href={committedSignUrl} target="_blank" rel="noopener noreferrer" style={btnStyle}>
            이미지 새 탭 ↗
          </a>
        </div>

        {/* 복사될 서명 HTML 미리보기 */}
        <textarea
          readOnly
          value={liveSigHtml}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            ...inputStyle,
            height: 132,
            fontFamily: "monospace",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        />
        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
          ⚠ 이미지맵(<code>usemap</code>)은 브라우저·Apple Mail·일부 클라이언트에서만 동작하고{" "}
          <b>Gmail·Outlook은 제거</b>할 수 있습니다. 또한 메일에서 이미지가 보이려면 src가{" "}
          <b>배포된 공개 URL</b>이어야 합니다(로컬 주소는 안 보임). 모든 클라이언트에서 클릭이
          필요하면 “이미지 + 실제 텍스트 링크” 방식을 권장합니다.
        </p>
      </div>
    </div>
  );
}
