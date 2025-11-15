const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

async function testScrape() {
  console.log('교보문고 페이지 테스트 중...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('페이지 로딩...');
    await page.goto('https://product.kyobobook.co.kr/detail/S000218549943', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('JavaScript 실행 대기...');
    await page.waitForTimeout(5000);

    const content = await page.content();
    console.log('페이지 길이:', content.length);

    const $ = cheerio.load(content);
    const bodyText = $('body').text();

    console.log('=== 페이지 텍스트 샘플 ===');
    console.log(bodyText.substring(0, 500) + '...');

    console.log('\n=== "위"가 포함된 텍스트 검색 ===');
    const rankTexts = [];
    $('*').each((i, elem) => {
      const text = $(elem).text();
      if (text.includes('위') && /\d/.test(text)) {
        rankTexts.push(text.trim());
      }
    });

    console.log('순위 관련 텍스트:', rankTexts.slice(0, 10));

    console.log('\n=== 정규표현식 테스트 ===');
    const patterns = [
      /주간\s*베스트\s*외국어\s*(\d+)\s*위/i,
      /외국어\s*(\d+)\s*위/i,
      /베스트\s*(\d+)\s*위/i
    ];

    patterns.forEach((pattern, i) => {
      const match = bodyText.match(pattern);
      console.log(`패턴 ${i+1}:`, match ? `매칭: ${match[1]}위` : '매칭 없음');
    });

  } catch (error) {
    console.error('테스트 에러:', error.message);
  } finally {
    await browser.close();
  }
}

testScrape().catch(console.error);
