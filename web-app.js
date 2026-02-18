/**
 * The Swyftx Slam - Web Application
 * Ping Pong Tournament with ELO Rankings
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { calculateNewRatings, getTier, generateSwissPairings, generateTrashTalk } = require('./elo');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'swyftx-slam-secret-change-in-production';
const LEAGUE_DURATION_WEEKS = 4;
const GAMES_PER_WEEK = 2;

// Trust proxy - Required for Render.com and other hosted platforms
app.set('trust proxy', 1);

// Database setup - SQLite (ephemeral on Amplify)
const dbPath = fs.existsSync('/tmp') ? '/tmp/swyftx-slam.db' : 'swyftx-slam.db';
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

/**
 * Initialize database with schema
 */
async function initDatabase() {
    console.log('📊 Initializing database...');
    console.log(`💾 Database: ${dbPath}`);
    
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
    
    // Migration: Add new columns if they don't exist
    try {
        db.prepare("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0").run();
        console.log('✅ Added is_admin column to users table');
    } catch (e) {
        // Column already exists
    }
    
    // Create or ensure default admin account exists
    await ensureDefaultAdmin();
    
    console.log('✅ Database initialized!');
    console.log('⚠️  Note: Database is ephemeral - data will be lost on redeploy');
}

/**
 * Ensure default admin account exists
 */
async function ensureDefaultAdmin() {
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    
    try {
        // Check if admin account already exists
        const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get(ADMIN_USERNAME);
        
        if (existingAdmin) {
            // Ensure user is marked as admin
            db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run(ADMIN_USERNAME);
            
            // Remove player profile if it exists (admin should not be a player)
            db.prepare('DELETE FROM players WHERE user_id = ?').run(existingAdmin.id);
            
            console.log(`👑 Default admin account "${ADMIN_USERNAME}" verified (not a player)`);
        } else {
            // Create new admin account (user only, no player profile)
            const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
            
            db.prepare(`
                INSERT INTO users (username, password_hash, is_admin)
                VALUES (?, ?, 1)
            `).run(ADMIN_USERNAME, passwordHash);
            
            console.log(`🎉 Created default admin account: "${ADMIN_USERNAME}" / "${ADMIN_PASSWORD}" (admin only, not a player)`);
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
    
    // Also promote first user if no other admins exist (backward compatibility)
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get();
    if (adminCount.count === 0) {
        const firstUser = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
        if (firstUser) {
            db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(firstUser.id);
            console.log('👑 First user promoted to admin');
        }
    }
}

/**
 * Authentication middleware
 */
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

/**
 * Admin authentication middleware
 */
async function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId);
    
    if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
}

// ==================== AUTH API ROUTES ====================

/**
 * POST /api/register - Register new user
 */
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        
        if (!username || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Insert user and player
        const userResult = db.prepare(`
            INSERT INTO users (username, password_hash)
            VALUES (?, ?)
        `).run(username, passwordHash);
        
        const userId = userResult.lastInsertRowid;
        const startingElo = 1250;
        
        db.prepare(`
            INSERT INTO players (user_id, name, elo_rating, tier)
            VALUES (?, ?, ?, ?)
        `).run(userId, name, startingElo, getTier(startingElo));
        
        req.session.userId = userId;
        req.session.username = username;
        
        res.json({ success: true, message: 'Registration successful' });
        
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 'SQLITE_CONSTRAINT') {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});

/**
 * POST /api/login - Login user
 */
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ success: true, message: 'Login successful' });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/logout - Logout user
 */
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

/**
 * GET /api/session - Check if user is logged in
 */
