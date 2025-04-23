// src/components/CSVUpload.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { useEvent } from '../contexts/EventContext';

function CSVUpload() {
  const { eventState, setEventTeams } = useEvent();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  
  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    
    // Parse CSV file
    Papa.parse(file, {
      header: false, // We need to handle row data directly
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
          
          if (eventState.selectionType === 'women') {
            // For Women's selection, use different columns
            rankColumn = 5; // Column F for Women's Rankings
            nameColumn = 6; // Column G for Women's Team Name
          }
          
          console.log(`Using columns for ${eventState.selectionType} selection: Rank=${rankColumn}, Name=${nameColumn}`);
          
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
          
          // Set preview data
          setPreviewData({
            teams,
            rowCount: teams.length,
            columnNames: [],
            selectionType: eventState.selectionType
          });
          
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
  
  // Confirm and import teams
  const confirmImport = () => {
    try {
      // Sort teams alphabetically
      const sortedTeams = [...previewData.teams].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      // Update teams in context
      setEventTeams(sortedTeams);
      
      setUploadSuccess(true);
      setPreviewData(null);
    } catch (error) {
      setUploadError(`Error importing teams: ${error.message}`);
    }
  };
  
  // Cancel import
  const cancelImport = () => {
    setPreviewData(null);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Import Team Data</h2>
      
      {uploadSuccess ? (
        <div className="bg-green-50 p-4 rounded-lg mb-4">
          <p className="text-green-700 font-medium">
            Team data imported successfully!
          </p>
          <p className="text-sm text-green-600 mt-1">
            {eventState.teams.length} teams are now ready for the selection process.
          </p>
        </div>
      ) : (
        <>
          {uploadError && (
            <div className="bg-red-50 p-4 rounded-lg mb-4">
              <p className="text-red-700">{uploadError}</p>
            </div>
          )}
          
          {!previewData && (
            <div className="mb-6">
              <label className="flex flex-col items-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-gray-500">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span className="text-sm text-gray-500">
                  {isUploading ? 'Uploading...' : 'Upload CSR File (CSV)'}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">CSV Format Requirements</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Currently importing for: <span className="font-bold">{eventState.selectionType === 'women' ? "Women's" : "Open"} Selection</span>
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  <li>File must be in CSV format</li>
                  <li>Data should start from row 3 of the CSV file</li>
                  {eventState.selectionType === 'women' ? (
                    <li>For Women's Selection: Using columns F (rank) and G (team name)</li>
                  ) : (
                    <li>For Open Selection: Using columns A (rank) and B (team name)</li>
                  )}
                </ul>
              </div>
            </div>
          )}
          
          {previewData && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Preview Team Data</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p>Found {previewData.rowCount} teams in the CSV file</p>
                <p className="text-sm text-gray-600 mt-1">
                  Columns detected: {previewData.columnNames.join(', ')}
                </p>
              </div>
              
              <div className="border rounded-lg overflow-hidden mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points
                        </th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.teams.slice(0, 5).map((team, index) => (
                        <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{team.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {team.conference}
                        </td>
                        </tr>
                    ))}
                    {previewData.teams.length > 5 && (
                        <tr>
                        <td colSpan="2" className="px-6 py-4 text-center text-gray-500 italic">
                            ... and {previewData.teams.length - 5} more teams
                        </td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelImport}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Import Teams
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CSVUpload;