// script.js - Production version
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const countdownEl = document.querySelector('.countdown');
const millisecondsEl = document.querySelector('.milliseconds');
const totalTimeEl = document.querySelector('.total-time');
const roundsEl = document.querySelector('.rounds');
const currentPhaseEl = document.querySelector('.current-phase');
const timerDisplay = document.querySelector('.timer-display');
const progressBar = document.querySelector('.progress');
const celebrationContainer = document.querySelector('.celebration-container');
const confettiContainer = document.querySelector('.confetti-container');

let countdown = 4 * 60; // 4 minutes in seconds
let milliseconds = 0;
let totalTime = 0;
let totalMilliseconds = 0;
let isRunning = false;
let isWorkPhase = true;
let isPaused = false;
let interval;
let totalInterval;
let msInterval;
let currentRound = 0;
const totalRounds = 4;
const workDuration = 4 * 60; // 4 minutes in seconds
const restDuration = 3 * 60; // 4 minutes in seconds


// Add these variables at the top of your script.js file
let wakeLock = null;

// Function to request and acquire wake lock
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock activated');
            
            // Add event listener to reacquire wake lock if it's released
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
                // Try to reacquire the wake lock if we're still running
                if (isRunning) {
                    requestWakeLock();
                }
            });
        }
    } catch (err) {
        console.error(`Wake Lock error: ${err.name}, ${err.message}`);
    }
}

// Function to release wake lock
async function releaseWakeLock() {
    if (wakeLock !== null) {
        try {
            await wakeLock.release();
            wakeLock = null;
            console.log('Wake Lock released');
        } catch (err) {
            console.error(`Wake Lock release error: ${err.name}, ${err.message}`);
        }
    }
}

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

// Format total time as HH:MM:SS
function formatTotalTime(seconds) {
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
}

// Update progress bar based on current countdown
function updateProgressBar() {
    let maxDuration = isWorkPhase ? workDuration : restDuration;
    let currentTime = maxDuration - countdown;
    let percentage = (currentTime / maxDuration) * 100;
    progressBar.style.width = `${percentage}%`;
}

// Update all display elements
function updateDisplay() {
    countdownEl.textContent = formatTime(countdown);
    millisecondsEl.textContent = milliseconds.toString().padStart(2, '0');
    totalTimeEl.textContent = `Total: ${formatTotalTime(totalTime)}`;
    roundsEl.textContent = `Round: ${currentRound}/${totalRounds}`;
    updateProgressBar();
    
    timerDisplay.classList.remove('work', 'rest', 'paused');
    startBtn.classList.remove('paused');
    
    if (isPaused) {
        currentPhaseEl.textContent = "PAUSED";
        timerDisplay.classList.add('paused');
        startBtn.classList.add('paused');
        startBtn.textContent = 'RESUME';
    } else if (isRunning) {
        if (isWorkPhase) {
            currentPhaseEl.textContent = "WORK";
            timerDisplay.classList.add('work');
            startBtn.textContent = 'PAUSE';
        } else {
            currentPhaseEl.textContent = "REST";
            timerDisplay.classList.add('rest');
            startBtn.textContent = 'PAUSE';
        }
    } else {
        currentPhaseEl.textContent = "READY";
        startBtn.textContent = 'START';
    }
}

// Enhanced vibration function
function vibrate(pattern) {
    if ('vibrate' in navigator) {
        try {
            // Apply pattern based on context
            if (pattern.length === 3) {
                // GO pattern - starting work
                navigator.vibrate([100, 50, 800, 50, 800]);
            } else if (pattern.length === 5) {
                // STOP pattern - work ending, rest starting
                navigator.vibrate([300, 100, 300, 100, 600, 100, 300]);
            } else {
                // COMPLETION pattern
                navigator.vibrate([400, 100, 400, 100, 400, 100, 1000, 200, 400, 100, 1000]);
            }
            
            // Repeat key vibrations after delay for better noticeability
            setTimeout(() => {
                if (pattern.length > 4) { // Only repeat important patterns
                    navigator.vibrate(pattern);
                }
            }, 500);
        } catch (e) {
            // Silently fail in production
        }
    }
}

// Button feedback vibration
function buttonFeedback() {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(50);
        } catch (e) {
            // Silently fail in production
        }
    }
}

// Generate audio feedback
function playSound(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'complete':
                // Celebratory sound
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.2);
                oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.4);
                oscillator.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.6);
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
                
                oscillator.start();
                setTimeout(() => oscillator.stop(), 800);
                break;
                
            case 'stop':
                // Work ended sound
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(180, audioContext.currentTime + 0.2);
                oscillator.frequency.setValueAtTime(220, audioContext.currentTime + 0.4);
                
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
                
                oscillator.start();
                setTimeout(() => oscillator.stop(), 600);
                break;
                
            case 'go':
                // Rest ended sound
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.4);
                
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start();
                setTimeout(() => oscillator.stop(), 500);
                break;
                
            case 'button':
                // Simple click feedback
                oscillator.type = 'sine';
                oscillator.frequency.value = 660;
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.start();
                setTimeout(() => oscillator.stop(), 100);
                break;
        }
    } catch (e) {
        // Silently fail in production
    }
}

