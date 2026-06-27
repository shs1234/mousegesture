/**
 * Mouse Gesture - Background Service Worker
 * 
 * Content script에서 전달받은 제스처 메시지를 처리하여
 * chrome.tabs / chrome.sessions API를 통해 브라우저 동작을 실행합니다.
 */

// ── 메시지 수신 ─────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'gesture') return;

  const action = message.action;
  const tabId = sender.tab?.id;

  switch (action) {
    case 'closeTab':
      if (tabId) chrome.tabs.remove(tabId);
      break;

    case 'newTab':
      chrome.tabs.create({ active: true });
      break;

    case 'restoreTab':
      chrome.sessions.restore();
      break;

    case 'pinTab':
      if (tabId) {
        chrome.tabs.get(tabId, (tab) => {
          chrome.tabs.update(tabId, { pinned: !tab.pinned });
        });
      }
      break;

    case 'duplicateTab':
      if (tabId) chrome.tabs.duplicate(tabId);
      break;

    case 'muteTab':
      if (tabId) {
        chrome.tabs.get(tabId, (tab) => {
          chrome.tabs.update(tabId, { muted: !tab.mutedInfo?.muted });
        });
      }
      break;

    case 'nextTab':
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (!sender.tab) return;
        const currentIndex = tabs.findIndex(t => t.id === sender.tab.id);
        const nextIndex = (currentIndex + 1) % tabs.length;
        chrome.tabs.update(tabs[nextIndex].id, { active: true });
      });
      break;

    case 'prevTab':
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (!sender.tab) return;
        const currentIndex = tabs.findIndex(t => t.id === sender.tab.id);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        chrome.tabs.update(tabs[prevIndex].id, { active: true });
      });
      break;

    default:
      // 알 수 없는 액션 — 무시
      break;
  }
});

// ── 확장프로그램 설치/업데이트 시 기본 설정 ──────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      enabled: true,
      gestureMap: {
        'L':  'back',
        'R':  'forward',
        'U':  'scrollUp',
        'D':  'scrollDown',
        'UR': 'closeTab',
        'DR': 'newTab',
        'RU': 'nextTab',
        'RD': 'prevTab',
        'LR': 'restoreTab',
        'UD': 'reload',
        'UL': 'pinTab',
        'DL': 'duplicateTab',
        'RL': 'hardReload',
        'DU': 'muteTab',
      },
      settings: {
        trailColor: 'rgba(66, 133, 244, 0.7)',
        trailWidth: 3,
        sensitivity: 20,
        showHint: false,
        showOverlay: false,
        scrollDistance: 300,
        scrollDuration: 150,
      }
    });
  }
});
