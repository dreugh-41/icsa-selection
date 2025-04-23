// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAKjCipwXObAEYaScVaoV-t9y1d898vGwo",
    authDomain: "icsaselection.firebaseapp.com",
    databaseURL: "https://icsaselection-default-rtdb.firebaseio.com",
    projectId: "icsaselection",
    storageBucket: "icsaselection.firebasestorage.app",
    messagingSenderId: "390416164111",
    appId: "1:390416164111:web:9abe0b1b65ba15a19b4a7a"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
export const database = getDatabase(app);

// Get a reference to the auth service
export const auth = getAuth(app);

export default app;