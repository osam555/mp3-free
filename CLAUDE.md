# 프로젝트 개발 노트

## YouTube 임베드 주의사항

**날짜**: 2025-11-11

### ⚠️ 중요: 항상 youtube-nocookie.com 사용

유튜브 임베드 시 반드시 `youtube-nocookie.com`을 사용해야 함.

#### ❌ 사용하지 말 것:
```html
<iframe src="https://www.youtube.com/embed/VIDEO_ID"></iframe>
```

#### ✅ 올바른 사용:
```html
<iframe
    src="https://www.youtube-nocookie.com/embed/VIDEO_ID?rel=0&modestbranding=1"
    title="비디오 제목"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin">
</iframe>
```

### 이유
- `youtube.com`: 쿠키/추적 정책으로 브라우저에서 차단될 수 있음
- `youtube-nocookie.com`: Privacy-enhanced 모드로 안정적 재생 보장
- CORS/CSP 정책 충돌 최소화
- 브라우저 개인정보 보호 설정과 호환성 우수

### 권장 파라미터
- `?rel=0`: 관련 영상 최소화
- `&modestbranding=1`: YouTube 로고 최소화

### 권장 속성
- `web-share`: 공유 기능 지원
- `referrerpolicy="strict-origin-when-cross-origin"`: 보안 강화
