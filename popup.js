/**
 * Mouse Gesture - Popup Script
 */

const GESTURES = {
  'L':  { action: 'back',        label: '뒤로가기',       icon: '←' },
  'R':  { action: 'forward',     label: '앞으로가기',     icon: '→' },
  'U':  { action: 'scrollTop',   label: '맨 위로',       icon: '↑' },
  'D':  { action: 'scrollBottom', label: '맨 아래로',     icon: '↓' },
  'UR': { action: 'closeTab',    label: '탭 닫기',       icon: '↑→' },
  'DR': { action: 'newTab',      label: '새 탭',         icon: '↓→' },
  'LR': { action: 'restoreTab',  label: '탭 복원',       icon: '←→' },
  'UD': { action: 'reload',      label: '새로고침',      icon: '↑↓' },
  'UL': { action: 'pinTab',      label: '탭 고정/해제',  icon: '↑←' },
  'DL': { action: 'duplicateTab', label: '탭 복제',       icon: '↓←' },
  'RL': { action: 'hardReload',  label: '강력 새로고침', icon: '→←' },
  'DU': { action: 'muteTab',     label: '탭 음소거',     icon: '↓↑' },
};

// ── 제스처 가이드 렌더링 ────────────────────────────
function renderGestureGrid() {
  const grid = document.getElementById('gesture-grid');
  grid.innerHTML = '';

  for (const [key, gesture] of Object.entries(GESTURES)) {
    const item = document.createElement('div');
    item.className = 'gesture-item';
    item.innerHTML = `
      <div class="gesture-icon">${gesture.icon}</div>
      <div class="gesture-label">${gesture.label}</div>
    `;
    grid.appendChild(item);
  }
}

// ── 토글 상태 ───────────────────────────────────────
function updateToggleUI(enabled) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const bar = document.getElementById('status-bar');

  if (enabled) {
    dot.className = 'status-dot active';
    text.textContent = '활성화됨';
    bar.className = 'status-bar';
  } else {
    dot.className = 'status-dot inactive';
    text.textContent = '비활성화됨';
    bar.className = 'status-bar disabled';
  }
}

// ── 초기화 ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderGestureGrid();

  const toggle = document.getElementById('toggle-enabled');

  // 저장된 상태 로드
  chrome.storage.sync.get(['enabled'], (result) => {
    const enabled = result.enabled !== undefined ? result.enabled : true;
    toggle.checked = enabled;
    updateToggleUI(enabled);
  });

  // 토글 변경
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ enabled });
    updateToggleUI(enabled);
  });

  // 설정 페이지 열기
  document.getElementById('open-options').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
