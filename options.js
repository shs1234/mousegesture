/**
 * Mouse Gesture - Options Script
 */

const GESTURE_ICONS = {
  'L': '←', 'R': '→', 'U': '↑', 'D': '↓',
  'UR': '↑→', 'DR': '↓→', 'LR': '←→', 'UD': '↑↓',
  'UL': '↑←', 'DL': '↓←', 'RL': '→←', 'DU': '↓↑',
};

const GESTURE_NAMES = {
  'L': '왼쪽', 'R': '오른쪽', 'U': '위', 'D': '아래',
  'UR': '위 → 오른쪽', 'DR': '아래 → 오른쪽', 'LR': '왼쪽 → 오른쪽', 'UD': '위 → 아래',
  'UL': '위 → 왼쪽', 'DL': '아래 → 왼쪽', 'RL': '오른쪽 → 왼쪽', 'DU': '아래 → 위',
};

const ACTIONS = [
  { value: 'back',        label: '뒤로가기' },
  { value: 'forward',     label: '앞으로가기' },
  { value: 'scrollTop',   label: '맨 위로 스크롤' },
  { value: 'scrollBottom', label: '맨 아래로 스크롤' },
  { value: 'closeTab',    label: '탭 닫기' },
  { value: 'newTab',      label: '새 탭 열기' },
  { value: 'restoreTab',  label: '닫은 탭 복원' },
  { value: 'reload',      label: '새로고침' },
  { value: 'hardReload',  label: '강력 새로고침 (캐시 무시)' },
  { value: 'pinTab',      label: '탭 고정/해제' },
  { value: 'duplicateTab', label: '탭 복제' },
  { value: 'muteTab',     label: '탭 음소거/해제' },
  { value: 'nextTab',     label: '다음 탭' },
  { value: 'prevTab',     label: '이전 탭' },
  { value: 'none',        label: '(사용 안 함)' },
];

const DEFAULT_MAP = {
  'L':  'back',
  'R':  'forward',
  'U':  'scrollTop',
  'D':  'scrollBottom',
  'UR': 'closeTab',
  'DR': 'newTab',
  'LR': 'restoreTab',
  'UD': 'reload',
  'UL': 'pinTab',
  'DL': 'duplicateTab',
  'RL': 'hardReload',
  'DU': 'muteTab',
};

let currentMap = { ...DEFAULT_MAP };

// ── 제스처 리스트 렌더링 ────────────────────────────
function renderGestureList() {
  const list = document.getElementById('gesture-list');
  list.innerHTML = '';

  const orderedKeys = ['L', 'R', 'U', 'D', 'UR', 'DR', 'LR', 'UD', 'UL', 'DL', 'RL', 'DU'];

  for (const key of orderedKeys) {
    const row = document.createElement('div');
    row.className = 'gesture-row';

    const optionsHtml = ACTIONS.map(a =>
      `<option value="${a.value}" ${currentMap[key] === a.value ? 'selected' : ''}>${a.label}</option>`
    ).join('');

    row.innerHTML = `
      <div class="gesture-row-icon">${GESTURE_ICONS[key]}</div>
      <div class="gesture-row-key">${key}</div>
      <div class="gesture-row-select">
        <select data-gesture="${key}">
          ${optionsHtml}
        </select>
      </div>
    `;
    list.appendChild(row);
  }

  // select 변경 이벤트
  list.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', (e) => {
      currentMap[e.target.dataset.gesture] = e.target.value;
    });
  });
}

// ── 설정 로드 ───────────────────────────────────────
function loadSettings() {
  chrome.storage.sync.get(['gestureMap', 'settings'], (result) => {
    if (result.gestureMap) {
      currentMap = { ...DEFAULT_MAP, ...result.gestureMap };
    }
    renderGestureList();

    if (result.settings) {
      const s = result.settings;
      if (s.trailColor) {
        // rgba를 hex로 변환
        const hex = rgbaToHex(s.trailColor);
        document.getElementById('trail-color').value = hex;
        document.getElementById('color-value').textContent = hex;
      }
      if (s.trailWidth) {
        document.getElementById('trail-width').value = s.trailWidth;
        document.getElementById('width-value').textContent = s.trailWidth + 'px';
      }
      if (s.sensitivity) {
        document.getElementById('sensitivity').value = s.sensitivity;
        document.getElementById('sensitivity-value').textContent = s.sensitivity + 'px';
      }
    }
  });
}

