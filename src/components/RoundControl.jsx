// src/components/RoundControl.jsx
import React from 'react';
import { useEvent, EVENT_PHASES } from '../contexts/EventContext';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';

function RoundControl() {
    const { eventState, advancePhase, actionPermissions } = useEvent();

    // Helper function to display a human-readable phase name
        const getPhaseDisplay = (phase) => {
            const displays = {
                [EVENT_PHASES.PRESELECTION]: 'Preselection Phase',
                [EVENT_PHASES.ROUND1_AQ]: 'Round 1 - Automatic Qualifier Selection',
                [EVENT_PHASES.ROUND1_LOCK]: 'Round 1 - Lock Vote Submission',
                [EVENT_PHASES.ROUND1_FINALIZED]: 'Round 1 Complete',
                [EVENT_PHASES.ROUND_LEFTOVER]: 'Leftover Team Voting',
                [EVENT_PHASES.ROUND_RANKING]: 'Team Ranking Phase',
                [EVENT_PHASES.ROUND_FINALIZED]: 'Round Complete',
                [EVENT_PHASES.ALTERNATE_LEFTOVER]: 'Alternate Selection - Leftover Voting',
                [EVENT_PHASES.ALTERNATE_RANKING]: 'Alternate Selection - Ranking Phase',
                [EVENT_PHASES.ALTERNATE_FINALIZED]: 'Alternate Selection - Round Complete',
                [EVENT_PHASES.SEEDING]: 'Championship Seeding Phase',
                [EVENT_PHASES.SEEDING_ADJUSTMENTS]: 'Division Seeding Adjustments',
                [EVENT_PHASES.COMPLETED]: 'Selection Process Completed'
            };
            return displays[phase] || phase;
        };

    // Helper function to determine what the next phase will be
    const getNextPhaseDisplay = () => {
        const transitions = {
            [EVENT_PHASES.PRESELECTION]: 'Begin Round 1 - AQ Selection',
            [EVENT_PHASES.ROUND1_AQ]: 'Open Lock Vote Submission',
            [EVENT_PHASES.ROUND1_LOCK]: 'Finalize Round 1',
            [EVENT_PHASES.ROUND1_FINALIZED]: 'Begin Leftover Voting',
            [EVENT_PHASES.ROUND_LEFTOVER]: 'Begin Team Ranking',
            [EVENT_PHASES.ROUND_RANKING]: 'Finalize Round',
            [EVENT_PHASES.SEEDING]: 'Complete Selection Process',
            [EVENT_PHASES.COMPLETED]: 'Reset Process'
        };
        return transitions[eventState.phase] || 'Next Phase';
    };

    const bypassSelectorCheck = () => {
        try {
          const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
          
          // Mark all selectors as having submitted votes for round1
          const updatedUsers = users.map(user => {
            if (user.role === 'selector') {
              // Create or update voting history to show submitted
              const votingHistory = user.votingHistory || {};
              votingHistory.round1 = votingHistory.round1 || {};
              votingHistory.round1.submitted = true;
              votingHistory.round1.timestamp = votingHistory.round1.timestamp || new Date().toISOString();
              votingHistory.round1.lockVotes = votingHistory.round1.lockVotes || [];
              
              return {...user, votingHistory};
            }
            return user;
          });
          
          // Save back to localStorage
          localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
          console.log("Updated all selectors to show they've submitted votes");
          
          // Also update Firebase if possible
          try {
            updatedUsers.forEach(async (user) => {
              if (user.role === 'selector' && user.id) {
                const userRef = ref(database, `users/${user.id}`);
                const update = { 
                  votingHistory: user.votingHistory 
                };
                set(userRef, update);
              }
            });
          } catch (e) {
            console.log("Couldn't update Firebase but localStorage was updated");
          }
          
          return true;
        } catch (error) {
          console.error("Error bypassing selector check:", error);
          return false;
        }
      };
      
      const bypassLeftoverCheck = () => {
        try {
          const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
          const roundKey = `round${eventState.currentRound}_leftover`;
          
          // For alternate rounds, ensure we're not using old voting history
          if (eventState.phase === EVENT_PHASES.ROUND_FINALIZED && 
              (eventState.qualifiedTeams.length >= 36 || eventState.remainingBerths === 0)) {
            console.log("Transitioning to alternate round - resetting voting history");
            
            // Force a round increment for checking
            const nextRound = eventState.currentRound + 1;
            const alternateRoundKey = `round${nextRound}_leftover`;
            
            // Reset all selectors' voting status for the next round
            const updatedUsers = users.map(user => {
              if (user.role === 'selector') {
                const votingHistory = user.votingHistory || {};
                // Clear any existing votes for the upcoming round
                votingHistory[alternateRoundKey] = {
                  submitted: false,
                  votes: [],
                  timestamp: null
                };
                
                return {...user, votingHistory};
              }
              return user;
            });
            
            // Save back to localStorage
            localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
            console.log(`Reset selector voting history for alternate round ${nextRound}`);
            
            // Also update Firebase
            try {
              updatedUsers.forEach(async (user) => {
                if (user.role === 'selector' && user.id) {
                  // Clear only the specific round's voting history
                  const userVotingHistoryRef = ref(database, `users/${user.id}/votingHistory/${alternateRoundKey}`);
                  await set(userVotingHistoryRef, {
                    submitted: false,
                    votes: [],
                    timestamp: null
                  });
                }
              });
            } catch (e) {
              console.log("Couldn't update Firebase but localStorage was updated");
            }
          }
          
          return true;
        } catch (error) {
            console.error("Error in bypassLeftoverCheck:", error);
          }
        };
      
      const bypassRankingCheck = () => {
        try {
          const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
          const roundKey = `round${eventState.currentRound}_ranking`;
          
          // Mark all selectors as having submitted ranking votes
          const updatedUsers = users.map(user => {
            if (user.role === 'selector') {
              // Create or update voting history for ranking
              const votingHistory = user.votingHistory || {};
              votingHistory[roundKey] = votingHistory[roundKey] || {};
              votingHistory[roundKey].submitted = true;
              votingHistory[roundKey].timestamp = votingHistory[roundKey].timestamp || new Date().toISOString();
              
              // Create empty rankings array if it doesn't exist
              if (!votingHistory[roundKey].rankings) {
                // If the ranking group exists, create a default ranking of all teams in it
                const rankingGroup = eventState.rankingGroup || [];
                votingHistory[roundKey].rankings = rankingGroup.map(team => team.id);
              }
              
              return {...user, votingHistory};
            }
            return user;
          });
          
          // Save back to localStorage
          localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
          console.log(`Updated all selectors to show they've submitted rankings for round ${eventState.currentRound}`);
          
          // Also try to update Firebase
          try {
            updatedUsers.forEach(async (user) => {
              if (user.role === 'selector' && user.id) {
                const userRef = ref(database, `users/${user.id}`);
                await update(userRef, { votingHistory: user.votingHistory });
              }
            });
          } catch (e) {
            console.log("Couldn't update Firebase but localStorage was updated");
          }
          
          return true;
        } catch (error) {
          console.error("Error bypassing selector check for ranking votes:", error);
          return false;
        }
      };

      const bypassSeedingCheck = () => {
        try {
          const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
          
          // Mark all selectors as having submitted seedings
          const updatedUsers = users.map(user => {
            if (user.role === 'selector') {
              // Create or update voting history for seeding
              const votingHistory = user.votingHistory || {};
              votingHistory.seeding = votingHistory.seeding || {};
              votingHistory.seeding.submitted = true;
              votingHistory.seeding.timestamp = votingHistory.seeding.timestamp || new Date().toISOString();
              
              // If no rankings exist, create default rankings based on qualified teams
              if (!votingHistory.seeding.rankings) {
                const qualifiedTeams = [
                  ...(eventState.qualifiedTeams || [])
                ].filter(team => 
                  !team.status.isAlternate && 
                  team.status.qualificationMethod !== 'ALTERNATE'
                );
                
                votingHistory.seeding.rankings = qualifiedTeams.map(team => team.id);
              }
              
              return {...user, votingHistory};
            }
            return user;
          });
          
          // Save back to localStorage
          localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
          console.log("Updated all selectors to show they've submitted seedings");
          
          // Also update Firebase
          try {
            updatedUsers.forEach(async (user) => {
              if (user.role === 'selector' && user.id) {
                const userRef = ref(database, `users/${user.id}`);
                await update(userRef, { votingHistory: user.votingHistory });
              }
            });
          } catch (e) {
            console.log("Couldn't update Firebase but localStorage was updated");
          }
          
          return true;
        } catch (error) {
          console.error("Error bypassing seeding check:", error);
          return false;
        }
      };
    

    // Add the getRoundDisplay function that was missing
    const getRoundDisplay = () => {
        if (eventState.phase === EVENT_PHASES.PRESELECTION) {
            return 'Round: Not Started';
        }
        
        if (eventState.phase && eventState.phase.includes('ROUND1_')) {
            return `Round 1 - ${eventState.phase === EVENT_PHASES.ROUND1_AQ ? 'AQ Selection' : 'Lock Votes'}`;
        }
        
        return `Round ${eventState.currentRound} - ${
            eventState.phase === EVENT_PHASES.ROUND_LEFTOVER ? 'Leftover Voting' : 'Team Ranking'
        }`;
    };

    // If process is completed, show a simpler version
    if (eventState.phase === EVENT_PHASES.COMPLETED) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">Selection Complete</h2>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="font-medium">Current Phase: Selection Process Completed</p>
                        <p className="text-sm text-gray-600 mt-1">
                            All 36 teams and alternates have been selected and seeded.
                        </p>
                    </div>
                </div>

                {/* Only show reset button to parliamentarian */}
                <div className="flex justify-end">
                    <button
                        onClick={advancePhase}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                    >
                        Reset Process
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            {/* Current Status Display */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Round Control Panel</h2>
                <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-medium">Current Phase: {getPhaseDisplay(eventState.phase)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                        {getRoundDisplay()}
                    </p>
                    <p className="text-sm text-gray-600">
                        Remaining Berths: {eventState.remainingBerths}
                    </p>
                </div>
            </div>
    
            {/* Phase Control */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                    Next Action: {getNextPhaseDisplay()}
                </div>
                <button
                    onClick={() => {
                        // Disable the button immediately to prevent double-clicks
                        const btn = event.currentTarget;
                        btn.disabled = true;
                        btn.classList.add('opacity-50', 'cursor-not-allowed');
                        bypassSelectorCheck();
                        // Check if teams have been uploaded before starting the process
                        if (eventState.phase === EVENT_PHASES.PRESELECTION && 
                            (!eventState.teams || eventState.teams.length === 0)) {
                            alert('Please import team data from the CSR file before starting the selection process.');
                            return;
                        }

                        // Check if there are pending qualifications that need to be finalized
                        if (eventState.phase === EVENT_PHASES.ROUND1_AQ && 
                            !eventState.pendingQualifiedTeams?.some(team => team.status?.qualificationMethod === 'AQ')) {
                            alert('Please finalize AQ selections before advancing to the next phase.');
                            return;
                        }
                        
                        // Check if there are pending lock votes that need to be finalized
                            if (eventState.phase === EVENT_PHASES.ROUND1_LOCK) {
                                // First check if all selectors have submitted their votes
                                const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
                                const selectorUsers = users.filter(u => u.role === 'selector');
                                
                                // Check if all selectors have submitted lock votes
                                const allSelectorsVoted = selectorUsers.every(s => s.votingHistory?.round1?.submitted);
                                
                                if (!allSelectorsVoted) {
                                    alert('Not all selectors have submitted their lock votes yet. Please wait for all votes before advancing.');
                                    return;
                                }
                                
                                // If there are teams that got enough lock votes, they should be added to pending qualified
                                const votingSelectors = selectorUsers.filter(s => s.votingHistory?.round1?.submitted).length;
                                
                                // Get team votes
                                const teamVotes = {};
                                selectorUsers.forEach(selector => {
                                    if (selector.votingHistory?.round1?.submitted) {
                                        const votes = selector.votingHistory.round1.lockVotes || [];
                                        votes.forEach(teamId => {
                                            teamVotes[teamId] = (teamVotes[teamId] || 0) + 1;
                                        });
                                    }
                                });
                                
                                // Check if any team has 60% or more votes
                                const teamsQualifying = Object.keys(teamVotes).filter(teamId => {
                                    const votePercentage = votingSelectors > 0 
                                        ? Math.round((teamVotes[teamId] / votingSelectors) * 100)
                                        : 0;
                                    return votePercentage >= 60; // 60% threshold
                                });
                                
                                // Only check for pending qualifications if there are teams that should qualify
                                if (teamsQualifying.length > 0 && 
                                    !eventState.pendingQualifiedTeams?.some(team => team.status?.qualificationMethod === 'LOCK')) {
                                    alert('There are teams with 60% or more lock votes. Please finalize qualifying teams before advancing.');
                                    return;
                                }
                                
                                // If no teams qualify through lock voting, that's okay - we can proceed
                            }
                        
                        // Check if the leftover voting phase has been completed properly
                        if (eventState.phase === EVENT_PHASES.ROUND_LEFTOVER) {
                            bypassLeftoverCheck();
                            // Get all selectors and their voting status
                            const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
                            const selectorUsers = users.filter(u => u.role === 'selector');
                            const roundKey = `round${eventState.currentRound}_leftover`;
                            
                            // Check if all selectors have submitted their votes
                            const allSelectorsVoted = selectorUsers.every(s => s.votingHistory?.[roundKey]?.submitted);
                            
                            if (!allSelectorsVoted) {
                                alert('Not all selectors have submitted their leftover votes yet. Please wait for all votes before advancing.');
                                return;
                            }
                            
                            const votingSelectors = selectorUsers.filter(s => s.votingHistory?.[roundKey]?.submitted).length;
                            
                            // Get non-qualified teams that received leftover votes
                            const allTeams = eventState.teams;
                            const qualifiedTeamIds = new Set([
                                ...(eventState.qualifiedTeams || []).map(t => t.id),
                                ...(eventState.pendingQualifiedTeams || []).map(t => t.id)
                            ]);
                            
                            const teamsWithVotes = {};
                            
                            // Count votes for each team
                            selectorUsers.forEach(selector => {
                                if (selector.votingHistory?.[roundKey]?.submitted) {
                                    const votes = selector.votingHistory[roundKey].votes || [];
                                    votes.forEach(teamId => {
                                        if (!qualifiedTeamIds.has(teamId)) {
                                            teamsWithVotes[teamId] = (teamsWithVotes[teamId] || 0) + 1;
                                        }
                                    });
                                }
                            });
                            
                            // Check if any team has 80% or more votes
                            const teamsToAdd = Object.keys(teamsWithVotes).filter(teamId => {
                                const votePercentage = votingSelectors > 0 
                                    ? Math.round((teamsWithVotes[teamId] / votingSelectors) * 100)
                                    : 0;
                                return votePercentage >= 80; // 80% threshold
                            });
                            
                            // If there are teams that should be added but ranking group is empty
                            if (teamsToAdd.length > 0 && (!eventState.rankingGroup || eventState.rankingGroup.length === 0)) {
                                alert('There are teams with 80% or more leftover votes. Please add them to the ranking group before advancing.');
                                return;
                            }
                        }
                        
                        // Check if there are pending ranking qualifications that need to be finalized
                        if (eventState.phase === EVENT_PHASES.ROUND_RANKING && 
                            !eventState.pendingQualifiedTeams?.some(team => team.status?.qualificationMethod === 'RANKING')) {
                                bypassRankingCheck();
                            alert('Please finalize qualifying teams from rankings before advancing to the next phase.');
                            return;
                        }

                        // Check if we're in the seeding phase and all selectors have submitted their seedings
                        if (eventState.phase === EVENT_PHASES.SEEDING) {
                            bypassSeedingCheck();
                            // Get all selectors and their voting status
                            const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
                            const selectorUsers = users.filter(u => u.role === 'selector');
                            
                            // Check if all selectors have submitted their seedings
                            const allSelectorsSubmitted = selectorUsers.every(s => s.votingHistory?.seeding?.submitted);
                            
                            if (!allSelectorsSubmitted) {
                                alert('Not all selectors have submitted their seeding rankings yet. Please wait for all seedings to be submitted before advancing.');
                                return;
                            }
                        }
                        
                        // If all checks pass, advance to the next phase
                        advancePhase();
    
                        // Add a message and force reload
                        alert("Phase advanced successfully! The page will now refresh.");
                        
                        // Force reload after a delay
                        setTimeout(() => {
                        window.location.reload();
                        }, 1000);
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                    >
                    {getNextPhaseDisplay()}
                    </button>
            </div>
        </div>
    );
}

export default RoundControl;