const axios = require('axios');

async function testAxios() {
  console.log('axios로 교보문고 페이지 테스트 중...');

  try {
    const response = await axios.get('https://product.kyobobook.co.kr/detail/S000218549943', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000,
    });

    console.log('응답 상태:', response.status);
    console.log('응답 길이:', response.data.length);

    // 순위 관련 텍스트 찾기
    const patterns = [
      /주간\s*베스트\s*외국어\s*(\d+)\s*위/i,
      /외국어\s*(\d+)\s*위/i,
      /베스트\s*(\d+)\s*위/i,
      /(\d+)\s*위/
    ];

    console.log('\n=== 정규표현식 테스트 ===');
    patterns.forEach((pattern, i) => {
      const matches = [...response.data.matchAll(pattern)];
      if (matches.length > 0) {
        console.log(`패턴 ${i+1} 매칭 (${matches.length}개):`);
        matches.slice(0, 3).forEach(match => {
          console.log(`  - "${match[0]}" (숫자: ${match[1]})`);
        });
      } else {
        console.log(`패턴 ${i+1}: 매칭 없음`);
      }
    });

    // "베스트"나 "순위" 관련 텍스트 찾기
    console.log('\n=== 베스트/순위 관련 텍스트 ===');
    const bestMatches = response.data.match(/[^<>]*(?:베스트|순위|위)[^<>]*/gi);
    if (bestMatches) {
      console.log('베스트/순위 텍스트 샘플:');
      bestMatches.slice(0, 10).forEach(match => {
        console.log(`  - ${match.trim().substring(0, 100)}`);
      });
    }

  } catch (error) {
    console.error('테스트 에러:', error.message);
  }
}

testAxios().catch(console.error);
