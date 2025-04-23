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

function SelectorDashboard() {
    const { eventState, loading } = useEvent();

    const [forceUpdate, setForceUpdate] = useState(false);
    
    useEffect(() => {
        const subscription = realTimeService.subscribe('state_updated', () => {
            setForceUpdate(prev => !prev);
        });
        return () => subscription();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="spinner">Loading...</div>
            </div>
        );
    }

    // Helper function to determine what component to show based on the current phase
    const renderPhaseComponent = () => {
        switch (eventState.phase) {
            case EVENT_PHASES.ROUND1_LOCK:
                return <LockVoting />;
            case EVENT_PHASES.ROUND_LEFTOVER:
            case EVENT_PHASES.ALTERNATE_LEFTOVER: // Add this case
                return <LeftoverVoting />;
            case EVENT_PHASES.ROUND_RANKING:
            case EVENT_PHASES.ALTERNATE_RANKING: // Add this case
                return <TeamRanking />;
            case EVENT_PHASES.SEEDING:
                return <TeamSeeding />;
            case EVENT_PHASES.SEEDING_ADJUSTMENTS: // Add this case
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
        // Check if eventState.qualifiedTeams exists before accessing it
        const qualifiedTeamsCount = eventState.qualifiedTeams?.length || 0;
        
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Qualification Status</h2>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-gray-700">Teams Qualified: {qualifiedTeamsCount}</p>
                        <p className="text-gray-700">Remaining Berths: {eventState.remainingBerths || 0}</p>
                    </div>
                </div>
                
                {(eventState.qualifiedTeams && eventState.qualifiedTeams.length > 0) && (
                    <div className="mt-4">
                        <h3 className="text-lg font-medium mb-2">Qualified Teams</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {eventState.qualifiedTeams.map(team => (
                                <div key={team.id} 
                                     className="p-2 bg-green-50 rounded-lg flex justify-between items-center">
                                    <span>{team.name}</span>
                                    <span className="text-sm text-green-600">
                                        {team.status?.qualificationMethod || 'Unknown'}
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