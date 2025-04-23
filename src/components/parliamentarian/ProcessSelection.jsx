// src/components/parliamentarian/ProcessSelection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useEvent, EVENT_PHASES } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import Papa from 'papaparse';

function ProcessSelection() {
  const { eventState, setSelectionType, resetEventState, advancePhase, setEventTeams } = useEvent();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('');
  const [selectedSelectors, setSelectedSelectors] = useState([]);
  const [allSelectors, setAllSelectors] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [previewData, setPreviewData] = useState(null);

  // Load all available selectors
  React.useEffect(() => {
    const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
    const selectorUsers = users.filter(u => u.role === 'selector');
    setAllSelectors(selectorUsers);
  }, []);

  // Handle selector selection
  const toggleSelector = (selectorId) => {
    setSelectedSelectors(prev => {
      if (prev.includes(selectorId)) {
        return prev.filter(id => id !== selectorId);
      } else {
        return [...prev, selectorId];
      }
    });
  };

// Handle file selection
const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsUploading(true);
    setUploadError(null);
    
    // Parse CSV file
    Papa.parse(selectedFile, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setUploadError(`Error parsing CSV: ${results.errors[0].message}`);
          setIsUploading(false);
          return;
        }
        
        try {
          // Show all rows in the preview instead of just the first 5
          const allRows = results.data;
          setPreviewData(allRows);
          setIsUploading(false);
        } catch (error) {
          setUploadError(`Error processing file: ${error.message}`);
          setIsUploading(false);
        }
      },
      error: (error) => {
        setUploadError(`Error reading file: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  // Handle start process
    const handleStartProcess = () => {
        if (!file) {
        alert('Please upload the CSR file first.');
        return;
        }
        
        setIsUploading(true);
        
        // Parse CSV file
        Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            if (results.errors.length > 0) {
            setUploadError(`Error parsing CSV: ${results.errors[0].message}`);
            setIsUploading(false);
            return;
            }
            
            try {
            // Skip the first two rows (headers) and extract team data
            const rowData = results.data.slice(2);
            
            // Determine which columns to use based on selection type
            let rankColumn = 0; // Column A for Open Rankings
            let nameColumn = 1; // Column B for Open Team Name
            
            if (selectedType === 'women') {
                // For Women's selection, use different columns
                rankColumn = 5; // Column F for Women's Rankings
                nameColumn = 6; // Column G for Women's Team Name
            }
            
            // Transform data to match our team format
            const teams = rowData
                .filter(row => row[rankColumn] && row[nameColumn]) // Ensure rank and team name exist
                .map((row, index) => {
                // Extract rank and team name from the appropriate columns
                const rank = parseInt(row[rankColumn]) || (index + 1);
                const teamName = row[nameColumn] || '';
                
                return {
                    id: `team_${index + 1}`,
                    name: teamName,
                    csrRank: rank,
                    conference: 'N/A', // We don't have conference info in this CSV
                    status: {
                    isAQ: false,
                    isLocked: false,
                    isQualified: false,
                    qualificationMethod: null,
                    qualificationRound: null
                    }
                };
                });
            
            // Validate data
            if (teams.some(team => !team.name)) {
                setUploadError('Invalid CSV format: Some teams are missing names');
                setIsUploading(false);
                return;
            }
            
            // First reset the event state
            resetEventState();
            
            // Set the selection type in context
            setSelectionType(selectedType);
            
            // Set the teams in the event state
            setEventTeams(teams);
            
            // Update active selectors for this process
            const users = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
            
            const updatedUsers = users.map(user => {
                if (user.role === 'selector') {
                // Mark selectors as active/inactive based on selection
                return {
                    ...user,
                    isActive: selectedSelectors.includes(user.id)
                };
                }
                return user;
            });
            
            // Save updated users to localStorage
            localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
            
            // Hide confirmation dialog
            setShowConfirmation(false);
            
            // Advance to next phase (AQ selection)
            advancePhase();
            
            // Show success message
            alert(`${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} selection process has been initiated with ${teams.length} teams!`);
            
            setIsUploading(false);
            } catch (error) {
            setUploadError(`Error processing data: ${error.message}`);
            setIsUploading(false);
            }
        },
        error: (error) => {
            setUploadError(`Error reading file: ${error.message}`);
            setIsUploading(false);
        }
        });
    };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Start Selection Process</h2>
      
      {!showConfirmation ? (
        <>
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Select which process you want to start and which selectors will participate.
            </p>
          </div>
          
          {/* Process Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selection Process Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedType === 'open' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedType('open')}
              >
                <h3 className="font-medium">Open Selection</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Select teams for the Open National Championship
                </p>
              </div>
              <div
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedType === 'women' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedType('women')}
              >
                <h3 className="font-medium">Women's Selection</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Select teams for the Women's National Championship
                </p>
              </div>
            </div>
          </div>
          
          {/* Selector Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Participating Selectors
            </label>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {allSelectors.map(selector => (
                  <div 
                    key={selector.id}
                    className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{selector.name}</p>
                      <p className="text-sm text-gray-600">{selector.email}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedSelectors.includes(selector.id)}
                      onChange={() => toggleSelector(selector.id)}
                      className="h-5 w-5 text-blue-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSR File
            </label>
            <div 
                className="flex flex-col items-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => fileInputRef.current.click()} // This is important - trigger click on the hidden input
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-gray-500">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span className="text-sm text-gray-500">
                {isUploading ? 'Uploading...' : file ? file.name : 'Upload CSR File (CSV)'}
                </span>
                <input
                ref={fileInputRef} // Add the ref here
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
                />
            </div>
            
            {uploadError && (
                <div className="mt-2 text-sm text-red-600">
                {uploadError}
                </div>
            )}
            
            {previewData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">File Preview</h4>
                    
                    {/* Explicit height and overflow with direct styling */}
                    <div 
                    className="border rounded bg-white"
                    style={{ 
                        height: "300px", 
                        overflowY: "scroll",  // Force scroll instead of auto
                        display: "block"      // Ensure block display
                    }}
                    >
                    <table className="min-w-full table-fixed border-collapse">
                        <tbody>
                        {previewData.map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {row.slice(0, 10).filter((_, idx) => idx !== 9).map((cell, cellIndex) => (
                                <td 
                                key={cellIndex} 
                                className={`px-4 py-2 text-sm text-center border-b ${
                                    (selectedType === 'open' && (cellIndex === 0 || cellIndex === 1)) || 
                                    (selectedType === 'women' && (cellIndex === 5 || cellIndex === 6)) 
                                    ? 'bg-blue-50 font-medium' : ''
                                }`}
                                style={{ width: `${100 / 9}%` }}
                                >
                                {cell || ""}
                                </td>
                            ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                    {selectedType === 'women' 
                        ? 'Columns F-G (highlighted) will be used for Women\'s rankings.' 
                        : 'Columns A-B (highlighted) will be used for Open rankings.'}
                    </p>
                </div>
                )}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">CSV Format Requirements</h4>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                <li>File must be in CSV format</li>
                <li>Data should start from row 3 of the CSV file</li>
                <li>Open Rankings should be in columns A (rank) and B (team name)</li>
                <li>Women's Rankings should be in columns F (rank) and G (team name)</li>
                </ul>
            </div>
            </div>
          
          {/* Start Button */}
            <div className="flex justify-end">
            <button
                onClick={() => {
                if (!selectedType) {
                    alert('Please select a process type.');
                    return;
                }
                if (selectedSelectors.length < 3) {
                    alert('Please select at least 3 selectors for the process.');
                    return;
                }
                if (!file) {
                    alert('Please upload the CSR file first.');
                    return;
                }
                setShowConfirmation(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                disabled={!file || !selectedType || selectedSelectors.length < 3}
            >
                Start Selection Process
            </button>
            </div>
        </>
      ) : (
        <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="font-medium text-yellow-800 mb-4">
                Are you sure you want to start the {selectedType} selection process?
            </p>
            <div className="mb-4 text-sm">
                <p><strong>Selected Process:</strong> {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Selection</p>
                <p><strong>CSV File:</strong> {file ? file.name : 'None'}</p>
                <p><strong>Selected Selectors:</strong> {selectedSelectors.length}</p>
            </div>
            <div className="flex space-x-3 justify-end">
                <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                Cancel
                </button>
                <button
                onClick={handleStartProcess}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                Confirm & Start
                </button>
            </div>
            </div>
      )}
    </div>
  );
}

export default ProcessSelection;