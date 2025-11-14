# Firebase Functions 이메일 발송 설정 가이드

## 1. Gmail 앱 비밀번호 생성

Firebase Functions에서 이메일을 발송하려면 Gmail 계정의 **앱 비밀번호**가 필요합니다.

### 단계:

1. **Google 계정 보안 설정** 이동
   - https://myaccount.google.com/security

2. **2단계 인증 활성화**
   - "Google에 로그인하는 방법" → "2단계 인증" 클릭
   - 화면 안내에 따라 2단계 인증 설정

3. **앱 비밀번호 생성**
   - 2단계 인증 설정 후 다시 보안 페이지로 이동
   - "Google에 로그인하는 방법" → "앱 비밀번호" 클릭
   - 앱 선택: "메일", 기기 선택: "기타(맞춤 이름)" → "대충영어 얼리버드"
   - "생성" 클릭
   - **16자리 앱 비밀번호 복사** (예: abcd efgh ijkl mnop)

## 2. Firebase Functions 환경 변수 설정

터미널에서 다음 명령어를 실행하여 Gmail 계정 정보를 설정합니다:

```bash
# 프로젝트 루트 디렉토리에서 실행
firebase functions:config:set gmail.email="your-email@gmail.com" gmail.password="your-app-password"
```

예시:
```bash
firebase functions:config:set gmail.email="dachungEnglish@gmail.com" gmail.password="abcdefghijklmnop"
```

**주의**:
- `gmail.email`: 실제 Gmail 주소 입력
- `gmail.password`: 위에서 생성한 16자리 앱 비밀번호 입력 (공백 제거)
- 따옴표 안에 입력해야 함

## 3. 설정 확인

```bash
firebase functions:config:get
```

출력 예시:
```json
{
  "gmail": {
    "email": "dachungEnglish@gmail.com",
    "password": "abcdefghijklmnop"
  }
}
```

## 4. Firebase Functions 배포

```bash
# functions 디렉토리 패키지 설치 (이미 완료)
cd functions
npm install

# 프로젝트 루트로 이동
cd ..

# Functions 배포
firebase deploy --only functions
```

## 5. 테스트

### 자동 이메일 발송 테스트:
1. Firebase Console → Firestore → earlybird_applications 컬렉션
2. 신청 문서의 `status` 필드를 `approved`로 변경
3. 해당 이메일로 WAV 파일 다운로드 링크가 자동 발송됨

### 수동 이메일 발송 테스트:
1. 관리자 대시보드 (admin.html) 접속
2. 신청 목록에서 "📧 이메일" 버튼 클릭
3. 확인 후 이메일 발송

## 6. 로그 확인

이메일 발송 로그 확인:
```bash
firebase functions:log
```

## 7. 보안 주의사항

- ⚠️ **앱 비밀번호는 절대 Git에 커밋하지 마세요**
- ⚠️ Firebase Functions 환경 변수로만 관리
- ⚠️ 앱 비밀번호가 노출되면 즉시 삭제하고 새로 생성

## 8. 문제 해결

### 이메일 발송 실패 시:

1. **환경 변수 확인**
   ```bash
   firebase functions:config:get
   ```

2. **Functions 로그 확인**
   ```bash
   firebase functions:log
   ```

3. **Gmail 앱 비밀번호 재생성**
   - 기존 앱 비밀번호 삭제
   - 새 앱 비밀번호 생성
   - 환경 변수 재설정

4. **2단계 인증 확인**
   - Gmail 계정에 2단계 인증이 활성화되어 있는지 확인

## 9. 대안: SendGrid 사용

Gmail 대신 SendGrid를 사용하려면:

1. SendGrid 계정 생성 (무료 플랜: 하루 100통)
2. API Key 생성
3. `functions/index.js`에서 nodemailer transporter 변경:

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: functions.config().sendgrid.key
  }
});
```

4. 환경 변수 설정:
```bash
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
```

## 10. 비용

- Firebase Functions: 무료 플랜 월 125K 호출
- Gmail: 무료 (앱 비밀번호 사용)
- SendGrid: 무료 플랜 하루 100통

얼리버드 200명 기준 Gmail 무료로 충분합니다.
