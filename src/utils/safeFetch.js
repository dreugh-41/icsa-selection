// src/utils/safeFetch.js
export const safeGet = (obj, path, defaultValue = null) => {
    try {
      const keys = path.split('.');
      let result = { ...obj };
      
      for (const key of keys) {
        if (result === undefined || result === null) {
          return defaultValue;
        }
        result = result[key];
      }
      
      return result === undefined ? defaultValue : result;
    } catch (error) {
      console.error(`Error accessing ${path}:`, error);
      return defaultValue;
    }
  };
  
  export const safeArrayLength = (array) => {
    if (!Array.isArray(array)) {
      return 0;
    }
    return array.length;
  };