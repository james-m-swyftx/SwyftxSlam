let eloChart = null;
let currentPlayer = null;

async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        
        if (!response.ok) {
            window.location.href = '/login';
            return;
        }
        
        currentPlayer = await response.json();
        
        document.getElementById('username').textContent = currentPlayer.username;
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('profileContent').classList.remove('hidden');
        
        document.getElementById('eloValue').textContent = currentPlayer.elo_rating;
        document.getElementById('tierValue').textContent = currentPlayer.tier;
        document.getElementById('winsValue').textContent = currentPlayer.wins;
        document.getElementById('lossesValue').textContent = currentPlayer.losses;
        
        document.getElementById('playerName').textContent = currentPlayer.name;
        document.getElementById('playerUsername').textContent = currentPlayer.username;
        document.getElementById('memberSince').textContent = new Date(currentPlayer.created_at).toLocaleDateString();
        
        const totalGames = currentPlayer.wins + currentPlayer.losses;
        const winRate = totalGames > 0 ? ((currentPlayer.wins / totalGames) * 100).toFixed(1) + '%' : 'N/A';
        document.getElementById('winRate').textContent = winRate;
        
        loadEloHistory();
        loadMatchHistory();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('loading').textContent = 'Error loading profile';
    }
}

async function loadEloHistory() {
    try {
        const response = await fetch(`/api/player-history/${currentPlayer.id}`);
        const history = await response.json();
        
        document.getElementById('graphElo').textContent = currentPlayer.elo_rating;
        
        if (history.length === 0) {
            document.getElementById('chartContainer').classList.add('hidden');
            document.getElementById('noGraphData').classList.remove('hidden');
            document.getElementById('eloChange').textContent = '0';
            document.getElementById('peakElo').textContent = currentPlayer.elo_rating;
            return;
        }
        
        const firstElo = history[0].elo_rating;
        const currentElo = history[history.length - 1].elo_rating;
        const change = currentElo - firstElo;
        const changeText = change >= 0 ? `+${change}` : `${change}`;
        document.getElementById('eloChange').textContent = changeText;
        document.getElementById('eloChange').style.color = change >= 0 ? '#4ade80' : '#ff6b6b';
        
        const peakElo = Math.max(...history.map(h => h.elo_rating));
        document.getElementById('peakElo').textContent = peakElo;
        
        const labels = history.map((h, index) => {
            if (index === 0) return 'Start';
            return `Match ${index}`;
        });
        
        const data = history.map(h => h.elo_rating);
        
        const ctx = document.getElementById('eloChart').getContext('2d');
        eloChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ELO Rating',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `ELO: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: '#a0a0a0'
                        },
                        grid: {
                            color: 'rgba(102, 126, 234, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#a0a0a0'
                        },
                        grid: {
                            color: 'rgba(102, 126, 234, 0.1)'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading ELO history:', error);
    }
}

async function loadMatchHistory() {
    try {
        const response = await fetch('/api/match-history');
        const matches = await response.json();
        
        if (matches.length === 0) {
            document.getElementById('matchHistory').classList.add('hidden');
            document.getElementById('noMatches').classList.remove('hidden');
            return;
        }
        
        const container = document.getElementById('matchHistory');
        let html = '';
        
        matches.forEach(match => {
            const date = new Date(match.timestamp);
            const isWinner = match.winner_id === currentPlayer.id;
            
            html += `
                <div class="match-item">
                    <div class="match-header">
                        <span>${date.toLocaleDateString()}</span>
                        <span>${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div class="match-players">
                        <div class="match-player">
                            <div class="player-icon">${isWinner ? '🏆' : '💔'}</div>
                            <div class="player-info">
                                <div class="player-name">${match.winner_name}</div>
                                <div class="player-score">${match.winner_score}</div>
                            </div>
                        </div>
                        <div class="vs">VS</div>
                        <div class="match-player">
                            <div class="player-icon">${!isWinner ? '🏆' : '💔'}</div>
                            <div class="player-info">
                                <div class="player-name">${match.loser_name}</div>
                                <div class="player-score">${match.loser_score}</div>
                            </div>
                        </div>
                        <div class="elo-change ${isWinner ? 'positive' : 'negative'}">
                            ${isWinner ? '+' : '-'}${match.elo_change}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading match history:', error);
    }
}

function switchTab(tabName, event) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
}

loadProfile();
