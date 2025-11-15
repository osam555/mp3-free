// 관리자 페이지 다크 모드 기능

const DARK_MODE_KEY = 'admin_dark_mode';

// 다크 모드 상태 확인
function isDarkMode() {
    return localStorage.getItem(DARK_MODE_KEY) === 'true';
}

// 다크 모드 토글
function toggleDarkMode() {
    const isDark = isDarkMode();
    const newMode = !isDark;
    
    localStorage.setItem(DARK_MODE_KEY, newMode.toString());
    applyDarkMode(newMode);
    updateDarkModeButton(newMode);
    
    // 차트가 있으면 다시 그리기
    if (typeof loadRankHistory === 'function') {
        setTimeout(() => {
            loadRankHistory();
        }, 100);
    }
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
        button.innerHTML = isDark ? '☀️ 라이트 모드' : '🌙 다크 모드';
    }
}

// 초기화
function initDarkMode() {
    const isDark = isDarkMode();
    applyDarkMode(isDark);
    updateDarkModeButton(isDark);
}

// 페이지 로드 시 다크 모드 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
} else {
    initDarkMode();
}

