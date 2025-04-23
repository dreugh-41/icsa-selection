// src/utils/testData.js
export function generateTestTeams(count = 100) {
    // We'll create teams with realistic sailing school names
    const schoolPrefixes = ['University of', 'College of', 'State', 'Maritime'];
    const locations = ['New England', 'Charleston', 'California', 'Michigan', 
                      'Rhode Island', 'Boston', 'Miami', 'Annapolis', 'Texas', 
                      'Washington', 'Oregon', 'Hawaii'];
    const suffixes = ['Academy', 'Institute', 'College', 'University'];

    // This function creates a unique school name
    const generateSchoolName = (index) => {
        const prefix = schoolPrefixes[index % schoolPrefixes.length];
        const location = locations[index % locations.length];
        const suffix = suffixes[index % suffixes.length];
        
        // Not every name needs a suffix
        return index % 3 === 0 ? `${prefix} ${location}` : 
               index % 2 === 0 ? `${location} ${suffix}` : 
               `${prefix} ${location} ${suffix}`;
    };

    // Generate the specified number of teams
    return Array.from({ length: count }, (_, index) => ({
        id: `team_${index + 1}`,
        name: generateSchoolName(index),
        csrRank: index + 1,  // Initial ranking based on index
        conference: `Conference ${Math.floor(index / 16) + 1}`,  // Distribute teams across conferences
        status: {
            isAQ: false,
            isLocked: false,
            isQualified: false,
            qualificationMethod: null,  // Will be 'AQ', 'LOCK', or 'RANKING' once qualified
            qualificationRound: null    // Will store which round they qualified in
        },
        votingHistory: {
            lockVotes: 0,      // Count of lock votes received
            leftoverVotes: []  // Array of rounds where they received leftover votes
        },
        rankings: {
            // Will store ranking information for each round
            // Format: { roundNumber: { averageRank: number, individualRanks: [] } }
        }
    }));
}