// src/components/parliamentarian/SeedingAdjustments.jsx
import React, { useState, useEffect } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../../firebase';

function SeedingAdjustments() {
  const { eventState } = useEvent();
  const { user } = useAuth();
  const [eastTeams, setEastTeams] = useState([]);
  const [westTeams, setWestTeams] = useState([]);
  const [initializedTeams, setInitializedTeams] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Define the seed numbers for East division
  const eastSeeds = [1, 4, 5, 8, 9, 12, 13, 16, 17, 20, 21, 24, 25, 28, 29, 32, 33, 36];
  
  // Function to check if a seed belongs to East division
  const isEastSeed = (seed) => eastSeeds.includes(seed);

  // Initialize teams when component loads
  // In SeedingAdjustments.jsx
// Modify the useEffect for the parliamentarian view to use the same sorting logic

useEffect(() => {
  if (initializedTeams) return;
  
  console.log("Initializing teams for seeding adjustments");
  
  // Function to load teams from Firebase averageRankings
  const loadTeamsFromAverageRankings = async () => {
    try {
      console.log("Attempting to load average rankings from Firebase");
      
      // Directly get averageRankings from Firebase
      const rankingsRef = ref(database, 'averageRankings');
      const snapshot = await get(rankingsRef);
      
      if (snapshot.exists()) {
        const averageRankings = snapshot.val();
        console.log("Found average rankings in Firebase:", averageRankings.length);
        
        // Get qualified teams to match with rankings
        const qualifiedTeams = [...(eventState.qualifiedTeams || [])].filter(team => 
          !team.status.isAlternate && team.status.qualificationMethod !== 'ALTERNATE'
        );
        
        console.log("Qualified teams count:", qualifiedTeams.length);
        
        // Log the first few rankings to verify
        console.log("First 5 average rankings:", averageRankings.slice(0, 5).map(r => 
          `${r.teamName} (Avg: ${r.averageSeed})`));
        
        // Assign seeds based on the average rankings order
        const teamsWithSeeds = [];
        for (let i = 0; i < averageRankings.length; i++) {
          const ranking = averageRankings[i];
          const team = qualifiedTeams.find(t => t.id === ranking.teamId);
          
          if (team) {
            teamsWithSeeds.push({
              ...team,
              assignedSeed: i + 1,
              averageSeed: parseFloat(ranking.averageSeed)
            });
          }
        }
        
        console.log("Teams with assigned seeds count:", teamsWithSeeds.length);
        console.log("Teams in order by average ranking:");
        teamsWithSeeds.forEach((team, idx) => {
          console.log(`${idx+1}. ${team.name} (Avg: ${team.averageSeed})`);
        });
        
        // Split into East and West based on the assigned seeds
        const east = [];
        const west = [];
        
        teamsWithSeeds.forEach(team => {
          if (isEastSeed(team.assignedSeed)) {
            east.push(team);
          } else {
            west.push(team);
          }
        });
        
        // Sort each division by seed
        east.sort((a, b) => a.assignedSeed - b.assignedSeed);
        west.sort((a, b) => a.assignedSeed - b.assignedSeed);
        
        console.log("East division teams:", east.length);
        console.log("West division teams:", west.length);
        
        setEastTeams(east);
        setWestTeams(west);
        setInitializedTeams(true);
        return true;
      }
      
      console.log("No average rankings found in Firebase");
      return false;
    } catch (error) {
      console.error("Error loading average rankings from Firebase:", error);
      return false;
    }
  };
  
  // Try to load teams from Firebase averageRankings
  loadTeamsFromAverageRankings();
  
}, [eventState.qualifiedTeams, initializedTeams]);

  // Add a helper function to save adjustments
  const saveAdjustmentsToStorage = (east, west) => {
    const adjustments = {
      east,
      west,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('sailing_nationals_seeding_adjustments', JSON.stringify(adjustments));
    
    // Trigger a notification that the adjustments were saved
    const notification = {
      type: 'seeding_adjustments_updated',
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('sailing_nationals_notification', JSON.stringify(notification));
  };

  // Function to move team from East to West
  const moveToWest = (team) => {
    if (user.role !== 'parliamentarian') return;
    
    const updatedEastTeams = eastTeams.filter(t => t.id !== team.id);
    const updatedWestTeams = [...westTeams, team].sort((a, b) => a.assignedSeed - b.assignedSeed);
    
    setEastTeams(updatedEastTeams);
    setWestTeams(updatedWestTeams);
    
    // Save to Firebase immediately for real-time updates
    if (user.role === 'parliamentarian') {
      const adjustments = {
        east: updatedEastTeams,
        west: updatedWestTeams,
        timestamp: new Date().toISOString()
      };
      
      const adjustmentsRef = ref(database, 'seedingAdjustments');
      set(adjustmentsRef, adjustments)
        .then(() => console.log("Move to West saved to Firebase"))
        .catch(err => console.error("Error saving move to Firebase:", err));
    }
  };
  
  const moveToEast = (team) => {
    if (user.role !== 'parliamentarian') return;
    
    const updatedWestTeams = westTeams.filter(t => t.id !== team.id);
    const updatedEastTeams = [...eastTeams, team].sort((a, b) => a.assignedSeed - b.assignedSeed);
    
    setWestTeams(updatedWestTeams);
    setEastTeams(updatedEastTeams);
    
    // Save to Firebase immediately for real-time updates
    if (user.role === 'parliamentarian') {
      const adjustments = {
        east: updatedEastTeams,
        west: updatedWestTeams,
        timestamp: new Date().toISOString()
      };
      
      const adjustmentsRef = ref(database, 'seedingAdjustments');
      set(adjustmentsRef, adjustments)
        .then(() => console.log("Move to East saved to Firebase"))
        .catch(err => console.error("Error saving move to Firebase:", err));
    }
  };

  // Function for manual save button
  const saveAdjustments = () => {
    if (user.role !== 'parliamentarian') return;
    
    try {
      // Ensure the teams maintain their assigned seeds
      const eastWithSeeds = eastTeams.map(team => ({
        ...team,
        assignedSeed: team.assignedSeed,  // Explicitly preserve the seed
        averageSeed: team.averageSeed     // Preserve the average seed too
      }));
      
      const westWithSeeds = westTeams.map(team => ({
        ...team,
        assignedSeed: team.assignedSeed,  // Explicitly preserve the seed
        averageSeed: team.averageSeed     // Preserve the average seed too
      }));
      
      // Sort the teams explicitly by their assigned seed
      const sortedEast = [...eastWithSeeds].sort((a, b) => a.assignedSeed - b.assignedSeed);
      const sortedWest = [...westWithSeeds].sort((a, b) => a.assignedSeed - b.assignedSeed);
      
      // Log the order before saving for debugging
      console.log("East division order before saving:", sortedEast.map(t => 
        `${t.assignedSeed}. ${t.name} (avg: ${t.averageSeed})`));
      console.log("West division order before saving:", sortedWest.map(t => 
        `${t.assignedSeed}. ${t.name} (avg: ${t.averageSeed})`));
      
      // Prepare adjustments data with current timestamp
      const adjustments = {
        east: sortedEast,
        west: sortedWest,
        timestamp: new Date().toISOString()
      };
      
      // Save to Firebase first
      const adjustmentsRef = ref(database, 'seedingAdjustments');
      set(adjustmentsRef, adjustments)
        .then(() => {
          console.log("Successfully saved seeding adjustments to Firebase");
          
          // Also save to localStorage as backup
          localStorage.setItem('sailing_nationals_seeding_adjustments', JSON.stringify(adjustments));
          
          alert('Seeding adjustments have been saved successfully!');
        })
        .catch((error) => {
          console.error("Firebase error:", error);
          
          // Still save to localStorage even if Firebase fails
          localStorage.setItem('sailing_nationals_seeding_adjustments', JSON.stringify(adjustments));
          
          alert('Adjustments saved to localStorage, but there was an error saving to Firebase.');
        });
    } catch (error) {
      console.error("Error saving seeding adjustments:", error);
      alert("There was an error saving the adjustments");
    }
  };

  useEffect(() => {
    // Check Firebase for seeding adjustments
    const checkFirebaseAdjustments = async () => {
      try {
        const adjustmentsRef = ref(database, 'seedingAdjustments');
        const snapshot = await get(adjustmentsRef);
        
        if (snapshot.exists()) {
          const firebaseAdjustments = snapshot.val();
          
          // Check if newer than what we have
          const localTimestamp = localStorage.getItem('seeding_adjustments_timestamp');
          
          if (!localTimestamp || firebaseAdjustments.timestamp > localTimestamp) {
            console.log("Found newer seeding adjustments in Firebase");
            
            // Ensure teams are sorted by assignedSeed before setting state
            const sortedEast = [...firebaseAdjustments.east].sort((a, b) => a.assignedSeed - b.assignedSeed);
            const sortedWest = [...firebaseAdjustments.west].sort((a, b) => a.assignedSeed - b.assignedSeed);
            
            // Log what we found for debugging
            console.log("East from Firebase (sorted):", sortedEast.map(t => 
              `${t.assignedSeed}. ${t.name} (avg: ${t.averageSeed})`));
            
            setEastTeams(sortedEast);
            setWestTeams(sortedWest);
            
            // Update localStorage timestamp
            localStorage.setItem('seeding_adjustments_timestamp', firebaseAdjustments.timestamp);
          }
        }
      } catch (error) {
        console.error("Error checking Firebase for seeding adjustments:", error);
      }
    };
    
    // Check on component mount
    checkFirebaseAdjustments();
    
    // Set up interval to check periodically
    const interval = setInterval(checkFirebaseAdjustments, 10000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Set up listener for real-time Firebase updates
    const adjustmentsRef = ref(database, 'seedingAdjustments');
    const unsubscribe = onValue(adjustmentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const adjustments = snapshot.val();
        console.log("Real-time update: Seeding adjustments changed in Firebase");
        
        // Only update if timestamp is newer than what we have
        const currentTimestamp = localStorage.getItem('seeding_last_update');
        if (!currentTimestamp || adjustments.timestamp > currentTimestamp) {
          // Update the teams
          setEastTeams(adjustments.east || []);
          setWestTeams(adjustments.west || []);
          
          // Update last change time
          setLastUpdate(new Date(adjustments.timestamp).toLocaleTimeString());
          
          // Save the timestamp
          localStorage.setItem('seeding_last_update', adjustments.timestamp);
        }
      }
    });
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check Firebase for seeding adjustments
    const checkFirebaseAdjustments = async () => {
      try {
        const adjustmentsRef = ref(database, 'seedingAdjustments');
        const snapshot = await get(adjustmentsRef);
        
        if (snapshot.exists()) {
          const firebaseAdjustments = snapshot.val();
          
          // Check if newer than what we have
          const localTimestamp = localStorage.getItem('seeding_adjustments_timestamp');
          
          if (!localTimestamp || firebaseAdjustments.timestamp > localTimestamp) {
            console.log("Found newer seeding adjustments in Firebase");
            setEastTeams(firebaseAdjustments.east);
            setWestTeams(firebaseAdjustments.west);
            
            // Update localStorage timestamp
            localStorage.setItem('seeding_adjustments_timestamp', firebaseAdjustments.timestamp);
          }
        }
      } catch (error) {
        console.error("Error checking Firebase for seeding adjustments:", error);
      }
    };
    
    // Check on component mount
    checkFirebaseAdjustments();
    
    // Set up interval to check periodically
    const interval = setInterval(checkFirebaseAdjustments, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Add periodic check for updates (for selectors)
  useEffect(() => {
    if (user.role === 'parliamentarian') {
      // Parliamentarians don't need to check for updates since they make them
      return;
    }
    
    // Check every 5 seconds for updates
    const checkInterval = setInterval(() => {
      const savedAdjustments = localStorage.getItem('sailing_nationals_seeding_adjustments');
      
      if (savedAdjustments) {
        try {
          const { east, west, timestamp } = JSON.parse(savedAdjustments);
          
          // Check if we have a newer timestamp than our current data
          if (Array.isArray(east) && Array.isArray(west) && timestamp) {
            // Compare with last loaded timestamp
            const lastLoadedTime = localStorage.getItem('sailing_nationals_last_loaded_adjustment');
            
            if (!lastLoadedTime || timestamp > lastLoadedTime) {
              // New data is available, update
              setEastTeams(east);
              setWestTeams(west);
              localStorage.setItem('sailing_nationals_last_loaded_adjustment', timestamp);
              console.log("Updated seeding adjustments from localStorage");
            }
          }
        } catch (e) {
          console.error("Error checking for adjustment updates:", e);
        }
      }
    }, 5000);
    
    // Clean up interval on unmount
    return () => clearInterval(checkInterval);
  }, [user.role]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Championship Seeding Adjustments</h2>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="font-medium">Division Adjustments</p>
        <p className="text-sm text-gray-600 mt-2">
          Teams are divided into East and West divisions based on their seeding. 
          {user.role === 'parliamentarian' ? 
            " You can adjust which division each team belongs to while maintaining their original seeding." :
            " The parliamentarian can adjust which division each team belongs to."}
        </p>
      </div>

      {user.role !== 'parliamentarian' && lastUpdate && (
        <div className="mb-4 bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-blue-700">
            Seeding adjustments updated by parliamentarian at {lastUpdate}
            </p>
        </div>
        )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* East Division */}
        <div>
          <h3 className="font-medium mb-3 text-blue-700">East Division</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-blue-50 p-3 border-b font-medium">
              Teams: {eastTeams.length}
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {eastTeams.map(team => (
                <div 
                  key={team.id}
                  className="p-3 flex justify-between items-center hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full mr-3">
                      {team.assignedSeed}
                    </div>
                    <div>
                      <p className="font-medium">{team.name}</p>
                    </div>
                  </div>
                  {user.role === 'parliamentarian' && (
                    <button
                      onClick={() => moveToWest(team)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 p-1 rounded"
                      title="Move to West"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {eastTeams.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No teams in East division
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* West Division */}
        <div>
          <h3 className="font-medium mb-3 text-green-700">West Division</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-green-50 p-3 border-b font-medium">
              Teams: {westTeams.length}
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {westTeams.map(team => (
                <div 
                  key={team.id}
                  className="p-3 flex justify-between items-center hover:bg-gray-50"
                >
                  {user.role === 'parliamentarian' && (
                    <button
                      onClick={() => moveToEast(team)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 p-1 rounded"
                      title="Move to East"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    </button>
                  )}
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full mr-3">
                      {team.assignedSeed}
                    </div>
                    <div>
                      <p className="font-medium">{team.name}</p>
                    </div>
                  </div>
                </div>
              ))}
              {westTeams.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No teams in West division
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Save button (only for parliamentarians) */}
      {user.role === 'parliamentarian' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveAdjustments}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Save Division Adjustments
          </button>
        </div>
      )}
    </div>
  );
}

export default SeedingAdjustments;