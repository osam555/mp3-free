// 관리자 인증 스크립트
// 관리자 이메일 목록 (실제 운영 시에는 Firestore나 환경 변수로 관리 권장)
const ADMIN_EMAILS = [
    'admin@example.com',  // 여기에 실제 관리자 이메일 추가
    // 추가 관리자 이메일을 여기에 추가하세요
];

// 인증 상태 확인
function checkAuth() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // 로그인한 사용자의 이메일이 관리자 목록에 있는지 확인
                const isAdmin = ADMIN_EMAILS.includes(user.email);
                if (isAdmin) {
                    // 관리자인 경우 대시보드 표시
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('admin-dashboard').style.display = 'block';
                    document.getElementById('admin-email-display').textContent = user.email;
                    resolve(true);
                } else {
                    // 관리자가 아닌 경우 로그아웃
                    await firebase.auth().signOut();
                    showLoginScreen('관리자 권한이 없습니다.');
                    resolve(false);
                }
            } else {
                // 로그인하지 않은 경우 로그인 화면 표시
                showLoginScreen();
                resolve(false);
            }
        });
    });
}

// 로그인 화면 표시
function showLoginScreen(errorMessage = '') {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-dashboard').style.display = 'none';
    
    if (errorMessage) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
    }
}

// 로그인 폼 제출 처리
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        // Firebase Authentication으로 로그인
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // onAuthStateChanged가 자동으로 호출되어 관리자 확인 및 대시보드 표시
        errorDiv.style.display = 'none';
    } catch (error) {
        console.error('로그인 에러:', error);
        errorDiv.textContent = '로그인 실패: ' + getErrorMessage(error.code);
        errorDiv.style.display = 'block';
    }
});

// 에러 메시지 변환
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': '등록되지 않은 이메일입니다.',
        'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
        'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
        'auth/user-disabled': '비활성화된 계정입니다.',
        'auth/too-many-requests': '너무 많은 시도가 있었습니다. 나중에 다시 시도해주세요.',
        'auth/network-request-failed': '네트워크 오류가 발생했습니다.',
    };
    return errorMessages[errorCode] || '로그인 중 오류가 발생했습니다.';
}

// 로그아웃
async function logout() {
    try {
        await firebase.auth().signOut();
        showLoginScreen();
        // 폼 초기화
        document.getElementById('login-form').reset();
    } catch (error) {
        console.error('로그아웃 에러:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
    }
}

// 페이지 로드 시 인증 확인
window.addEventListener('DOMContentLoaded', async () => {
    if (typeof firebase === 'undefined') {
        alert('Firebase가 로드되지 않았습니다. firebase-config.js를 확인하세요.');
        return;
    }
    
    await checkAuth();
});

