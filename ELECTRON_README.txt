Electron 전환 요약
==================

실행
----
  npm install
  npm start

개발 시 새로고침
----------------
  · index.html / style.css / js/*.js 만 고친 경우: Ctrl+R 로 새로고침해도 됨. (devDependencies에
    electron-reloader 가 있으면 저장 시 자동 새로고침)
  · electron/main.js 또는 electron/preload.js 를 고친 경우: 앱 종료 후 npm start 로 재실행

구조
----
  electron/main.js     — BrowserWindow, 위젯 모드, IPC, 창 상태 JSON(userData/window-state.json)
  electron/preload.js  — contextBridge(electronAPI)
  js/electron-bridge.js — window.open → openExternal, 연동 패널의 Electron 옵션 바인딩
  js/components/memo.view.js — renderMemoPreview 샘플(요약 텍스트)

index.html 스크립트 순서
------------------------
  … 기존 컴포넌트 …
  js/components/memo.view.js
  js/electron-bridge.js
  js/main.js

보안
----
  nodeIntegration: false, contextIsolation: true, sandbox: true
  파일·외부 URL은 preload IPC로만 처리

Google 로그인
-------------
  렌더러 팝업이 막히면 shell.openExternal(외부 브라우저) 또는
  custom protocol + 딥링크로 토큰을 main으로 전달하는 방식을 권장(별도 구현).

위젯 / 마우스 투과
------------------
  위젯 모드: 프레임 없음·투명·항상 위. 상단 Jook Board 타이틀바 빈 영역으로 창 이동.
  마우스 투과 후에는 창이 클릭을 받지 못함 → Ctrl+Shift+M 으로 해제.

상단 메뉴(파일·보기)
--------------------
  표시하지 않음. 대체 단축키: Ctrl+R 새로고침, Ctrl+Shift+I 개발자 도구.

앱·창 끄기
----------
  · Ctrl+Q — 앱 종료 (전역 단축키)
  · Alt+F4 — 창에 포커스가 있을 때 창 닫기(종료)
  · 작업 표시줄 아이콘 우클릭 → 창 닫기 / (또는) Alt+Tab으로 창 선택 후 Alt+F4
  · 상단 타이틀바「닫기」버튼
  · 위젯이어도 작업 표시줄에 아이콘이 뜨도록 설정됨(찾기 쉬움)

데이터 파일(확장)
-----------------
  preload: readDataJson(name) / writeDataJson(name, data)
  저장 위치: userData/dashboard-data/<name>.json
