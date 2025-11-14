# 기능 명세

방문자 통계 시스템의 구현된 기능 상세 설명입니다.

## 📊 1. 자동 방문자 추적

### 1.1 기본 정보 수집
페이지 방문 시 자동으로 수집되는 정보:

| 항목 | 설명 | 예시 |
|------|------|------|
| timestamp | 서버 타임스탬프 | 2025-11-14 15:30:25 |
| visitDate | ISO 날짜 | 2025-11-14T06:30:25.123Z |
| page | 페이지 경로 | / |
| url | 전체 URL | https://mp3-free.vercel.app/ |
| referrer | 유입 경로 | https://google.com 또는 direct |

### 1.2 디바이스 정보
| 항목 | 설명 | 가능한 값 |
|------|------|----------|
| device | 디바이스 타입 | Desktop, Mobile, Tablet |
| browser | 브라우저 | Chrome, Safari, Firefox, Edge, IE |
| screenResolution | 화면 해상도 | 1920x1080 |
| viewport | 뷰포트 크기 | 1440x900 |
| platform | 운영체제 | MacIntel, Win32, Linux |

### 1.3 추가 정보
| 항목 | 설명 | 예시 |
|------|------|------|
| language | 브라우저 언어 | ko-KR, en-US |
| userAgent | User Agent 문자열 | Mozilla/5.0... |
| sessionId | 세션 ID | session_1700012345_abc123 |

## 📈 2. Google Analytics 이벤트 추적

### 2.1 자동 추적 이벤트

#### 페이지뷰 (page_view)
```javascript
gtag('event', 'page_view', {
  page_title: document.title,
  page_location: window.location.href,
  page_path: window.location.pathname
});
```

#### 스크롤 깊이 (scroll_depth)
- 25%, 50%, 75%, 100% 지점에서 자동 추적
```javascript
gtag('event', 'scroll_depth', {
  scroll_percentage: 25
});
```

#### 외부 링크 클릭 (click)
```javascript
gtag('event', 'click', {
  event_category: 'external_link',
  event_label: 'https://example.com'
});
```

#### 섹션 조회 (section_view)
얼리버드 섹션 50% 이상 노출 시
```javascript
gtag('event', 'section_view', {
  event_category: 'engagement',
  event_label: 'earlybird_section'
});
```

## 📊 3. 통계 대시보드

### 3.1 통계 카드

#### 오늘 방문자
- 오늘 00:00 이후 방문자 수
- 실시간 업데이트

#### 주간 방문자
- 최근 7일간 방문자 수
- 일자별 분포 포함

#### 월간 방문자
- 최근 30일간 방문자 수
- 전체 누적 통계

### 3.2 차트 시각화

#### 일자별 방문자 차트 (Line Chart)
- X축: 날짜 (최근 7일)
- Y축: 방문자 수
- 라이브러리: Chart.js
- 타입: 선형 차트 (면적 채우기)

```javascript
{
  type: 'line',
  data: {
    labels: ['11/8', '11/9', '11/10', ...],
    datasets: [{
      label: '일별 방문자 수',
      data: [15, 23, 18, ...]
    }]
  }
}
```

#### 디바이스별 분포 차트 (Doughnut Chart)
- Desktop, Mobile, Tablet 비율
- 라이브러리: Chart.js
- 타입: 도넛 차트

```javascript
{
  type: 'doughnut',
  data: {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [{
      data: [65, 30, 5]
    }]
  }
}
```

#### 브라우저별 분포 차트 (Bar Chart)
- Chrome, Safari, Firefox, Edge 등
- 라이브러리: Chart.js
- 타입: 막대 차트

```javascript
{
  type: 'bar',
  data: {
    labels: ['Chrome', 'Safari', 'Firefox', ...],
    datasets: [{
      label: '브라우저별 방문자',
      data: [120, 45, 23, ...]
    }]
  }
}
```

### 3.3 최근 방문자 테이블
- 최근 20명의 방문자 상세 정보
- 실시간 업데이트
- 컬럼: 방문일시, 페이지, 디바이스, 브라우저, 유입경로, 해상도

## 📥 4. CSV 내보내기

### 4.1 기능
- 모든 방문자 데이터를 CSV 파일로 내보내기
- UTF-8 BOM 인코딩 (Excel 호환)
- 파일명: `visitors_[timestamp].csv`

### 4.2 포함 데이터
```csv
방문일시,페이지,Referrer,디바이스,브라우저,해상도,User Agent
2025-11-14 15:30,/,direct,Desktop,Chrome,1440x900,"Mozilla/5.0..."
```

### 4.3 사용법
```javascript
// CSV 내보내기 버튼 클릭
exportVisitorsToCSV()
```

## 🔄 5. 실시간 업데이트

### 5.1 Firestore 실시간 리스너
```javascript
visitorsRef
  .orderBy('timestamp', 'desc')
  .onSnapshot((snapshot) => {
    // 실시간으로 데이터 업데이트
  });
```

### 5.2 자동 새로고침
- 통계 페이지 로드 시 자동으로 최신 데이터 가져오기
- Firestore 변경 사항 실시간 반영
- 네트워크 재연결 시 자동 복구

## 🎯 6. 세션 관리

### 6.1 세션 ID 생성
```javascript
function getOrCreateSessionId() {
  let sessionId = sessionStorage.getItem('visitor_session_id');

  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('visitor_session_id', sessionId);
  }

  return sessionId;
}
```

### 6.2 세션 유지
- 브라우저 탭 단위로 세션 유지
- 탭 닫으면 세션 종료
- 같은 탭에서 페이지 이동 시 동일 세션 유지

## 🛡️ 7. 보안 및 개인정보

### 7.1 수집하지 않는 정보
- ❌ IP 주소
- ❌ 이메일 주소
- ❌ 이름
- ❌ 위치 정보 (GPS)
- ❌ 쿠키 (세션 스토리지만 사용)

### 7.2 익명 데이터
- 모든 데이터는 익명으로 수집
- 개인 식별 불가능
- GDPR 준수

## 📚 다음 단계

- [데이터 구조](./03-data-structure.md) - Firestore 데이터 모델 상세
- [보안 정책](./04-security.md) - 보안 규칙 설명
- [사용 가이드](./05-usage-guide.md) - 대시보드 사용법
