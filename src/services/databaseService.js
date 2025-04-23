// src/services/databaseService.js
import { ref, set, get, onValue, update } from 'firebase/database';
import { database } from '../firebase';

// Save event state to Firebase
export const saveEventState = (eventState) => {
  return set(ref(database, 'eventState'), eventState);
};

// Get current event state from Firebase
export const getEventState = async () => {
  const snapshot = await get(ref(database, 'eventState'));
  return snapshot.exists() ? snapshot.val() : null;
};

// Listen for changes to event state
export const onEventStateChange = (callback) => {
  const eventStateRef = ref(database, 'eventState');
  return onValue(eventStateRef, (snapshot) => {
    callback(snapshot.val());
  });
};

// Save a user's voting history
export const saveUserVotingHistory = (userId, votingHistory) => {
  return update(ref(database, `users/${userId}`), { votingHistory });
};

// Get a user's voting history
export const getUserVotingHistory = async (userId) => {
  const snapshot = await get(ref(database, `users/${userId}/votingHistory`));
  return snapshot.exists() ? snapshot.val() : {};
};

// Save all users data
export const saveUsers = (users) => {
  return set(ref(database, 'users'), users);
};

// Get all users
export const getUsers = async () => {
  const snapshot = await get(ref(database, 'users'));
  return snapshot.exists() ? snapshot.val() : [];
};

// Listen for changes to all users
export const onUsersChange = (callback) => {
  const usersRef = ref(database, 'users');
  return onValue(usersRef, (snapshot) => {
    callback(snapshot.val());
  });
};

export const getEventStateWithRetry = async (retries = 3) => {
    let lastError;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const snapshot = await get(ref(database, 'eventState'));
        if (snapshot.exists()) {
          return snapshot.val();
        }
        return null;
      } catch (error) {
        console.error(`Attempt ${attempt + 1}/${retries} failed:`, error);
        lastError = error;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw lastError;
  };