app.get('/api/session', async (req, res) => {
    if (req.session.userId) {
        const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId);
        res.json({ 
            loggedIn: true, 
            userId: req.session.userId,
            username: req.session.username,
            isAdmin: user ? user.is_admin : false
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// ==================== GAME API ROUTES ====================

/**
 * GET /api/leaderboard - Get top players
 */
app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = db.prepare(`
            SELECT p.id, p.name, p.elo_rating, p.wins, p.losses, p.tier,
                   (p.wins + p.losses) as total_games
            FROM players p
            ORDER BY p.elo_rating DESC
            LIMIT 20
        `).all();
        
        // Add Champion and Dunce badges
        if (leaderboard.length > 0) {
            leaderboard[0].badge = '👑 Champion';
            if (leaderboard.length > 1) {
                leaderboard[leaderboard.length - 1].badge = '🤡 Dunce';
            }
        }
        
        res.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to load leaderboard' });
    }
});

/**
 * GET /api/profile - Get current user's profile
 */
app.get('/api/profile', requireAuth, async (req, res) => {
    try {
        const user = db.prepare('SELECT username, is_admin FROM users WHERE id = ?').get(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const player = db.prepare(`
            SELECT p.*, u.username, u.is_admin
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE u.id = ?
        `).get(req.session.userId);
        
        // If user is admin-only (no player profile), return limited data
        if (!player) {
            return res.json({
                username: user.username,
                is_admin: user.is_admin,
                isAdminOnly: true,
                message: 'Admin account - not a player'
            });
        }
        
        res.json(player);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

/**
 * GET /api/player-history/:playerId - Get player's ELO history
 */
app.get('/api/player-history/:playerId', requireAuth, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        
        const history = db.prepare(`
            SELECT eh.elo_rating, eh.recorded_at, m.id as match_id
            FROM elo_history eh
            LEFT JOIN matches m ON eh.match_id = m.id
            WHERE eh.player_id = ?
            ORDER BY eh.recorded_at ASC
        `).all(playerId);
        
        res.json(history);
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to load history' });
    }
});

/**
 * GET /api/player-matches/:playerId - Get match history for any player
 */
app.get('/api/player-matches/:playerId', requireAuth, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        
        const matches = db.prepare(`
            SELECT m.*,
                   w.name as winner_name, w.elo_rating as winner_elo,
                   l.name as loser_name, l.elo_rating as loser_elo,
                   m.timestamp
            FROM matches m
            JOIN players w ON m.winner_id = w.id
            JOIN players l ON m.loser_id = l.id
            WHERE m.winner_id = ? OR m.loser_id = ?
            ORDER BY m.timestamp DESC
            LIMIT 30
        `).all(playerId, playerId);
        
        res.json(matches);
    } catch (error) {
        console.error('Player matches error:', error);
        res.status(500).json({ error: 'Failed to load matches' });
    }
});

/**
 * GET /api/match-history - Get match history for current user or all
 */
app.get('/api/match-history', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const showAll = req.query.all === 'true';
        
        let matches;
        
        if (showAll) {
            // Get all matches
            matches = db.prepare(`
                SELECT m.*,
                       w.name as winner_name, w.elo_rating as winner_elo,
                       l.name as loser_name, l.elo_rating as loser_elo,
                       m.timestamp
                FROM matches m
                JOIN players w ON m.winner_id = w.id
                JOIN players l ON m.loser_id = l.id
                ORDER BY m.timestamp DESC
                LIMIT 50
            `).all();
        } else {
            // Get matches for current user's player
            const player = db.prepare(`
                SELECT id FROM players WHERE user_id = ?
            `).get(userId);
            
            if (!player) {
                return res.json([]);
            }
            
            matches = db.prepare(`
                SELECT m.*,
                       w.name as winner_name, w.elo_rating as winner_elo,
                       l.name as loser_name, l.elo_rating as loser_elo,
                       m.timestamp
                FROM matches m
                JOIN players w ON m.winner_id = w.id
                JOIN players l ON m.loser_id = l.id
                WHERE m.winner_id = ? OR m.loser_id = ?
                ORDER BY m.timestamp DESC
                LIMIT 30
            `).all(player.id, player.id);
        }
        
        res.json(matches);
    } catch (error) {
        console.error('Match history error:', error);
        res.status(500).json({ error: 'Failed to load match history' });
    }
});

