#!/usr/bin/env python3
"""
갤러리 이미지에 Lazy Loading 추가
"""
import re

def add_lazy_loading(filename):
    """이미지 태그에 loading="lazy" 속성 추가"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # gallery-slide 내의 img 태그에 loading="lazy" 추가 (이미 없는 경우만)
    # 첫 번째 슬라이드는 제외 (즉시 로드되어야 함)
    pattern = r'(<div class="gallery-slide"><img src="[^"]+")(\s*alt="[^"]+">)'

    def add_lazy_to_img(match):
        # 첫 번째 슬라이드인지 확인
        full_match = match.group(0)
        # loading 속성이 이미 있는지 확인
        if 'loading=' in full_match:
            return full_match
        # 첫 번째 슬라이드가 아닌 경우 loading="lazy" 추가
        return match.group(1) + ' loading="lazy"' + match.group(2)

    # 모든 gallery-slide 이미지에 lazy loading 추가
    content = re.sub(pattern, add_lazy_to_img, content)

    # 변경사항이 있으면 파일 저장
    if content != original_content:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)

        # 변경된 횟수 계산
        changes = content.count('loading="lazy"')
        print(f"✅ {filename}: {changes} images set to lazy load")
        return True
    else:
        print(f"⚠️  {filename}: No changes needed")
        return False

if __name__ == '__main__':
    html_files = [
        'policy.html',
        'assembly.html',
        'education.html',
        'sports.html',
        'public.html',
        'defense.html',
        'english.html'
    ]

    print("Adding lazy loading to gallery images...\n")
    updated_count = 0

    for html_file in html_files:
        try:
            if add_lazy_loading(html_file):
                updated_count += 1
        except FileNotFoundError:
            print(f"❌ {html_file}: File not found")

    print(f"\n{'='*60}")
    print(f"Total files updated: {updated_count}/{len(html_files)}")
    print(f"{'='*60}")
