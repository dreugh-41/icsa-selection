// src/components/parliamentarian/LockVoteMonitoring.jsx
import React, { useState, useEffect } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { safeGet, safeArrayLength } from '../../utils/safeFetch';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';

function LockVoteMonitoring() {
    const { eventState, qualifyTeams } = useEvent();
    const { user } = useAuth();
    const [selectedTab, setSelectedTab] = useState('status'); // 'status' or 'results'
    const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-renders
    const [isSaving, setIsSaving] = useState(false);
    const [lastLoadTime, setLastLoadTime] = useState(0);
    
    // In a real system, we would fetch this from the backend
    // For now, we'll get actual users from our auth system
    const [selectors, setSelectors] = useState([]);
    const [teamVotes, setTeamVotes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add a function to manually refresh data
    const refreshData = () => {
        setRefreshKey(prev => prev + 1);
        loadData();
    };

    useEffect(() => {
        const refreshInterval = setInterval(refreshData, 30000); // Refresh every 30 seconds
        return () => clearInterval(refreshInterval);
    }, []);

    const debugLocalStorage = () => {
        try {
          const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
          console.log("DEBUG: All users in localStorage:", users);
          
          const selectors = users.filter(u => u.role === 'selector');
          console.log("DEBUG: Selectors with round1 votes:", 
            selectors.filter(s => s?.votingHistory?.round1?.submitted).length
          );
          
          // Log detailed information for each selector
          selectors.forEach(s => {
            console.log(`Selector ${s.name} (${s.id}):`, {
              hasVotingHistory: !!s.votingHistory,
              hasRound1: !!s?.votingHistory?.round1,
              hasSubmitted: !!s?.votingHistory?.round1?.submitted,
              timestamp: s?.votingHistory?.round1?.timestamp,
              voteCount: s?.votingHistory?.round1?.lockVotes?.length || 0
            });
          });
          
          return selectors;
        } catch (error) {
          console.error("Error inspecting localStorage:", error);
          return [];
        }
      };

      const fallbackToLocalStorage = () => {
        console.log("Using localStorage as fallback");
        
        // Load all users from localStorage
        const allUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
        console.log("Found users in localStorage:", allUsers.length);
        
        const selectorUsers = allUsers.filter(u => u && u.role === 'selector');
        console.log("Found selectors in localStorage:", selectorUsers.length);
        
        // Get selector status with detailed logging
        const selectorStatus = selectorUsers.map(selector => {
          const hasVoted = selector && selector.votingHistory && 
                       selector.votingHistory.round1 && 
                       selector.votingHistory.round1.submitted || false;
          const timestamp = selector && selector.votingHistory && 
                        selector.votingHistory.round1 && 
                        selector.votingHistory.round1.timestamp || null;
          
          console.log(`Selector ${selector.name}: voted=${hasVoted}, timestamp=${timestamp}`);
          
          return {
            id: selector.id,
            name: selector.name, 
            hasVoted,
            timestamp
          };
        });
        
        setSelectors(selectorStatus);
        
        // Count each team's votes with detailed logging
        const voteCounts = {};
        const votingSelectors = selectorUsers.filter(s => s && s.votingHistory && 
                                          s.votingHistory.round1 && 
                                          s.votingHistory.round1.submitted).length;
        console.log("Selectors who voted:", votingSelectors);
        
        // If no one has voted yet, just show empty data
        if (votingSelectors === 0) {
          const emptyVotes = (eventState && eventState.teams ? eventState.teams : [])
            .filter(team => !(team && team.status && team.status.isQualified))
            .map(team => ({
              ...team,
              votePercentage: 0,
              qualifies: false
            }));
          
          setTeamVotes(emptyVotes);
          setLoading(false);
          return;
        }
        
        // Initialize vote counts for all teams
        if (eventState && eventState.teams) {
          eventState.teams.forEach(team => {
            if (team && team.id) {
              voteCounts[team.id] = 0;
            }
          });
        }
        
        // Count votes from each selector's voting history with detailed logging
        selectorUsers.forEach(selector => {
          const votes = selector && selector.votingHistory && 
                     selector.votingHistory.round1 && 
                     selector.votingHistory.round1.lockVotes || [];
          console.log(`Selector ${selector.name}: ${votes.length} lock votes`);
          
          votes.forEach(teamId => {
            if (voteCounts[teamId] !== undefined) {
              voteCounts[teamId] += 1;
            }
          });
        });
        
        // Calculate percentages and qualifies status
        const processedTeamVotes = (eventState && eventState.teams ? eventState.teams : [])
          .filter(team => !(team && team.status && team.status.isQualified))
          .map(team => {
            const voteCount = voteCounts[team.id] || 0;
            const votePercentage = votingSelectors > 0 
              ? Math.round((voteCount / votingSelectors) * 100)
              : 0;
            
            return {
              ...team,
              votePercentage,
              qualifies: votePercentage >= 60 // 60% threshold
            };
          });
        
        setTeamVotes(processedTeamVotes);
        setLoading(false);
        
        console.log("Data loading from localStorage complete");
      };

    // Separated loading logic to a function for reuse
    const loadData = async () => {
        // Debounce the loading - don't reload more than once every 5 seconds
        const now = Date.now();
        if (now - lastLoadTime < 5000) {
          console.log("Skipping load - too soon since last load");
          return;
        }
        
        // Update the last load time
        setLastLoadTime(now);
        
        try {
          setLoading(true);
          console.log("LockVoteMonitoring: Loading data from Firebase and localStorage");
          
          // Try to get users from Firebase first
          let selectorUsers = [];
          try {
            const usersSnapshot = await get(ref(database, 'users'));
            if (usersSnapshot.exists()) {
              const usersData = usersSnapshot.val();
              console.log("Firebase users data:", usersData);
              
              // Convert object to array and filter for selectors
              selectorUsers = Object.values(usersData)
                .filter(u => u && u.role === 'selector' && u.isActive !== false);
              
              console.log("Found selectors in Firebase:", selectorUsers.length);
            } else {
              console.log("No users found in Firebase");
            }
          } catch (firebaseError) {
            console.error("Error reading from Firebase:", firebaseError);
            // Continue with localStorage data
          }
          
          // If we didn't get selectors from Firebase, use localStorage as backup
          if (selectorUsers.length === 0) {
            console.log("Using localStorage for selector data");
            const allUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
            selectorUsers = allUsers.filter(u => u && u.role === 'selector' && u.isActive !== false);
          }
          
          console.log("All selector users:", selectorUsers);
          
          // Create a detailed list of selectors and their voting status
          const selectorDetails = selectorUsers.map(selector => {
            // Check for round1 voting history
            const hasRound1 = selector?.votingHistory?.round1 !== undefined;
            const isSubmitted = selector?.votingHistory?.round1?.submitted === true;
            const voteCount = selector?.votingHistory?.round1?.lockVotes?.length || 0;
            const timestamp = selector?.votingHistory?.round1?.timestamp || null;
            
            console.log(`Selector ${selector.name || 'Unknown'}: hasRound1=${hasRound1}, submitted=${isSubmitted}, votes=${voteCount}`);
            
            return {
              id: selector.id,
              name: selector.name || 'Unknown',
              hasVoted: isSubmitted, // Explicitly check for true
              timestamp,
              voteCount
            };
          });
          
          setSelectors(selectorDetails);
          
          // Count each team's votes with detailed logging
          const voteCounts = {};
          const votingSelectors = selectorUsers.filter(s => s?.votingHistory?.round1?.submitted === true).length;
          
          console.log("Selectors who voted:", votingSelectors);
          
          // If no one has voted yet, just show empty data
          if (votingSelectors === 0) {
            const emptyVotes = (eventState && eventState.teams ? eventState.teams : [])
              .filter(team => !(team && team.status && team.status.isQualified))
              .map(team => ({
                ...team,
                votePercentage: 0,
                qualifies: false
              }));
            
            setTeamVotes(emptyVotes);
            setLoading(false);
            return;
          }
          
          // Initialize vote counts for all teams
          if (eventState && eventState.teams) {
            eventState.teams.forEach(team => {
              if (team && team.id) {
                voteCounts[team.id] = 0;
              }
            });
          }
          
          // Count votes from each selector's voting history with detailed logging
          selectorUsers.forEach(selector => {
            const votes = selector?.votingHistory?.round1?.lockVotes || [];
            console.log(`Selector ${selector.name}: ${votes.length} lock votes`);
            
            votes.forEach(teamId => {
              if (voteCounts[teamId] !== undefined) {
                voteCounts[teamId] += 1;
              }
            });
          });
          
          // Calculate percentages and qualifies status
          const processedTeamVotes = (eventState && eventState.teams ? eventState.teams : [])
            .filter(team => !(team && team.status && team.status.isQualified))
            .map(team => {
              const voteCount = voteCounts[team.id] || 0;
              const votePercentage = votingSelectors > 0 
                ? Math.round((voteCount / votingSelectors) * 100)
                : 0;
              
              return {
                ...team,
                votePercentage,
                qualifies: votePercentage >= 60 // 60% threshold
              };
            });
          
          setTeamVotes(processedTeamVotes);
          setLoading(false);
          
          setLoading(false);
        } catch (error) {
            console.error("Error loading vote data:", error);
          } finally {
            setLoading(false);
          }
        };
      

    // Use useEffect to load data
    useEffect(() => {
        // Initial load
        loadData();
        
        // Set up periodic refresh with longer interval
        const refreshInterval = setInterval(() => {
          const now = Date.now();
          if (now - lastLoadTime >= 5000) {
            loadData();
          }
        }, 10000); // Check every 10 seconds, but only reload if 5 seconds have passed
        
        return () => clearInterval(refreshInterval);
      }, [eventState.teams, refreshKey]);
    
    // Add periodic automatic refresh for real-time updates
    useEffect(() => {
        const refreshInterval = setInterval(refreshData, 10000); // Refresh every 10 seconds
        return () => clearInterval(refreshInterval);
      }, []);
    
    // Teams that should be added to ranking group (60% or more votes)
    const qualifyingTeams = teamVotes.filter(team => team.qualifies);
    
    // Handle adding teams to ranking group
    const finalizeQualifiedTeams = () => {
        setIsSaving(true);
  
            try {
        console.log("Attempting to finalize qualified teams");
        console.log("Current selectors state:", selectors);
        console.log("Qualifying teams:", qualifyingTeams);
        
        // Skip the selector vote check entirely - just focus on the teams
        if (qualifyingTeams.length === 0) {
          // If no teams qualify, show a warning but allow proceeding
          if (window.confirm('No teams have received enough votes to qualify (60% threshold). Do you still want to proceed without qualifying any teams?')) {
            // Just return without qualifying any teams
            return;
          }
          return;
        }
        
        // Convert qualifying teams to the right format for our state system
        const teamsToQualify = qualifyingTeams.map(team => {
          const originalTeam = eventState.teams.find(t => t.id === team.id);
          return {
            ...originalTeam,
            status: {
              ...originalTeam.status,
              isLocked: true,
              isQualified: true,
              qualificationMethod: 'LOCK',
              qualificationRound: eventState.currentRound
            }
          };
        });
        
        // Update our state with the newly qualified teams (as pending)
        qualifyTeams(teamsToQualify);
    
            alert(`${teamsToQualify.length} teams have been qualified through lock voting! They will be officially qualified when the round is finalized.`);
        } finally {
            // Clear the flag after saving completes
            setTimeout(() => {
            setIsSaving(false);
            }, 1000);
        }
        };
    
    // Sort by vote percentage (highest first)
    const sortedTeamVotes = [...teamVotes].sort((a, b) => b.votePercentage - a.votePercentage);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Lock Vote Monitoring</h2>
            
            <div className="mb-4 bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium">Debug Info</h3>
                <button 
                    onClick={refreshData}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-2"
                >
                    Refresh Data Now
                </button>
                <div className="text-xs">
                    <p>Selectors who have voted: {selectors.filter(s => s.hasVoted).length}/{selectors.length}</p>
                    <div className="mt-2">
                    <strong>Selector Status:</strong>
                    <ul className="space-y-1 mt-1">
                        {selectors.map(s => (
                        <li key={s.id}>
                            {s.name}: {s.hasVoted ? '✅ Voted' : '❌ Not voted'} 
                            {s.timestamp ? ` at ${new Date(s.timestamp).toLocaleTimeString()}` : ''}
                        </li>
                        ))}
                    </ul>
                    </div>
                </div>
                </div>
            
            {/* Show loading state */}
            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading vote data...</p>
                    </div>
                </div>
            ) : (
                /* Tab Navigation and Content */
                <div>
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
                                onClick={() => setSelectedTab('results')}
                                className={`py-2 px-4 font-medium ${
                                    selectedTab === 'results'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Voting Results
                            </button>
                        </nav>
                    </div>
                    
                    {/* Tab Content */}
                    {selectedTab === 'status' ? (
                        /* Selector Status Tab */
                        <div>
                            <div className="mb-4 bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Selector Voting Progress</p>
                                    <p className="text-sm text-gray-600">
                                        {selectors && selectors.filter ? selectors.filter(s => s.hasVoted).length : 0} of {selectors.length} selectors have submitted their votes
                                    </p>
                                </div>
                                <div className="text-xl font-bold text-blue-600">
                                {selectors && selectors.length > 0 ? 
                                    Math.round(((selectors.filter ? selectors.filter(s => s.hasVoted).length : 0) / selectors.length) * 100) :
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
                                                    {selector.hasVoted ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Voted
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
                    ) : (
                        /* Voting Results Tab */
                        <div>
                            <div className="mb-4 bg-green-50 p-4 rounded-lg">
                                <p className="font-medium">Qualifying Teams ({qualifyingTeams.length})</p>
                                <p className="text-sm text-gray-600">
                                    Teams receiving votes from 60% or more of selectors qualify automatically
                                </p>
                            </div>
                            
                            <div className="border rounded-lg overflow-hidden mb-6">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Team Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Vote Percentage
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sortedTeamVotes
                                            .filter(team => team.votePercentage > 0) // Only show teams with votes
                                            .map(team => (
                                            <tr 
                                                key={team.id}
                                                className={team.qualifies ? 'bg-green-50' : ''}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{team.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div 
                                                            className={`h-2.5 rounded-full ${
                                                                team.qualifies ? 'bg-green-600' : 'bg-blue-600'
                                                            }`}
                                                            style={{ width: `${team.votePercentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-gray-600 mt-1 block">
                                                        {team.votePercentage}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {team.qualifies ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Qualifies
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            Does Not Qualify
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        
                                        {sortedTeamVotes.filter(team => team.votePercentage > 0).length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                                                    No teams have received votes yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Qualify Teams Button */}
                            {qualifyingTeams.length > 0 && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={finalizeQualifiedTeams}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        Finalize Qualifying Teams
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LockVoteMonitoring;