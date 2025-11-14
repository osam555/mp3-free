# 방문자 통계 시스템 설정 가이드

## 📊 구현 기능

### 1. Google Analytics 강화
- 페이지뷰 자동 추적
- 스크롤 깊이 추적 (25% 단위)
- 외부 링크 클릭 추적
- 얼리버드 섹션 진입 추적

### 2. Firebase 방문자 로그
다음 정보를 자동 수집:
- 방문 일시
- 페이지 URL
- Referrer (유입 경로)
- 디바이스 타입 (Desktop/Mobile/Tablet)
- 브라우저 정보
- 화면 해상도
- 언어 설정
- User Agent

### 3. 관리자 대시보드
**URL**: `https://mp3-free.vercel.app/visitor-stats.html`

**제공 기능**:
- 오늘/주간/월간 방문자 수 통계
- 일자별 방문자 그래프 (최근 7일)
- 디바이스별 분포 (파이 차트)
- 브라우저별 분포 (막대 그래프)
- 최근 방문자 20명 상세 정보
- CSV 내보내기 기능

## 🚀 Firebase 설정

### 1. Firestore 보안 규칙 업데이트

Firebase Console → Firestore Database → Rules로 이동하여 `firestore.rules` 파일 내용을 붙여넣기:

```
https://console.firebase.google.com/project/mp3-free-earlybird/firestore/rules
```

### 2. 컬렉션 인덱스 생성 (선택)

성능 최적화를 위해 다음 인덱스 생성:

**컬렉션**: `page_visitors`
- 필드: `timestamp` (내림차순)

Firebase Console → Firestore Database → Indexes에서 자동 생성됩니다.

## 📈 Google Analytics 확인

### GA4 대시보드
https://analytics.google.com/

**확인 가능한 지표**:
- 실시간 사용자
- 페이지뷰
- 이벤트 (scroll_depth, click, section_view)
- 사용자 획득 (유입 경로)
- 사용자 행동 흐름

## 🔍 방문자 통계 페이지 접속

### 로컬 테스트
```bash
# 로컬 서버 실행
python3 -m http.server 8000
```

브라우저에서 접속:
- 메인 페이지: `http://localhost:8000/index.html`
- 방문자 통계: `http://localhost:8000/visitor-stats.html`
- 얼리버드 관리: `http://localhost:8000/admin.html`

### 프로덕션
- 메인 페이지: `https://mp3-free.vercel.app/`
- 방문자 통계: `https://mp3-free.vercel.app/visitor-stats.html`
- 얼리버드 관리: `https://mp3-free.vercel.app/admin.html`

## 📊 데이터 구조

### page_visitors 컬렉션
```javascript
{
  timestamp: Timestamp,          // 서버 타임스탬프
  visitDate: "2025-11-14T...",   // ISO 날짜
  page: "/",                     // 페이지 경로
  url: "https://...",            // 전체 URL
  referrer: "https://..." | "direct", // 유입 경로
  userAgent: "Mozilla/5.0...",   // User Agent
  language: "ko-KR",             // 언어
  screenResolution: "1920x1080", // 화면 해상도
  viewport: "1440x900",          // 뷰포트 크기
  platform: "MacIntel",          // 플랫폼
  browser: "Chrome",             // 브라우저
  device: "Desktop",             // 디바이스 타입
  sessionId: "session_..."       // 세션 ID
}
```

## 🔐 보안 고려사항

1. **IP 주소 미수집**: 개인정보 보호를 위해 IP 주소는 수집하지 않습니다
2. **세션 기반 추적**: 브라우저 세션 단위로 사용자 구분
3. **익명 데이터**: 개인 식별 불가능한 정보만 수집
4. **보안 규칙**: Firestore 규칙으로 읽기/쓰기 제한

## 📝 CSV 내보내기

방문자 통계 페이지에서 "CSV 내보내기" 버튼 클릭:
- 파일명: `visitors_[timestamp].csv`
- 인코딩: UTF-8 (Excel 호환)
- 포함 정보: 방문일시, 페이지, Referrer, 디바이스, 브라우저, 해상도, User Agent

## 🛠️ 문제 해결

### 방문자 수가 0으로 표시되는 경우
1. Firebase 초기화 확인: 콘솔에서 "Firebase initialized successfully" 메시지 확인
2. Firestore 규칙 확인: 보안 규칙이 올바르게 설정되었는지 확인
3. 네트워크 탭 확인: 브라우저 개발자 도구에서 네트워크 요청 확인

### CSV 다운로드가 안 되는 경우
- 팝업 차단 해제
- 브라우저 다운로드 권한 확인

### 차트가 표시되지 않는 경우
- Chart.js 로드 확인
- 콘솔 에러 메시지 확인

## 📞 지원

문제가 발생하면 Firebase Console에서:
1. Firestore → Data 탭에서 데이터 확인
2. Usage 탭에서 API 호출 확인
3. 브라우저 콘솔에서 에러 메시지 확인
