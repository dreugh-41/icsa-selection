// src/utils/services/storageService.js
const STORAGE_KEYS = {
    EVENT_STATE: 'sailing_nationals_event_state',
    USERS: 'sailing_nationals_users',
  }
  
  // Save event state to localStorage
  export const saveEventState = (eventState) => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENT_STATE, JSON.stringify(eventState));
      return true;
    } catch (error) {
      console.error('Error saving event state:', error);
      return false;
    }
  };
  
  // Load event state from localStorage
  export const loadEventState = () => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEYS.EVENT_STATE);
      return savedState ? JSON.parse(savedState) : null;
    } catch (error) {
      console.error('Error loading event state:', error);
      return null;
    }
  };
  
  // Save users data to localStorage
  export const saveUsers = (users) => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      return true;
    } catch (error) {
      console.error('Error saving users:', error);
      return false;
    }
  };
  
  // Load users data from localStorage
  export const loadUsers = () => {
    try {
      const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      return savedUsers ? JSON.parse(savedUsers) : null;
    } catch (error) {
      console.error('Error loading users:', error);
      return null;
    }
  };
  
  // Clear all saved data (for logout or testing)
  export const clearAllData = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.EVENT_STATE);
      localStorage.removeItem(STORAGE_KEYS.USERS);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  };