#!/usr/bin/env python3
"""
HTML 파일에서 PNG 이미지 경로를 WebP로 변경
"""
import re

def update_html_images(filename):
    """HTML 파일의 이미지 경로를 PNG에서 WebP로 변경"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # PNG를 WebP로 변경
    original_content = content
    content = re.sub(r'\.png"', '.webp"', content)

    # 변경사항이 있으면 파일 저장
    if content != original_content:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)

        # 변경된 횟수 계산
        changes = len(re.findall(r'\.webp"', content))
        print(f"✅ {filename}: {changes} images updated to WebP")
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

    print("Updating HTML files to use WebP images...\n")
    updated_count = 0

    for html_file in html_files:
        try:
            if update_html_images(html_file):
                updated_count += 1
        except FileNotFoundError:
            print(f"❌ {html_file}: File not found")

    print(f"\n{'='*60}")
    print(f"Total files updated: {updated_count}/{len(html_files)}")
    print(f"{'='*60}")