/**
 * POST /api/report-match - Report match result
 */
app.post('/api/report-match', requireAuth, async (req, res) => {
    try {
        const { winnerId, loserId, winnerScore, loserScore } = req.body;
        
        if (!winnerId || !loserId || winnerScore == null || loserScore == null) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (winnerId === loserId) {
            return res.status(400).json({ error: 'Winner and loser cannot be the same' });
        }
        
        // Get current user's player ID
        const currentPlayer = db.prepare('SELECT id FROM players WHERE user_id = ?').get(req.session.userId);
        
        if (!currentPlayer) {
            return res.status(404).json({ error: 'Player profile not found' });
        }
        
        // Verify that the current user is one of the participants
        if (currentPlayer.id !== winnerId && currentPlayer.id !== loserId) {
            return res.status(403).json({ error: 'You can only report matches you participated in' });
        }
        
        // Get player data
        const winner = db.prepare('SELECT * FROM players WHERE id = ?').get(winnerId);
        const loser = db.prepare('SELECT * FROM players WHERE id = ?').get(loserId);
        
        if (!winner || !loser) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        // Calculate new ELO
        const { winnerNewRating, loserNewRating, ratingChange } = calculateNewRatings(
            winner.elo_rating,
            loser.elo_rating
        );
        
        // Update database
        // Update players
        db.prepare(`
            UPDATE players 
            SET elo_rating = ?, wins = wins + 1, tier = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(winnerNewRating, getTier(winnerNewRating), winnerId);
        
        db.prepare(`
            UPDATE players 
            SET elo_rating = ?, losses = losses + 1, tier = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(loserNewRating, getTier(loserNewRating), loserId);
        
        // Record match
        const matchResult = db.prepare(`
            INSERT INTO matches (winner_id, loser_id, winner_score, loser_score, elo_change)
            VALUES (?, ?, ?, ?, ?)
        `).run(winnerId, loserId, winnerScore, loserScore, ratingChange);
        
        const matchId = matchResult.lastInsertRowid;
        
        // Record ELO history for both players
        db.prepare(`
            INSERT INTO elo_history (player_id, elo_rating, match_id)
            VALUES (?, ?, ?)
        `).run(winnerId, winnerNewRating, matchId);
        
        db.prepare(`
            INSERT INTO elo_history (player_id, elo_rating, match_id)
            VALUES (?, ?, ?)
        `).run(loserId, loserNewRating, matchId);
        
        // Update pairing if it exists in current round
        db.prepare(`
            UPDATE pairings
            SET completed = 1, match_id = ?
            WHERE round_id = (SELECT id FROM rounds WHERE status = 'active' ORDER BY created_at DESC LIMIT 1)
            AND ((player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?))
        `).run(matchId, winnerId, loserId, loserId, winnerId);
        
        res.json({ 
            success: true, 
            message: 'Match recorded successfully',
            winnerNewRating,
            loserNewRating,
            ratingChange
        });
        
    } catch (error) {
        console.error('Report match error:', error);
        res.status(500).json({ error: 'Failed to report match' });
    }
});

/**
 * GET /api/pairings - Get current week's pairings
 */
app.get('/api/pairings', requireAuth, async (req, res) => {
    try {
        const currentRound = db.prepare(`
            SELECT r.*, 
                   COUNT(p.id) as total_pairings
            FROM rounds r
            LEFT JOIN pairings p ON r.id = p.round_id
            WHERE r.status = 'active'
            GROUP BY r.id
            ORDER BY r.created_at DESC
            LIMIT 1
        `).get();
        
        if (!currentRound) {
            return res.json({ pairings: [], message: 'No active round' });
        }
        
        const pairings = db.prepare(`
            SELECT p.*,
                   p1.name as player1_name, p1.elo_rating as player1_elo,
                   p2.name as player2_name, p2.elo_rating as player2_elo,
                   m.winner_id, m.loser_id, m.winner_score, m.loser_score
            FROM pairings p
            JOIN players p1 ON p.player1_id = p1.id
            JOIN players p2 ON p.player2_id = p2.id
            LEFT JOIN matches m ON p.match_id = m.id
            WHERE p.round_id = ?
            ORDER BY p1.elo_rating DESC
        `).all(currentRound.id);
        
        res.json({ round: currentRound, pairings });
    } catch (error) {
        console.error('Pairings error:', error);
        res.status(500).json({ error: 'Failed to load pairings' });
    }
});

/**
 * GET /api/player/:playerId - Get public player profile
 */
app.get('/api/player/:playerId', requireAuth, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        
        const player = db.prepare(`
            SELECT p.*, u.username
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `).get(playerId);
        
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        res.json(player);
    } catch (error) {
        console.error('Player profile error:', error);
        res.status(500).json({ error: 'Failed to load player profile' });
    }
});

