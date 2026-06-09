# SAM makefile 빌드 — esbuild 번들 + arm64 네이티브 의존성 설치.
# `sam build --use-container` 로 Amazon Linux arm64 컨테이너에서 빌드(네이티브 바이너리 일치) 권장.

build-GenerateFunction:
	npm ci
	node esbuild.mjs
	cp dist/handler.mjs "$(ARTIFACTS_DIR)/handler.mjs"
	# ESM + 네이티브 모듈만 함수 패키지에 설치
	printf '{"type":"module","dependencies":{"@resvg/resvg-js":"^2.6.2","sharp":"^0.34.5"}}' > "$(ARTIFACTS_DIR)/package.json"
	cd "$(ARTIFACTS_DIR)" && npm install --omit=dev --os=linux --cpu=arm64
