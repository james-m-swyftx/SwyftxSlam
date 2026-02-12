/**
 * The Swyftx Slam - Ranked Ping Pong Competition
 * Powered by Slack Bolt SDK
 */

require('dotenv').config();
const { App } = require('@slack/bolt');
const Database = require('better-sqlite3');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { calculateNewRatings, getTier, generateSwissPairings, generateTrashTalk } = require('./elo');

// Initialize Slack App
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: false,
    port: process.env.PORT || 3000
});

// Initialize SQLite Database
const db = new Database('swyftx-slam.db');
db.pragma('journal_mode = WAL');

/**
 * Initialize database with schema and seed data
 */
function initDatabase() {
    console.log('📊 Initializing database...');
    
    // Read and execute schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
    
    // Seed 20 players if database is empty
    const playerCount = db.prepare('SELECT COUNT(*) as count FROM players').get().count;
    
    if (playerCount === 0) {
        console.log('🌱 Seeding 20 players...');
        const insertPlayer = db.prepare(`
            INSERT INTO players (slack_id, name, elo_rating, tier)
            VALUES (@slack_id, @name, @elo_rating, @tier)
        `);
        
        const seedPlayers = db.transaction((players) => {
            for (const player of players) {
                insertPlayer.run(player);
            }
        });
        
        // For testing purposes I am only going to add 3. 
        const players = [];
        const setElo = 1200;
        

        // Leaving rando 20 player logic here for now
        /* for (let i = 1; i <= 20; i++) {
            const baseElo = 1200;
            const variance = Math.floor(Math.random() * 400) - 200; // -200 to +200
            const elo = baseElo + variance;
            
            players.push({
                slack_id: `player${i}`,
                name: `Player ${i}`,
                elo_rating: elo,
                tier: getTier(elo)
            });
        } */
       
        
        // For now will create a link in the future to fill out -- TODO

        //TESTING
        const jjElo = 1000;
        const p2wElo = 1400; 
        
        players.push({slack_id: "James", name: 'James', elo_rating: jjElo, tier: getTier(jjElo)})
        players.push({slack_id: "Adam", name: 'Adam', elo_rating: p2wElo, tier: getTier(p2wElo)})
        players.push({slack_id: "Luke", name: 'Luke', elo_rating: p2wElo, tier: getTier(p2wElo)})
        players.push({slack_id: "Aidan", name: 'Adian', elo_rating: setElo, tier: getTier(elo)})
        players.push({slack_id: "Sam", name: 'Sam', elo_rating: setElo, tier: getTier(elo)})
        players.push({slack_id: "Angus", name: 'Angus', elo_rating: setElo, tier: getTier(elo)})
        
        seedPlayers(players);
        console.log('Seeded 5 players successfully! I am awesome!');
    }
    
    console.log('Database init!');
}

/**
 * Get leaderboard data
 */
function getLeaderboard(limit = 10) {
    const query = db.prepare(`
        SELECT id, name, elo_rating, wins, losses, tier,
               (wins + losses) as total_games
        FROM players
        ORDER BY elo_rating DESC
        LIMIT ?
    `);
    
    return query.all(limit);
}

/**
 * Get all players for matchmaking
 */
function getAllPlayers() {
    const query = db.prepare(`
        SELECT id, slack_id, name, elo_rating
        FROM players
        ORDER BY elo_rating DESC
    `);
    
    return query.all();
}

/**
 * Get player by Slack ID
 */
function getPlayerBySlackId(slackId) {
    const query = db.prepare('SELECT * FROM players WHERE slack_id = ?');
    return query.get(slackId);
}

/**
 * Update player ELO and record
 */