/**
 * GET /api/rivals - Get rivals for current user
 */
app.get('/api/rivals', requireAuth, async (req, res) => {
    try {
        const player = db.prepare('SELECT id FROM players WHERE user_id = ?').get(req.session.userId);
        
        if (!player) {
            return res.json([]);
        }
        
        // Get opponents with match stats
        const rivals = db.prepare(`
            SELECT 
                p.id,
                p.name,
                p.elo_rating,
                p.tier,
                COUNT(*) as total_matches,
                SUM(CASE WHEN m.winner_id = ? THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN m.loser_id = ? THEN 1 ELSE 0 END) as losses,
                ABS(p.elo_rating - (SELECT elo_rating FROM players WHERE id = ?)) as elo_diff
            FROM players p
            JOIN matches m ON (m.winner_id = p.id OR m.loser_id = p.id)
            WHERE (m.winner_id = ? OR m.loser_id = ?)
                AND p.id != ?
            GROUP BY p.id
            HAVING total_matches >= 2
            ORDER BY total_matches DESC, elo_diff ASC
            LIMIT 5
        `).all(player.id, player.id, player.id, player.id, player.id, player.id);
        
        res.json(rivals);
    } catch (error) {
        console.error('Rivals error:', error);
        res.status(500).json({ error: 'Failed to load rivals' });
    }
});

/**
 * GET /api/recommended-opponents - Get recommended opponents based on similar ELO
 */
app.get('/api/recommended-opponents', requireAuth, async (req, res) => {
    try {
        const player = db.prepare('SELECT id, elo_rating FROM players WHERE user_id = ?').get(req.session.userId);
        
        if (!player) {
            return res.json([]);
        }
        
        // Find players with similar ELO (within 100 points)
        const recommended = db.prepare(`
            SELECT 
                p.id,
                p.name,
                p.elo_rating,
                p.tier,
                p.wins,
                p.losses,
                ABS(p.elo_rating - ?) as elo_diff,
                COALESCE(match_count.total, 0) as times_played
            FROM players p
            LEFT JOIN (
                SELECT 
                    CASE 
                        WHEN winner_id = ? THEN loser_id
                        WHEN loser_id = ? THEN winner_id
                    END as opponent_id,
                    COUNT(*) as total
                FROM matches
                WHERE winner_id = ? OR loser_id = ?
                GROUP BY opponent_id
            ) match_count ON p.id = match_count.opponent_id
            WHERE p.id != ?
                AND ABS(p.elo_rating - ?) <= 100
            ORDER BY elo_diff ASC, times_played ASC
            LIMIT 10
        `).all(player.elo_rating, player.id, player.id, player.id, player.id, player.id, player.elo_rating);
        
        res.json(recommended);
    } catch (error) {
        console.error('Recommended opponents error:', error);
        res.status(500).json({ error: 'Failed to load recommended opponents' });
    }
});

// ==================== CRON JOB: MATCH SCHEDULING ====================

/**
 * Generate pairings for the week
 */
