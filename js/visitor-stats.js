// 방문자 통계 대시보드 스크립트

// Firestore 컬렉션 참조
const visitorsRef = db.collection('page_visitors');

// 관리자 IP 목록 캐시 (한 번만 로드)
let adminIPsCache = null;

// 관리자 IP 목록 가져오기
async function getAdminIPs() {
    if (adminIPsCache !== null) {
        return adminIPsCache;
    }
    
    try {
        const doc = await db.collection('settings').doc('admin_ips').get();
        adminIPsCache = doc.exists ? (doc.data().ips || []) : [];
        console.log('관리자 IP 목록 로드:', adminIPsCache);
        return adminIPsCache;
    } catch (error) {
        console.error('관리자 IP 로드 실패:', error);
        return [];
    }
}

// 방문 데이터에서 관리자 IP 필터링
function filterAdminIPs(docs, adminIPs) {
    return docs.filter(doc => {
        const data = doc.data();
        const ip = data.ip || 'unknown';
        return !adminIPs.includes(ip);
    });
}

// 날짜 포맷팅 함수
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 시간 포맷팅 함수
function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 오늘 방문자 수 가져오기
async function getTodayVisitors() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await visitorsRef
        .where('timestamp', '>=', today)
        .get();

    // 관리자 IP 필터링
    const adminIPs = await getAdminIPs();
    const filtered = filterAdminIPs(snapshot.docs, adminIPs);

    return filtered.length;
}

// 주간 방문자 통계 가져오기
async function getWeeklyStats() {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const snapshot = await visitorsRef
        .where('timestamp', '>=', weekAgo)
        .orderBy('timestamp', 'asc')
        .get();

    // 관리자 IP 필터링
    const adminIPs = await getAdminIPs();
    const filteredDocs = filterAdminIPs(snapshot.docs, adminIPs);

    // 일자별 그룹화
    const dailyStats = {};
    const deviceStats = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const browserStats = {};
    const referrerStats = {};

    filteredDocs.forEach(doc => {
        const data = doc.data();
        const date = data.timestamp.toDate();
        const dateKey = formatDate(date);

        // 일자별 카운트
        dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1;

        // 디바이스별 카운트
        if (data.device) {
            deviceStats[data.device] = (deviceStats[data.device] || 0) + 1;
        }

        // 브라우저별 카운트
        if (data.browser) {
            browserStats[data.browser] = (browserStats[data.browser] || 0) + 1;
        }

        // 유입 경로별 카운트
        const referrer = data.referrer === 'direct' ? 'Direct' : new URL(data.referrer || 'direct').hostname;
        referrerStats[referrer] = (referrerStats[referrer] || 0) + 1;
    });

    return {
        total: snapshot.size,
        daily: dailyStats,
        devices: deviceStats,
        browsers: browserStats,
        referrers: referrerStats
    };
}

// 월간 방문자 통계
async function getMonthlyStats() {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const snapshot = await visitorsRef
        .where('timestamp', '>=', monthAgo)
        .get();

    return snapshot.size;
}

// 통계 카드 업데이트
async function updateStatsCards() {
    try {
        const todayCount = await getTodayVisitors();
        const weeklyStats = await getWeeklyStats();
        const monthlyCount = await getMonthlyStats();

        document.getElementById('today-visitors').textContent = todayCount;
        document.getElementById('weekly-visitors').textContent = weeklyStats.total;
        document.getElementById('monthly-visitors').textContent = monthlyCount;

        return weeklyStats;
    } catch (error) {
        console.error('통계 로드 에러:', error);
        return null;
    }
}

// 일자별 방문자 차트 생성
function createDailyChart(dailyStats) {
    const ctx = document.getElementById('dailyVisitorsChart');
    if (!ctx) return;

    // 최근 7일 날짜 생성
    const labels = [];
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = formatDate(date);
        labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
        data.push(dailyStats[dateKey] || 0);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '일별 방문자 수',
                data: data,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            family: "'Noto Sans KR', sans-serif",
                            size: 14
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            family: "'Noto Sans KR', sans-serif"
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: "'Noto Sans KR', sans-serif"
                        }
                    }
                }
            }
        }
    });
}

// 디바이스별 차트 생성
function createDeviceChart(deviceStats) {
    const ctx = document.getElementById('deviceChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(deviceStats),
            datasets: [{
                data: Object.values(deviceStats),
                backgroundColor: [
                    'rgb(59, 130, 246)',
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: "'Noto Sans KR', sans-serif",
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// 브라우저별 차트 생성
function createBrowserChart(browserStats) {
    const ctx = document.getElementById('browserChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(browserStats),
            datasets: [{
                label: '브라우저별 방문자',
                data: Object.values(browserStats),
                backgroundColor: 'rgba(59, 130, 246, 0.7)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            family: "'Noto Sans KR', sans-serif"
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: "'Noto Sans KR', sans-serif"
                        }
                    }
                }
            }
        }
    });
}

// 최근 방문자 테이블 렌더링
async function renderRecentVisitors() {
    const tbody = document.getElementById('recent-visitors-table');
    if (!tbody) return;

    try {
        const snapshot = await visitorsRef
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        // 관리자 IP 필터링 후 20개만 표시
        const adminIPs = await getAdminIPs();
        const filteredDocs = filterAdminIPs(snapshot.docs, adminIPs).slice(0, 20);

        if (filteredDocs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                        방문 기록이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredDocs.map(doc => {
            const data = doc.data();
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${formatDateTime(data.timestamp)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${data.page || '/'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${data.device || 'Unknown'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${data.browser || 'Unknown'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${data.referrer === 'direct' ? 'Direct' : data.referrer}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                        ${data.viewport || 'N/A'}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('최근 방문자 로드 에러:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-red-600">
                    데이터 로드 중 오류가 발생했습니다: ${error.message}
                </td>
            </tr>
        `;
    }
}

// CSV 내보내기
async function exportVisitorsToCSV() {
    try {
        const snapshot = await visitorsRef
            .orderBy('timestamp', 'desc')
            .get();

        if (snapshot.empty) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        const headers = ['방문일시', '페이지', 'Referrer', '디바이스', '브라우저', '해상도', 'User Agent'];
        const rows = snapshot.docs.map(doc => {
            const data = doc.data();
            return [
                formatDateTime(data.timestamp),
                data.page || '/',
                data.referrer || 'N/A',
                data.device || 'Unknown',
                data.browser || 'Unknown',
                data.viewport || 'N/A',
                data.userAgent || 'N/A'
            ];
        });

        let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
        csvContent += headers.join(',') + '\n';
        csvContent += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `visitors_${Date.now()}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('CSV 내보내기 에러:', error);
        alert('CSV 내보내기 중 오류가 발생했습니다.');
    }
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', async () => {
    if (typeof firebase === 'undefined') {
        console.error('Firebase가 로드되지 않았습니다.');
        return;
    }

    // 통계 카드 업데이트
    const weeklyStats = await updateStatsCards();

    if (weeklyStats) {
        // 차트 생성
        createDailyChart(weeklyStats.daily);
        createDeviceChart(weeklyStats.devices);
        createBrowserChart(weeklyStats.browsers);
    }

    // 최근 방문자 테이블 렌더링
    await renderRecentVisitors();
});
