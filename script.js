// State Management
let cards = [];
let index = 0;
let correct = [];
let wrong = [];
let isFlipped = false;

// Touch/Swipe State
let startX = 0;
let currentX = 0;
let isDragging = false;

const cardEl = document.getElementById('card');
const inputEl = document.getElementById('input');

// --- Initialization ---

window.onload = () => {
    const savedVocab = localStorage.getItem("vocabCards");
    if (savedVocab) {
        document.getElementById('btn-resume').classList.remove('hidden');
        inputEl.value = JSON.parse(savedVocab).map(c => `${c.front}, ${c.back}`).join('\n');
    }
    updateHistoryUI();
};

function loadVocab() {
    const txt = inputEl.value;
    cards = txt.split('\n').filter(l => l.trim()).map(line => {
        let p = line.includes(',') ? line.split(',') : line.split('\t');
        return { front: p[0]?.trim(), back: p[1]?.trim() };
    }).filter(c => c.front && c.back);
    
    if(!cards.length) return alert("Paste some words, bro!");
    
    // Shuffle cards for a better study experience
    cards = cards.sort(() => Math.random() - 0.5);
    localStorage.setItem("vocabCards", JSON.stringify(cards));
    start();
}

function resumeLast() {
    const saved = localStorage.getItem("vocabCards");
    if(saved) {
        cards = JSON.parse(saved);
        start();
    }
}

function start() {
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    index = 0; correct = []; wrong = [];
    showCard();
}

function showCard() {
    if (index >= cards.length) return finish();
    
    const progress = (index / cards.length) * 100;
    document.getElementById("progress-bar").style.width = `${progress}%`;
    
    isFlipped = false;
    cardEl.classList.remove('is-flipped', 'flipping', 'anim-out');
    cardEl.style.transform = 'none';
    
    document.getElementById("front").textContent = cards[index].front;
    document.getElementById("back").textContent = cards[index].back;
    document.getElementById("front").style.background = "white";
    document.getElementById("back").style.background = "#f8f9ff";
}

// --- Card Interactions ---

cardEl.addEventListener('pointerdown', e => {
    if(cardEl.classList.contains('anim-out')) return;
    startX = e.clientX;
    isDragging = true;
    cardEl.style.transition = 'none';
});

window.addEventListener('pointermove', e => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    
    let rotate = currentX / 15;
    let tilt = Math.abs(currentX) / 20;
    
    // If it's flipped, we need to adjust the rotation math
    let baseTransform = isFlipped ? 'rotateY(180deg) scale(1.05)' : '';
    let swipeTransform = `translateX(${currentX}px) rotate(${rotate}deg) translateY(${-tilt}px)`;
    
    cardEl.style.transform = `${swipeTransform} ${baseTransform}`;

    // Color feedback
    const activeFace = isFlipped ? document.getElementById("back") : document.getElementById("front");
    if (currentX > 50) activeFace.style.background = "#e8f5e9";
    else if (currentX < -50) activeFace.style.background = "#ffebee";
    else activeFace.style.background = isFlipped ? "#f8f9ff" : "white";
});

window.addEventListener('pointerup', () => {
    if (!isDragging) return;
    isDragging = false;
    
    if (Math.abs(currentX) > 130) {
        handleAction(currentX > 0);
    } else {
        if (Math.abs(currentX) < 10) {
            toggleFlip();
        } else {
            cardEl.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            cardEl.style.transform = isFlipped ? 'rotateY(180deg) scale(1.05)' : 'none';
            resetFaceColors();
        }
    }
    currentX = 0;
});

function toggleFlip() {
    isFlipped = !isFlipped;
    cardEl.classList.add('flipping');
    if (isFlipped) cardEl.classList.add('is-flipped');
    else cardEl.classList.remove('is-flipped');
    
    setTimeout(() => cardEl.classList.remove('flipping'), 600);
}

function handleAction(knew) {
    if(cardEl.classList.contains('anim-out')) return;
    
    let c = cards[index];
    if (knew) correct.push(c); else wrong.push(c);
    
    cardEl.classList.add('anim-out');
    const xDir = knew ? 1000 : -1000;
    cardEl.style.transition = 'transform 0.5s ease-in';
    
    // Maintain Y rotation if it was flipped when swiped
    let flipState = isFlipped ? 'rotateY(180deg)' : '';
    cardEl.style.transform = `translateX(${xDir}px) rotate(${xDir/10}deg) ${flipState} scale(0.5)`;
    
    setTimeout(() => {
        index++;
        showCard();
    }, 400);
}

function resetFaceColors() {
    document.getElementById("front").style.background = "white";
    document.getElementById("back").style.background = "#f8f9ff";
}

// --- Results & History ---

function finish() {
    document.getElementById("game").classList.add("hidden");
    document.getElementById("result").classList.remove("hidden");
    
    const percent = Math.round((correct.length / cards.length) * 100);
    document.getElementById("score-text").innerHTML = percent >= 80 ? "Legendary! 🏆" : "Keep Grinding! 💪";
    
    document.getElementById("stats-box").innerHTML = `
        <div class="stat-item"><span>Accuracy</span><br><b>${percent}%</b></div>
        <div class="stat-item"><span>Mastered</span><br><b>${correct.length}</b></div>
        <div class="stat-item"><span>Missed</span><br><b>${wrong.length}</b></div>
    `;

    saveAttempt(percent);
    
    let listHtml = "";
    if(wrong.length > 0) {
        listHtml += `<p style="color:var(--error); font-weight:bold; margin-top:0;">Focus on these:</p>`;
        wrong.forEach(c => listHtml += `<div class="result-item error">${c.front} → ${c.back}</div>`);
    }
    document.getElementById("result-lists").innerHTML = listHtml;
}

function saveAttempt(percent) {
    let history = JSON.parse(localStorage.getItem("studyHistory") || "[]");
    history.unshift({
        date: new Date().toLocaleDateString(),
        score: percent,
        count: cards.length
    });
    // Keep only last 5
    localStorage.setItem("studyHistory", JSON.stringify(history.slice(0, 5)));
}

function updateHistoryUI() {
    const history = JSON.parse(localStorage.getItem("studyHistory") || "[]");
    if (history.length > 0) {
        document.getElementById('history-section').classList.remove('hidden');
        document.getElementById('history-list').innerHTML = history.map(h => `
            <div class="history-item">
                <span>${h.date}</span>
                <span style="color:${h.score >= 80 ? 'var(--success)' : 'white'}">${h.score}%</span>
            </div>
        `).join('');
    }
}
