# 🔥 Firebase 설정 가이드

교보문고 얼리버드 이벤트 시스템을 위한 Firebase 설정 가이드입니다.

## 1️⃣ Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `mp3-free-earlybird` (또는 원하는 이름)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

## 2️⃣ 웹 앱 등록

1. Firebase 프로젝트 대시보드에서 웹 아이콘(`</>`) 클릭
2. 앱 닉네임: `MP3 Free Website`
3. Firebase Hosting 설정 체크박스 선택 (선택사항)
4. "앱 등록" 클릭

## 3️⃣ Firebase Config 설정

1. 앱 등록 후 표시되는 `firebaseConfig` 객체 복사
2. `/js/firebase-config.js` 파일 열기
3. 기존 placeholder 값을 실제 config 값으로 교체

```javascript
const firebaseConfig = {
    apiKey: "실제 API KEY",
    authDomain: "프로젝트ID.firebaseapp.com",
    projectId: "프로젝트ID",
    storageBucket: "프로젝트ID.appspot.com",
    messagingSenderId: "실제 SENDER ID",
    appId: "실제 APP ID"
};
```

## 4️⃣ Firestore Database 설정

1. Firebase Console에서 "Firestore Database" 메뉴 클릭
2. "데이터베이스 만들기" 클릭
3. **프로덕션 모드**로 시작 선택
4. 위치: `asia-northeast3 (Seoul)` 선택
5. "사용 설정" 클릭

### Firestore Security Rules 설정

Firestore Database > "규칙" 탭으로 이동하여 아래 규칙 적용:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 얼리버드 신청 컬렉션
    match /earlybird_applications/{applicationId} {
      // 읽기: 모든 사용자 허용 (신청자 리스트 표시용)
      allow read: if true;

      // 쓰기: 모든 사용자 허용 (신청서 제출용)
      // 단, 필수 필드 검증
      allow create: if request.resource.data.keys().hasAll([
        'name', 'email', 'phone', 'goals', 'ageGroup',
        'receiptUrl', 'status', 'timestamp'
      ])
      && request.resource.data.email is string
      && request.resource.data.email.matches('.*@.*\\..*')
      && request.resource.data.status == 'pending';

      // 업데이트: 관리자만 허용 (실제 운영 시 인증 필요)
      // 임시로 모든 업데이트 허용 (관리자 대시보드용)
      allow update, delete: if true;
      // 운영 환경에서는 Firebase Auth 사용 권장:
      // allow update, delete: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

**규칙 게시** 클릭하여 적용

## 5️⃣ Firebase Storage 설정

1. Firebase Console에서 "Storage" 메뉴 클릭
2. "시작하기" 클릭
3. **프로덕션 모드**로 시작 선택
4. 위치: `asia-northeast3 (Seoul)` 선택
5. "완료" 클릭

### Storage Security Rules 설정

Storage > "규칙" 탭으로 이동하여 아래 규칙 적용:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 영수증 이미지 업로드 폴더
    match /receipts/{fileName} {
      // 읽기: 모든 사용자 허용 (관리자가 영수증 확인용)
      allow read: if true;

      // 쓰기: 파일 크기 5MB 제한, 이미지/PDF만 허용
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && (request.resource.contentType.matches('image/.*')
                       || request.resource.contentType == 'application/pdf');
    }
  }
}
```

**규칙 게시** 클릭하여 적용

## 6️⃣ 관리자 대시보드 접근 제한 (권장)

관리자 대시보드(`/admin.html`)는 인증된 사용자만 접근하도록 설정하는 것을 권장합니다.

### 옵션 1: Firebase Hosting Redirects (간단)

`firebase.json` 파일에 추가:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/admin.html",
        "destination": "/admin-login.html"
      }
    ]
  }
}
```

### 옵션 2: Firebase Authentication (권장)

1. Firebase Console > Authentication 메뉴
2. "시작하기" 클릭
3. 이메일/비밀번호 로그인 활성화
4. 관리자 계정 생성
5. `admin.html`에 로그인 체크 로직 추가

## 7️⃣ 테스트

1. 로컬에서 테스트:
   ```bash
   # Python 내장 서버 사용
   python -m http.server 8000

   # 브라우저에서 http://localhost:8000 접속
   ```

2. 얼리버드 섹션에서 테스트 신청 제출
3. `/admin.html` 접속하여 신청 내역 확인
4. 상태 변경 및 CSV 내보내기 테스트

## 8️⃣ Vercel 배포

1. Firebase Config가 설정된 상태로 Git 커밋
2. Vercel에 자동 배포
3. 배포된 사이트에서 기능 테스트

## 🔒 보안 권장사항

### 운영 환경 Security Rules (강화 버전)

실제 운영 시에는 Firebase Authentication을 사용하여 관리자 인증을 구현하는 것을 강력히 권장합니다.

#### Firestore Rules (Auth 적용)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /earlybird_applications/{applicationId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll([
        'name', 'email', 'phone', 'goals', 'ageGroup',
        'receiptUrl', 'status', 'timestamp'
      ]) && request.resource.data.status == 'pending';

      // 관리자만 업데이트/삭제 가능
      allow update, delete: if request.auth != null
                            && request.auth.token.admin == true;
    }
  }
}
```

#### 관리자 Custom Claims 설정

Firebase Admin SDK를 사용하여 관리자 계정에 admin claim 부여:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

// 관리자 이메일 주소
const adminEmail = 'admin@example.com';

async function setAdminClaim() {
  const user = await admin.auth().getUserByEmail(adminEmail);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`Admin claim set for ${adminEmail}`);
}

setAdminClaim();
```

## 📊 예상 비용

Firebase 무료 티어 (Spark Plan) 한도:

| 서비스 | 무료 한도 | 100명 예상 사용량 |
|--------|-----------|-------------------|
| Firestore 읽기 | 50,000/일 | ~5,000/일 |
| Firestore 쓰기 | 20,000/일 | ~500/일 |
| Storage | 5GB | ~500MB |
| 네트워크 다운로드 | 10GB/월 | ~2GB/월 |

**결론**: 100명 규모는 무료 티어로 충분합니다.

## 🆘 문제 해결

### 1. "Firebase is not defined" 오류

- Firebase SDK 스크립트가 올바르게 로드되었는지 확인
- `index.html`의 `<head>` 섹션에 Firebase SDK 스크립트 존재 확인

### 2. "Permission denied" 오류

- Security Rules가 올바르게 설정되었는지 확인
- Firebase Console에서 규칙 게시 여부 확인

### 3. 이미지 업로드 실패

- Storage Rules 확인
- 파일 크기 5MB 이하인지 확인
- 파일 형식이 이미지 또는 PDF인지 확인

### 4. 실시간 업데이트가 작동하지 않음

- Firestore 읽기 규칙 확인
- 브라우저 콘솔에서 에러 메시지 확인

## 📞 문의

Firebase 설정 관련 문의사항은 프로젝트 관리자에게 연락하세요.
