// src/components/parliamentarian/LeftoverVoteMonitoring.jsx
import React, { useState, useEffect } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../../firebase';

function LeftoverVoteMonitoring() {
    const { eventState, updateRankingGroup } = useEvent();
    const { user } = useAuth();
    const [selectedTab, setSelectedTab] = useState('status'); // 'status' or 'results'
    
    // In a real system, we would fetch this from the backend
    // For now, we'll use similar logic to get actual users
    const [selectors, setSelectors] = useState([]);
    const [nonRankedTeams, setNonRankedTeams] = useState([]);

    const loadDataFromFirebase = async () => {
        try {
          console.log("LeftoverVoteMonitoring: Loading data from Firebase and localStorage");
          
          // Try to get users from Firebase first
          let allUsers = [];
          try {
            const usersSnapshot = await get(ref(database, 'users'));
            if (usersSnapshot.exists()) {
              const usersData = usersSnapshot.val();
              console.log("Firebase users data:", usersData);
              
              // Convert object to array
              allUsers = Object.values(usersData);
            } else {
              console.log("No users found in Firebase");
            }
          } catch (firebaseError) {
            console.error("Error reading from Firebase:", firebaseError);
          }
          
          // If we didn't get users from Firebase, use localStorage as backup
          if (allUsers.length === 0) {
            console.log("Using localStorage for user data");
            allUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
          }
          
          // Filter for selectors
          const selectorUsers = allUsers.filter(u => u && u.role === 'selector' && u.isActive !== false);
          console.log("Found selectors:", selectorUsers.length);
          
          // Round key for the current round's leftover votes
          const roundKey = `round${eventState.currentRound}_leftover`;
          
          // Create selector status objects
          const selectorStatus = selectorUsers.map(selector => {
            // Check if this selector has leftover votes for this round
            const hasVoted = selector?.votingHistory?.[roundKey]?.submitted || false;
            const timestamp = selector?.votingHistory?.[roundKey]?.timestamp || null;
            
            console.log(`Selector ${selector.name}: leftover voted=${hasVoted}, timestamp=${timestamp}`);
            
            return {
              id: selector.id,
              name: selector.name,
              hasVoted: hasVoted,
              timestamp: timestamp
            };
          });
          
          setSelectors(selectorStatus);
          
          // Count votes for each team outside the ranking group
          const voteCounts = {};
          const votingSelectors = selectorUsers.filter(s => s.votingHistory?.[roundKey]?.submitted).length;
          
          // Get teams that aren't in the ranking group
          const teamsNotInRankingGroup = eventState.teams
            .filter(team => 
              !team.status?.isQualified && 
              !eventState.rankingGroup.some(rankedTeam => rankedTeam.id === team.id)
            );
          
          // Initialize counts
          teamsNotInRankingGroup.forEach(team => {
            voteCounts[team.id] = 0;
          });
          
          // Count votes from each selector
          selectorUsers.forEach(selector => {
            const votes = selector.votingHistory?.[roundKey]?.votes || [];
            votes.forEach(teamId => {
              if (voteCounts[teamId] !== undefined) {
                voteCounts[teamId] += 1;
              }
            });
          });
          
          // Calculate percentages
          const processedTeams = teamsNotInRankingGroup.map(team => {
            const voteCount = voteCounts[team.id] || 0;
            const votePercentage = votingSelectors > 0 
              ? Math.round((voteCount / votingSelectors) * 100)
              : 0;
            
            return {
              ...team,
              votePercentage,
              shouldAdd: votePercentage >= 80 // 80% threshold
            };
          });
          
          setNonRankedTeams(processedTeams);
          
          return true;
        } catch (error) {
          console.error("Error loading vote data:", error);
          return false;
        }
      };
      
      // Add a refresh function
      const refreshData = () => {
        loadDataFromFirebase();
      };
      
      // Add this effect to load data when the component mounts
      useEffect(() => {
        loadDataFromFirebase();
        
        // Set up periodic auto-refresh
        const refreshInterval = setInterval(() => {
          loadDataFromFirebase();
        }, 10000); // Every 10 seconds
        
        return () => clearInterval(refreshInterval);
      }, [eventState.teams, eventState.rankingGroup, eventState.currentRound]);
      
      // Add this button to your component JSX, right after the component title
      <div className="mb-4 flex justify-end">
        <button 
          onClick={refreshData}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          Refresh Data
        </button>
      </div>

const bypassSelectorCheck = () => {
    try {
      const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
      const roundKey = `round${eventState.currentRound}_leftover`;
      
      // Mark all selectors as having submitted leftover votes
      const updatedUsers = users.map(user => {
        if (user.role === 'selector') {
          // Create or update voting history for leftover votes
          const votingHistory = user.votingHistory || {};
          votingHistory[roundKey] = votingHistory[roundKey] || {};
          votingHistory[roundKey].submitted = true;
          votingHistory[roundKey].timestamp = votingHistory[roundKey].timestamp || new Date().toISOString();
          votingHistory[roundKey].votes = votingHistory[roundKey].votes || [];
          
          return {...user, votingHistory};
        }
        return user;
      });
      
      // Save back to localStorage
      localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
      console.log(`Updated all selectors to show they've submitted leftover votes for round ${eventState.currentRound}`);
      
      // Also update Firebase if possible
      try {
        updatedUsers.forEach(async (user) => {
          if (user.role === 'selector' && user.id) {
            const userRef = ref(database, `users/${user.id}`);
            const update = { 
              votingHistory: user.votingHistory 
            };
            set(userRef, update); // This is where the error occurs
          }
        });
      } catch (e) {
        console.log("Couldn't update Firebase but localStorage was updated");
      }
      
      return true;
    } catch (error) {
      console.error("Error bypassing selector check for leftover votes:", error);
      return false;
    }
  };

    // Use useEffect to load data
    useEffect(() => {
        // Load selectors from localStorage
        const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
        const selectorUsers = users.filter(u => u.role === 'selector');
        
        const roundKey = `round${eventState.currentRound}_leftover`;
        
        // Create selector status objects
        const selectorStatus = selectorUsers.map(selector => {
          // Check if this selector has leftover votes for this round
          const hasVoted = selector.votingHistory?.[roundKey]?.submitted || false;
          const timestamp = selector.votingHistory?.[roundKey]?.timestamp || null;
          
          return {
            id: selector.id,
            name: selector.name,
            hasVoted: hasVoted,
            timestamp: timestamp
          };
        });
        
        setSelectors(selectorStatus);
        
        // Count votes for each team outside the ranking group
        const voteCounts = {};
        const votingSelectors = selectorUsers.filter(s => s.votingHistory?.[roundKey]?.submitted).length;
        
        // Get teams that aren't in the ranking group
        const teamsNotInRankingGroup = eventState.teams
          .filter(team => 
            !team.status?.isQualified && 
            !eventState.rankingGroup.some(rankedTeam => rankedTeam.id === team.id)
          );
        
        // Initialize counts
        teamsNotInRankingGroup.forEach(team => {
          voteCounts[team.id] = 0;
        });
        
        // Count votes from each selector
        selectorUsers.forEach(selector => {
          const votes = selector.votingHistory?.[roundKey]?.votes || [];
          votes.forEach(teamId => {
            if (voteCounts[teamId] !== undefined) {
              voteCounts[teamId] += 1;
            }
          });
        });
        
        // Calculate percentages
        const processedTeams = teamsNotInRankingGroup.map(team => {
          const voteCount = voteCounts[team.id] || 0;
          const votePercentage = votingSelectors > 0 
            ? Math.round((voteCount / votingSelectors) * 100)
            : 0;
          
          return {
            ...team,
            votePercentage,
            shouldAdd: votePercentage >= 80 // 80% threshold
          };
        });
        
        setNonRankedTeams(processedTeams);
      }, [eventState.teams, eventState.rankingGroup, eventState.currentRound]);

    
    
    // Sort by vote percentage (highest first)
    const sortedTeamVotes = [...nonRankedTeams].sort((a, b) => b.votePercentage - a.votePercentage);
    
    // Teams that should be added to ranking group (80% or more votes)
    const teamsToAdd = sortedTeamVotes.filter(team => team.shouldAdd);
    
    // Handle adding teams to ranking group
    const finalizeAddedTeams = () => {
        // Call the bypass function first
        bypassSelectorCheck();
        // Get current ranking group
        const currentRankingGroup = [...eventState.rankingGroup];
        console.log("Current ranking group before adding teams:", currentRankingGroup.length);
        
        // Add the new teams
        const updatedRankingGroup = [...currentRankingGroup, ...teamsToAdd];
        console.log("Updated ranking group after adding teams:", updatedRankingGroup.length);
        console.log("Teams being added:", teamsToAdd.map(t => t.name).join(', '));
        
        // Update the ranking group in context
        updateRankingGroup(updatedRankingGroup);
        
        if (teamsToAdd.length === 0) {
            alert('No teams selected for addition to ranking group');
            return;
          }
          
          if (window.confirm(`Are you sure you want to add ${teamsToAdd.length} selected teams to the ranking group?`)) {
            // Get current ranking group
            const currentRankingGroup = [...eventState.rankingGroup];
            console.log("Current ranking group before adding teams:", currentRankingGroup.length);
            
            // Add the new teams
            const updatedRankingGroup = [...currentRankingGroup, ...teamsToAdd];
            console.log("Updated ranking group after adding teams:", updatedRankingGroup.length);
            console.log("Teams being added:", teamsToAdd.map(t => t.name).join(', '));
            
            // Update the ranking group in context
            updateRankingGroup(updatedRankingGroup);
            
            alert(`${teamsToAdd.length} teams have been added to the ranking group!`);
          }
        };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Leftover Vote Monitoring</h2>
            
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
                                {selectors.filter(s => s.hasVoted).length} of {selectors.length} selectors have submitted their votes
                            </p>
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                            {selectors.length > 0 ? 
                                Math.round((selectors.filter(s => s.hasVoted).length / selectors.length) * 100) :
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
                    <div className="mb-4 bg-purple-50 p-4 rounded-lg">
                        <p className="font-medium">Teams to Add to Ranking Group ({teamsToAdd.length})</p>
                        <p className="text-sm text-gray-600">
                            Teams receiving votes from 80% or more of selectors will be added to the ranking group
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
                                        className={team.shouldAdd ? 'bg-purple-50' : ''}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{team.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div 
                                                    className={`h-2.5 rounded-full ${
                                                        team.shouldAdd ? 'bg-purple-600' : 'bg-blue-600'
                                                    }`}
                                                    style={{ width: `${team.votePercentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-600 mt-1 block">
                                                {team.votePercentage}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {team.shouldAdd ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                    Add to Ranking
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    Do Not Add
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
                    
                    {/* Add Teams to Ranking Group Button */}
                    {teamsToAdd.length > 0 && (
                        <div className="flex justify-end">
                            <button
                                onClick={finalizeAddedTeams}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Add Teams to Ranking Group
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LeftoverVoteMonitoring;