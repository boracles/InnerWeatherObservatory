# Inner Weather Observatory

〈내면 기상 관측소〉는 지금 내 안에서 움직이는 날씨와, 그 날씨가 무엇을 지키려 하는지 살펴보는 인터랙티브 웹 스토리입니다.

Twine·SugarCube로 이야기와 상태를 관리하고, Babylon.js로 관측소와 세 개의 방을 구현했습니다.

## 바로 실행하기

저장소 루트의 `index.html`이 배포용 단일 파일입니다. GitHub Pages에서는 별도 서버 없이 이 파일이 바로 실행됩니다.

## 프로젝트 구조

```text
.
├── index.html                         # GitHub Pages 배포 파일
├── src
│   ├── story
│   │   └── 내면 기상 관측소_IFS.twee  # Twine/SugarCube 원본
│   └── 3d
│       ├── weather-station-base.html  # Babylon.js 관측소 원본
│       ├── weather-station-babylon.html
│       ├── twine-bridge.js
│       ├── twine-bridge.css
│       └── room-markers.html
└── tools
    ├── integrate-3d.mjs
    └── embed-station.mjs
```

## 수정 후 다시 빌드하기

1. Node.js와 [Tweego](https://www.motoslave.net/tweego/)를 설치합니다.
2. 저장소 루트에서 다음 명령을 실행합니다.

```bash
npm run build
```

이 명령은 Babylon.js 관측소를 다시 구성하고 Twee에 삽입한 뒤, 루트의 `index.html`을 새로 만듭니다.

Twine 앱에서 편집할 때는 `src/story/내면 기상 관측소_IFS.twee`를 가져오면 됩니다.

## 기술

- Twine / SugarCube 2
- Babylon.js
- JavaScript / HTML / CSS

## 제작

기획·경험 설계·글·3D 관측소 모델·인터랙션: 윤보라

© 2026 윤보라. All rights reserved.
