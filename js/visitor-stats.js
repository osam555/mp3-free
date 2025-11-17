// 방문자 통계 대시보드 스크립트

// 다크모드 상태 확인 및 차트 색상 팔레트 제공 함수
// - 목적: 현재 테마에 따라 차트의 글자색/그리드색/데이터색을 동적으로 적용
function isDarkTheme() {
    return document.documentElement.classList.contains('dark');
}

// 차트 공통 색상 반환
function getChartThemeColors(applyGlobalDefaults = false) {
    const dark = isDarkTheme();
    const colors = {
        text: dark ? '#f8fafc' : '#0f172a',           // brighten dark text, deepen light
        axis: dark ? '#ffffff' : '#0f172a',
        grid: dark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.1)',
        borderLine: dark ? 'rgba(248,250,252,0.7)' : 'rgba(15,23,42,0.2)',
        legend: dark ? '#f8fafc' : '#0f172a',
        borderBlue: 'rgb(59, 130, 246)',              // blue-500
        fillBlue: dark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.10)',
        barBlue: dark ? 'rgba(59,130,246,0.85)' : 'rgba(59,130,246,0.7)',
        deviceColors: [
            'rgb(59, 130, 246)',                      // blue-500
            'rgb(16, 185, 129)',                      // emerald-500
            'rgb(245, 158, 11)'                       // amber-500
        ]
    };

    if (applyGlobalDefaults && typeof Chart !== 'undefined') {
        Chart.defaults.color = colors.axis;
        Chart.defaults.borderColor = colors.grid;
        Chart.defaults.font.family = "'Noto Sans KR', sans-serif";
    }

    return colors;
}

// 생성된 차트 인스턴스 저장소 (테마 변경 시 업데이트)
const chartInstances = {
    daily: null,
    device: null,
    browser: null
};

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

