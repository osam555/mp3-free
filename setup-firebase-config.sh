#!/bin/bash

# Firebase Config 설정 헬퍼 스크립트
# 사용법: ./setup-firebase-config.sh

echo "🔥 Firebase Config 설정 도우미"
echo "================================"
echo ""
echo "Firebase Console에서 프로젝트를 생성하셨나요?"
echo "1. https://console.firebase.google.com/"
echo "2. 프로젝트 추가 -> 'mp3-free' 생성"
echo "3. 웹 앱 추가 -> 'MP3 Free Website'"
echo ""
echo "Firebase SDK Config를 복사하셨나요?"
echo ""
read -p "계속하려면 Enter를 누르세요..."

echo ""
echo "Firebase SDK Config를 입력하세요:"
echo "예시: const firebaseConfig = { apiKey: \"...\", ... }"
echo ""
echo "전체 firebaseConfig 객체를 붙여넣으세요:"
read -r -d '' FIREBASE_CONFIG

if [ -z "$FIREBASE_CONFIG" ]; then
    echo "❌ Config가 입력되지 않았습니다."
    exit 1
fi

# firebase-config.js 파일 업데이트
cat > js/firebase-config.js << 'EOF'
// Firebase Configuration
// Firebase Console에서 복사한 실제 설정값

EOF

echo "$FIREBASE_CONFIG" >> js/firebase-config.js

cat >> js/firebase-config.js << 'EOF'

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 및 Storage 인스턴스
const db = firebase.firestore();
const storage = firebase.storage();

// 컬렉션 참조
const applicationsRef = db.collection('earlybird_applications');

console.log('Firebase initialized successfully');
EOF

echo ""
echo "✅ firebase-config.js가 업데이트되었습니다!"
echo ""
echo "다음 단계:"
echo "1. Firebase Console에서 Firestore Database 생성"
echo "2. Firebase Console에서 Storage 생성"
echo "3. Security Rules 적용 (QUICK_START.md 참조)"
echo "4. 로컬 테스트: python3 -m http.server 8000"
echo ""
