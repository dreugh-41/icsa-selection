// src/services/databaseService.js
import { ref, set, get, onValue, update } from 'firebase/database';
import { database } from '../firebase';

let lastSaveTime = 0;
const DEBOUNCE_TIME = 3000; // 3 seconds

// Save event state to Firebase
export const saveEventState = async (eventState) => {
    try {
      // Save ONLY to the eventState path in Firebase
      console.log("Saving event state to Firebase...");
      
      // Use this path to ONLY update event state
      await set(ref(database, 'eventState'), eventState);
      
      // Do NOT use this which would overwrite everything:
      // await set(ref(database), { eventState: eventState }); 
      
      console.log("Successfully saved event state to Firebase");
      
      // Backup to localStorage
      localStorage.setItem('sailing_nationals_event_state', JSON.stringify(eventState));
      
      return true;
    } catch (error) {
      console.error("Error saving event state to Firebase:", error);
      return false;
    }
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
export const saveUserVotingHistory = async (userId, votingHistory) => {
    try {
      console.log(`Saving voting history for user ${userId}:`, votingHistory);
      
      // Try to update Firebase first
      try {
        // Update just the voting history for this user
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, { votingHistory });
        console.log("Successfully saved voting history to Firebase");
      } catch (firebaseError) {
        console.error("Firebase write error:", firebaseError);
        // Continue to save in localStorage even if Firebase fails
      }
      
      // Always update in localStorage for backup and quicker access
      const allUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
      const updatedUsers = allUsers.map(u => {
        if (u.id === userId) {
          return { ...u, votingHistory };
        }
        return u;
      });
      localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
      
      return true;
    } catch (error) {
      console.error("Error saving voting history:", error);
      return false;
    }
  };

// Get a user's voting history
export const getUserVotingHistory = async (userId) => {
  const snapshot = await get(ref(database, `users/${userId}/votingHistory`));
  return snapshot.exists() ? snapshot.val() : {};
};

// Save all users data
export const saveUsers = async (users) => {
    try {
      console.log("Saving all users to database");
      
      // Convert users array to object if necessary
      const usersObject = Array.isArray(users) 
        ? users.reduce((acc, user) => {
            if (user.id) {
              acc[user.id] = user;
            }
            return acc;
          }, {})
        : users;
      
      // Save each user individually to their own path
      for (const userId in usersObject) {
        if (Object.prototype.hasOwnProperty.call(usersObject, userId)) {
          const userRef = ref(database, `users/${userId}`);
          await set(userRef, usersObject[userId]);
          console.log(`Saved user ${userId} to Firebase`);
        }
      }
      
      // Also update localStorage
      localStorage.setItem('sailing_nationals_users', 
                           JSON.stringify(Array.isArray(users) ? users : Object.values(usersObject)));
      
      console.log("Users saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving users:", error);
      return false;
    }
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