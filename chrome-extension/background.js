/**
 * Background Service Worker
 * 자동으로 교보문고 페이지를 열어서 순위 수집
 */

const BOOK_URL = 'https://product.kyobobook.co.kr/detail/S000218549943';
const ALARM_NAME = 'auto-collect-rank';

// 확장 프로그램 설치 시 알람 설정
chrome.runtime.onInstalled.addListener(async () => {
  console.log('🔧 확장 프로그램 설치/업데이트됨');
  
  // 기본 설정 저장
  const settings = await chrome.storage.local.get(['autoCollect', 'collectTime', 'collectInterval']);
  
  if (settings.autoCollect === undefined) {
    await chrome.storage.local.set({
      autoCollect: true,           // 자동 수집 활성화
      collectTime: '09:00',        // 수집 시간 (오전 9시)
      collectInterval: 'daily',    // 수집 주기 (daily, hourly, manual)
      lastCollect: null            // 마지막 수집 시간
    });
  }
  
  // 알람 재설정
  await setupAlarm();
});

// 알람 설정 함수
async function setupAlarm() {
  const settings = await chrome.storage.local.get(['autoCollect', 'collectTime', 'collectInterval']);
  
  // 기존 알람 제거
  await chrome.alarms.clear(ALARM_NAME);
  
  if (!settings.autoCollect) {
    console.log('⏸️ 자동 수집이 비활성화되어 있습니다.');
    return;
  }
  
  let periodInMinutes;
  
  switch (settings.collectInterval) {
    case 'hourly':
      periodInMinutes = 60; // 1시간마다
      break;
    case 'every6hours':
      periodInMinutes = 360; // 6시간마다
      break;
    case 'daily':
    default:
      periodInMinutes = 1440; // 24시간마다
      break;
  }
  
  // 알람 생성
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: periodInMinutes,
    delayInMinutes: 1 // 1분 후 첫 실행
  });
  
  console.log(`✅ 알람 설정 완료: ${settings.collectInterval} (${periodInMinutes}분마다)`);
}

// 알람 트리거 시 실행
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('⏰ 알람 트리거: 순위 수집 시작');
    await collectRank();
  }
});

// 순위 수집 함수
async function collectRank() {
  const settings = await chrome.storage.local.get(['autoCollect']);
  
  if (!settings.autoCollect) {
    console.log('⏸️ 자동 수집이 비활성화되어 있습니다.');
    return;
  }
  
  console.log('🔄 교보문고 페이지를 백그라운드에서 열고 있습니다...');
  
  try {
    // 새 탭을 백그라운드에서 열기
    const tab = await chrome.tabs.create({
      url: BOOK_URL,
      active: false // 백그라운드에서 열기
    });
    
    console.log(`✅ 탭 생성 완료 (ID: ${tab.id})`);
    
    // 5초 대기 후 탭 자동 닫기 (순위 수집 완료 후)
    setTimeout(async () => {
      try {
        await chrome.tabs.remove(tab.id);
        console.log('✅ 탭 자동 닫기 완료');
        
        // 마지막 수집 시간 업데이트
        await chrome.storage.local.set({
          lastCollect: new Date().toISOString()
        });
        
        // 알림 표시 (선택사항)
        showNotification('교보문고 순위가 자동으로 수집되었습니다.');
      } catch (e) {
        console.log('탭이 이미 닫혀있거나 오류 발생:', e.message);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ 순위 수집 중 오류:', error);
  }
}

// 알림 표시 함수 (Chrome Notifications API 사용하지 않고 간단하게)
function showNotification(message) {
  console.log('📢 알림:', message);
  // Badge 업데이트 (선택사항)
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  
  // 3초 후 Badge 제거
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 3000);
}

// 메시지 리스너 (popup에서 수동 실행 요청)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COLLECT_NOW') {
    console.log('📨 수동 수집 요청 받음');
    collectRank();
    sendResponse({ success: true });
  } else if (message.type === 'UPDATE_SETTINGS') {
    console.log('📨 설정 업데이트 요청 받음');
    setupAlarm();
    sendResponse({ success: true });
  } else if (message.type === 'RANK_COLLECTED') {
    console.log('✅ 순위 수집 완료:', message.rank);
    // Badge 업데이트
    chrome.action.setBadgeText({ text: String(message.rank) });
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
    sendResponse({ success: true });
  }
  
  return true; // 비동기 응답 유지
});

// 확장 프로그램 시작 시 로그
console.log('🚀 Background Service Worker 시작됨');

