// src/components/parliamentarian/ResetProcess.jsx
import React, { useState } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { ref, set, update } from 'firebase/database';
import { database } from '../../firebase';

function ResetProcess() {
  const { resetEventState } = useEvent();
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const handleReset = async () => {
    try {
      // Clear Firebase event state first
      const eventStateRef = ref(database, 'eventState');
      await set(eventStateRef, null);
      console.log("Reset Firebase event state");
      
      // Clear localStorage event state
      localStorage.removeItem('sailing_nationals_event_state');
      
      // For users, only clear their voting history, not their entire data
      const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
      
      // Update each user to clear only their voting history
      const updatedUsers = users.map(user => {
        if (user.role === 'selector' && user.id) {
          return {
            ...user,
            votingHistory: {} // Reset only the voting history
          };
        }
        return user;
      });
      
      // Save updated users to localStorage
      localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
      
      // Update users in Firebase - preserve their data structure but clear voting history
      for (const user of updatedUsers) {
        if (user.id) {
          // Get reference to user's voting history specifically
          const userVotingHistoryRef = ref(database, `users/${user.id}/votingHistory`);
          // Clear only the voting history
          await set(userVotingHistoryRef, {});
          console.log(`Reset voting history for user ${user.id}`);
        }
      }
      
      // Call the context function to reset event state
      resetEventState();
      
      // Force refresh the page
      window.location.reload();
    } catch (error) {
      console.error("Error during reset process:", error);
      alert("An error occurred during reset. Please try again.");
    }
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