// src/utils/services/logService.js
const LOG_STORAGE_KEY = 'sailing_nationals_selection_logs';

// Add a new log entry
export const addLogEntry = (type, data) => {
  try {
    // Get existing logs
    const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    
    // Create new log entry
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type, // 'open' or 'women'
      data,
    };
    
    // Add to logs and save
    logs.push(newLog);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    
    return true;
  } catch (error) {
    console.error('Error adding log entry:', error);
    return false;
  }
};

// Get all logs
export const getAllLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return [];
  }
};

// Get logs by selection type
export const getLogsByType = (type) => {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    return logs.filter(log => log.type === type);
  } catch (error) {
    console.error('Error retrieving logs by type:', error);
    return [];
  }
};

// Delete a log by ID
export const deleteLog = (logId) => {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    const updatedLogs = logs.filter(log => log.id !== logId);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updatedLogs));
    return true;
  } catch (error) {
    console.error('Error deleting log:', error);
    return false;
  }
};

// Clear all logs
export const clearAllLogs = () => {
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing logs:', error);
    return false;
  }
};