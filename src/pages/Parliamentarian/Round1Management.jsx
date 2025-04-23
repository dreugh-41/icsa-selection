// src/pages/Parliamentarian/Round1Management.jsx
import React, { useState } from 'react';
import { useEvent } from '../../contexts/EventContext';

function Round1Management() {
    const { eventState, qualifyTeams } = useEvent();
    const [selectedTeams, setSelectedTeams] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(() => {
        // Check if any teams are already qualified as AQ
        return eventState.pendingQualifiedTeams.some(team => team.status?.qualificationMethod === 'AQ') || 
               eventState.qualifiedTeams.some(team => team.status?.qualificationMethod === 'AQ');
    });

    // Sort all teams alphabetically in a single list
    const sortedTeams = eventState.teams
        .sort((a, b) => a.name.localeCompare(b.name));

    // Handle selecting/deselecting a team
    const toggleTeamSelection = (teamId) => {
        setSelectedTeams(prev => {
            const newSelections = new Set(prev);
            if (newSelections.has(teamId)) {
                newSelections.delete(teamId);
            } else if (newSelections.size < 12) {
                newSelections.add(teamId);
            }
            return newSelections;
        });
    };

    // Handle finalizing AQ selections
    const finalizeAQSelections = () => {
        if (selectedTeams.size !== 12) {
        alert('You must select exactly 12 Automatic Qualifiers before finalizing.');
        return;
        }
        
        const qualifiedTeams = eventState.teams
        .filter(team => selectedTeams.has(team.id))
        .map(team => ({
            ...team,
            status: {
            ...team.status,
            isAQ: true,
            isQualified: true,
            qualificationMethod: 'AQ',
            qualificationRound: 1
            }
        }));
    
        // This will now set them as pending qualified teams
        qualifyTeams(qualifiedTeams);
        
        // Set as submitted
        setIsSubmitted(true);
        
        // Show a success message
        alert("Automatic Qualifiers have been selected. They will be added to the qualified teams list when the round is finalized.");
    };

    // Filter teams based on search term
    const filterTeams = (teams) => {
        if (!searchTerm.trim()) return teams;
        
        return teams.filter(team => 
            team.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    return (
        <div className="w-full bg-white rounded-lg shadow-sm">
            <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">Round 1: Automatic Qualifier Selection</h2>
    
                {isSubmitted ? (
                    <div className="bg-green-50 p-6 rounded-lg">
                        <h3 className="text-xl font-medium text-green-700 mb-2">AQ Teams Selected</h3>
                        <p className="mb-4">The Automatic Qualifier teams have been selected.</p>
                        
                        <div className="mt-4">
                            <h4 className="font-medium mb-2">Selected AQ Teams:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                                {eventState.pendingQualifiedTeams
                                    .filter(team => team.status?.qualificationMethod === 'AQ')
                                    .map(team => (
                                        <div key={team.id} className="bg-white p-3 rounded border border-green-200">
                                            {team.name}
                                        </div>
                                    ))
                                }
                                {eventState.qualifiedTeams
                                    .filter(team => team.status?.qualificationMethod === 'AQ')
                                    .map(team => (
                                        <div key={team.id} className="bg-white p-3 rounded border border-green-200">
                                            {team.name}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                        
                        {/* Add Change Selection button */}
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Change AQ Selections
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Status Display */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <p className="text-blue-700">
                                Automatic Qualifiers Selected: {selectedTeams.size}/12
                            </p>
                            {selectedTeams.size === 12 && (
                                <p className="text-green-600 mt-2">
                                    You have selected all 12 required teams. Review your selections and click Finalize when ready.
                                </p>
                            )}
                        </div>
    
                        {/* Rest of the existing content */}
                        {/* Instructions */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <p>Select 12 teams as Automatic Qualifiers. These teams will automatically advance.</p>
                            <p className="mt-2 text-sm text-gray-600">
                                Note: This selection must be completed before selectors can submit their lock votes.
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
    
                        {/* Team Selection Interface */}
                        <div className="space-y-6">
                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-3">All Teams</h4>
                                {/* Add max-height and overflow to create scrollable area */}
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                    {filterTeams(sortedTeams).map(team => (
                                        <div 
                                            key={team.id}
                                            className={`flex items-center justify-between p-2 rounded ${
                                                selectedTeams.has(team.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div>
                                                <p className="font-medium">{team.name}</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedTeams.has(team.id)}
                                                onChange={() => toggleTeamSelection(team.id)}
                                                disabled={!selectedTeams.has(team.id) && selectedTeams.size >= 12}
                                                className="h-5 w-5 text-blue-600"
                                            />
                                        </div>
                                    ))}
                                    {filterTeams(sortedTeams).length === 0 && (
                                        <div className="p-4 text-center text-gray-500 italic">
                                            No teams match your search
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
    
                        {/* Finalize Button */}
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={finalizeAQSelections}
                                disabled={selectedTeams.size !== 12}
                                className={`px-4 py-2 rounded-lg ${
                                    selectedTeams.size === 12
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-gray-300 cursor-not-allowed text-gray-500'
                                }`}
                            >
                                Finalize AQ Selections
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Round1Management;