async function generateWeeklyPairings() {
    console.log('🗓️  Generating match pairings...');
    
    try {
        // Check if we've exceeded league duration
        const roundCountResult = db.prepare('SELECT COUNT(*) as count FROM rounds').get();
        const roundCount = roundCountResult.count;
        const maxRounds = LEAGUE_DURATION_WEEKS * GAMES_PER_WEEK;
        
        if (roundCount >= maxRounds) {
            console.log(`🏁 League completed! ${maxRounds} rounds finished.`);
            return;
        }
        
        const players = db.prepare(`
            SELECT id, name, elo_rating, user_id
            FROM players
            ORDER BY elo_rating DESC
        `).all();
        
        if (players.length < 2) {
            console.error('Not enough players for pairings');
            return;
        }
        
        // Ensure even number of players
        let activePlayers = players;
        if (players.length % 2 !== 0) {
            activePlayers = players.slice(0, players.length - 1);
        }
        
        // Generate Swiss pairings
        const pairings = generateSwissPairings(activePlayers);
        
        // Create new round
        const roundResult = db.prepare(`
            INSERT INTO rounds (week_start, status)
            VALUES (date('now'), 'active')
        `).run();
        const roundId = roundResult.lastInsertRowid;
        
        // Save pairings
        for (const pair of pairings) {
            db.prepare(`
                INSERT INTO pairings (round_id, player1_id, player2_id)
                VALUES (?, ?, ?)
            `).run(roundId, pair.player1.id, pair.player2.id);
        }
        
        console.log(`✅ Generated ${pairings.length} pairings for round ${roundId} (Round ${roundCount + 1}/${maxRounds})`);
        
    } catch (error) {
        console.error('Error generating pairings:', error);
    }
}

// Schedule cron jobs: Wednesday and Friday at 9 AM
cron.schedule('0 9 * * 3', generateWeeklyPairings, {
    timezone: process.env.TZ || 'Australia/Brisbane'
});

cron.schedule('0 9 * * 5', generateWeeklyPairings, {
    timezone: process.env.TZ || 'Australia/Brisbane'
});

console.log('⏰ Cron jobs scheduled: Wednesday & Friday at 9 AM');

// ==================== ADMIN/TESTING ENDPOINTS ====================

/**
 * GET /api/admin/users - Get all users (admin only)
 */
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.id, u.username, u.is_admin, u.created_at,
                   p.id as player_id, p.name, p.elo_rating, p.wins, p.losses
            FROM users u
            LEFT JOIN players p ON u.id = p.user_id
            ORDER BY u.created_at DESC
        `).all();
        
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

/**
 * POST /api/admin/toggle-admin - Toggle admin status (admin only)
 */
app.post('/api/admin/toggle-admin', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (userId === req.session.userId) {
            return res.status(400).json({ error: 'Cannot modify your own admin status' });
        }
        
        const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const newStatus = user.is_admin ? 0 : 1;
        db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(newStatus, userId);
        
        res.json({ 
            success: true, 
            message: newStatus ? 'User promoted to admin' : 'User demoted from admin',
            is_admin: newStatus
        });
    } catch (error) {
        console.error('Toggle admin error:', error);
        res.status(500).json({ error: 'Failed to toggle admin status' });
    }
});

/**
 * GET /api/admin/matches - Get all matches with pagination (admin only)
 */
app.get('/api/admin/matches', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;
        
        const matches = db.prepare(`
            SELECT m.*,
                   w.name as winner_name, w.elo_rating as winner_elo,
                   l.name as loser_name, l.elo_rating as loser_elo,
                   m.timestamp
            FROM matches m
            JOIN players w ON m.winner_id = w.id
            JOIN players l ON m.loser_id = l.id
            ORDER BY m.timestamp DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset);
        
        const totalResult = db.prepare('SELECT COUNT(*) as count FROM matches').get();
        const total = totalResult.count;
        
        res.json({ matches, total, page, limit });
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ error: 'Failed to get matches' });
    }
});

/**
 * DELETE /api/admin/match/:matchId - Delete a match and recalculate ELO (admin only)
 */