// ── 설정 저장 ───────────────────────────────────────
function saveSettings() {
  const colorHex = document.getElementById('trail-color').value;
  const trailWidth = parseInt(document.getElementById('trail-width').value);
  const sensitivity = parseInt(document.getElementById('sensitivity').value);

  // hex를 rgba로 변환
  const r = parseInt(colorHex.slice(1, 3), 16);
  const g = parseInt(colorHex.slice(3, 5), 16);
  const b = parseInt(colorHex.slice(5, 7), 16);
  const trailColor = `rgba(${r}, ${g}, ${b}, 0.7)`;

  chrome.storage.sync.set({
    gestureMap: currentMap,
    settings: { trailColor, trailWidth, sensitivity }
  }, () => {
    showToast('설정이 저장되었습니다.');
  });
}

// ── 초기화 ──────────────────────────────────────────
function resetSettings() {
  currentMap = { ...DEFAULT_MAP };
  document.getElementById('trail-color').value = '#4285f4';
  document.getElementById('color-value').textContent = '#4285f4';
  document.getElementById('trail-width').value = 3;
  document.getElementById('width-value').textContent = '3px';
  document.getElementById('sensitivity').value = 20;
  document.getElementById('sensitivity-value').textContent = '20px';
  renderGestureList();
  showToast('설정이 초기화되었습니다.');
}

// ── 내보내기/가져오기 ───────────────────────────────
function exportSettings() {
  const colorHex = document.getElementById('trail-color').value;
  const trailWidth = parseInt(document.getElementById('trail-width').value);
  const sensitivity = parseInt(document.getElementById('sensitivity').value);

  const r = parseInt(colorHex.slice(1, 3), 16);
  const g = parseInt(colorHex.slice(3, 5), 16);
  const b = parseInt(colorHex.slice(5, 7), 16);
  const trailColor = `rgba(${r}, ${g}, ${b}, 0.7)`;

  const data = {
    gestureMap: currentMap,
    settings: { trailColor, trailWidth, sensitivity }
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mouse-gesture-settings.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('설정이 내보내기되었습니다.');
}

function importSettings(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.gestureMap) {
        currentMap = { ...DEFAULT_MAP, ...data.gestureMap };
        renderGestureList();
      }
      if (data.settings) {
        const s = data.settings;
        if (s.trailColor) {
          const hex = rgbaToHex(s.trailColor);
          document.getElementById('trail-color').value = hex;
          document.getElementById('color-value').textContent = hex;
        }
        if (s.trailWidth) {
          document.getElementById('trail-width').value = s.trailWidth;
          document.getElementById('width-value').textContent = s.trailWidth + 'px';
        }
        if (s.sensitivity) {
          document.getElementById('sensitivity').value = s.sensitivity;
          document.getElementById('sensitivity-value').textContent = s.sensitivity + 'px';
        }
      }
      showToast('설정을 가져왔습니다. 저장 버튼을 눌러 적용하세요.');
    } catch (err) {
      showToast('파일 형식이 올바르지 않습니다.', true);
    }
  };
  reader.readAsText(file);
}

// ── 유틸리티 ────────────────────────────────────────
function rgbaToHex(rgba) {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#4285f4';
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  toastMessage.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── 이벤트 바인딩 ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // 저장
  document.getElementById('btn-save').addEventListener('click', saveSettings);

  // 초기화
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
      resetSettings();
    }
  });

  // 내보내기
  document.getElementById('btn-export').addEventListener('click', exportSettings);

  // 가져오기
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importSettings(e.target.files[0]);
      e.target.value = ''; // reset
    }
  });

  // 슬라이더 실시간 값 표시
  document.getElementById('trail-width').addEventListener('input', (e) => {
    document.getElementById('width-value').textContent = e.target.value + 'px';
  });
  document.getElementById('sensitivity').addEventListener('input', (e) => {
    document.getElementById('sensitivity-value').textContent = e.target.value + 'px';
  });

  // 색상 피커 값 표시
  document.getElementById('trail-color').addEventListener('input', (e) => {
    document.getElementById('color-value').textContent = e.target.value;
  });
});
