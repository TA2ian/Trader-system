import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDQmDGHSNyQYZZ4qG7FSrKVfuSU6D8wxkg",
  authDomain: "kanaan-credit-pay.firebaseapp.com",
  projectId: "kanaan-credit-pay",
  storageBucket: "kanaan-credit-pay.firebasestorage.app",
  messagingSenderId: "716898046220",
  appId: "1:716898046220:web:a78319c945c2aeb44ff929"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const firebaseLib = {
    isOffline: false,
    setOffline: (status: boolean) => { firebaseLib.isOffline = status; }
};
