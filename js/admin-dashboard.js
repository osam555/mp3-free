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
                <td colspan="9" class="px-6 py-12 text-center text-gray-500">
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
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${formatDate(app.timestamp)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    ${roundBadge}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${app.name}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="flex items-center gap-2">
                        <span>${app.email}</span>
                        <button onclick="copyEmail('${app.email}')" class="text-blue-600 hover:text-blue-800" title="이메일 복사">
                            📋
                        </button>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${app.phone}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${Array.isArray(app.ageGroups) ? app.ageGroups.join(', ') : (app.ageGroup || '미입력')}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${app.goals.join(', ')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <div class="flex flex-col gap-1">
                        <a href="${app.receiptUrl}" target="_blank" class="text-blue-600 hover:underline">
                            📄 영수증
                        </a>
                        ${app.reviewUrl ? `<a href="${app.reviewUrl}" target="_blank" class="text-green-600 hover:underline">✍️ 후기</a>` : ''}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <select onchange="changeStatus('${app.id}', this.value)"
                            class="px-3 py-1 rounded font-semibold text-sm ${statusClass}">
                        <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>대기 중</option>
                        <option value="approved" ${app.status === 'approved' ? 'selected' : ''}>승인 완료</option>
                        <option value="sent" ${app.status === 'sent' ? 'selected' : ''}>발송 완료</option>
                    </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <div class="flex flex-col gap-1">
                        ${app.status === 'pending' ? `
                            <button onclick="approveAndSend('${app.id}', '${app.name}', '${app.email}')"
                                    class="text-green-600 hover:text-green-800 font-semibold text-left"
                                    title="영수증과 후기 확인 후 승인 및 자동 발송">
                                ✅ 확인 및 발송
                            </button>
                        ` : ''}
                        <button onclick="sendEmail('${app.id}', '${app.name}', '${app.email}')"
                                class="text-blue-600 hover:text-blue-800 font-semibold text-left"
                                title="속청 동영상 링크 이메일 재발송">
                            📧 ${app.status === 'pending' ? '수동' : '재'}발송
                        </button>
                        <button onclick="deleteApplication('${app.id}', '${app.name}')"
                                class="text-red-600 hover:text-red-800 font-semibold text-left">
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
});
