#!/usr/bin/env python3
"""
policy.html을 각 섹션별 독립 HTML 파일로 분리하는 스크립트
"""

def split_policy_html():
    # policy.html 읽기
    with open('policy.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # 각 섹션 정의
    sections = {
        'assembly': {
            'title': '국회포럼 - 소리의 질 혁신 국가 전략',
            'description': '국회 디지털 음원 품질 규제 정책 제안 - MP3 품질 개선 및 청각 환경 최적화',
            'start_marker': '<section id="parliament"',
            'end_marker': '</section>',
            'badge': '📋 국회포럼'
        },
        'education': {
            'title': '교육 분야 - 디지털 학습 환경 개선',
            'description': '교육 분야 디지털 음원 품질 규제 정책 제안 - 학습 효율 향상을 위한 고품질 음원',
            'start_marker': '<section id="education"',
            'end_marker': '</section>',
            'badge': '🎓 교육분야'
        },
        'sports': {
            'title': '체육 분야 - 올림픽 경기력 향상',
            'description': '체육 분야 디지털 음원 품질 규제 정책 제안 - 0.005초 메달 결정 환경 최적화',
            'start_marker': '<section id="sports"',
            'end_marker': '</section>',
            'badge': '🏅 체육분야'
        },
        'public': {
            'title': '공공 분야 - 청각적 미세먼지 제거',
            'description': '공공 분야 디지털 음원 품질 규제 정책 제안 - 공공장소 청각 환경 최적화',
            'start_marker': '<section id="public"',
            'end_marker': '</section>',
            'badge': '🏢 공공분야'
        },
        'defense': {
            'title': '국방 분야 - 전투력 보존 전략',
            'description': '국방 분야 디지털 음원 품질 규제 정책 제안 - 0.087초 지연 해소를 통한 전투력 향상',
            'start_marker': '<section id="defense"',
            'end_marker': '</section>',
            'badge': '⚔️ 국방분야'
        },
        'english': {
            'title': '영어해방 - 영어 교육 혁신 전략',
            'description': '영어 교육 혁신을 위한 고품질 음원 환경 구축 전략 - 발음 학습 및 AI 학습 효과 극대화',
            'start_marker': '<section id="english-liberation"',
            'end_marker': '</section>',
            'badge': '🌏 영어해방'
        }
    }

    # 각 섹션별로 HTML 파일 생성
    for section_id, section_info in sections.items():
        print(f"Creating {section_id}.html...")

        # 섹션 내용 추출
        start_idx = content.find(section_info['start_marker'])
        if start_idx == -1:
            print(f"Warning: Section {section_id} not found!")
            continue

        # 해당 섹션의 끝 찾기 (다음 섹션 시작 전까지)
        temp_content = content[start_idx:]
        # </section> 태그를 찾되, 올바른 종료 태그를 찾기 위해 중첩 레벨 추적
        section_depth = 0
        section_end_idx = start_idx
        i = 0
        while i < len(temp_content):
            if temp_content[i:i+8] == '<section':
                section_depth += 1
            elif temp_content[i:i+10] == '</section>':
                section_depth -= 1
                if section_depth == 0:
                    section_end_idx = start_idx + i + 10
                    break
            i += 1

        section_content = content[start_idx:section_end_idx]

        # HTML 헤더 부분 추출 (body 태그 전까지)
        header_end = content.find('<body>')
        header = content[:header_end]

        # title과 description 수정
        header = header.replace(
            '<title>정책 제안 - 디지털 음원 규제 및 청각 환경 개선</title>',
            f'<title>{section_info["title"]}</title>'
        )
        header = header.replace(
            '<meta name="description" content="국회·교육·체육·공공·국방 5대 분야 디지털 음원 품질 규제 및 청각 환경 최적화 정책 제안">',
            f'<meta name="description" content="{section_info["description"]}">'
        )

        # body 태그부터 main 컨텐츠 시작 전까지 (navbar 포함)
        body_start = content.find('<body>')
        main_start = content.find('<!-- Main Content -->')
        navbar_section = content[body_start:main_start]

        # Hero 섹션 수정
        hero_section = f'''
    <!-- Hero Section -->
    <section class="hero-gradient py-20 md:py-32 relative overflow-hidden" style="margin-top: 64px;">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div class="text-center">
                <span class="policy-badge badge-parliament mb-6 inline-block text-lg">{section_info["badge"]}</span>
                <h1 class="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6">
                    {section_info["title"]}
                </h1>
                <p class="text-xl md:text-2xl text-white text-opacity-90 mb-8 max-w-3xl mx-auto">
                    {section_info["description"]}
                </p>
                <a href="/policy.html" class="download-btn inline-block">
                    📋 전체 정책 보기
                </a>
            </div>
        </div>
    </section>
'''

        # Main 컨텐츠 래퍼
        main_wrapper_start = '''
    <!-- Main Content -->
    <main class="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
'''

        main_wrapper_end = '''
        </div>
    </main>
'''

        # Footer 추출
        footer_start = content.find('<!-- Footer -->')
        footer_content = content[footer_start:]

        # 최종 HTML 조합
        final_html = header + navbar_section + hero_section + main_wrapper_start + section_content + main_wrapper_end + footer_content

        # 파일 저장
        with open(f'{section_id}.html', 'w', encoding='utf-8') as f:
            f.write(final_html)

        print(f"✅ {section_id}.html created successfully")

    print("\n🎉 All section files created successfully!")

if __name__ == '__main__':
    split_policy_html()