// Create confetti animation elements
function createConfetti() {
    confettiContainer.innerHTML = '';
    const colors = ['#06d6a0', '#ffd166', '#ef476f', '#118ab2', '#ffffff'];
    
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = `${Math.random() * 10 + 5}px`;
        confetti.style.height = `${Math.random() * 10 + 5}px`;
        confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        
        // Different shapes for confetti
        const shape = Math.floor(Math.random() * 3);
        if (shape === 0) {
            // Circle
            confetti.style.borderRadius = '50%';
        } else if (shape === 1) {
            // Rectangle
            confetti.style.borderRadius = '0';
        } else {
            // Triangle
            confetti.style.width = '0';
            confetti.style.height = '0';
            confetti.style.backgroundColor = 'transparent';
            confetti.style.borderLeft = `${Math.random() * 10 + 5}px solid transparent`;
            confetti.style.borderRight = `${Math.random() * 10 + 5}px solid transparent`;
            confetti.style.borderBottom = `${Math.random() * 10 + 5}px solid ${colors[Math.floor(Math.random() * colors.length)]}`;
        }
        
        confettiContainer.appendChild(confetti);
    }
    
    // Add starburst animations
    for (let i = 0; i < 15; i++) {
        const starburst = document.createElement('div');
        starburst.className = 'starburst-celebration';
        starburst.style.left = `${Math.random() * 100}%`;
        starburst.style.top = `${Math.random() * 100}%`;
        starburst.style.animationDelay = `${Math.random() * 3}s`;
        starburst.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confettiContainer.appendChild(starburst);
    }
}

// Display completion celebration
function showCompletionCelebration() {
    createConfetti();
    celebrationContainer.classList.add('active');
    
    // Reset round counter immediately to prevent 5/4 display
    currentRound = 4; // Keep it at 4 until full reset
    updateDisplay();
    
    // Enhanced celebration vibration pattern for completeness
    vibrate([400, 100, 400, 100, 400, 100, 800]);
    playSound('complete');
    
    // Close celebration after 7 seconds and fully reset
    setTimeout(() => {
        celebrationContainer.classList.remove('active');
        resetTimer(); // Full reset after celebration ends
    }, 7000);
}

// Start the timer
function startTimer() {
    if (isRunning) return;
    
    buttonFeedback();
    isRunning = true;
    isPaused = false;
    
    // Request wake lock to prevent screen from dimming
    requestWakeLock();
    
    if (currentRound === 0) {
        currentRound = 1;
        isWorkPhase = true;
        countdown = workDuration;
    }
    
    // Update display immediately
    updateDisplay();
    
    // Start the milliseconds timer
    msInterval = setInterval(() => {
        milliseconds = (milliseconds + 1) % 100;
        millisecondsEl.textContent = milliseconds.toString().padStart(2, '0');
        totalMilliseconds = (totalMilliseconds + 1) % 100;
    }, 10);
    
    // Start the seconds timer
    interval = setInterval(() => {
        countdown--;
        
        if (countdown <= 0) {
            // Phase completed
            if (isWorkPhase) {
                // Work phase completed, start rest phase
                vibrate([200, 100, 200, 100, 400]); // Stop pattern
                playSound('stop');
                isWorkPhase = false;
                countdown = restDuration;
            } else {
                // Rest phase completed, start next round or end
                currentRound++;
                
                if (currentRound > totalRounds) {
                    // All rounds completed
                    vibrate([400, 100, 400, 100, 400, 100, 800]); // End pattern
                    pauseTimer();
                    showCompletionCelebration();
                    return;
                }
                
                // Start next work phase
                vibrate([400, 100, 800]); // Go pattern
                playSound('go');
                isWorkPhase = true;
                countdown = workDuration;
            }
        }
        
        updateDisplay();
    }, 1000);
    
    // Start the total time timer
    totalInterval = setInterval(() => {
        totalTime++;
        totalTimeEl.textContent = `Total: ${formatTotalTime(totalTime)}`;
    }, 1000);
}

// Pause the timer
function pauseTimer() {
    if (!isRunning) return;
    
    buttonFeedback();
    isRunning = false;
    isPaused = true;
    clearInterval(interval);
    clearInterval(totalInterval);
    clearInterval(msInterval);


     // Release wake lock when paused
    releaseWakeLock();
    
    updateDisplay();
}



// Reset the timer
function resetTimer() {
    pauseTimer();
    countdown = workDuration;
    milliseconds = 0;
    totalTime = 0;
    totalMilliseconds = 0;
    currentRound = 0;
    isWorkPhase = true;
    isPaused = false;
    isRunning = false;
    progressBar.style.width = '0%';
    updateDisplay();
    celebrationContainer.classList.remove('active');
}

// Event listeners
startBtn.addEventListener('click', () => {
    buttonFeedback();
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

resetBtn.addEventListener('click', () => {
    buttonFeedback();
    resetTimer();
});

// Close celebration when clicked
celebrationContainer.addEventListener('click', () => {
    celebrationContainer.classList.remove('active');
    resetTimer();
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    resetTimer();
    
    // Request vibration on first interaction
    document.body.addEventListener('click', function() {
        if ('vibrate' in navigator) {
            navigator.vibrate(1);
        }
    }, { once: true });
});



// Add event listeners to handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRunning) {
        // Reacquire wake lock when page becomes visible again and timer is running
        requestWakeLock();
    } else if (document.visibilityState === 'hidden') {
        // Release wake lock when page is hidden to save battery
        releaseWakeLock();
    }
});
