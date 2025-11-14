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
        alert('상태 변경 중 오류가 발생했습니다.');
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

// 신청 삭제
async function deleteApplication(docId, name) {
    if (!confirm(`${name}님의 신청을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    try {
        await applicationsRef.doc(docId).delete();
        alert('신청이 삭제되었습니다.');
    } catch (error) {
        console.error('삭제 에러:', error);
        alert('삭제 중 오류가 발생했습니다.');
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
                    <a href="${app.receiptUrl}" target="_blank" class="text-blue-600 hover:underline">
                        📄 보기
                    </a>
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
                    <button onclick="deleteApplication('${app.id}', '${app.name}')"
                            class="text-red-600 hover:text-red-800 font-semibold">
                        🗑️ 삭제
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 필터 적용
function applyFilters() {
    currentFilter.status = document.getElementById('filter-status').value;
    currentFilter.age = document.getElementById('filter-age').value;

    let filtered = [...allApplications];

    if (currentFilter.status !== 'all') {
        filtered = filtered.filter(app => app.status === currentFilter.status);
    }

    if (currentFilter.age !== 'all') {
        filtered = filtered.filter(app => app.ageGroup === currentFilter.age);
    }

    renderTable(filtered);
    updateStats(filtered);
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
    applicationsRef
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            allApplications = [];
            snapshot.forEach((doc) => {
                allApplications.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            applyFilters();
        }, (error) => {
            console.error('데이터 로드 에러:', error);
            document.getElementById('applications-table').innerHTML = `
                <tr>
                    <td colspan="9" class="px-6 py-12 text-center text-red-600">
                        데이터 로드 중 오류가 발생했습니다: ${error.message}
                    </td>
                </tr>
            `;
        });
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === 'undefined') {
        alert('Firebase가 로드되지 않았습니다. firebase-config.js를 확인하세요.');
        return;
    }

    loadApplications();
});
