// src/components/parliamentarian/ResetProcess.jsx
import React, { useState } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { ref, set, update } from 'firebase/database';
import { database } from '../../firebase';

function ResetProcess() {
  const { resetEventState } = useEvent();
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const handleReset = async () => {
    console.log("Reset process initiated - FULL RESET");
    
    try {
      // 1. Clear localStorage event state
      localStorage.removeItem('sailing_nationals_event_state');
      
      // 2. Get all users and completely remove their voting history
      const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
      const updatedUsers = users.map(user => ({
        ...user,
        votingHistory: undefined // Completely remove the property
      }));
      
      // 3. Save the cleaned users to localStorage
      localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
      console.log("Completely removed voting history from all users in localStorage");
      
      // 4. Update Firebase - remove voting history for each user
      try {
        // Use Promise.all to wait for all Firebase operations to complete
        await Promise.all(updatedUsers.map(async (user) => {
          if (user.id) {
            // Directly set votingHistory to null to completely remove it
            const userRef = ref(database, `users/${user.id}/votingHistory`);
            await set(userRef, null);
            console.log(`Completely removed voting history for user ${user.id} in Firebase`);
          }
        }));
        
        // 5. Clear the entire event state in Firebase
        const eventStateRef = ref(database, 'eventState');
        await set(eventStateRef, null);
        
        console.log("Reset Firebase data successfully");
      } catch (firebaseError) {
        console.error("Error resetting Firebase data:", firebaseError);
        // Continue anyway since we have localStorage updated
      }
      
      // 6. Call the context function to reset React state
      resetEventState();
      
      // 7. Force all users to refresh by setting a reset flag in localStorage
      localStorage.setItem('sailing_nationals_reset_timestamp', Date.now().toString());
      
      // 8. Add a delay then force refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      setShowConfirmation(false);
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