// 명함 카드 레이아웃 — /sign(이미지, Satori)과 /preview(HTML)가 공유한다.
// Satori 제약에 맞춰 모든 div는 display:flex, 스타일은 인라인, 워드마크는 <img> SVG 사용.

export const WIDTH = 480; // 디자인(스테이지) 기준 폭
export const HEIGHT = 280; // 디자인(스테이지) 기준 높이
export const SCALE = 2; // 출력 배율(960×560)
export const RED = "#FF0000";

const GLYPH_H = 72; // 글리프 SVG 원본 높이 = ETRIBE 워드마크 높이

// JSON으로 받는 가변 필드. 이메일은 ID(앞부분)만 — 도메인 고정.
export type Card = {
  nameKo: string;
  titleKo: string;
  enLines: string | string[]; // 개행 문자열 권장(배열도 허용)
  phone: string;
  emailId: string; // 이메일 @ 앞부분
};

export const DEFAULT_CARD: Card = {
  nameKo: "홍길동",
  titleKo: "팀장/PM",
  enLines: "HONG GILDONG\nDEVELOPMENT\nTEAM",
  phone: "010. 1234. 5678",
  emailId: "hong",
};

// 고정값 (JSON으로 바꾸지 않음).
const BRAND = "ETRIBE";
const WEB = "www.etribe.co.kr";
export const EMAIL_DOMAIN = "@etribe.co.kr";
// 레이아웃/렌더 로직이 바뀌면 올려서 S3 캐시(hash 키)를 무효화한다.
export const ASSET_VERSION = "v2";
const ADDRESS = "서울 마포구 월드컵북로 4길 81 2,3F";
export const TEL = "T. 02. 844. 0090"; // 검정 띠 전화(서명에서 tel 링크로 사용)
const FAX = "F. 02. 844. 0084";

// 전화번호 "." 뒤 공백 강제: 점 주변 공백을 ". " 한 칸으로 정규화.
export function normalizePhone(s: string): string {
  return s.replace(/\s*\.\s*/g, ". ").trim();
}

