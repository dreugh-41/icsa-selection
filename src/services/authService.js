// src/services/authService.js
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
  } from 'firebase/auth';
  import { auth } from '../firebase';
  
  // Register a new user
  export const registerUser = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };
  
  // Sign in a user
  export const loginUser = async (email, password) => {
    try {
      console.log("Attempting login for:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful:", userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error("Login error:", error.code, error.message);
      throw error;
    }
  };
  
  // Sign out a user
  export const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };
  
  // Listen for authentication state changes
  export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
  };