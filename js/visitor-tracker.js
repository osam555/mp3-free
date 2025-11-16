// 방문자 추적 스크립트

// Firestore 컬렉션 참조
const visitorsRef = db.collection('page_visitors');

// 방문자 정보 수집 및 저장
async function trackPageVisit() {
    try {
        // 관리자 인증 확인 - 관리자는 추적 제외
        const isAdmin = sessionStorage.getItem('admin_authenticated') === 'true';
        if (isAdmin) {
            console.log('관리자 방문: 추적 제외');
            return;
        }

        // IP 주소 수집 (Cloud Function 호출)
        let visitorIP = 'unknown';
        try {
            const getVisitorIP = firebase.functions().httpsCallable('getVisitorIP');
            const ipResult = await getVisitorIP();
            visitorIP = ipResult.data.ip;
            console.log('방문자 IP:', visitorIP);
        } catch (ipError) {
            console.warn('IP 수집 실패:', ipError);
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

        // 방문자 정보 수집
        const visitorData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            visitDate: new Date().toISOString(),
            page: window.location.pathname,
            url: window.location.href,
            referrer: document.referrer || 'direct',
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

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
    // Firebase 초기화 확인
    if (typeof firebase !== 'undefined' && typeof db !== 'undefined') {
        trackPageVisit();
        trackCustomEvents();
    } else {
        console.warn('Firebase가 초기화되지 않았습니다.');
    }
});