function getTrafficSourceLabel(data) {
    if (!data) return 'Direct';
    if (data.trafficSource) return data.trafficSource;
    const ref = data.referrer || '';
    if (!ref || ref === 'direct') return 'Direct';
    const normalize = (value) => value.replace(/^www\./, '');
    let host = '';
    try {
        host = normalize(new URL(ref).hostname.toLowerCase());
    } catch (_) {
        host = normalize(ref.toLowerCase());
    }
    if (host.includes('kakao')) return 'KakaoTalk';
    if (host.includes('facebook') || host.includes('fb')) return 'Facebook';
    if (host.includes('instagram') || host.includes('ig')) return 'Instagram';
    if (host.includes('naver')) return 'Naver';
    if (host.includes('google')) return 'Google';
    if (host.includes('youtube')) return 'YouTube';
    return host ? host.charAt(0).toUpperCase() + host.slice(1) : 'Other';
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

// 어제 방문자 수 가져오기
// - 어제 00:00:00 이상, 오늘 00:00:00 미만 범위를 조회하여 카운트
async function getYesterdayVisitors() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    // Firestore 범위 쿼리 (동일 필드에 대한 두 개의 비교 연산자)
    const snapshot = await visitorsRef
        .where('timestamp', '>=', yesterday)
        .where('timestamp', '<', today)
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
        const referrer = getTrafficSourceLabel(data);
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
        const yesterdayCount = await getYesterdayVisitors();
        const weeklyStats = await getWeeklyStats();
        const monthlyCount = await getMonthlyStats();

        document.getElementById('today-visitors').textContent = todayCount;
        const yNode = document.getElementById('yesterday-visitors');
        if (yNode) yNode.textContent = yesterdayCount;
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

    const colors = getChartThemeColors(true);

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

    // 기존 차트 제거
    if (chartInstances.daily) {
        chartInstances.daily.destroy();
    }

    chartInstances.daily = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '일별 방문자 수',
                data: data,
                borderColor: colors.borderBlue,
                backgroundColor: colors.fillBlue,
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
                        },
                        color: colors.legend
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '방문자 수',
                        color: colors.axis,
                        font: {
                            family: "'Noto Sans KR', sans-serif",
                            size: 14,
                            weight: '600'
                        },
                        padding: {bottom: 10}
                    },
                    ticks: {
                        stepSize: 1,
                        font: {
                            family: "'Noto Sans KR', sans-serif"
                        },
                        color: colors.axis
                    },
                    grid: {
                        color: colors.grid,
                        borderColor: colors.borderLine
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '날짜',
                        color: colors.axis,
                        font: {
                            family: "'Noto Sans KR', sans-serif",
                            size: 14,
                            weight: '600'
                        },
                        padding: {top: 10}
                    },
                    ticks: {
                        font: {
                            family: "'Noto Sans KR', sans-serif"
                        },
                        color: colors.axis
                    },
                    grid: {
                        color: colors.grid,
                        borderColor: colors.borderLine
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

    const colors = getChartThemeColors(true);

    if (chartInstances.device) {
        chartInstances.device.destroy();
    }

    chartInstances.device = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(deviceStats),
            datasets: [{
                data: Object.values(deviceStats),
                backgroundColor: colors.deviceColors
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
                        },
                        color: colors.legend
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

    const colors = getChartThemeColors(true);

    if (chartInstances.browser) {
        chartInstances.browser.destroy();
    }

    chartInstances.browser = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(browserStats),
            datasets: [{
                label: '브라우저별 방문자',
                data: Object.values(browserStats),
                backgroundColor: colors.barBlue
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                    labels: {
                        color: colors.legend
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '방문자 수',
                        color: colors.axis,
                        font: {
                            family: "'Noto Sans KR', sans-serif",
                            size: 14,
                            weight: '600'
                        },
                        padding: {bottom: 10}
                    },
                    ticks: {
                        stepSize: 1,
                        font: {
                            family: "'Noto Sans KR', sans-serif"
                        },
                        color: colors.axis
                    },
                    grid: {
                        color: colors.grid,
                        borderColor: colors.borderLine
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '브라우저',
                        color: colors.axis,
                        font: {
                            family: "'Noto Sans KR', sans-serif",
                            size: 14,
                            weight: '600'
                        },
                        padding: {top: 10}
                    },
                    ticks: {
                        font: {
                            family: "'Noto Sans KR', sans-serif"
                        },
                        color: colors.axis
                    },
                    grid: {
                        color: colors.grid,
                        borderColor: colors.borderLine
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
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-100">
                        방문 기록이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredDocs.map(doc => {
            const data = doc.data();
            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        ${formatDateTime(data.timestamp)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        ${data.page || '/'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        ${data.device || 'Unknown'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        ${data.browser || 'Unknown'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        ${getTrafficSourceLabel(data)}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        ${data.viewport || 'N/A'}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('최근 방문자 로드 에러:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-red-600 dark:text-red-300">
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
                getTrafficSourceLabel(data),
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

// 테마 변경 시 차트 색상 업데이트
// - 목적: 다크/라이트 모드 전환에 따라 차트의 텍스트/그리드/데이터 색상을 재적용
window.addEventListener('themechange', () => {
    try {
        // 차트를 다시 그릴 수 있도록 데이터 소스가 필요 -> 기존 인스턴스의 옵션만 업데이트
        const colors = getChartThemeColors(true);
        if (chartInstances.daily) {
            chartInstances.daily.options.plugins.legend.labels.color = colors.legend;
            chartInstances.daily.options.scales.x.ticks.color = colors.axis;
            chartInstances.daily.options.scales.y.ticks.color = colors.axis;
            if (chartInstances.daily.options.scales.x.title) {
                chartInstances.daily.options.scales.x.title.color = colors.axis;
            }
            if (chartInstances.daily.options.scales.y.title) {
                chartInstances.daily.options.scales.y.title.color = colors.axis;
            }
            chartInstances.daily.options.scales.x.grid.color = colors.grid;
            chartInstances.daily.options.scales.y.grid.color = colors.grid;
            chartInstances.daily.options.scales.x.grid.borderColor = colors.borderLine;
            chartInstances.daily.options.scales.y.grid.borderColor = colors.borderLine;
            chartInstances.daily.data.datasets[0].borderColor = colors.borderBlue;
            chartInstances.daily.data.datasets[0].backgroundColor = colors.fillBlue;
            chartInstances.daily.update();
        }
        if (chartInstances.device) {
            chartInstances.device.options.plugins.legend.labels.color = colors.legend;
            // 데이터셋 색상 유지
            chartInstances.device.update();
        }
        if (chartInstances.browser) {
            // legend는 숨김이지만 방어적으로 적용
            if (chartInstances.browser.options.plugins.legend.labels) {
                chartInstances.browser.options.plugins.legend.labels.color = colors.legend;
            }
            chartInstances.browser.options.scales.x.ticks.color = colors.axis;
            chartInstances.browser.options.scales.y.ticks.color = colors.axis;
            if (chartInstances.browser.options.scales.x.title) {
                chartInstances.browser.options.scales.x.title.color = colors.axis;
            }
            if (chartInstances.browser.options.scales.y.title) {
                chartInstances.browser.options.scales.y.title.color = colors.axis;
            }
            chartInstances.browser.options.scales.x.grid.color = colors.grid;
            chartInstances.browser.options.scales.y.grid.color = colors.grid;
            chartInstances.browser.options.scales.x.grid.borderColor = colors.borderLine;
            chartInstances.browser.options.scales.y.grid.borderColor = colors.borderLine;
            chartInstances.browser.data.datasets[0].backgroundColor = colors.barBlue;
            chartInstances.browser.update();
        }
    } catch (e) {
        console.warn('테마 변경 차트 업데이트 중 경고:', e);
    }
});
