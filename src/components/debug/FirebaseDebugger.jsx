// Create this as a temporary file: src/components/debug/FirebaseDebugger.jsx

import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';

function FirebaseDebugger() {
  const [firebaseData, setFirebaseData] = useState(null);
  const [localData, setLocalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get Firebase data
      const usersSnapshot = await get(ref(database, 'users'));
      const fbData = usersSnapshot.exists() ? usersSnapshot.val() : null;
      
      // Get localStorage data
      const localUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
      
      setFirebaseData(fbData);
      setLocalData(localUsers);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Data Comparison Debugger</h2>
      
      <button 
        onClick={fetchData}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
      >
        Refresh Data
      </button>
      
      {isLoading && <div className="text-center p-4">Loading data...</div>}
      
      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-4 text-red-700">
          Error: {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">Firebase Data</h3>
          <div className="bg-gray-50 p-3 rounded-lg">
            <pre className="whitespace-pre-wrap text-xs" style={{maxHeight: '400px', overflow: 'auto'}}>
              {firebaseData ? JSON.stringify(firebaseData, null, 2) : 'No data in Firebase'}
            </pre>
          </div>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">localStorage Data</h3>
          <div className="bg-gray-50 p-3 rounded-lg">
            <pre className="whitespace-pre-wrap text-xs" style={{maxHeight: '400px', overflow: 'auto'}}>
              {localData ? JSON.stringify(localData, null, 2) : 'No data in localStorage'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FirebaseDebugger;