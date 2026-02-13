/**
 * Theme Toggle Functionality
 * Manages light/dark mode switching with localStorage persistence
 */

// Initialize theme immediately (before DOM loads)
(function initTheme() {
    const savedTheme = localStorage.getItem('swyftx-slam-theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        if (document.body) {
            document.body.classList.add('light-mode');
        }
    }
})();

// Ensure theme is applied when body loads
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('swyftx-slam-theme');
    if (savedTheme === 'light' && !document.body.classList.contains('light-mode')) {
        document.body.classList.add('light-mode');
    }
    updateThemeIcon();
});

// Toggle theme function
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('swyftx-slam-theme', isLight ? 'light' : 'dark');
    
    // Update toggle button icon
    updateThemeIcon();
}

// Update theme icon based on current theme
function updateThemeIcon() {
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        const isLight = document.body.classList.contains('light-mode');
        themeBtn.textContent = isLight ? '🌙' : '☀️';
        themeBtn.title = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    }
}

/**
 * Easter Egg Functionality
 * Fun surprises when clicking the ping pong paddle
 */

let clickCount = 0;
let clickTimeout = null;

const easterEggMessages = [
    "🏓 Pong! 🏓",
    "🎯 Ace serve!",
    "🔥 Spin master!",
    "⚡ Lightning reflexes!",
    "💪 Pro player detected!",
    "🎪 Trick shot!",
    "🌟 Table tennis legend!",
    "🚀 Smash attack!",
    "🎨 The paddle of destiny!",
    "🏆 Championship material!",
    "🎭 You've discovered the secret paddle!",
    "🌈 Paddle power activated!",
    "💎 Diamond tier paddle!",
    "🎸 Rock & Roll ping pong!",
    "🧙 The magical paddle of Swyftx!",
    "🦄 Unicorn paddle mode!",
    "🌮 Even the paddle needs tacos!",
    "🎪 Welcome to the paddle circus!",
    "🔮 The paddle sees all...",
    "🎉 PARTY PADDLE!"
];

function triggerEasterEgg() {
    clickCount++;
    
    // Clear existing timeout
    if (clickTimeout) {
        clearTimeout(clickTimeout);
    }
    
    // Reset counter after 2 seconds of no clicks
    clickTimeout = setTimeout(() => {
        clickCount = 0;
    }, 2000);
    
    // Different effects based on click count
    if (clickCount === 3) {
        showPaddleMessage();
        shakeScreen();
    } else if (clickCount === 5) {
        showPaddleMessage();
        createConfetti();
    } else if (clickCount === 7) {
        showPaddleMessage();
        rainbowMode();
    } else if (clickCount === 10) {
        showPaddleMessage();
        ultimateEasterEgg();
        clickCount = 0; // Reset
    } else if (clickCount % 2 === 0) {
        bouncePaddle();
    }
}

function showPaddleMessage() {
    const message = easterEggMessages[Math.floor(Math.random() * easterEggMessages.length)];
    
    // Create floating message
    const msgDiv = document.createElement('div');
    msgDiv.textContent = message;
    msgDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 3em;
        font-weight: bold;
        color: var(--accent-primary);
        z-index: 10000;
        animation: fadeOutUp 2s ease-out forwards;
        text-shadow: 0 0 20px rgba(14, 203, 202, 0.5);
        pointer-events: none;
    `;
    
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
        msgDiv.remove();
    }, 2000);
}

function shakeScreen() {
    document.body.style.animation = 'shake 0.5s';
    setTimeout(() => {
        document.body.style.animation = '';
    }, 500);
}

function bouncePaddle() {
    const paddles = document.querySelectorAll('.nav-brand');
    paddles.forEach(paddle => {
        paddle.style.animation = 'bounce 0.5s';
        setTimeout(() => {
            paddle.style.animation = '';
        }, 500);
    });
}

function createConfetti() {
    const emojis = ['🏓', '🎉', '⭐', '🌟', '💫', '✨', '🎊', '🎈'];
    
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
            confetti.textContent = emoji;
            confetti.style.cssText = `
                position: fixed;
                left: ${Math.random() * 100}vw;
                top: -50px;
                font-size: 2em;
                z-index: 10000;
                pointer-events: none;
                animation: fall ${2 + Math.random() * 2}s linear forwards;
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 4000);
        }, i * 50);
    }
}

function rainbowMode() {
    const cards = document.querySelectorAll('.card, .nav');
    cards.forEach(card => {
        card.style.animation = 'rainbow 3s linear';
        setTimeout(() => {
            card.style.animation = '';
        }, 3000);
    });
}

function ultimateEasterEgg() {
    showPaddleMessage();
    createConfetti();
    shakeScreen();
    
    // Flash the background
    const originalBg = document.body.style.background;
    let flashes = 0;
    const flashInterval = setInterval(() => {
        flashes++;
        document.body.style.opacity = flashes % 2 === 0 ? '1' : '0.8';
        
        if (flashes >= 6) {
            clearInterval(flashInterval);
            document.body.style.opacity = '1';
        }
    }, 100);
    
    // Play sequence of messages
    setTimeout(() => {
        alert('🎉 ULTIMATE PADDLE MASTER! 🎉\n\nYou\'ve discovered the secret of the Swyftx Slam!\n\nLegend says the paddle holds the power of a thousand table tennis champions! 🏓');
    }, 1500);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOutUp {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.5);
        }
        50% {
            opacity: 1;
            transform: translate(-50%, -60%) scale(1.2);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -100%) scale(1);
        }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        25% { transform: translateY(-15px) rotate(-10deg); }
        50% { transform: translateY(0) rotate(0deg); }
        75% { transform: translateY(-10px) rotate(10deg); }
    }
    
    @keyframes fall {
        0% {
            top: -50px;
            transform: rotate(0deg);
        }
        100% {
            top: 100vh;
            transform: rotate(720deg);
        }
    }
    
    @keyframes rainbow {
        0% { border-color: var(--card-border); }
        14% { border-color: #ff0000; }
        28% { border-color: #ff7f00; }
        42% { border-color: #ffff00; }
        56% { border-color: #00ff00; }
        70% { border-color: #0000ff; }
        84% { border-color: #4b0082; }
        100% { border-color: var(--card-border); }
    }
    
    .nav-brand {
        cursor: pointer;
        transition: transform 0.2s;
    }
    
    .nav-brand:hover {
        transform: scale(1.05);
    }
    
    .nav-brand:active {
        transform: scale(0.95);
    }
`;
document.head.appendChild(style);

