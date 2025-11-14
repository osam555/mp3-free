# 🚀 빠른 시작 가이드

교보문고 얼리버드 이벤트를 5분 안에 설정하는 방법입니다.

## 1단계: Firebase 프로젝트 생성 (웹 콘솔)

1. **Firebase Console 접속**
   - 브라우저에서 https://console.firebase.google.com/ 열기
   - `john.wu571@gmail.com` 계정으로 로그인됨

2. **프로젝트 추가**
   - "프로젝트 추가" 클릭
   - 프로젝트 이름: `mp3-free` 입력
   - "계속" 클릭
   - Google Analytics: "지금은 사용 안 함" 선택 (선택사항)
   - "프로젝트 만들기" 클릭

## 2단계: 웹 앱 등록

1. **웹 앱 추가**
   - 프로젝트 생성 후 "웹 앱에 Firebase 추가"(`</>` 아이콘) 클릭
   - 앱 닉네임: `MP3 Free Website` 입력
   - "앱 등록" 클릭

2. **Firebase SDK 설정 복사**
   - 표시되는 `firebaseConfig` 객체를 **복사**하세요
   - 예시:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "mp3-free.firebaseapp.com",
     projectId: "mp3-free",
     storageBucket: "mp3-free.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:xxxxxxxxxxxxx"
   };
   ```

3. **Config 파일에 붙여넣기**
   - `/Users/osam/dev/mp3-free/js/firebase-config.js` 파일 열기
   - 복사한 config를 기존 placeholder 위치에 **붙여넣기**
   - 파일 저장

## 3단계: Firestore Database 설정

1. **Firestore 생성**
   - 좌측 메뉴에서 "Firestore Database" 클릭
   - "데이터베이스 만들기" 클릭
   - **테스트 모드**로 시작 선택 (임시로 빠른 설정)
   - 위치: `asia-northeast3 (Seoul)` 선택
   - "사용 설정" 클릭

2. **Security Rules 설정 (중요!)**
   - "규칙" 탭 클릭
   - 아래 규칙을 **복사하여 붙여넣기**:

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
      allow update, delete: if true;
    }
  }
}
```

   - **"게시"** 클릭

## 4단계: Firebase Storage 설정

1. **Storage 생성**
   - 좌측 메뉴에서 "Storage" 클릭
   - "시작하기" 클릭
   - **테스트 모드**로 시작 선택
   - "다음" 클릭
   - 위치: `asia-northeast3 (Seoul)` 선택
   - "완료" 클릭

2. **Storage Rules 설정**
   - "규칙" 탭 클릭
   - 아래 규칙을 **복사하여 붙여넣기**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /receipts/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && (request.resource.contentType.matches('image/.*')
                       || request.resource.contentType == 'application/pdf');
    }
  }
}
```

   - **"게시"** 클릭

## 5단계: 로컬 테스트

터미널에서 실행:

```bash
cd /Users/osam/dev/mp3-free
python3 -m http.server 8000
```

브라우저에서 접속:
- 메인 페이지: http://localhost:8000
- 관리자 대시보드: http://localhost:8000/admin.html

## 6단계: 기능 테스트

### 사용자 기능 테스트
1. 얼리버드 섹션으로 스크롤
2. 테스트 신청 제출:
   - 영수증: 아무 이미지 파일
   - 이름: 테스트
   - 이메일: test@test.com
   - 전화번호: 010-1234-5678
   - 학습 목표: 1개 이상 선택
   - 연령대: 선택

3. "얼리버드 신청하기" 클릭
4. 성공 메시지 확인
5. 신청자 리스트에 "테*" 표시 확인

### 관리자 기능 테스트
1. http://localhost:8000/admin.html 접속
2. 신청 내역 확인
3. 상태 변경 테스트 (대기 중 → 승인 완료)
4. 영수증 이미지 클릭하여 확인
5. 이메일 복사 버튼 테스트
6. CSV 내보내기 테스트

## ✅ 설정 완료!

모든 설정이 완료되었습니다. 이제 Git 커밋 후 Vercel에 배포하면 됩니다.

```bash
git add .
git commit -m "Add: 교보문고 얼리버드 이벤트 시스템 구현

- Firebase 연동 (Firestore + Storage)
- 얼리버드 신청 폼
- 실시간 신청자 리스트
- 관리자 대시보드
- 영수증 업로드 기능

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

git push
```

## 🔐 운영 환경 보안 강화 (선택사항)

실제 운영 시에는 관리자 대시보드 접근 제한을 권장합니다.
자세한 내용은 `FIREBASE_SETUP.md` 참조.

## 📊 모니터링

Firebase Console에서 실시간으로 확인 가능:
- Firestore: 신청 데이터
- Storage: 영수증 이미지
- Analytics: 사용자 행동 (선택사항)

## 🆘 문제 해결

### Firebase Config 오류
- `js/firebase-config.js`에 실제 config 값 입력 확인
- Firebase Console에서 config 다시 복사

### 이미지 업로드 실패
- Storage Rules 게시 확인
- 파일 크기 5MB 이하 확인

### 실시간 업데이트 안됨
- Firestore Rules 게시 확인
- 브라우저 콘솔에서 에러 확인

문의: Firebase 설정 관련 질문은 프로젝트 관리자에게 연락
