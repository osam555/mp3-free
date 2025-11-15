// Popup 버튼 이벤트
document.getElementById('openBook').addEventListener('click', () => {
  const bookUrl = 'https://product.kyobobook.co.kr/detail/S000218549943';
  chrome.tabs.create({ url: bookUrl });
});

// 상태 업데이트
chrome.storage.local.get(['lastRank', 'lastUpdate'], (result) => {
  const statusDiv = document.getElementById('status');
  if (result.lastRank) {
    const updateTime = result.lastUpdate ? new Date(result.lastUpdate).toLocaleString('ko-KR') : '알 수 없음';
    statusDiv.innerHTML = `
      <strong>최근 수집:</strong><br>
      순위: ${result.lastRank}위<br>
      시간: ${updateTime}
    `;
    statusDiv.style.background = '#dcfce7';
    statusDiv.style.borderLeft = '3px solid #10b981';
  }
});

// 메시지 리스너 (content script로부터 업데이트 받기)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RANK_UPDATED') {
    chrome.storage.local.set({
      lastRank: message.rank,
      lastUpdate: new Date().toISOString()
    });
  }
});

