import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBff-H1gWqOexXzIYmC-XnapahZmhRG4zY",
  authDomain: "invoice-39143.firebaseapp.com",
  projectId: "invoice-39143",
appId: "1:881395898214:web:3e245621071885845f5aa7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
