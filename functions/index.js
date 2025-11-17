/**
 * Firebase Cloud Functions for MP3-Free Earlybird Event
 *
 * Functions:
 * 1. sendEarlybirdEmail - Firestore trigger to send email when application is approved
 * 2. sendManualEmail - HTTP callable function for manual email sending from admin dashboard
 */

const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {setGlobalOptions} = require('firebase-functions/v2');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// 글로벌 옵션 설정 (리전)
setGlobalOptions({region: 'us-central1'});

// Firebase Admin 초기화
admin.initializeApp();

/**
 * 이메일 전송 설정
 *
 * Gmail SMTP 사용 예시:
 * - Gmail 계정의 "앱 비밀번호" 생성 필요
 * - 2단계 인증 활성화 후 앱 비밀번호 발급
 *
 * 환경 변수 설정:
 * firebase functions:config:set gmail.email="your-email@gmail.com" gmail.password="your-app-password"
 */
// 환경 변수에서 Gmail 설정 가져오기
const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_PASSWORD;

// Nodemailer transporter 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

/**
 * 구글 드라이브 링크
 */
const DRIVE_LINK = 'https://drive.google.com/file/d/1NgvCcPXuvrdyFgrJWoHA-Fu05Ng7Am_5/view?usp=drive_link';

/**
 * 이메일 HTML 템플릿 생성
 * @param {string} name - 신청자 이름
 * @param {number} round - 얼리버드 라운드 (1 or 2)
 * @return {string} HTML 이메일 내용
 */
