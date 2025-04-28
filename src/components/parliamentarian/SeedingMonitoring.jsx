// src/components/parliamentarian/SeedingMonitoring.jsx
import React, { useState, useEffect } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { addLogEntry } from '../../utils/services/logService';
import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase';

function SeedingMonitoring() {
    const { eventState } = useEvent();
    const [selectors, setSelectors] = useState([]);
    const [selectorSeedings, setSelectorSeedings] = useState([]);
    const [averageSeedings, setAverageSeedings] = useState([]);
    const [selectedTab, setSelectedTab] = useState('status'); // 'status', 'individual', or 'average'
    const {logSelectorRankings}=useEvent();

    const refreshData = () => {
        loadSelectorVotingStatus();
        // Force re-render
        setSelectedTab(selectedTab);
      };

      const processSeedings = (selectorUsers) => {
        try {
          // Gather and process seedings
          const allSeedings = [];
          selectorUsers.forEach(selector => {
            if (selector?.votingHistory?.seeding?.submitted) {
              const selectorSeedings = selector.votingHistory.seeding.rankings || [];
              
              // Create a properly formatted seeding entry
              allSeedings.push({
                selectorId: selector.id,
                selectorName: selector.name,
                seedings: selectorSeedings.map((teamId, index) => {
                  const team = eventState.teams.find(t => t.id === teamId);
                  return {
                    teamId,
                    teamName: team ? team.name : 'Unknown Team',
                    seed: index + 1
                  };
                })
              });
            }
          });
          
          setSelectorSeedings(allSeedings);
          
          // Calculate average seedings
          if (allSeedings.length > 0) {
            const teamSeedSums = {};
            const teamSeedCounts = {};
            const teamDetails = {};
            
            // Collect all seedings
            allSeedings.forEach(selector => {
              selector.seedings.forEach(seeding => {
                if (!teamSeedSums[seeding.teamId]) {
                  teamSeedSums[seeding.teamId] = 0;
                  teamSeedCounts[seeding.teamId] = 0;
                  teamDetails[seeding.teamId] = {
                    teamName: seeding.teamName,
                    seedings: []
                  };
                }
                
                teamSeedSums[seeding.teamId] += seeding.seed;
                teamSeedCounts[seeding.teamId]++;
                teamDetails[seeding.teamId].seedings.push(seeding.seed);
              });
            });
            
            // Calculate averages
            const avgSeedings = Object.keys(teamSeedSums).map(teamId => ({
              teamId,
              teamName: teamDetails[teamId].teamName,
              averageSeed: (teamSeedSums[teamId] / teamSeedCounts[teamId]).toFixed(2),
              seedings: teamDetails[teamId].seedings
            }));
            
            // Sort by average seed
            const sortedSeedings = avgSeedings.sort((a, b) => 
              parseFloat(a.averageSeed) - parseFloat(b.averageSeed)
            );
            
            console.log("Sorted seedings order:", sortedSeedings.map((t, i) => 
              `${i+1}. ${t.teamName} (Avg: ${t.averageSeed})`));
            
            setAverageSeedings(sortedSeedings);
            
            // Save this to Firebase to ensure consistency
            const averageRankingsRef = ref(database, 'averageRankings');
            set(averageRankingsRef, sortedSeedings)
              .then(() => console.log("Saved average rankings to Firebase"))
              .catch(err => console.error("Error saving average rankings:", err));
          }
        } catch (error) {
          console.error("Error processing seedings:", error);
        }
      };
    
      const loadSelectorVotingStatus = async () => {
        try {
          console.log("SeedingMonitoring: Loading selector voting status from Firebase");
          
          // Try to get users from Firebase first
          let selectorUsers = [];
          try {
            const usersSnapshot = await get(ref(database, 'users'));
            if (usersSnapshot.exists()) {
              const usersData = usersSnapshot.val();
              
              // Convert object to array and filter for selectors
              selectorUsers = Object.values(usersData)
                .filter(u => u && u.role === 'selector' && u.isActive !== false);
              
              console.log("Found selectors in Firebase:", selectorUsers.length);
            } else {
              console.log("No users found in Firebase");
            }
          } catch (firebaseError) {
            console.error("Error reading from Firebase:", firebaseError);
          }
          
          // If we didn't get selectors from Firebase, use localStorage as backup
          if (selectorUsers.length === 0) {
            console.log("Using localStorage for selector data");
            const allUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
            selectorUsers = allUsers.filter(u => u && u.role === 'selector' && u.isActive !== false);
          }
          
          // Create selector status objects
          const selectorStatus = selectorUsers.map(selector => {
            // Check if this selector has submitted seedings
            const hasSubmitted = selector?.votingHistory?.seeding?.submitted || false;
            const timestamp = selector?.votingHistory?.seeding?.timestamp || null;
            
            console.log(`Selector ${selector.name}: seeding submitted=${hasSubmitted}, timestamp=${timestamp}`);
            
            return {
              id: selector.id,
              name: selector.name,
              hasSubmitted: hasSubmitted,
              timestamp: timestamp
            };
          });
          
          setSelectors(selectorStatus);
          
          // Process seedings if there are submitted ones
          processSeedings(selectorUsers);
          
        } catch (error) {
          console.error("Error loading selector voting status:", error);
        }
      };
      
      // Add this to your useEffect
      useEffect(() => {
        loadSelectorVotingStatus();
        
        // Set up auto-refresh
        const refreshInterval = setInterval(() => {
          loadSelectorVotingStatus();
        }, 10000); // Every 10 seconds
        
        return () => clearInterval(refreshInterval);
      }, [eventState.teams]);
      

    // Add useEffect to log seeding rankings
    useEffect(() => {
    if (selectorSeedings.length > 0) {
    // This is called when seeding component loads with data
    addLogEntry(eventState.selectionType, {
        event: 'seeding_submitted',
        phase: eventState.phase,
        selectorSeedings
    });
    }
    }, [selectorSeedings]);
    
    // Use useEffect to load data
    useEffect(() => {
        // Load selectors from localStorage
        const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
        const selectorUsers = users.filter(u => u.role === 'selector');
        
        // Create selector status objects
        const selectorStatus = selectorUsers.map(selector => {
          // Check if this selector has submitted seedings
          const hasSubmitted = selector.votingHistory?.seeding?.submitted || false;
          const timestamp = selector.votingHistory?.seeding?.timestamp || null;
          
          return {
            id: selector.id,
            name: selector.name,
            hasSubmitted: hasSubmitted,
            timestamp: timestamp
          };
        });
        
        setSelectors(selectorStatus);
        
        // Gather and process seedings
        const allSeedings = [];
        selectorUsers.forEach(selector => {
          if (selector.votingHistory?.seeding?.submitted) {
            const selectorSeedings = selector.votingHistory.seeding.rankings || [];
            
            // Create a properly formatted seeding entry
            allSeedings.push({
              selectorId: selector.id,
              selectorName: selector.name,
              seedings: selectorSeedings.map((teamId, index) => {
                const team = eventState.teams.find(t => t.id === teamId);
                return {
                  teamId,
                  teamName: team ? team.name : 'Unknown Team',
                  seed: index + 1
                };
              })
            });
          }
        });
        
        setSelectorSeedings(allSeedings);
        
        // Calculate average seedings
        if (allSeedings.length > 0) {
          const teamSeedSums = {};
          const teamSeedCounts = {};
          const teamDetails = {};
          
          // Collect all seedings
          allSeedings.forEach(selector => {
            selector.seedings.forEach(seeding => {
              if (!teamSeedSums[seeding.teamId]) {
                teamSeedSums[seeding.teamId] = 0;
                teamSeedCounts[seeding.teamId] = 0;
                teamDetails[seeding.teamId] = {
                  teamName: seeding.teamName,
                  seedings: []
                };
              }
              
              teamSeedSums[seeding.teamId] += seeding.seed;
              teamSeedCounts[seeding.teamId]++;
              teamDetails[seeding.teamId].seedings.push(seeding.seed);
            });
          });
          
          // Calculate averages
          const avgSeedings = Object.keys(teamSeedSums).map(teamId => ({
            teamId,
            teamName: teamDetails[teamId].teamName,
            averageSeed: (teamSeedSums[teamId] / teamSeedCounts[teamId]).toFixed(2),
            seedings: teamDetails[teamId].seedings
          }));
          
          // Sort by average seed
          const sortedSeedings = avgSeedings.sort((a, b) => 
            parseFloat(a.averageSeed) - parseFloat(b.averageSeed)
          );
          
          setAverageSeedings(sortedSeedings);
        }



      }, [eventState.teams]);
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Championship Seeding Monitoring</h2>
            
            {/* Tab Navigation */}
            <div className="border-b mb-6">
                <nav className="flex -mb-px">
                    <button
                        onClick={() => setSelectedTab('status')}
                        className={`mr-4 py-2 px-4 font-medium ${
                            selectedTab === 'status'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Selector Status
                    </button>
                    <button
                        onClick={() => setSelectedTab('individual')}
                        className={`mr-4 py-2 px-4 font-medium ${
                            selectedTab === 'individual'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Individual Seedings
                    </button>
                    <button
                        onClick={() => setSelectedTab('average')}
                        className={`py-2 px-4 font-medium ${
                            selectedTab === 'average'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Final Seedings
                    </button>
                </nav>
            </div>
            
            {/* Tab Content */}
            {selectedTab === 'status' && (
                /* Selector Status Tab */
                <div>
                    <div className="mb-4 bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="font-medium">Selector Submission Progress</p>
                            <p className="text-sm text-gray-600">
                                {selectors.filter(s => s.hasSubmitted).length} of {selectors.length} selectors have submitted seedings
                            </p>
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                            {selectors.length > 0 ? 
                                Math.round((selectors.filter(s => s.hasSubmitted).length / selectors.length) * 100) :
                                0}%
                        </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Selector Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {selectors.map(selector => (
                                    <tr key={selector.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{selector.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                        {selector.hasSubmitted ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Submitted
                                </span>
                            ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                    Pending
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {selector.timestamp || '—'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
</div>
            )}
            
            {selectedTab === 'individual' && (
                /* Individual Seedings Tab */
                <div>
                    <div className="mb-4 bg-blue-50 p-4 rounded-lg">
                        <p className="font-medium">Individual Selector Seedings</p>
                        <p className="text-sm text-gray-600">
                            View how each selector seeded the qualified teams
                        </p>
                    </div>
                    
                    <div className="space-y-6">
                        {selectorSeedings.map(selector => (
                            <div key={selector.selectorId}>
                                <h4 className="font-medium mb-2">{selector.selectorName}'s Seedings</h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Seed
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Team Name
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selector.seedings.sort((a, b) => a.seed - b.seed).map(seeding => (
                                                <tr key={seeding.teamId}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full">
                                                            {seeding.seed}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-medium text-gray-900">{seeding.teamName}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                        
                        {selectorSeedings.length === 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                                No selector seedings submitted yet
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {selectedTab === 'average' && (
                /* Average Seedings Tab */
                <div>
                    <div className="mb-4 bg-green-50 p-4 rounded-lg">
                        <p className="font-medium">Final Championship Seedings</p>
                        <p className="text-sm text-gray-600 mt-2">
                            Teams are sorted by their average seed across all selectors.
                        </p>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden mb-6">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Seed
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Team Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Average Seed
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {averageSeedings.map((team, index) => (
                                    <tr key={team.teamId}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full font-medium">
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{team.teamName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                                            {team.averageSeed}
                                        </td>
                                    </tr>
                                ))}
                                
                                {averageSeedings.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                                            No seedings submitted yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SeedingMonitoring;