function updatePlayer(playerId, newElo, isWinner) {
    const tier = getTier(newElo);
    const query = db.prepare(`
        UPDATE players 
        SET elo_rating = ?,
            ${isWinner ? 'wins = wins + 1' : 'losses = losses + 1'},
            tier = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    
    query.run(newElo, tier, playerId);
}

/**
 * Record a match
 */
function recordMatch(winnerId, loserId, winnerScore, loserScore, eloChange, roundId = null) {
    const query = db.prepare(`
        INSERT INTO matches (winner_id, loser_id, winner_score, loser_score, elo_change, round_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = query.run(winnerId, loserId, winnerScore, loserScore, eloChange, roundId);
    return result.lastInsertRowid;
}

// ==================== SLASH COMMANDS ====================

/**
 * /leaderboard - Display top players
 */
app.command('/leaderboard', async ({ command, ack, client }) => {
    await ack();
    
    try {
        const leaderboard = getLeaderboard(10);
        
        // Build Block Kit UI
        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🏓 The Swyftx Slam - Leaderboard',
                    emoji: true
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '_Location: Swyftx Ping Pong Table_'
                }
            },
            {
                type: 'divider'
            }
        ];
        
        leaderboard.forEach((player, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `${medal} *${player.name}*\n${player.tier} • ELO: *${player.elo_rating}* • Record: ${player.wins}W-${player.losses}L`
                }
            });
        });
        
        blocks.push(
            {
                type: 'divider'
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: '📊 Use `/report` to record a match'
                    }
                ]
            }
        );
        
        await client.chat.postMessage({
            channel: command.channel_id,
            blocks: blocks,
            text: 'Leaderboard'
        });
        
    } catch (error) {
        console.error('Error displaying leaderboard:', error);
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            text: '❌ Error displaying leaderboard. Please try again.'
        });
    }
});

/**
 * /report - Open modal to report match result
 */
app.command('/report', async ({ command, ack, client }) => {
    await ack();
    
    try {
        const players = getAllPlayers();
        
        // Create player options for dropdowns
        const playerOptions = players.map(player => ({
            text: {
                type: 'plain_text',
                text: `${player.name} (${player.elo_rating} ELO)`,
                emoji: true
            },
            value: player.id.toString()
        }));
        
        await client.views.open({
            trigger_id: command.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'report_match_modal',
                title: {
                    type: 'plain_text',
                    text: '🏓 Report Match'
                },
                submit: {
                    type: 'plain_text',
                    text: 'Submit'
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '*Report your match results at the Swyftx Ping Pong Table*'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'winner_block',
                        element: {
                            type: 'static_select',
                            action_id: 'winner_select',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select winner'
                            },
                            options: playerOptions
                        },
                        label: {
                            type: 'plain_text',
                            text: '🏆 Winner'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'loser_block',
                        element: {
                            type: 'static_select',
                            action_id: 'loser_select',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select loser'
                            },
                            options: playerOptions
                        },
                        label: {
                            type: 'plain_text',
                            text: '💔 Loser'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'winner_score_block',
                        element: {
                            type: 'number_input',
                            action_id: 'winner_score_input',
                            is_decimal_allowed: false,
                            min_value: '0',
                            max_value: '21'
                        },
                        label: {
                            type: 'plain_text',
                            text: '🎯 Winner Score'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'loser_score_block',
                        element: {
                            type: 'number_input',
                            action_id: 'loser_score_input',
                            is_decimal_allowed: false,
                            min_value: '0',
                            max_value: '21'
                        },
                        label: {
                            type: 'plain_text',
                            text: '📉 Loser Score'
                        }
                    }
                ]
            }
        });
        
    } catch (error) {
        console.error('Error opening report modal:', error);
    }
});

/**
 * Handle match report submission
 */
