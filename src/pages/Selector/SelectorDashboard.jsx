// src/pages/Selector/SelectorDashboard.jsx
import React, { useState } from 'react';
import { useEvent, EVENT_PHASES } from '../../contexts/EventContext';
import LockVoting from './LockVoting';
import LeftoverVoting from './LeftoverVoting';
import TeamRanking from './TeamRanking';
import { useEffect } from 'react';
import realTimeService from '../../utils/services/realTimeService';
import TeamSeeding from './TeamSeeding';
import CompletionSummary from '../../components/CompletionSummary';
import SeedingAdjustments from '../../components/parliamentarian/SeedingAdjustments';
import { safeGet, safeArrayLength } from '../../utils/safeFetch';
import { useAuth } from '../../contexts/AuthContext';

function SelectorDashboard() {
    const { eventState, loading } = useEvent();
    const [forceUpdate, setForceUpdate] = useState(false);
    const [hasError, setHasError] = useState(false);
    const { user } = useAuth();

    const debugLocalStorage = () => {
        try {
            if (!user) {
                console.log("No user available in auth context");
                return null;
            }
            
            const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
            const currentUser = users.find(u => u.id === user.id);
            
            console.log("Current user from localStorage:", currentUser);
            console.log("Current user voting history:", currentUser?.votingHistory);
            
            if (currentUser?.votingHistory?.round1) {
                console.log("Round 1 votes:", {
                    submitted: currentUser.votingHistory.round1.submitted,
                    timestamp: currentUser.votingHistory.round1.timestamp,
                    lockVotes: currentUser.votingHistory.round1.lockVotes
                });
            } else {
                console.log("No round 1 voting history found");
            }
            
            return currentUser;
        } catch (error) {
            console.error("Error accessing localStorage:", error);
            return null;
        }
    };
    
    // Call this function when the component mounts
    useEffect(() => {
        debugLocalStorage();
    }, [user]);
  
    useEffect(() => {
      try {
        const subscription = realTimeService.subscribe('state_updated', () => {
          setForceUpdate(prev => !prev);
        });
        return () => subscription();
      } catch (error) {
        console.error("Subscription error:", error);
        setHasError(true);
      }
    }, []);
  
    // Debug log the event state
    useEffect(() => {
      console.log("SelectorDashboard - Event state:", eventState);
    }, [eventState]);
  
    if (loading) {
      return <div className="p-6 text-center">Loading...</div>;
    }
  
    if (hasError) {
      return (
        <div className="p-6 bg-red-50 rounded-lg">
          <h2 className="text-xl font-bold text-red-700">Something went wrong</h2>
          <p className="mt-2">There was an error loading the dashboard. Please try refreshing the page.</p>
        </div>
      );
    }

    // Helper function to determine what component to show based on the current phase
    const renderPhaseComponent = () => {
        try {
            const currentPhase = safeGet(eventState, 'phase');
            console.log("SelectorDashboard - Current phase:", currentPhase);
            
            switch (currentPhase) {
                case EVENT_PHASES.ROUND1_LOCK:
                    return <LockVoting />;
                case EVENT_PHASES.ROUND_LEFTOVER:
                case EVENT_PHASES.ALTERNATE_LEFTOVER:
                    return <LeftoverVoting />;
                case EVENT_PHASES.ROUND_RANKING:
                case EVENT_PHASES.ALTERNATE_RANKING:
                    return <TeamRanking />;
                case EVENT_PHASES.SEEDING:
                    return <TeamSeeding />;
                case EVENT_PHASES.SEEDING_ADJUSTMENTS:
                    return <SeedingAdjustments />;
                case EVENT_PHASES.COMPLETED:
                    return <CompletionSummary />;
                default:
                    return (
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                            <h2 className="text-xl font-semibold mb-4">Waiting for Next Phase</h2>
                            <p>The parliamentarian will advance the selection process when ready.</p>
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    Current Phase: {getCurrentPhaseDisplay()}
                                </p>
                            </div>
                        </div>
                    );
            }
        } catch (error) {
            console.error("Error rendering phase component:", error);
            return (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-red-600">Something went wrong</h2>
                    <p className="text-gray-700">An error occurred while rendering the current phase.</p>
                    <div className="mt-4 p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">
                            Please refresh the page or contact the administrator.
                        </p>
                    </div>
                </div>
            );
        }
    };

    // Helper to display a human-readable phase
        const getCurrentPhaseDisplay = () => {
            const phaseDisplays = {
                [EVENT_PHASES.PRESELECTION]: 'Preselection - Waiting to Begin',
                [EVENT_PHASES.ROUND1_AQ]: 'Round 1 - Automatic Qualifier Selection in Progress',
                [EVENT_PHASES.ROUND1_LOCK]: 'Round 1 - Lock Vote Submission',
                [EVENT_PHASES.ROUND1_FINALIZED]: 'Round 1 Complete - Waiting for Next Round',
                [EVENT_PHASES.ROUND_LEFTOVER]: 'Leftover Team Voting',
                [EVENT_PHASES.ROUND_RANKING]: 'Team Ranking Phase',
                [EVENT_PHASES.ROUND_FINALIZED]: 'Round Complete - Waiting for Next Round',
                [EVENT_PHASES.ALTERNATE_LEFTOVER]: 'Alternate Selection - Leftover Voting',
                [EVENT_PHASES.ALTERNATE_RANKING]: 'Alternate Selection - Ranking Phase',
                [EVENT_PHASES.ALTERNATE_FINALIZED]: 'Alternate Selection - Round Complete',
                [EVENT_PHASES.SEEDING]: 'Championship Seeding Phase'
            };
            return phaseDisplays[eventState.phase] || 'Unknown Phase';
        };

        

    // Display information about qualified teams
    const renderQualifiedTeamsInfo = () => {
        const qualifiedTeams = safeGet(eventState, 'qualifiedTeams', []);
        const remainingBerths = safeGet(eventState, 'remainingBerths', 0);
      
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Qualification Status</h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-700">Teams Qualified: {safeArrayLength(qualifiedTeams)}</p>
                <p className="text-gray-700">Remaining Berths: {remainingBerths}</p>
              </div>
            </div>
            
            {safeArrayLength(qualifiedTeams) > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Qualified Teams</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {qualifiedTeams.map(team => (
                    <div key={team.id} 
                         className="p-2 bg-green-50 rounded-lg flex justify-between items-center">
                      <span>{team.name}</span>
                      <span className="text-sm text-green-600">
                        {safeGet(team, 'status.qualificationMethod', 'Unknown')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      };

    return (
        <div className="space-y-6">
            {renderPhaseComponent()}
            {renderQualifiedTeamsInfo()}
        </div>
    );
}

export default SelectorDashboard;