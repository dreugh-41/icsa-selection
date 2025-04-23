// src/components/parliamentarian/RankingMonitoring.jsx
import React, { useState, useEffect } from 'react';
import { useEvent, EVENT_PHASES } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';

function RankingMonitoring() {
    const { eventState, qualifyTeams, logSelectorRankings } = useEvent();
    const { user } = useAuth();
    const [selectedTab, setSelectedTab] = useState('status'); // 'status', 'individual', or 'average'
    
    // Replace mock selectors and rankings
    const [selectors, setSelectors] = useState([]);
    const [selectorRankings, setSelectorRankings] = useState([]);
    const [averageRankings, setAverageRankings] = useState([]);
    const [qualifyingTeams, setQualifyingTeams] = useState([]);

    // Determine how many teams qualify in this round
    // Determine how many teams qualify in this round
    const remainingBerths = eventState.remainingBerths;
    const teamsToQualify = eventState.teamsToQualifyThisRound !== null
        ? eventState.teamsToQualifyThisRound
        : Math.floor(eventState.remainingBerths / 3); // Default to 1/3 of remaining berths

        const processRankings = (selectorUsers, roundKey) => {
            try {
              // Gather and process rankings
              const allRankings = [];
              selectorUsers.forEach(selector => {
                if (selector.votingHistory?.[roundKey]?.submitted) {
                  const selectorRankings = selector.votingHistory[roundKey].rankings || [];
                  
                  // Create a properly formatted ranking entry
                  allRankings.push({
                    selectorId: selector.id,
                    selectorName: selector.name,
                    rankings: selectorRankings.map((teamId, index) => {
                      const team = eventState.teams.find(t => t.id === teamId);
                      return {
                        teamId,
                        teamName: team ? team.name : 'Unknown Team',
                        csrRank: team ? team.csrRank : 0,
                        rank: index + 1
                      };
                    })
                  });
                }
              });
              
              setSelectorRankings(allRankings);
              
              // Calculate average rankings
              if (allRankings.length > 0) {
                const teamRankSums = {};
                const teamRankCounts = {};
                const teamDetails = {};
                
                // Collect all rankings
                allRankings.forEach(selector => {
                  selector.rankings.forEach(ranking => {
                    if (!teamRankSums[ranking.teamId]) {
                      teamRankSums[ranking.teamId] = 0;
                      teamRankCounts[ranking.teamId] = 0;
                      teamDetails[ranking.teamId] = {
                        teamName: ranking.teamName,
                        csrRank: ranking.csrRank,
                        rankings: []
                      };
                    }
                    
                    teamRankSums[ranking.teamId] += ranking.rank;
                    teamRankCounts[ranking.teamId]++;
                    teamDetails[ranking.teamId].rankings.push(ranking.rank);
                  });
                });
                
                // Calculate averages
                const avgRankings = Object.keys(teamRankSums).map(teamId => ({
                  teamId,
                  teamName: teamDetails[teamId].teamName,
                  csrRank: teamDetails[teamId].csrRank,
                  averageRank: (teamRankSums[teamId] / teamRankCounts[teamId]).toFixed(2),
                  rankings: teamDetails[teamId].rankings
                }));
                
                // Sort by average rank
                const sortedRankings = avgRankings.sort((a, b) => 
                  parseFloat(a.averageRank) - parseFloat(b.averageRank)
                );
                
                setAverageRankings(sortedRankings);
                
                // Determine qualifying teams
                const qualifyingTeamsList = sortedRankings.slice(0, teamsToQualify).map(team => {
                  const originalTeam = eventState.teams.find(t => t.id === team.teamId);
                  if (originalTeam) {
                    return {
                      ...originalTeam,
                      status: {
                        ...originalTeam.status,
                        isQualified: true,
                        qualificationMethod: 'RANKING',
                        qualificationRound: eventState.currentRound
                      }
                    };
                  }
                  return null;
                }).filter(Boolean);
                
                // Update qualifying teams list
                setQualifyingTeams(qualifyingTeamsList);
              }
            } catch (error) {
              console.error("Error processing rankings:", error);
            }
          };
          
          // Add this function to load selector data from Firebase
          const loadSelectorData = async () => {
            try {
              console.log("RankingMonitoring: Loading selector data from Firebase and localStorage");
              
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
              
              const roundKey = `round${eventState.currentRound}_ranking`;
              
              // Create selector status objects
              const selectorStatus = selectorUsers.map(selector => {
                // Check if this selector has submitted rankings for this round
                const hasSubmitted = selector?.votingHistory?.[roundKey]?.submitted || false;
                const timestamp = selector?.votingHistory?.[roundKey]?.timestamp || null;
                
                return {
                  id: selector.id,
                  name: selector.name,
                  hasSubmitted: hasSubmitted,
                  timestamp: timestamp
                };
              });
              
              setSelectors(selectorStatus);
              
              // Process ranking data
              processRankings(selectorUsers, roundKey);
            } catch (error) {
              console.error("Error loading selector data:", error);
            }
          };
          
          // Add a useEffect to load data initially and refresh periodically
          useEffect(() => {
            loadSelectorData();
            
            // Set up auto-refresh
            const refreshInterval = setInterval(() => {
              loadSelectorData();
            }, 10000); // Every 10 seconds
            
            return () => clearInterval(refreshInterval);
          }, [eventState.rankingGroup, eventState.currentRound]);

    // Use useEffect to load data
    useEffect(() => {
        // Load selectors from localStorage
        const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
        const selectorUsers = users.filter(u => u.role === 'selector');
        
        const roundKey = `round${eventState.currentRound}_ranking`;
        
        // Create selector status objects
        const selectorStatus = selectorUsers.map(selector => {
          // Check if this selector has submitted rankings for this round
          const hasSubmitted = selector.votingHistory?.[roundKey]?.submitted || false;
          const timestamp = selector.votingHistory?.[roundKey]?.timestamp || null;
          
          return {
            id: selector.id,
            name: selector.name,
            hasSubmitted: hasSubmitted,
            timestamp: timestamp
          };
        });
        
        setSelectors(selectorStatus);
        
        // Gather and process rankings
        const allRankings = [];
        selectorUsers.forEach(selector => {
          if (selector.votingHistory?.[roundKey]?.submitted) {
            const selectorRankings = selector.votingHistory[roundKey].rankings || [];
            
            // Create a properly formatted ranking entry
            allRankings.push({
              selectorId: selector.id,
              selectorName: selector.name,
              rankings: selectorRankings.map((teamId, index) => {
                const team = eventState.teams.find(t => t.id === teamId);
                return {
                  teamId,
                  teamName: team ? team.name : 'Unknown Team',
                  csrRank: team ? team.csrRank : 0,
                  rank: index + 1
                };
              })
            });
          }
        });
        
        setSelectorRankings(allRankings);
        
        // Calculate average rankings
        if (allRankings.length > 0) {
          const teamRankSums = {};
          const teamRankCounts = {};
          const teamDetails = {};
          
          // Collect all rankings
          allRankings.forEach(selector => {
            selector.rankings.forEach(ranking => {
              if (!teamRankSums[ranking.teamId]) {
                teamRankSums[ranking.teamId] = 0;
                teamRankCounts[ranking.teamId] = 0;
                teamDetails[ranking.teamId] = {
                  teamName: ranking.teamName,
                  csrRank: ranking.csrRank,
                  rankings: []
                };
              }
              
              teamRankSums[ranking.teamId] += ranking.rank;
              teamRankCounts[ranking.teamId]++;
              teamDetails[ranking.teamId].rankings.push(ranking.rank);
            });
          });
          
          // Calculate averages
          const avgRankings = Object.keys(teamRankSums).map(teamId => ({
            teamId,
            teamName: teamDetails[teamId].teamName,
            csrRank: teamDetails[teamId].csrRank,
            averageRank: (teamRankSums[teamId] / teamRankCounts[teamId]).toFixed(2),
            rankings: teamDetails[teamId].rankings
          }));
          
          // Sort by average rank
          const sortedRankings = avgRankings.sort((a, b) => 
            parseFloat(a.averageRank) - parseFloat(b.averageRank)
          );
          
          setAverageRankings(sortedRankings);
          
          // Determine qualifying teams
          const qualifyingTeamsList = sortedRankings.slice(0, teamsToQualify).map(team => {
            const originalTeam = eventState.teams.find(t => t.id === team.teamId);
            if (originalTeam) {
              return {
                ...originalTeam,
                status: {
                  ...originalTeam.status,
                  isQualified: true,
                  qualificationMethod: 'RANKING',
                  qualificationRound: eventState.currentRound
                }
              };
            }
            return null;
          }).filter(Boolean);
          
          // Update qualifying teams list
          setQualifyingTeams(qualifyingTeamsList);
        }
      }, [eventState.rankingGroup, eventState.currentRound, eventState.teams, teamsToQualify]);

    // Handle qualifying teams
    const finalizeQualifications = () => {
        // Check if all selectors have submitted their rankings
        const allSelectorsSubmitted = selectors.every(selector => selector.hasSubmitted);
        
        if (!allSelectorsSubmitted) {
          alert("Not all selectors have submitted their rankings yet. Please wait for all rankings to be submitted before finalizing.");
          return;
        }
        
        const remainingBerths = eventState.remainingBerths;
        
        // Determine if this is an alternate selection round
        const isAlternateRound = eventState.phase === EVENT_PHASES.ALTERNATE_RANKING;
        
        let teamsToQualify = [];
        
        if (isAlternateRound) {
          // For alternate rounds, just select the top team as an alternate
          teamsToQualify = averageRankings.slice(0, 1).map(team => {
            const originalTeam = eventState.teams.find(t => t.id === team.teamId);
            if (originalTeam) {
              return {
                ...originalTeam,
                status: {
                  ...originalTeam.status,
                  isQualified: true,
                  isAlternate: true, // Mark as alternate!
                  qualificationMethod: 'ALTERNATE',
                  qualificationRound: eventState.currentRound
                }
              };
            }
            return null;
          }).filter(Boolean);
          
          // Update our state with the newly qualified alternate
          qualifyTeams(teamsToQualify);
          logSelectorRankings(eventState.currentRound);
          
          alert(`${teamsToQualify[0]?.name || 'One team'} has been selected as an alternate!`);
        } else {
            // Regular qualification round logic
            
            // Always use the standard calculation - 1/3 of remaining berths
            let teamsToQualifyThisRound = Math.floor(remainingBerths / 3);
            
            // Handle edge case: If no teams would qualify but berths remain, ensure at least 1 does
            if (teamsToQualifyThisRound === 0 && remainingBerths > 0) {
                teamsToQualifyThisRound = 1;
            }
            
            console.log(`Qualifying ${teamsToQualifyThisRound} teams out of ${remainingBerths} remaining berths`);
            
            // Get the qualifying teams based on calculated amount
            teamsToQualify = averageRankings.slice(0, teamsToQualifyThisRound).map(team => {
                const originalTeam = eventState.teams.find(t => t.id === team.teamId);
                if (originalTeam) {
                    return {
                        ...originalTeam,
                        status: {
                            ...originalTeam.status,
                            isQualified: true,
                            qualificationMethod: 'RANKING',
                            qualificationRound: eventState.currentRound
                        }
                    };
                }
                return null;
            }).filter(Boolean);
            
            // Update our state with the newly qualified teams
            qualifyTeams(teamsToQualify);
            logSelectorRankings(eventState.currentRound);
            
            alert(`${teamsToQualifyThisRound} teams have qualified based on rankings!`);
        }
    };
    
    // Format a rank as a colorized cell
    const formatRankCell = (rank, total) => {
        // Determine color based on rank (darker green for better ranks)
        const percent = rank / total;
        let bgColor = 'bg-green-100';
        if (percent <= 0.25) bgColor = 'bg-green-200';
        if (percent <= 0.1) bgColor = 'bg-green-300';
        
        return (
            <div className={`${bgColor} rounded-lg p-2 text-center font-medium`}>
                {rank}
            </div>
        );
    };

    // Add this function right before the return statement
    // Calculate the correct number of teams to qualify this round
    const calculateTeamsToQualify = () => {
        const remainingBerths = eventState.remainingBerths;
        
        // Always use the standard calculation - 1/3 of remaining berths
        let teamsToQualify = Math.floor(remainingBerths / 3);
        
        // Handle edge case: If no teams would qualify but berths remain, ensure at least 1 does
        if (teamsToQualify === 0 && remainingBerths > 0) {
            teamsToQualify = 1;
        }
        
        return teamsToQualify;
    };

// Use this calculation for display
const calculatedTeamsToQualify = calculateTeamsToQualify();
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Round {eventState.currentRound}: Ranking Monitoring</h2>
            
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
                        Individual Rankings
                    </button>
                    <button
                        onClick={() => setSelectedTab('average')}
                        className={`py-2 px-4 font-medium ${
                            selectedTab === 'average'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Average Rankings
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
                                {selectors.filter(s => s.hasSubmitted).length} of {selectors.length} selectors have submitted rankings
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
                /* Individual Rankings Tab */
                <div>
                    <div className="mb-4 bg-blue-50 p-4 rounded-lg">
                        <p className="font-medium">Individual Selector Rankings</p>
                        <p className="text-sm text-gray-600">
                            View how each selector ranked the teams in the ranking group
                        </p>
                    </div>
                    
                    <div className="space-y-6">
                        {selectorRankings.map(selector => (
                            <div key={selector.selectorId}>
                                <h4 className="font-medium mb-2">{selector.selectorName}'s Rankings</h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Rank
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Team Name
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selector.rankings.sort((a, b) => a.rank - b.rank).map(ranking => (
                                                <tr key={ranking.teamId}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {formatRankCell(ranking.rank, selector.rankings.length)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-medium text-gray-900">{ranking.teamName}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                        
                        {selectorRankings.length === 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                                No selector rankings submitted yet
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {selectedTab === 'average' && (
                /* Average Rankings Tab */
                <div>
                    <div className="mb-4 bg-green-50 p-4 rounded-lg">
                        <p className="font-medium">Average Rankings & Qualification Status</p>
                        <p className="text-sm text-gray-600 mt-2">
                            Teams are sorted by their average rank across all selectors. 
                            The top {calculatedTeamsToQualify} teams will qualify this round.
                        </p>
                        <p className="text-sm text-gray-600">
                            {eventState.remainingBerths} berths remaining. Qualifying {calculatedTeamsToQualify} teams in this round.
                        </p>
                        {eventState.remainingBerths <= 6 && (
                            <p className="text-sm text-green-700 mt-1">
                                Final round: All remaining {eventState.remainingBerths} qualifying berths will be filled plus 2 alternates.
                            </p>
                        )}
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden mb-6">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Team Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Average Rank
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {averageRankings.map((team, index) => (
                                    <tr 
                                        key={team.teamId}
                                        className={index < teamsToQualify ? 'bg-green-50' : ''}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{team.teamName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                                            {team.averageRank}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {index < calculatedTeamsToQualify ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Qualifies
                                                </span>
                                            ) : (eventState.remainingBerths <= 6 && index >= calculatedTeamsToQualify && index < calculatedTeamsToQualify + 2) ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    Alternate
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    Does Not Qualify
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                
                                {averageRankings.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                            No rankings submitted yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Qualify Teams Button */}
                    {averageRankings.length > 0 && (
                        <div className="flex justify-end">
                            <button
                                onClick={finalizeQualifications}
                                disabled={!selectors.every(selector => selector.hasSubmitted)}
                                className={`px-4 py-2 rounded-lg ${
                                    selectors.every(selector => selector.hasSubmitted)
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-gray-300 cursor-not-allowed text-gray-500'
                                }`}
                                title={!selectors.every(selector => selector.hasSubmitted) ? 
                                    "Waiting for all selectors to submit rankings" : 
                                    "Finalize qualifying teams"}
                            >
                                Finalize Qualifying Teams
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default RankingMonitoring;