function createEmailTemplate(name, round) {
  const roundText = round === 1 ? '1차 얼리버드' : '2차 얼리버드';
  const roundColor = round === 1 ? '#3B82F6' : '#9333EA';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>대충영어 속청 30일 - 얼리버드 특전</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${roundColor} 0%, #1e40af 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🎉 축하합니다!
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                ${roundText} 신청이 승인되었습니다
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                안녕하세요, <strong>${name}</strong>님!
              </p>

              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                <strong>대충영어 속청 30일</strong> 교보문고 구매자 특전 신청이 승인되었습니다. 🎊
              </p>

              <p style="margin: 0 0 30px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                오쌤이 직접 개발한 <strong>무손실 WAV로 제작한 속청 동영상</strong>을 아래 링크에서 시청하실 수 있습니다.
              </p>

              <!-- Download Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="${DRIVE_LINK}" style="display: inline-block; background: linear-gradient(135deg, ${roundColor} 0%, #1e40af 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      🎬 속청 동영상 보기
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                또는 아래 링크를 복사하여 사용하세요:
              </p>

              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; word-break: break-all;">
                <a href="${DRIVE_LINK}" style="color: #3B82F6; text-decoration: none; font-size: 14px;">
                  ${DRIVE_LINK}
                </a>
              </div>

              <!-- Features -->
              <div style="margin-top: 40px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%); border-radius: 8px; border-left: 4px solid ${roundColor};">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">
                  🎯 무손실 WAV 속청 동영상 특징
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                  <li>MP3 압축으로 손실된 고주파수 복원</li>
                  <li>뇌 활성화를 위한 완전한 음질</li>
                  <li>속청 학습 효과 3배 이상 향상</li>
                  <li>태교 및 숙면에도 효과적</li>
                </ul>
              </div>

              <!-- Tips -->
              <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">
                  💡 시청 팁
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                  <li>다운로드 후 스마트폰이나 태블릿으로 전송하세요</li>
                  <li>출퇴근 시간, 운동 중, 잠들기 전 시청하세요</li>
                  <li>매일 30분 이상 시청하는 것을 추천합니다</li>
                  <li>속청이 너무 빠르면 재생 속도를 조절하세요</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                궁금한 점이 있으시면 언제든지 문의해주세요
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>대충영어 속청 30일</strong> | 교보문고 얼리버드 이벤트
              </p>
              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                이 이메일은 얼리버드 신청자에게 자동으로 발송되었습니다.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Firestore Trigger: 신청 상태가 'approved'로 변경될 때 자동 이메일 발송
 */
exports.sendEarlybirdEmail = onDocumentUpdated(
  'earlybird_applications/{applicationId}',
  async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // status가 'approved'로 변경된 경우에만 이메일 발송
    if (beforeData.status !== 'approved' && afterData.status === 'approved') {
      const { name, email, round } = afterData;

      const mailOptions = {
        from: `대충영어 속청 30일 <${gmailEmail}>`,
        to: email,
        subject: `🎉 [대충영어] ${round}차 얼리버드 승인 - 속청 동영상`,
        html: createEmailTemplate(name, round),
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${email}`);

        // Firestore에 이메일 발송 기록 저장 및 상태를 'sent'로 변경
        await event.data.after.ref.update({
          status: 'sent',
          emailSent: true,
          emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error('❌ Error sending email:', error);
        throw new HttpsError('internal', 'Failed to send email');
      }
    }
  }
);

/**
 * HTTP Callable Function: 관리자 대시보드에서 수동으로 이메일 발송
 *
 * Usage from client:
 * const sendEmail = firebase.functions().httpsCallable('sendManualEmail');
 * await sendEmail({ applicationId: 'xxx' });
 */
exports.sendManualEmail = onCall(async (request) => {
  const { applicationId } = request.data;

  if (!applicationId) {
    throw new HttpsError('invalid-argument', 'applicationId is required');
  }

  try {
    // Firestore에서 신청 정보 가져오기
    const applicationDoc = await admin.firestore()
      .collection('earlybird_applications')
      .doc(applicationId)
      .get();

    if (!applicationDoc.exists) {
      throw new HttpsError('not-found', 'Application not found');
    }

    const { name, email, round } = applicationDoc.data();

    const mailOptions = {
      from: `대충영어 속청 30일 <${gmailEmail}>`,
      to: email,
      subject: `🎉 [대충영어] ${round}차 얼리버드 승인 - 속청 동영상`,
      html: createEmailTemplate(name, round),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Manual email sent successfully to ${email}`);

    // Firestore에 이메일 발송 기록 저장 및 상태를 'sent'로 변경
    await applicationDoc.ref.update({
      status: 'sent',
      emailSent: true,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      emailSentManually: true,
    });

    return { success: true, message: `이메일이 ${email}로 발송되었습니다.` };
  } catch (error) {
    console.error('❌ Error sending manual email:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * 관리자 알림 이메일 템플릿 생성
 * @param {string} name - 신청자 이름
 * @param {string} email - 신청자 이메일
 * @param {string} phone - 신청자 전화번호
 * @param {number} round - 라운드
 * @param {string} receiptUrl - 영수증 URL
 * @param {string} reviewUrl - 후기 URL (선택)
 * @return {string} HTML 이메일 내용
 */
function createAdminNotificationTemplate(name, email, phone, round, receiptUrl, reviewUrl) {
  const roundText = round === 1 ? '1차 얼리버드' : '2차 얼리버드';
  const reviewLink = reviewUrl ? `<a href="${reviewUrl}" style="color: #3B82F6; text-decoration: none;">후기 확인</a>` : '후기 없음';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새 얼리버드 신청 알림</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #1e40af 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🔔 새 얼리버드 신청
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                새로운 얼리버드 신청이 접수되었습니다.
              </p>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>이름:</strong> ${name}</p>
                <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>이메일:</strong> ${email}</p>
                <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>전화번호:</strong> ${phone}</p>
                <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;"><strong>라운드:</strong> ${roundText}</p>
              </div>
              <div style="margin: 20px 0;">
                <a href="${receiptUrl}" target="_blank" style="display: inline-block; background: #3B82F6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-right: 10px;">
                  📄 영수증 확인
                </a>
                <a href="https://mp3-free-earlybird.web.app/admin.html?email=${encodeURIComponent(email)}" target="_blank" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-right: 10px;">
                  🔧 어드민 열기
                </a>
                ${reviewUrl ? `<a href="${reviewUrl}" target="_blank" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">✍️ 후기 확인</a>` : ''}
              </div>
              <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #1f2937; font-size: 14px;">
                  <strong>관리자 대시보드:</strong><br>
                  <a href="https://mp3-free-earlybird.web.app/admin.html" style="color: #3B82F6; text-decoration: none;">https://mp3-free-earlybird.web.app/admin.html</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 신청서 생성 시 라운드 자동 설정 및 관리자 알림
 * Firestore Trigger: onCreate
 */
exports.setApplicationRound = onDocumentCreated('earlybird_applications/{applicationId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const applicationId = event.params.applicationId;
  const applicationData = snapshot.data();

  try {
    // 현재 문서 이전의 모든 신청서 개수 확인
    const querySnapshot = await admin.firestore()
      .collection('earlybird_applications')
      .where('timestamp', '<', applicationData.timestamp)
      .get();

    const count = querySnapshot.size;
    const round = count < 100 ? 1 : 2;

    // round 필드 추가
    await snapshot.ref.update({
      round: round
    });

    console.log(`✅ Application ${applicationId} assigned to round ${round}`);

    // 관리자에게 알림 이메일 발송
    const adminEmail = process.env.ADMIN_EMAIL || 'john.wu571@gmail.com'; // 관리자 이메일 (환경 변수 또는 기본값)
    
    if (adminEmail) {
      const mailOptions = {
        from: `대충영어 속청 30일 <${gmailEmail}>`,
        to: adminEmail,
        subject: `🔔 [대충영어] 새 얼리버드 신청 - ${applicationData.name}님`,
        html: createAdminNotificationTemplate(
          applicationData.name,
          applicationData.email,
          applicationData.phone,
          round,
          applicationData.receiptUrl,
          applicationData.reviewUrl || null
        ),
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Admin notification sent to ${adminEmail}`);
      } catch (emailError) {
        console.error('❌ Error sending admin notification:', emailError);
        // 알림 실패해도 신청 처리는 계속 진행
      }
    }
  } catch (error) {
    console.error('❌ Error setting round:', error);
  }
});

/**
 * 교보문고 주간베스트 외국어 순위 체크
 * HTTP callable function
 */
exports.checkKyobobookRank = onCall(async (request) => {
  // 교보문고 API가 봇을 차단하므로 수동 입력만 사용
  console.log('🔄 순위 체크 요청 받음...');
  
  try {
    // Firestore에서 현재 순위 정보 조회
    const db = admin.firestore();
    const rankDoc = await db.collection('kyobobook_rank').doc('current').get();
    
    if (rankDoc.exists) {
      const data = rankDoc.data();
      console.log('✅ 저장된 순위 정보 반환:', data);
      return {
        success: true,
        rank: data.rank,
        category: data.category,
        lastUpdated: data.lastUpdated,
        message: '저장된 순위 정보입니다. 자동 추출은 현재 교보문고 봇 차단으로 인해 작동하지 않습니다. 수동으로 순위를 입력해주세요.'
      };
    } else {
      throw new HttpsError('not-found', '순위 정보가 없습니다. 수동으로 순위를 입력해주세요.');
    }
  } catch (error) {
    console.error('❌ 순위 조회 에러:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', `순위 정보 조회 중 오류가 발생했습니다: ${error.message}`);
  }
});

/**
 * 교보문고 순위 자동 체크 (매일 오전 9시 실행) - 비활성화
 * Cloud Scheduler를 통해 호출
 * 현재 교보문고 봇 차단으로 인해 비활성화
 */
exports.scheduledCheckKyobobookRank = onSchedule({
  schedule: '0 9 * * *', // 매일 오전 9시 (KST 기준)
  timeZone: 'Asia/Seoul',
}, async (event) => {
  console.log('🔄 교보문고 순위 자동 체크는 현재 비활성화되었습니다.');
  console.log('⚠️ 교보문고 봇 차단으로 인해 수동 입력만 가능합니다.');
  return { success: false, message: '자동 체크 비활성화됨' };
});

/**
 * 순위 리포트 이메일 자동발송 (설정된 시간에 실행)
 * 매 시간마다 실행되며, 설정된 시간과 일치할 때만 이메일 발송
 * Cloud Scheduler를 통해 호출
 * Chrome 확장 프로그램 또는 수동 입력된 순위 데이터를 읽어서 발송
 */
exports.scheduledSendRankReport = onSchedule({
  schedule: '0 * * * *', // 매 시간 정각 (KST 기준)
  timeZone: 'Asia/Seoul',
}, async (event) => {
  console.log('📧 순위 리포트 이메일 자동발송 체크 시작');
  
  try {
    const db = admin.firestore();
    
    // 이메일 발송 설정 확인
    const settingsDoc = await db.collection('settings').doc('email_schedule').get();
    if (!settingsDoc.exists) {
      console.log('⚠️ 이메일 발송 설정이 없습니다. 기본값 사용');
    }
    
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const enabled = settings.enabled !== false; // 기본값 true
    const sendTime = settings.sendTime || '09:00'; // 기본값 오전 9시
    const adminEmail = settings.recipient || process.env.ADMIN_EMAIL || 'john.wu571@gmail.com';
    
    // 이메일 발송이 비활성화된 경우 종료
    if (!enabled) {
      console.log('ℹ️ 이메일 자동발송이 비활성화되어 있습니다.');
      return { success: false, message: '이메일 발송 비활성화됨' };
    }
    
    // 현재 시간 확인 (KST)
    // Firebase Functions는 UTC에서 실행되므로, KST는 UTC+9
    const now = new Date();
    const kstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const currentHour = String(kstTime.getHours()).padStart(2, '0');
    const currentMinute = String(kstTime.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    console.log(`현재 시간 (KST): ${currentTime}, 설정된 발송 시간: ${sendTime}`);
    
    // 설정된 시간과 일치하지 않으면 종료
    if (currentTime !== sendTime) {
      console.log(`⏰ 아직 발송 시간이 아닙니다. (현재: ${currentTime}, 설정: ${sendTime})`);
      return { success: false, message: `발송 시간 아님 (현재: ${currentTime}, 설정: ${sendTime})` };
    }
    
    console.log(`✅ 발송 시간 일치! 순위 리포트 이메일 발송 시작 (${sendTime})`);
    
    // 현재 순위 가져오기
    const currentRankDoc = await db.collection('kyobobook_rank').doc('current').get();
    
    if (!currentRankDoc.exists) {
      console.warn('⚠️ 현재 순위 정보가 없습니다.');
      return { success: false, message: '순위 정보 없음' };
    }
    
    const currentData = currentRankDoc.data();
    const currentRank = currentData.rank;
    const category = currentData.category || '주간베스트 외국어';
    const lastUpdated = currentData.lastUpdated ? currentData.lastUpdated.toDate() : null;
    
    // 최근 7일 순위 히스토리 가져오기
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const historySnapshot = await db.collection('kyobobook_rank_history')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .orderBy('timestamp', 'desc')
      .limit(7)
      .get();
    
    const historyData = [];
    historySnapshot.forEach(doc => {
      const data = doc.data();
      historyData.push({
        rank: data.rank,
        timestamp: data.timestamp.toDate(),
        category: data.category
      });
    });
    
    // 통계 계산
    const ranks = historyData.map(h => h.rank);
    const bestRank = ranks.length > 0 ? Math.min(...ranks) : currentRank;
    const worstRank = ranks.length > 0 ? Math.max(...ranks) : currentRank;
    const avgRank = ranks.length > 0 ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length) : currentRank;
    
    // 어제 순위 계산: 어제 날짜 범위(00:00:00 ~ 23:59:59) 내의 최신 데이터 찾기
    const now = new Date();
    const kstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const yesterdayStart = new Date(kstTime);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0); // 어제 00:00:00
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999); // 어제 23:59:59
    
    // 어제 날짜 범위 내의 데이터 중 가장 최신 것 찾기
    let yesterdayRank = currentRank; // 기본값
    const yesterdayData = historyData
      .filter(item => {
        const itemTime = item.timestamp.getTime();
        return itemTime >= yesterdayStart.getTime() && itemTime <= yesterdayEnd.getTime();
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // 최신순 정렬
    
    if (yesterdayData.length > 0) {
      yesterdayRank = yesterdayData[0].rank; // 가장 최신 데이터
      console.log(`✅ 어제 순위 찾음: ${yesterdayData[0].timestamp.toLocaleString('ko-KR')} ${yesterdayRank}위`);
    } else {
      console.log(`⚠️ 어제 날짜(${yesterdayStart.toLocaleDateString('ko-KR')}) 범위 내 데이터 없음, 현재 순위 사용`);
    }
    
    const rankChange = yesterdayRank - currentRank; // 양수면 상승, 음수면 하락
    
    let changeText = '변화 없음';
    let changeColor = '#6b7280';
    if (rankChange > 0) {
      changeText = `${rankChange}위 상승 📈`;
      changeColor = '#10b981'; // 초록색
    } else if (rankChange < 0) {
      changeText = `${Math.abs(rankChange)}위 하락 📉`;
      changeColor = '#ef4444'; // 빨간색
    }
    
    // 히스토리 테이블 HTML
    let historyTableRows = '';
    historyData.forEach(item => {
      const dateStr = item.timestamp.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      historyTableRows += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${dateStr}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-weight: 600;">${item.rank}위</td>
        </tr>
      `;
    });
    
    // 이메일 HTML 템플릿
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>교보문고 순위 리포트</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      📚 교보문고 주간베스트 순위 리포트
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                      ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </td>
                </tr>
                
                <!-- 현재 순위 -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="text-align: center; background-color: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">현재 순위</p>
                      <h2 style="margin: 0; color: #1f2937; font-size: 48px; font-weight: bold;">${currentRank}위</h2>
                      <p style="margin: 10px 0 0 0; color: #4b5563; font-size: 16px;">${category}</p>
                      ${lastUpdated ? `<p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 14px;">마지막 확인: ${lastUpdated.toLocaleString('ko-KR')}</p>` : ''}
                    </div>
                    
                    <!-- 순위 변화 -->
                    <div style="text-align: center; padding: 20px; background-color: ${changeColor}15; border-radius: 12px; margin-bottom: 30px;">
                      <p style="margin: 0; color: ${changeColor}; font-size: 20px; font-weight: bold;">${changeText}</p>
                      <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">어제 대비 (${yesterdayRank}위 → ${currentRank}위)</p>
                    </div>
                    
                    <!-- 주간 통계 -->
                    <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; font-weight: bold;">📊 주간 통계 (최근 7일)</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 15px; background-color: #ecfdf5; border-radius: 8px; text-align: center; width: 33%;">
                          <p style="margin: 0 0 5px 0; color: #10b981; font-size: 12px; font-weight: 600;">최고 순위</p>
                          <p style="margin: 0; color: #1f2937; font-size: 24px; font-weight: bold;">${bestRank}위</p>
                        </td>
                        <td style="width: 2%;"></td>
                        <td style="padding: 15px; background-color: #fef2f2; border-radius: 8px; text-align: center; width: 33%;">
                          <p style="margin: 0 0 5px 0; color: #ef4444; font-size: 12px; font-weight: 600;">최저 순위</p>
                          <p style="margin: 0; color: #1f2937; font-size: 24px; font-weight: bold;">${worstRank}위</p>
                        </td>
                        <td style="width: 2%;"></td>
                        <td style="padding: 15px; background-color: #eff6ff; border-radius: 8px; text-align: center; width: 33%;">
                          <p style="margin: 0 0 5px 0; color: #3b82f6; font-size: 12px; font-weight: 600;">평균 순위</p>
                          <p style="margin: 0; color: #1f2937; font-size: 24px; font-weight: bold;">${avgRank}위</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- 최근 히스토리 -->
                    <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">📈 최근 순위 변화</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: #f9fafb;">
                          <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 14px; font-weight: 600;">날짜</th>
                          <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 14px; font-weight: 600;">순위</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${historyTableRows || '<tr><td colspan="2" style="padding: 20px; text-align: center; color: #9ca3af;">데이터가 없습니다</td></tr>'}
                      </tbody>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                      <strong>대충영어 속청 30일</strong> | 교보문고 주간베스트
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      이 이메일은 매일 ${sendTime}에 자동으로 발송됩니다.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    // 이메일 발송
    const mailOptions = {
      from: `대충영어 속청 30일 <${gmailEmail}>`,
      to: adminEmail,
      subject: `📊 교보문고 순위 리포트 - ${currentRank}위 (${changeText})`,
      html: emailHtml
    };
    
    await transporter.sendMail(mailOptions);
    
    console.log(`✅ 순위 리포트 이메일 발송 완료: ${adminEmail}`);
    console.log(`현재 순위: ${currentRank}위, 어제: ${yesterdayRank}위, 변화: ${changeText}`);
    
    return {
      success: true,
      currentRank,
      yesterdayRank,
      rankChange,
      emailSent: true
    };
    
  } catch (error) {
    console.error('❌ 순위 리포트 이메일 발송 에러:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 테스트 이메일 발송 (HTTP Callable Function)
 * 관리자 대시보드에서 호출
 */
exports.sendTestRankEmail = onCall(async (request) => {
  console.log('🧪 테스트 이메일 발송 요청');
  
  try {
    const db = admin.firestore();
    
    // 설정에서 수신자 이메일 가져오기
    const settingsDoc = await db.collection('settings').doc('email_schedule').get();
    let adminEmail = 'john.wu571@gmail.com'; // 기본값
    
    if (settingsDoc.exists && settingsDoc.data().recipient) {
      adminEmail = settingsDoc.data().recipient;
    }
    
    // 현재 순위 가져오기
    const currentRankDoc = await db.collection('kyobobook_rank').doc('current').get();
    
    if (!currentRankDoc.exists) {
      return {
        success: false,
        message: '현재 순위 정보가 없습니다. 먼저 순위를 입력해주세요.'
      };
    }
    
    const currentData = currentRankDoc.data();
    const currentRank = currentData.rank;
    const category = currentData.category || '주간베스트 외국어';
    const lastUpdated = currentData.lastUpdated ? currentData.lastUpdated.toDate() : null;
    
    // 간단한 테스트 이메일 HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>테스트 이메일</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      🧪 테스트 이메일
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                      ${new Date().toLocaleString('ko-KR')}
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="text-align: center; background-color: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">현재 순위</p>
                      <h2 style="margin: 0; color: #1f2937; font-size: 48px; font-weight: bold;">${currentRank}위</h2>
                      <p style="margin: 10px 0 0 0; color: #4b5563; font-size: 16px;">${category}</p>
                      ${lastUpdated ? `<p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 14px;">마지막 확인: ${lastUpdated.toLocaleString('ko-KR')}</p>` : ''}
                    </div>
                    
                    <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                      <p style="margin: 0; color: #1e40af; font-size: 14px;">
                        <strong>✅ 이메일 설정이 정상적으로 작동하고 있습니다!</strong>
                      </p>
                      <p style="margin: 10px 0 0 0; color: #1e40af; font-size: 14px;">
                        매일 설정된 시간에 자동으로 순위 리포트를 받게 됩니다.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                      <strong>대충영어 속청 30일</strong> | 교보문고 주간베스트
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      이것은 테스트 이메일입니다.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    // 이메일 발송
    const mailOptions = {
      from: `대충영어 속청 30일 <${gmailEmail}>`,
      to: adminEmail,
      subject: `🧪 테스트: 교보문고 순위 리포트 - ${currentRank}위`,
      html: emailHtml
    };
    
    await transporter.sendMail(mailOptions);
    
    console.log(`✅ 테스트 이메일 발송 완료: ${adminEmail}`);
    
    return {
      success: true,
      message: `테스트 이메일이 ${adminEmail}로 발송되었습니다.`,
      currentRank
    };
    
  } catch (error) {
    console.error('❌ 테스트 이메일 발송 에러:', error);
    return { success: false, error: error.message };
  }
});

/**
 * getVisitorIP - HTTP Callable Function
 * 방문자의 실제 IP 주소를 반환하는 함수
 * 
 * 클라이언트에서 호출 시 사용자의 IP 주소를 가져옵니다.
 */
exports.getVisitorIP = onCall(async (request) => {
  try {
    const headers = request?.rawRequest?.headers || {};
    // 1) 프록시/엣지 제공 헤더 우선
    // - x-forwarded-for: "client, proxy1, proxy2"
    // - cf-connecting-ip, x-real-ip, true-client-ip, fastly-client-ip
    const headerCandidates = [
      headers['x-forwarded-for'],
      headers['cf-connecting-ip'],
      headers['x-real-ip'],
      headers['true-client-ip'],
      headers['fastly-client-ip']
    ].filter(Boolean);

    let parsedFromHeader = 'unknown';
    for (const raw of headerCandidates) {
      // x-forwarded-for 케이스 핸들링
      const candidates = String(raw).split(',').map(s => s.trim()).filter(Boolean);
      for (const cand of candidates) {
        // IPv6-mapped IPv4 (::ffff:1.2.3.4) 제거
        const normalized = cand.startsWith('::ffff:') ? cand.replace('::ffff:', '') : cand;
        // 대괄호 IPv6 표기 제거
        const cleaned = normalized.replace(/^\[|\]$/g, '');
        if (isPublicIP(cleaned)) {
          parsedFromHeader = cleaned;
          break;
        }
      }
      if (parsedFromHeader !== 'unknown') break;
    }

    // 2) 소켓 정보 (로컬/사설망일 확률 높음)
    const socketIP =
      request?.rawRequest?.connection?.remoteAddress ||
      request?.rawRequest?.socket?.remoteAddress ||
      'unknown';
    const normalizedSocket = socketIP.startsWith('::ffff:') ? socketIP.replace('::ffff:', '') : socketIP;

    const finalIP = parsedFromHeader !== 'unknown' ? parsedFromHeader : normalizedSocket;
    const safeIP = isPublicIP(finalIP) ? finalIP : 'internal';

    console.log(`✅ IP 주소 수집: header=${parsedFromHeader}, socket=${normalizedSocket}, final=${safeIP}`);

    // 절대 throw 하지 않고 항상 success: true로 반환 (클라이언트 UX 안정화)
    return {
      success: true,
      ip: safeIP || 'unknown',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ IP 주소 수집 에러:', error);
    // 오류 시에도 사용자 경험을 위해 success 유지
    return {
      success: true,
      ip: 'unknown',
      timestamp: new Date().toISOString(),
      error: 'capture-failed'
    };
  }
});

// 공용 IP 여부 판단 (사설/루프백/링크로컬 제외)
function isPublicIP(ip) {
  if (!ip || ip === 'unknown') return false;
  // IPv6 loopback
  if (ip === '::1') return false;
  // IPv4 loopback
  if (ip === '127.0.0.1') return false;
  // 사설 IPv4
  const privateIPv4 = [
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./
  ];
  if (privateIPv4.some(rx => rx.test(ip))) return false;
  // 링크 로컬(IPv4)
  if (/^169\.254\./.test(ip)) return false;
  // 간단 IPv6 사설/링크로컬 체크 (fc00::/7, fe80::/10)
  if (/^fc|^fd/i.test(ip) || /^fe8/i.test(ip)) return false;
  return true;
}
