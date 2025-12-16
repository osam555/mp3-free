// 수동 순위 입력 모달 표시
window.showManualRankModal = function() {
    document.getElementById('modal-title').textContent = '수동 순위 입력 (현재 시간으로 저장)';
    document.getElementById('rank-doc-id').value = '';
    
    const dateInput = document.getElementById('rank-date');
    dateInput.value = new Date().toISOString().slice(0, 16);
    dateInput.disabled = true; // 날짜 수정 불가
    dateInput.style.backgroundColor = '#e5e7eb'; // 회색 배경
    dateInput.style.cursor = 'not-allowed';
    
    document.getElementById('rank-value-input').value = '';
    document.getElementById('rank-category-input').value = '주간베스트 외국어';
    document.getElementById('rank-modal').style.display = 'flex';
    document.getElementById('rank-modal').classList.add('flex');
}

// 수동 순위 저장 (현재 시간으로 저장)
async function saveManualRank(event) {
    event.preventDefault();

    const rank = parseInt(document.getElementById('rank-value-input').value);
    const category = document.getElementById('rank-category-input').value || '주간베스트 외국어';

    if (!rank || rank < 1 || rank > 1000) {
        alert('올바른 순위를 입력해주세요 (1-1000)');
        return;
    }

    try {
        // ⚠️ 중요: 수동 입력은 항상 현재 시간(서버 시간)으로 저장
        // 과거 날짜로 저장하려면 "순위 추가" 버튼 사용
        
        // 현재 순위 업데이트
        await db.collection('kyobobook_rank').doc('current').set({
            rank: rank,
            category: category,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            checkedAt: new Date().toISOString(),
            productUrl: 'https://product.kyobobook.co.kr/detail/S000218549943',
            manualEntry: true // 수동 입력 표시
        }, {merge: true});

        // 히스토리에도 저장 (서버 시간 사용)
        await db.collection('kyobobook_rank_history').add({
            rank: rank,
            category: category,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            productUrl: 'https://product.kyobobook.co.kr/detail/S000218549943',
            manualEntry: true
        });

        console.log('✅ 수동 순위 저장 완료 (현재 시간으로 저장됨)');
        alert('순위가 성공적으로 저장되었습니다!');

        // UI 업데이트
        loadRankInfo();
        loadRankHistory();
        loadRankHistoryTable();

        // 모달 닫기
        closeRankModal();

    } catch (error) {
        console.error('수동 순위 저장 에러:', error);
        alert('순위 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

// 기존 saveRank 함수를 수동 입력용으로 수정
window.saveRank = function(event) {
    // 문서 ID가 없으면 수동 입력으로 처리
    if (!document.getElementById('rank-doc-id').value) {
        saveManualRank(event);
    } else {
        // 기존 히스토리 편집 기능 (기존 로직 유지)
        saveRankHistory(event);
    }
}

// 관리자 대시보드 스크립트

let allApplications = [];
let currentFilter = {
    status: 'all',
    age: 'all'
};

// 날짜 포맷팅 함수
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 통계 업데이트
function updateStats(applications) {
    const total = applications.length;
    const pending = applications.filter(app => app.status === 'pending').length;
    const approved = applications.filter(app => app.status === 'approved').length;
    const sent = applications.filter(app => app.status === 'sent').length;
    const round1 = applications.filter(app => app.round === 1).length;
    const round2 = applications.filter(app => app.round === 2).length;

    document.getElementById('total-count').textContent = total;
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('approved-count').textContent = approved;
    document.getElementById('sent-count').textContent = sent;
    document.getElementById('round1-count').textContent = round1;
    document.getElementById('round2-count').textContent = round2;
}

// 상태 변경
async function changeStatus(docId, newStatus) {
    if (!confirm(`상태를 "${newStatus}"로 변경하시겠습니까?`)) return;

    try {
        await applicationsRef.doc(docId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('상태가 변경되었습니다.');
    } catch (error) {
        console.error('상태 변경 에러:', error);
        console.error('에러 코드:', error.code);
        console.error('에러 메시지:', error.message);
        let errorMsg = '상태 변경 중 오류가 발생했습니다.';
        if (error.code === 'permission-denied') {
            errorMsg = '권한이 없습니다. Firestore 보안 규칙을 확인하세요.';
        } else if (error.message) {
            errorMsg = '상태 변경 중 오류가 발생했습니다: ' + error.message;
        }
        alert(errorMsg);
    }
}

// 이메일 복사
function copyEmail(email) {
    navigator.clipboard.writeText(email).then(() => {
        alert(`이메일이 복사되었습니다: ${email}`);
    }).catch(err => {
        console.error('복사 실패:', err);
        alert('이메일 복사에 실패했습니다.');
    });
}

// 이메일 수동 발송
async function sendEmail(docId, name, email) {
    if (!confirm(`${name}님(${email})에게 속청 동영상 링크를 이메일로 발송하시겠습니까?`)) return;

    try {
        // Firebase Functions의 sendManualEmail 호출
        const sendManualEmail = firebase.functions().httpsCallable('sendManualEmail');
        const result = await sendManualEmail({ applicationId: docId });

        alert(result.data.message);
    } catch (error) {
        console.error('이메일 발송 에러:', error);
        alert(`이메일 발송 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 영수증 및 후기 확인 후 자동 승인 및 이메일 발송
async function approveAndSend(docId, name, email) {
    if (!confirm(`${name}님의 신청을 승인하고 속청 동영상 링크를 이메일로 발송하시겠습니까?\n\n영수증과 후기를 확인하셨나요?`)) return;

    try {
        console.log('승인 시작:', { docId, name, email });
        
        // Firestore에서 status를 'approved'로 변경
        // 이렇게 하면 Firebase Function이 자동으로 이메일을 발송합니다
        await applicationsRef.doc(docId).update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('승인 완료, 이메일 자동 발송 대기 중...');
        alert(`✅ ${name}님의 신청이 승인되었습니다.\n이메일이 자동으로 발송됩니다.`);
    } catch (error) {
        console.error('승인 에러:', error);
        console.error('에러 코드:', error.code);
        console.error('에러 메시지:', error.message);
        let errorMsg = `승인 중 오류가 발생했습니다: ${error.message}`;
        if (error.code === 'permission-denied') {
            errorMsg = '권한이 없습니다. Firestore 보안 규칙을 확인하세요.';
        }
        alert(errorMsg);
    }
}

// 신청 삭제
async function deleteApplication(docId, name) {
    if (!confirm(`${name}님의 신청을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    try {
        console.log('삭제 시작:', { docId, name });
        await applicationsRef.doc(docId).delete();
        console.log('삭제 완료');
        alert('신청이 삭제되었습니다.');
    } catch (error) {
        console.error('삭제 에러:', error);
        console.error('에러 코드:', error.code);
        console.error('에러 메시지:', error.message);
        let errorMsg = '삭제 중 오류가 발생했습니다.';
        if (error.code === 'permission-denied') {
            errorMsg = '권한이 없습니다. Firestore 보안 규칙을 확인하세요.';
        } else if (error.message) {
            errorMsg = '삭제 중 오류가 발생했습니다: ' + error.message;
        }
        alert(errorMsg);
    }
}

// 테이블 렌더링
function renderTable(applications) {
    const tbody = document.getElementById('applications-table');

    if (applications.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    신청 내역이 없습니다.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = applications.map(app => {
        const statusClass = `status-${app.status}`;
        const statusText = {
            'pending': '대기 중',
            'approved': '승인 완료',
            'sent': '발송 완료'
        }[app.status] || app.status;

        const roundBadge = app.round === 2 ?
            '<span class="px-2 py-1 text-xs font-bold text-white bg-purple-600 rounded">2차</span>' :
            '<span class="px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded">1차</span>';

        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${formatDate(app.timestamp)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    ${roundBadge}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ${app.name}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <div class="flex items-center gap-2">
                        <span>${app.email}</span>
                        <button onclick="copyEmail('${app.email}')" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="이메일 복사">
                            📋
                        </button>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${app.phone}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${Array.isArray(app.ageGroups) ? app.ageGroups.join(', ') : (app.ageGroup || '미입력')}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    ${app.goals.join(', ')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <div class="flex flex-col gap-1">
                        <a href="${app.receiptUrl}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">
                            📄 영수증
                        </a>
                        ${app.reviewUrl ? `<a href="${app.reviewUrl}" target="_blank" class="text-green-600 dark:text-green-400 hover:underline">✍️ 후기</a>` : ''}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <select onchange="changeStatus('${app.id}', this.value)"
                            class="px-3 py-1 rounded font-semibold text-sm ${statusClass} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border dark:border-gray-600">
                        <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>대기 중</option>
                        <option value="approved" ${app.status === 'approved' ? 'selected' : ''}>승인 완료</option>
                        <option value="sent" ${app.status === 'sent' ? 'selected' : ''}>발송 완료</option>
                    </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <div class="flex flex-col gap-1">
                        ${app.status === 'pending' ? `
                            <button onclick="approveAndSend('${app.id}', '${app.name}', '${app.email}')"
                                    class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-semibold text-left"
                                    title="영수증과 후기 확인 후 승인 및 자동 발송">
                                ✅ 확인 및 발송
                            </button>
                        ` : ''}
                        <button onclick="sendEmail('${app.id}', '${app.name}', '${app.email}')"
                                class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-left"
                                title="속청 동영상 링크 이메일 재발송">
                            📧 ${app.status === 'pending' ? '수동' : '재'}발송
                        </button>
                        <button onclick="deleteApplication('${app.id}', '${app.name}')"
                                class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold text-left">
                            🗑️ 삭제
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 필터 적용
function applyFilters() {
    currentFilter.status = document.getElementById('filter-status')?.value || 'all';
    currentFilter.age = document.getElementById('filter-age')?.value || 'all';

    let filtered = [...allApplications];

    if (currentFilter.status !== 'all') {
        filtered = filtered.filter(app => app.status === currentFilter.status);
    }

    if (currentFilter.age !== 'all') {
        filtered = filtered.filter(app => {
            // ageGroups 배열 또는 ageGroup 단일 값 모두 처리
            const ageGroups = app.ageGroups || (app.ageGroup ? [app.ageGroup] : []);
            return ageGroups.includes(currentFilter.age);
        });
    }

    renderTable(filtered);
    // 통계는 전체 데이터 기준으로 표시
    updateStats(allApplications);
}

// CSV 내보내기
function exportToCSV() {
    if (allApplications.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }

    const headers = ['신청일시', '라운드', '이름', '이메일', '전화번호', '연령대', '학습목표', '상태', '영수증URL'];
    const rows = allApplications.map(app => [
        formatDate(app.timestamp),
        app.round === 2 ? '2차' : '1차',
        app.name,
        app.email,
        app.phone,
        Array.isArray(app.ageGroups) ? app.ageGroups.join('|') : (app.ageGroup || '미입력'),
        app.goals.join('|'),
        app.status,
        app.receiptUrl
    ]);

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
    csvContent += headers.join(',') + '\n';
    csvContent += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `earlybird_applications_${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 실시간 데이터 로드
function loadApplications() {
    console.log('데이터 로드 시작...');
    console.log('applicationsRef:', applicationsRef);
    console.log('db:', typeof db !== 'undefined' ? db : 'undefined');
    
    if (!applicationsRef) {
        console.error('applicationsRef가 정의되지 않았습니다.');
        const tbody = document.getElementById('applications-table');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="px-6 py-12 text-center text-red-600">
                        Firestore가 초기화되지 않았습니다. 페이지를 새로고침하세요.
                    </td>
                </tr>
            `;
        }
        return;
    }

    // 로딩 상태 표시
    const tbody = document.getElementById('applications-table');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="px-6 py-12 text-center text-gray-500">
                    데이터 로딩 중...
                </td>
            </tr>
        `;
    }

    // orderBy로 먼저 시도, 실패하면 orderBy 없이 시도
    const queryWithOrder = applicationsRef.orderBy('timestamp', 'desc');
    
    queryWithOrder.onSnapshot((snapshot) => {
        console.log('데이터 스냅샷 수신 (정렬됨):', snapshot.size, '개');
            allApplications = [];
        
            snapshot.forEach((doc) => {
            const data = doc.data();
                allApplications.push({
                    id: doc.id,
                ...data
                });
            });

        console.log('전체 신청자 수:', allApplications.length);
            applyFilters();
        }, (error) => {
        console.warn('orderBy 쿼리 실패, orderBy 없이 재시도:', error.code);
        
        // orderBy 없이 재시도
        applicationsRef.onSnapshot((snapshot) => {
            console.log('데이터 스냅샷 수신 (정렬 안됨):', snapshot.size, '개');
            allApplications = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                allApplications.push({
                    id: doc.id,
                    ...data
                });
            });

            // timestamp 기준으로 정렬 (클라이언트 측에서)
            allApplications.sort((a, b) => {
                const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return bTime - aTime; // 내림차순
            });

            console.log('전체 신청자 수:', allApplications.length);
            applyFilters();
        }, (fallbackError) => {
            console.error('데이터 로드 에러 (fallback도 실패):', fallbackError);
            console.error('에러 코드:', fallbackError.code);
            console.error('에러 메시지:', fallbackError.message);
            console.error('전체 에러 객체:', fallbackError);
            
            let errorMessage = '데이터 로드 중 오류가 발생했습니다: ' + fallbackError.message;
            if (fallbackError.code === 'permission-denied') {
                errorMessage = '권한이 없습니다. Firestore 보안 규칙을 확인하세요.<br>에러 코드: ' + fallbackError.code;
            } else if (fallbackError.code === 'failed-precondition') {
                errorMessage = '인덱스가 필요합니다. Firebase Console에서 인덱스를 생성하세요.<br>에러 코드: ' + fallbackError.code + '<br>에러 메시지: ' + fallbackError.message;
            } else if (fallbackError.code === 'unavailable') {
                errorMessage = 'Firestore 서비스를 사용할 수 없습니다. 네트워크 연결을 확인하세요.';
            }
            
            if (tbody) {
                tbody.innerHTML = `
                <tr>
                        <td colspan="10" class="px-6 py-12 text-center text-red-600">
                            ${errorMessage}
                    </td>
                </tr>
            `;
            }
        });
        });
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === 'undefined') {
        alert('Firebase가 로드되지 않았습니다. firebase-config.js를 확인하세요.');
        return;
    }

    // 비밀번호 인증이 완료된 경우에만 데이터 로드
    const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
    if (isAuthenticated) {
        // Firebase 초기화 확인 후 데이터 로드
        if (typeof db !== 'undefined' && typeof applicationsRef !== 'undefined') {
    loadApplications();
        } else {
            console.error('Firestore가 초기화되지 않았습니다.');
            // 잠시 후 재시도
            setTimeout(() => {
                if (typeof db !== 'undefined' && typeof applicationsRef !== 'undefined') {
    loadApplications();
                }
            }, 500);
        }
    }
    // 인증되지 않은 경우는 admin-password.js에서 처리
    
    // 순위 정보 로드
    loadRankInfo();

    // 출간기념회 클릭 통계 로드
    loadPublicationEventStats();

    // 정책제안 주제별 클릭 통계 로드
    loadPolicyTopicsStats();
});

// 순위 차트 변수
let rankChart = null;

// 교보문고 순위 정보 로드
async function loadRankInfo() {
    try {
        // Firestore 초기화 확인
        if (typeof db === 'undefined') {
            console.warn('Firestore가 아직 초기화되지 않았습니다.');
            setTimeout(() => loadRankInfo(), 500);
            return;
        }
        
        const rankDoc = await db.collection('kyobobook_rank').doc('current').get();
        
        if (rankDoc.exists) {
            const data = rankDoc.data();
            const rank = data.rank;
            const category = data.category || '주간베스트 외국어';
            const lastUpdated = data.lastUpdated ? data.lastUpdated.toDate() : null;
            
            if (document.getElementById('rank-value')) {
                document.getElementById('rank-value').textContent = rank ? `${rank}위` : '-';
            }
            if (document.getElementById('rank-category')) {
                document.getElementById('rank-category').textContent = category;
            }
            
            if (lastUpdated && document.getElementById('rank-last-updated')) {
                const dateStr = lastUpdated.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                document.getElementById('rank-last-updated').textContent = `마지막 확인: ${dateStr}`;
            }
        } else {
            if (document.getElementById('rank-value')) {
                document.getElementById('rank-value').textContent = '-';
            }
            if (document.getElementById('rank-category')) {
                document.getElementById('rank-category').textContent = '';
            }
            if (document.getElementById('rank-last-updated')) {
                document.getElementById('rank-last-updated').textContent = '아직 확인되지 않음';
            }
        }
        
        // 순위 히스토리도 함께 로드
        await loadRankHistory();
        await loadRankHistoryTable();
    } catch (error) {
        console.error('순위 정보 로드 에러:', error);
        if (document.getElementById('rank-value')) {
            document.getElementById('rank-value').textContent = '오류';
        }
        // 에러 메시지 표시
        if (document.getElementById('rank-last-updated')) {
            document.getElementById('rank-last-updated').textContent = `오류: ${error.message}`;
        }
    }
}

// 출간기념회 클릭 통계 로드
window.loadPublicationEventStats = async function() {
    const btn = document.getElementById('refresh-pub-stats-btn');
    const originalText = btn ? btn.innerHTML : '';

    try {
        // 로딩 상태 표시
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ 새로고침 중...';
        }

        // Firestore 초기화 확인
        if (typeof db === 'undefined') {
            console.warn('Firestore가 아직 초기화되지 않았습니다.');
            setTimeout(() => window.loadPublicationEventStats(), 500);
            return;
        }

        // UI 엘리먼트 확인
        const clicksElement = document.getElementById('publication-event-clicks');
        const lastClickElement = document.getElementById('publication-event-last-click');

        if (!clicksElement || !lastClickElement) {
            console.warn('UI 엘리먼트를 찾을 수 없습니다.');
            return;
        }

        console.log('출간기념회 클릭 통계 로드 시작...');
        const buttonClicksRef = db.collection('button_clicks');

        // 출간기념회 버튼 클릭 수 조회
        const snapshot = await buttonClicksRef
            .where('buttonId', '==', 'publication-event-btn')
            .get();

        console.log(`Firestore에서 ${snapshot.size}개의 클릭 기록 조회됨`);

        const totalClicks = snapshot.size;

        // 마지막 클릭 시간 찾기
        let lastClickTime = '-';
        if (totalClicks > 0) {
            let latestClick = null;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!latestClick || (data.timestamp && data.timestamp > (latestClick.timestamp || 0))) {
                    latestClick = data;
                }
            });

            if (latestClick && latestClick.clickDate) {
                const date = new Date(latestClick.clickDate);
                lastClickTime = formatDate(date);
            }
        }

        // UI 업데이트
        clicksElement.textContent = totalClicks;
        lastClickElement.textContent =
            lastClickTime === '-' ? '마지막 클릭: -' : `마지막 클릭: ${lastClickTime}`;

        console.log(`✅ 출간기념회 클릭 통계 로드 완료 (총 ${totalClicks}회)`);

        // 완료 상태 표시
        if (btn) {
            btn.innerHTML = '✅ 완료!';
            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = originalText;
                }
            }, 2000);
        }
    } catch (error) {
        console.error('출간기념회 클릭 통계 로드 에러:', error);
        console.error('에러 메시지:', error.message);
        console.error('에러 코드:', error.code);

        const clicksElement = document.getElementById('publication-event-clicks');
        const lastClickElement = document.getElementById('publication-event-last-click');

        if (clicksElement) clicksElement.textContent = '-';
        if (lastClickElement) lastClickElement.textContent = '마지막 클릭: -';

        // 에러 메시지 표시
        let errorMsg = '통계 로드 실패';
        if (error.code === 'permission-denied') {
            errorMsg = '권한 오류: Firestore 보안 규칙 확인 필요';
            console.warn('Firestore 보안 규칙 오류: button_clicks 컬렉션 읽기 권한 확인 필요');
        } else if (error.code === 'failed-precondition') {
            errorMsg = '인덱스 오류: Firebase Console에서 인덱스 생성 필요';
        }

        if (btn) {
            btn.innerHTML = `❌ ${errorMsg}`;
            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = originalText;
                }
            }, 3000);
        }

        // 개발자 콘솔에 상세 정보 표시
        console.warn(`⚠️ 출간기념회 통계 로드 실패: ${errorMsg}`);
    } finally {
        // 최종적으로 버튼 상태 복구
        if (btn && btn.disabled) {
            btn.disabled = false;
        }
    }
};

// 정책제안 5개 주제별 클릭 통계 로드
window.loadPolicyTopicsStats = async function() {
    try {
        // Firestore 초기화 확인
        if (typeof db === 'undefined') {
            console.warn('Firestore가 아직 초기화되지 않았습니다.');
            setTimeout(() => window.loadPolicyTopicsStats(), 500);
            return;
        }

        console.log('정책제안 주제별 클릭 통계 로드 시작...');
        const buttonClicksRef = db.collection('button_clicks');

        // 5개 주제 버튼 ID 목록
        const topics = [
            { id: 'autoplay-btn-parliament', elementId: 'parliament-clicks', label: '국회' },
            { id: 'autoplay-btn-education', elementId: 'education-clicks', label: '교육' },
            { id: 'autoplay-btn-sports', elementId: 'sports-clicks', label: '체육' },
            { id: 'autoplay-btn-public', elementId: 'public-clicks', label: '공공' },
            { id: 'autoplay-btn-defense', elementId: 'defense-clicks', label: '국방' }
        ];

        // 각 주제별 클릭 수 조회
        for (const topic of topics) {
            try {
                const snapshot = await buttonClicksRef
                    .where('buttonId', '==', topic.id)
                    .get();

                const totalClicks = snapshot.size;
                const clicksElement = document.getElementById(topic.elementId);

                if (clicksElement) {
                    clicksElement.textContent = totalClicks;
                }

                console.log(`✅ ${topic.label} 정책제안 클릭: ${totalClicks}회`);
            } catch (error) {
                console.error(`${topic.label} 통계 로드 에러:`, error);
                const clicksElement = document.getElementById(topic.elementId);
                if (clicksElement) {
                    clicksElement.textContent = '-';
                }
            }
        }

        console.log('✅ 정책제안 주제별 통계 로드 완료');
    } catch (error) {
        console.error('정책제안 통계 로드 에러:', error);
    }
};

// 순위 히스토리 로드 및 그래프 표시
async function loadRankHistory() {
    try {
        // Firestore 초기화 확인
        if (typeof db === 'undefined') {
            console.warn('Firestore가 아직 초기화되지 않았습니다.');
            return;
        }
        
        const period = document.getElementById('rank-period')?.value || '30';
        
        // orderBy와 where를 함께 사용할 때 인덱스가 필요하므로, 
        // 먼저 where로 필터링한 후 클라이언트에서 정렬하는 방식으로 변경
        let snapshot;
        
        if (period !== 'all') {
            const days = parseInt(period, 10);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            try {
                // 인덱스가 있으면 orderBy 사용
                snapshot = await db.collection('kyobobook_rank_history')
                    .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(cutoffDate))
                    .orderBy('timestamp', 'desc')
                    .get();
            } catch (error) {
                // 인덱스가 없으면 where만 사용하고 클라이언트에서 정렬
                console.warn('인덱스가 없어 클라이언트에서 정렬합니다:', error);
                snapshot = await db.collection('kyobobook_rank_history')
                    .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(cutoffDate))
                    .get();
            }
        } else {
            try {
                snapshot = await db.collection('kyobobook_rank_history')
                    .orderBy('timestamp', 'desc')
                    .get();
            } catch (error) {
                // 인덱스가 없으면 전체 가져와서 클라이언트에서 정렬
                console.warn('인덱스가 없어 클라이언트에서 정렬합니다:', error);
                snapshot = await db.collection('kyobobook_rank_history')
                    .get();
            }
        }
        
        if (snapshot.empty) {
            console.log('순위 히스토리 데이터가 없습니다.');
            updateRankStats([]);
            updateRankChart([], []);
            return;
        }
        
        // 데이터 정렬 (시간순)
        const historyData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.rank && data.timestamp) {
                historyData.push({
                    rank: data.rank,
                    timestamp: data.timestamp.toDate(),
                    date: data.timestamp.toDate()
                });
            }
        });
        
        // 시간순 정렬 (오래된 것부터) - 클라이언트에서 정렬
        historyData.sort((a, b) => a.timestamp - b.timestamp);
        
        // 통계 업데이트 (전체 데이터 사용)
        updateRankStats(historyData);
        
        // 그래프용 데이터: 날짜별로 하루 1개만 표시 (가장 최신 데이터)
        const dailyData = {};
        historyData.forEach(item => {
            const dateKey = item.timestamp.toLocaleDateString('ko-KR'); // "2024. 11. 17." 형식
            // 같은 날짜에 이미 데이터가 있으면, 더 최신 것으로 덮어씀
            if (!dailyData[dateKey] || item.timestamp > dailyData[dateKey].timestamp) {
                dailyData[dateKey] = item;
            }
        });
        
        // dailyData를 다시 배열로 변환하고 시간순 정렬
        const dailyDataArray = Object.values(dailyData).sort((a, b) => a.timestamp - b.timestamp);
        
        console.log(`📊 전체 데이터: ${historyData.length}개, 그래프 표시: ${dailyDataArray.length}개 (하루 1개)`);
        
        // 그래프 데이터 준비
        const labels = dailyDataArray.map(item => {
            return item.timestamp.toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric'
            }).replace('.', '월 ').replace('.', '일');
        });
        const ranks = dailyDataArray.map(item => item.rank);
        
        // 그래프 업데이트
        updateRankChart(labels, ranks);
        
    } catch (error) {
        console.error('순위 히스토리 로드 에러:', error);
    }
}

// 순위 통계 업데이트
function updateRankStats(historyData) {
    if (historyData.length === 0) {
        document.getElementById('best-rank').textContent = '-';
        document.getElementById('one-day-ago-rank').textContent = '-';
        document.getElementById('two-days-ago-rank').textContent = '-';
        document.getElementById('rank-change-value').textContent = '-';
        document.getElementById('rank-change-icon').textContent = '';
        return;
    }
    
    const ranks = historyData.map(item => item.rank).filter(r => r !== null && r !== undefined);
    
    if (ranks.length === 0) {
        return;
    }
    
    // 최고 순위 (숫자가 작을수록 좋음)
    const bestRank = Math.min(...ranks);
    document.getElementById('best-rank').textContent = `${bestRank}위`;
    
    const now = new Date();
    const latestData = historyData[historyData.length - 1];
    const todayRank = latestData?.rank ?? null;
    
    const findRankByDaysAgo = (daysAgo, fallbackRank) => {
        const start = new Date(now);
        start.setDate(start.getDate() - daysAgo);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        
        const dayData = historyData
            .filter(item => {
                const itemTime = item.timestamp.getTime();
                return itemTime >= start.getTime() && itemTime <= end.getTime();
            })
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        if (dayData.length > 0) {
            console.log(`✅ ${daysAgo}일 전 순위 찾음: ${dayData[0].timestamp.toLocaleString('ko-KR')} ${dayData[0].rank}위`);
            return dayData[0].rank;
        }
        
        console.log(`⚠️ ${daysAgo}일 전 데이터 없음, 대체값 사용`);
        return fallbackRank ?? null;
    };
    
    const oneDayAgoRank = findRankByDaysAgo(1, todayRank);
    const twoDaysAgoRank = findRankByDaysAgo(2, todayRank ?? oneDayAgoRank);
    
    document.getElementById('one-day-ago-rank').textContent = oneDayAgoRank ? `${oneDayAgoRank}위` : '-';
    document.getElementById('two-days-ago-rank').textContent = twoDaysAgoRank ? `${twoDaysAgoRank}위` : '-';
    
    // 순위 변화 (첫 번째와 마지막 비교)
    if (ranks.length >= 2) {
        const firstRank = ranks[0];
        const lastRank = ranks[ranks.length - 1];
        const change = firstRank - lastRank; // 양수면 상승, 음수면 하락
        
        const changeElement = document.getElementById('rank-change-value');
        const iconElement = document.getElementById('rank-change-icon');
        
        if (change > 0) {
            // 순위 상승 (숫자가 작아짐 = 좋아짐)
            changeElement.textContent = `${Math.abs(change)}위 상승`;
            changeElement.className = 'text-green-600 dark:text-green-400';
            iconElement.textContent = '📈';
        } else if (change < 0) {
            // 순위 하락 (숫자가 커짐 = 나빠짐)
            changeElement.textContent = `${Math.abs(change)}위 하락`;
            changeElement.className = 'text-red-600 dark:text-red-400';
            iconElement.textContent = '📉';
        } else {
            // 변화 없음
            changeElement.textContent = '변화 없음';
            changeElement.className = 'text-gray-600 dark:text-gray-400';
            iconElement.textContent = '➡️';
        }
    } else {
        document.getElementById('rank-change-value').textContent = '-';
        document.getElementById('rank-change-icon').textContent = '';
    }
}

// 순위 차트 업데이트
function updateRankChart(labels, ranks) {
    const ctx = document.getElementById('rankChart');
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#ffffff' : '#111827'; // 다크모드: 흰색, 라이트모드: gray-900
    const gridColor = isDark ? '#6b7280' : '#d1d5db'; // 다크모드: gray-500 (더 밝게), 라이트모드: gray-300
    
    if (rankChart) {
        rankChart.destroy();
    }
    
    rankChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '순위',
                data: ranks,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 10,
                    right: 10,
                    top: 10,
                    bottom: 10
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: textColor,
                        font: {
                            size: 14,
                            family: "'Noto Sans KR', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `순위: ${context.parsed.y}위`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    reverse: true, // 순위는 작을수록 좋으므로 Y축 반전
                    title: {
                        display: true,
                        text: '순위 (위)',
                        color: textColor,
                        padding: {top: 0, bottom: 15},
                        font: {
                            size: 18,
                            weight: '900', // 더 굵게
                            family: "'Noto Sans KR', sans-serif"
                        }
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 14,
                            weight: '600', // 약간 굵게
                            family: "'Noto Sans KR', sans-serif"
                        },
                        padding: 10,
                        callback: function(value) {
                            return value + '위';
                        }
                    },
                    grid: {
                        color: gridColor,
                        drawBorder: true,
                        lineWidth: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '날짜',
                        color: textColor,
                        padding: {top: 15, bottom: 0},
                        font: {
                            size: 18,
                            weight: '900', // 더 굵게
                            family: "'Noto Sans KR', sans-serif"
                        }
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 14,
                            weight: '600', // 약간 굵게
                            family: "'Noto Sans KR', sans-serif"
                        },
                        padding: 10,
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: gridColor,
                        drawBorder: true,
                        lineWidth: 1
                    }
                }
            }
        }
    });
}

// 순위 히스토리 테이블 로드
let allRankHistory = [];

async function loadRankHistoryTable() {
    try {
        // Firestore 초기화 확인
        if (typeof db === 'undefined') {
            console.warn('Firestore가 아직 초기화되지 않았습니다.');
            return;
        }
        
        let snapshot;
        try {
            snapshot = await db.collection('kyobobook_rank_history')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();
        } catch (error) {
            // 인덱스가 없으면 전체 가져와서 클라이언트에서 정렬
            console.warn('인덱스가 없어 클라이언트에서 정렬합니다:', error);
            snapshot = await db.collection('kyobobook_rank_history')
                .limit(100)
                .get();
        }
        
        allRankHistory = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.rank && data.timestamp) {
                allRankHistory.push({
                    id: doc.id,
                    rank: data.rank,
                    category: data.category || '주간베스트 외국어',
                    timestamp: data.timestamp.toDate(),
                });
            }
        });
        
        // 클라이언트에서 정렬 (최신순)
        allRankHistory.sort((a, b) => b.timestamp - a.timestamp);
        
        renderRankHistoryTable();
    } catch (error) {
        console.error('순위 히스토리 테이블 로드 에러:', error);
        document.getElementById('rank-history-table').innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-red-500 dark:text-red-400">
                    데이터 로드 중 오류가 발생했습니다.
                </td>
            </tr>
        `;
    }
}

// 순위 히스토리 테이블 렌더링
function renderRankHistoryTable() {
    const tbody = document.getElementById('rank-history-table');
    
    if (allRankHistory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    순위 히스토리가 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    // 이전 순위와 비교하여 변화 계산
    tbody.innerHTML = allRankHistory.map((item, index) => {
        const prevItem = index < allRankHistory.length - 1 ? allRankHistory[index + 1] : null;
        let changeText = '-';
        let changeClass = 'text-gray-500 dark:text-gray-400';
        
        if (prevItem) {
            const change = prevItem.rank - item.rank; // 양수면 상승, 음수면 하락
            if (change > 0) {
                changeText = `+${change}위 상승`;
                changeClass = 'text-green-600 dark:text-green-400';
            } else if (change < 0) {
                changeText = `${Math.abs(change)}위 하락`;
                changeClass = 'text-red-600 dark:text-red-400';
            } else {
                changeText = '변화 없음';
            }
        }
        
        const dateStr = item.timestamp.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${dateStr}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ${item.rank}위
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${item.category}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${changeClass}">
                    ${changeText}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <div class="flex gap-2">
                        <button onclick="editRank('${item.id}')" 
                                class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold">
                            ✏️ 수정
                        </button>
                        <button onclick="deleteRank('${item.id}', ${item.rank})" 
                                class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold">
                            🗑️ 삭제
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 순위 추가 모달 표시 (과거 날짜 입력 가능)
window.showAddRankModal = function() {
    try {
        console.log('📝 순위 추가 모달 열기');
        
        const modal = document.getElementById('rank-modal');
        const modalTitle = document.getElementById('modal-title');
        const rankDocId = document.getElementById('rank-doc-id');
        const rankForm = document.getElementById('rank-form');
        const rankDate = document.getElementById('rank-date');
        const rankCategoryInput = document.getElementById('rank-category-input');
        
        if (!modal || !modalTitle || !rankDocId || !rankForm || !rankDate || !rankCategoryInput) {
            console.error('❌ 모달 요소를 찾을 수 없습니다.');
            return;
        }
        
        modalTitle.textContent = '순위 추가 (히스토리 전용, 과거 날짜 가능)';
        rankDocId.value = '';
        rankForm.reset();
        
        // 날짜 입력 활성화
        rankDate.disabled = false;
        rankDate.style.backgroundColor = '';
        rankDate.style.cursor = '';
        
        // 현재 날짜/시간으로 기본값 설정
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        rankDate.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        rankCategoryInput.value = '주간베스트 외국어';
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        console.log('✅ 모달 열림');
    } catch (error) {
        console.error('❌ 모달 열기 에러:', error);
        alert('모달을 열 수 없습니다: ' + error.message);
    }
}

// 순위 수정 모달 표시
window.editRank = async function(docId) {
    try {
        const doc = await db.collection('kyobobook_rank_history').doc(docId).get();
        if (!doc.exists) {
            alert('순위 데이터를 찾을 수 없습니다.');
            return;
        }
        
        const data = doc.data();
        document.getElementById('modal-title').textContent = '순위 수정';
        document.getElementById('rank-doc-id').value = docId;
        
        const timestamp = data.timestamp.toDate();
        const year = timestamp.getFullYear();
        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(timestamp.getDate()).padStart(2, '0');
        const hours = String(timestamp.getHours()).padStart(2, '0');
        const minutes = String(timestamp.getMinutes()).padStart(2, '0');
        
        document.getElementById('rank-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        document.getElementById('rank-value-input').value = data.rank;
        document.getElementById('rank-category-input').value = data.category || '주간베스트 외국어';
        
        document.getElementById('rank-modal').style.display = 'flex';
    } catch (error) {
        console.error('순위 수정 모달 로드 에러:', error);
        alert('순위 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// 모달 닫기
window.closeRankModal = function() {
    const modal = document.getElementById('rank-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        console.log('✅ 모달 닫힘');
    }
}

// 순위 저장
async function saveRankHistory(event) {
    event.preventDefault();

    const docId = document.getElementById('rank-doc-id').value;
    const dateValue = document.getElementById('rank-date').value;
    const rank = parseInt(document.getElementById('rank-value-input').value, 10);
    const category = document.getElementById('rank-category-input').value.trim();
    
    if (!rank || rank < 1) {
        alert('올바른 순위를 입력하세요.');
        return;
    }
    
    try {
        const timestamp = new Date(dateValue);
        
        const rankData = {
            rank: rank,
            category: category,
            timestamp: firebase.firestore.Timestamp.fromDate(timestamp),
            productUrl: 'https://product.kyobobook.co.kr/detail/S000218549943',
        };
        
        if (docId) {
            // 수정
            await db.collection('kyobobook_rank_history').doc(docId).update(rankData);
            alert('순위가 수정되었습니다.');
        } else {
            // 추가 (히스토리에만 추가, current는 업데이트하지 않음)
            await db.collection('kyobobook_rank_history').add(rankData);
            alert('순위가 히스토리에 추가되었습니다.\n💡 현재 순위를 업데이트하려면 "수동 입력" 버튼을 사용하세요.');
        }
        
        closeRankModal();
        await loadRankHistoryTable();
        await loadRankHistory(); // 그래프도 업데이트
    } catch (error) {
        console.error('순위 저장 에러:', error);
        alert('순위 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

// 순위 삭제
window.deleteRank = async function(docId, rank) {
    if (!confirm(`${rank}위 데이터를 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        await db.collection('kyobobook_rank_history').doc(docId).delete();
        alert('순위가 삭제되었습니다.');
        await loadRankHistoryTable();
        await loadRankHistory(); // 그래프도 업데이트
    } catch (error) {
        console.error('순위 삭제 에러:', error);
        alert('순위 삭제 중 오류가 발생했습니다: ' + error.message);
    }
}

// 순위 히스토리 CSV 내보내기
window.exportRankHistory = function() {
    if (allRankHistory.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }
    
    // CSV 헤더
    const headers = ['날짜', '순위', '카테고리', '변화'];
    const rows = [headers.join(',')];
    
    // 데이터 행
    allRankHistory.forEach((item, index) => {
        const prevItem = index < allRankHistory.length - 1 ? allRankHistory[index + 1] : null;
        let change = '-';
        
        if (prevItem) {
            const changeValue = prevItem.rank - item.rank;
            if (changeValue > 0) {
                change = `+${changeValue}위 상승`;
            } else if (changeValue < 0) {
                change = `${Math.abs(changeValue)}위 하락`;
            } else {
                change = '변화 없음';
            }
        }
        
        const dateStr = item.timestamp.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        rows.push([
            dateStr,
            item.rank,
            item.category,
            change
        ].join(','));
    });
    
    // CSV 파일 생성 및 다운로드
    const csvContent = rows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `교보문고_순위_히스토리_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 교보문고 순위 체크
window.checkKyobobookRank = async function() {
    const btn = document.getElementById('check-rank-btn');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '⏳ 새로고침 중...';
        
        // Firebase Functions 대신 Firestore에서 직접 데이터 로드
        // (Chrome 확장에서 수집한 데이터)
        await loadRankInfo();
        await loadRankHistory();
        await loadRankHistoryTable();
        
        // 최근 업데이트 시간 확인
        const rankDoc = await db.collection('kyobobook_rank').doc('current').get();
        if (rankDoc.exists) {
            const data = rankDoc.data();
            const lastUpdated = data.lastUpdated?.toDate();
            const now = new Date();
            const diffMinutes = Math.floor((now - lastUpdated) / 1000 / 60);
            
            let message = '';
            if (data.extractedBy === 'chrome-extension') {
                message = `✅ Chrome 확장에서 수집한 최신 데이터입니다.\n\n`;
                message += `순위: ${data.rank}위\n`;
                message += `카테고리: ${data.category}\n`;
                message += `업데이트: ${diffMinutes}분 전`;
            } else {
                message = `✅ 순위: ${data.rank}위\n`;
                message += `업데이트: ${diffMinutes}분 전`;
            }
            alert(message);
        } else {
            alert('⚠️ 저장된 순위 정보가 없습니다.\n\nChrome 확장 프로그램에서 "지금 수집하기" 버튼을 클릭하거나,\n수동으로 순위를 입력해주세요.');
        }
    } catch (error) {
        console.error('순위 로드 에러:', error);
        alert('순위 정보를 불러오는 중 오류가 발생했습니다: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// 이메일 자동발송 설정 관리
window.loadEmailSettings = async function() {
    try {
        const settingsDoc = await db.collection('settings').doc('email_schedule').get();
        
        if (settingsDoc.exists) {
            const data = settingsDoc.data();
            document.getElementById('email-enabled').checked = data.enabled !== false; // 기본값 true
            document.getElementById('email-recipient').value = data.recipient || 'john.wu571@gmail.com';
            document.getElementById('email-send-time').value = data.sendTime || '09:00'; // 기본값 오전 9시
            console.log('✅ 이메일 설정 로드 완료:', data);
        } else {
            // 기본값 설정
            document.getElementById('email-enabled').checked = true;
            document.getElementById('email-recipient').value = 'john.wu571@gmail.com';
            document.getElementById('email-send-time').value = '09:00';
            console.log('⚠️ 저장된 이메일 설정이 없습니다. 기본값 사용 (09:00)');
        }
    } catch (error) {
        console.error('❌ 이메일 설정 로드 에러:', error);
        alert('이메일 설정을 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
};

window.saveEmailSettings = async function() {
    try {
        const enabled = document.getElementById('email-enabled').checked;
        const recipient = document.getElementById('email-recipient').value;
        const sendTime = document.getElementById('email-send-time').value;
        
        if (!recipient) {
            alert('수신 이메일을 입력해주세요.');
            return;
        }
        
        if (!sendTime) {
            alert('발송 시간을 설정해주세요.');
            return;
        }
        
        const settings = {
            enabled,
            recipient,
            sendTime,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('settings').doc('email_schedule').set(settings, { merge: true });
        
        console.log('✅ 이메일 설정 저장 완료:', settings);
        alert(`✅ 이메일 설정이 저장되었습니다!\n\n📧 발송 시간: ${sendTime}\n📬 수신 이메일: ${recipient}\n\n설정한 시간에 자동으로 최신 순위를 수집하여 이메일이 발송됩니다.`);
        
    } catch (error) {
        console.error('❌ 이메일 설정 저장 에러:', error);
        alert('이메일 설정 저장 중 오류가 발생했습니다: ' + error.message);
    }
};

window.sendTestEmail = async function() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '📧 발송 중...';
        
        console.log('🧪 테스트 이메일 발송 시작');
        
        // Firebase Functions 초기화 확인
        if (typeof firebase === 'undefined' || typeof firebase.functions !== 'function') {
            throw new Error('Firebase Functions가 초기화되지 않았습니다.');
        }
        
        // Cloud Function 호출
        const sendTestEmailFunction = firebase.functions().httpsCallable('sendTestRankEmail');
        console.log('📞 Cloud Function 호출 중...');
        
        const result = await sendTestEmailFunction();
        console.log('📬 Cloud Function 응답:', result.data);
        
        if (result.data.success) {
            const recipient = document.getElementById('email-recipient').value;
            alert(`✅ 테스트 이메일이 발송되었습니다!\n\n수신 이메일: ${recipient}\n현재 순위: ${result.data.currentRank}위\n\n📧 수신함을 확인해주세요.`);
        } else {
            alert('⚠️ 이메일 발송에 실패했습니다.\n\n' + (result.data.message || result.data.error || '알 수 없는 오류'));
        }
        
    } catch (error) {
        console.error('❌ 테스트 이메일 발송 에러:', error);
        
        let errorMessage = '테스트 이메일 발송 중 오류가 발생했습니다:\n\n';
        
        // 상세한 에러 메시지
        if (error.code === 'functions/not-found') {
            errorMessage += '❌ Cloud Function이 배포되지 않았습니다.\n\n';
            errorMessage += '다음 명령어로 Functions를 배포해주세요:\n';
            errorMessage += 'cd functions\n';
            errorMessage += 'firebase deploy --only functions:sendTestRankEmail';
        } else if (error.code === 'functions/unauthenticated') {
            errorMessage += '❌ 인증 오류가 발생했습니다.';
        } else if (error.code === 'functions/permission-denied') {
            errorMessage += '❌ 권한이 없습니다.';
        } else if (error.code === 'functions/internal') {
            errorMessage += '❌ 서버 내부 오류가 발생했습니다.\n\n';
            errorMessage += 'Firebase Console에서 Functions 로그를 확인해주세요.';
        } else {
            errorMessage += error.message || error.toString();
        }
        
        alert(errorMessage);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// 페이지 로드 시 이메일 설정도 로드
document.addEventListener('DOMContentLoaded', () => {
    // 기존 코드...
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
        // ... 기존 로드 함수들
        loadEmailSettings(); // 이메일 설정 로드 추가
        loadAdminIPs(); // 관리자 IP 목록 로드
        checkCurrentIP(); // 현재 IP 확인
    }
});

// ==================== 관리자 IP 관리 기능 ====================

// 현재 IP 주소 확인
window.checkCurrentIP = async function() {
    const currentIPElement = document.getElementById('current-ip');
    
    try {
        const getVisitorIP = firebase.functions().httpsCallable('getVisitorIP');
        const result = await getVisitorIP();
        
        if (result.data && result.data.success) {
            let ip = result.data.ip;
            // Cloud Functions가 'internal' 또는 'unknown'을 반환하면 브라우저 공개 IP API로 폴백
            if (!ip || ip === 'unknown' || ip === 'internal') {
                console.log('서버에서 internal/unknown 반환, 공개 IP API로 폴백 시도...');
                try {
                    ip = await fetchPublicIPWithFallback();
                    console.log('✅ 공개 IP 폴백 성공:', ip);
                } catch (fallbackError) {
                    console.warn('공개 IP 폴백 실패:', fallbackError);
                    // 폴백 실패 시에도 서버에서 받은 값 표시
                    if (currentIPElement) {
                        currentIPElement.textContent = ip || '확인 실패';
                    }
                    return ip || 'unknown';
                }
            }
            
            if (currentIPElement) {
                currentIPElement.textContent = ip || '확인 실패';
            }
            console.log('✅ 현재 IP 주소:', ip);
            return ip;
        } else {
            // 서버 응답은 있지만 success가 false인 경우
            throw new Error(result.data?.error || '서버에서 IP를 반환하지 못했습니다');
        }
    } catch (error) {
        console.error('IP 주소 확인 실패, 공개 IP API로 폴백 시도...', error);
        
        // 에러 발생 시에도 공개 IP API로 폴백 시도
        try {
            const fallbackIP = await fetchPublicIPWithFallback();
            console.log('✅ 공개 IP 폴백 성공:', fallbackIP);
            if (currentIPElement) {
                currentIPElement.textContent = fallbackIP;
            }
            return fallbackIP;
        } catch (fallbackError) {
            console.error('공개 IP 폴백도 실패:', fallbackError);
            if (currentIPElement) {
                currentIPElement.textContent = '확인 실패';
            }
            // 사용자에게는 조용히 실패 처리 (alert 제거)
            return 'unknown';
        }
    }
};

// 공개 IP 조회 (폴백 체인) - 브라우저에서 직접 공개 IP API 호출
async function fetchPublicIPWithFallback() {
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

// 관리자 IP 목록 로드
window.loadAdminIPs = async function() {
    try {
        const doc = await db.collection('settings').doc('admin_ips').get();
        const adminIPs = doc.exists ? (doc.data().ips || []) : [];
        
        const listContainer = document.getElementById('admin-ip-list');
        if (!listContainer) return;
        
        if (adminIPs.length === 0) {
            listContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">등록된 IP가 없습니다</p>';
            return;
        }
        
        listContainer.innerHTML = adminIPs.map(ip => `
            <div class="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                <span class="font-mono text-sm text-gray-700 dark:text-gray-300">${ip}</span>
                <button onclick="removeAdminIP('${ip}')" 
                        class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold transition-all">
                    삭제
                </button>
            </div>
        `).join('');
        
        console.log('관리자 IP 목록 로드 완료:', adminIPs);
    } catch (error) {
        console.error('관리자 IP 목록 로드 실패:', error);
        alert('관리자 IP 목록을 불러올 수 없습니다: ' + error.message);
    }
};

// 현재 IP를 관리자 목록에 추가
window.addCurrentIPToAdminList = async function() {
    try {
        const currentIP = await checkCurrentIP();
        if (!currentIP || currentIP === '확인 실패') {
            alert('먼저 IP 주소를 확인해주세요.');
            return;
        }
        
        await addAdminIP(currentIP);
    } catch (error) {
        console.error('현재 IP 추가 실패:', error);
        alert('IP 추가에 실패했습니다: ' + error.message);
    }
};

// 수동으로 IP 추가
window.addManualIP = async function() {
    const input = document.getElementById('manual-ip-input');
    if (!input) return;
    
    const ip = input.value.trim();
    if (!ip) {
        alert('IP 주소를 입력해주세요.');
        return;
    }
    
    // 간단한 IP 형식 검증
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-f:]+)$/i;
    if (!ipPattern.test(ip)) {
        alert('올바른 IP 주소 형식이 아닙니다.');
        return;
    }
    
    await addAdminIP(ip);
    input.value = '';
};

// 관리자 IP 추가 (공통 함수)
async function addAdminIP(ip) {
    try {
        const docRef = db.collection('settings').doc('admin_ips');
        const doc = await docRef.get();
        const currentIPs = doc.exists ? (doc.data().ips || []) : [];
        
        if (currentIPs.includes(ip)) {
            alert('이미 등록된 IP 주소입니다.');
            return;
        }
        
        currentIPs.push(ip);
        await docRef.set({ ips: currentIPs });
        
        console.log('관리자 IP 추가 완료:', ip);
        alert(`IP 주소가 등록되었습니다: ${ip}`);
        
        await loadAdminIPs();
    } catch (error) {
        console.error('IP 추가 실패:', error);
        alert('IP 추가에 실패했습니다: ' + error.message);
    }
}

// 관리자 IP 삭제
window.removeAdminIP = async function(ip) {
    if (!confirm(`이 IP 주소를 삭제하시겠습니까?\n${ip}`)) {
        return;
    }
    
    try {
        const docRef = db.collection('settings').doc('admin_ips');
        const doc = await docRef.get();
        const currentIPs = doc.exists ? (doc.data().ips || []) : [];
        
        const updatedIPs = currentIPs.filter(existingIP => existingIP !== ip);
        await docRef.set({ ips: updatedIPs });
        
        console.log('관리자 IP 삭제 완료:', ip);
        alert(`IP 주소가 삭제되었습니다: ${ip}`);
        
        await loadAdminIPs();
    } catch (error) {
        console.error('IP 삭제 실패:', error);
        alert('IP 삭제에 실패했습니다: ' + error.message);
    }
};
