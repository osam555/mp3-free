# 보안 정책

Firestore 보안 규칙 및 개인정보 보호 정책입니다.

## 🛡️ Firestore 보안 규칙

### 전체 규칙
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 얼리버드 신청 컬렉션
    match /earlybird_applications/{document} {
      // 누구나 신청 가능 (create)
      allow create: if true;

      // 읽기 및 업데이트, 삭제는 관리자만 (인증 필요)
      allow read, update, delete: if request.auth != null;
    }

    // 방문자 추적 컬렉션
    match /page_visitors/{document} {
      // 누구나 방문 기록 생성 가능
      allow create: if true;

      // 읽기는 관리자만 (인증 필요)
      allow read: if request.auth != null;

      // 업데이트와 삭제는 불가
      allow update, delete: if false;
    }
  }
}
```

## 📋 규칙 상세 설명

### page_visitors 컬렉션

#### 1. Create (생성) - 허용
```javascript
allow create: if true;
```

**이유**:
- 모든 방문자가 자신의 방문 기록을 생성할 수 있어야 함
- 방문자 추적의 핵심 기능

**보안 고려사항**:
- 악의적 사용자가 대량의 문서를 생성할 수 있음
- 해결책: Cloud Functions로 rate limiting 구현 가능 (선택적)

#### 2. Read (읽기) - 인증된 사용자만
```javascript
allow read: if request.auth != null;
```

**이유**:
- 방문자 데이터는 민감한 정보
- 관리자만 통계 조회 가능

**접근 방법**:
- Firebase Authentication을 통한 관리자 인증 필요
- 현재는 인증 구현 안 됨 (추후 구현 권장)

#### 3. Update (수정) - 불허
```javascript
allow update: if false;
```

**이유**:
- 방문 기록은 수정 불가능해야 함
- 데이터 무결성 유지

#### 4. Delete (삭제) - 불허
```javascript
allow delete: if false;
```

**이유**:
- 방문 기록은 삭제 불가능
- 통계 데이터 보존 필요

**주의**:
- 필요시 Firebase Console이나 Cloud Functions에서 삭제 가능
- 클라이언트에서는 삭제 불가

## 🔐 개인정보 보호

### 수집하지 않는 정보
- ❌ **IP 주소**: 개인 식별 가능
- ❌ **위치 정보 (GPS)**: 개인 위치 추적 불가
- ❌ **이메일 주소**: 얼리버드 신청자만 별도 컬렉션에 저장
- ❌ **이름**: 익명 방문자 추적만
- ❌ **쿠키**: sessionStorage만 사용 (탭 닫으면 삭제)

### 수집하는 정보
- ✅ **타임스탬프**: 방문 시각
- ✅ **페이지 경로**: 어떤 페이지를 방문했는지
- ✅ **Referrer**: 어디서 유입되었는지
- ✅ **디바이스 타입**: Desktop/Mobile/Tablet
- ✅ **브라우저**: 브라우저 종류
- ✅ **화면 해상도**: 반응형 디자인 최적화용
- ✅ **세션 ID**: 브라우저 탭 단위 (개인 식별 불가)

### GDPR 준수
- 모든 데이터는 **익명**
- **개인 식별 불가능**
- 세션 ID는 **랜덤 생성**
- sessionStorage 사용 (브라우저 탭 닫으면 자동 삭제)

## 🔒 인증 시스템 (권장)

현재는 인증 없이 통계 페이지 접근 가능. 보안 강화를 위해 Firebase Authentication 구현 권장:

### 1. Firebase Authentication 설정
```bash
# Firebase Console
https://console.firebase.google.com/project/mp3-free-earlybird/authentication
```

이메일/비밀번호 인증 활성화

### 2. 로그인 페이지 추가
```html
<!-- login.html -->
<form id="login-form">
  <input type="email" id="email" required>
  <input type="password" id="password" required>
  <button type="submit">로그인</button>
</form>

<script>
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    window.location.href = 'visitor-stats.html';
  } catch (error) {
    alert('로그인 실패: ' + error.message);
  }
});
</script>
```

### 3. 통계 페이지 보호
```javascript
// visitor-stats.html에 추가
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    // 로그인하지 않은 경우 리다이렉트
    window.location.href = 'login.html';
  }
});
```

## 🚨 보안 모니터링

### Firebase Console에서 확인
```
https://console.firebase.google.com/project/mp3-free-earlybird/firestore/usage
```

**확인 항목**:
- 읽기/쓰기 횟수
- 비정상적인 트래픽 패턴
- 규칙 위반 시도

### 알림 설정
Firebase Console → Alerting에서 다음 알림 설정 권장:
- 일일 쓰기 횟수 > 10,000
- 규칙 거부율 > 10%

## 🛠️ Rate Limiting (선택적)

대량 스팸 방지를 위한 Cloud Functions 예시:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.checkRateLimit = functions.firestore
  .document('page_visitors/{docId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const sessionId = data.sessionId;

    // 최근 1분간 같은 세션의 방문 기록 수 확인
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentVisits = await admin.firestore()
      .collection('page_visitors')
      .where('sessionId', '==', sessionId)
      .where('timestamp', '>', oneMinuteAgo)
      .get();

    // 1분에 10회 이상이면 스팸으로 간주
    if (recentVisits.size > 10) {
      console.warn(`Rate limit exceeded for session: ${sessionId}`);
      // 선택적: 해당 문서 삭제
      await snap.ref.delete();
    }
  });
```

## 📝 데이터 보관 정책

### 권장 사항
- **보관 기간**: 90일 (3개월)
- **삭제 방법**: Cloud Scheduler + Cloud Functions

### 자동 삭제 구현 (선택적)
```javascript
// Cloud Scheduler: 매일 자정 실행
exports.deleteOldVisitors = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oldVisitors = await admin.firestore()
      .collection('page_visitors')
      .where('timestamp', '<', ninetyDaysAgo)
      .get();

    const batch = admin.firestore().batch();
    oldVisitors.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${oldVisitors.size} old visitor records`);
  });
```

## 📚 다음 단계

- [사용 가이드](./05-usage-guide.md) - 통계 페이지 사용법
- [문제 해결](./06-troubleshooting.md) - 보안 관련 문제 해결
