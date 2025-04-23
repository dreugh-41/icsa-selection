// src/pages/Selector/TeamRanking.jsx
import React, { useState, useEffect } from 'react';
import { useEvent, EVENT_PHASES } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { safeGet, safeArrayLength } from '../../utils/safeFetch';

function TeamRanking() {
    const { eventState } = useEvent();
    const { user, updateUser } = useAuth();
    
    // Initialize from user's voting history for current round
    const roundKey = `round${eventState.currentRound}_ranking`;
    
    const [rankedTeams, setRankedTeams] = useState(() => {
      const savedRankings = user?.votingHistory?.[roundKey]?.rankings || [];
      // Convert team IDs back to team objects
      return savedRankings.map(teamId => 
        eventState.teams.find(t => t.id === teamId) || { id: teamId, name: 'Unknown Team' }
      );
    });
    
    const [unrankedTeams, setUnrankedTeams] = useState([]);
    
    const [isSubmitted, setIsSubmitted] = useState(() => {
      return user?.votingHistory?.[roundKey]?.submitted || false;
    });

    const [searchTerm, setSearchTerm] = useState('');

    // Calculate which rank positions qualify, become alternates, or don't qualify
    const getTeamStatus = (rank) => {
        // Check if this is an alternate selection round
        const isAlternateRound = eventState.phase === EVENT_PHASES.ALTERNATE_RANKING;
        
        if (isAlternateRound) {
            // In alternate rounds, only the top team becomes an alternate
            return rank === 1 ? "alternate" : "notQualify";
        }
        
        // Regular round logic
        const remainingBerths = eventState.remainingBerths;
        
        // Check if this is the final round (5 or 6 qualifying berths remaining)
        const isFinalRound = remainingBerths <= 6;
        
        let teamsToQualify;
        
        if (isFinalRound) {
            // Final round - qualify all remaining berths
            teamsToQualify = remainingBerths;
        } else {
            // Standard calculation - 1/3 of remaining berths
            teamsToQualify = Math.floor(remainingBerths / 3);
        
        // Calculate how many berths would be left after this round
        const berthsAfterThisRound = remainingBerths - teamsToQualify;
        
        // Check if next round would be the final round with fewer than 5 berths
        if (berthsAfterThisRound < 5) {
            // Adjust to leave exactly 6 qualifying berths for the final round
            teamsToQualify = remainingBerths - 6;
            
            // Edge case: If this calculation would result in 0 or negative teams, qualify at least 1
            if (teamsToQualify <= 0) {
            teamsToQualify = 1;
            }
        }
        }
        
        if (rank <= teamsToQualify) {
            return "qualifies";
        } else if (isFinalRound && rank > teamsToQualify && rank <= teamsToQualify + 2) {
            return "alternate";
        } else {
            return "notQualify";
        }
    };
  
  // Get status display based on rank
  const getStatusDisplay = (rank) => {
    const status = getTeamStatus(rank);
    
    if (status === "qualifies") {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          Qualifies
        </span>
      );
    } else if (status === "alternate") {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Alternate
        </span>
      );
    } else {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
          Does Not Qualify
        </span>
      );
    }
  };
    
    // Load unranked teams excluding any already ranked
    useEffect(() => {
        try {
          console.log("Ranking Group Length:", safeArrayLength(eventState.rankingGroup));
          
          if (!eventState.rankingGroup || eventState.rankingGroup.length === 0) {
            setUnrankedTeams([]);
            return;
          }
          
          // Get the ranking group (make a copy to avoid reference issues)
          const rankingGroupTeams = [...(eventState.rankingGroup || [])];
          
          // Filter out teams that are already ranked or already qualified
          const rankedTeamIds = new Set(rankedTeams.map(team => team.id));
          const qualifiedTeamIds = new Set([
            ...(eventState.qualifiedTeams || []).map(t => t.id),
            ...(eventState.pendingQualifiedTeams || []).map(t => t.id)
          ]);
          
          const availableTeams = rankingGroupTeams.filter(team => 
            !rankedTeamIds.has(team.id) && !qualifiedTeamIds.has(team.id)
          ).sort((a, b) => a.name.localeCompare(b.name));
          
          setUnrankedTeams(availableTeams);
        } catch (error) {
          console.error("Error loading unranked teams:", error);
          setUnrankedTeams([]);
        }
      }, [eventState.rankingGroup, rankedTeams, eventState.qualifiedTeams, eventState.pendingQualifiedTeams]);
    
    // Add this effect to update if user or round changes
    useEffect(() => {
      const roundKey = `round${eventState.currentRound}_ranking`;
      if (user?.votingHistory?.[roundKey]) {
        const savedRankings = user.votingHistory[roundKey].rankings || [];
        const rankedTeamObjects = savedRankings.map(teamId => 
          eventState.teams.find(t => t.id === teamId) || { id: teamId, name: 'Unknown Team' }
        );
        setRankedTeams(rankedTeamObjects);
        setIsSubmitted(user.votingHistory[roundKey].submitted || false);
      } else {
        // Reset rankings if starting a new round
        setRankedTeams([]);
        setIsSubmitted(false);
      }
    }, [user, eventState.currentRound, eventState.teams]);
    
    // Update the submit function
    const submitRankings = () => {
        try {
          // Check if all teams in the ranking group have been ranked
          const rankingGroupLength = safeArrayLength(eventState.rankingGroup);
          
          if (safeArrayLength(rankedTeams) !== rankingGroupLength) {
            alert(`Please rank all ${rankingGroupLength} teams before submitting. You've currently ranked ${safeArrayLength(rankedTeams)} teams.`);
            return;
          }
          
          // Prepare the ranking data
          const rankingData = {
            rankings: rankedTeams.map(team => team.id),
            submitted: true,
            timestamp: new Date().toISOString()
          };
          
          // Update the user's voting history for this specific round
          const updatedUser = {
            ...user,
            votingHistory: {
              ...(user?.votingHistory || {}),
              [roundKey]: rankingData
            }
          };
          
          // Save the updated user
          updateUser(updatedUser);
          
          // Mark the form as submitted
          setIsSubmitted(true);
          
          // Show success message
          alert("Your rankings have been submitted successfully!");
        } catch (error) {
          console.error("Error submitting rankings:", error);
          alert("There was an error submitting your rankings. Please try again.");
        }
      };
    
    // Handle adding a team to the ranked list
    const addToRanking = (team) => {
        if (isSubmitted) return;
        
        setRankedTeams([...rankedTeams, team]);
        setUnrankedTeams(unrankedTeams.filter(t => t.id !== team.id));
    };
    
    // Handle removing a team from the ranked list
    const removeFromRanking = (team) => {
        if (isSubmitted) return;
        
        setUnrankedTeams([...unrankedTeams, team].sort((a, b) => a.name.localeCompare(b.name)));
        setRankedTeams(rankedTeams.filter(t => t.id !== team.id));
    };
    
    // Handle moving a team up in the ranking
    const moveUp = (index) => {
        if (index === 0 || isSubmitted) return;
        
        const newRanked = [...rankedTeams];
        const temp = newRanked[index];
        newRanked[index] = newRanked[index - 1];
        newRanked[index - 1] = temp;
        setRankedTeams(newRanked);
    };
    
    // Handle moving a team down in the ranking
    const moveDown = (index) => {
        if (index === rankedTeams.length - 1 || isSubmitted) return;
        
        const newRanked = [...rankedTeams];
        const temp = newRanked[index];
        newRanked[index] = newRanked[index + 1];
        newRanked[index + 1] = temp;
        setRankedTeams(newRanked);
    };
    
    // Filter teams based on search term
    const filterTeams = (teams) => {
        if (!searchTerm.trim()) return teams;
        
        return teams.filter(team => 
            team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.csrRank.toString().includes(searchTerm)
        );
    };
    
    return (
        <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">Round {eventState.currentRound}: Team Ranking</h2>
                
                {!isSubmitted ? (
                    <>
                        {/* Instructions */}
                        <div className="mb-4 bg-blue-50 p-4 rounded-lg">
                            <p className="font-medium">Team Ranking Instructions</p>
                            <p className="text-sm text-gray-600 mt-2">
                                Add teams from the "Available Teams" list to your rankings. 
                                Use the up and down arrows to arrange them in your preferred order.
                            </p>
                            <div className="mt-3 p-2 bg-green-100 rounded-lg text-center">
                                <p className="font-medium text-green-800">
                                    The top {Math.floor(eventState.remainingBerths / 3) || 1} teams will qualify this round
                                </p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Available Teams (Unranked) */}
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="font-medium">Available Teams</h3>
                                    <div className="flex items-center">
                                        <div className="text-sm bg-blue-100 px-2 py-1 rounded mr-3">
                                            {filterTeams(unrankedTeams).length} teams
                                        </div>
                                        
                                        {/* Search Box */}
                                        <div className="relative w-60">
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search teams..."
                                                className="w-full p-2 border border-gray-300 rounded-lg pl-8 text-sm"
                                            />
                                            <div className="absolute left-2 top-2.5 text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="11" cy="11" r="8"></circle>
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border rounded-lg p-2 min-h-80 bg-gray-50">
                                    {filterTeams(unrankedTeams).map((team) => (
                                        <div
                                            key={team.id}
                                            className="mb-2 p-3 bg-white rounded border border-gray-200 flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-medium">{team.name}</p>
                                            </div>
                                            <button
                                                onClick={() => addToRanking(team)}
                                                className="p-1 bg-blue-100 rounded hover:bg-blue-200"
                                                title="Add to rankings"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    {filterTeams(unrankedTeams).length === 0 && (
                                        <div className="p-4 text-center text-gray-500 italic">
                                            {searchTerm ? 'No teams match your search' : 'All teams have been ranked'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Your Rankings */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium">Your Rankings</h3>
                                    <div className="text-sm bg-blue-100 px-2 py-1 rounded">
                                        {rankedTeams.length} teams ranked
                                    </div>
                                </div>
                                <div className="border rounded-lg p-2 min-h-80 bg-gray-50">
                                    {rankedTeams.map((team, index) => (
                                        <div
                                            key={team.id}
                                            className="mb-2 p-3 bg-white rounded border border-gray-200 flex items-center"
                                        >
                                            <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full mr-3">
                                                {index + 1}
                                            </div>
                                            <div className="flex-grow">
                                                <p className="font-medium">{team.name}</p>
                                            </div>
                                            <div className="flex flex-col space-y-1 ml-2">
                                                <button
                                                    onClick={() => moveUp(index)}
                                                    disabled={index === 0}
                                                    className={`p-1 rounded ${
                                                        index === 0 ? 'text-gray-300 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'
                                                    }`}
                                                    title="Move up"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="18 15 12 9 6 15"></polyline>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => moveDown(index)}
                                                    disabled={index === rankedTeams.length - 1}
                                                    className={`p-1 rounded ${
                                                        index === rankedTeams.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'
                                                    }`}
                                                    title="Move down"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="6 9 12 15 18 9"></polyline>
                                                    </svg>
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromRanking(team)}
                                                className="p-1 bg-red-100 rounded hover:bg-red-200 ml-2"
                                                title="Remove from rankings"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    {rankedTeams.length === 0 && (
                                        <div className="p-4 text-center text-gray-500 italic">
                                            Add teams from the available list to rank them
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Submit Button */}
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={submitRankings}
                                disabled={rankedTeams.length !== eventState.rankingGroup.length}
                                className={`px-4 py-2 rounded-lg ${
                                    rankedTeams.length === eventState.rankingGroup.length
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-gray-300 cursor-not-allowed text-gray-500'
                                }`}
                            >
                                Submit Rankings ({rankedTeams.length}/{eventState.rankingGroup.length})
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="bg-green-50 p-6 rounded-lg">
                        <h3 className="text-xl font-medium text-green-700 mb-2">Rankings Submitted</h3>
                        <p className="mb-4">Your team rankings have been recorded.</p>
                        
                        <div className="mt-4">
                            <h4 className="font-medium mb-2">Your Final Rankings:</h4>
                            <div className="space-y-2">
                                {rankedTeams.map((team, index) => (
                                    <div key={team.id} className="p-3 bg-white border border-green-200 rounded-lg flex items-center">
                                        <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full mr-3">
                                            {index + 1}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-medium">{team.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Add Change Vote button */}
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Change My Rankings
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TeamRanking;