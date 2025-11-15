// 초기 설정 로드
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await updateStatus();
});

// 설정 로드
async function loadSettings() {
  const settings = await chrome.storage.local.get([
    'autoCollect',
    'collectTime',
    'collectInterval'
  ]);
  
  document.getElementById('autoCollect').checked = settings.autoCollect !== false;
  document.getElementById('collectTime').value = settings.collectTime || '09:00';
  document.getElementById('collectInterval').value = settings.collectInterval || 'daily';
}

// 상태 업데이트
async function updateStatus() {
  const { lastRank, lastUpdate, lastCollect, autoCollect } = await chrome.storage.local.get([
    'lastRank',
    'lastUpdate',
    'lastCollect',
    'autoCollect'
  ]);
  
  const statusDiv = document.getElementById('status');
  
  if (lastRank) {
    const updateTime = lastCollect ? 
      new Date(lastCollect).toLocaleString('ko-KR', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : '알 수 없음';
    
    statusDiv.innerHTML = `
      <strong>✅ 최근 수집:</strong><br>
      순위: <strong>${lastRank}위</strong><br>
      시간: ${updateTime}<br>
      자동 수집: ${autoCollect !== false ? '✓ 활성화' : '✗ 비활성화'}
    `;
    statusDiv.style.background = '#dcfce7';
    statusDiv.style.borderLeft = '3px solid #10b981';
  } else {
    statusDiv.innerHTML = `
      <strong>⏳ 대기 중</strong><br>
      아직 수집된 순위가 없습니다.<br>
      "지금 수집하기" 버튼을 클릭하세요.
    `;
  }
}

// "지금 수집하기" 버튼
document.getElementById('collectNow').addEventListener('click', async () => {
  const button = document.getElementById('collectNow');
  button.textContent = '🔄 수집 중...';
  button.disabled = true;
  
  try {
    await chrome.runtime.sendMessage({ type: 'COLLECT_NOW' });
    
    setTimeout(async () => {
      button.textContent = '✅ 완료!';
      await updateStatus();
      
      setTimeout(() => {
        button.textContent = '🔄 지금 수집하기';
        button.disabled = false;
      }, 2000);
    }, 3000);
  } catch (error) {
    console.error('수집 요청 실패:', error);
    button.textContent = '❌ 실패';
    setTimeout(() => {
      button.textContent = '🔄 지금 수집하기';
      button.disabled = false;
    }, 2000);
  }
});

// "책 페이지 열기" 버튼
document.getElementById('openBook').addEventListener('click', () => {
  const bookUrl = 'https://product.kyobobook.co.kr/detail/S000218549943';
  chrome.tabs.create({ url: bookUrl, active: true });
});

// 설정 변경 리스너
document.getElementById('autoCollect').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ autoCollect: e.target.checked });
  await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS' });
  await updateStatus();
});

document.getElementById('collectTime').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ collectTime: e.target.value });
  await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS' });
});

document.getElementById('collectInterval').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ collectInterval: e.target.value });
  await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS' });
  
  // 주기 변경 알림
  const intervalText = {
    'hourly': '매시간',
    'every6hours': '6시간마다',
    'daily': '매일'
  };
  
  const info = document.querySelector('.info');
  info.textContent = `✅ 수집 주기가 "${intervalText[e.target.value]}"로 변경되었습니다.`;
  info.style.background = '#dcfce7';
  info.style.borderColor = '#10b981';
  
  setTimeout(() => {
    info.textContent = '자동으로 순위를 수집합니다. 설정에서 수집 주기를 변경할 수 있습니다.';
    info.style.background = '#eff6ff';
    info.style.borderColor = '#3b82f6';
  }, 3000);
});

