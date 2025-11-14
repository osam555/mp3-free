// 얼리버드 신청 폼 처리 스크립트

// 이름 가림 처리 함수 (마지막 글자만 표시)
function maskName(name) {
    if (!name || name.length === 0) return '***';
    if (name.length === 1) return name[0];
    return '*'.repeat(name.length - 1) + name[name.length - 1];
}

// 실시간 신청자 수 및 리스트 업데이트
function updateApplicantStats() {
    applicationsRef
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            const count = snapshot.size;

            // 라운드 결정 (1차: 0-100명, 2차: 101-200명)
            const currentRound = count < 100 ? 1 : 2;
            const roundCount = count < 100 ? count : count - 100;
            const progressPercentage = Math.min((roundCount / 100) * 100, 100);

            // 신청자 수 업데이트
            document.getElementById('applicant-count').textContent = `${roundCount}/100`;
            document.getElementById('progress-bar').style.width = `${progressPercentage}%`;

            // 라운드 표시 업데이트
            const roundDisplay = document.getElementById('round-display');
            if (roundDisplay) {
                if (currentRound === 1) {
                    roundDisplay.textContent = '1차 얼리버드';
                    roundDisplay.className = 'text-2xl font-bold text-blue-600';
                } else {
                    roundDisplay.textContent = '2차 얼리버드';
                    roundDisplay.className = 'text-2xl font-bold text-purple-600';
                }
            }

            // 최근 신청자 리스트 업데이트 (최근 20명)
            const recentApplicants = document.getElementById('recent-applicants');
            recentApplicants.innerHTML = '';

            const applicants = [];
            snapshot.forEach((doc) => {
                applicants.push(doc.data());
            });

            // 최근 20명만 표시
            const displayCount = Math.min(applicants.length, 20);
            for (let i = 0; i < displayCount; i++) {
                const applicant = applicants[i];
                const card = document.createElement('div');
                card.className = 'text-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg transform hover:scale-105 transition-transform';

                // 연령대 표시 (배열 또는 단일값 지원)
                const ageDisplay = Array.isArray(applicant.ageGroups)
                    ? applicant.ageGroups.join(', ')
                    : (applicant.ageGroup || '미입력');

                card.innerHTML = `
                    <div class="text-2xl mb-1">👤</div>
                    <div class="text-sm font-semibold text-gray-700">${maskName(applicant.name)}</div>
                    <div class="text-xs text-gray-500">${ageDisplay}</div>
                `;
                recentApplicants.appendChild(card);
            }

            // 신청자가 없는 경우
            if (applicants.length === 0) {
                recentApplicants.innerHTML = `
                    <div class="col-span-2 md:col-span-4 text-center p-6">
                        <div class="text-4xl mb-2">🎯</div>
                        <p class="text-gray-600">첫 번째 얼리버드가 되어보세요!</p>
                    </div>
                `;
            }
        }, (error) => {
            console.error('실시간 업데이트 에러:', error);
        });
}

// 중복 신청 확인
async function checkDuplicateEmail(email) {
    const snapshot = await applicationsRef.where('email', '==', email).get();
    return !snapshot.empty;
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

    // 영어 학습 목표 (복수 선택)
    const goalsCheckboxes = document.querySelectorAll('input[name="goals"]:checked');
    const goals = Array.from(goalsCheckboxes).map(cb => cb.value);

    // 연령대 (복수 선택)
    const ageCheckboxes = document.querySelectorAll('input[name="age"]:checked');
    const ageGroups = Array.from(ageCheckboxes).map(cb => cb.value);

    // 유효성 검사
    if (!name || !email || !phone || !receiptFile || goals.length === 0 || ageGroups.length === 0) {
        showMessage('모든 필수 항목을 입력해주세요.', 'error');
        return;
    }

    // 파일 크기 검사 (5MB)
    if (receiptFile.size > 5 * 1024 * 1024) {
        showMessage('영수증 파일 크기는 5MB 이하여야 합니다.', 'error');
        return;
    }

    // 파일 형식 검사
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(receiptFile.type)) {
        showMessage('JPG, PNG, PDF 파일만 업로드 가능합니다.', 'error');
        return;
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

        // 1. 영수증 이미지 업로드
        const timestamp = Date.now();
        const fileName = `${timestamp}_${receiptFile.name}`;
        const storageRef = storage.ref(`receipts/${fileName}`);

        const uploadTask = await storageRef.put(receiptFile);
        const receiptUrl = await uploadTask.ref.getDownloadURL();

        // 현재 라운드 확인
        const currentSnapshot = await applicationsRef.get();
        const currentCount = currentSnapshot.size;
        const currentRound = currentCount < 100 ? 1 : 2;

        // 2. Firestore에 신청 정보 저장
        const applicationData = {
            name,
            email,
            phone,
            goals,
            ageGroups,
            receiptUrl,
            receiptFileName: fileName,
            maskedName: maskName(name),
            round: currentRound,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        };

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
