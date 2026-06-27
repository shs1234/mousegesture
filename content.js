/**
 * Mouse Gesture - Content Script
 * 
 * 오른쪽 마우스 버튼을 누른 채로 드래그하여 제스처를 인식하고,
 * Canvas를 통해 트레일을 시각적으로 렌더링합니다.
 */

(function () {
  'use strict';

  // ── 상수 ──────────────────────────────────────────
  const SAMPLE_DISTANCE = 20;        // 샘플링 최소 거리 (px)
  const MIN_GESTURE_DISTANCE = 40;   // 제스처로 인식할 최소 총 거리
  const TRAIL_WIDTH = 3;
  const TRAIL_COLOR = 'rgba(66, 133, 244, 0.7)';
  const TRAIL_DOT_COLOR = 'rgba(66, 133, 244, 0.9)';
  const OVERLAY_FADE_DURATION = 600;

  // ── 기본 제스처 매핑 ────────────────────────────────
  const DEFAULT_GESTURES = {
    'L':  { action: 'back',          label: '뒤로가기',         icon: '←' },
    'R':  { action: 'forward',       label: '앞으로가기',       icon: '→' },
    'U':  { action: 'scrollTop',     label: '맨 위로',         icon: '↑' },
    'D':  { action: 'scrollBottom',  label: '맨 아래로',       icon: '↓' },
    'UR': { action: 'closeTab',      label: '탭 닫기',         icon: '↑→' },
    'DR': { action: 'newTab',        label: '새 탭',           icon: '↓→' },
    'LR': { action: 'restoreTab',    label: '탭 복원',         icon: '←→' },
    'UD': { action: 'reload',        label: '새로고침',        icon: '↑↓' },
    'UL': { action: 'pinTab',        label: '탭 고정/해제',    icon: '↑←' },
    'DL': { action: 'duplicateTab',  label: '탭 복제',         icon: '↓←' },
    'RL': { action: 'hardReload',    label: '강력 새로고침',   icon: '→←' },
    'DU': { action: 'muteTab',       label: '탭 음소거',       icon: '↓↑' },
  };

  // ── 상태 ──────────────────────────────────────────
  let isGesturing = false;
  let gestureStarted = false;
  let startX = 0, startY = 0;
  let lastX = 0, lastY = 0;
  let points = [];
  let directions = [];
  let canvas = null;
  let ctx = null;
  let overlay = null;
  let enabled = true;
  let suppressContextMenu = false;
  let gestureMap = { ...DEFAULT_GESTURES };
  let settings = {
    trailColor: TRAIL_COLOR,
    trailWidth: TRAIL_WIDTH,
    sensitivity: SAMPLE_DISTANCE,
  };

  // ── 설정 로드 ─────────────────────────────────────
  function loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['enabled', 'gestureMap', 'settings'], (result) => {
        if (result.enabled !== undefined) enabled = result.enabled;
        if (result.gestureMap) {
          // gestureMap에는 action 문자열만 저장되어 있으므로 DEFAULT_GESTURES와 병합
          const savedMap = result.gestureMap;
          for (const key in savedMap) {
            if (DEFAULT_GESTURES[key]) {
              gestureMap[key] = { ...DEFAULT_GESTURES[key], action: savedMap[key] };
            } else if (savedMap[key] && typeof savedMap[key] === 'object') {
              gestureMap[key] = savedMap[key];
            }
          }
        }
        if (result.settings) {
          settings = { ...settings, ...result.settings };
        }
      });
    }
  }

  loadSettings();

  // 설정 변경 감지
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) enabled = changes.enabled.newValue;
      if (changes.gestureMap) {
        const savedMap = changes.gestureMap.newValue;
        for (const key in savedMap) {
          if (DEFAULT_GESTURES[key]) {
            gestureMap[key] = { ...DEFAULT_GESTURES[key], action: savedMap[key] };
          }
        }
      }
      if (changes.settings) {
        settings = { ...settings, ...changes.settings.newValue };
      }
    });
  }

  // ── Canvas 관리 ───────────────────────────────────
  function createCanvas() {
    if (canvas) return;

    canvas = document.createElement('canvas');
    canvas.id = '__mouse_gesture_canvas__';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.documentElement.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }

  function removeCanvas() {
    if (canvas) {
      canvas.style.opacity = '0';
      setTimeout(() => {
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        canvas = null;
        ctx = null;
      }, 300);
    }
  }

  // ── 트레일 렌더링 ────────────────────────────────
  function drawTrail() {
    if (!ctx || points.length < 2) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 반투명 트레일 선
    ctx.beginPath();
    ctx.strokeStyle = settings.trailColor || TRAIL_COLOR;
    ctx.lineWidth = settings.trailWidth || TRAIL_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Catmull-Rom to Bezier로 부드러운 곡선 그리기
    if (points.length === 2) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      // 마지막 포인트까지 연결
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();

    // 시작점 표시
    ctx.beginPath();
    ctx.fillStyle = settings.trailColor || TRAIL_DOT_COLOR;
    ctx.arc(points[0].x, points[0].y, (settings.trailWidth || TRAIL_WIDTH) + 2, 0, Math.PI * 2);
    ctx.fill();

    // 현재 방향 텍스트 표시
    const gestureStr = directions.join('');
    if (gestureStr && gestureMap[gestureStr]) {
      const gesture = gestureMap[gestureStr];
      const lastPoint = points[points.length - 1];
      drawGestureHint(gesture, lastPoint.x, lastPoint.y);
    }
  }

  function drawGestureHint(gesture, x, y) {
    if (!ctx) return;

    const text = `${gesture.icon} ${gesture.label}`;
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const metrics = ctx.measureText(text);
    const padding = 8;
    const height = 28;
    const width = metrics.width + padding * 2;

    // 위치를 커서 근처에 표시 (화면 밖으로 안 나가도록)
    let hintX = x + 15;
    let hintY = y - 25;
    if (hintX + width > canvas.width) hintX = x - width - 15;
    if (hintY < 0) hintY = y + 25;

    // 배경 박스
    ctx.fillStyle = 'rgba(30, 30, 30, 0.85)';
    ctx.beginPath();
    const radius = 6;
    ctx.moveTo(hintX + radius, hintY);
    ctx.lineTo(hintX + width - radius, hintY);
    ctx.arcTo(hintX + width, hintY, hintX + width, hintY + radius, radius);
    ctx.lineTo(hintX + width, hintY + height - radius);
    ctx.arcTo(hintX + width, hintY + height, hintX + width - radius, hintY + height, radius);
    ctx.lineTo(hintX + radius, hintY + height);
    ctx.arcTo(hintX, hintY + height, hintX, hintY + height - radius, radius);
    ctx.lineTo(hintX, hintY + radius);
    ctx.arcTo(hintX, hintY, hintX + radius, hintY, radius);
    ctx.closePath();
    ctx.fill();

    // 테두리
    ctx.strokeStyle = 'rgba(66, 133, 244, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 텍스트
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, hintX + padding, hintY + height / 2);
  }

  // ── 방향 인식 ─────────────────────────────────────
  function getDirection(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'R' : 'L';
    } else {
      return dy > 0 ? 'D' : 'U';
    }
  }

  function addDirection(dir) {
    if (directions.length === 0 || directions[directions.length - 1] !== dir) {
      directions.push(dir);
    }
  }

  // ── 제스처 실행 ───────────────────────────────────
  function executeGesture(gestureStr) {
    const gesture = gestureMap[gestureStr];
    if (!gesture) return false;

    const action = gesture.action;

    // Content script에서 직접 실행 가능한 것
    switch (action) {
      case 'back':
        history.back();
        return true;
      case 'forward':
        history.forward();
        return true;
      case 'scrollTop':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return true;
      case 'scrollBottom':
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        return true;
      case 'reload':
        location.reload();
        return true;
      case 'hardReload':
        location.reload();
        return true;
    }

    // background.js로 전달해야 하는 것 (chrome.tabs API 필요)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'gesture', action: action });
    }
    return true;
  }

  // ── 결과 오버레이 표시 ────────────────────────────
  function showResultOverlay(gesture) {
    // 기존 오버레이 제거
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }

    overlay = document.createElement('div');
    overlay.id = '__mouse_gesture_overlay__';
    overlay.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 24px;
        background: rgba(20, 20, 25, 0.9);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(66, 133, 244, 0.3);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: __mg_slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      ">
        <span style="font-size: 28px; filter: drop-shadow(0 0 8px rgba(66, 133, 244, 0.4));">${gesture.icon}</span>
        <span style="font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">${gesture.label}</span>
      </div>
    `;
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2147483647;
      pointer-events: none;
    `;

    // 애니메이션 스타일 주입
    const style = document.createElement('style');
    style.textContent = `
      @keyframes __mg_slideIn {
        from { opacity: 0; transform: translate(-50%, -40%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes __mg_fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -60%) scale(0.9); }
      }
    `;
    document.documentElement.appendChild(style);
    document.documentElement.appendChild(overlay);

    // 페이드 아웃 후 제거
    setTimeout(() => {
      if (overlay) {
        overlay.style.animation = `__mg_fadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards`;
        setTimeout(() => {
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
          if (style && style.parentNode) style.parentNode.removeChild(style);
          overlay = null;
        }, 300);
      }
    }, OVERLAY_FADE_DURATION);
  }

  // ── 이벤트 핸들러 ────────────────────────────────
  function onMouseDown(e) {
    if (!enabled) return;
    if (e.button !== 2) return; // 오른쪽 버튼만

    isGesturing = true;
    gestureStarted = false;
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    points = [{ x: e.clientX, y: e.clientY }];
    directions = [];
  }

  function onMouseMove(e) {
    if (!isGesturing) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < (settings.sensitivity || SAMPLE_DISTANCE)) return;

    // 첫 번째 유효 움직임에서 Canvas 생성
    if (!gestureStarted) {
      const totalDx = e.clientX - startX;
      const totalDy = e.clientY - startY;
      const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
      if (totalDist < MIN_GESTURE_DISTANCE) return;

      gestureStarted = true;
      createCanvas();
    }

    // 포인트 기록 & 방향 판별
    points.push({ x: e.clientX, y: e.clientY });
    const dir = getDirection(dx, dy);
    addDirection(dir);
    lastX = e.clientX;
    lastY = e.clientY;

    // 트레일 그리기
    drawTrail();
  }

  function onMouseUp(e) {
    if (!isGesturing || e.button !== 2) return;

    isGesturing = false;

    if (gestureStarted) {
      const gestureStr = directions.join('');

      if (gestureStr && gestureMap[gestureStr]) {
        showResultOverlay(gestureMap[gestureStr]);
        executeGesture(gestureStr);
      }

      removeCanvas();
      suppressContextMenu = true;
      gestureStarted = false;
      // 짧은 시간 후 플래그 해제 (contextmenu 이벤트가 mouseup 직후 발생)
      setTimeout(() => { suppressContextMenu = false; }, 100);
    }

    points = [];
    directions = [];
  }

  function onContextMenu(e) {
    if (gestureStarted || suppressContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      suppressContextMenu = false;
      return false;
    }
  }

  // ── 창 리사이즈 처리 ──────────────────────────────
  function onResize() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  // ── 이벤트 등록 ───────────────────────────────────
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('contextmenu', onContextMenu, true);
  window.addEventListener('resize', onResize);

  // 페이지 unload 시 정리
  window.addEventListener('beforeunload', () => {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });
})();
