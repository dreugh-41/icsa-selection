// src/contexts/EventContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateTestTeams } from '../utils/testData';
import { saveEventState, loadEventState } from '../utils/services/storageService';
import realTimeService from '../utils/services/realTimeService';
import { addLogEntry } from '../utils/services/logService';

// Create our context
const EventContext = createContext(null);

// Define our event phases
export const EVENT_PHASES = {
  PRESELECTION: 'preselection',
  ROUND1_AQ: 'round1_aq',
  ROUND1_LOCK: 'round1_lock',
  ROUND1_FINALIZED: 'round1_finalized',
  ROUND_LEFTOVER: 'round_leftover',
  ROUND_RANKING: 'round_ranking',
  ROUND_FINALIZED: 'round_finalized',
  ALTERNATE_LEFTOVER: 'alternate_leftover',  
  ALTERNATE_RANKING: 'alternate_ranking',   
  ALTERNATE_FINALIZED: 'alternate_finalized', 
  SEEDING: 'seeding',
  SEEDING_ADJUSTMENTS: 'seeding_adjustments',
  COMPLETED: 'completed'  
};

export function EventProvider({ children }) {
    // Load saved state or use initial state
    const [eventState, setEventState] = useState(() => {
      const savedState = loadEventState();
      if (savedState) {
        console.log('Loaded saved event state');
        return savedState;
      }
      
      // Return default initial state if no saved state exists
      return {
        phase: EVENT_PHASES.PRESELECTION,
        currentRound: 0,
        qualifiedTeams: [],
        pendingQualifiedTeams: [],
        remainingBerths: 36,
        teams: [],
        rankingGroup: [],
        roundHistory: {},
        selectionType: null , // 'open' or 'women'
        alternateCount: 0
      };
    });

    // Save to localStorage whenever state changes
    useEffect(() => {
        console.log("Saving event state with ranking group size:", eventState.rankingGroup?.length || 0);
        if (eventState.rankingGroup?.length > 0) {
        console.log("Ranking group team names:", eventState.rankingGroup.map(t => t.name).join(', '));
        }
        
        saveEventState(eventState);
        realTimeService.startPolling(() => eventState);
    
        return () => {
            realTimeService.stopPolling();
        }
    }, [eventState]);

    const setSelectionType = (type) => {
      setEventState(prev => ({
        ...prev,
        selectionType: type
      }));
    };

    // Add this resetEventState function
    const resetEventState = () => {
      setEventState(prev => ({
        phase: EVENT_PHASES.PRESELECTION,
        currentRound: 0,
        qualifiedTeams: [],
        remainingBerths: 36,
        teams: [],  // Empty teams so they need to be re-imported
        rankingGroup: [],
        roundHistory: {},
        selectionType: null
      }));
    };

    const setEventTeams = (teams) => {
      setEventState(prev => ({
        ...prev,
        teams: teams
      }));
    };

    const setPendingQualifiedTeams = (teams) => {
        setEventState(prev => ({
          ...prev,
          pendingQualifiedTeams: teams
        }));
      };

    // Function to advance to next phase
    const advancePhase = () => {

        // Check if we're in alternate leftover phase and trying to advance
        if (eventState.phase === EVENT_PHASES.ALTERNATE_LEFTOVER) {
          // Get all selectors and their voting status
          const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
          const selectorUsers = users.filter(u => u.role === 'selector' && u.isActive);
          const roundKey = `round${eventState.currentRound}_leftover`;
          
          // Check if all selectors have submitted their votes
          const allSelectorsVoted = selectorUsers.every(s => s.votingHistory?.[roundKey]?.submitted);
          
          if (!allSelectorsVoted) {
            alert('Not all selectors have submitted their leftover votes for the alternate selection. Please wait for all votes before advancing.');
            return;
          }
        }

        // Check if we're in alternate ranking phase and trying to advance
        if (eventState.phase === EVENT_PHASES.ALTERNATE_RANKING) {
          // Get all selectors and their voting status
          const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
          const selectorUsers = users.filter(u => u.role === 'selector' && u.isActive);
          const roundKey = `round${eventState.currentRound}_ranking`;
          
          // Check if all selectors have submitted their rankings
          const allSelectorsSubmitted = selectorUsers.every(s => s.votingHistory?.[roundKey]?.submitted);
          
          if (!allSelectorsSubmitted) {
            alert('Not all selectors have submitted their rankings for the alternate selection. Please wait for all rankings to be submitted before finalizing.');
            return;
          }
        }

      const phaseTransitions = {
        [EVENT_PHASES.PRESELECTION]: EVENT_PHASES.ROUND1_AQ,
        [EVENT_PHASES.ROUND1_AQ]: EVENT_PHASES.ROUND1_LOCK,
        [EVENT_PHASES.ROUND1_LOCK]: EVENT_PHASES.ROUND1_FINALIZED,
        [EVENT_PHASES.ROUND1_FINALIZED]: EVENT_PHASES.ROUND_LEFTOVER,
        [EVENT_PHASES.ROUND_LEFTOVER]: EVENT_PHASES.ROUND_RANKING,
        [EVENT_PHASES.ROUND_RANKING]: EVENT_PHASES.ROUND_FINALIZED,
        [EVENT_PHASES.ROUND_FINALIZED]: EVENT_PHASES.ROUND_LEFTOVER, // Default to next round
        [EVENT_PHASES.ALTERNATE_LEFTOVER]: EVENT_PHASES.ALTERNATE_RANKING, // Alternate rounds
        [EVENT_PHASES.ALTERNATE_RANKING]: EVENT_PHASES.ALTERNATE_FINALIZED,
        [EVENT_PHASES.ALTERNATE_FINALIZED]: EVENT_PHASES.ALTERNATE_LEFTOVER, // Next alternate round
        [EVENT_PHASES.SEEDING]: EVENT_PHASES.SEEDING_ADJUSTMENTS, // Change this
        [EVENT_PHASES.SEEDING_ADJUSTMENTS]: EVENT_PHASES.COMPLETED,
        [EVENT_PHASES.COMPLETED]: EVENT_PHASES.PRESELECTION // Allow reset from completed
      };
      
      setEventState(prev => {
        let nextPhase = phaseTransitions[prev.phase];
        let newRound = prev.currentRound;
        
        // When all 36 teams are qualified, transition to alternate selection
        if (prev.phase === EVENT_PHASES.ROUND_FINALIZED && 
            (prev.qualifiedTeams.length >= 36 || prev.remainingBerths === 0)) {
          console.log("All 36 teams qualified! Transitioning to alternate selection");
          nextPhase = EVENT_PHASES.ALTERNATE_LEFTOVER;
        }
        
        // Special case for tracking alternate rounds
        if (prev.phase === EVENT_PHASES.ALTERNATE_FINALIZED) {
          const currentAlternateCount = prev.alternateCount || 0;
          console.log(`Completed alternate round, current count: ${currentAlternateCount}`);
          
          // If we already have 2 alternates, go to seeding
          if (currentAlternateCount >= 2) {
            console.log("Both alternates selected, moving to seeding phase");
            nextPhase = EVENT_PHASES.SEEDING;
          }
        }
        
        // Start counting from Round 1 when entering AQ selection
        if (prev.phase === EVENT_PHASES.PRESELECTION) {
          newRound = 1;
        }
        // Increment round when moving from finalized to leftover
        else if (prev.phase === EVENT_PHASES.ROUND1_FINALIZED || 
                (prev.phase === EVENT_PHASES.ROUND_FINALIZED && nextPhase === EVENT_PHASES.ROUND_LEFTOVER) ||
                (prev.phase === EVENT_PHASES.ALTERNATE_FINALIZED && nextPhase === EVENT_PHASES.ALTERNATE_LEFTOVER)) {
          newRound = prev.currentRound + 1;
        }
      
        // When finalizing a round, move pending qualified teams to the main qualified teams list
        let updatedQualifiedTeams = [...(prev.qualifiedTeams || [])];
        let updatedRemainingBerths = prev.remainingBerths;
        let updatedPendingQualifiedTeams = Array.isArray(prev.pendingQualifiedTeams) 
          ? [...prev.pendingQualifiedTeams] 
          : [];
        let updatedRankingGroup = [...(prev.rankingGroup || [])];
        let updatedAlternateCount = prev.alternateCount || 0;
      
        if (
          (prev.phase === EVENT_PHASES.ROUND1_LOCK && nextPhase === EVENT_PHASES.ROUND1_FINALIZED) || 
          (prev.phase === EVENT_PHASES.ROUND_RANKING && nextPhase === EVENT_PHASES.ROUND_FINALIZED) ||
          (prev.phase === EVENT_PHASES.ALTERNATE_RANKING && nextPhase === EVENT_PHASES.ALTERNATE_FINALIZED)
        ) {
          // Add pending qualified teams to qualified teams list
          updatedQualifiedTeams = [...updatedQualifiedTeams, ...updatedPendingQualifiedTeams];

          // Update remaining berths, but don't count alternates against the 36 berth total
          const newAlternates = updatedPendingQualifiedTeams.filter(team => team.status.isAlternate).length;
          const newRegularQualified = updatedPendingQualifiedTeams.length - newAlternates;
          updatedRemainingBerths = Math.max(0, prev.remainingBerths - newRegularQualified);
          
          // If we're finalizing a ranking round, remove qualified teams from the ranking group
          if (prev.phase === EVENT_PHASES.ROUND_RANKING || prev.phase === EVENT_PHASES.ALTERNATE_RANKING) {
            // Get IDs of newly qualified teams
            const newlyQualifiedIds = new Set(updatedPendingQualifiedTeams.map(team => team.id));
            
            // Keep only teams in the ranking group that didn't just qualify
            updatedRankingGroup = updatedRankingGroup.filter(team => !newlyQualifiedIds.has(team.id));
            
            console.log(`Removed ${updatedPendingQualifiedTeams.length} newly qualified teams from ranking group. New size: ${updatedRankingGroup.length}`);
          } else {
            // After finalizing Round 1 (lock votes), clear the ranking group so it gets initialized properly
            updatedRankingGroup = [];
          }
          
          // Update alternate count if this was an alternate ranking round
          if (prev.phase === EVENT_PHASES.ALTERNATE_RANKING) {
            updatedAlternateCount++;
            console.log(`Increasing alternate count to ${updatedAlternateCount}`);
          }
          
          // Clear pending qualified teams
          updatedPendingQualifiedTeams = [];
        }
      
        // If moving to a new round, calculate how many teams should qualify in this round
        let teamsToQualifyThisRound = null;
        if (nextPhase === EVENT_PHASES.ROUND_LEFTOVER && 
            (prev.phase === EVENT_PHASES.ROUND1_FINALIZED || prev.phase === EVENT_PHASES.ROUND_FINALIZED)) {
          
          // Always use standard case: qualify 1/3 of remaining berths (rounded down)
          const remainingBerths = updatedRemainingBerths;
          teamsToQualifyThisRound = Math.floor(remainingBerths / 3);
          
          // Handle edge case: If no teams would qualify but berths remain, ensure at least 1 does
          if (teamsToQualifyThisRound === 0 && remainingBerths > 0) {
            teamsToQualifyThisRound = 1;
          }
          
          console.log(`Round ${newRound}: Qualifying ${teamsToQualifyThisRound} teams out of ${remainingBerths} remaining berths`);
          
          // Only initialize the ranking group for Round 2 (after Round 1 is finalized)
          // For subsequent rounds, the ranking group should already be maintained
          if (prev.phase === EVENT_PHASES.ROUND1_FINALIZED) {
            console.log("Initializing ranking group after Round 1");
            
            const qualifiedTeamIds = new Set([
              ...(updatedQualifiedTeams || []).map(t => t.id),
              ...(updatedPendingQualifiedTeams || []).map(t => t.id)
            ]);
            
            // Get remaining teams sorted by CSR
            const availableTeams = prev.teams
              .filter(team => !qualifiedTeamIds.has(team.id))
              .sort((a, b) => a.csrRank - b.csrRank);
            
            // Take the top teams to form the initial ranking group
            // Double the number of remaining berths, as per the selection process
            const teamsToTake = Math.min(
              updatedRemainingBerths * 2,
              availableTeams.length
            );
            
            updatedRankingGroup = availableTeams.slice(0, teamsToTake);
            console.log(`Initial ranking group created with ${updatedRankingGroup.length} teams (2x the ${updatedRemainingBerths} remaining berths)`);
          } else {
            // For subsequent rounds, just preserve the existing ranking group (no recalculation)
            console.log(`Round ${newRound}: Preserving existing ranking group with ${updatedRankingGroup.length} teams`);
          }
          
          // FAIL-SAFE: Ensure ranking group has at least 5 teams
          if (updatedRankingGroup.length < 5) {
            console.log(`FAIL-SAFE: Ranking group only has ${updatedRankingGroup.length} teams, adding more teams from CSR rankings`);
            
            const qualifiedTeamIds = new Set([
              ...(updatedQualifiedTeams || []).map(t => t.id),
              ...(updatedPendingQualifiedTeams || []).map(t => t.id)
            ]);
            
            // Get teams that are not qualified and not already in ranking group
            const rankingGroupIds = new Set(updatedRankingGroup.map(t => t.id));
            
            const availableTeams = prev.teams
              .filter(team => !qualifiedTeamIds.has(team.id) && !rankingGroupIds.has(team.id))
              .sort((a, b) => a.csrRank - b.csrRank);
            
            // Add enough teams to reach at least 5 total
            const additionalTeamsNeeded = 5 - updatedRankingGroup.length;
            const additionalTeams = availableTeams.slice(0, additionalTeamsNeeded);
            
            updatedRankingGroup = [...updatedRankingGroup, ...additionalTeams];
            console.log(`Added ${additionalTeams.length} additional teams to ranking group. New size: ${updatedRankingGroup.length}`);
          }
        }
        
        // Also handle alternate rounds - initialize ranking group for alternate selection
        if (nextPhase === EVENT_PHASES.ALTERNATE_LEFTOVER) {
          console.log("Initializing ranking group for alternate selection");
          
          // Get qualified team IDs
          const qualifiedTeamIds = new Set([
            ...(updatedQualifiedTeams || []).map(t => t.id),
            ...(updatedPendingQualifiedTeams || []).map(t => t.id)
          ]);
          
          // If we already have a ranking group from the previous round, try to use it
          if (prev.rankingGroup && prev.rankingGroup.length > 0) {
            // Filter out any teams that might have qualified since the group was created
            const availableRankingGroup = prev.rankingGroup.filter(team => 
              !qualifiedTeamIds.has(team.id)
            );
            
            if (availableRankingGroup.length >= 5) {
              // If we have enough teams left in the ranking group, use them
              updatedRankingGroup = availableRankingGroup;
              console.log(`Using existing ranking group with ${updatedRankingGroup.length} teams for alternate selection`);
            } else {
              // Otherwise, we need to add more teams from the CSR rankings
              console.log("Not enough teams in existing ranking group, adding more from CSR rankings");
              
              // Get remaining teams sorted by CSR
              const availableTeams = prev.teams
                .filter(team => !qualifiedTeamIds.has(team.id) && !availableRankingGroup.map(t => t.id).includes(team.id))
                .sort((a, b) => a.csrRank - b.csrRank);
              
              // Add enough teams to reach 5 total
              const additionalTeamsNeeded = 5 - availableRankingGroup.length;
              const additionalTeams = availableTeams.slice(0, additionalTeamsNeeded);
              
              updatedRankingGroup = [...availableRankingGroup, ...additionalTeams];
              console.log(`Created ranking group with ${updatedRankingGroup.length} teams for alternate selection`);
            }
          } else {
            // If no existing ranking group, create one from the top CSR teams (only as a fallback)
            console.log("No existing ranking group, creating one from CSR rankings");
            
            // Get remaining teams sorted by CSR
            const availableTeams = prev.teams
              .filter(team => !qualifiedTeamIds.has(team.id))
              .sort((a, b) => a.csrRank - b.csrRank);
            
            // For alternates, we'll take top 5 unqualified teams by CSR
            const teamsToTake = Math.min(5, availableTeams.length);
            
            updatedRankingGroup = availableTeams.slice(0, teamsToTake);
            console.log(`Created fallback ranking group with ${updatedRankingGroup.length} teams for alternate selection`);
          }
        }
        
        // Check if we're moving from leftover to ranking and the ranking group is empty
        if (prev.phase === EVENT_PHASES.ROUND_LEFTOVER && nextPhase === EVENT_PHASES.ROUND_RANKING ||
            prev.phase === EVENT_PHASES.ALTERNATE_LEFTOVER && nextPhase === EVENT_PHASES.ALTERNATE_RANKING) {
          console.log("Moving from leftover to ranking phase");
          
          // If the ranking group is still empty, we need to generate it (should only happen in abnormal cases)
          if (!updatedRankingGroup || updatedRankingGroup.length === 0) {
            console.log("WARNING: Ranking group is empty when moving to ranking phase!");
            console.log("Generating ranking group from top teams by CSR");
            
            // Filter out already qualified teams
            const qualifiedTeamIds = new Set([
              ...(updatedQualifiedTeams || []).map(t => t.id),
              ...(updatedPendingQualifiedTeams || []).map(t => t.id)
            ]);
            
            // Get remaining teams sorted by CSR
            const availableTeams = prev.teams
              .filter(team => !qualifiedTeamIds.has(team.id))
              .sort((a, b) => a.csrRank - b.csrRank);
            
            // Use the standard formula for regular rounds, or top 10 for alternate rounds
            const teamsToTake = prev.phase === EVENT_PHASES.ALTERNATE_LEFTOVER 
              ? Math.min(10, availableTeams.length)
              : Math.min(updatedRemainingBerths * 2, availableTeams.length);
            
            updatedRankingGroup = availableTeams.slice(0, teamsToTake);
            console.log("Generated ranking group with", updatedRankingGroup.length, "teams (EMERGENCY FALLBACK)");
            
            // FAIL-SAFE: Ensure ranking group has at least 5 teams
            if (updatedRankingGroup.length < 5 && availableTeams.length >= 5) {
              console.log(`FAIL-SAFE: Emergency ranking group needs more teams`);
              
              updatedRankingGroup = availableTeams.slice(0, Math.min(5, availableTeams.length));
              console.log(`Updated emergency ranking group to ${updatedRankingGroup.length} teams`);
            }
          } else {
            console.log("Using existing ranking group with", updatedRankingGroup.length, "teams");
          }
        }

        // Add completion log when transitioning from SEEDING to COMPLETED
        if (prev.phase === EVENT_PHASES.SEEDING && nextPhase === EVENT_PHASES.COMPLETED) {
          // Create a final completion log with all team groups
          
          // Get all teams and sort them into groups
          const qualifiedTeams = [...updatedQualifiedTeams].filter(team => !team.status.isAlternate);
          const alternateTeams = [...updatedQualifiedTeams].filter(team => team.status.isAlternate);
          
          // Get any teams not in qualified or alternates (leftover teams)
          const qualifiedIds = new Set(updatedQualifiedTeams.map(t => t.id));
          
          const leftoverTeams = prev.teams.filter(team => !qualifiedIds.has(team.id));
          
          // Get average seeding rankings for qualified teams
          const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
          const selectorUsers = users.filter(u => u.role === 'selector' && u.votingHistory?.seeding?.submitted);
          
          // Calculate average seedings
          const teamSeedSums = {};
          const teamSeedCounts = {};
          
          // Collect all seedings from selectors
          selectorUsers.forEach(selector => {
            const seedings = selector.votingHistory.seeding.rankings || [];
            
            seedings.forEach((teamId, index) => {
              if (!teamSeedSums[teamId]) {
                teamSeedSums[teamId] = 0;
                teamSeedCounts[teamId] = 0;
              }
              
              teamSeedSums[teamId] += (index + 1); // Add the rank (1-based)
              teamSeedCounts[teamId]++;
            });
          });
          
          // Map teams with their seeding info
          const qualifiedWithSeeding = qualifiedTeams.map(team => {
            let averageSeed = 'N/A';
            if (teamSeedSums[team.id] && teamSeedCounts[team.id]) {
              averageSeed = (teamSeedSums[team.id] / teamSeedCounts[team.id]).toFixed(2);
            }
            
            return {
              id: team.id,
              name: team.name,
              averageSeed,
              qualificationMethod: team.status.qualificationMethod,
              qualificationRound: team.status.qualificationRound
            };
          }).sort((a, b) => {
            // Handle cases where averageSeed might be 'N/A'
            if (a.averageSeed === 'N/A') return 1;
            if (b.averageSeed === 'N/A') return -1;
            return parseFloat(a.averageSeed) - parseFloat(b.averageSeed);
          });
          
          // Log the completion
          addLogEntry(prev.selectionType, {
            event: 'process_completed',
            timestamp: new Date().toISOString(),
            qualifiedTeams: qualifiedWithSeeding,
            alternateTeams: alternateTeams.map(team => ({
              id: team.id,
              name: team.name,
              qualificationMethod: team.status.qualificationMethod,
              qualificationRound: team.status.qualificationRound
            })),
            leftoverTeams: leftoverTeams.map(team => ({
              id: team.id,
              name: team.name,
              csrRank: team.csrRank
            })),
            totalTeamsCount: prev.teams.length,
            summary: {
              selectionType: prev.selectionType,
              totalQualified: qualifiedTeams.length,
              totalAlternates: alternateTeams.length,
              totalLeftover: leftoverTeams.length
            }
          });
        }

        addLogEntry(prev.selectionType, {
          event: 'phase_change',
          oldPhase: prev.phase,
          newPhase: nextPhase,
          currentRound: newRound,
          rankingGroupSize: updatedRankingGroup.length,
          qualifiedTeamsCount: updatedQualifiedTeams.length,
          remainingBerths: updatedRemainingBerths
        });
      
        return {
          ...prev,
          phase: nextPhase,
          currentRound: newRound,
          qualifiedTeams: updatedQualifiedTeams,
          pendingQualifiedTeams: updatedPendingQualifiedTeams,
          remainingBerths: updatedRemainingBerths,
          teamsToQualifyThisRound: teamsToQualifyThisRound,
          rankingGroup: updatedRankingGroup,
          alternateCount: updatedAlternateCount
        };
      });
    };

    // Function to qualify teams
    const qualifyTeams = (newQualifiedTeams) => {
        setEventState(prev => {
        // Ensure pendingQualifiedTeams is an array
        const currentPendingTeams = Array.isArray(prev.pendingQualifiedTeams) 
            ? prev.pendingQualifiedTeams 
            : [];
        
        // Get all team IDs that are already in pending or qualified lists
        const existingQualifiedIds = new Set([
            ...currentPendingTeams.map(team => team.id),
            ...(prev.qualifiedTeams || []).map(team => team.id)
        ]);
        
        // Filter out teams that are already qualified through any method
        const uniqueNewTeams = newQualifiedTeams.filter(team => 
            !existingQualifiedIds.has(team.id)
        );
        
        console.log(`Adding ${uniqueNewTeams.length} unique teams to pending qualified list`);

        // Log the team qualification
        addLogEntry(prev.selectionType, {
          event: 'teams_qualified',
          phase: prev.phase,
          round: prev.currentRound,
          newlyQualifiedTeams: uniqueNewTeams.map(team => ({
            id: team.id,
            name: team.name,
            qualificationMethod: team.status.qualificationMethod
          }))
        });
        
        return {
            ...prev,
            pendingQualifiedTeams: [...currentPendingTeams, ...uniqueNewTeams]
        };
        });
  };

    // Function to update ranking group
    const updateRankingGroup = (teams) => {
      console.log("UPDATE RANKING GROUP CALLED with", teams.length, "teams");
      console.log("Teams being added to ranking group:", teams.map(t => t.name).join(', '));
      
      // FAIL-SAFE: Ensure ranking group has at least 5 teams
      if (teams.length < 5) {
          console.log(`FAIL-SAFE: Ranking group only has ${teams.length} teams, adding more teams from CSR rankings`);
          
          setEventState(prev => {
              const qualifiedTeamIds = new Set([
                  ...(prev.qualifiedTeams || []).map(t => t.id),
                  ...(prev.pendingQualifiedTeams || []).map(t => t.id)
              ]);
              
              // Get teams that are not qualified and not already in ranking group
              const rankingGroupIds = new Set(teams.map(t => t.id));
              
              const availableTeams = prev.teams
                  .filter(team => !qualifiedTeamIds.has(team.id) && !rankingGroupIds.has(team.id))
                  .sort((a, b) => a.csrRank - b.csrRank);
              
              // Add enough teams to reach at least 5 total
              const additionalTeamsNeeded = 5 - teams.length;
              const additionalTeams = availableTeams.slice(0, additionalTeamsNeeded);
              
              const updatedRankingGroup = [...teams, ...additionalTeams];
              console.log(`Added ${additionalTeams.length} additional teams to ranking group. New size: ${updatedRankingGroup.length}`);
              
              // Log the ranking group update
              addLogEntry(prev.selectionType, {
                  event: 'ranking_group_updated',
                  phase: prev.phase,
                  round: prev.currentRound,
                  teamsCount: updatedRankingGroup.length,
                  failSafeApplied: true,
                  teams: updatedRankingGroup.map(team => ({
                      id: team.id,
                      name: team.name
                  }))
              });
              
              return {
                  ...prev,
                  rankingGroup: updatedRankingGroup
              };
          });
      } else {
          // Original code if we have 5 or more teams
          setEventState(prev => {
              addLogEntry(prev.selectionType, {
                  event: 'ranking_group_updated',
                  phase: prev.phase,
                  round: prev.currentRound,
                  teamsCount: teams.length,
                  teams: teams.map(team => ({
                      id: team.id,
                      name: team.name
                  }))
              });
              
              return {
                  ...prev,
                  rankingGroup: teams
              };
          });
      }
    };

    // Function to store round results
    const storeRoundResults = (roundNumber, results) => {
        setEventState(prev => ({
            ...prev,
            roundHistory: {
                ...prev.roundHistory,
                [roundNumber]: results
            }
        }));
    };

    // Add a new function to log selector rankings
    const logSelectorRankings = (round) => {
      setEventState(prev => {
        // Get selector rankings from localStorage
        const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
        const selectorUsers = users.filter(u => u.role === 'selector');
        const roundKey = `round${round}_ranking`;
        
        // Gather all rankings
        const selectorRankings = [];
        selectorUsers.forEach(selector => {
          if (selector.votingHistory?.[roundKey]?.submitted) {
            const rankings = selector.votingHistory[roundKey].rankings || [];
            
            // Map rankings to team objects
            const rankedTeams = rankings.map((teamId, index) => {
              const team = prev.teams.find(t => t.id === teamId);
              return {
                rank: index + 1,
                teamId,
                teamName: team ? team.name : 'Unknown Team'
              };
            });
            
            selectorRankings.push({
              selectorId: selector.id,
              selectorName: selector.name,
              rankings: rankedTeams
            });
          }
        });
        
        // Calculate average rankings
        const teamRankSums = {};
        const teamRankCounts = {};
        
        selectorRankings.forEach(selector => {
          selector.rankings.forEach(ranking => {
            if (!teamRankSums[ranking.teamId]) {
              teamRankSums[ranking.teamId] = 0;
              teamRankCounts[ranking.teamId] = 0;
            }
            
            teamRankSums[ranking.teamId] += ranking.rank;
            teamRankCounts[ranking.teamId]++;
          });
        });
        
        const averageRankings = Object.keys(teamRankSums).map(teamId => {
          const team = prev.teams.find(t => t.id === teamId);
          return {
            teamId,
            teamName: team ? team.name : 'Unknown Team',
            averageRank: (teamRankSums[teamId] / teamRankCounts[teamId]).toFixed(2)
          };
        }).sort((a, b) => parseFloat(a.averageRank) - parseFloat(b.averageRank));
        
        // Check if this is the final round
        const isFinalRound = prev.remainingBerths <= 6;
        
        // For the final round, include additional information about teams and alternates
        let finalRoundInfo = null;
        if (isFinalRound) {
          // Determine how many teams qualify based on remaining berths
          const teamsToQualify = prev.remainingBerths;
          
          // Separate main qualifiers and alternates
          const mainQualifiers = averageRankings.slice(0, teamsToQualify);
          const alternates = averageRankings.slice(teamsToQualify, teamsToQualify + 2);
          const nonQualifiers = averageRankings.slice(teamsToQualify + 2);
          
          finalRoundInfo = {
            isFinalRound: true,
            remainingBerths: prev.remainingBerths,
            mainQualifiers,
            alternates,
            nonQualifiers,
            allRankedTeams: averageRankings,
            rankingGroupSize: prev.rankingGroup.length
          };
        }
        
        // Log the rankings with additional final round info if applicable
        addLogEntry(prev.selectionType, {
          event: 'rankings_submitted',
          phase: prev.phase,
          round: round,
          selectorRankings,
          averageRankings,
          finalRoundInfo
        });
        
        return prev;
      });
    };

    // Define permissions for different actions
    const actionPermissions = {
        canAdvancePhase: eventState.phase !== EVENT_PHASES.ROUND_FINALIZED && eventState.phase !== undefined,
        canQualifyTeams: eventState.remainingBerths > 0,
        canUpdateRankingGroup: [EVENT_PHASES.ROUND_LEFTOVER, EVENT_PHASES.ROUND_RANKING].includes(eventState.phase)
    };

    // Create the value object with all our functions and state
    const value = {
        eventState,
        advancePhase,
        qualifyTeams,
        updateRankingGroup,
        storeRoundResults,
        setEventTeams,
        resetEventState,
        setPendingQualifiedTeams,
        setSelectionType,
        logSelectorRankings,
        actionPermissions
      };

    return (
        <EventContext.Provider value={value}>
            {children}
        </EventContext.Provider>
    );
}

// Custom hook to use the event context
export function useEvent() {
    const context = useContext(EventContext);
    if (!context) {
        throw new Error('useEvent must be used within an EventProvider');
    }
    return context;
}