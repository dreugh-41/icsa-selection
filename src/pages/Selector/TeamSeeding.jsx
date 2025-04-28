// src/pages/Selector/TeamSeeding.jsx
import React, { useState, useEffect } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { safeGet, safeArrayLength } from '../../utils/safeFetch';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../firebase';

function TeamSeeding() {
    const { eventState } = useEvent();
    const { user, updateUser } = useAuth();
    
    // State for teams and drag/drop
    const [qualifiedTeams, setQualifiedTeams] = useState([]);
    const [rankedTeams, setRankedTeams] = useState([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [nonAlternateCount, setNonAlternateCount] = useState(36);
    const [otherSelectorSeedings, setOtherSelectorSeedings] = useState([]);
    const [averageSeedings, setAverageSeedings] = useState([]);
    
    // Initialize when component loads
    useEffect(() => {
        try {
            // Combine qualifiedTeams and pendingQualifiedTeams into one array
            const allQualifiedTeams = [
                ...(safeGet(eventState, 'qualifiedTeams', [])),
                ...(safeGet(eventState, 'pendingQualifiedTeams', []))
            ];
            
            // Filter out alternates and sort alphabetically
            const nonAlternates = allQualifiedTeams.filter(team => 
                !safeGet(team, 'status.isAlternate', false) && 
                safeGet(team, 'status.qualificationMethod') !== 'ALTERNATE'
            );
            
            const sortedTeams = [...nonAlternates].sort((a, b) => 
                a.name.localeCompare(b.name)
            );
            
            setQualifiedTeams(sortedTeams);
            
            // Check if user has already submitted seeding
            const hasSubmitted = safeGet(user, 'votingHistory.seeding.submitted', false);
            setIsSubmitted(hasSubmitted);

            // Calculate non-alternate count
            const count = allQualifiedTeams.filter(team => 
                !safeGet(team, 'status.isAlternate', false) && 
                safeGet(team, 'status.qualificationMethod') !== 'ALTERNATE'
            ).length;
            setNonAlternateCount(count);
            
            // If user has already submitted, load their rankings
            if (hasSubmitted && Array.isArray(safeGet(user, 'votingHistory.seeding.rankings'))) {
                const teamIds = safeGet(user, 'votingHistory.seeding.rankings', []);
                const rankedTeamsList = teamIds.map(id => {
                    return nonAlternates.find(team => team.id === id) || { id, name: 'Unknown Team' };
                });
                setRankedTeams(rankedTeamsList);
                setQualifiedTeams([]);
            }

            if (hasSubmitted) {
                const allUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
                const selectorUsers = allUsers.filter(u => 
                    u.role === 'selector' && 
                    u.id !== safeGet(user, 'id') && 
                    safeGet(u, 'votingHistory.seeding.submitted')
                );
                
                // Get seeding rankings from other selectors
                const otherSeedings = selectorUsers.map(selector => {
                    const rankings = safeGet(selector, 'votingHistory.seeding.rankings', []);
                    // Map team IDs to actual team objects
                    const rankedTeams = rankings.map(teamId => {
                        const team = nonAlternates.find(t => t.id === teamId);
                        return team ? { 
                            id: teamId, 
                            name: team.name,
                            selectorId: selector.id,
                            selectorName: selector.name
                        } : null;
                    }).filter(Boolean);
                    
                    return {
                        selectorId: selector.id,
                        selectorName: selector.name,
                        rankings: rankedTeams
                    };
                });
                
                setOtherSelectorSeedings(otherSeedings);
                
                // Calculate average seedings across all selectors
                // Include current user's rankings
                const allSelectors = [
                    {
                        selectorId: safeGet(user, 'id'),
                        rankings: safeGet(user, 'votingHistory.seeding.rankings', [])
                    },
                    ...selectorUsers.map(selector => ({
                        selectorId: selector.id,
                        rankings: safeGet(selector, 'votingHistory.seeding.rankings', [])
                    }))
                ];
                
                // Collect all rankings to calculate averages
                const teamRankSums = {};
                const teamRankCounts = {};
                
                allSelectors.forEach(selector => {
                    selector.rankings.forEach((teamId, index) => {
                        if (!teamRankSums[teamId]) {
                            teamRankSums[teamId] = 0;
                            teamRankCounts[teamId] = 0;
                        }
                        
                        teamRankSums[teamId] += (index + 1); // Add rank (1-based)
                        teamRankCounts[teamId]++;
                    });
                });
                
                // Calculate average seedings
                const averages = Object.keys(teamRankSums).map(teamId => {
                    const team = nonAlternates.find(t => t.id === teamId);
                    return {
                        id: teamId,
                        name: team ? team.name : 'Unknown Team',
                        averageSeed: teamRankCounts[teamId] > 0 
                            ? (teamRankSums[teamId] / teamRankCounts[teamId]).toFixed(2)
                            : "N/A"
                    };
                });
                
                // Sort by average seed
                const sortedAverages = averages.sort((a, b) => {
                    const aVal = parseFloat(a.averageSeed);
                    const bVal = parseFloat(b.averageSeed);
                    return isNaN(aVal) || isNaN(bVal) ? 0 : aVal - bVal;
                });
                
                setAverageSeedings(sortedAverages);
            }
        } catch (error) {
            console.error("Error initializing TeamSeeding:", error);
            setQualifiedTeams([]);
            setRankedTeams([]);
        }
    }, [eventState, user]);
    
    // Add a team to the rankings
    const addToRanking = (team) => {
        if (isSubmitted) return;
        
        setRankedTeams([...rankedTeams, team]);
        setQualifiedTeams(qualifiedTeams.filter(t => t.id !== team.id));
    };
    
    // Remove a team from the rankings
    const removeFromRanking = (team) => {
        if (isSubmitted) return;
        
        setQualifiedTeams([...qualifiedTeams, team].sort((a, b) => a.name.localeCompare(b.name)));
        setRankedTeams(rankedTeams.filter(t => t.id !== team.id));
    };
    
    // Move a team up in the rankings
    const moveUp = (index) => {
        if (index === 0 || isSubmitted) return;
        
        const newRanked = [...rankedTeams];
        const temp = newRanked[index];
        newRanked[index] = newRanked[index - 1];
        newRanked[index - 1] = temp;
        setRankedTeams(newRanked);
    };
    
    // Move a team down in the rankings
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
        if (!searchTerm.trim() || !Array.isArray(teams)) return teams || [];
        
        return teams.filter(team => 
            team?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };
    
    // Submit seeding rankings
    const submitSeeding = () => {
        try {
            // Count the total number of non-alternate qualified teams
            const nonAlternateCount = [...safeGet(eventState, 'qualifiedTeams', []), ...safeGet(eventState, 'pendingQualifiedTeams', [])]
                .filter(team => !safeGet(team, 'status.isAlternate', false) && safeGet(team, 'status.qualificationMethod') !== 'ALTERNATE')
                .length;
            
            if (safeArrayLength(rankedTeams) !== nonAlternateCount) {
                alert(`Please rank all ${nonAlternateCount} qualified teams before submitting.`);
                return;
            }
            
            // Explicitly rank teams by the order they appear in rankedTeams
            // This is where average seeding comes from
            const rankings = rankedTeams.map(team => team.id);
            
            console.log("Submitting seeding in this order:", 
                rankedTeams.map((team, i) => `${i+1}. ${team.name}`));
            
            // Prepare the seeding data
            const seedingData = {
                rankings: rankings,
                submitted: true,
                timestamp: new Date().toISOString()
            };
            
            // Update the user's voting history for seeding
            const updatedUser = {
                ...user,
                votingHistory: {
                    ...(safeGet(user, 'votingHistory', {})),
                    seeding: seedingData
                }
            };
            
            // Save the updated user - ensure we're only updating the seeding path
            const userSeedingRef = ref(database, `users/${user.id}/votingHistory/seeding`);
            set(userSeedingRef, seedingData)
                .then(() => {
                    console.log("Successfully saved seeding to Firebase");
                    
                    // Also update in localStorage
                    const allUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
                    const updatedUsers = allUsers.map(u => {
                        if (u.id === user.id) {
                            return {
                                ...u,
                                votingHistory: {
                                    ...(u.votingHistory || {}),
                                    seeding: seedingData
                                }
                            };
                        }
                        return u;
                    });
                    localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
                    
                    // Mark the form as submitted
                    setIsSubmitted(true);
                    
                    // Show success message
                    alert("Your seeding rankings have been submitted successfully!");
                })
                .catch(error => {
                    console.error("Error saving to Firebase:", error);
                    alert("An error occurred while submitting your seedings. Please try again.");
                });
        } catch (error) {
            console.error("Error submitting seeding:", error);
            alert("An error occurred while submitting your seedings. Please try again.");
        }
    };
    
    return (
        <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">Seeding Rankings</h2>
                
                {isSubmitted ? (
                    <div className="bg-green-50 p-6 rounded-lg">
                        <h3 className="text-xl font-medium text-green-700 mb-2">Seeding Submitted</h3>
                        <p className="mb-4">Your seeding rankings have been recorded.</p>
                        
                        <div className="mt-4">
                            <h4 className="font-medium mb-2">Your Final Seedings:</h4>
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
                            {/* Add Change Seedings button */}
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => setIsSubmitted(false)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Change My Seedings
                                </button>
                            </div>
                            {averageSeedings.length > 0 && (
                                <div className="mt-8 border-t pt-6">
                                    <h4 className="font-medium mb-4">Average Seedings (All Selectors)</h4>
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-purple-50 p-3 border-b font-medium">
                                            Consensus Seeding Order
                                        </div>
                                        <div className="p-3 max-h-80 overflow-y-auto">
                                            <div className="space-y-2">
                                                {averageSeedings.map((team, index) => (
                                                    <div key={team.id} className="p-2 bg-white border rounded flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <div className="w-8 h-8 flex items-center justify-center bg-purple-100 rounded-full mr-3">
                                                                {index + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{team.name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-gray-600 font-medium">
                                                            Avg: {team.averageSeed}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {otherSelectorSeedings.length > 0 && (
                                <div className="mt-8 border-t pt-6">
                                    <h4 className="font-medium mb-4">Other Selectors' Seedings</h4>
                                    <div className="space-y-6">
                                        {otherSelectorSeedings.map(selector => (
                                            <div key={selector.selectorId} className="border rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 p-3 border-b font-medium">
                                                    {selector.selectorName}'s Seedings
                                                </div>
                                                <div className="p-3 max-h-64 overflow-y-auto">
                                                    <div className="space-y-2">
                                                        {selector.rankings.slice(0, 10).map((team, index) => (
                                                            <div key={team.id} className="p-2 bg-white border rounded flex items-center">
                                                                <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full mr-3">
                                                                    {index + 1}
                                                                </div>
                                                                <div className="flex-grow">
                                                                    <p className="font-medium">{team.name}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {selector.rankings.length > 10 && (
                                                            <div className="text-center text-gray-500 italic p-2">
                                                                Showing top 10 seeds only. {selector.rankings.length - 10} more teams ranked.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {otherSelectorSeedings.length === 0 && (
                                <div className="mt-8 border-t pt-6">
                                    <p className="text-center text-gray-500 italic">
                                        No other selectors have submitted their seedings yet.
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        
                    </div>
                ) : (
                    <>
                        {/* Instructions */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <p className="font-medium">Seeding Instructions</p>
                            <p className="text-sm text-gray-600 mt-2">
                                Please rank all 36 qualified teams in order of their strength. 
                                These rankings will be used to seed the teams for the Championship.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Available Teams (Unranked) */}
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="font-medium">Qualified Teams</h3>
                                    <div className="flex items-center">
                                        <div className="text-sm bg-blue-100 px-2 py-1 rounded mr-3">
                                            {filterTeams(qualifiedTeams).length} teams
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
                                    {filterTeams(qualifiedTeams).map((team) => (
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
                                    {filterTeams(qualifiedTeams).length === 0 && (
                                        <div className="p-4 text-center text-gray-500 italic">
                                            {searchTerm ? 'No teams match your search' : 'All teams have been ranked'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Your Rankings */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium">Your Seedings</h3>
                                    <div className="text-sm bg-blue-100 px-2 py-1 rounded">
                                        {rankedTeams.length} of 36 teams ranked
                                    </div>
                                </div>
                                <div className="border rounded-lg p-2 min-h-80 bg-gray-50 overflow-y-auto max-h-96">
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
                                            Add teams from the qualified list to rank them
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Submit Button */}
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={submitSeeding}
                                disabled={rankedTeams.length !== nonAlternateCount}
                                className={`px-4 py-2 rounded-lg ${
                                    rankedTeams.length === nonAlternateCount
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-gray-300 cursor-not-allowed text-gray-500'
                                }`}
                            >
                                Submit Seeding ({rankedTeams.length}/{nonAlternateCount})
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default TeamSeeding;