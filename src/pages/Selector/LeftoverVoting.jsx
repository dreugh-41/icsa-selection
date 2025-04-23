// src/pages/Selector/LeftoverVoting.jsx
import React, { useState, useEffect } from 'react';
import { useEvent, EVENT_PHASES } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { safeGet, safeArrayLength } from '../../utils/safeFetch';

function LeftoverVoting() {
    const { eventState } = useEvent();
    const { user, updateUser } = useAuth();
    
    // Initialize from user's voting history for current round
    const roundKey = `round${safeGet(eventState, 'currentRound', 1)}_leftover`;
    
    const [selectedTeams, setSelectedTeams] = useState(() => {
      const savedVotes = safeGet(user, `votingHistory.${roundKey}.votes`, []);
      return new Set(savedVotes);
    });
    
    const [isSubmitted, setIsSubmitted] = useState(() => {
      return safeGet(user, `votingHistory.${roundKey}.submitted`, false);
    });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [nonRankedTeams, setNonRankedTeams] = useState([]);
    const [localRankingGroup, setLocalRankingGroup] = useState([]);
    
    // Add this effect to update if user or round changes
    useEffect(() => {
      try {
        const roundKey = `round${safeGet(eventState, 'currentRound', 1)}_leftover`;
        if (safeGet(user, `votingHistory.${roundKey}`)) {
          setSelectedTeams(new Set(safeGet(user, `votingHistory.${roundKey}.votes`, [])));
          setIsSubmitted(safeGet(user, `votingHistory.${roundKey}.submitted`, false));
        } else {
          // Reset selections if starting a new round
          setSelectedTeams(new Set());
          setIsSubmitted(false);
        }
      } catch (error) {
        console.error("Error updating state from user data:", error);
        setSelectedTeams(new Set());
        setIsSubmitted(false);
      }
    }, [user, safeGet(eventState, 'currentRound', 1)]);
    
    // Create a local ranking group if one doesn't exist
    useEffect(() => {
      try {
        // Only create a local ranking group if the actual ranking group is empty AND this is after Round 1
        if ((safeArrayLength(eventState.rankingGroup) === 0) && safeGet(eventState, 'currentRound', 0) > 1) {
          console.log("Creating local ranking group for filtering");
          
          // Get qualified team IDs
          const qualifiedTeamIds = new Set();
          
          if (Array.isArray(eventState.qualifiedTeams)) {
            eventState.qualifiedTeams.forEach(team => qualifiedTeamIds.add(team.id));
          }
          
          if (Array.isArray(eventState.pendingQualifiedTeams)) {
            eventState.pendingQualifiedTeams.forEach(team => qualifiedTeamIds.add(team.id));
          }
          
          // If we're in Round 2 or later, determine size based on what it should have been after Round 1
          const teamsToTake = Math.min(
            // Use 2x what the remaining berths would have been after Round 1
            (36 - safeArrayLength(eventState.qualifiedTeams.filter(t => safeGet(t, 'status.qualificationRound') === 1))) * 2,
            // Don't exceed available teams
            safeArrayLength(safeGet(eventState, 'teams', []).filter(team => !qualifiedTeamIds.has(team.id)))
          );
          
          // Get remaining teams sorted by CSR 
          const availableTeams = safeGet(eventState, 'teams', [])
            .filter(team => !qualifiedTeamIds.has(team.id))
            .sort((a, b) => safeGet(a, 'csrRank', 0) - safeGet(b, 'csrRank', 0));
          
          const topTeams = availableTeams.slice(0, teamsToTake);
          setLocalRankingGroup(topTeams);
          console.log("Local ranking group created with", topTeams.length, "teams based on initial calculation");
        } else {
          // Use the actual ranking group if it exists
          setLocalRankingGroup(safeGet(eventState, 'rankingGroup', []));
        }
      } catch (error) {
        console.error("Error creating local ranking group:", error);
        setLocalRankingGroup([]);
      }
    }, [eventState]);
    
    // Filter teams
    useEffect(() => {
      try {
        if (!Array.isArray(safeGet(eventState, 'teams'))) return;
        
        // Determine if this is an alternate round
        const isAlternateRound = safeGet(eventState, 'phase') === EVENT_PHASES.ALTERNATE_LEFTOVER;
        
        // Get all qualified team IDs
        const qualifiedTeamIds = new Set();
        
        if (Array.isArray(eventState.qualifiedTeams)) {
          eventState.qualifiedTeams.forEach(team => qualifiedTeamIds.add(team.id));
        }
        
        if (Array.isArray(eventState.pendingQualifiedTeams)) {
          eventState.pendingQualifiedTeams.forEach(team => qualifiedTeamIds.add(team.id));
        }
        
        // Get ranking group IDs (using local ranking group)
        const rankingGroupIds = new Set();
        localRankingGroup.forEach(team => rankingGroupIds.add(team.id));
        
        // Filter teams
        const filteredTeams = safeGet(eventState, 'teams', []).filter(team => {
          return !qualifiedTeamIds.has(team.id) && !rankingGroupIds.has(team.id);
        });
        
        // Sort alphabetically
        const sortedTeams = [...filteredTeams].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        
        setNonRankedTeams(sortedTeams);
      } catch (error) {
        console.error("Error filtering teams:", error);
        setNonRankedTeams([]);
      }
    }, [eventState, localRankingGroup]);
    
    // Update the submit function
    const submitVotes = () => {
      try {
        // Prepare the voting data
        const votingData = {
          votes: Array.from(selectedTeams),
          submitted: true,
          timestamp: new Date().toISOString()
        };
        
        // Update the user's voting history for this specific round
        const updatedUser = {
          ...user,
          votingHistory: {
            ...(safeGet(user, 'votingHistory', {})),
            [roundKey]: votingData
          }
        };
        
        // Save the updated user
        updateUser(updatedUser);
        
        // Mark the form as submitted
        setIsSubmitted(true);
        
        // Show success message
        alert("Your leftover votes have been submitted successfully!");
      } catch (error) {
        console.error("Error submitting votes:", error);
        alert("An error occurred while submitting your votes. Please try again.");
      }
    };

    // Handle selecting/deselecting a team
    const toggleTeamSelection = (teamId) => {
      if (isSubmitted) return; // Prevent changes after submission
      
      setSelectedTeams(prev => {
        const newSelections = new Set(prev);
        if (newSelections.has(teamId)) {
          newSelections.delete(teamId);
        } else {
          newSelections.add(teamId);
        }
        return newSelections;
      });
    };

    // Filter teams based on search term
    const filterTeams = (teams) => {
      if (!searchTerm.trim() || !Array.isArray(teams)) return teams || [];
      
      return teams.filter(team => 
        team?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    };

    return (
        <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">Round {safeGet(eventState, 'currentRound', 1)}: Leftover Team Voting</h2>

                {isSubmitted ? (
                    <div className="bg-green-50 p-6 rounded-lg text-center">
                        <h3 className="text-xl font-medium text-green-700 mb-2">Votes Submitted</h3>
                        <p className="mb-4">Your leftover team votes have been recorded.</p>
                        {safeArrayLength([...selectedTeams]) > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                                {[...selectedTeams].map(teamId => {
                                    const team = safeGet(eventState, 'teams', []).find(t => t.id === teamId);
                                    return (
                                        <div key={teamId} className="bg-white p-3 rounded border border-green-200">
                                            {team ? team.name : teamId}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="italic text-gray-500">No teams selected for leftover voting</p>
                        )}
                        
                        {/* Add Change Vote button */}
                        <div className="mt-6">
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Change My Votes
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Instructions */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <p className="font-medium">Leftover Team Voting</p>
                            <p className="text-sm text-gray-600 mt-2">
                                You can vote for teams outside the initial ranking group that you believe should be considered for ranking.
                                Teams receiving votes from 80% or more of selectors will be added to the ranking group.
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search teams by name..."
                                    className="w-full p-3 border border-gray-300 rounded-lg pl-10"
                                />
                                <div className="absolute left-3 top-3.5 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </div>
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Available Teams List */}
                        <div className="mb-6 border rounded-lg">
                            <div className="p-3 bg-gray-50 border-b font-medium flex justify-between">
                                <div>
                                    Teams Available for Leftover Voting
                                    <span className="text-sm text-gray-500 ml-2">
                                        (Teams outside the initial ranking group)
                                    </span>
                                </div>
                                <div className="text-sm bg-blue-100 px-2 py-1 rounded">
                                    {safeArrayLength(filterTeams(nonRankedTeams))} teams
                                </div>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {safeArrayLength(filterTeams(nonRankedTeams)) > 0 ? (
                                    filterTeams(nonRankedTeams).map((team) => (
                                        <div
                                            key={team.id}
                                            className={`mb-2 p-3 bg-white rounded border ${
                                                selectedTeams.has(team.id) 
                                                    ? 'border-blue-500 bg-blue-50' 
                                                    : 'border-gray-200 hover:bg-gray-50'
                                            } flex justify-between items-center cursor-pointer`}
                                            onClick={() => toggleTeamSelection(team.id)}
                                        >
                                            <div>
                                                <p className="font-medium">{team.name}</p>
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTeams.has(team.id)}
                                                    onChange={() => toggleTeamSelection(team.id)}
                                                    className="h-5 w-5 text-blue-600"
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-500 italic">
                                        No teams match your search criteria
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={submitVotes}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Submit Leftover Votes
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default LeftoverVoting;