// 이메일 줄바꿈 — Red Hat Display 21px 글자폭(px, 측정값)으로 그리디 계산.
// 세그먼트 [아이디][@etribe.][co.kr]를 폭 252에 그리디로 채워 최대 2줄:
//   덜 길면  id@etribe. / co.kr  (co.kr 떨어짐)
//   더 길면  id / @etribe.co.kr  (@etribe.co.kr 떨어짐)
// 측정값 기반이라 이미지/HTML/슬라이스가 동일 결과(글자수 추정의 오판 없음, flex 공백 없음).
const EMAIL_W = 252;
const SEG_AT = 75.81; // "@etribe."
const SEG_CO = 45.15; // "co.kr"
const CHAR_W: Record<string, number> = {
  "0": 13.9, "1": 6.07, "2": 12.6, "3": 12.6, "4": 13, "5": 12.6, "6": 12.6, "7": 12.6,
  "8": 12.6, "9": 12.85, a: 10.84, b: 12.39, c: 10.77, d: 12.39, e: 11.84, f: 7.85,
  g: 12.31, h: 11.53, i: 4.2, j: 4.2, k: 10.37, l: 4.2, m: 18.04, n: 11.53, o: 12.43,
  p: 12.39, q: 12.39, r: 7.27, s: 9.37, t: 7.66, u: 11.53, v: 10.77, w: 14.76, x: 10.31,
  y: 10.71, z: 9.72, A: 14.26, B: 13.8, C: 15.16, D: 15.12, E: 12.94, F: 12.75, G: 16.55,
  H: 15.01, I: 4.85, J: 12.6, K: 12.96, L: 12.68, M: 17.79, N: 15.22, O: 16.99, P: 13.59,
  Q: 16.99, R: 13.54, S: 12.6, T: 12.96, U: 14.78, V: 14.26, W: 18.52, X: 13.4, Y: 13.42,
  Z: 12.68, ".": 5.25, _: 10.12, "-": 9.39, "+": 12.6,
};
function strWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += CHAR_W[ch] ?? 12; // 미지 글자 기본 12px
  return w;
}
// 이메일을 1~2줄 문자열 배열로 (그리디).
export function emailLines(emailId: string): string[] {
  const segs = [
    { t: emailId, w: strWidth(emailId) },
    { t: "@etribe.", w: SEG_AT },
    { t: "co.kr", w: SEG_CO },
  ];
  const lines: string[] = [];
  let cur = "";
  let curW = 0;
  for (const s of segs) {
    if (cur === "" || curW + s.w <= EMAIL_W) {
      cur += s.t;
      curW += s.w;
    } else {
      lines.push(cur);
      cur = s.t;
      curW = s.w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
export function emailLineCount(emailId: string): number {
  return emailLines(emailId).length;
}

// 이름 700 / 주소 600 = Pretendard GOV, 영문·연락처 400 / 전화·팩스 600 = Red Hat Display.
const GOV =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard-gov/dist/web/static/woff";
const RHD = "https://cdn.jsdelivr.net/npm/@fontsource/red-hat-display/files";

export const FONT_SPECS: { family: string; url: string; weight: 400 | 600 | 700 }[] = [
  { family: "Pretendard GOV", url: `${GOV}/PretendardGOV-Bold.woff`, weight: 700 },
  { family: "Pretendard GOV", url: `${GOV}/PretendardGOV-SemiBold.woff`, weight: 600 },
  {
    family: "Red Hat Display",
    url: `${RHD}/red-hat-display-latin-400-normal.woff`,
    weight: 400,
  },
  {
    family: "Red Hat Display",
    url: `${RHD}/red-hat-display-latin-600-normal.woff`,
    weight: 600,
  },
  {
    family: "Red Hat Display",
    url: `${RHD}/red-hat-display-latin-700-normal.woff`,
    weight: 700,
  },
];

// URL의 base64url(JSON)을 디코드해 기본값 위에 머지한다.
export function decodeCard(raw: string | null): Card {
  if (!raw) return DEFAULT_CARD;
  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(normalized, "base64").toString("utf-8");
  return { ...DEFAULT_CARD, ...JSON.parse(json) };
}

// 배경 워드마크용 글자 SVG (제공받은 Vector-*.svg, 흰색, 높이 72 기준).
const GLYPHS: Record<string, { w: number; d: string }> = {
  E: {
    w: 59,
    d: "M0 0H58.1281V17.1826H19.6195L19.6281 28.4109H58.1367V44.4689H19.6281L19.6195 55.7235L58.1367 55.7322L58.1882 72.7491L0 72.784V0Z",
  },
  T: {
    w: 66,
    d: "M22.3857 17.1743H0V0H65.4618V17.1743H43.0672V72.784H22.3857V17.1743Z",
  },
  I: { w: 22, d: "M0 0H21.8206V72.784H0V0Z" },
  B: {
    w: 66,
    d: "M65.4618 51.3141C65.4618 58.1291 62.939 63.4112 57.8934 67.1603C52.8479 70.9094 46.2626 72.784 38.1462 72.784H0V0H36.3019C45.2447 0 52.1345 1.90961 56.9713 5.72882C61.8081 9.54803 64.2265 14.6549 64.2265 21.067C64.2265 24.676 62.9999 27.917 60.538 30.7814C59.0679 32.5509 57.0931 34.1189 54.6312 35.4854C57.7455 37.0533 60.0074 38.6213 61.3992 40.1893C64.1047 43.1063 65.4618 46.8204 65.4618 51.3141ZM43.2091 21.978C43.2091 20.3399 42.6698 19.0172 41.6085 17.9923C40.2079 16.6959 38.1636 16.0477 35.4581 16.0477H21.5306V27.9083H35.4581C38.1636 27.9083 40.1296 27.3301 41.3649 26.1739C42.5915 25.0088 43.2091 23.6073 43.2091 21.978ZM44.4357 50.2979C44.4357 48.5986 43.8616 47.162 42.7133 46.0057C41.3127 44.6392 39.2684 43.9647 36.5542 43.9647H21.5219V56.7451H36.5542C39.2597 56.7451 41.2518 56.1144 42.5219 54.853C43.8007 53.5828 44.4357 52.0674 44.4357 50.2979Z",
  },
  R: {
    w: 66,
    d: "M65.4618 72.784H43.921L28.5469 45.7225H21.3524V72.7752H0V0H34.4139C43.6897 0 51.047 2.38393 56.5029 7.16051C61.5476 11.5965 64.0657 17.0193 64.0657 23.4288C64.0657 28.0046 62.5583 32.0564 59.552 35.6017C57.0339 38.5358 52.0234 41.7318 48.1178 43.3735L65.4618 72.784ZM43.5698 23.4201C43.5698 21.4466 42.7305 19.7263 41.0689 18.2593C39.3987 16.7923 37.1461 16.0588 34.294 16.0588H21.3524V30.7902H34.294C37.1376 30.7902 39.3987 30.0567 41.0689 28.5897C42.7305 27.1226 43.5698 25.4023 43.5698 23.4201Z",
  },
};

function glyphSrc(g: { w: number; d: string }): string {
  const svg = `<svg width="${g.w}" height="${GLYPH_H}" viewBox="0 0 ${g.w} ${GLYPH_H}" xmlns="http://www.w3.org/2000/svg"><path d="${g.d}" fill="white"/></svg>`;
  // SVG는 ASCII라 btoa로 충분 — 브라우저/Node/엣지 모두 동작(클라이언트 렌더 호환).
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function CardView({ card, scale = 1 }: { card: Card; scale?: number }) {
  // 배경 워드마크: brand 문자열을 글리프 SVG로 매핑. 그룹 width 480, height 72, top 208.
  const brandLetters = BRAND.toUpperCase()
    .split("")
    .filter((ch) => ch in GLYPHS);

  // 이메일은 flex-wrap 세그먼트로 처리(길면 @etribe.co.kr 통째로 다음 줄).
  // satori는 ZWSP 줄바꿈 미지원 → flex-wrap으로 브라우저와 동일하게.
  const phoneText = normalizePhone(card.phone);

  return (
    <div
      style={{
        display: "flex",
        width: WIDTH * scale,
        height: HEIGHT * scale,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          backgroundColor: RED,
          overflow: "hidden",
          fontFamily: "Red Hat Display",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* 하단 대형 워드마크 (SVG 글리프) — width 480 / height 72 / top 208 */}
        <div
          style={{
            position: "absolute",
            top: 208,
            left: 0,
            width: 481, // 마지막 E 우측 끝을 1px 더 오른쪽으로
            height: GLYPH_H,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {brandLetters.map((ch, i) => (
            <img
              key={i}
              src={glyphSrc(GLYPHS[ch])}
              width={GLYPHS[ch].w}
              height={GLYPH_H}
              style={{ width: GLYPHS[ch].w, height: GLYPH_H }}
            />
          ))}
        </div>

        {/* 검정 바 (주소 / T / F) — width 480 / height 18 / bottom 28 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 26,
            height: 18,
            backgroundColor: "#000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px",
          }}
        >
          <div
            style={{
              display: "flex",
              color: RED,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: "nowrap",
              fontFamily: "Pretendard GOV",
            }}
          >
            {ADDRESS}
          </div>
          <div
            style={{
              display: "flex",
              color: RED,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {TEL}
          </div>
          <div
            style={{
              display: "flex",
              color: RED,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {FAX}
          </div>
        </div>

        {/* 좌상단 블록 — top 28 / left 20 */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 20,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 3,
            }}
          >
            <div
              style={{
                display: "flex",
                backgroundColor: "#000000",
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 700,
                lineHeight: 1,
                fontFamily: "Pretendard GOV",
                padding: "3px 1px",
              }}
            >
              {card.nameKo}
            </div>
            <div
              style={{
                display: "flex",
                backgroundColor: "#000000",
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 700,
                lineHeight: 1,
                fontFamily: "Pretendard GOV",
                padding: "3px 1px",
              }}
            >
              {card.titleKo}
            </div>
          </div>
          {/* 영어이름·부서 — 한 요소에서 \n 개행, 간격은 lineHeight(19/14)로 / 이름 아래 12px */}
          <div
            style={{
              display: "flex",
              marginTop: 12,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 400,
              letterSpacing: 0.56,
              lineHeight: 19 / 14, // 줄 높이 19px
              textTransform: "uppercase",
              whiteSpace: "pre-line",
            }}
          >
            {Array.isArray(card.enLines)
              ? card.enLines.join("\n")
              : card.enLines}
          </div>
        </div>

        {/* 우상단 연락처 — top 52 / left 208 / size 21 / 줄높이 28 / 폭 252(길면 개행) */}
        <div
          style={{
            position: "absolute",
            top: 52,
            left: 208,
            width: 252,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 전화 */}
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: 21,
              fontWeight: 400,
              lineHeight: 28 / 21,
            }}
          >
            {phoneText}
          </div>
          {/* 이메일 — 미리 계산한 줄(1~2)을 plain 텍스트로 렌더(공백/오판 없음). 각 줄 28px */}
          {emailLines(card.emailId).map((ln, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 21,
                fontWeight: 400,
                lineHeight: 28 / 21,
                whiteSpace: "nowrap",
              }}
            >
              {ln}
            </div>
          ))}
          {/* 웹(고정) */}
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: 21,
              fontWeight: 400,
              lineHeight: 28 / 21,
            }}
          >
            {WEB}
          </div>
        </div>
      </div>
    </div>
  );
}
