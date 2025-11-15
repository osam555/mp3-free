/**
 * Firebase Cloud Functions for MP3-Free Earlybird Event
 *
 * Functions:
 * 1. sendEarlybirdEmail - Firestore trigger to send email when application is approved
 * 2. sendManualEmail - HTTP callable function for manual email sending from admin dashboard
 */

const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {setGlobalOptions} = require('firebase-functions/v2');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

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
 * 신청서 생성 시 라운드 자동 설정
 * Firestore Trigger: onCreate
 */
exports.setApplicationRound = onDocumentCreated('earlybird_applications/{applicationId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const applicationId = event.params.applicationId;

  try {
    // 현재 문서 이전의 모든 신청서 개수 확인
    const querySnapshot = await admin.firestore()
      .collection('earlybird_applications')
      .where('timestamp', '<', snapshot.data().timestamp)
      .get();

    const count = querySnapshot.size;
    const round = count < 100 ? 1 : 2;

    // round 필드 추가
    await snapshot.ref.update({
      round: round
    });

    console.log(`✅ Application ${applicationId} assigned to round ${round}`);
  } catch (error) {
    console.error('❌ Error setting round:', error);
  }
});
