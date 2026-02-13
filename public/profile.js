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
        
        // Check if admin and add link
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (sessionData.isAdmin) {
            document.getElementById('adminLink').innerHTML = '<a href="/admin">Admin</a>';
        }
        
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('profileContent').classList.remove('hidden');
        
        // Update avatar and header
        const avatarUrl = currentPlayer.avatar_url || `https://www.gravatar.com/avatar/?d=mp&s=200`;
        document.getElementById('profileAvatar').src = avatarUrl;
        document.getElementById('profileName').textContent = currentPlayer.name;
        document.getElementById('profileTier').textContent = currentPlayer.tier;
        
        document.getElementById('eloValue').textContent = currentPlayer.elo_rating;
        document.getElementById('tierValue').textContent = currentPlayer.tier;
        document.getElementById('winsValue').textContent = currentPlayer.wins;
        document.getElementById('lossesValue').textContent = currentPlayer.losses;
        
        document.getElementById('playerName').textContent = currentPlayer.name;
        document.getElementById('playerUsername').textContent = currentPlayer.username;
        document.getElementById('memberSince').textContent = new Date(currentPlayer.created_at).toLocaleDateString();
        
        // Set email input if available
        if (currentPlayer.email) {
            document.getElementById('emailInput').value = currentPlayer.email;
        }
        
        const totalGames = currentPlayer.wins + currentPlayer.losses;
        const winRate = totalGames > 0 ? ((currentPlayer.wins / totalGames) * 100).toFixed(1) + '%' : 'N/A';
        document.getElementById('winRate').textContent = winRate;
        
        loadEloHistory();
        loadMatchHistory();
        loadRivals();
        
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

async function loadRivals() {
    try {
        const response = await fetch('/api/rivals');
        const rivals = await response.json();
        
        if (rivals.length === 0) {
            document.getElementById('rivalsList').classList.add('hidden');
            document.getElementById('noRivals').classList.remove('hidden');
            return;
        }
        
        const container = document.getElementById('rivalsList');
        let html = '';
        
        rivals.forEach((rival, index) => {
            const winRate = ((rival.wins / rival.total_matches) * 100).toFixed(0);
            const isAhead = rival.wins > rival.losses;
            const recordColor = isAhead ? '#10b981' : rival.wins === rival.losses ? '#667eea' : '#ef4444';
            
            html += `
                <div class="rival-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div>
                            <div style="font-size: 1.3em; font-weight: bold; color: var(--text-heading); margin-bottom: 5px;">
                                ${index === 0 ? '👊 ' : ''}${rival.name}
                            </div>
                            <div style="color: var(--text-secondary); font-size: 0.9em;">
                                <span class="tier-badge">${rival.tier}</span>
                                <span style="margin-left: 10px; font-weight: 600; color: var(--accent-primary);">${rival.elo_rating} ELO</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 2em; font-weight: bold; color: ${recordColor};">
                                ${rival.wins}-${rival.losses}
                            </div>
                            <div style="font-size: 0.85em; color: var(--text-secondary);">
                                Your Record
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: var(--match-item-bg); border-radius: 8px; padding: 15px; margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: var(--text-secondary);">Total Matches</span>
                            <span style="font-weight: 600; color: var(--text-primary);">${rival.total_matches}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: var(--text-secondary);">Your Win Rate</span>
                            <span style="font-weight: 600; color: ${recordColor};">${winRate}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-secondary);">ELO Difference</span>
                            <span style="font-weight: 600; color: var(--text-primary);">${rival.elo_diff} points</span>
                        </div>
                        
                        ${isAhead 
                            ? `<div style="margin-top: 15px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 4px; color: #10b981; font-weight: 600;">
                                💪 You're dominating this rivalry!
                               </div>`
                            : rival.wins === rival.losses
                            ? `<div style="margin-top: 15px; padding: 10px; background: var(--hover-bg); border-left: 3px solid var(--accent-primary); border-radius: 4px; color: var(--accent-primary); font-weight: 600;">
                                ⚖️ Perfectly balanced rivalry!
                               </div>`
                            : `<div style="margin-top: 15px; padding: 10px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px; color: #ef4444; font-weight: 600;">
                                🔥 Time to turn the tables!
                               </div>`
                        }
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading rivals:', error);
    }
}

function switchTab(tabName, event) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

async function updateEmail() {
    const email = document.getElementById('emailInput').value.trim();
    
    if (!email) {
        alert('Please enter an email address');
        return;
    }
    
    try {
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Profile updated! Your avatar will be updated based on your Gravatar.');
            // Update avatar immediately
            document.getElementById('profileAvatar').src = data.avatar_url;
            currentPlayer.avatar_url = data.avatar_url;
        } else {
            alert(data.error || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile');
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
}

loadProfile();
