# 문제 해결

방문자 통계 시스템 관련 일반적인 문제 및 해결 방법입니다.

## 🔍 문제 진단 체크리스트

문제 발생 시 다음을 순서대로 확인하세요:

- [ ] 인터넷 연결 확인
- [ ] Firebase 서비스 상태 확인
- [ ] 브라우저 콘솔 에러 메시지 확인
- [ ] Firestore 보안 규칙 확인
- [ ] Firebase Console에서 데이터 확인

## ❌ 일반적인 문제

### 1. 방문자 수가 0으로 표시됨

#### 증상
```
오늘 방문자: 0
주간 방문자: 0
월간 방문자: 0
```

#### 원인 1: Firebase 초기화 실패
**확인 방법**:
브라우저 개발자 도구 콘솔 확인
```
[에러] Firebase가 로드되지 않았습니다.
```

**해결 방법**:
1. `js/firebase-config.js` 파일 존재 확인
2. Firebase SDK 로드 확인 (네트워크 탭)
3. Firebase 설정 정보 확인
   ```javascript
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "mp3-free-earlybird",
     // ...
   };
   ```

#### 원인 2: Firestore 보안 규칙
**확인 방법**:
Firebase Console → Firestore → Rules 확인

**해결 방법**:
보안 규칙 업데이트:
```javascript
match /page_visitors/{document} {
  allow create: if true;
  allow read: if request.auth != null; // 임시로 true로 변경
}
```

#### 원인 3: 아직 방문자가 없음
**확인 방법**:
메인 페이지 접속 후 통계 페이지 새로고침

**해결 방법**:
```
https://mp3-free.vercel.app/
```
접속 후 브라우저 콘솔에서 "방문자 추적 완료" 메시지 확인

### 2. 차트가 표시되지 않음

#### 증상
차트 영역이 비어있거나 "차트를 로드할 수 없습니다" 메시지 표시

#### 원인 1: Chart.js 로드 실패
**확인 방법**:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```
네트워크 탭에서 확인

**해결 방법**:
1. 인터넷 연결 확인
2. CDN 대체 URL 사용
   ```html
   <script src="https://unpkg.com/chart.js"></script>
   ```

#### 원인 2: 데이터 없음
**확인 방법**:
브라우저 콘솔 에러 메시지 확인

**해결 방법**:
최소 1개 이상의 방문 기록 필요

#### 원인 3: JavaScript 에러
**확인 방법**:
브라우저 콘솔에서 에러 메시지 확인

**해결 방법**:
`js/visitor-stats.js` 파일 확인 및 수정

### 3. CSV 다운로드 안 됨

#### 증상
"CSV 내보내기" 버튼 클릭 시 아무 반응 없음

#### 원인 1: 팝업 차단
**확인 방법**:
브라우저 주소창 우측에 팝업 차단 아이콘 표시

**해결 방법**:
1. 브라우저 설정 → 팝업 및 리디렉션 허용
2. 사이트별 예외 추가: `https://mp3-free.vercel.app`

#### 원인 2: 다운로드 권한
**확인 방법**:
브라우저 콘솔 에러 메시지 확인

**해결 방법**:
1. 브라우저 설정 → 다운로드 위치 확인
2. 다운로드 자동 허용 설정

#### 원인 3: 데이터 없음
**확인 방법**:
```javascript
if (snapshot.empty) {
  alert('내보낼 데이터가 없습니다.');
}
```

**해결 방법**:
방문 기록 생성 후 재시도

### 4. 실시간 업데이트 안 됨

#### 증상
새 방문자가 발생해도 테이블이 업데이트되지 않음

#### 원인 1: Firestore 실시간 리스너 오류
**확인 방법**:
브라우저 콘솔 에러 메시지 확인

**해결 방법**:
페이지 새로고침 (F5)

#### 원인 2: 네트워크 연결 끊김
**확인 방법**:
인터넷 연결 상태 확인

**해결 방법**:
네트워크 재연결 후 자동 복구

### 5. "Firebase가 로드되지 않았습니다" 에러

#### 증상
```javascript
console.error('Firebase가 로드되지 않았습니다.');
```

#### 원인: Firebase SDK 로드 순서
**확인 방법**:
HTML 파일에서 스크립트 순서 확인

**해결 방법**:
올바른 순서:
```html
<!-- 1. Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

<!-- 2. Firebase Config -->
<script src="js/firebase-config.js"></script>

<!-- 3. 앱 스크립트 -->
<script src="js/visitor-stats.js"></script>
```

