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
        
        if (rankDoc.exists()) {
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
        
        // 통계 업데이트
        updateRankStats(historyData);
        
        // 그래프 데이터 준비
        const labels = historyData.map(item => {
            return item.timestamp.toLocaleDateString('ko-KR', {
                month: '2-digit',
                day: '2-digit'
            });
        });
        const ranks = historyData.map(item => item.rank);
        
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
        document.getElementById('worst-rank').textContent = '-';
        document.getElementById('avg-rank').textContent = '-';
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
    
    // 최저 순위 (숫자가 클수록 나쁨)
    const worstRank = Math.max(...ranks);
    document.getElementById('worst-rank').textContent = `${worstRank}위`;
    
    // 평균 순위
    const avgRank = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
    document.getElementById('avg-rank').textContent = `${avgRank}위`;
    
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
    const textColor = isDark ? '#e5e7eb' : '#1f2937';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    
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
                    ticks: {
                        color: textColor,
                        font: {
                            size: 12,
                            family: "'Noto Sans KR', sans-serif"
                        },
                        callback: function(value) {
                            return value + '위';
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        font: {
                            size: 12,
                            family: "'Noto Sans KR', sans-serif"
                        }
                    },
                    grid: {
                        color: gridColor
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

// 순위 추가 모달 표시
function showAddRankModal() {
    document.getElementById('modal-title').textContent = '순위 추가';
    document.getElementById('rank-doc-id').value = '';
    document.getElementById('rank-form').reset();
    
    // 현재 날짜/시간으로 기본값 설정
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('rank-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('rank-category-input').value = '주간베스트 외국어';
    
    document.getElementById('rank-modal').style.display = 'flex';
}

// 순위 수정 모달 표시
async function editRank(docId) {
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
function closeRankModal() {
    document.getElementById('rank-modal').style.display = 'none';
}

// 순위 저장
async function saveRank(event) {
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
            // 추가
            await db.collection('kyobobook_rank_history').add(rankData);
            alert('순위가 추가되었습니다.');
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
async function deleteRank(docId, rank) {
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
function exportRankHistory() {
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
async function checkKyobobookRank() {
    const btn = document.getElementById('check-rank-btn');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '⏳ 확인 중...';
        
        const checkRank = firebase.functions().httpsCallable('checkKyobobookRank');
        const result = await checkRank();
        
        if (result.data.success) {
            if (result.data.rank) {
                alert(`✅ ${result.data.message}`);
            } else {
                alert(`⚠️ ${result.data.message}`);
            }
            // 순위 정보 새로고침
            await loadRankInfo();
            await loadRankHistory();
            await loadRankHistoryTable();
        } else {
            alert(`❌ ${result.data.message || '순위 확인 중 오류가 발생했습니다.'}`);
        }
    } catch (error) {
        console.error('순위 체크 에러:', error);
        alert('순위 확인 중 오류가 발생했습니다: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
