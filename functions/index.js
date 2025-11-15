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
  const productUrl = 'https://product.kyobobook.co.kr/detail/S000218549943';
  
  try {
    console.log('🔄 순위 체크 시작...');
    
    // User-Agent 설정 (봇 차단 방지)
    let response;
    try {
      response = await axios.get(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 15000,
      });
      console.log('✅ 페이지 로드 성공');
    } catch (axiosError) {
      console.error('❌ 페이지 로드 실패:', axiosError.message);
      throw new HttpsError('internal', `페이지를 불러올 수 없습니다: ${axiosError.message}`);
    }

    let $;
    try {
      $ = cheerio.load(response.data);
      console.log('✅ HTML 파싱 성공');
    } catch (parseError) {
      console.error('❌ HTML 파싱 실패:', parseError.message);
      throw new HttpsError('internal', `HTML 파싱 중 오류가 발생했습니다: ${parseError.message}`);
    }
    
    let rank = null;
    let category = null;
    let lastUpdated = new Date().toISOString();

    // 순위 정보 추출 시도 (여러 패턴 시도)
    const bodyText = $('body').text();
    const htmlContent = $.html();
    
    console.log('페이지 텍스트 길이:', bodyText.length);
    console.log('HTML 길이:', htmlContent.length);
    
    // 디버깅: 순위 관련 텍스트 샘플 출력
    const rankKeywords = bodyText.match(/[주간베스트외국어\d\s위]{0,100}/gi);
    if (rankKeywords && rankKeywords.length > 0) {
      console.log('순위 관련 텍스트 샘플:', rankKeywords.slice(0, 10).join(' | '));
    }
    
    // 패턴 1: "주간베스트 외국어 285위" 형태 (공백 허용)
    let rankMatch = bodyText.match(/주간\s*베스트\s*외국어\s*(\d+)\s*위/i);
    if (rankMatch) {
      rank = parseInt(rankMatch[1], 10);
      category = '주간베스트 외국어';
      console.log('패턴 1 매칭:', rank);
    }
    
    // 패턴 1-2: "주간베스트외국어 285위" 형태 (공백 없음)
    if (!rank) {
      rankMatch = bodyText.match(/주간베스트외국어\s*(\d+)\s*위/i);
      if (rankMatch) {
        rank = parseInt(rankMatch[1], 10);
        category = '주간베스트 외국어';
        console.log('패턴 1-2 매칭:', rank);
      }
    }
    
    // 패턴 2: "외국어 285위" 형태
    if (!rank) {
      rankMatch = bodyText.match(/외국어\s*(\d+)\s*위/i);
      if (rankMatch) {
        rank = parseInt(rankMatch[1], 10);
        category = '주간베스트 외국어';
        console.log('패턴 2 매칭:', rank);
      }
    }
    
    // 패턴 3: "베스트 285위" 형태
    if (!rank) {
      rankMatch = bodyText.match(/베스트\s*(\d+)\s*위/i);
      if (rankMatch) {
        rank = parseInt(rankMatch[1], 10);
        category = '주간베스트';
        console.log('패턴 3 매칭:', rank);
      }
    }
    
    // 패턴 4: 숫자 + "위" 패턴 (주변 텍스트 확인) - 더 넓은 범위
    if (!rank) {
      const allRankMatches = [...bodyText.matchAll(/(\d+)\s*위/g)];
      for (const match of allRankMatches) {
        const potentialRank = parseInt(match[1], 10);
        // 합리적인 순위 범위 확인 (1-1000위)
        if (potentialRank >= 1 && potentialRank <= 1000) {
          // 주변 텍스트에서 "베스트", "외국어", "주간" 키워드 확인 (더 넓은 범위)
          const context = bodyText.substring(
            Math.max(0, match.index - 100),
            Math.min(bodyText.length, match.index + 100)
          );
          if (context.match(/베스트|외국어|주간|best|rank/i)) {
            rank = potentialRank;
            category = '주간베스트 외국어';
            console.log('패턴 4 매칭:', rank, '컨텍스트:', context.substring(0, 50));
            break;
          }
        }
      }
    }
    
    // 패턴 5: HTML 요소에서 직접 찾기 (더 많은 요소 타입 포함)
    if (!rank) {
      try {
        const selectors = ['span', 'div', 'p', 'li', 'td', 'th', 'strong', 'em', 'b', 'a', 'label'];
        for (const selector of selectors) {
          if (rank) break;
          const elements = $(selector);
          for (let i = 0; i < elements.length && !rank; i++) {
            const text = $(elements[i]).text().trim();
            // 더 유연한 패턴: "주간", "베스트", "외국어" 중 하나와 숫자+위 조합
            const match = text.match(/(주간|베스트|외국어|best|rank).*?(\d+)\s*위/i);
            if (match) {
              rank = parseInt(match[2], 10);
              category = match[1] || '주간베스트';
              console.log(`✅ 패턴 5 매칭 (${selector}):`, rank, '텍스트:', text.substring(0, 50));
              break;
            }
          }
        }
      } catch (elemError) {
        console.warn('⚠️ HTML 요소 검색 중 오류:', elemError.message);
      }
    }
    
    // 패턴 6: 클래스나 ID에 "rank", "best", "bestseller" 등이 포함된 요소 찾기
    if (!rank) {
      try {
        const rankSelectors = [
          '[class*="rank"]', '[class*="best"]', '[class*="bestseller"]',
          '[id*="rank"]', '[id*="best"]', '[id*="bestseller"]',
          '[class*="순위"]', '[id*="순위"]'
        ];
        for (const selector of rankSelectors) {
          if (rank) break;
          const rankElements = $(selector);
          for (let i = 0; i < rankElements.length && !rank; i++) {
            const text = $(rankElements[i]).text().trim();
            const match = text.match(/(\d+)\s*위/);
            if (match) {
              const potentialRank = parseInt(match[1], 10);
              if (potentialRank >= 1 && potentialRank <= 1000) {
                rank = potentialRank;
                category = '주간베스트 외국어';
                console.log(`✅ 패턴 6 매칭 (${selector}):`, rank);
                break;
              }
            }
          }
        }
      } catch (rankElemError) {
        console.warn('⚠️ 순위 요소 검색 중 오류:', rankElemError.message);
      }
    }
    
    // 패턴 7: data 속성에서 순위 찾기
    if (!rank) {
      try {
        const dataElements = $('[data-rank], [data-best], [data-bestseller]');
        for (let i = 0; i < dataElements.length && !rank; i++) {
          const rankValue = $(dataElements[i]).attr('data-rank') || 
                           $(dataElements[i]).attr('data-best') || 
                           $(dataElements[i]).attr('data-bestseller');
          if (rankValue) {
            const potentialRank = parseInt(rankValue, 10);
            if (potentialRank >= 1 && potentialRank <= 1000) {
              rank = potentialRank;
              category = '주간베스트 외국어';
              console.log('✅ 패턴 7 매칭 (data 속성):', rank);
              break;
            }
          }
        }
      } catch (dataError) {
        console.warn('⚠️ data 속성 검색 중 오류:', dataError.message);
      }
    }
    
    // 패턴 8: 메타 태그나 스크립트 태그에서 순위 찾기
    if (!rank) {
      try {
        const scripts = $('script').toArray();
        for (const script of scripts) {
          const scriptText = $(script).html() || '';
          const match = scriptText.match(/["']?(?:rank|best|bestseller|순위)["']?\s*[:=]\s*["']?(\d+)["']?/i);
          if (match) {
            const potentialRank = parseInt(match[1], 10);
            if (potentialRank >= 1 && potentialRank <= 1000) {
              rank = potentialRank;
              category = '주간베스트 외국어';
              console.log('✅ 패턴 8 매칭 (script 태그):', rank);
              break;
            }
          }
        }
      } catch (scriptError) {
        console.warn('⚠️ script 태그 검색 중 오류:', scriptError.message);
      }
    }
    
    // 디버깅: 순위를 찾지 못한 경우 HTML 샘플 저장
    if (!rank) {
      console.log('⚠️ 순위를 찾을 수 없습니다. HTML 샘플 분석...');
      // "위"가 포함된 모든 텍스트 찾기
      const rankTexts = [];
      $('*').each((i, elem) => {
        const text = $(elem).text();
        if (text.includes('위') && /\d/.test(text)) {
          rankTexts.push(text.trim().substring(0, 100));
        }
      });
      if (rankTexts.length > 0) {
        console.log('"위"가 포함된 텍스트 샘플:', rankTexts.slice(0, 10).join(' | '));
      }
    }
    
    console.log(`순위 추출 결과: ${rank ? `${rank}위` : '없음'}, 카테고리: ${category}`);

    // Firestore에 순위 정보 저장
    try {
      const rankData = {
        rank: rank,
        category: category || '주간베스트 외국어',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        checkedAt: lastUpdated,
        productUrl: productUrl,
      };

      await admin.firestore()
        .collection('kyobobook_rank')
        .doc('current')
        .set(rankData, {merge: true});
      console.log('✅ 현재 순위 저장 완료');

      // 히스토리에도 저장 (순위가 있을 때만)
      if (rank) {
        await admin.firestore()
          .collection('kyobobook_rank_history')
          .add({
            ...rankData,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        console.log('✅ 순위 히스토리 저장 완료');
      }

      return {
        success: true,
        rank: rank,
        category: category || '주간베스트 외국어',
        message: rank ? `현재 순위: ${category || '주간베스트 외국어'} ${rank}위` : '순위 정보를 찾을 수 없습니다.',
      };
    } catch (firestoreError) {
      console.error('❌ Firestore 저장 에러:', firestoreError);
      throw new HttpsError('internal', `데이터 저장 중 오류가 발생했습니다: ${firestoreError.message}`);
    }
  } catch (error) {
    console.error('❌ 교보문고 순위 체크 에러:', error);
    console.error('에러 스택:', error.stack);
    
    // HttpsError인 경우 그대로 전달
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // 그 외의 경우
    throw new HttpsError('internal', `순위 정보를 가져오는 중 오류가 발생했습니다: ${error.message}`);
  }
});

/**
 * 교보문고 순위 자동 체크 (매일 오전 9시 실행)
 * Cloud Scheduler를 통해 호출
 */
exports.scheduledCheckKyobobookRank = onSchedule({
  schedule: '0 9 * * *', // 매일 오전 9시 (KST 기준)
  timeZone: 'Asia/Seoul',
}, async (event) => {
  console.log('🔄 교보문고 순위 자동 체크 시작...');
  
  const productUrl = 'https://product.kyobobook.co.kr/detail/S000218549943';
  
  try {
    const response = await axios.get(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    let rank = null;
    let category = null;

    const rankText = $('body').text();
    const rankMatch = rankText.match(/주간베스트\s*외국어\s*(\d+)위/i);
    
    if (rankMatch) {
      rank = parseInt(rankMatch[1], 10);
      category = '주간베스트 외국어';
    }

    if (rank) {
      const rankData = {
        rank: rank,
        category: category || '주간베스트 외국어',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        productUrl: productUrl,
      };

      await admin.firestore()
        .collection('kyobobook_rank')
        .doc('current')
        .set(rankData, {merge: true});

      await admin.firestore()
        .collection('kyobobook_rank_history')
        .add({
          ...rankData,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(`✅ 순위 체크 완료: ${category} ${rank}위`);
    } else {
      console.log('⚠️ 순위 정보를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('❌ 교보문고 순위 자동 체크 에러:', error);
  }
});

/**
 * 순위 리포트 이메일 템플릿 생성
 */
function createRankReportTemplate(currentRank, category, weeklyStats) {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>교보문고 순위 리포트</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #1e40af 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                📚 교보문고 순위 리포트
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">
                ${today}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <!-- 현재 순위 -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center;">
                <h2 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px; font-weight: bold;">
                  현재 순위
                </h2>
                <div style="font-size: 48px; font-weight: bold; color: #3B82F6; margin: 10px 0;">
                  ${currentRank ? `${currentRank}위` : '확인 불가'}
                </div>
                <p style="margin: 10px 0 0 0; color: #1e40af; font-size: 16px;">
                  ${category || '주간베스트 외국어'}
                </p>
              </div>

              <!-- 주간 통계 -->
              ${weeklyStats ? `
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; font-weight: bold; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                  📊 주간 통계 (최근 7일)
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <div style="text-align: center; padding: 15px; background-color: #ffffff; border-radius: 8px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">최고 순위</div>
                    <div style="font-size: 24px; font-weight: bold; color: #10b981;">
                      ${weeklyStats.bestRank}위
                    </div>
                  </div>
                  <div style="text-align: center; padding: 15px; background-color: #ffffff; border-radius: 8px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">최저 순위</div>
                    <div style="font-size: 24px; font-weight: bold; color: #ef4444;">
                      ${weeklyStats.worstRank}위
                    </div>
                  </div>
                  <div style="text-align: center; padding: 15px; background-color: #ffffff; border-radius: 8px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">평균 순위</div>
                    <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">
                      ${weeklyStats.avgRank}위
                    </div>
                  </div>
                  <div style="text-align: center; padding: 15px; background-color: #ffffff; border-radius: 8px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">순위 변화</div>
                    <div style="font-size: 24px; font-weight: bold; color: ${weeklyStats.change > 0 ? '#10b981' : weeklyStats.change < 0 ? '#ef4444' : '#6b7280'};">
                      ${weeklyStats.change > 0 ? `+${weeklyStats.change}위 상승` : weeklyStats.change < 0 ? `${Math.abs(weeklyStats.change)}위 하락` : '변화 없음'}
                    </div>
                  </div>
                </div>
              </div>
              ` : ''}

              <!-- 순위 변화 그래프 링크 -->
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
 * 매일 오전 6시 순위 체크 및 리포트 이메일 발송
 * Cloud Scheduler를 통해 호출
 */
exports.scheduledSendRankReport = onSchedule({
  schedule: '0 6 * * *', // 매일 오전 6시 (KST 기준)
  timeZone: 'Asia/Seoul',
}, async (event) => {
  console.log('🔄 매일 오전 6시 순위 체크 및 이메일 발송 시작...');
  
  const adminEmail = 'john.wu571@gmail.com';
  const productUrl = 'https://product.kyobobook.co.kr/detail/S000218549943';
  
  try {
    // 1. 순위 체크
    console.log('📊 교보문고 순위 체크 중...');
    let currentRank = null;
    let category = '주간베스트 외국어';
    
    try {
      const response = await axios.get(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const bodyText = $('body').text();
      
      console.log('📊 순위 추출 시도 중...');
      
      // 패턴 1: "주간베스트 외국어 285위" 형태 (공백 허용)
      let rankMatch = bodyText.match(/주간\s*베스트\s*외국어\s*(\d+)\s*위/i);
      if (rankMatch) {
        currentRank = parseInt(rankMatch[1], 10);
        category = '주간베스트 외국어';
        console.log('✅ 패턴 1 매칭:', currentRank);
      }
      
      // 패턴 1-2: "주간베스트외국어 285위" 형태 (공백 없음)
      if (!currentRank) {
        rankMatch = bodyText.match(/주간베스트외국어\s*(\d+)\s*위/i);
        if (rankMatch) {
          currentRank = parseInt(rankMatch[1], 10);
          category = '주간베스트 외국어';
          console.log('✅ 패턴 1-2 매칭:', currentRank);
        }
      }
      
      // 패턴 2: "외국어 285위" 형태
      if (!currentRank) {
        rankMatch = bodyText.match(/외국어\s*(\d+)\s*위/i);
        if (rankMatch) {
          currentRank = parseInt(rankMatch[1], 10);
          category = '주간베스트 외국어';
          console.log('✅ 패턴 2 매칭:', currentRank);
        }
      }
      
      // 패턴 3: "베스트 285위" 형태
      if (!currentRank) {
        rankMatch = bodyText.match(/베스트\s*(\d+)\s*위/i);
        if (rankMatch) {
          currentRank = parseInt(rankMatch[1], 10);
          category = '주간베스트';
          console.log('✅ 패턴 3 매칭:', currentRank);
        }
      }
      
      // 패턴 4: 숫자 + "위" 패턴 (주변 텍스트 확인) - 더 넓은 범위
      if (!currentRank) {
        const allRankMatches = [...bodyText.matchAll(/(\d+)\s*위/g)];
        for (const match of allRankMatches) {
          const potentialRank = parseInt(match[1], 10);
          if (potentialRank >= 1 && potentialRank <= 1000) {
            const context = bodyText.substring(
              Math.max(0, match.index - 100),
              Math.min(bodyText.length, match.index + 100)
            );
            if (context.match(/베스트|외국어|주간|best|rank/i)) {
              currentRank = potentialRank;
              category = '주간베스트 외국어';
              console.log('✅ 패턴 4 매칭:', currentRank);
              break;
            }
          }
        }
      }
      
      // 패턴 5: HTML 요소에서 직접 찾기 (더 많은 요소 타입 포함)
      if (!currentRank) {
        try {
          const selectors = ['span', 'div', 'p', 'li', 'td', 'th', 'strong', 'em', 'b', 'a', 'label'];
          for (const selector of selectors) {
            if (currentRank) break;
            const elements = $(selector);
            for (let i = 0; i < elements.length && !currentRank; i++) {
              const text = $(elements[i]).text().trim();
              const match = text.match(/(주간|베스트|외국어|best|rank).*?(\d+)\s*위/i);
              if (match) {
                currentRank = parseInt(match[2], 10);
                category = match[1] || '주간베스트';
                console.log(`✅ 패턴 5 매칭 (${selector}):`, currentRank);
                break;
              }
            }
          }
        } catch (elemError) {
          console.warn('⚠️ HTML 요소 검색 중 오류:', elemError.message);
        }
      }
      
      // 패턴 6: 클래스나 ID에 "rank", "best", "bestseller" 등이 포함된 요소 찾기
      if (!currentRank) {
        try {
          const rankSelectors = [
            '[class*="rank"]', '[class*="best"]', '[class*="bestseller"]',
            '[id*="rank"]', '[id*="best"]', '[id*="bestseller"]',
            '[class*="순위"]', '[id*="순위"]'
          ];
          for (const selector of rankSelectors) {
            if (currentRank) break;
            const rankElements = $(selector);
            for (let i = 0; i < rankElements.length && !currentRank; i++) {
              const text = $(rankElements[i]).text().trim();
              const match = text.match(/(\d+)\s*위/);
              if (match) {
                const potentialRank = parseInt(match[1], 10);
                if (potentialRank >= 1 && potentialRank <= 1000) {
                  currentRank = potentialRank;
                  category = '주간베스트 외국어';
                  console.log(`✅ 패턴 6 매칭 (${selector}):`, currentRank);
                  break;
                }
              }
            }
          }
        } catch (rankElemError) {
          console.warn('⚠️ 순위 요소 검색 중 오류:', rankElemError.message);
        }
      }
      
      // 패턴 7: data 속성에서 순위 찾기
      if (!currentRank) {
        try {
          const dataElements = $('[data-rank], [data-best], [data-bestseller]');
          for (let i = 0; i < dataElements.length && !currentRank; i++) {
            const rankValue = $(dataElements[i]).attr('data-rank') || 
                             $(dataElements[i]).attr('data-best') || 
                             $(dataElements[i]).attr('data-bestseller');
            if (rankValue) {
              const potentialRank = parseInt(rankValue, 10);
              if (potentialRank >= 1 && potentialRank <= 1000) {
                currentRank = potentialRank;
                category = '주간베스트 외국어';
                console.log('✅ 패턴 7 매칭 (data 속성):', currentRank);
                break;
              }
            }
          }
        } catch (dataError) {
          console.warn('⚠️ data 속성 검색 중 오류:', dataError.message);
        }
      }
      
      // 패턴 8: 스크립트 태그에서 순위 찾기
      if (!currentRank) {
        try {
          const scripts = $('script').toArray();
          for (const script of scripts) {
            const scriptText = $(script).html() || '';
            const match = scriptText.match(/["']?(?:rank|best|bestseller|순위)["']?\s*[:=]\s*["']?(\d+)["']?/i);
            if (match) {
              const potentialRank = parseInt(match[1], 10);
              if (potentialRank >= 1 && potentialRank <= 1000) {
                currentRank = potentialRank;
                category = '주간베스트 외국어';
                console.log('✅ 패턴 8 매칭 (script 태그):', currentRank);
                break;
              }
            }
          }
        } catch (scriptError) {
          console.warn('⚠️ script 태그 검색 중 오류:', scriptError.message);
        }
      }
      
      if (currentRank) {
        
        // Firestore에 저장
        const rankData = {
          rank: currentRank,
          category: category,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          productUrl: productUrl,
        };

        await admin.firestore()
          .collection('kyobobook_rank')
          .doc('current')
          .set(rankData, {merge: true});

        await admin.firestore()
          .collection('kyobobook_rank_history')
          .add({
            ...rankData,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

        console.log(`✅ 순위 체크 완료: ${category} ${currentRank}위`);
      } else {
        console.log('⚠️ 순위 정보를 찾을 수 없습니다.');
        
        // 기존 순위 정보 가져오기
        const currentRankDoc = await admin.firestore()
          .collection('kyobobook_rank')
          .doc('current')
          .get();
        
        if (currentRankDoc.exists) {
          const data = currentRankDoc.data();
          currentRank = data.rank;
          category = data.category || '주간베스트 외국어';
          console.log(`📌 기존 순위 정보 사용: ${category} ${currentRank}위`);
        }
      }
    } catch (error) {
      console.error('❌ 순위 체크 에러:', error);
      
      // 기존 순위 정보 가져오기
      const currentRankDoc = await admin.firestore()
        .collection('kyobobook_rank')
        .doc('current')
        .get();
      
      if (currentRankDoc.exists) {
        const data = currentRankDoc.data();
        currentRank = data.rank;
        category = data.category || '주간베스트 외국어';
        console.log(`📌 기존 순위 정보 사용: ${category} ${currentRank}위`);
      }
    }
    
    // 2. 주간 통계 계산 (최근 7일)
    console.log('📈 주간 통계 계산 중...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklySnapshot = await admin.firestore()
      .collection('kyobobook_rank_history')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .orderBy('timestamp', 'asc')
      .get();
    
    let weeklyStats = null;
    
    if (!weeklySnapshot.empty) {
      const ranks = [];
      weeklySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.rank) {
          ranks.push(data.rank);
        }
      });
      
      if (ranks.length > 0) {
        const bestRank = Math.min(...ranks);
        const worstRank = Math.max(...ranks);
        const avgRank = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
        
        // 첫 번째와 마지막 비교
        const firstRank = ranks[0];
        const lastRank = ranks[ranks.length - 1];
        const change = firstRank - lastRank; // 양수면 상승, 음수면 하락
        
        weeklyStats = {
          bestRank,
          worstRank,
          avgRank,
          change,
        };
        console.log(`✅ 주간 통계 계산 완료: 최고 ${bestRank}위, 최저 ${worstRank}위, 평균 ${avgRank}위`);
      }
    }
    
    // 3. 이메일 발송
    console.log('📧 순위 리포트 이메일 발송 중...');
    const mailOptions = {
      from: `대충영어 속청 30일 <${gmailEmail}>`,
      to: adminEmail,
      subject: `📚 [대충영어] 교보문고 순위 리포트 - ${currentRank ? `${currentRank}위` : '확인 불가'}`,
      html: createRankReportTemplate(currentRank, category, weeklyStats),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ 순위 리포트 이메일 발송 완료: ${adminEmail}`);
    
  } catch (error) {
    console.error('❌ 순위 체크 및 이메일 발송 에러:', error);
  }
});
