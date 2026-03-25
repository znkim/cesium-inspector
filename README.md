# Cesium Inspector

React + TypeScript + Vite + CesiumJS 기반의 간단한 리소스 테스트 뷰어입니다.
브라우저에서 URL을 입력해 Terrain / 3D Tiles / Imagery를 즉시 로드하고 제거할 수 있습니다.

## 주요 기능

- 단일 Cesium Viewer(singleton) 생성 및 재사용
- 리소스별 URL, 이름(옵션), 설명(옵션) 입력
- 지원 리소스
  - Quantized Mesh Terrain (`layer.json` 기준 root URL)
  - 3D Tiles (`tileset.json` 직접 URL)
  - Imagery
    - URL Template / TMS (`/{z}/{x}/{y}.png`)
    - WMTS URL(query 기반 기본 파라미터 자동 해석)
- 리소스별 Load / Remove
- `Load All`, `Clear All`
- 리소스별 독립 Loading / 에러 처리
- 현재 로드된 레이어 목록 표시
- 입력값 localStorage 저장 및 새로고침 자동 복원
- 샘플 URL 자동 입력 버튼 제공

## 프로젝트 구조

```text
.
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
└─ src
   ├─ App.tsx
   ├─ main.tsx
   ├─ styles.css
   ├─ components
   │  ├─ LayerStatusPanel.tsx
   │  ├─ ResourceForm.tsx
   │  └─ ViewerContainer.tsx
   ├─ lib
   │  ├─ cesiumManager.ts
   │  └─ storage.ts
   └─ types
      └─ resources.ts
```

## 로컬 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## GitHub Pages 배포

### 1) `base` 설정

`vite.config.ts`는 아래 환경변수를 사용해 base를 설정합니다.

- `VITE_BASE_PATH`가 있으면 해당 값을 사용
- 없으면 `/`

예시(저장소가 `https://<user>.github.io/cesium-inspector/` 인 경우):

```bash
VITE_BASE_PATH=/cesium-inspector/ npm run build
```

### 2) `dist`를 GitHub Pages로 배포

일반적인 방법:

1. 빌드 생성: `VITE_BASE_PATH=/REPO_NAME/ npm run build`
2. 생성된 `dist` 폴더를 `gh-pages` 브랜치(또는 Pages 설정 브랜치)에 업로드
3. GitHub Repository Settings → Pages에서 배포 브랜치 지정

> 핵심: GitHub Pages가 repository subpath를 사용하므로, `base`를 반드시 저장소 경로로 맞춰야 asset(Workers 포함) 경로가 깨지지 않습니다.

## Cesium/Vite 설정 참고

- `vite-plugin-cesium` 사용
  - Cesium Worker/static asset 경로를 Vite 환경에서 쉽게 처리
- `main.tsx`에서 Cesium Widgets CSS를 반드시 import
  - `import 'cesium/Build/Cesium/Widgets/widgets.css';`
- Viewer는 기본 위젯을 최소화하여 테스트 뷰어 중심으로 구성

## 참고/주의

- 이 앱은 프론트엔드 단독(백엔드 없음)으로 동작합니다.
- URL 대상 서버는 CORS가 이미 해결되어 있다고 가정합니다.
- WMTS 자동 해석은 URL query(`layer`, `style`, `tilematrixset`, `format`)를 기준으로 기본 동작합니다.