### 6. 방문자 추적이 작동하지 않음

#### 증상
메인 페이지 접속해도 Firestore에 데이터 추가 안 됨

#### 원인 1: visitor-tracker.js 미포함
**확인 방법**:
`index.html` 소스 확인

**해결 방법**:
</body> 태그 전에 추가:
```html
<script src="js/visitor-tracker.js"></script>
```

#### 원인 2: Firestore 쓰기 권한 없음
**확인 방법**:
브라우저 콘솔 에러 메시지:
```
Error: Missing or insufficient permissions
```

**해결 방법**:
Firestore 규칙 확인:
```javascript
match /page_visitors/{document} {
  allow create: if true; // 확인
}
```

## 🐛 디버깅 방법

### 브라우저 개발자 도구 사용

#### 1. 콘솔 탭
**열기**: F12 또는 Cmd+Option+I

**확인 항목**:
- 에러 메시지 (빨간색)
- 경고 메시지 (노란색)
- `console.log` 출력

**주요 메시지**:
```javascript
✅ "Firebase initialized successfully"
✅ "방문자 추적 완료"
❌ "Firebase가 로드되지 않았습니다"
❌ "실시간 업데이트 에러: ..."
```

#### 2. 네트워크 탭
**확인 항목**:
- Firebase SDK 로드 성공 (200 OK)
- Firestore API 호출
- 실패한 요청 (빨간색)

#### 3. 애플리케이션 탭
**확인 항목**:
- Session Storage → `visitor_session_id` 확인
- Firestore 캐시 데이터 확인

### Firebase Console 디버깅

#### 1. Firestore 데이터 확인
```
https://console.firebase.google.com/project/mp3-free-earlybird/firestore/data
```

**확인 항목**:
- `page_visitors` 컬렉션 존재
- 문서 추가 여부
- 타임스탬프 최신성

#### 2. 사용량 확인
```
https://console.firebase.google.com/project/mp3-free-earlybird/firestore/usage
```

**확인 항목**:
- 읽기/쓰기 횟수
- 오류율
- 트래픽 패턴

#### 3. 규칙 시뮬레이터
```
https://console.firebase.google.com/project/mp3-free-earlybird/firestore/rules
```

**사용법**:
1. "Rules Playground" 탭 클릭
2. 테스트 쿼리 입력
3. 허용/거부 확인

## 🔧 고급 문제 해결

### Firestore 인덱스 에러

#### 증상
```
The query requires an index. You can create it here: https://...
```

#### 해결 방법
1. 에러 메시지의 링크 클릭
2. "인덱스 생성" 버튼 클릭
3. 몇 분 대기 (인덱스 빌드 시간)

### 성능 문제 (느린 로딩)

#### 증상
통계 페이지 로딩이 10초 이상 걸림

#### 원인 1: 대량의 데이터
**해결 방법**:
1. 쿼리에 `limit()` 추가
   ```javascript
   .limit(100)
   ```
2. 페이지네이션 구현

#### 원인 2: 인덱스 없음
**해결 방법**:
Firestore 인덱스 생성 (위 참조)

#### 원인 3: 비효율적 쿼리
**해결 방법**:
복합 쿼리 대신 개별 쿼리 사용

### CORS 에러

#### 증상
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

#### 해결 방법
Firebase 설정 확인:
```javascript
// firebase-config.js
const firebaseConfig = {
  authDomain: "mp3-free-earlybird.firebaseapp.com", // 확인
  // ...
};
```

## 📞 추가 지원

### Firebase 지원
- 공식 문서: https://firebase.google.com/docs
- 커뮤니티: https://firebase.google.com/support

### 프로젝트별 설정
- Firebase Console: https://console.firebase.google.com/project/mp3-free-earlybird
- Vercel Dashboard: https://vercel.com/dashboard

### 일반적인 문제 보고
문제가 계속되면:
1. 브라우저 콘솔 스크린샷
2. Firebase Console 사용량 스크린샷
3. 재현 단계 기록
4. 프로젝트 관리자에게 보고

## ✅ 문제 해결 완료 후

- [ ] 브라우저 캐시 삭제
- [ ] 시크릿 모드에서 테스트
- [ ] 다른 브라우저에서 확인
- [ ] 모바일에서 확인
- [ ] 정상 작동 문서화

## 📚 관련 문서

- [설정 가이드](./01-setup-guide.md) - 초기 설정 확인
- [보안 정책](./04-security.md) - 보안 규칙 문제
- [사용 가이드](./05-usage-guide.md) - 기본 사용법
