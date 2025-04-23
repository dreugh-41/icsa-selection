// src/components/admin/SelectionLogs.jsx
import React, { useState, useEffect } from 'react';
import { getAllLogs, deleteLog } from '../../utils/services/logService';

function SelectionLogs() {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedLogIds, setSelectedLogIds] = useState(new Set());

  // Load logs on component mount
  useEffect(() => {
    loadLogs();
  }, []);

  // Function to load logs from storage
  const loadLogs = () => {
    const allLogs = getAllLogs();
    setLogs(allLogs);
  };

  // Function to delete a log
  const handleDeleteLog = (logId) => {
    if (window.confirm('Are you sure you want to delete this log?')) {
      deleteLog(logId);
      loadLogs();
      if (selectedLog?.id === logId) {
        setSelectedLog(null);
      }
    }
  };

  const handleDeleteSelectedLogs = () => {
    if (selectedLogIds.size === 0) {
      alert('No logs selected');
      return;
    }
  
    if (window.confirm(`Are you sure you want to delete ${selectedLogIds.size} selected log entries?`)) {
      // Get current logs
      const allLogs = getAllLogs();
      
      // Filter out the selected logs
      const updatedLogs = allLogs.filter(log => !selectedLogIds.has(log.id));
      
      // Save the updated logs
      localStorage.setItem('sailing_nationals_selection_logs', JSON.stringify(updatedLogs));
      
      // Clear selected IDs
      setSelectedLogIds(new Set());
      
      // Refresh logs list
      loadLogs();
    }
  };
  
  // Function to toggle a single log selection
  const toggleLogSelection = (logId) => {
    setSelectedLogIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(logId)) {
        newSelected.delete(logId);
      } else {
        newSelected.add(logId);
      }
      return newSelected;
    });
  };
  
  // Function to select/deselect all logs
  const toggleSelectAll = () => {
    if (selectedLogIds.size === sortedLogs.length) {
      // If all are selected, deselect all
      setSelectedLogIds(new Set());
    } else {
      // Otherwise, select all
      setSelectedLogIds(new Set(sortedLogs.map(log => log.id)));
    }
  };

  // Function to format date for display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Function to get event description
  const getEventDescription = (log) => {
    switch (log.data.event) {
      case 'phase_change':
        return `Phase changed: ${log.data.oldPhase} → ${log.data.newPhase}`;
      case 'teams_qualified':
        return `Teams qualified: ${log.data.newlyQualifiedTeams?.length || 0} teams`;
      case 'ranking_group_updated':
        return `Ranking group updated: ${log.data.teamsCount} teams`;
      case 'rankings_submitted':
        return `Rankings submitted for Round ${log.data.round}`;
    case 'process_completed':
        return `Selection process completed: ${log.data.summary.totalQualified} qualified, ${log.data.summary.totalAlternates} alternates`;
      default:
        return log.data.event;
    }
  };

  // Filter logs based on search and type filter
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || log.type === filterType;
    return matchesSearch && matchesType;
  });

  // Sort logs by timestamp (newest first)
  const sortedLogs = [...filteredLogs].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Selection Process Logs</h2>
      
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </div>
        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border rounded-lg"
          >
            <option value="all">All Processes</option>
            <option value="open">Open Selection</option>
            <option value="women">Women's Selection</option>
          </select>
        </div>
      </div>
      
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log list */}
        <div className="lg:col-span-1 border rounded-lg overflow-hidden">
          {/* Modify the Log Entries header in the logs list */}
          <div className="bg-gray-50 p-3 border-b font-medium flex justify-between items-center">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedLogIds.size === sortedLogs.length && sortedLogs.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 mr-2 text-blue-600"
              />
              <span>Log Entries ({sortedLogs.length})</span>
            </div>
            
            {selectedLogIds.size > 0 && (
              <button
                onClick={handleDeleteSelectedLogs}
                className="text-red-600 hover:text-red-900 text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete Selected ({selectedLogIds.size})
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
            {sortedLogs.length > 0 ? (
              <div className="divide-y">
                {sortedLogs.map(log => (
                  <div 
                    key={log.id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedLog?.id === log.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          checked={selectedLogIds.has(log.id)}
                          onChange={() => toggleLogSelection(log.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 mr-2 mt-1 text-blue-600"
                        />
                        <div onClick={() => setSelectedLog(log)}>
                          <div className="text-sm font-medium mb-1">
                            {log.type === 'women' ? "Women's" : "Open"} Selection
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {formatDate(log.timestamp)}
                          </div>
                          <div className="text-sm text-gray-700">
                            {getEventDescription(log)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLog(log.id);
                        }}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete log"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No log entries found
              </div>
            )}
          </div>
        </div>
        
        {/* Log details */}
        <div className="lg:col-span-2 border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3 border-b font-medium">
            Log Details
          </div>
          
          <div className="p-4 overflow-y-auto" style={{ maxHeight: "600px" }}>
            {selectedLog ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">
                    {selectedLog.type === 'women' ? "Women's" : "Open"} Selection
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedLog.timestamp)}
                  </p>
                  <div className="mt-2 px-2 py-1 inline-block text-xs font-medium rounded bg-blue-100 text-blue-800">
                    {selectedLog.data.event}
                  </div>
                  {selectedLog.data.round && (
                    <div className="mt-2 px-2 py-1 inline-block text-xs font-medium rounded bg-purple-100 text-purple-800 ml-2">
                      Round {selectedLog.data.round}
                    </div>
                  )}
                  {selectedLog.data.phase && (
                    <div className="mt-2 px-2 py-1 inline-block text-xs font-medium rounded bg-green-100 text-green-800 ml-2">
                      {selectedLog.data.phase}
                    </div>
                  )}
                </div>
                
                {/* Event-specific details */}
                {selectedLog.data.event === 'phase_change' && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Phase Transition</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center">
                        <div className="bg-yellow-100 p-2 rounded">
                          {selectedLog.data.oldPhase}
                        </div>
                        <div className="mx-2">→</div>
                        <div className="bg-green-100 p-2 rounded">
                          {selectedLog.data.newPhase}
                        </div>
                      </div>
                      <div className="mt-3 text-sm">
                        <div><span className="font-medium">Round:</span> {selectedLog.data.currentRound}</div>
                        <div><span className="font-medium">Qualified Teams:</span> {selectedLog.data.qualifiedTeamsCount}</div>
                        <div><span className="font-medium">Remaining Berths:</span> {selectedLog.data.remainingBerths}</div>
                        <div><span className="font-medium">Ranking Group Size:</span> {selectedLog.data.rankingGroupSize}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedLog.data.event === 'teams_qualified' && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Newly Qualified Teams</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      {selectedLog.data.newlyQualifiedTeams?.length > 0 ? (
                        <div className="space-y-2">
                          {selectedLog.data.newlyQualifiedTeams.map((team, index) => (
                            <div key={index} className="flex justify-between bg-white p-2 rounded border">
                              <div>{team.name}</div>
                              <div className="text-sm text-gray-600">{team.qualificationMethod}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No teams qualified in this event</p>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedLog.data.event === 'ranking_group_updated' && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Ranking Group Teams</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      {selectedLog.data.teams?.length > 0 ? (
                        <div className="space-y-2">
                          {selectedLog.data.teams.map((team, index) => (
                            <div key={index} className="bg-white p-2 rounded border">
                              {team.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No teams in ranking group</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedLog.data.event === 'process_completed' && (
                <div>
                    <div className="mb-4">
                    <h4 className="font-medium mb-2">Process Completion Summary</h4>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-white rounded shadow text-center">
                            <div className="text-2xl font-bold text-green-600">{selectedLog.data.summary.totalQualified}</div>
                            <div className="text-sm text-gray-600">Qualified Teams</div>
                        </div>
                        <div className="p-3 bg-white rounded shadow text-center">
                            <div className="text-2xl font-bold text-yellow-600">{selectedLog.data.summary.totalAlternates}</div>
                            <div className="text-sm text-gray-600">Alternates</div>
                        </div>
                        <div className="p-3 bg-white rounded shadow text-center">
                            <div className="text-2xl font-bold text-gray-600">{selectedLog.data.summary.totalLeftover}</div>
                            <div className="text-sm text-gray-600">Non-Qualified</div>
                        </div>
                        <div className="p-3 bg-white rounded shadow text-center">
                            <div className="text-2xl font-bold text-blue-600">{selectedLog.data.totalTeamsCount}</div>
                            <div className="text-sm text-gray-600">Total Teams</div>
                        </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 text-center">
                        Final results for {selectedLog.data.summary.selectionType === 'women' ? "Women's" : "Open"} Selection Process
                        </p>
                    </div>
                    </div>

                    {/* Qualified Teams with Seeding */}
                    <div className="mb-4">
                    <h4 className="font-medium mb-2">Qualified Teams (with Seeding)</h4>
                    <div className="bg-gray-50 p-3 rounded-lg overflow-hidden">
                        <div className="space-y-2">
                        {selectedLog.data.qualifiedTeams.map((team, index) => (
                            <div key={team.id} className="flex justify-between items-center bg-white p-2 rounded border border-green-200">
                            <div className="flex items-center">
                                <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full mr-3">
                                {index + 1}
                                </div>
                                <div>
                                <div className="font-medium">{team.name}</div>
                                <div className="text-xs text-gray-500">Qualified via {team.qualificationMethod} in Round {team.qualificationRound}</div>
                                </div>
                            </div>
                            <div className="font-medium">
                                Seed: {team.averageSeed}
                            </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    </div>

                    {/* Alternate Teams */}
                    <div className="mb-4">
                    <h4 className="font-medium mb-2">Alternate Teams</h4>
                    <div className="bg-gray-50 p-3 rounded-lg overflow-hidden">
                        <div className="space-y-2">
                        {selectedLog.data.alternateTeams.length > 0 ? (
                            selectedLog.data.alternateTeams.map((team, index) => (
                            <div key={team.id} className="flex justify-between items-center bg-white p-2 rounded border border-yellow-200">
                                <div className="flex items-center">
                                <div className="w-8 h-8 flex items-center justify-center bg-yellow-100 rounded-full mr-3">
                                    ALT {index + 1}
                                </div>
                                <div>
                                    <div className="font-medium">{team.name}</div>
                                    <div className="text-xs text-gray-500">Selected as alternate in Round {team.qualificationRound}</div>
                                </div>
                                </div>
                            </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center p-2">No alternate teams</p>
                        )}
                        </div>
                    </div>
                    </div>

                    {/* Non-Qualified Teams */}
                    <div className="mb-4">
                    <h4 className="font-medium mb-2">Non-Qualified Teams</h4>
                    <div className="bg-gray-50 p-3 rounded-lg overflow-y-auto max-h-60">
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Team Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">CSR Rank</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {selectedLog.data.leftoverTeams.sort((a, b) => a.csrRank - b.csrRank).map((team) => (
                            <tr key={team.id}>
                                <td className="px-4 py-2 whitespace-nowrap">{team.name}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-500">{team.csrRank}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    </div>
                </div>
                )}
                
                {selectedLog.data.event === 'rankings_submitted' && (
                    <div>
                        {/* Display Final Round information if available */}
                        {selectedLog.data.finalRoundInfo && (
                        <div className="mb-4">
                            <h4 className="font-medium mb-2 text-red-600">Final Round Selection Results</h4>
                            <div className="bg-red-50 p-3 rounded-lg mb-4 border border-red-200">
                            <div className="mb-2 font-medium">Teams Qualifying ({selectedLog.data.finalRoundInfo.mainQualifiers.length})</div>
                            <div className="space-y-2 mb-4">
                                {selectedLog.data.finalRoundInfo.mainQualifiers.map((team, index) => (
                                <div key={index} className="flex justify-between bg-white p-2 rounded border border-green-200">
                                    <div className="flex items-center">
                                    <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full mr-3">
                                        {index + 1}
                                    </div>
                                    <div>{team.teamName}</div>
                                    </div>
                                    <div className="font-medium text-green-600">
                                    Avg Rank: {team.averageRank}
                                    </div>
                                </div>
                                ))}
                            </div>
                            
                            <div className="mb-2 font-medium">Alternates ({selectedLog.data.finalRoundInfo.alternates.length})</div>
                            <div className="space-y-2 mb-4">
                                {selectedLog.data.finalRoundInfo.alternates.map((team, index) => (
                                <div key={index} className="flex justify-between bg-white p-2 rounded border border-yellow-200">
                                    <div className="flex items-center">
                                    <div className="w-8 h-8 flex items-center justify-center bg-yellow-100 rounded-full mr-3">
                                        ALT {index + 1}
                                    </div>
                                    <div>{team.teamName}</div>
                                    </div>
                                    <div className="font-medium text-yellow-600">
                                    Avg Rank: {team.averageRank}
                                    </div>
                                </div>
                                ))}
                            </div>
                            
                            <div className="mb-2 font-medium">Non-Qualifying Teams ({selectedLog.data.finalRoundInfo.nonQualifiers.length})</div>
                            <div className="space-y-2">
                                {selectedLog.data.finalRoundInfo.nonQualifiers.map((team, index) => (
                                <div key={index} className="flex justify-between bg-white p-2 rounded border">
                                    <div>{team.teamName}</div>
                                    <div className="text-gray-600">
                                    Avg Rank: {team.averageRank}
                                    </div>
                                </div>
                                ))}
                            </div>
                            
                            <div className="mt-4 text-sm text-gray-600">
                                <p>Total teams in ranking group: {selectedLog.data.finalRoundInfo.rankingGroupSize}</p>
                                <p>Remaining berths filled: {selectedLog.data.finalRoundInfo.remainingBerths}</p>
                            </div>
                            </div>
                        </div>
                        )}
                    <h4 className="font-medium mb-2">Average Rankings</h4>
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <div className="mb-2 text-sm text-gray-600">Top ranked teams based on selector averages</div>
                      {selectedLog.data.averageRankings?.length > 0 ? (
                        <div className="space-y-2">
                          {selectedLog.data.averageRankings.map((team, index) => (
                            <div key={index} className="flex justify-between bg-white p-2 rounded border">
                              <div className="flex items-center">
                                <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full mr-3">
                                  {index + 1}
                                </div>
                                <div>{team.teamName}</div>
                              </div>
                              <div className="font-medium">
                                Avg: {team.averageRank}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No average rankings available</p>
                      )}
                    </div>
                    
                    <h4 className="font-medium mb-2">Individual Selector Rankings</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      {selectedLog.data.selectorRankings?.length > 0 ? (
                        <div className="space-y-4">
                          {selectedLog.data.selectorRankings.map((selector, index) => (
                            <div key={index} className="bg-white p-3 rounded border">
                              <h5 className="font-medium mb-2">{selector.selectorName}'s Rankings</h5>
                              <div className="space-y-1">
                                {selector.rankings.map((ranking, idx) => (
                                  <div key={idx} className="flex justify-between text-sm border-b pb-1 last:border-b-0">
                                    <div className="flex items-center">
                                      <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full mr-2">
                                        {ranking.rank}
                                      </div>
                                      <div>{ranking.teamName}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No individual rankings available</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Raw data for debugging */}
                <div className="mt-6">
                  <details>
                    <summary className="cursor-pointer text-sm text-gray-500">View Raw Data</summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto" style={{ maxHeight: "300px" }}>
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 p-10">
                Select a log entry to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SelectionLogs;