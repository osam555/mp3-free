/**
 * 교보문고 순위 자동 추출 Content Script
 * 페이지가 로드되면 자동으로 순위를 찾아 Firebase에 저장
 */

// Firebase 설정 (관리자 페이지와 동일)
const FIREBASE_API_KEY = 'AIzaSyCQ6McIjpURTjnkprLcVTAytQZk49NG9zo';
const FIREBASE_PROJECT_ID = 'mp3-free-earlybird';

console.log('🔍 교보문고 순위 추출 스크립트 시작...');

// 순위 추출 함수
function extractRank() {
  const bodyText = document.body.innerText;
  console.log('페이지 텍스트 길이:', bodyText.length);
  
  // 여러 패턴으로 순위 추출 시도
  const patterns = [
    /주간\s*베스트\s*외국어\s*(\d+)\s*위/i,
    /주간베스트외국어\s*(\d+)\s*위/i,
    /외국어\s*(\d+)\s*위/i,
    /베스트\s*(\d+)\s*위/i,
  ];
  
  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match) {
      const rank = parseInt(match[1], 10);
      if (rank >= 1 && rank <= 1000) {
        console.log('✅ 순위 발견:', rank, '위');
        return { rank, category: '주간베스트 외국어' };
      }
    }
  }
  
  console.log('⚠️ 순위를 찾을 수 없습니다.');
  return null;
}

// Firebase에 순위 저장 (HTTP 요청 사용)
async function saveRankToFirebase(rank, category) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/kyobobook_rank/current`;
  
  const data = {
    fields: {
      rank: { integerValue: rank.toString() },
      category: { stringValue: category },
      lastUpdated: { timestampValue: new Date().toISOString() },
      extractedBy: { stringValue: 'chrome-extension' }
    }
  };
  
  try {
    const response = await fetch(url + '?key=' + FIREBASE_API_KEY, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      console.log('✅ Firebase에 순위 저장 완료');
      
      // Chrome Storage에도 저장 (팝업 상태 업데이트용)
      chrome.storage.local.set({
        lastRank: rank,
        lastCollect: new Date().toISOString()
      }).catch(err => console.log('Storage 저장 실패:', err));
      
      // 히스토리에도 추가
      await saveRankHistory(rank, category);
      
      // 사용자에게 알림
      showNotification(`✅ 순위 ${rank}위가 자동으로 저장되었습니다!`);
    } else {
      console.error('❌ Firebase 저장 실패:', await response.text());
    }
  } catch (error) {
    console.error('❌ Firebase 저장 중 오류:', error);
  }
}

// 순위 히스토리 저장
async function saveRankHistory(rank, category) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/kyobobook_rank_history`;
  
  const data = {
    fields: {
      rank: { integerValue: rank.toString() },
      category: { stringValue: category },
      timestamp: { timestampValue: new Date().toISOString() },
      date: { stringValue: new Date().toISOString().split('T')[0] },
      extractedBy: { stringValue: 'chrome-extension' }
    }
  };
  
  try {
    await fetch(url + '?key=' + FIREBASE_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    console.log('✅ 히스토리 저장 완료');
  } catch (error) {
    console.error('❌ 히스토리 저장 중 오류:', error);
  }
}

// 알림 표시
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    font-family: sans-serif;
    font-size: 14px;
    font-weight: bold;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// 페이지 로드 후 실행
window.addEventListener('load', () => {
  setTimeout(() => {
    const rankInfo = extractRank();
    if (rankInfo) {
      saveRankToFirebase(rankInfo.rank, rankInfo.category);
      
      // Background script에 알림
      chrome.runtime.sendMessage({
        type: 'RANK_COLLECTED',
        rank: rankInfo.rank,
        category: rankInfo.category
      }).catch(err => console.log('Background script 알림 실패:', err));
    } else {
      console.log('ℹ️ 이 페이지에서 순위를 찾을 수 없습니다.');
    }
  }, 2000); // 2초 대기 후 추출 (페이지 완전 로딩)
});

