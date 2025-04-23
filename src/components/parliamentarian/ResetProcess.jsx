// src/components/parliamentarian/ResetProcess.jsx
import React, { useState } from 'react';
import { useEvent } from '../../contexts/EventContext';

function ResetProcess() {
  const { resetEventState } = useEvent();
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const handleReset = () => {
    // First, clear all selector voting history
    const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
    
    // Reset voting history for all selectors
    const updatedUsers = users.map(user => {
      if (user.role === 'selector') {
        return {
          ...user,
          votingHistory: {} // Clear all voting history
        };
      }
      return user;
    });
    
    // Save the updated users back to localStorage
    localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
    
    // Now reset the event state
    resetEventState();
    setShowConfirmation(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-red-700">Reset Selection Process</h2>
      <p className="mb-4 text-gray-700">
        This will completely reset the selection process. All qualified teams, rankings, and votes will be removed.
        You will need to re-import team data from the CSR file.
      </p>
      
      {!showConfirmation ? (
        <button
          onClick={() => setShowConfirmation(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Reset Process
        </button>
      ) : (
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="font-medium text-red-800 mb-4">
            Are you sure you want to reset the entire selection process?
            This action cannot be undone.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowConfirmation(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Yes, Reset Everything
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResetProcess;