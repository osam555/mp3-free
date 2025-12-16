// 방문자 추적 스크립트

// Firestore 컬렉션 참조
const visitorsRef = db.collection('page_visitors');
const buttonClicksRef = db.collection('button_clicks');

// 방문자 정보 수집 및 저장
async function trackPageVisit() {
    try {
        // 관리자 인증 확인 - 관리자는 추적 제외
        const isAdmin = sessionStorage.getItem('admin_authenticated') === 'true';
        if (isAdmin) {
            console.log('관리자 방문: 추적 제외');
            return;
        }

        // IP 주소 수집 (Cloud Function 호출) + 퍼블릭 IP API 폴백
        let visitorIP = 'unknown';
        try {
            const getVisitorIP = firebase.functions().httpsCallable('getVisitorIP');
            const ipResult = await getVisitorIP();
            visitorIP = ipResult.data.ip;
            console.log('방문자 IP:', visitorIP);
        } catch (ipError) {
            console.warn('IP 수집 실패:', ipError);
        }

        // Cloud Functions가 'internal' 또는 'unknown'이면 공개 IP API로 폴백
        if (!visitorIP || visitorIP === 'unknown' || visitorIP === 'internal') {
            try {
                visitorIP = await fetchPublicIPWithFallback();
                console.log('공개 IP 폴백 결과:', visitorIP);
            } catch (fallbackError) {
                console.warn('공개 IP 폴백 실패:', fallbackError);
            }
        }

        // 관리자 IP 확인 - IP 기반으로도 제외
        const adminIPsDoc = await db.collection('settings').doc('admin_ips').get();
        if (adminIPsDoc.exists) {
            const adminIPs = adminIPsDoc.data().ips || [];
            if (adminIPs.includes(visitorIP)) {
                console.log('관리자 IP 감지: 추적 제외', visitorIP);
                return;
            }
        }

        const trafficSource = detectTrafficSource(document.referrer);

        // 방문자 정보 수집
        const visitorData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            visitDate: new Date().toISOString(),
            page: window.location.pathname,
            url: window.location.href,
            referrer: document.referrer || 'direct',
            trafficSource,
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform,
            // IP 주소 추가
            ip: visitorIP,
            // 브라우저 정보 파싱
            browser: getBrowserInfo(),
            device: getDeviceType(),
            // 세션 ID (로컬스토리지 활용)
            sessionId: getOrCreateSessionId()
        };

        // Firestore에 저장
        await visitorsRef.add(visitorData);

        console.log('방문자 추적 완료 (IP:', visitorIP, ')');
    } catch (error) {
        console.error('방문자 추적 에러:', error);
    }
}

// 유입 경로 라벨링
function detectTrafficSource(rawReferrer) {
    const params = new URLSearchParams(window.location.search);
    const utm = (params.get('utm_source') || '').toLowerCase();
    const referrer = rawReferrer || '';
    const hostname = (() => {
        try {
            return referrer ? new URL(referrer).hostname.toLowerCase() : '';
        } catch (_) {
            return '';
        }
    })();

    const labelFromKeyword = (value) => {
        if (!value) return null;
        if (value.includes('kakao')) return 'KakaoTalk';
        if (value.includes('katalk')) return 'KakaoTalk';
        if (value.includes('facebook') || value.includes('fb')) return 'Facebook';
        if (value.includes('instagram') || value.includes('ig')) return 'Instagram';
        if (value.includes('naver')) return 'Naver';
        if (value.includes('google')) return 'Google';
        if (value.includes('youtube')) return 'YouTube';
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const utmLabel = labelFromKeyword(utm);
    if (utmLabel) return utmLabel;

    const refLabel = labelFromKeyword(hostname);
    if (refLabel) return refLabel;

    return referrer ? hostname || 'Other' : 'Direct';
}

// 공개 IP 조회 (폴백 체인) - 브라우저에서 직접 공개 IP API 호출
async function fetchPublicIPWithFallback() {
    // 단일 요청에 타임아웃 적용
    const withTimeout = (promise, ms = 3000) => {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('timeout')), ms);
            promise.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
        });
    };
    const fetchers = [
        async () => (await withTimeout(fetch('https://api.ipify.org?format=json'))).json().then(r => r.ip),
        async () => (await withTimeout(fetch('https://ipinfo.io/json'))).json().then(r => r.ip),
        async () => (await withTimeout(fetch('https://ifconfig.me/ip'))).text().then(t => t.trim())
    ];
    for (const fn of fetchers) {
        try {
            const ip = await fn();
            if (ip && typeof ip === 'string') return ip;
        } catch (_) {}
    }
    return 'unknown';
}

// 브라우저 정보 파싱
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';

    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
        browser = 'Chrome';
    } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
        browser = 'Safari';
    } else if (ua.indexOf('Firefox') > -1) {
        browser = 'Firefox';
    } else if (ua.indexOf('Edg') > -1) {
        browser = 'Edge';
    } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) {
        browser = 'Internet Explorer';
    }

    return browser;
}

// 디바이스 타입 감지
function getDeviceType() {
    const ua = navigator.userAgent;

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'Tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'Mobile';
    }
    return 'Desktop';
}

