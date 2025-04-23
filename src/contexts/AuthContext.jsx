// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  onAuthChange 
} from '../services/authService';
import {
  getUsers,
  saveUsers,
  onUsersChange,
  saveUserVotingHistory
} from '../services/databaseService';
import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase';

// Create the context
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load users and set up listeners on component mount
  useEffect(() => {
    // Set up auth state listener
    const unsubscribeAuth = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Get users from database
        const usersData = await getUsers();
        
        // Find the matching user in our app data
        const appUser = usersData ? Object.values(usersData).find(u => u.email === firebaseUser.email) : null;
        
        if (appUser) {
          // Update user with extra app data
          const userWithAppData = {
            ...appUser,
            id: firebaseUser.uid,
          };
          setUser(userWithAppData);
          console.log("User authenticated and loaded:", userWithAppData.role);
        } else {
          // Just use Firebase user data
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            role: 'selector', // Default role
            isActive: true,
            votingHistory: {}
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    // Set up user data listener
    const unsubscribeUsers = onUsersChange((usersData) => {
      if (usersData) {
        setAllUsers(Object.values(usersData));
      }
    });
    
    // Clean up listeners on unmount
    return () => {
      unsubscribeAuth();
      unsubscribeUsers();
    };
  }, []);

  // This function will handle updating user data
  const updateUser = async (updatedUser) => {
    try {
      console.log("AuthContext: Updating user:", updatedUser);
      
      // Update the user in state
      setUser(updatedUser);
      
      // Update the users list in local state
      const updatedUsers = allUsers.map(u => 
        u.id === updatedUser.id ? updatedUser : u
      );
      setAllUsers(updatedUsers);
      
      // Save to Firebase database - FULL USER OBJECT
      console.log("Saving updated users to Firebase");
      
      // Save the complete user object to Firebase, not just voting history
      const userRef = ref(database, `users/${updatedUser.id}`);
      await set(userRef, updatedUser); // Save the complete user object
      
      // Also save to localStorage for backup
      localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
      
      console.log("User update completed successfully");
      return true;
    } catch (error) {
      console.error("Error updating user:", error);
      return false;
    }
  };

  // Handle user login
  // Handle user login
const login = async (email, password) => {
  try {
    console.log("Login requested for:", email);
    const userCredential = await loginUser(email, password);
    
    // Get all users to find the matching one by email
    const usersData = await getUsers();
    const appUser = usersData ? Object.values(usersData).find(u => u.email === email) : null;
    
    // Return success with user data
    return { success: true, userData: appUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

  // Handle user logout
  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  // The provider gives access to the auth context to child components
  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateUser, 
      allUsers,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}