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
  const updateUser = (updatedUser) => {
    // Update the user in state
    setUser(updatedUser);
    
    // Update the users list
    const updatedUsers = allUsers.map(u => 
      u.id === updatedUser.id ? updatedUser : u
    );
    
    // Save to Firebase
    saveUsers(updatedUsers);
    
    // Save specific voting history updates
    if (updatedUser.votingHistory) {
      saveUserVotingHistory(updatedUser.id, updatedUser.votingHistory);
    }
  };

  // Handle user login
  const login = async (email, password) => {
    try {
      console.log("Login requested for:", email);
      const user = await loginUser(email, password);
      console.log("Login successful, user data:", user);
      return { success: true, user };
    } catch (error) {
      console.error("Login error in context:", error);
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