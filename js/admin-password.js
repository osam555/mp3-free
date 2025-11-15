// 관리자 비밀번호 인증 스크립트
// 관리자 비밀번호 (실제 운영 시에는 환경 변수나 서버 측에서 관리 권장)
const ADMIN_PASSWORD = '9119';

// 세션 스토리지 키
const AUTH_KEY = 'admin_authenticated';

// 인증 상태 확인
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem(AUTH_KEY) === 'true';
    
    if (isAuthenticated) {
        // 인증된 경우 대시보드 표시
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        return true;
    } else {
        // 인증되지 않은 경우 비밀번호 입력 화면 표시
        showLoginScreen();
        return false;
    }
}

// 비밀번호 입력 화면 표시
function showLoginScreen(errorMessage = '') {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-dashboard').style.display = 'none';
    
    if (errorMessage) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
    } else {
        document.getElementById('login-error').style.display = 'none';
    }
    
    // 비밀번호 입력 필드에 포커스
    document.getElementById('admin-password').focus();
}

// 비밀번호 확인 폼 제출 처리
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const password = document.getElementById('admin-password').value.trim();
    const errorDiv = document.getElementById('login-error');
    
    if (password === ADMIN_PASSWORD) {
        // 비밀번호가 맞는 경우 세션 스토리지에 인증 상태 저장
        sessionStorage.setItem(AUTH_KEY, 'true');
        // 대시보드 표시
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        errorDiv.style.display = 'none';
        // 비밀번호 필드 초기화
        document.getElementById('admin-password').value = '';
    } else {
        // 비밀번호가 틀린 경우
        errorDiv.textContent = '비밀번호가 올바르지 않습니다.';
        errorDiv.style.display = 'block';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').focus();
    }
});

// 로그아웃
function logout() {
    // 세션 스토리지에서 인증 상태 제거
    sessionStorage.removeItem(AUTH_KEY);
    showLoginScreen();
    // 폼 초기화
    document.getElementById('login-form').reset();
}

// 페이지 로드 시 인증 확인
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// 페이지를 떠날 때 세션 유지 (브라우저 탭이 열려있는 동안은 인증 유지)
// 브라우저 탭을 닫으면 세션이 만료되어 다시 비밀번호 입력 필요

