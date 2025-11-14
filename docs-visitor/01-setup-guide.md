# 설정 가이드

방문자 통계 시스템 설치 및 초기 설정 가이드입니다.

## 🎯 전제 조건

- Firebase 프로젝트 생성됨 (mp3-free-earlybird)
- Vercel 배포 완료
- Firebase Firestore 활성화
- Google Analytics 설정 완료

## 📦 설치된 파일

### HTML 페이지
```
visitor-stats.html        # 방문자 통계 대시보드
```

### JavaScript 파일
```
js/visitor-tracker.js     # 방문자 추적 스크립트
js/visitor-stats.js       # 통계 표시 스크립트
js/firebase-config.js     # Firebase 설정 (기존)
```

### 설정 파일
```
firestore.rules           # Firestore 보안 규칙
```

### 문서
```
docs-visitor/             # 문서 폴더
VISITOR_STATS_SETUP.md    # 레거시 설정 가이드
```

## 🚀 설정 단계

### 1. Firebase Firestore 보안 규칙 설정

#### 방법 1: Firebase Console에서 직접 설정
1. Firebase Console 접속
   ```
   https://console.firebase.google.com/project/mp3-free-earlybird/firestore/rules
   ```

2. 기존 규칙 삭제 후 다음 내용 붙여넣기:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // 얼리버드 신청 컬렉션
       match /earlybird_applications/{document} {
         allow create: if true;
         allow read, update, delete: if request.auth != null;
       }

       // 방문자 추적 컬렉션
       match /page_visitors/{document} {
         allow create: if true;
         allow read: if request.auth != null;
         allow update, delete: if false;
       }
     }
   }
   ```

3. "게시" 버튼 클릭

#### 방법 2: Firebase CLI 사용
```bash
cd /Users/osam/dev/mp3-free
firebase deploy --only firestore:rules
```

### 2. index.html에 추적 스크립트 추가 확인

`index.html` 파일 끝부분에 다음이 포함되어 있는지 확인:
```html
<script src="js/firebase-config.js"></script>
<script src="js/earlybird-form.js"></script>
<script src="js/visitor-tracker.js"></script> <!-- 추가됨 -->
```

### 3. Vercel 배포

```bash
git add -A
git commit -m "Add visitor tracking system"
git push
```

Vercel이 자동으로 배포합니다.

### 4. 동작 확인

1. **메인 페이지 접속**
   ```
   https://mp3-free.vercel.app/
   ```
   - 브라우저 개발자 도구 콘솔에서 "방문자 추적 완료" 메시지 확인

2. **통계 페이지 접속**
   ```
   https://mp3-free.vercel.app/visitor-stats.html
   ```
   - 오늘 방문자 수가 1로 표시되는지 확인
   - 최근 방문자 테이블에 데이터 표시 확인

3. **Firebase Console 확인**
   ```
   https://console.firebase.google.com/project/mp3-free-earlybird/firestore/data
   ```
   - `page_visitors` 컬렉션에 문서 추가되었는지 확인

## 🔧 선택적 설정

### Firestore 인덱스 생성 (성능 최적화)

대량의 방문자 데이터가 쌓이면 인덱스 생성 권장:

1. Firebase Console → Firestore Database → Indexes
2. "인덱스 추가" 클릭
3. 설정:
   - 컬렉션 ID: `page_visitors`
   - 필드: `timestamp`, 정렬 순서: `내림차순`
   - 쿼리 범위: `컬렉션`

또는 Firebase가 자동으로 인덱스 생성 제안을 보냅니다.

### Google Analytics 커스텀 이벤트 확인

Google Analytics Console에서 다음 이벤트 확인 가능:
- `page_view` - 페이지 조회
- `scroll_depth` - 스크롤 깊이
- `click` - 외부 링크 클릭
- `section_view` - 얼리버드 섹션 조회

## ✅ 설정 완료 체크리스트

- [ ] Firestore 보안 규칙 게시 완료
- [ ] index.html에 visitor-tracker.js 스크립트 추가 확인
- [ ] Vercel 배포 완료
- [ ] 메인 페이지 접속 시 콘솔에 "방문자 추적 완료" 표시
- [ ] visitor-stats.html에서 통계 데이터 확인
- [ ] Firebase Console에서 page_visitors 컬렉션 확인
- [ ] Google Analytics에서 실시간 데이터 확인

## 🎉 완료!

설정이 완료되었습니다. 이제 방문자 통계가 자동으로 수집됩니다.

## 📚 다음 단계

- [기능 명세](./02-features.md) - 구현된 기능 상세 설명
- [사용 가이드](./05-usage-guide.md) - 통계 대시보드 사용법
