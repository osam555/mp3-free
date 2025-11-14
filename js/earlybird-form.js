// 얼리버드 신청 폼 처리 스크립트

// 이름 가림 처리 함수 (마지막 글자만 표시)
function maskName(name) {
    if (!name || name.length === 0) return '***';
    if (name.length === 1) return name[0];
    return '*'.repeat(name.length - 1) + name[name.length - 1];
}

// 실시간 신청자 수 및 리스트 업데이트
function updateApplicantStats() {
    // 익명 사용자는 읽기 권한이 없으므로 기본 UI 표시
    document.getElementById('applicant-count').textContent = '-';
    const recentApplicants = document.getElementById('recent-applicants');
    recentApplicants.innerHTML = `
        <div class="col-span-2 md:col-span-4 text-center p-6">
            <div class="text-4xl mb-2">🎯</div>
            <p class="text-gray-600">첫 번째 얼리버드가 되어보세요!</p>
        </div>
    `;
}

// 중복 신청 확인 (서버 측에서 처리하도록 제거)
// 익명 사용자는 읽기 권한이 없으므로 클라이언트에서 중복 체크 불가
async function checkDuplicateEmail(email) {
    // 서버 측에서 중복 체크하도록 변경
    return false; // 항상 중복 아님으로 처리
}

// 폼 제출 처리
document.getElementById('earlybird-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const formMessage = document.getElementById('form-message');

    // 폼 데이터 수집
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const receiptFile = document.getElementById('receipt').files[0];
    const reviewFile = document.getElementById('review1').files[0];

    // 영어 학습 목표 (복수 선택)
    const goalsCheckboxes = document.querySelectorAll('input[name="goals"]:checked');
    const goals = Array.from(goalsCheckboxes).map(cb => cb.value);

    // 연령대 (복수 선택)
    const ageCheckboxes = document.querySelectorAll('input[name="age"]:checked');
    const ageGroups = Array.from(ageCheckboxes).map(cb => cb.value);

    // 유효성 검사 (영수증만 필수)
    if (!name || !email || !phone || !receiptFile || goals.length === 0 || ageGroups.length === 0) {
        showMessage('모든 필수 항목을 입력해주세요.', 'error');
        return;
    }

    // 파일 형식 검사
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

    // 영수증 파일 검사 (필수)
    if (receiptFile.size > 5 * 1024 * 1024) {
        showMessage('영수증 파일 크기는 5MB 이하여야 합니다.', 'error');
        return;
    }
    if (!allowedTypes.includes(receiptFile.type)) {
        showMessage('영수증은 JPG, PNG, PDF 파일만 업로드 가능합니다.', 'error');
        return;
    }

    // 후기 파일 검사 (선택사항)
    if (reviewFile) {
        if (reviewFile.size > 5 * 1024 * 1024) {
            showMessage('후기 파일 크기는 5MB 이하여야 합니다.', 'error');
            return;
        }
        if (!allowedTypes.includes(reviewFile.type)) {
            showMessage('후기는 JPG, PNG, PDF 파일만 업로드 가능합니다.', 'error');
            return;
        }
    }

    // 로딩 상태
    submitBtn.disabled = true;
    submitBtn.textContent = '업로드 중... ⏳';
    showMessage('신청서를 제출하고 있습니다...', 'loading');

    try {
        // 중복 신청 확인
        const isDuplicate = await checkDuplicateEmail(email);
        if (isDuplicate) {
            showMessage('이미 신청하신 이메일입니다.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '🎁 얼리버드 신청하기';
            return;
        }

        // 1. 영수증 및 후기 이미지 업로드
        const timestamp = Date.now();

        // 영수증 업로드 (필수)
        const receiptFileName = `${timestamp}_receipt_${receiptFile.name}`;
        const receiptStorageRef = storage.ref(`receipts/${receiptFileName}`);
        const receiptUploadTask = await receiptStorageRef.put(receiptFile);
        const receiptUrl = await receiptUploadTask.ref.getDownloadURL();

        // 후기 업로드 (선택사항)
        let reviewUrl = null;
        let reviewFileName = null;
        if (reviewFile) {
            reviewFileName = `${timestamp}_review_${reviewFile.name}`;
            const reviewStorageRef = storage.ref(`reviews/${reviewFileName}`);
            const reviewUploadTask = await reviewStorageRef.put(reviewFile);
            reviewUrl = await reviewUploadTask.ref.getDownloadURL();
        }

        // 2. Firestore에 신청 정보 저장 (라운드는 서버에서 자동 계산)
        const applicationData = {
            name,
            email,
            phone,
            goals,
            ageGroups,
            receiptUrl,
            receiptFileName,
            maskedName: maskName(name),
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        // 후기가 있는 경우에만 추가
        if (reviewUrl) {
            applicationData.reviewUrl = reviewUrl;
            applicationData.reviewFileName = reviewFileName;
        }

        await applicationsRef.add(applicationData);

        // 성공 메시지
        showMessage('🎉 얼리버드 신청이 완료되었습니다!<br>영수증 확인 후 속청 파일을 이메일로 보내드립니다.', 'success');

        // 폼 초기화
        document.getElementById('earlybird-form').reset();

        // 버튼 복구
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = '🎁 얼리버드 신청하기';
        }, 3000);

    } catch (error) {
        console.error('신청 에러:', error);
        showMessage('신청 중 오류가 발생했습니다. 다시 시도해주세요.<br>' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '🎁 얼리버드 신청하기';
    }
});

// 메시지 표시 함수
function showMessage(message, type) {
    const formMessage = document.getElementById('form-message');
    formMessage.classList.remove('hidden');
    formMessage.innerHTML = message;

    if (type === 'success') {
        formMessage.className = 'text-center p-4 rounded-lg bg-green-100 border-2 border-green-500 text-green-800 font-semibold';
    } else if (type === 'error') {
        formMessage.className = 'text-center p-4 rounded-lg bg-red-100 border-2 border-red-500 text-red-800 font-semibold';
    } else if (type === 'loading') {
        formMessage.className = 'text-center p-4 rounded-lg bg-blue-100 border-2 border-blue-500 text-blue-800 font-semibold';
    }

    // 성공/에러 메시지는 5초 후 자동 숨김
    if (type !== 'loading') {
        setTimeout(() => {
            formMessage.classList.add('hidden');
        }, 5000);
    }
}

// 페이지 로드 시 실시간 업데이트 시작
window.addEventListener('DOMContentLoaded', () => {
    // Firebase 초기화 확인
    if (typeof firebase === 'undefined') {
        console.error('Firebase가 로드되지 않았습니다.');
        document.getElementById('applicant-count').textContent = 'N/A';
        return;
    }

    updateApplicantStats();
});
