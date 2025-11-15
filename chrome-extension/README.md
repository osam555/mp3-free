# 교보문고 순위 자동 수집 Chrome 확장 프로그램

## 📋 개요

[교보문고 책 페이지](https://product.kyobobook.co.kr/detail/S000218549943)를 방문하면 자동으로 베스트셀러 순위를 추출하여 Firebase에 저장하는 Chrome 확장 프로그램입니다.

## 🎯 주요 기능

- ✅ 교보문고 페이지 자동 감지
- ✅ 순위 자동 추출 (여러 패턴 지원)
- ✅ Firebase Firestore 자동 저장
- ✅ 순위 히스토리 자동 기록
- ✅ 실시간 알림 표시

## 🚀 설치 방법

### 1. Firebase API Key 설정

`content.js` 파일을 열고 다음 부분을 수정하세요:

```javascript
const FIREBASE_API_KEY = 'YOUR_FIREBASE_API_KEY'; // 여기에 실제 API Key 입력
```

**Firebase API Key 찾는 방법:**
1. [Firebase Console](https://console.firebase.google.com/project/mp3-free-earlybird/settings/general) 접속
2. 프로젝트 설정 → 일반 탭
3. "웹 API 키" 복사

### 2. Chrome에 확장 프로그램 설치

1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력
3. 우측 상단 "개발자 모드" 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. 이 폴더(`chrome-extension`) 선택
6. 완료!

### 3. 아이콘 추가 (선택사항)

확장 프로그램이 작동하려면 아이콘 파일이 필요합니다:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

간단한 아이콘을 만들거나, 다음 명령어로 임시 아이콘 생성:

```bash
# macOS/Linux
convert -size 16x16 xc:blue icon16.png
convert -size 48x48 xc:blue icon48.png
convert -size 128x128 xc:blue icon128.png
```

또는 온라인 아이콘 생성 도구 사용:
- [Favicon Generator](https://realfavicongenerator.net/)
- [Icon Generator](https://www.favicon-generator.org/)

## 📖 사용 방법

### 자동 수집
1. [교보문고 책 페이지](https://product.kyobobook.co.kr/detail/S000218549943) 방문
2. 페이지가 완전히 로드되면 자동으로 순위 추출
3. 우측 상단에 "✅ 순위 XXX위가 자동으로 저장되었습니다!" 알림 표시

### 수동 실행
1. Chrome 툴바에서 확장 프로그램 아이콘 클릭
2. "📖 책 페이지 열기" 버튼 클릭
3. 자동으로 교보문고 페이지가 열리고 순위 수집

### 관리자 페이지 확인
- 팝업에서 "관리자 페이지 열기" 링크 클릭
- 또는 직접 [관리자 페이지](https://mp3-free.vercel.app/admin.html) 접속
- 비밀번호: `9119`

## 🔧 동작 원리

```
사용자가 교보문고 페이지 방문
         ↓
content.js가 자동 실행
         ↓
페이지 로드 완료 후 2초 대기
         ↓
document.body.innerText에서 순위 추출
         ↓
Firebase Firestore REST API로 저장
         ↓
kyobobook_rank/current 문서 업데이트
         ↓
kyobobook_rank_history 컬렉션에 기록 추가
         ↓
사용자에게 알림 표시
```

## 🎨 커스터마이징

### 순위 추출 패턴 수정

`content.js`의 `extractRank()` 함수에서 패턴 수정:

```javascript
const patterns = [
  /주간\s*베스트\s*외국어\s*(\d+)\s*위/i,
  /주간베스트외국어\s*(\d+)\s*위/i,
  /외국어\s*(\d+)\s*위/i,
  /베스트\s*(\d+)\s*위/i,
  // 원하는 패턴 추가
];
```

### 알림 스타일 변경

`content.js`의 `showNotification()` 함수에서 CSS 수정

### 자동 수집 주기 변경

```javascript
// 현재: 페이지 로드 후 2초 뒤 한 번 실행
setTimeout(() => { ... }, 2000);

// 변경 예시: 30초마다 반복
setInterval(() => { ... }, 30000);
```

## 🐛 문제 해결

### 순위가 수집되지 않음
1. Chrome 개발자 도구 열기 (F12)
2. Console 탭에서 에러 메시지 확인
3. Firebase API Key가 정확한지 확인
4. 교보문고 페이지 HTML 구조가 변경되었는지 확인

### Firebase 저장 실패
1. Firestore 규칙 확인:
   ```javascript
   match /kyobobook_rank/{document} {
     allow read: if true;
     allow create, update: if true;
   }
   ```
2. Firebase API Key가 활성화되어 있는지 확인
3. Network 탭에서 HTTP 요청 응답 확인

### 알림이 표시되지 않음
- 브라우저의 알림 권한 확인
- content.js의 `showNotification()` 함수 로그 확인

## 📊 데이터 구조

### Firestore 문서 구조

**kyobobook_rank/current:**
```json
{
  "rank": 285,
  "category": "주간베스트 외국어",
  "lastUpdated": "2025-11-15T12:00:00Z",
  "extractedBy": "chrome-extension"
}
```

**kyobobook_rank_history/{auto-id}:**
```json
{
  "rank": 285,
  "category": "주간베스트 외국어",
  "timestamp": "2025-11-15T12:00:00Z",
  "date": "2025-11-15",
  "extractedBy": "chrome-extension"
}
```

## 🔒 보안 고려사항

- ✅ Firebase API Key는 클라이언트 사이드에서 사용 (정상)
- ✅ Firestore 보안 규칙로 쓰기 권한 제어
- ✅ 특정 도메인에서만 실행 (manifest.json의 matches)
- ✅ 필요한 최소 권한만 요청

## 🚀 배포

### Chrome Web Store에 게시 (선택사항)

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) 접속
2. 계정 등록 (일회성 $5 수수료)
3. 확장 프로그램 업로드
4. 설명, 스크린샷 추가
5. 심사 제출

### 팀 내부 배포

1. 이 폴더를 ZIP 파일로 압축
2. 팀원들에게 전달
3. 위의 설치 방법 공유

## 📝 라이선스

이 확장 프로그램은 mp3-free 프로젝트의 일부입니다.

## 💡 개선 아이디어

- [ ] 순위 변화 알림 (상승/하락)
- [ ] 여러 책 추적 지원
- [ ] 자동 수집 스케줄링
- [ ] 다른 서점 지원 (yes24, 알라딘 등)
- [ ] 순위 그래프 팝업에 표시
- [ ] 백그라운드에서 자동 수집 (로그인 세션 유지)

---

**===========**  
**Difficulty: Mid**  
**Learning Keywords: Chrome Extension, Content Scripts, Manifest V3, Firebase REST API, DOM Manipulation, Pattern Matching, Browser Automation**  
**===========**