// 세션 ID 생성 또는 가져오기
function getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('visitor_session_id');

    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('visitor_session_id', sessionId);
    }

    return sessionId;
}

// Google Analytics 이벤트 강화
function trackCustomEvents() {
    // 페이지뷰 추적
    gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname
    });

    // 스크롤 깊이 추적
    let scrollDepth = 0;
    window.addEventListener('scroll', () => {
        const currentDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);

        if (currentDepth > scrollDepth && currentDepth % 25 === 0) {
            scrollDepth = currentDepth;
            gtag('event', 'scroll_depth', {
                scroll_percentage: scrollDepth
            });
        }
    });

    // 외부 링크 클릭 추적
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        link.addEventListener('click', (e) => {
            gtag('event', 'click', {
                event_category: 'external_link',
                event_label: e.target.href
            });
        });
    });

    // 얼리버드 섹션 진입 추적
    const earlybirdSection = document.getElementById('earlybird');
    if (earlybirdSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    gtag('event', 'section_view', {
                        event_category: 'engagement',
                        event_label: 'earlybird_section'
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.5 });

        observer.observe(earlybirdSection);
    }
}

// 버튼 클릭 추적 함수
async function trackButtonClick(buttonId) {
    try {
        console.log(`[버튼클릭] ${buttonId} 클릭 감지됨`);

        // Firebase 초기화 확인
        if (typeof db === 'undefined') {
            console.error('[버튼클릭] Firestore가 초기화되지 않았습니다!');
            return;
        }

        const clickData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            clickDate: new Date().toISOString(),
            buttonId: buttonId,
            buttonLabel: getButtonLabel(buttonId),
            page: window.location.pathname,
            url: window.location.href,
            sessionId: getOrCreateSessionId(),
            userAgent: navigator.userAgent,
            device: getDeviceType(),
            browser: getBrowserInfo()
        };

        console.log('[버튼클릭] 저장할 데이터:', clickData);

        const docRef = await buttonClicksRef.add(clickData);
        console.log(`✅ 버튼 클릭 추적 완료 (ID: ${buttonId}, DocID: ${docRef.id})`);
    } catch (error) {
        console.error('[버튼클릭] 추적 에러:', error);
        console.error('[버튼클릭] 에러 메시지:', error.message);
        console.error('[버튼클릭] 에러 코드:', error.code);
    }
}

// 버튼 라벨 반환 함수
function getButtonLabel(buttonId) {
    const labelMap = {
        'publication-event-btn': '출간기념회 신청',
        'autoplay-btn-parliament': '국회 정책제안',
        'autoplay-btn-education': '교육 정책제안',
        'autoplay-btn-sports': '체육 정책제안',
        'autoplay-btn-public': '공공 정책제안',
        'autoplay-btn-defense': '국방 정책제안',
        'autoplay-btn-english-liberation': '영어해방 자동재생'
    };
    return labelMap[buttonId] || buttonId;
}

// 버튼 클릭 리스너 등록
function setupButtonClickTracking() {
    console.log('[버튼추적] 버튼 클릭 리스너 설정 시작...');

    // 추적할 버튼 ID 목록
    const buttonIds = [
        'publication-event-btn',
        'autoplay-btn-parliament',
        'autoplay-btn-education',
        'autoplay-btn-sports',
        'autoplay-btn-public',
        'autoplay-btn-defense',
        'autoplay-btn-english-liberation'
    ];

    // 각 버튼에 클릭 리스너 등록
    buttonIds.forEach(buttonId => {
        const button = document.getElementById(buttonId);

        if (button) {
            console.log(`[버튼추적] ${buttonId} 버튼 찾음 ✓`);
            button.addEventListener('click', (e) => {
                console.log(`[버튼추적] ${buttonId} 버튼 클릭 감지!`);
                trackButtonClick(buttonId);
            });
            console.log(`[버튼추적] ${buttonId} 클릭 리스너 등록 완료 ✓`);
        } else {
            console.warn(`[버튼추적] ${buttonId} 버튼을 찾을 수 없습니다!`);
        }
    });
}

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
    console.log('[페이지로드] DOMContentLoaded 이벤트 발생');
    // Firebase 초기화 확인
    if (typeof firebase !== 'undefined' && typeof db !== 'undefined') {
        trackPageVisit();
        trackCustomEvents();
        setupButtonClickTracking();
    } else {
        console.warn('Firebase가 초기화되지 않았습니다.');
        // Firebase 초기화 대기
        setTimeout(() => {
            if (typeof db !== 'undefined') {
                console.log('[페이지로드] Firebase 초기화 완료, 버튼 추적 설정');
                setupButtonClickTracking();
            }
        }, 1000);
    }
});

// 추가 안전장치: window load 이벤트에서도 버튼 추적 설정
window.addEventListener('load', () => {
    console.log('[페이지로드] window.load 이벤트 발생');
    if (document.getElementById('publication-event-btn')) {
        console.log('[페이지로드] 버튼이 존재하고 있으므로 추적 설정 확인');
        setupButtonClickTracking();
    }
});
