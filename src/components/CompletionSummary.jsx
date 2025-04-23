// src/components/CompletionSummary.jsx
import React, { useState, useEffect } from 'react';
import { useEvent } from '../contexts/EventContext';

function CompletionSummary() {
  const { eventState } = useEvent();
  const [eastTeams, setEastTeams] = useState([]);
  const [westTeams, setWestTeams] = useState([]);
  const [alternates, setAlternates] = useState([]);

  // Define the seed numbers for East division
  const eastSeeds = [1, 4, 5, 8, 9, 12, 13, 16, 17, 20, 21, 24, 25, 28, 29, 32, 33, 36];
  
  // Function to check if a seed belongs to East division
  const isEastSeed = (seed) => eastSeeds.includes(seed);

  useEffect(() => {
    // Get all qualified teams (excluding alternates)
    const qualifiedTeams = [...eventState.qualifiedTeams].filter(team => 
      !team.status.isAlternate && team.status.qualificationMethod !== 'ALTERNATE'
    );
    
    // Get alternates
    const alternateTeams = [...eventState.qualifiedTeams].filter(team => 
      team.status.isAlternate || team.status.qualificationMethod === 'ALTERNATE'
    );
    
    // Load seeding data
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
    
    // Calculate average seed for each team
    const teamsWithSeeding = qualifiedTeams.map(team => {
      let averageSeed = null;
      if (teamSeedSums[team.id] && teamSeedCounts[team.id]) {
        averageSeed = Math.round(teamSeedSums[team.id] / teamSeedCounts[team.id]);
      }
      
      return {
        ...team,
        averageSeed: averageSeed || 999 // Default high value if no seeding data
      };
    });
    
    // Sort by average seed
    const sortedTeams = [...teamsWithSeeding].sort((a, b) => a.averageSeed - b.averageSeed);
    
    // Assign seeds 1-36 based on sorted order
    const teamsWithAssignedSeeds = sortedTeams.map((team, index) => ({
      ...team,
      assignedSeed: index + 1 // 1-based seeding
    }));
    
    // Check if we have seeding adjustments stored
    const seedingAdjustments = localStorage.getItem('sailing_nationals_seeding_adjustments');
    
    if (seedingAdjustments) {
      // Use stored adjustments
      const { east, west } = JSON.parse(seedingAdjustments);
      setEastTeams(east);
      setWestTeams(west);
    } else {
      // Split into East and West based on the assigned seeds
      const east = [];
      const west = [];
      
      teamsWithAssignedSeeds.forEach(team => {
        if (isEastSeed(team.assignedSeed)) {
          east.push(team);
        } else {
          west.push(team);
        }
      });
      
      // Sort each division by seed
      east.sort((a, b) => a.assignedSeed - b.assignedSeed);
      west.sort((a, b) => a.assignedSeed - b.assignedSeed);
      
      setEastTeams(east);
      setWestTeams(west);
    }
    
    // For alternates, preserve their original ranking order
    setAlternates(alternateTeams);
  }, [eventState.qualifiedTeams]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-green-700">Selection Process Completed</h2>
        <p className="text-lg text-gray-600 mt-2">
          The national championship selection process has concluded. Below are the final results and division assignments.
        </p>
      </div>
      
      {/* Divisions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* East Division */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-blue-700">East Division</h3>
          <div className="overflow-hidden border rounded-lg">
            <div className="bg-blue-50 p-3 border-b font-medium">
              Teams: {eastTeams.length}
            </div>
            <div className="divide-y">
              {eastTeams.map(team => (
                <div key={team.id} className="p-3 flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full mr-3">
                    {team.assignedSeed}
                  </div>
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-xs text-gray-500">
                      {team.status.qualificationMethod} (Round {team.status.qualificationRound})
                    </p>
                  </div>
                </div>
              ))}
              {eastTeams.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No teams in East division
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* West Division */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-green-700">West Division</h3>
          <div className="overflow-hidden border rounded-lg">
            <div className="bg-green-50 p-3 border-b font-medium">
              Teams: {westTeams.length}
            </div>
            <div className="divide-y">
              {westTeams.map(team => (
                <div key={team.id} className="p-3 flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full mr-3">
                    {team.assignedSeed}
                  </div>
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-xs text-gray-500">
                      {team.status.qualificationMethod} (Round {team.status.qualificationRound})
                    </p>
                  </div>
                </div>
              ))}
              {westTeams.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No teams in West division
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Alternates */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Alternate Teams</h3>
        <div className="overflow-hidden border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qualification
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alternates.map((team, index) => (
                <tr key={team.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-8 h-8 flex items-center justify-center bg-yellow-100 rounded-full font-medium">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{team.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    Round {team.status.qualificationRound}
                  </td>
                </tr>
              ))}
              {alternates.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                    No alternates available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CompletionSummary;