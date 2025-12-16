#!/usr/bin/env python3
"""
이미지 최적화 스크립트 - PNG를 WebP로 변환하고 크기 조정
"""
import os
from PIL import Image
import glob

def optimize_images(input_dir, output_dir=None, quality=85, max_width=1920):
    """
    PNG 이미지를 WebP로 변환하고 최적화

    Args:
        input_dir: 입력 이미지 디렉토리
        output_dir: 출력 디렉토리 (None이면 입력 디렉토리에 _optimized 추가)
        quality: WebP 품질 (1-100, 기본 85)
        max_width: 최대 너비 (기본 1920px)
    """
    if output_dir is None:
        output_dir = input_dir.rstrip('/') + '_optimized'

    # 출력 디렉토리 생성
    os.makedirs(output_dir, exist_ok=True)

    # PNG 파일 찾기
    png_files = sorted(glob.glob(os.path.join(input_dir, '*.png')))

    print(f"Found {len(png_files)} PNG files")
    print(f"Output directory: {output_dir}")
    print(f"Quality: {quality}, Max width: {max_width}px\n")

    total_original_size = 0
    total_optimized_size = 0

    for png_file in png_files:
        # 원본 파일 정보
        original_size = os.path.getsize(png_file)
        total_original_size += original_size

        # 이미지 열기
        img = Image.open(png_file)

        # 원본 크기
        original_width, original_height = img.size

        # 리사이징 (너비가 max_width보다 크면)
        if original_width > max_width:
            ratio = max_width / original_width
            new_width = max_width
            new_height = int(original_height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f"  Resized: {original_width}x{original_height} → {new_width}x{new_height}")

        # 파일명 생성 (.png → .webp)
        basename = os.path.basename(png_file)
        webp_filename = basename.replace('.png', '.webp')
        output_path = os.path.join(output_dir, webp_filename)

        # WebP로 저장
        img.save(output_path, 'WebP', quality=quality, method=6)

        # 최적화된 파일 크기
        optimized_size = os.path.getsize(output_path)
        total_optimized_size += optimized_size

        # 압축률 계산
        reduction = (1 - optimized_size / original_size) * 100

        print(f"✅ {basename}")
        print(f"  {original_size/1024/1024:.2f}MB → {optimized_size/1024/1024:.2f}MB (-{reduction:.1f}%)")

    # 전체 통계
    print(f"\n{'='*60}")
    print(f"Total original size: {total_original_size/1024/1024:.2f}MB")
    print(f"Total optimized size: {total_optimized_size/1024/1024:.2f}MB")
    print(f"Total reduction: {(1 - total_optimized_size / total_original_size) * 100:.1f}%")
    print(f"Saved: {(total_original_size - total_optimized_size)/1024/1024:.2f}MB")
    print(f"{'='*60}")

if __name__ == '__main__':
    # 최적화할 이미지 디렉토리 목록
    directories = [
        'docs/Marginal_Gains_Auditory_Performance_PNG',
        'docs/소리의_질_혁신_국가_전략_PNG',
        'docs/Digital_Education_Audio_Standards_PNG',
        'docs/소리_청정_공간_설계_PNG',
        'docs/근접전투_음원품질_PNG',
        'docs/대한민국_영어_해방_운동_PNG'
    ]

    for directory in directories:
        if os.path.exists(directory):
            print(f"\n{'='*60}")
            print(f"Optimizing: {directory}")
            print(f"{'='*60}")
            optimize_images(directory, quality=92, max_width=2560)
        else:
            print(f"⚠️  Directory not found: {directory}")