app.view('report_match_modal', async ({ ack, body, view, client }) => {
    await ack();
    
    try {
        const values = view.state.values;
        
        const winnerId = parseInt(values.winner_block.winner_select.selected_option.value);
        const loserId = parseInt(values.loser_block.loser_select.selected_option.value);
        const winnerScore = parseInt(values.winner_score_block.winner_score_input.value);
        const loserScore = parseInt(values.loser_score_block.loser_score_input.value);
        
        // Validation
        if (winnerId === loserId) {
            console.error('Winner and loser cannot be the same player');
            return;
        }
        
        // Get player data
        const winner = db.prepare('SELECT * FROM players WHERE id = ?').get(winnerId);
        const loser = db.prepare('SELECT * FROM players WHERE id = ?').get(loserId);
        
        // Calculate new ELO ratings
        const { winnerNewRating, loserNewRating, ratingChange } = calculateNewRatings(
            winner.elo_rating,
            loser.elo_rating
        );
        
        // Update database
        const updateTransaction = db.transaction(() => {
            updatePlayer(winnerId, winnerNewRating, true);
            updatePlayer(loserId, loserNewRating, false);
            recordMatch(winnerId, loserId, winnerScore, loserScore, ratingChange);
        });
        
        updateTransaction();
        
        // Generate trash talk message
        const trashTalk = generateTrashTalk(winner.name, loser.name, ratingChange, winnerScore, loserScore);
        
        // Post to results channel
        const resultsChannel = process.env.RESULTS_CHANNEL_ID || body.user.id;
        
        await client.chat.postMessage({
            channel: resultsChannel,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: trashTalk
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*${winner.name}*\n${winner.elo_rating} → *${winnerNewRating}* (+${ratingChange})\n${getTier(winnerNewRating)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*${loser.name}*\n${loser.elo_rating} → *${loserNewRating}* (${loserNewRating - loser.elo_rating})\n${getTier(loserNewRating)}`
                        }
                    ]
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: '📍 Location: Swyftx Ping Pong Table'
                        }
                    ]
                }
            ],
            text: `Match result: ${winner.name} beat ${loser.name}`
        });
        
        console.log(`✅ Match recorded: ${winner.name} beat ${loser.name} ${winnerScore}-${loserScore}`);
        
    } catch (error) {
        console.error('Error processing match report:', error);
    }
});

// ==================== CRON JOB: WEEKLY PAIRINGS ====================

/**
 * Generate and send weekly pairings
 */
async function generateWeeklyPairings() {
    console.log('🗓️  Generating weekly pairings...');
    
    try {
        const players = getAllPlayers();
        
        if (players.length < 2) {
            console.error('Not enough players for pairings');
            return;
        }
        
        // Ensure even number of players
        let activePlayers = players;
        if (players.length % 2 !== 0) {
            activePlayers = players.slice(0, players.length - 1);
            console.log(`⚠️  Odd number of players (${players.length}). Using ${activePlayers.length} players.`);
        }
        
        // Generate Swiss pairings
        const pairings = generateSwissPairings(activePlayers);
        
        // Create new round
        const createRound = db.prepare(`
            INSERT INTO rounds (week_start, status)
            VALUES (date('now'), 'active')
        `);
        const roundResult = createRound.run();
        const roundId = roundResult.lastInsertRowid;
        
        // Save pairings to database
        const insertPairing = db.prepare(`
            INSERT INTO pairings (round_id, player1_id, player2_id)
            VALUES (?, ?, ?)
        `);
        
        const savePairings = db.transaction((pairs) => {
            for (const pair of pairs) {
                insertPairing.run(roundId, pair.player1.id, pair.player2.id);
            }
        });
        
        savePairings(pairings);
        
        // Send DMs to all paired players
        for (const pairing of pairings) {
            const { player1, player2 } = pairing;
            
            const message = {
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: '🏓 You have been matched!',
                            emoji: true
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*You've been paired at the Swyftx Ping Pong Table!*\n\nSchedule your game now.`
                        }
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Your Opponent:*\n${player1.id === pairing.player1.id ? player2.name : player1.name}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Their ELO:*\n${player1.id === pairing.player1.id ? player2.elo_rating : player1.elo_rating}`
                            }
                        ]
                    },
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: '📍 Location: Swyftx Ping Pong Table • Use `/report` to record results'
                            }
                        ]
                    }
                ],
                text: 'You have been matched at the Swyftx Ping Pong Table!'
            };
            
            // Send to player 1
            try {
                await app.client.chat.postMessage({
                    channel: player1.slack_id,
                    ...message
                });
                console.log(`✉️  Sent pairing DM to ${player1.name}`);
            } catch (error) {
                console.error(`Failed to send DM to ${player1.name}:`, error.message);
            }
            
            // Send to player 2 (with opponent info swapped)
            try {
                await app.client.chat.postMessage({
                    channel: player2.slack_id,
                    ...message
                });
                console.log(`✉️  Sent pairing DM to ${player2.name}`);
            } catch (error) {
                console.error(`Failed to send DM to ${player2.name}:`, error.message);
            }
        }
        
        console.log(`✅ Generated ${pairings.length} pairings for round ${roundId}`);
        
    } catch (error) {
        console.error('Error generating weekly pairings:', error);
    }
}

// Schedule cron job (Monday 9 AM) - Brissy time bu TZ is finiky so might just from default
const cronSchedule = process.env.CRON_SCHEDULE || '0 9 * * 1';
cron.schedule(cronSchedule, generateWeeklyPairings, {
    timezone: process.env.TZ || 'Australia/Brisbane'
});

console.log(`⏰ Cron job scheduled: ${cronSchedule}`);

// ==================== START SERVER ====================

(async () => {
    // Initialize database
    initDatabase();
    
    // Start Slack app
    await app.start();
    console.log('⚡ The Swyftx Slam is running!');
    console.log(`🌐 Server listening on port ${process.env.PORT || 3000}`);
})();

// Export for testing
module.exports = { app, db, initDatabase, generateWeeklyPairings };
