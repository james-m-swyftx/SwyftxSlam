const K_FACTOR = 60;

/**
 * Calculate expected score for a player
 * @param {number} playerRating - Current ELO rating of the player
 * @param {number} opponentRating - Current ELO rating of the opponent
 * @returns {number} Expected score (0 to 1)
 */
function getExpectedScore(playerRating, opponentRating) {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate new ELO ratings after a match
 * @param {number} winnerRating - Winner's current ELO
 * @param {number} loserRating - Loser's current ELO
 * @returns {Object} { winnerNewRating, loserNewRating, ratingChange }
 */
function calculateNewRatings(winnerRating, loserRating) {
    const winnerExpected = getExpectedScore(winnerRating, loserRating);
    const loserExpected = getExpectedScore(loserRating, winnerRating);
    
    // Winner gets 1 point, loser gets 0
    const winnerChange = Math.round(K_FACTOR * (1 - winnerExpected));
    const loserChange = Math.round(K_FACTOR * (0 - loserExpected));
    
    return {
        winnerNewRating: winnerRating + winnerChange,
        loserNewRating: loserRating + loserChange,
        ratingChange: winnerChange
    };
}

/**
 * Determine tier based on ELO rating
 * @param {number} elo - Player's ELO rating
 * @returns {string} Tier name with emoji
 */
function getTier(elo) {
    if (elo >= 1400) return '💼 Do some work';
    if (elo >= 1300) return '💎 Diamond';
    if (elo >= 1250) return '🥇 Gold';
    if (elo >= 1200) return '🥈 Silver';
    if (elo >= 1150) return '🥉 Bronze';
    if (elo >= 1075) return '⚪ Iron';
    return '📦 Cardboard';
}

/**
 * Swiss-System Pairing Algorithm
 * Pairs players with similar ELO ratings
 * @param {Array} players - Array of player objects with {id, elo_rating}
 * @returns {Array} Array of pairing objects [{player1, player2}]
 */
function generateSwissPairings(players) {
    if (players.length % 2 !== 0) {
        throw new Error('Swiss pairing requires an even number of players');
    }
    
    // Sort players by ELO rating (highest first)
    const sortedPlayers = [...players].sort((a, b) => b.elo_rating - a.elo_rating);
    
    const pairings = [];
    const paired = new Set();
    
    // Simple Swiss pairing: pair adjacent players in sorted list
    for (let i = 0; i < sortedPlayers.length; i++) {
        if (paired.has(sortedPlayers[i].id)) continue;
        
        // Find the next unpaired player
        for (let j = i + 1; j < sortedPlayers.length; j++) {
            if (!paired.has(sortedPlayers[j].id)) {
                pairings.push({
                    player1: sortedPlayers[i],
                    player2: sortedPlayers[j]
                });
                paired.add(sortedPlayers[i].id);
                paired.add(sortedPlayers[j].id);
                break;
            }
        }
    }
    
    return pairings;
}

/**
 * Generate a trash talk message based on ELO difference
 * @param {string} winnerName - Winner's name
 * @param {string} loserName - Loser's name
 * @param {number} eloChange - ELO points changed
 * @param {number} winnerScore - Winner's score
 * @param {number} loserScore - Loser's score
 * @returns {string} Trash talk message
 */
function generateTrashTalk(winnerName, loserName, eloChange, winnerScore, loserScore) {
    const messages = [
        `🏓 *${winnerName}* absolutely DEMOLISHED *${loserName}* ${winnerScore}-${loserScore}! (+${eloChange} ELO)`,
        `🔥 *${winnerName}* served up a beating to *${loserName}*! Final score: ${winnerScore}-${loserScore} (+${eloChange} ELO)`,
        `💪 *${winnerName}* proved who's boss, crushing *${loserName}* ${winnerScore}-${loserScore}! (+${eloChange} ELO)`,
        `⚡ *${winnerName}* showed no mercy against *${loserName}*! ${winnerScore}-${loserScore} (+${eloChange} ELO)`,
        `🎯 *${winnerName}* dominated the table, defeating *${loserName}* ${winnerScore}-${loserScore}! (+${eloChange} ELO)`,
        `🏆 Victory for *${winnerName}*! *${loserName}* goes down ${winnerScore}-${loserScore} (+${eloChange} ELO)`,
        `💥 SMASHED! *${winnerName}* takes down *${loserName}* ${winnerScore}-${loserScore}! (+${eloChange} ELO)`,
        `🎪 *${winnerName}* put on a show, beating *${loserName}* ${winnerScore}-${loserScore}! (+${eloChange} ELO)`
    ];
    
    if (eloChange > 25) {
        messages.push(`🚀 UPSET ALERT! *${winnerName}* shocked everyone by beating *${loserName}* ${winnerScore}-${loserScore}! (+${eloChange} ELO)`);
    }
    
    if (winnerScore === 11 && loserScore <= 3) {
        messages.push(`😱 TOTAL DESTRUCTION! *${winnerName}* embarrassed *${loserName}* ${winnerScore}-${loserScore}! Better luck next time! (+${eloChange} ELO)`);
    }
    
    return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = {
    calculateNewRatings,
    getTier,
    generateSwissPairings,
    generateTrashTalk,
    K_FACTOR
};
