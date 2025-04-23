// src/utils/services/logService.js
import { ref, set, get, push, remove } from 'firebase/database';
import { database } from '../../firebase';

const LOG_PATH = 'logs';

// Add a new log entry
export const addLogEntry = (type, data) => {
  try {
    // Create a new log entry with a unique ID
    const newLogRef = push(ref(database, LOG_PATH));
    
    // Create new log entry
    const newLog = {
      id: newLogRef.key,
      timestamp: new Date().toISOString(),
      type, // 'open' or 'women'
      data,
    };
    
    // Save to Firebase
    return set(newLogRef, newLog);
  } catch (error) {
    console.error('Error adding log entry:', error);
    return Promise.reject(error);
  }
};

// Get all logs
export const getAllLogs = async () => {
  try {
    const snapshot = await get(ref(database, LOG_PATH));
    if (snapshot.exists()) {
      // Convert from Firebase object to array
      const logsObj = snapshot.val();
      return Object.values(logsObj);
    }
    return [];
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return [];
  }
};

// Get logs by selection type
export const getLogsByType = async (type) => {
  try {
    const allLogs = await getAllLogs();
    return allLogs.filter(log => log.type === type);
  } catch (error) {
    console.error('Error retrieving logs by type:', error);
    return [];
  }
};

// Delete a log by ID
export const deleteLog = (logId) => {
  try {
    return remove(ref(database, `${LOG_PATH}/${logId}`));
  } catch (error) {
    console.error('Error deleting log:', error);
    return Promise.reject(error);
  }
};

// Clear all logs
export const clearAllLogs = () => {
  try {
    return remove(ref(database, LOG_PATH));
  } catch (error) {
    console.error('Error clearing logs:', error);
    return Promise.reject(error);
  }
};