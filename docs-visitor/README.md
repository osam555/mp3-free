# 방문자 통계 시스템 문서

대충영어 (mp3-free.vercel.app) 웹사이트의 방문자 추적 및 통계 시스템 문서입니다.

## 📁 문서 목록

1. **[설정 가이드](./01-setup-guide.md)** - 시스템 설치 및 초기 설정
2. **[기능 명세](./02-features.md)** - 구현된 기능 상세 설명
3. **[데이터 구조](./03-data-structure.md)** - Firestore 데이터 모델
4. **[보안 정책](./04-security.md)** - 보안 규칙 및 개인정보 보호
5. **[사용 가이드](./05-usage-guide.md)** - 관리자 대시보드 사용법
6. **[문제 해결](./06-troubleshooting.md)** - 일반적인 문제 및 해결 방법

## 🚀 빠른 시작

### 방문자 통계 확인
https://mp3-free.vercel.app/visitor-stats.html

### 관리자 페이지
https://mp3-free.vercel.app/admin.html

### Google Analytics
https://analytics.google.com/ (계정: G-MFNKDVP6VE)

## 📊 주요 기능

- ✅ 실시간 방문자 추적
- ✅ 일자별/주간/월간 통계
- ✅ 디바이스/브라우저 분석
- ✅ 유입 경로 분석
- ✅ CSV 데이터 내보내기
- ✅ Google Analytics 통합

## 🔗 관련 파일

### 프론트엔드
- `visitor-stats.html` - 통계 대시보드 페이지
- `js/visitor-tracker.js` - 방문자 추적 스크립트
- `js/visitor-stats.js` - 통계 표시 스크립트

### 백엔드
- `firestore.rules` - Firestore 보안 규칙
- `js/firebase-config.js` - Firebase 설정

### 문서
- `docs-visitor/` - 상세 문서 폴더
- `VISITOR_STATS_SETUP.md` - 설정 가이드 (레거시)

## 📞 지원

문제가 발생하면:
1. [문제 해결 가이드](./06-troubleshooting.md) 확인
2. Firebase Console에서 로그 확인
3. 브라우저 개발자 도구 콘솔 확인
