# 서브도메인 설정 가이드

## 📋 개요

각 정책 섹션을 독립된 서브도메인으로 접근할 수 있도록 설정하는 방법입니다.

## 🎯 독립 페이지 목록

| 섹션 | 파일명 | 경로 | 제안 서브도메인 |
|------|--------|------|----------------|
| 국회포럼 | assembly.html | /assembly | assembly.mp3-free.org |
| 교육분야 | education.html | /education | education.mp3-free.org |
| 체육분야 | sports.html | /sports | sports.mp3-free.org |
| 공공분야 | public.html | /public | public.mp3-free.org |
| 국방분야 | defense.html | /defense | defense.mp3-free.org |
| 영어해방 | english.html | /english | english.mp3-free.org |

## 🔧 Vercel 서브도메인 설정 방법

### 1. Vercel 대시보드 접속
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. `mp3-free` 프로젝트 선택
3. Settings → Domains 메뉴로 이동

### 2. 서브도메인 추가

각 섹션별로 다음 단계를 반복:

1. **Add Domain** 버튼 클릭
2. 서브도메인 입력 (예: `assembly.mp3-free.org`)
3. **Add** 클릭
4. Redirect 설정에서 **Redirect to** 선택
5. Target Path: 해당 섹션 경로 입력 (예: `/assembly`)
6. **Save** 클릭

### 3. 커스텀 도메인 사용 시

자체 도메인(예: mp3-free.com)을 사용하는 경우:

1. DNS 설정에서 각 서브도메인에 대한 CNAME 레코드 추가:
   ```
   assembly    CNAME  cname.vercel-dns.com
   education   CNAME  cname.vercel-dns.com
   sports      CNAME  cname.vercel-dns.com
   public      CNAME  cname.vercel-dns.com
   defense     CNAME  cname.vercel-dns.com
   english     CNAME  cname.vercel-dns.com
   ```

2. Vercel에서 각 서브도메인 추가 및 검증

## 📍 URL 접근 방법

### 현재 사용 가능한 경로

- 메인 페이지: `https://mp3-free.org/`
- 전체 정책: `https://mp3-free.org/policy` 또는 `/policy.html`
- 국회포럼: `https://mp3-free.org/assembly`
- 교육분야: `https://mp3-free.org/education`
- 체육분야: `https://mp3-free.org/sports`
- 공공분야: `https://mp3-free.org/public`
- 국방분야: `https://mp3-free.org/defense`
- 영어해방: `https://mp3-free.org/english`

### 서브도메인 설정 후

각 섹션을 독립된 서브도메인으로 접근 가능:

- `https://assembly.mp3-free.org` - 국회포럼
- `https://education.mp3-free.org` - 교육분야
- `https://sports.mp3-free.org` - 체육분야
- `https://public.mp3-free.org` - 공공분야
- `https://defense.mp3-free.org` - 국방분야
- `https://english.mp3-free.org` - 영어해방

## 🎨 각 페이지 특징

각 독립 페이지는:
- ✅ 완전한 독립 HTML 파일
- ✅ 해당 섹션의 전체 내용 포함
- ✅ 갤러리 및 인터랙티브 기능 포함
- ✅ 전체 정책 페이지로 이동 버튼 포함
- ✅ SEO 최적화된 메타 태그 (섹션별 고유 title, description)

## 🚀 배포

변경사항은 자동으로 Vercel에 배포됩니다:
```bash
git add .
git commit -m "feat: 섹션별 독립 페이지 추가"
git push
```

## 📊 vercel.json 설정

`vercel.json` 파일에 각 경로에 대한 라우팅이 설정되어 있습니다:
- Routes: 각 경로를 해당 HTML 파일로 매핑
- Rewrites: URL 리라이팅 규칙
- Headers: 보안 헤더 설정

## 💡 팁

1. **짧은 URL**: 국회포럼은 `assembly`, 영어해방은 `english`로 간결하게 사용
2. **SEO**: 각 페이지는 고유한 title과 description을 가지고 있어 검색엔진 최적화에 유리
3. **공유**: 각 섹션을 독립적으로 공유 가능
4. **분석**: Vercel Analytics를 통해 각 섹션별 트래픽 분석 가능
5. **도메인**: mp3-free.org를 메인 도메인으로 사용 (Vercel에서 커스텀 도메인 설정 필요)
