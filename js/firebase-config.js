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
const storage = firebase.storage();

// 컬렉션 참조
const applicationsRef = db.collection('earlybird_applications');

console.log('Firebase initialized successfully');
