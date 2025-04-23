// src/pages/Parliamentarian/ParliamentarianDashboard.jsx
import React, { useState } from 'react';
import { useEvent, EVENT_PHASES } from '../../contexts/EventContext';
import RoundControl from '../../components/RoundControl';
import Round1Management from './Round1Management';
import LockVoteMonitoring from '../../components/parliamentarian/LockVoteMonitoring';
import LeftoverVoteMonitoring from '../../components/parliamentarian/LeftoverVoteMonitoring';
import RankingMonitoring from '../../components/parliamentarian/RankingMonitoring';
import { useEffect } from 'react';
import realTimeService from '../../utils/services/realTimeService';
import CSVUpload from '../../components/CSVUpload';
import ResetProcess from '../../components/parliamentarian/ResetProcess';
import SeedingMonitoring from '../../components/parliamentarian/SeedingMonitoring';
import CompletionSummary from '../../components/CompletionSummary';
import ProcessSelection from '../../components/parliamentarian/ProcessSelection';
import SeedingAdjustments from '../../components/parliamentarian/SeedingAdjustments';

function ParliamentarianDashboard() {
    const { eventState } = useEvent();

    const [forceUpdate, setForceUpdate] = useState(false);

useEffect(() => {
    const subscription = realTimeService.subscribe('state_updated', () => {
        setForceUpdate(prev => !prev);
    });
    return () => subscription();
}, []);

    // Helper function to determine what component to show based on the current phase
    const renderPhaseComponent = () => {
      // First check if selection type is set
      if (!eventState.selectionType) {
          return <ProcessSelection />;
      }
      
      // Then handle phases as before
      switch (eventState.phase) {
          case EVENT_PHASES.ROUND1_AQ:
              return <Round1Management />;
          case EVENT_PHASES.ROUND1_LOCK:
              return <LockVoteMonitoring />;
          case EVENT_PHASES.ROUND_LEFTOVER:
          case EVENT_PHASES.ALTERNATE_LEFTOVER: // Add this case
              return <LeftoverVoteMonitoring />;
          case EVENT_PHASES.ROUND_RANKING:
          case EVENT_PHASES.ALTERNATE_RANKING: // Add this case
              return <RankingMonitoring />;
          case EVENT_PHASES.SEEDING:
              return <SeedingMonitoring />;
          case EVENT_PHASES.SEEDING_ADJUSTMENTS: // Add this case
              return <SeedingAdjustments />;
          case EVENT_PHASES.COMPLETED:
              return <CompletionSummary />;
          case EVENT_PHASES.PRESELECTION:
              return (
                  <div className="space-y-6">
                      <div className="bg-white p-6 rounded-lg shadow-sm">
                          <h2 className="text-xl font-semibold mb-4">Welcome to the Selection Process</h2>
                          <p>Use the controls above to manage the selection process phases.</p>
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-700">
                                  Before starting the selection process, you should import the team data from the CSR file.
                              </p>
                          </div>
                      </div>
                      <CSVUpload />
                  </div>
              );
          case EVENT_PHASES.ROUND1_FINALIZED:
          case EVENT_PHASES.ROUND_FINALIZED:
          case EVENT_PHASES.ALTERNATE_FINALIZED:
              return (
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                      <h2 className="text-xl font-semibold mb-4">Round Complete</h2>
                      <p>The current round has been finalized. Use the controls above to advance to the next phase.</p>
                      {eventState.phase === EVENT_PHASES.ALTERNATE_FINALIZED && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-700">
                                  {eventState.alternateCount === 1 
                                      ? "One alternate has been selected. Continue to select the second alternate."
                                      : "Both alternates have been selected. Continue to the seeding phase."}
                              </p>
                          </div>
                      )}
                  </div>
              );
          default:
              return (
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                      <h2 className="text-xl font-semibold mb-4">Welcome to the Selection Process</h2>
                      <p>Use the controls above to manage the selection process phases.</p>
                  </div>
              );
      }
  };

    // Function to render the qualified teams section with more detail
    const renderQualifiedTeams = () => {
        // Add safety checks for undefined properties
        const qualifiedTeams = eventState.qualifiedTeams || [];
        const pendingQualifiedTeams = eventState.pendingQualifiedTeams || [];
        const remainingBerths = eventState.remainingBerths || 36;
      
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Qualified Teams</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">
                  Total Qualified: {qualifiedTeams.length}
                </p>
                <p className="text-gray-600">
                  Remaining Berths: {remainingBerths}
                </p>
              </div>
              
              {/* Display pending qualified teams */}
              {pendingQualifiedTeams.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Pending Qualified Teams</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    These teams will be officially qualified when the current round is finalized.
                  </p>
                  <div className="space-y-2">
                    {pendingQualifiedTeams.map(team => (
                      <div key={team.id} 
                          className="p-2 bg-yellow-50 rounded-lg flex justify-between items-center">
                        <span>{team.name}</span>
                        <span className="text-sm text-yellow-600">
                          Pending: {team.status.qualificationMethod}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Display officially qualified teams */}
              {qualifiedTeams.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Qualified Teams List</h3>
                  <div className="space-y-2">
                    {qualifiedTeams.map(team => (
                      <div key={team.id} 
                          className="p-2 bg-green-50 rounded-lg flex justify-between items-center">
                        <span>{team.name}</span>
                        <span className="text-sm text-green-600">
                          {team.status.qualificationMethod}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      };

      return (
        <div className="space-y-6">
            {eventState.selectionType && (
                <div className="bg-blue-100 p-4 rounded-lg">
                    <p className="font-medium">
                        Current Process: {eventState.selectionType === 'women' ? "Women's" : "Open"} Selection
                    </p>
                </div>
            )}
            {eventState.selectionType && <RoundControl />}
            {renderPhaseComponent()}
            {eventState.selectionType && renderQualifiedTeams()}
            {eventState.selectionType && <ResetProcess />}
        </div>
    );
}

export default ParliamentarianDashboard;