#!/usr/bin/env python3
"""
Chrome 확장 프로그램 아이콘 생성 스크립트
book-cover.png를 여러 사이즈로 리사이즈
"""

from PIL import Image
import os

def create_icons():
    # 원본 이미지 경로
    source_image = 'asset/book-cover.png'
    output_dir = 'chrome-extension'
    
    # 생성할 아이콘 사이즈
    sizes = [16, 48, 128]
    
    try:
        # 원본 이미지 열기
        img = Image.open(source_image)
        print(f'✅ 원본 이미지 로드: {source_image}')
        print(f'   크기: {img.size}')
        
        # 각 사이즈별로 아이콘 생성
        for size in sizes:
            # 리사이즈
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # 저장
            output_path = os.path.join(output_dir, f'icon{size}.png')
            resized.save(output_path, 'PNG')
            
            print(f'✅ 생성 완료: {output_path} ({size}x{size})')
        
        print('\n🎉 모든 아이콘 생성 완료!')
        
    except Exception as e:
        print(f'❌ 오류 발생: {e}')
        return False
    
    return True

if __name__ == '__main__':
    create_icons()

