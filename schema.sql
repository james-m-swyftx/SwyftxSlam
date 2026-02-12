-- The Swyftx Slam Database Schema

-- Players table: stores player information and ELO ratings
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slack_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    elo_rating INTEGER DEFAULT 1200,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'Bronze',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Matches table: records all completed matches
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    winner_id INTEGER NOT NULL,
    loser_id INTEGER NOT NULL,
    winner_score INTEGER NOT NULL,
    loser_score INTEGER NOT NULL,
    elo_change INTEGER NOT NULL,
    round_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (winner_id) REFERENCES players(id),
    FOREIGN KEY (loser_id) REFERENCES players(id)
);

-- Rounds table: stores weekly pairing rounds
CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start DATE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pairings table: stores the weekly matchmaking
CREATE TABLE IF NOT EXISTS pairings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    completed BOOLEAN DEFAULT 0,
    match_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES rounds(id),
    FOREIGN KEY (player1_id) REFERENCES players(id),
    FOREIGN KEY (player2_id) REFERENCES players(id),
    FOREIGN KEY (match_id) REFERENCES matches(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_elo ON players(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_players_slack_id ON players(slack_id);
CREATE INDEX IF NOT EXISTS idx_matches_timestamp ON matches(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pairings_round ON pairings(round_id);