app.delete('/api/admin/match/:matchId', requireAdmin, async (req, res) => {
    try {
        const matchId = parseInt(req.params.matchId);
        
        const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
        
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        // Get subsequent matches for both players to recalculate
        const subsequentMatches = db.prepare(`
            SELECT * FROM matches 
            WHERE (winner_id = ? OR loser_id = ? OR winner_id = ? OR loser_id = ?)
            AND timestamp >= ?
            ORDER BY timestamp ASC
        `).all(match.winner_id, match.winner_id, match.loser_id, match.loser_id, match.timestamp);
        
        // Delete ELO history entries
        db.prepare('DELETE FROM elo_history WHERE match_id = ?').run(matchId);
        
        // Delete match
        db.prepare('DELETE FROM matches WHERE id = ?').run(matchId);
        
        // Reverse the ELO changes
        const winner = db.prepare('SELECT * FROM players WHERE id = ?').get(match.winner_id);
        const loser = db.prepare('SELECT * FROM players WHERE id = ?').get(match.loser_id);
        
        db.prepare(`
            UPDATE players 
            SET elo_rating = elo_rating - ?, wins = wins - 1, tier = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(match.elo_change, getTier(winner.elo_rating - match.elo_change), match.winner_id);
        
        db.prepare(`
            UPDATE players 
            SET elo_rating = elo_rating + ?, losses = losses - 1, tier = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(match.elo_change, getTier(loser.elo_rating + match.elo_change), match.loser_id);
        
        // Update pairing if linked
        db.prepare('UPDATE pairings SET completed = 0, match_id = NULL WHERE match_id = ?').run(matchId);
        
        res.json({ 
            success: true, 
            message: 'Match deleted and ELO recalculated' 
        });
    } catch (error) {
        console.error('Delete match error:', error);
        res.status(500).json({ error: 'Failed to delete match' });
    }
});

/**
 * GET /api/admin/stats - Get system statistics (admin only)
 */
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const totalUsersResult = db.prepare('SELECT COUNT(*) as count FROM users').get();
        const totalUsers = totalUsersResult.count;
        
        const totalPlayersResult = db.prepare('SELECT COUNT(*) as count FROM players').get();
        const totalPlayers = totalPlayersResult.count;
        
        const totalMatchesResult = db.prepare('SELECT COUNT(*) as count FROM matches').get();
        const totalMatches = totalMatchesResult.count;
        
        const totalRoundsResult = db.prepare('SELECT COUNT(*) as count FROM rounds').get();
        const totalRounds = totalRoundsResult.count;
        
        const activeSeason = db.prepare("SELECT * FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1").get();
        
        const completedPairingsResult = db.prepare('SELECT COUNT(*) as count FROM pairings WHERE completed = 1').get();
        const completedPairings = completedPairingsResult.count;
        
        const pendingPairingsResult = db.prepare('SELECT COUNT(*) as count FROM pairings WHERE completed = 0').get();
        const pendingPairings = pendingPairingsResult.count;
        
        res.json({
            totalUsers,
            totalPlayers,
            totalMatches,
            totalRounds,
            completedPairings,
            pendingPairings,
            activeSeason
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * GET /api/admin/seasons - Get all seasons (admin only)
 */
app.get('/api/admin/seasons', requireAdmin, async (req, res) => {
    try {
        const seasons = db.prepare(`
            SELECT s.*, p.name as winner_name, p.elo_rating as winner_elo
            FROM seasons s
            LEFT JOIN players p ON s.winner_id = p.id
            ORDER BY s.created_at DESC
        `).all();
        
        res.json(seasons);
    } catch (error) {
        console.error('Get seasons error:', error);
        res.status(500).json({ error: 'Failed to get seasons' });
    }
});

/**
 * POST /api/admin/season/start - Start a new season (admin only)
 */
app.post('/api/admin/season/start', requireAdmin, async (req, res) => {
    try {
        const { name, resetElo } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Season name is required' });
        }
        
        // Close any active seasons
        db.prepare("UPDATE seasons SET status = 'completed', end_date = date('now') WHERE status = 'active'").run();
        
        // Close active rounds
        db.prepare("UPDATE rounds SET status = 'completed' WHERE status = 'active'").run();
        
        // Create new season
        const result = db.prepare(`
            INSERT INTO seasons (name, start_date, status)
            VALUES (?, date('now'), 'active')
        `).run(name);
        
        const seasonId = result.lastInsertRowid;
        
        // Optionally reset ELO ratings
        if (resetElo) {
            db.prepare(`
                UPDATE players 
                SET elo_rating = 1250, 
                    wins = 0, 
                    losses = 0, 
                    tier = ?,
                    updated_at = CURRENT_TIMESTAMP
            `).run(getTier(1250));
            
            // Record ELO reset in history
            const players = db.prepare('SELECT id FROM players').all();
            
            for (const player of players) {
                db.prepare(`
                    INSERT INTO elo_history (player_id, elo_rating)
                    VALUES (?, 1250)
                `).run(player.id);
            }
        }
        
        res.json({ 
            success: true, 
            message: 'New season started',
            seasonId,
            eloReset: resetElo
        });
    } catch (error) {
        console.error('Start season error:', error);
        res.status(500).json({ error: 'Failed to start season' });
    }
});

/**
 * POST /api/admin/season/end - End current season (admin only)
 */
app.post('/api/admin/season/end', requireAdmin, async (req, res) => {
    try {
        const activeSeason = db.prepare("SELECT * FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1").get();
        
        if (!activeSeason) {
            return res.status(400).json({ error: 'No active season to end' });
        }
        
        // Get current champion
        const champion = db.prepare(`
            SELECT id FROM players 
            ORDER BY elo_rating DESC 
            LIMIT 1
        `).get();
        
        // Get total matches and rounds
        const matchCountResult = db.prepare(`
            SELECT COUNT(*) as count FROM matches 
            WHERE timestamp >= ?
        `).get(activeSeason.start_date);
        const matchCount = matchCountResult.count;
        
        const roundCountResult = db.prepare(`
            SELECT COUNT(*) as count FROM rounds 
            WHERE week_start >= ?
        `).get(activeSeason.start_date);
        const roundCount = roundCountResult.count;
        
        // End season
        db.prepare(`
            UPDATE seasons 
            SET status = 'completed', 
                end_date = date('now'),
                winner_id = ?,
                total_matches = ?,
                total_rounds = ?
            WHERE id = ?
        `).run(champion ? champion.id : null, matchCount, roundCount, activeSeason.id);
        
        // Close active rounds
        db.prepare("UPDATE rounds SET status = 'completed' WHERE status = 'active'").run();
        
        res.json({ 
            success: true, 
            message: 'Season ended',
            championId: champion ? champion.id : null,
            totalMatches: matchCount,
            totalRounds: roundCount
        });
    } catch (error) {
        console.error('End season error:', error);
        res.status(500).json({ error: 'Failed to end season' });
    }
});

/**
 * POST /api/force-pairings - Manually trigger pairing generation (for testing)
 */
app.post('/api/force-pairings', requireAuth, async (req, res) => {
    try {
        await generateWeeklyPairings();
        res.json({ 
            success: true, 
            message: 'Pairings generated successfully! Check /pairings to see them.' 
        });
    } catch (error) {
        console.error('Force pairings error:', error);
        res.status(500).json({ error: 'Failed to generate pairings' });
    }
});

// ==================== WEB PAGE ROUTES ====================

app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/feed');
    } else {
        res.redirect('/login');
    }
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/feed', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'feed.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/leaderboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

app.get('/pairings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pairings.html'));
});

app.get('/player/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// ==================== START SERVER ====================

(async () => {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log('🏓 The Swyftx Slam Web App is running!');
        console.log(`🌐 Server: http://localhost:${PORT}`);
        console.log(`📅 League: ${LEAGUE_DURATION_WEEKS} weeks, ${GAMES_PER_WEEK} games/week`);
    });
})();

module.exports = { app, db };
