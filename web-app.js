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

// Database setup
const dbPath = fs.existsSync('/data') ? '/data/swyftx-slam.db' : 'swyftx-slam.db';
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
function initDatabase() {
    console.log('📊 Initializing database...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
    console.log('✅ Database initialized!');
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
        
        // Insert user and player in transaction
        const registerTransaction = db.transaction(() => {
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
            
            return userId;
        });
        
        const userId = registerTransaction();
        
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
app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            loggedIn: true, 
            userId: req.session.userId,
            username: req.session.username 
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// ==================== GAME API ROUTES ====================

/**
 * GET /api/leaderboard - Get top players
 */
app.get('/api/leaderboard', (req, res) => {
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
app.get('/api/profile', requireAuth, (req, res) => {
    try {
        const player = db.prepare(`
            SELECT p.*, u.username
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE u.id = ?
        `).get(req.session.userId);
        
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
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
app.get('/api/player-history/:playerId', requireAuth, (req, res) => {
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
 * GET /api/match-history - Get match history for current user or all
 */
app.get('/api/match-history', requireAuth, (req, res) => {
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
        
        // Update database in transaction
        const updateTransaction = db.transaction(() => {
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
            
            return matchId;
        });
        
        updateTransaction();
        
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
app.get('/api/pairings', requireAuth, (req, res) => {
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

// ==================== CRON JOB: MATCH SCHEDULING ====================

/**
 * Generate pairings for the week
 */
function generateWeeklyPairings() {
    console.log('🗓️  Generating match pairings...');
    
    try {
        // Check if we've exceeded league duration
        const roundCount = db.prepare('SELECT COUNT(*) as count FROM rounds').get().count;
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
        const insertPairing = db.prepare(`
            INSERT INTO pairings (round_id, player1_id, player2_id)
            VALUES (?, ?, ?)
        `);
        
        const savePairings = db.transaction(() => {
            for (const pair of pairings) {
                insertPairing.run(roundId, pair.player1.id, pair.player2.id);
            }
        });
        
        savePairings();
        
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
 * POST /api/force-pairings - Manually trigger pairing generation (for testing)
 */
app.post('/api/force-pairings', requireAuth, (req, res) => {
    try {
        generateWeeklyPairings();
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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// ==================== START SERVER ====================

(async () => {
    initDatabase();
    
    app.listen(PORT, () => {
        console.log('🏓 The Swyftx Slam Web App is running!');
        console.log(`🌐 Server: http://localhost:${PORT}`);
        console.log(`📅 League: ${LEAGUE_DURATION_WEEKS} weeks, ${GAMES_PER_WEEK} games/week`);
    });
})();

module.exports = { app, db };
