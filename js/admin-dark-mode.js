// 관리자 페이지 다크 모드 기능
// visitor-stats.html과 동일한 'theme' 키 사용으로 통일

const DARK_MODE_KEY = 'theme';

// 다크 모드 상태 확인 (시스템 테마도 고려)
function isDarkMode() {
    const userTheme = localStorage.getItem(DARK_MODE_KEY);
    if (userTheme === 'dark') return true;
    if (userTheme === 'light') return false;
    // 사용자 설정이 없으면 시스템 테마 확인
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
    }
    return false;
}

// 다크 모드 토글
function toggleDarkMode() {
    const isDark = document.documentElement.classList.contains('dark');
    const newMode = !isDark;
    
    localStorage.setItem(DARK_MODE_KEY, newMode ? 'dark' : 'light');
    applyDarkMode(newMode);
    updateDarkModeButton(newMode);
    
    // 차트가 있으면 다시 그리기
    if (typeof loadRankHistory === 'function') {
        setTimeout(() => {
            loadRankHistory();
        }, 100);
    }
    
    // 테마 변경 이벤트 전파 (차트 업데이트용)
    window.dispatchEvent(new CustomEvent('themechange', { detail: { dark: newMode } }));
}

// 다크 모드 적용
function applyDarkMode(enabled) {
    const html = document.documentElement;
    if (enabled) {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
}

// 다크 모드 버튼 아이콘 업데이트
function updateDarkModeButton(isDark) {
    const button = document.getElementById('dark-mode-toggle');
    if (button) {
        button.innerHTML = isDark ? '☀️ 라이트' : '🌙 다크';
    }
}

// 초기화
function initDarkMode() {
    const isDark = isDarkMode();
    applyDarkMode(isDark);
    updateDarkModeButton(isDark);
    
    // 시스템 테마 변경 감지
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener && mq.addEventListener('change', (e) => {
            const userTheme = localStorage.getItem(DARK_MODE_KEY);
            // 사용자가 명시적으로 설정하지 않은 경우에만 시스템 테마 반영
            if (!userTheme) {
                applyDarkMode(e.matches);
                updateDarkModeButton(e.matches);
                window.dispatchEvent(new CustomEvent('themechange', { detail: { dark: e.matches } }));
            }
        });
    }
}

// 페이지 로드 시 다크 모드 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
} else {
    initDarkMode();
}

