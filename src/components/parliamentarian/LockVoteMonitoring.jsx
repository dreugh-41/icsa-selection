// src/components/parliamentarian/LockVoteMonitoring.jsx
import React, { useState, useEffect } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';

function LockVoteMonitoring() {
    const { eventState, qualifyTeams } = useEvent();
    const { user } = useAuth();
    const [selectedTab, setSelectedTab] = useState('status'); // 'status' or 'results'
    const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-renders
    
    // In a real system, we would fetch this from the backend
    // For now, we'll get actual users from our auth system
    const [selectors, setSelectors] = useState([]);
    const [teamVotes, setTeamVotes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add a function to manually refresh data
    const refreshData = () => {
        setRefreshKey(prev => prev + 1);
        loadData();
    };

    // Separated loading logic to a function for reuse
    const loadData = () => {
        try {
            setLoading(true);
            console.log("LockVoteMonitoring: Loading data from localStorage");
            
            // Load all users to check voting status
            const allUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
            console.log("Found users:", allUsers.length);
            
            const selectorUsers = allUsers.filter(u => u.role === 'selector');
            console.log("Found selectors:", selectorUsers.length);
            
            // Get selector status with detailed logging
            const selectorStatus = selectorUsers.map(selector => {
                const hasVoted = safeGet(selector, 'votingHistory.round1.submitted', false);
                const timestamp = safeGet(selector, 'votingHistory.round1.timestamp', null);
                
                console.log(`Selector ${selector.name}: voted=${hasVoted}, timestamp=${timestamp}`);
                
                return {
                    id: selector.id,
                    name: selector.name, 
                    hasVoted,
                    timestamp
                };
            });
            
            setSelectors(selectorStatus);
            
            // Count each team's votes with detailed logging
            const voteCounts = {};
            const votingSelectors = selectorUsers.filter(s => safeGet(s, 'votingHistory.round1.submitted', false)).length;
            console.log("Selectors who voted:", votingSelectors);
            
            // If no one has voted yet, just show empty data
            if (votingSelectors === 0) {
                const emptyVotes = safeGet(eventState, 'teams', [])
                    .filter(team => !safeGet(team, 'status.isQualified', false))
                    .map(team => ({
                        ...team,
                        votePercentage: 0,
                        qualifies: false
                    }));
                
                setTeamVotes(emptyVotes);
                setLoading(false);
                return;
            }
            
            // Initialize vote counts for all teams
            safeGet(eventState, 'teams', []).forEach(team => {
                voteCounts[team.id] = 0;
            });
            
            // Count votes from each selector's voting history with detailed logging
            selectorUsers.forEach(selector => {
                const votes = safeGet(selector, 'votingHistory.round1.lockVotes', []);
                console.log(`Selector ${selector.name}: ${votes.length} lock votes`);
                
                votes.forEach(teamId => {
                    if (voteCounts[teamId] !== undefined) {
                        voteCounts[teamId] += 1;
                    }
                });
            });
            
            // Calculate percentages and qualifies status
            const processedTeamVotes = safeGet(eventState, 'teams', [])
                .filter(team => !safeGet(team, 'status.isQualified', false))
                .map(team => {
                    const voteCount = voteCounts[team.id] || 0;
                    const votePercentage = votingSelectors > 0 
                        ? Math.round((voteCount / votingSelectors) * 100)
                        : 0;
                    
                    return {
                        ...team,
                        votePercentage,
                        qualifies: votePercentage >= 60 // 60% threshold
                    };
                });
            
            setTeamVotes(processedTeamVotes);
            setLoading(false);
            
            console.log("Data loading complete");
        } catch (error) {
            console.error("Error loading vote data:", error);
            setLoading(false);
        }
    };

    // Use useEffect to load data
    useEffect(() => {
        loadData();
    }, [eventState.teams, refreshKey]);
    
    // Add periodic automatic refresh for real-time updates
    useEffect(() => {
        const refreshInterval = setInterval(refreshData, 30000); // Refresh every 30 seconds
        return () => clearInterval(refreshInterval);
    }, []);
    
    // Teams that should be added to ranking group (60% or more votes)
    const qualifyingTeams = teamVotes.filter(team => team.qualifies);
    
    // Handle adding teams to ranking group
    const finalizeQualifiedTeams = () => {
        // Convert qualifying teams to the right format for our state system
        const teamsToQualify = qualifyingTeams.map(team => {
            const originalTeam = eventState.teams.find(t => t.id === team.id);
            return {
                ...originalTeam,
                status: {
                    ...originalTeam.status,
                    isLocked: true,
                    isQualified: true,
                    qualificationMethod: 'LOCK',
                    qualificationRound: eventState.currentRound
                }
            };
        });
        
        // Update our state with the newly qualified teams (as pending)
        qualifyTeams(teamsToQualify);
        
        alert(`${teamsToQualify.length} teams have been qualified through lock voting! They will be officially qualified when the round is finalized.`);
    };
    
    // Sort by vote percentage (highest first)
    const sortedTeamVotes = [...teamVotes].sort((a, b) => b.votePercentage - a.votePercentage);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Lock Vote Monitoring</h2>
            
            {/* Add a refresh button */}
            <div className="mb-4 flex justify-end">
                <button 
                    onClick={refreshData}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    Refresh Data
                </button>
            </div>
            
            {/* Show loading state */}
            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading vote data...</p>
                    </div>
                </div>
            ) : (
                /* Tab Navigation and Content */
                <div>
                    <div className="border-b mb-6">
                        <nav className="flex -mb-px">
                            <button
                                onClick={() => setSelectedTab('status')}
                                className={`mr-4 py-2 px-4 font-medium ${
                                    selectedTab === 'status'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Selector Status
                            </button>
                            <button
                                onClick={() => setSelectedTab('results')}
                                className={`py-2 px-4 font-medium ${
                                    selectedTab === 'results'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Voting Results
                            </button>
                        </nav>
                    </div>
                    
                    {/* Tab Content */}
                    {selectedTab === 'status' ? (
                        /* Selector Status Tab */
                        <div>
                            <div className="mb-4 bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Selector Voting Progress</p>
                                    <p className="text-sm text-gray-600">
                                        {selectors.filter(s => s.hasVoted).length} of {selectors.length} selectors have submitted their votes
                                    </p>
                                </div>
                                <div className="text-xl font-bold text-blue-600">
                                    {selectors.length > 0 ? 
                                        Math.round((selectors.filter(s => s.hasVoted).length / selectors.length) * 100) :
                                        0}%
                                </div>
                            </div>
                            
                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Selector Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Timestamp
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectors.map(selector => (
                                            <tr key={selector.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{selector.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {selector.hasVoted ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Voted
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {selector.timestamp || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* Voting Results Tab */
                        <div>
                            <div className="mb-4 bg-green-50 p-4 rounded-lg">
                                <p className="font-medium">Qualifying Teams ({qualifyingTeams.length})</p>
                                <p className="text-sm text-gray-600">
                                    Teams receiving votes from 60% or more of selectors qualify automatically
                                </p>
                            </div>
                            
                            <div className="border rounded-lg overflow-hidden mb-6">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Team Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Vote Percentage
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sortedTeamVotes
                                            .filter(team => team.votePercentage > 0) // Only show teams with votes
                                            .map(team => (
                                            <tr 
                                                key={team.id}
                                                className={team.qualifies ? 'bg-green-50' : ''}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{team.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div 
                                                            className={`h-2.5 rounded-full ${
                                                                team.qualifies ? 'bg-green-600' : 'bg-blue-600'
                                                            }`}
                                                            style={{ width: `${team.votePercentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-gray-600 mt-1 block">
                                                        {team.votePercentage}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {team.qualifies ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Qualifies
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            Does Not Qualify
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        
                                        {sortedTeamVotes.filter(team => team.votePercentage > 0).length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                                                    No teams have received votes yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Qualify Teams Button */}
                            {qualifyingTeams.length > 0 && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={finalizeQualifiedTeams}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        Finalize Qualifying Teams
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LockVoteMonitoring;