// Firebase Configuration
// Firebase Console에서 가져온 실제 설정값

const firebaseConfig = {
    apiKey: "AIzaSyCQ6McIjpURTjnkprLcVTAytQZk49NG9zo",
    authDomain: "mp3-free-earlybird.firebaseapp.com",
    projectId: "mp3-free-earlybird",
    storageBucket: "mp3-free-earlybird.firebasestorage.app",
    messagingSenderId: "106269137866",
    appId: "1:106269137866:web:d45334943d0efb4cbbcd33",
    measurementId: "G-GG7BVGK6JS"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 및 Storage 인스턴스
const db = firebase.firestore();

// Storage는 admin.html에서만 사용하므로 선택적으로 초기화
let storage = null;
if (typeof firebase.storage === 'function') {
    storage = firebase.storage();
} else {
    console.warn('Firebase Storage SDK가 로드되지 않았습니다. admin.html에서만 필요합니다.');
}

// 컬렉션 참조
const applicationsRef = db.collection('earlybird_applications');

console.log('Firebase initialized successfully');
