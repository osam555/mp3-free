#!/usr/bin/env python3
"""
섹션별 HTML 파일에 소셜 미디어 메타 태그 추가
"""
import re

# 각 섹션별 정보
sections = {
    'assembly': {
        'title': '국회포럼 - 소리의 질 혁신 국가 전략',
        'description': '국회 디지털 음원 품질 규제 정책 제안 - MP3 품질 개선 및 청각 환경 최적화',
        'image': 'docs/소리의_질_혁신_국가_전략_PNG/소리의_질_혁신_국가_전략_1.webp',
        'url': 'assembly'
    },
    'education': {
        'title': '교육 분야 - 디지털 음원 교육 표준',
        'description': '교육 분야 디지털 음원 품질 규제 정책 제안 - 학습 효율 최적화',
        'image': 'docs/Digital_Education_Audio_Standards_PNG/Digital_Education_Audio_Standards_1.webp',
        'url': 'education'
    },
    'public': {
        'title': '공공 분야 - 소리 청정 공간 설계',
        'description': '공공장소 디지털 음원 품질 규제 정책 제안 - 공공 청각 환경 최적화',
        'image': 'docs/소리_청정_공간_설계_PNG/소리_청정_공간_설계_1.webp',
        'url': 'public'
    },
    'defense': {
        'title': '국방 분야 - 근접전투 음원품질',
        'description': '국방 분야 디지털 음원 품질 규제 정책 제안 - 0.1초 지연 전투 위협 최소화',
        'image': 'docs/0_PNG.1_Second_Delay_Combat_Threat/0.1_Second_Delay_Combat_Threat_1.webp',
        'url': 'defense'
    },
    'english': {
        'title': '영어해방 - 영어 교육 혁신 전략',
        'description': '영어 교육 디지털 음원 품질 규제 정책 제안 - WAV 학습 환경 최적화',
        'image': 'docs/english/Slide1.png',
        'url': 'english'
    }
}

def add_meta_tags(filename, section_info):
    """HTML 파일에 소셜 미디어 메타 태그 추가"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # 이미 메타 태그가 있는지 확인
    if 'og:image' in content:
        print(f"⚠️  {filename}: 이미 메타 태그가 있습니다")
        return False

    # description 메타 태그 찾기
    pattern = r'(<meta name="description" content="[^"]+">)\s*\n'

    # 추가할 메타 태그
    meta_tags = f'''
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://mp3-free.org/{section_info['url']}">
    <meta property="og:title" content="{section_info['title']}">
    <meta property="og:description" content="{section_info['description']}">
    <meta property="og:image" content="https://mp3-free.org/{section_info['image']}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://mp3-free.org/{section_info['url']}">
    <meta property="twitter:title" content="{section_info['title']}">
    <meta property="twitter:description" content="{section_info['description']}">
    <meta property="twitter:image" content="https://mp3-free.org/{section_info['image']}">

'''

    # description 뒤에 메타 태그 추가
    def add_tags(match):
        return match.group(1) + '\n' + meta_tags

    new_content = re.sub(pattern, add_tags, content)

    if new_content == content:
        print(f"❌ {filename}: description 메타 태그를 찾을 수 없습니다")
        return False

    # 파일 저장
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"✅ {filename}: 소셜 미디어 메타 태그 추가 완료")
    return True

if __name__ == '__main__':
    print("소셜 미디어 메타 태그 추가 중...\n")
    updated_count = 0

    for section_name, section_info in sections.items():
        filename = f"{section_name}.html"
        try:
            if add_meta_tags(filename, section_info):
                updated_count += 1
        except FileNotFoundError:
            print(f"❌ {filename}: 파일을 찾을 수 없습니다")

    print(f"\n{'='*60}")
    print(f"총 {updated_count}/{len(sections)}개 파일에 메타 태그 추가 완료")
    print(f"{'='*60}")
