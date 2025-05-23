// src/pages/Selector/LockVoting.jsx
import React, { useState, useEffect } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { safeGet, safeArrayLength } from '../../utils/safeFetch';

function LockVoting() {
    const { eventState } = useEvent();
    const { user, updateUser } = useAuth();
    
    console.log("LockVoting - User data:", user);
    
    // Initialize from user's voting history if it exists
    const [selectedLocks, setSelectedLocks] = useState(() => {
        const savedVotes = safeGet(user, 'votingHistory.round1.lockVotes', []);
        return new Set(savedVotes);
    });
    
    // Check if the user has already submitted votes
    const [isSubmitted, setIsSubmitted] = useState(() => {
        return safeGet(user, 'votingHistory.round1.submitted', false);
    });
    
    const [searchTerm, setSearchTerm] = useState('');
    
    // Add this effect to update if user changes
    useEffect(() => {
        try {
            if (safeGet(user, 'votingHistory.round1')) {
                setSelectedLocks(new Set(safeGet(user, 'votingHistory.round1.lockVotes', [])));
                setIsSubmitted(safeGet(user, 'votingHistory.round1.submitted', false));
            }
        } catch (error) {
            console.error("Error updating from user data:", error);
        }
    }, [user]);

    useEffect(() => {
        // Check if a reset has happened since this component last rendered
        const checkForReset = () => {
          const lastResetTime = localStorage.getItem('sailing_nationals_reset_timestamp');
          const lastCheckTime = localStorage.getItem('sailing_nationals_last_reset_check') || '0';
          
          if (lastResetTime && lastResetTime > lastCheckTime) {
            console.log("Reset detected, clearing component state");
            // Reset component state
            setSelectedLocks(new Set());
            setIsSubmitted(false);
            
            // Update last check time
            localStorage.setItem('sailing_nationals_last_reset_check', Date.now().toString());
            
            // Force a page reload to get fresh state
            window.location.reload();
          }
        };
        
        // Check on component mount
        checkForReset();
        
        // Also set up periodic checks
        const checkInterval = setInterval(checkForReset, 5000); // Check every 5 seconds
        
        return () => clearInterval(checkInterval);
      }, []);

    // All teams sorted alphabetically
    const sortedTeams = [...(safeGet(eventState, 'teams', []))].sort((a, b) => 
        a.name.localeCompare(b.name)
    );

    const resetSubmission = () => {
        try {
            if (!user) {
                console.error("No user available");
                return;
            }
            
            // Create updated user with voting history reset
            const updatedUser = {
                ...user,
                votingHistory: {
                    ...(user.votingHistory || {}),
                    round1: {
                        ...(user.votingHistory?.round1 || {}),
                        submitted: false
                    }
                }
            };
            
            // Update the user
            updateUser(updatedUser);
            
            // Reset local state
            setIsSubmitted(false);
            
            console.log("Submission status reset");
        } catch (error) {
            console.error("Error resetting submission:", error);
            alert("An error occurred while resetting your submission status.");
        }
    };
    
    // Add a button to the UI when votes are submitted
    {isSubmitted && (
        <div className="mt-4 text-center">
            <button
                onClick={resetSubmission}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
                Reset Submission Status
            </button>
            <p className="mt-2 text-sm text-gray-600">
                Note: This will allow you to change your votes.
            </p>
        </div>
    )}

    // Handle selecting/deselecting a team for lock voting
    const toggleTeamSelection = (teamId) => {
        if (isSubmitted) return; // Prevent changes after submission
        
        setSelectedLocks(prev => {
            const newSelections = new Set(prev);
            if (newSelections.has(teamId)) {
                newSelections.delete(teamId);
            } else {
                // No limit check here anymore - selectors can add as many as they want
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

    // Handle submission of lock votes
    const submitLockVotes = () => {
        try {
            console.log("Submitting lock votes:", Array.from(selectedLocks));
            
            // Prepare the voting data
            const votingData = {
                lockVotes: Array.from(selectedLocks),
                submitted: true,
                timestamp: new Date().toISOString()
            };
            
            console.log("Created voting data:", votingData);
            
            // Update the user's voting history
            const updatedUser = {
                ...user,
                votingHistory: {
                    ...(safeGet(user, 'votingHistory', {})),
                    round1: votingData
                }
            };
            
            console.log("Updating user with data:", updatedUser);
            
            // Save the updated user to Firebase
            updateUser(updatedUser);
            
            // Mark the form as submitted
            setIsSubmitted(true);
            
            // Show success message
            alert("Your lock votes have been submitted successfully!");
        } catch (error) {
            console.error("Error submitting lock votes:", error);
            alert("An error occurred while submitting your votes. Please try again.");
        }
    };

    return (
        <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">Round 1: Lock Vote Submission</h2>

                {isSubmitted ? (
                    <div className="bg-green-50 p-6 rounded-lg text-center">
                        <h3 className="text-xl font-medium text-green-700 mb-2">Votes Submitted</h3>
                        <p className="mb-4">Your lock votes have been recorded.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                            {[...selectedLocks].map(teamId => {
                                const team = safeGet(eventState, 'teams', []).find(t => t.id === teamId);
                                return (
                                    <div key={teamId} className="bg-white p-3 rounded border border-green-200">
                                        {team ? team.name : teamId}
                                    </div>
                                );
                            })}
                        </div>
                        
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
                        {/* Selection Status */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <p className="text-blue-700">
                                Teams Selected: {safeArrayLength([...selectedLocks])}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                                Select the teams you believe should automatically qualify based on their performance throughout the season.
                            </p>
                        </div>

                        {/* Instructions */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <p>Teams receiving votes from 60% or more of selectors will automatically qualify.</p>
                            <p className="mt-2 text-sm text-gray-600">
                                You can select as many teams as you believe deserve to qualify.
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

                        {/* Team Selection List */}
                        <div className="mb-6">
                            <div className="border rounded-lg">
                                <div className="p-3 bg-gray-50 border-b font-medium flex justify-between">
                                    <div>
                                        All Teams
                                    </div>
                                    <div className="text-sm bg-blue-100 px-2 py-1 rounded">
                                        {safeArrayLength(filterTeams(sortedTeams))} teams
                                    </div>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {filterTeams(sortedTeams).map(team => (
                                        <div 
                                            key={team.id}
                                            className={`flex items-center justify-between p-3 border-b last:border-b-0 ${
                                                selectedLocks.has(team.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div>
                                                <p className="font-medium">{team.name}</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedLocks.has(team.id)}
                                                onChange={() => toggleTeamSelection(team.id)}
                                                className="h-5 w-5 text-blue-600"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={submitLockVotes}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Submit Lock Votes
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default LockVoting;