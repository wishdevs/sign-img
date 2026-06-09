# AWS 포팅 — 명함 이미지 생성·슬라이스 (Lambda + S3 + CloudFront)

Vercel의 `/sign`·`/slice`를 AWS로 옮긴 스캐폴딩입니다. 카드 레이아웃은 상위 `app/card.tsx`를 **그대로 재사용**(esbuild 번들)하고, `next/og` 대신 **satori + resvg**, crop은 **sharp**를 씁니다.

## 구조
```
프론트(편집기) ──POST /generate {d, lines}──▶ Lambda(Function URL)
                                                │ satori→resvg(full) + sharp(8조각)
                                                ▼
                                              S3 (키=hash(d), 멱등)
                                                ▲
                          CloudFront(공개·캐시) ─┘  ← 이메일이 여기서 이미지 로드
        ◀──{ signatureHtml, slices URLs }──────
```

## 파일
| 파일 | 역할 |
|---|---|
| `src/render.ts` | satori→SVG→resvg→PNG, sharp crop. `app/card.tsx`의 `CardView` 재사용 |
| `src/slices.ts` | 8조각 좌표 계산 + 서명 `<table>` HTML 생성 (editor.tsx 로직 포팅) |
| `src/s3.ts` | S3 업로드(멱등용 HeadObject) |
| `src/handler.ts` | 라우팅: `POST /generate`(저장), `GET ?d=[&crop=]`(즉석) |
| `template.yaml` | SAM: Lambda(arm64)+FunctionUrl+S3+CloudFront(OAC) |
| `Makefile` | esbuild 번들 + arm64 네이티브 설치 |

## API
- **POST** Function URL, body `{"d":"<base64url>", "lines":1}`
  → `{ base, fullUrl, slices:{top,midleft,phone,...}, signatureHtml }`
  → full + 8조각을 S3에 저장(이미 있으면 skip), CloudFront URL로 만든 서명 HTML 반환
- **GET** `?d=<base64url>` → 전체 PNG (즉석), `&crop=x,y,w,h` → 조각 PNG (저장 없이)

> `lines`(이메일 줄 수 1|2)는 **프론트가 canvas로 측정한 값을 넘기는 것을 권장**. 없으면 글자수 근사(`estimateEmailLines`).

## 배포
사전: AWS 계정/자격증명, AWS SAM CLI, Docker(`--use-container`용).

```bash
cd aws
npm install
# 네이티브 바이너리(arm64) 일치를 위해 컨테이너 빌드 권장
sam build --use-container
sam deploy --guided          # 스택명/리전 지정. 1차 배포

# 출력의 CdnDomain을 CDN_BASE로 넣어 재배포(서명 URL이 CloudFront를 가리키게)
sam deploy --parameter-overrides CdnBase=https://dxxxx.cloudfront.net
```

배포 후 출력:
- `FunctionUrl` — 프론트가 호출할 엔드포인트
- `CdnDomain` — 이미지 공개 베이스 (커스텀 도메인 없으면 이걸 `CDN_BASE`로)

## 프론트(편집기) 연동
`app/preview/editor.tsx`의 "복사"를 **로컬 슬라이스 대신 Lambda 호출**로 바꾸면 됩니다:
```ts
const res = await fetch(`${FUNCTION_URL}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ d, lines: liveLines }),
});
const { signatureHtml, slices } = await res.json();
// signatureHtml(절대 CloudFront URL 포함)을 클립보드에 복사 → 메일 서명에 붙여넣기
```
프론트 자체는 Vercel/정적(S3+CloudFront)/Amplify 어디든 가능. 호출만 Function URL로.

## 주의 (꼭 확인)
1. **네이티브 아키텍처**: Lambda는 `arm64`. `sam build --use-container`로 Amazon Linux arm64에서 빌드해 `sharp`/`@resvg/resvg-js` 바이너리를 맞추세요. 로컬(mac) 빌드 그대로 올리면 런타임 에러.
2. **폰트**: 지금은 런타임에 jsdelivr에서 woff fetch. 프로덕션은 **woff를 패키지에 번들**해 `fs`로 읽도록 바꾸세요(콜드스타트·외부의존 제거). `src/render.ts`의 TODO 참고.
3. **이메일 줄 수 측정**: 정밀하게 하려면 `fontkit`/`opentype.js`로 폰트 메트릭 측정. 스캐폴딩은 근사치 + 프론트 전달값 사용.
4. **커스텀 도메인**: `template.yaml`의 Distribution에 `Aliases` + ACM 인증서(us-east-1)를 추가하고 Route53 연결. 서명은 오래 쓰니 안정 도메인 권장.
5. **resvg 대안**: 컨테이너 빌드가 번거로우면 `@resvg/resvg-js` → `@resvg/resvg-wasm`(이식성↑, 약간 느림)로 교체 가능.
6. **메모리/타임아웃**: 렌더+sharp라 1024MB/30s로 시작. 콜드스타트 민감하면 provisioned concurrency.

## 비용 모델
- 생성은 1회만(멱등) → 이후 이메일 100번 열려도 **S3/CloudFront 캐시**에서 서빙(Lambda 미실행).
- S3 저장(작은 PNG 9장/서명) + CloudFront 전송 비용만.
