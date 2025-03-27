// script.js
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
const restDuration = 3 * 60; // 3 minutes in seconds

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function formatTotalTime(seconds) {
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
}

function updateProgressBar() {
    let maxDuration = isWorkPhase ? workDuration : restDuration;
    let currentTime = maxDuration - countdown;
    let percentage = (currentTime / maxDuration) * 100;
    progressBar.style.width = `${percentage}%`;
}

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

// Improved vibration function
function vibrate(pattern) {
    if ('vibrate' in navigator) {
        try {
            // Make patterns stronger for better noticeability
            // For work end (stop)
            if (pattern.length === 5) {
                pattern = [300, 150, 300, 150, 600]; // Stronger stop pattern
            } 
            // For rest end (go)
            else if (pattern.length === 3) {
                pattern = [600, 150, 1000]; // Stronger go pattern
            }
            // For completion
            else {
                pattern = [600, 150, 600, 150, 600, 150, 1200]; // Stronger completion pattern
            }
            
            // Try to vibrate multiple times for devices that have weak vibration
            navigator.vibrate(pattern);
            
            // Vibrate again after a brief pause to make it more noticeable
            setTimeout(() => {
                navigator.vibrate(pattern);
            }, 1500);
            
            console.log("Vibration activated", pattern);
        } catch (e) {
            console.error("Vibration failed", e);
        }
    } else {
        console.log("Vibration not supported on this device");
    }
}

// Add this function to script.js
function playSound(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different sounds for different events
        if (type === 'complete') {
            // Celebratory sound
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            
            // Create a rising celebratory tone
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.2);
            oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.4);
            oscillator.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.6);
            
            // Fade out
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
            
            // Stop after pattern finishes
            setTimeout(() => { oscillator.stop(); }, 800);
        } else if (type === 'stop') {
            // Work ended sound
            oscillator.type = 'square';
            oscillator.frequency.value = 220;
            gainNode.gain.value = 0.2;
            
            oscillator.start();
            
            // Two-tone pattern
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(180, audioContext.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime + 0.4);
            
            // Fade out
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            
            setTimeout(() => { oscillator.stop(); }, 600);
        } else {
            // Rest ended sound (go)
            oscillator.type = 'triangle';
            oscillator.frequency.value = 440;
            gainNode.gain.value = 0.2;
            
            oscillator.start();
            
            // Rising tone
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.4);
            
            // Fade out
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            setTimeout(() => { oscillator.stop(); }, 500);
        }
        
    } catch (e) {
        console.error("Audio failed", e);
    }
}

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

// Update this part in the script.js file
// In the showCompletionCelebration function:
function showCompletionCelebration() {
    createConfetti();
    celebrationContainer.classList.add('active');
    
    // Reset round counter immediately to prevent 5/4 display
    currentRound = 4; // Keep it at 4 until full reset
    updateDisplay();
    
    // Vibrate and play sound
    vibrate([400, 100, 400, 100, 400, 100, 800]);
    playSound('complete');
    
    // Close celebration after 7 seconds and reset
    setTimeout(() => {
        celebrationContainer.classList.remove('active');
        resetTimer(); // Full reset after celebration ends
    }, 7000);
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    isPaused = false;
    
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
        
        // In the interval timer:
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

function pauseTimer() {
    if (!isRunning) return;
    
    isRunning = false;
    isPaused = true;
    clearInterval(interval);
    clearInterval(totalInterval);
    clearInterval(msInterval);
    updateDisplay();
}

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

startBtn.addEventListener('click', () => {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

resetBtn.addEventListener('click', resetTimer);

// Close celebration when clicked
celebrationContainer.addEventListener('click', () => {
    celebrationContainer.classList.remove('active');
});

// Initialize display
resetTimer();
