// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveUsers, loadUsers } from '../utils/services/storageService';

// Create the context
const AuthContext = createContext(null);

// Mock user data - in a real app, this would come from a database
const mockUsers = [
  { id: 'admin1', name: 'Admin User', email: 'admin@example.com', password: 'password', role: 'admin', isActive: true },
  { id: 'parl1', name: 'Parliamentarian User', email: 'parliamentarian@example.com', password: 'password', role: 'parliamentarian', isActive: true },
  { id: 'sel1', name: 'John Davis', email: 'selector1@example.com', password: 'password', role: 'selector', isActive: true },
  { id: 'sel2', name: 'Sarah Johnson', email: 'selector2@example.com', password: 'password', role: 'selector', isActive: true },
  { id: 'sel3', name: 'Michael Chen', email: 'selector3@example.com', password: 'password', role: 'selector', isActive: true },
  { id: 'sel4', name: 'Emma Wilson', email: 'selector4@example.com', password: 'password', role: 'selector', isActive: true },
  { id: 'sel5', name: 'Robert Martinez', email: 'selector5@example.com', password: 'password', role: 'selector', isActive: true },
];

export function AuthProvider({ children }) {
  // Initialize users if none exist
  useEffect(() => {
    const existingUsers = loadUsers();
    if (!existingUsers) {
      saveUsers(mockUsers);
    }
  }, []);

  // Load user from localStorage or set to null if not logged in
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // This function will handle updating user data
  const updateUser = (updatedUser) => {
    // Update the user in state
    setUser(updatedUser);
    
    // Save current user to localStorage
    localStorage.setItem('current_user', JSON.stringify(updatedUser));
    
    // Update the user in the users array
    const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
    const userIndex = users.findIndex(u => u.id === updatedUser.id);
    
    if (userIndex !== -1) {
      // Make sure we preserve the password since it's removed from the current user object
      const originalPassword = users[userIndex].password;
      users[userIndex] = {
        ...updatedUser,
        password: originalPassword
      };
      
      // Save the updated users array
      localStorage.setItem('sailing_nationals_users', JSON.stringify(users));
    }
  };

  // This function will handle user login
  const login = async (email, password) => {
    try {
      // Load users from storage
      const users = loadUsers() || mockUsers;
      
      // Find user with matching email and password
      const foundUser = users.find(u => 
        u.email === email && u.password === password && u.isActive
      );
      
      if (foundUser) {
        // Ensure the user has a votingHistory object
        foundUser.votingHistory = foundUser.votingHistory || {};
        
        // Create a safe user object without the password
        const safeUser = { ...foundUser };
        delete safeUser.password;
        
        // Save to state and localStorage
        setUser(safeUser);
        sessionStorage.setItem('current_user', JSON.stringify(safeUser));
        return { success: true };
      } else {
        return { success: false, error: 'Invalid email or password' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle user logout
  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('current_user');
  };

  // The provider gives access to the auth context to child components
  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
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