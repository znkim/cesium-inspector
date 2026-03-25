# Cesium Inspector

React + TypeScript + Vite + CesiumJS 기반 리소스 테스트 뷰어입니다.
왼쪽 입력 패널로 Terrain / 3D Tiles / Imagery를 로드하고, 오른쪽 Viewer 위 오버레이 패널에서 현재 로드 상태를 확인할 수 있습니다.

## 주요 기능

- 단일 Cesium Viewer 생성/관리
- Terrain / 3D Tiles / Imagery URL 로드/제거
- `Load All`, `Clear All`, 샘플 입력
- 로드된 레이어 상태를 Viewer 내부 우측 오버레이 패널에서 표시
- 이름 미입력 시 URL 기반 또는 타입 기반 fallback 이름 자동 생성
- 입력값 localStorage 저장/복원

## 프로젝트 구조

```text
.
├─ package.json
├─ vite.config.ts
├─ README.md
└─ src
   ├─ App.tsx
   ├─ styles.css
   ├─ components
   │  ├─ LayerStatusPanel.tsx
   │  ├─ ResourceForm.tsx
   │  └─ ViewerContainer.tsx
   ├─ lib
   │  ├─ cesiumManager.ts
   │  ├─ layerNaming.ts
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

### 1) Vite base 설정

`vite.config.ts`는 `VITE_BASE_PATH` 환경변수를 읽어 base를 설정합니다.

- 미설정 시: `/`
- GitHub Pages 저장소 경로 배포 시: `/<repository-name>/`

예시 (repository 이름이 `cesium-inspector`인 경우):

```bash
VITE_BASE_PATH=/cesium-inspector/ npm run build
```

권장: `.env.production` 파일을 만들어 아래처럼 관리

```bash
VITE_BASE_PATH=/cesium-inspector/
```

### 2) 배포 스크립트 실행

`package.json`에 아래 스크립트가 포함되어 있습니다.

- `predeploy`: `npm run build`
- `deploy`: `gh-pages -d dist`

배포 명령:

```bash
npm run deploy
```

이 명령은 `dist`를 `gh-pages` 브랜치로 배포합니다.

### 3) GitHub 저장소 Pages 설정

1. GitHub Repository → **Settings** → **Pages**
2. Source를 `Deploy from a branch`로 설정
3. Branch를 `gh-pages` / root로 선택

## 참고

- CORS 허용된 데이터 소스를 사용해야 합니다.
- Cesium widget CSS import(`main.tsx`)는 유지해야 합니다.
