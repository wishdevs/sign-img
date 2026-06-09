#!/usr/bin/env bash
# 스택 출력에서 Function URL을 읽어 config.js로 주입하고 프리뷰를 S3에 업로드.
# 사용: ./scripts/deploy-web.sh [stack] [region]
set -euo pipefail
STACK="${1:-sign-img}"
REGION="${2:-ap-northeast-2}"

out() { aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }

FN="$(out FunctionUrl)"
BUCKET="$(out WebBucketName)"
WEB="$(out WebUrl)"
# 서명 HTML이 쓸 공개 CDN 베이스 (CdnBase 파라미터, 예: https://sign.etribe.co.kr)
CDN="$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Parameters[?ParameterKey=='CdnBase'].ParameterValue" --output text)"
ROOT="$(dirname "$0")/.."

# 편집기 번들 빌드 (Vercel Editor 재사용)
( cd "$ROOT" && node esbuild-web.mjs )

# 주입: __IMG_BASE__=미리보기(즉석 Lambda), __GEN_URL__=복사 시 POST(S3 저장),
#       __CDN_BASE__=서명 HTML URL(sign.etribe.co.kr)
{
  printf 'window.FN_URL=%s;\n' "\"$FN\""
  printf 'window.__IMG_BASE__=window.FN_URL;\n'
  printf 'window.__GEN_URL__=window.FN_URL;\n'
  printf 'window.__CDN_BASE__=%s;\n' "\"$CDN\""
} > "$ROOT/web/config.js"

aws s3 sync "$ROOT/web/" "s3://$BUCKET/" --region "$REGION"

echo "✓ 프리뷰 배포 완료"
echo "  FN_URL : $FN"
echo "  웹 URL : $WEB"
