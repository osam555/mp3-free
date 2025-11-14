# 데이터 구조

Firestore 데이터베이스의 컬렉션 및 문서 구조 상세 설명입니다.

## 📦 컬렉션 구조

```
firestore
├── earlybird_applications/     # 얼리버드 신청 데이터
│   └── [documentId]/
└── page_visitors/              # 방문자 추적 데이터
    └── [documentId]/
```

## 📄 page_visitors 컬렉션

### 문서 ID
자동 생성 (Firestore auto-generated ID)

### 문서 스키마

```typescript
interface PageVisitor {
  // 시간 정보
  timestamp: Timestamp;           // Firestore 서버 타임스탬프
  visitDate: string;              // ISO 8601 날짜 문자열

  // 페이지 정보
  page: string;                   // 페이지 경로
  url: string;                    // 전체 URL
  referrer: string;               // 유입 경로 URL 또는 'direct'

  // 디바이스 정보
  device: DeviceType;             // 'Desktop' | 'Mobile' | 'Tablet'
  browser: BrowserType;           // 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Internet Explorer' | 'Unknown'
  platform: string;               // OS 플랫폼

  // 화면 정보
  screenResolution: string;       // 'width x height' (예: '1920x1080')
  viewport: string;               // 'width x height' (예: '1440x900')

  // 언어 및 기타
  language: string;               // 브라우저 언어 (예: 'ko-KR')
  userAgent: string;              // User Agent 문자열
  sessionId: string;              // 세션 식별자
}
```

### 실제 문서 예시

```json
{
  "timestamp": {
    "_seconds": 1700123456,
    "_nanoseconds": 789000000
  },
  "visitDate": "2025-11-14T06:30:25.789Z",
  "page": "/",
  "url": "https://mp3-free.vercel.app/",
  "referrer": "https://www.google.com/",
  "device": "Desktop",
  "browser": "Chrome",
  "platform": "MacIntel",
  "screenResolution": "1920x1080",
  "viewport": "1440x900",
  "language": "ko-KR",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "sessionId": "session_1700123456_a1b2c3d4"
}
```

## 🔍 필드 상세 설명

### timestamp (Firestore Timestamp)
- **타입**: `firebase.firestore.Timestamp`
- **생성**: `firebase.firestore.FieldValue.serverTimestamp()`
- **용도**: 서버 기준 정확한 방문 시간
- **인덱스**: 필수 (정렬 및 필터링용)

### visitDate (string)
- **타입**: `string` (ISO 8601)
- **생성**: `new Date().toISOString()`
- **용도**: 클라이언트 기준 날짜/시간
- **형식**: `2025-11-14T06:30:25.789Z`

### page (string)
- **타입**: `string`
- **값**: `window.location.pathname`
- **예시**: `/`, `/visitor-stats.html`, `/admin.html`

### url (string)
- **타입**: `string`
- **값**: `window.location.href`
- **예시**: `https://mp3-free.vercel.app/`

### referrer (string)
- **타입**: `string`
- **값**: `document.referrer || 'direct'`
- **예시**:
  - `https://www.google.com/` (검색 엔진)
  - `https://www.facebook.com/` (소셜 미디어)
  - `direct` (직접 접속)

### device (string)
- **타입**: `'Desktop' | 'Mobile' | 'Tablet'`
- **감지 로직**:
  ```javascript
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile/.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
  ```

### browser (string)
- **타입**: `'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Internet Explorer' | 'Unknown'`
- **감지 로직**:
  ```javascript
  if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
  if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
  if (ua.indexOf('Firefox') > -1) return 'Firefox';
  if (ua.indexOf('Edg') > -1) return 'Edge';
  if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) return 'Internet Explorer';
  return 'Unknown';
  ```

### platform (string)
- **타입**: `string`
- **값**: `navigator.platform`
- **예시**: `MacIntel`, `Win32`, `Linux x86_64`, `iPhone`

### screenResolution (string)
- **타입**: `string`
- **형식**: `${width}x${height}`
- **값**: `${screen.width}x${screen.height}`
- **예시**: `1920x1080`, `2560x1440`, `375x667` (iPhone)

### viewport (string)
- **타입**: `string`
- **형식**: `${width}x${height}`
- **값**: `${window.innerWidth}x${window.innerHeight}`
- **예시**: `1440x900`, `375x812`

### language (string)
- **타입**: `string`
- **값**: `navigator.language`
- **예시**: `ko-KR`, `en-US`, `ja-JP`

### userAgent (string)
- **타입**: `string`
- **값**: `navigator.userAgent`
- **예시**: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36`

### sessionId (string)
- **타입**: `string`
- **형식**: `session_${timestamp}_${random}`
- **생성**: `'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)`
- **저장**: `sessionStorage` (브라우저 탭 단위)
- **예시**: `session_1700123456_a1b2c3d4`

## 📊 쿼리 패턴

### 1. 오늘 방문자 수
```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);

const snapshot = await visitorsRef
  .where('timestamp', '>=', today)
  .get();

const count = snapshot.size;
```

### 2. 주간 방문자 (7일)
```javascript
const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);
weekAgo.setHours(0, 0, 0, 0);

const snapshot = await visitorsRef
  .where('timestamp', '>=', weekAgo)
  .orderBy('timestamp', 'asc')
  .get();
```

### 3. 최근 방문자 (20명)
```javascript
const snapshot = await visitorsRef
  .orderBy('timestamp', 'desc')
  .limit(20)
  .get();
```

### 4. 디바이스별 그룹화
```javascript
const deviceStats = {};
snapshot.forEach(doc => {
  const device = doc.data().device;
  deviceStats[device] = (deviceStats[device] || 0) + 1;
});
// { Desktop: 65, Mobile: 30, Tablet: 5 }
```

## 🗂️ 인덱스

### 복합 인덱스
Firestore가 자동으로 제안하거나 수동 생성:

1. **timestamp 내림차순**
   - 컬렉션: `page_visitors`
   - 필드: `timestamp` (Descending)
   - 용도: 최근 방문자 조회

2. **timestamp 오름차순**
   - 컬렉션: `page_visitors`
   - 필드: `timestamp` (Ascending)
   - 용도: 시간순 정렬

## 💾 스토리지 예상 크기

### 문서 1개당 크기
```
timestamp: 8 bytes
visitDate: 30 bytes
page: 20 bytes (평균)
url: 50 bytes (평균)
referrer: 50 bytes (평균)
device: 10 bytes
browser: 10 bytes
platform: 15 bytes
screenResolution: 12 bytes
viewport: 12 bytes
language: 8 bytes
userAgent: 200 bytes (평균)
sessionId: 30 bytes
---
총합: ~455 bytes/문서
```

### 예상 스토리지
- 1,000 방문: ~455 KB
- 10,000 방문: ~4.5 MB
- 100,000 방문: ~45 MB

## 📚 다음 단계

- [보안 정책](./04-security.md) - Firestore 보안 규칙
- [사용 가이드](./05-usage-guide.md) - 통계 조회 방법
