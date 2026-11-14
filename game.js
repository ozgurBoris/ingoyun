/* ==========================================================
   INGOYUN - 60 GÜNDE YDS KELİME OYUNU
   Core Game Engine & Mechanics
   ========================================================== */

class IngoGame {
    constructor() {
        this.wordsData = (typeof WORDS_DATA !== 'undefined') ? WORDS_DATA : [];
        this.currentDay = 1;
        this.currentRound = 1; // 1 to 4
        this.maxRounds = 4;
        this.wordIndex = 0; // 0 to 19
        this.roundWords = [];
        this.currentWord = null;
        this.cleanWord = "";
        
        // 5x5 Grid state
        this.grid = []; // 5x5 characters
        this.solutionPath = []; // Array of [r, c] for current word
        this.selectedPath = []; // Array of [r, c] selected by player
        this.isPointerDown = false;
        this.lastVisitedCell = null;
        
        // 15 Vibrant Cartoon Themes that rotate dynamically every word
        this.themes = [
            'theme-1',  // Purple / Mor
            'theme-2',  // Pink / Pembe
            'theme-3',  // Sky Blue / Gök Mavisi
            'theme-4',  // Emerald / Zümrüt Yeşili
            'theme-5',  // Coral Orange / Mercan
            'theme-6',  // Teal / Turkuaz
            'theme-7',  // Sunflower Yellow / Güneş Sarısı
            'theme-8',  // Magenta / Macenta
            'theme-9',  // Indigo / Çivit Mavisi
            'theme-10', // Mint / Nane Yeşili
            'theme-11', // Ruby Rose / Gül Kırmızı
            'theme-12', // Lavender / Lavanta
            'theme-13', // Electric Cyan / Camgöbeği
            'theme-14', // Royal Violet / Menekşe
            'theme-15'  // Salmon Peach / Tatlı Şeftali
        ];

        // Economy & Progress
        this.coins = 10;
        this.unlockedDays = [1];
        this.dayStars = {}; // day -> stars (1-3)
        this.dayRoundsCompleted = {}; // day -> rounds completed

        // Settings
        this.settings = {
            sound: true,
            speech: true,
            timer: true
        };

        // Timer
        this.timerMaxSeconds = 25;
        this.timerRemaining = 25;
        this.timerInterval = null;
        this.isPaused = false;
        this.isSolving = false;
        this.isInitialLoad = true;
        this.isPractice = false;
        this.boardBuilt = false;
        this.cellPool = [];
        this.cellCenters = [];
        this.lastEyeTime = 0;
        this.lastDisplayedSec = null;

        this.initStorage();
        this.bindDOM();
        this.bindEvents();
        this.loadDay(this.currentDay, true, this.isPractice);
    }

    // Local Storage Persistence
    initStorage() {
        try {
            const savedCoins = localStorage.getItem('ingoyun_coins');
            if (savedCoins !== null) this.coins = parseInt(savedCoins, 10) || 10;

            const savedUnlocked = localStorage.getItem('ingoyun_unlocked_days');
            if (savedUnlocked) this.unlockedDays = JSON.parse(savedUnlocked);

            const savedStars = localStorage.getItem('ingoyun_stars');
            if (savedStars) this.dayStars = JSON.parse(savedStars);

            const savedSettings = localStorage.getItem('ingoyun_settings');
            if (savedSettings) this.settings = { ...this.settings, ...JSON.parse(savedSettings) };

            const savedDay = localStorage.getItem('ingoyun_last_day');
            if (savedDay) {
                const dayNum = parseInt(savedDay, 10);
                if (dayNum >= 1 && dayNum <= 54) this.currentDay = dayNum;
            }

            const savedPractice = localStorage.getItem('ingoyun_is_practice');
            if (savedPractice !== null) {
                this.isPractice = savedPractice === '1';
            }

            const savedRound = localStorage.getItem('ingoyun_current_round');
            if (savedRound) {
                const r = parseInt(savedRound, 10);
                if (r >= 1 && r <= 4) this.savedRound = r;
            }

            const savedWordIndex = localStorage.getItem('ingoyun_word_index');
            if (savedWordIndex) {
                const wi = parseInt(savedWordIndex, 10);
                if (wi >= 0 && wi < 20) this.savedWordIndex = wi;
            }

            const savedWordIds = localStorage.getItem('ingoyun_round_word_ids');
            if (savedWordIds) {
                try {
                    this.savedRoundWordIds = JSON.parse(savedWordIds);
                } catch (e) {}
            }

            // Sync with sound manager
            if (window.sounds) {
                window.sounds.soundEnabled = this.settings.sound;
                window.sounds.speechEnabled = this.settings.speech;
            }
        } catch (e) {
            console.warn('Storage init error:', e);
        }
    }

    saveState() {
        try {
            localStorage.setItem('ingoyun_coins', this.coins.toString());
            localStorage.setItem('ingoyun_unlocked_days', JSON.stringify(this.unlockedDays));
            localStorage.setItem('ingoyun_stars', JSON.stringify(this.dayStars));
            localStorage.setItem('ingoyun_settings', JSON.stringify(this.settings));
            localStorage.setItem('ingoyun_last_day', this.currentDay.toString());
            localStorage.setItem('ingoyun_is_practice', this.isPractice ? '1' : '0');
            localStorage.setItem('ingoyun_current_round', (this.currentRound || 1).toString());
            localStorage.setItem('ingoyun_word_index', (this.wordIndex || 0).toString());
            if (this.roundWords && this.roundWords.length > 0) {
                const ids = this.roundWords.map(w => w.id || w.word);
                localStorage.setItem('ingoyun_round_word_ids', JSON.stringify(ids));
            }
        } catch (e) {
            console.warn('Storage save error:', e);
        }
    }

    bindDOM() {
        this.dom = {
            wordCounter: document.getElementById('word-counter-text'),
            roundPill: document.getElementById('round-pill'),
            coinsText: document.getElementById('coins-count'),
            pauseBtn: document.getElementById('pause-btn'),
            timerContainer: document.getElementById('timer-container'),
            timerFill: document.getElementById('timer-fill'),
            timerSublabel: document.getElementById('timer-sublabel'),
            targetWordLetters: document.getElementById('target-word-letters'),
            wordTrMeaning: document.getElementById('word-tr-meaning'),
            grid: document.getElementById('blob-grid'),
            hintBtn: document.getElementById('hint-btn'),
            dictBtn: document.getElementById('dict-btn'),
            speakBtn: document.getElementById('speak-btn'),

            // Modals
            wordModal: document.getElementById('word-completed-modal'),
            wordDetailEn: document.getElementById('modal-word-en'),
            wordDetailPos: document.getElementById('modal-word-pos'),
            wordDetailTr: document.getElementById('modal-word-tr'),
            wordDetailEx: document.getElementById('modal-word-example'),
            wordDetailExTr: document.getElementById('modal-word-example-tr'),
            wordDetailTags: document.getElementById('modal-word-tags'),
            wordNextBtn: document.getElementById('modal-next-word-btn'),
            wordSpeakBtn: document.getElementById('modal-speak-btn'),

            roundModal: document.getElementById('round-completed-modal'),
            roundModalTitle: document.getElementById('round-modal-title'),
            roundModalDesc: document.getElementById('round-modal-desc'),
            roundModalNextBtn: document.getElementById('round-modal-next-btn'),

            levelModal: document.getElementById('level-completed-modal'),
            levelModalTitle: document.getElementById('level-modal-title'),
            levelModalNextBtn: document.getElementById('level-modal-next-btn'),
            levelModalMenuBtn: document.getElementById('level-modal-menu-btn'),

            pauseModal: document.getElementById('pause-modal'),
            pauseResumeBtn: document.getElementById('pause-resume-btn'),
            pauseRestartBtn: document.getElementById('pause-restart-btn'),
            pauseLevelMenuBtn: document.getElementById('pause-level-menu-btn'),

            timeoutModal: document.getElementById('timeout-modal'),
            timeoutModalWord: document.getElementById('timeout-modal-word'),
            timeoutRetryBtn: document.getElementById('timeout-retry-btn'),
            timeoutNextBtn: document.getElementById('timeout-next-btn'),

            levelSelectModal: document.getElementById('level-select-modal'),
            levelGrid: document.getElementById('level-grid'),
            levelSelectCloseBtn: document.getElementById('level-select-close-btn'),

            dictModal: document.getElementById('dict-modal'),
            dictTitle: document.getElementById('dict-modal-title'),
            dictList: document.getElementById('dict-list'),
            dictCloseBtn: document.getElementById('dict-close-btn'),

            // Settings toggles in pause modal
            settingSound: document.getElementById('setting-sound'),
            settingSpeech: document.getElementById('setting-speech'),
            settingTimer: document.getElementById('setting-timer'),
        };

        this.updateCoinsUI();
        if (this.dom.settingSound) this.dom.settingSound.checked = this.settings.sound;
        if (this.dom.settingSpeech) this.dom.settingSpeech.checked = this.settings.speech;
        if (this.dom.settingTimer) this.dom.settingTimer.checked = this.settings.timer;
    }

    bindEvents() {
        // Pause Button
        this.dom.pauseBtn.addEventListener('click', () => this.showPauseModal());
        this.dom.pauseResumeBtn.addEventListener('click', () => this.hidePauseModal());
        this.dom.pauseRestartBtn.addEventListener('click', () => {
            this.hidePauseModal();
            this.savedRoundWordIds = null;
            this.isPaused = false;
            this.isSolving = false;
            this.startRound(1, 0);
        });
        this.dom.pauseLevelMenuBtn.addEventListener('click', () => {
            this.hidePauseModal();
            this.showLevelSelectModal();
        });

        // Timeout Modal buttons
        if (this.dom.timeoutRetryBtn) {
            this.dom.timeoutRetryBtn.addEventListener('click', () => {
                this.dom.timeoutModal.classList.remove('active');
                this.isPaused = false;
                this.isSolving = false;
                this.isPointerDown = false;
                this.resetSelection();
                this.resetTimer();
            });
        }
        if (this.dom.timeoutNextBtn) {
            this.dom.timeoutNextBtn.addEventListener('click', () => {
                this.dom.timeoutModal.classList.remove('active');
                this.isPaused = false;
                this.isSolving = false;
                this.isPointerDown = false;
                this.resetSelection();
                this.nextWord();
            });
        }

        // Settings toggles
        if (this.dom.settingSound) {
            this.dom.settingSound.addEventListener('change', (e) => {
                this.settings.sound = e.target.checked;
                if (window.sounds) window.sounds.soundEnabled = this.settings.sound;
                this.saveState();
            });
        }
        if (this.dom.settingSpeech) {
            this.dom.settingSpeech.addEventListener('change', (e) => {
                this.settings.speech = e.target.checked;
                if (window.sounds) window.sounds.speechEnabled = this.settings.speech;
                this.saveState();
            });
        }
        if (this.dom.settingTimer) {
            this.dom.settingTimer.addEventListener('change', (e) => {
                this.settings.timer = e.target.checked;
                this.saveState();
                if (!this.settings.timer) {
                    this.stopTimer();
                    this.dom.timerFill.style.transition = 'none';
                    this.dom.timerFill.style.transform = 'scaleX(1)';
                    this.dom.timerSublabel.textContent = 'Rahat Mod (Süresiz)';
                } else {
                    this.resetTimer();
                }
            });
        }

        // Action Buttons
        this.dom.hintBtn.addEventListener('click', () => this.useHint());
        this.dom.dictBtn.addEventListener('click', () => this.showDictionaryModal());
        this.dom.speakBtn.addEventListener('click', () => {
            if (this.currentWord && window.sounds) {
                window.sounds.speak(this.currentWord.displayWord || this.currentWord.word);
            }
        });

        // Word Modal Next
        this.dom.wordNextBtn.addEventListener('click', () => {
            this.hideWordModal();
            this.nextWord();
        });
        this.dom.wordSpeakBtn.addEventListener('click', () => {
            if (this.currentWord && window.sounds) {
                window.sounds.speak(this.currentWord.displayWord || this.currentWord.word);
            }
        });

        // Round Modal Next
        this.dom.roundModalNextBtn.addEventListener('click', () => {
            this.dom.roundModal.classList.remove('active');
            this.startRound(this.currentRound + 1);
        });

        // Level Modal Next / Menu
        this.dom.levelModalNextBtn.addEventListener('click', () => {
            this.dom.levelModal.classList.remove('active');
            if (!this.isPractice) {
                // After completing X. Gün, move directly to X. Gün Alıştırma!
                this.loadDay(this.currentDay, false, true);
            } else if (this.currentDay < 54) {
                // After completing X. Gün Alıştırma, move to (X+1). Gün!
                this.loadDay(this.currentDay + 1, false, false);
            } else {
                this.showLevelSelectModal();
            }
        });
        this.dom.levelModalMenuBtn.addEventListener('click', () => {
            this.dom.levelModal.classList.remove('active');
            this.showLevelSelectModal();
        });

        // Level Select Close
        this.dom.levelSelectCloseBtn.addEventListener('click', () => {
            this.dom.levelSelectModal.classList.remove('active');
            if (this.isPaused) this.resumeTimer();
        });

        // Dictionary Close
        this.dom.dictCloseBtn.addEventListener('click', () => {
            this.dom.dictModal.classList.remove('active');
            if (this.isPaused) this.resumeTimer();
        });

        // Grid Pointer / Drag Events
        const gridEl = this.dom.grid;

        gridEl.addEventListener('pointerdown', (e) => {
            const cellEl = e.target.closest('.blob-cell');
            if (!cellEl || this.isPaused || this.isSolving) return;
            this.scheduleEyeTracking(e.clientX, e.clientY);
            try { gridEl.setPointerCapture(e.pointerId); } catch (err) {}
            this.isPointerDown = true;
            const r = parseInt(cellEl.dataset.row, 10);
            const c = parseInt(cellEl.dataset.col, 10);
            this.lastPointerCell = [r, c];
            this.handleCellTouch(r, c);
        });

        let dragRafPending = false;
        let lastMoveX = 0;
        let lastMoveY = 0;

        gridEl.addEventListener('pointermove', (e) => {
            if (!this.isPointerDown || this.isPaused || this.isSolving) return;
            lastMoveX = e.clientX;
            lastMoveY = e.clientY;

            if (!dragRafPending) {
                dragRafPending = true;
                requestAnimationFrame(() => {
                    dragRafPending = false;
                    if (!this.isPointerDown || this.isPaused || this.isSolving) return;
                    if (!this.gridRect || !this.gridRect.width) this.updateCellCenters();
                    const rect = this.gridRect;
                    if (!rect || !rect.width) return;

                    const relX = lastMoveX - rect.left;
                    const relY = lastMoveY - rect.top;
                    if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) return;

                    const cellW = rect.width / 5;
                    const cellH = rect.height / 5;
                    const c = Math.floor(relX / cellW);
                    const r = Math.floor(relY / cellH);
                    if (r < 0 || r >= 5 || c < 0 || c >= 5) return;

                    // 10% edge deadzone to avoid accidental corner grazes while dragging
                    const inX = (relX - c * cellW) / cellW;
                    const inY = (relY - r * cellH) / cellH;
                    if (inX < 0.10 || inX > 0.90 || inY < 0.10 || inY > 0.90) return;

                    if (this.lastPointerCell && this.lastPointerCell[0] === r && this.lastPointerCell[1] === c) {
                        return;
                    }
                    this.lastPointerCell = [r, c];
                    this.handleCellTouch(r, c);
                });
            }
        }, { passive: true });

        const endDrag = (e) => {
            if (!this.isPointerDown) return;
            this.isPointerDown = false;
            this.lastVisitedCell = null;
            this.lastPointerCell = null;
            try {
                if (gridEl.hasPointerCapture && gridEl.hasPointerCapture(e.pointerId)) {
                    gridEl.releasePointerCapture(e.pointerId);
                }
            } catch (err) {}

            // When user releases finger or mouse without completing the word, RESET immediately!
            if (!this.isSolving && this.selectedPath.length > 0 && this.selectedPath.length < this.cleanWord.length) {
                if (window.sounds) window.sounds.playError();
                this.resetSelection();
            }
        };

        gridEl.addEventListener('pointerup', endDrag);
        gridEl.addEventListener('pointercancel', endDrag);
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);

        // Eye tracking: rAF throttled 60-120fps fluid tracking on mobile and desktop
        window.addEventListener('pointermove', (e) => {
            this.scheduleEyeTracking(e.clientX, e.clientY);
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches[0]) {
                this.scheduleEyeTracking(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        window.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches[0]) {
                this.scheduleEyeTracking(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        window.addEventListener('resize', () => {
            this.updateCellCenters();
        });

        // Background / App-Switch Lifecycle Handling
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.pauseTimer();
                if (this.isPointerDown) {
                    this.isPointerDown = false;
                    this.lastVisitedCell = null;
                    if (!this.isSolving) {
                        this.resetSelection();
                    }
                }
                this.saveState();
            } else if (document.visibilityState === 'visible') {
                // Resume timer only if NO modal is open and word is not currently solving
                const anyModalOpen = [
                    this.dom.pauseModal,
                    this.dom.wordModal,
                    this.dom.roundModal,
                    this.dom.levelModal,
                    this.dom.levelSelectModal,
                    this.dom.dictModal,
                    this.dom.timeoutModal
                ].some(m => m && m.classList.contains('active'));

                if (!anyModalOpen && !this.isSolving) {
                    this.resumeTimer();
                }
            }
        });

        window.addEventListener('pagehide', () => this.saveState());
        window.addEventListener('beforeunload', () => this.saveState());
    }

    // Load a Specific Day (Level) with seamless progress resume and Practice (Alıştırma) mode support
    loadDay(dayNum, resumeSaved = true, isPractice = false) {
        if (dayNum < 1 || dayNum > 54) dayNum = 1;
        this.currentDay = dayNum;
        if (!resumeSaved) {
            this.isPractice = Boolean(isPractice);
        }

        const dayEntry = this.wordsData.find(d => d.day === dayNum);
        if (!dayEntry || !dayEntry.words || dayEntry.words.length === 0) {
            console.error("No words found for day", dayNum);
            return;
        }

        if (resumeSaved && this.savedRound !== undefined && this.savedRound !== null) {
            const rToLoad = this.savedRound;
            const wToLoad = (this.savedWordIndex !== undefined && this.savedWordIndex !== null) ? this.savedWordIndex : 0;
            this.savedRound = null;
            this.savedWordIndex = null;
            this.startRound(rToLoad, wToLoad);
        } else {
            this.savedRound = null;
            this.savedWordIndex = null;
            this.savedRoundWordIds = null;
            this.startRound(1, 0);
        }
    }

    // Start a Round (1 to 4) at a specific word index
    startRound(roundNum, targetWordIndex = 0) {
        this.currentRound = roundNum;
        const dayEntry = this.wordsData.find(d => d.day === this.currentDay);
        const baseWords = [...dayEntry.words];

        if (roundNum === 1) {
            // Round 1: keep natural order
            this.roundWords = baseWords;
            this.savedRoundWordIds = null;
        } else if (this.savedRoundWordIds && this.savedRoundWordIds.length === 20) {
            // Restore exact saved shuffled order
            const mapped = [];
            this.savedRoundWordIds.forEach(id => {
                const found = baseWords.find(w => (w.id || w.word) === id);
                if (found) mapped.push(found);
            });
            this.roundWords = mapped.length === 20 ? mapped : this.shuffleArray(baseWords);
            this.savedRoundWordIds = null;
        } else {
            // Rounds 2, 3, 4: shuffle word order for spaced-repetition recall!
            this.roundWords = this.shuffleArray(baseWords);
            this.savedRoundWordIds = null;
        }

        this.wordIndex = (targetWordIndex >= 0 && targetWordIndex < 20) ? targetWordIndex : 0;
        this.saveState();
        this.updateHeaderUI();
        this.loadWord(this.wordIndex);
    }

    toTrUpper(str) {
        if (!str) return '';
        return str
            .replace(/i/g, 'İ')
            .replace(/ı/g, 'I')
            .replace(/ğ/g, 'Ğ')
            .replace(/ü/g, 'Ü')
            .replace(/ş/g, 'Ş')
            .replace(/ö/g, 'Ö')
            .replace(/ç/g, 'Ç')
            .toUpperCase()
            .replace(/[^A-ZÇĞİÖŞÜ]/g, '');
    }

    // Load a Word within the current round
    loadWord(idx) {
        this.wordIndex = idx;
        this.isPaused = false;
        this.isSolving = false;
        this.isPointerDown = false;
        this.lastVisitedCell = null;
        this.lastPointerCell = null;
        this.selectedPath = [];

        if (this.dom.timeoutModal) this.dom.timeoutModal.classList.remove('active');
        if (this.dom.wordModal) this.dom.wordModal.classList.remove('active');

        this.saveState(); // Instantly persist progress!
        this.currentWord = this.roundWords[idx];
        if (this.isPractice) {
            // Alıştırma Mode: player finds the Turkish word on the 5x5 grid!
            this.cleanWord = (this.currentWord.cleanTrWord || this.toTrUpper(this.currentWord.trWord || this.currentWord.meaning)).slice(0, 25);
        } else {
            // Normal Mode: player finds the English word on the 5x5 grid!
            this.cleanWord = (this.currentWord.cleanWord || this.currentWord.word.replace(/[^A-Za-z]/g, '').toUpperCase()).slice(0, 25);
        }

        this.updateHeaderUI();
        this.renderTargetWord();
        this.generateBoardLayout();
        this.renderBoard();
        this.resetTimer();

        // Auto pronounce English word on load if speech enabled (delayed slightly on cold start so frame 1 stays fluid)
        if (this.settings.speech && window.sounds) {
            const wText = this.currentWord.displayWord || this.currentWord.word;
            if (this.isInitialLoad) {
                this.isInitialLoad = false;
                setTimeout(() => {
                    if (this.settings.speech && window.sounds && !this.isPaused) {
                        window.sounds.speak(wText);
                    }
                }, 500);
            } else {
                window.sounds.speak(wText);
            }
        } else {
            this.isInitialLoad = false;
        }
    }

    updateHeaderUI() {
        if (this.isPractice) {
            this.dom.wordCounter.textContent = `${this.currentDay}. Gün Alıştırma • ${this.wordIndex + 1}/20`;
        } else {
            this.dom.wordCounter.textContent = `${this.currentDay}. Gün • Kelime ${this.wordIndex + 1}`;
        }
        this.dom.roundPill.textContent = `Tur ${this.currentRound}/4`;
        this.updateCoinsUI();
    }

    updateCoinsUI() {
        this.dom.coinsText.textContent = this.coins.toString();
    }

    // Render Target Word Letters at the top
    renderTargetWord() {
        this.dom.targetWordLetters.innerHTML = '';
        this.targetLetterEls = [];
        const frag = document.createDocumentFragment();
        const letters = this.cleanWord.split('');
        for (let i = 0; i < letters.length; i++) {
            const span = document.createElement('span');
            span.className = 'target-letter';
            span.dataset.index = i;
            span.textContent = letters[i];
            this.targetLetterEls.push(span);
            frag.appendChild(span);
        }
        this.dom.targetWordLetters.appendChild(frag);

        const posText = this.currentWord.pos ? `(${this.currentWord.pos}) ` : '';
        if (this.isPractice) {
            // Alıştırma Mode: show ONLY the English word underneath (do NOT write Turkish here!)
            this.dom.wordTrMeaning.textContent = `${posText}= ${this.currentWord.displayWord || this.currentWord.word}`;
        } else {
            // Normal Mode: show Turkish meaning underneath
            this.dom.wordTrMeaning.textContent = `${posText}= ${this.currentWord.meaning || ''}`;
        }
    }

    // Generate fresh randomized 5x5 board layout (Orthogonal only: Up, Down, Left, Right)
    // Flowing paths: straight lines, clean L-shapes, and wide S/Z sweeps without tight U-turns/clumping
    generateBoardLayout() {
        const L = this.cleanWord.length;
        const dirs = [
            [-1, 0], // Up
            [1, 0],  // Down
            [0, -1], // Left
            [0, 1]   // Right
        ];

        // Choose a straightness momentum for this word so short words often go straight or make 1 clean L-turn
        let targetStraightProb = 0.72;
        if (L <= 5) {
            const roll = Math.random();
            if (roll < 0.32) targetStraightProb = 0.96;      // Pure straight line across row/col
            else if (roll < 0.78) targetStraightProb = 0.74; // Clean L-turn
            else targetStraightProb = 0.50;                  // Wide Z / stair shape
        } else {
            targetStraightProb = 0.62 + Math.random() * 0.22;
        }

        let bestPath = null;
        let bestScore = -999999;

        for (let attempt = 0; attempt < 45; attempt++) {
            const startR = Math.floor(Math.random() * 5);
            const startC = Math.floor(Math.random() * 5);
            const path = [[startR, startC]];
            const visited = new Set([startR * 5 + startC]);
            let dfsOps = 0;
            const MAX_DFS_OPS = 350;

            const countVisitedNeighbors = (r, c) => {
                let cnt = 0;
                for (let i = 0; i < 4; i++) {
                    const nr = r + dirs[i][0];
                    const nc = c + dirs[i][1];
                    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && visited.has(nr * 5 + nc)) {
                        cnt++;
                    }
                }
                return cnt;
            };

            const dfs = (r, c, step, prevDr, prevDc) => {
                if (step === L) return true;
                if (++dfsOps > MAX_DFS_OPS) return false;

                const candidates = [];
                const wantStraight = Math.random() < targetStraightProb;

                for (let i = 0; i < 4; i++) {
                    const dr = dirs[i][0];
                    const dc = dirs[i][1];
                    const nr = r + dr;
                    const nc = c + dc;
                    const idx = nr * 5 + nc;
                    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && !visited.has(idx)) {
                        // vTouch === 1 means ONLY the current cell touches (nr, nc) -> zero tight U-turns or folding back!
                        const vTouch = countVisitedNeighbors(nr, nc);
                        const isSameDir = (dr === prevDr && dc === prevDc);
                        const clumpPenalty = (vTouch - 1) * 12;
                        const dirScore = (step > 1 && isSameDir === wantStraight) ? 0 : 2.2;
                        const priority = clumpPenalty + dirScore + Math.random();
                        candidates.push({ nr, nc, dr, dc, idx, priority });
                    }
                }

                candidates.sort((a, b) => a.priority - b.priority);

                for (let i = 0; i < candidates.length; i++) {
                    const cand = candidates[i];
                    visited.add(cand.idx);
                    path.push([cand.nr, cand.nc]);
                    if (dfs(cand.nr, cand.nc, step + 1, cand.dr, cand.dc)) return true;
                    path.pop();
                    visited.delete(cand.idx);
                }
                return false;
            };

            if (dfs(startR, startC, 1, 0, 0)) {
                // Score candidate path by spread (bounding box span) and zero self-touching clumps
                let minR = 5, maxR = -1, minC = 5, maxC = -1;
                for (let i = 0; i < path.length; i++) {
                    const pr = path[i][0], pc = path[i][1];
                    if (pr < minR) minR = pr;
                    if (pr > maxR) maxR = pr;
                    if (pc < minC) minC = pc;
                    if (pc > maxC) maxC = pc;
                }
                const span = (maxR - minR + 1) + (maxC - minC + 1);
                let clumps = 0;
                for (let i = 0; i < path.length; i++) {
                    for (let j = i + 2; j < path.length; j++) {
                        if (Math.abs(path[i][0] - path[j][0]) + Math.abs(path[i][1] - path[j][1]) === 1) {
                            clumps++;
                        }
                    }
                }

                const score = span * 5 - clumps * 20;
                if (score > bestScore) {
                    bestScore = score;
                    bestPath = path.map(pt => [pt[0], pt[1]]);
                }
                if (clumps === 0 && span >= Math.min(6, L + 1)) {
                    break;
                }
            }
        }

        let foundPath = bestPath;

        // Fallback deterministic orthogonal snake if needed
        if (!foundPath) {
            foundPath = [];
            for (let r = 0; r < 5; r++) {
                const cols = (r % 2 === 0) ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
                for (const c of cols) {
                    foundPath.push([r, c]);
                }
            }
            foundPath = foundPath.slice(0, L);
        }

        this.solutionPath = foundPath;

        // Initialize 5x5 grid with null
        this.grid = Array.from({ length: 5 }, () => Array(5).fill(null));

        // Place solution word letters along the path
        for (let i = 0; i < L; i++) {
            const [r, c] = foundPath[i];
            this.grid[r][c] = this.cleanWord[i];
        }

        // Fill remaining empty cells with weighted random distractor letters (avoiding identical adjacent letters)
        const letterPool = this.isPractice
            ? "AAAAAEEEEİİİIIIOOOUUUÜÜÖÖKKKLLLMMNNNRRRSSŞŞTTTÇÇĞĞBBCCDDGGHHPPVVYYZZ"
            : "EEEEEEAAAATOOOIINNNSSSHHRRDDLLCCUUMMWWFFGGYYPPBBVK";
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (this.grid[r][c] === null) {
                    let randChar = letterPool[Math.floor(Math.random() * letterPool.length)];
                    for (let tries = 0; tries < 8; tries++) {
                        const candidate = letterPool[Math.floor(Math.random() * letterPool.length)];
                        let conflict = false;
                        for (let d = 0; d < 4; d++) {
                            const nr = r + dirs[d][0];
                            const nc = c + dirs[d][1];
                            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && this.grid[nr][nc] === candidate) {
                                conflict = true;
                                break;
                            }
                        }
                        if (!conflict) {
                            randChar = candidate;
                            break;
                        }
                    }
                    this.grid[r][c] = randChar;
                }
            }
        }
    }

    // Render 5x5 SVG Blob Board (build persistent 25-cell DOM pool once, then update classes/letters in place)
    renderBoard() {
        const gridEl = this.dom.grid;
        // Dynamically rotate through the 15 themes on every word!
        const themeIndex = (this.wordIndex + (this.currentRound - 1) * 4) % this.themes.length;
        const themeClass = this.themes[themeIndex];

        if (!this.boardBuilt) {
            gridEl.innerHTML = '';
            this.cellPool = [];

            const template = document.createElement('template');
            template.innerHTML = `
                <svg viewBox="0 0 100 100" class="blob-svg" aria-hidden="true">
                    <path class="blob-body" d="M 50,14.5 C 72,14.5 87,34.5 95,64.5 C 99,82.5 92,94.5 50,94.5 C 8,94.5 1,82.5 5,64.5 C 13,34.5 28,14.5 50,14.5 Z" />
                    <ellipse cx="38" cy="30.5" rx="8" ry="10" fill="#ffffff" stroke="#181a19" stroke-width="2.6" />
                    <ellipse cx="58" cy="30.5" rx="8" ry="10" fill="#ffffff" stroke="#181a19" stroke-width="2.6" />
                    <path d="M 23,45.5 Q 26,49.5 28,44.5" fill="none" stroke="#181a19" stroke-width="2.6" stroke-linecap="round" />
                    <text class="blob-letter" x="50" y="76.5" text-anchor="middle" dominant-baseline="central"></text>
                </svg>
                <div class="blob-pupils">
                    <span class="pupil pupil-left"></span>
                    <span class="pupil pupil-right"></span>
                </div>
            `;

            const fragment = document.createDocumentFragment();
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    const cell = document.createElement('div');
                    cell.className = `blob-cell ${themeClass}`;
                    cell.dataset.row = r;
                    cell.dataset.col = c;
                    cell.id = `cell-${r}-${c}`;
                    cell.appendChild(template.content.cloneNode(true));

                    const letterEl = cell.querySelector('.blob-letter');
                    const pupilsEl = cell.querySelector('.blob-pupils');
                    letterEl.textContent = this.grid[r][c];

                    this.cellPool.push({ r, c, cell, letterEl, pupilsEl, lastT: '' });
                    fragment.appendChild(cell);
                }
            }
            gridEl.appendChild(fragment);
            this.boardBuilt = true;

            // Measure grid rect cleanly once layout settles on initial paint
            requestAnimationFrame(() => this.updateCellCenters());
        } else {
            for (let i = 0; i < 25; i++) {
                const entry = this.cellPool[i];
                entry.cell.className = `blob-cell ${themeClass}`;
                entry.letterEl.textContent = this.grid[entry.r][entry.c];
            }
        }
    }

    scheduleEyeTracking(x, y) {
        if (!x && !y) return;
        this.lastEyeX = x;
        this.lastEyeY = y;
        if (!this.eyeRafPending) {
            this.eyeRafPending = true;
            requestAnimationFrame((now) => {
                this.eyeRafPending = false;
                if (now - this.lastEyeTime < 36) return;
                this.lastEyeTime = now;
                this.trackEyes(this.lastEyeX, this.lastEyeY);
            });
        }
    }

    resetEyes() {
        const defaultT = 'translate3d(1px, -1px, 0)';
        for (let i = 0; i < this.cellPool.length; i++) {
            const item = this.cellPool[i];
            if (item.pupilsEl && item.lastT !== defaultT) {
                item.lastT = defaultT;
                item.pupilsEl.style.transform = defaultT;
            }
        }
    }

    updateCellCenters() {
        const gridEl = this.dom.grid;
        if (!gridEl) return;
        const rect = gridEl.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        this.gridRect = rect;

        // Single grid rect read instead of 25 separate getBoundingClientRect() calls (zero layout thrashing)
        const gap = 6;
        const cw = (rect.width - gap * 4) / 5;
        const ch = (rect.height - gap * 4) / 5;
        const stepX = cw + gap;
        const stepY = ch + gap;

        this.cellCenters = [];
        for (let i = 0; i < this.cellPool.length; i++) {
            const entry = this.cellPool[i];
            this.cellCenters.push({
                cx: rect.left + entry.c * stepX + cw * 0.5,
                cy: rect.top + entry.r * stepY + ch * 0.305,
                entry
            });
        }
    }

    trackEyes(mouseX, mouseY) {
        if (!this.cellCenters || this.cellCenters.length === 0) {
            this.updateCellCenters();
            if (!this.cellCenters || this.cellCenters.length === 0) return;
        }

        const maxOffsetPx = 2.8;
        const len = this.cellCenters.length;

        for (let i = 0; i < len; i++) {
            const item = this.cellCenters[i];
            const pupilsEl = item.entry.pupilsEl;
            if (!pupilsEl) continue;

            const dx = mouseX - item.cx;
            const dy = mouseY - item.cy;
            const distSq = dx * dx + dy * dy;
            if (distSq < 4) continue;

            const dist = Math.sqrt(distSq);
            const scale = (dist < 30) ? (dist / 30) : 1.0;
            // Quantize to integer pixels (-3px .. +3px) so 90%+ of cells skip DOM style writes during drag
            const offsetX = Math.round((dx / dist) * maxOffsetPx * scale);
            const offsetY = Math.round((dy / dist) * maxOffsetPx * scale);

            const transformStr = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
            if (item.entry.lastT !== transformStr) {
                item.entry.lastT = transformStr;
                pupilsEl.style.transform = transformStr;
            }
        }
    }

    // Touch / Click on a cell
    handleCellTouch(r, c) {
        const char = this.grid[r][c];
        const nextRequiredIndex = this.selectedPath.length;

        // If path is currently empty
        if (nextRequiredIndex === 0) {
            // First letter must match cleanWord[0]
            if (char === this.cleanWord[0]) {
                this.addToSelection(r, c);
            } else {
                this.shakeCell(r, c);
                if (window.sounds) window.sounds.playError();
            }
            return;
        }

        // If cell is already the last selected cell, ignore
        const last = this.selectedPath[this.selectedPath.length - 1];
        if (last[0] === r && last[1] === c) return;

        // Check if user is backtracking to previous cell in the selection
        if (this.selectedPath.length >= 2) {
            const prev = this.selectedPath[this.selectedPath.length - 2];
            if (prev[0] === r && prev[1] === c) {
                // Backtrack 1 step
                this.removeLastFromSelection();
                return;
            }
        }

        // Check if already visited earlier in path
        if (this.selectedPath.some(pt => pt[0] === r && pt[1] === c)) {
            return; // Can't reuse same cell
        }

        // Check orthogonal adjacency only (Up, Down, Left, Right - NO DIAGONALS)
        const dr = Math.abs(r - last[0]);
        const dc = Math.abs(c - last[1]);
        if (dr + dc === 1) {
            // Cell is horizontally or vertically adjacent! Check if it matches next letter
            if (char === this.cleanWord[nextRequiredIndex]) {
                this.addToSelection(r, c);
            } else {
                this.shakeCell(r, c);
                if (window.sounds) window.sounds.playError();
            }
        }
    }

    addToSelection(r, c) {
        this.selectedPath.push([r, c]);
        this.lastVisitedCell = [r, c];

        const poolItem = this.cellPool[r * 5 + c];
        const cellEl = poolItem ? poolItem.cell : document.getElementById(`cell-${r}-${c}`);
        if (cellEl) {
            cellEl.classList.add('selected');
            cellEl.classList.remove('hint-highlight');
        }

        // Highlight matching letter at top (direct array lookup, 0 querySelector)
        const step = this.selectedPath.length - 1;
        const letterEl = this.targetLetterEls && this.targetLetterEls[step];
        if (letterEl) letterEl.classList.add('matched');

        // Play pop sound with pitch increasing with step
        if (window.sounds) window.sounds.playPop(step);

        // Check if full word completed!
        if (this.selectedPath.length === this.cleanWord.length) {
            this.handleWordSolved();
        }
    }

    removeLastFromSelection() {
        if (this.selectedPath.length === 0) return;
        const removed = this.selectedPath.pop();
        const poolItem = this.cellPool[removed[0] * 5 + removed[1]];
        const cellEl = poolItem ? poolItem.cell : document.getElementById(`cell-${removed[0]}-${removed[1]}`);
        if (cellEl) cellEl.classList.remove('selected');

        const step = this.selectedPath.length;
        const letterEl = this.targetLetterEls && this.targetLetterEls[step];
        if (letterEl) letterEl.classList.remove('matched');

        this.lastVisitedCell = this.selectedPath.length > 0 ? this.selectedPath[this.selectedPath.length - 1] : null;
        if (window.sounds) window.sounds.playPop(Math.max(0, this.selectedPath.length - 1));
    }

    handleDragRelease() {
    }

    resetSelection() {
        for (let i = 0; i < this.cellPool.length; i++) {
            this.cellPool[i].cell.classList.remove('selected', 'hint-highlight', 'bounce', 'shake');
        }
        this.selectedPath = [];
        this.lastVisitedCell = null;
        this.lastPointerCell = null;

        if (this.targetLetterEls) {
            for (let i = 0; i < this.targetLetterEls.length; i++) {
                this.targetLetterEls[i].classList.remove('matched');
            }
        }
    }

    shakeCell(r, c) {
        const poolItem = this.cellPool[r * 5 + c];
        const cellEl = poolItem ? poolItem.cell : document.getElementById(`cell-${r}-${c}`);
        if (cellEl && !cellEl._shaking) {
            cellEl._shaking = true;
            cellEl.classList.add('shake');
            setTimeout(() => {
                cellEl.classList.remove('shake');
                cellEl._shaking = false;
            }, 350);
        }
    }

    // Word Solved Success!
    handleWordSolved() {
        this.isSolving = true;
        this.stopTimer();
        this.isPointerDown = false;

        // Bounce all solution cells
        this.selectedPath.forEach(([r, c]) => {
            const cellEl = document.getElementById(`cell-${r}-${c}`);
            if (cellEl) cellEl.classList.add('bounce');
        });

        // Play success audio & speech
        if (window.sounds) {
            window.sounds.playSuccess();
            setTimeout(() => {
                window.sounds.speak(this.currentWord.displayWord || this.currentWord.word);
            }, 300);
        }

        // Reward +1 coin
        this.addCoins(1);

        // Show Word Details Modal after short celebration
        setTimeout(() => {
            this.showWordModal();
        }, 650);
    }

    addCoins(amount) {
        this.coins += amount;
        this.saveState();
        this.updateCoinsUI();
        this.createFlyingCoinAnimation();
    }

    createFlyingCoinAnimation() {
        const coin = document.createElement('div');
        coin.className = 'flying-coin';
        coin.textContent = '🪙';
        document.body.appendChild(coin);

        const rect = this.dom.coinsText.getBoundingClientRect();
        coin.style.left = `${window.innerWidth / 2}px`;
        coin.style.top = `${window.innerHeight / 2}px`;

        requestAnimationFrame(() => {
            coin.style.left = `${rect.left}px`;
            coin.style.top = `${rect.top}px`;
            coin.style.opacity = '0';
            coin.style.transform = 'scale(0.5)';
        });

        setTimeout(() => coin.remove(), 750);
        if (window.sounds) window.sounds.playCoin();
    }

    // Hint: Highlights next unselected letter in solution path
    useHint() {
        if (this.coins < 3) {
            alert("İpucu için en az 3 coin gerekiyor! Kelimeleri çözerek coin kazanabilirsin.");
            return;
        }

        const nextIdx = this.selectedPath.length;
        if (nextIdx >= this.solutionPath.length) return;

        this.coins -= 3;
        this.saveState();
        this.updateCoinsUI();

        const [r, c] = this.solutionPath[nextIdx];
        const cellEl = document.getElementById(`cell-${r}-${c}`);
        if (cellEl) {
            cellEl.classList.add('hint-highlight');
            if (window.sounds) window.sounds.playPop(nextIdx);
        }
    }

    // Word Completed Modal
    showWordModal() {
        const w = this.currentWord;
        this.dom.wordDetailEn.textContent = w.displayWord || w.word;
        this.dom.wordDetailPos.textContent = w.pos ? `[${w.pos}]` : '';
        this.dom.wordDetailTr.textContent = w.meaning || 'Anlamı bulunamadı';

        if (w.example) {
            this.dom.wordDetailEx.textContent = `"${w.example}"`;
            this.dom.wordDetailExTr.textContent = w.exampleTr ? `— ${w.exampleTr}` : '';
            this.dom.wordDetailEx.parentElement.style.display = 'block';
        } else {
            this.dom.wordDetailEx.parentElement.style.display = 'none';
        }

        // Tags
        this.dom.wordDetailTags.innerHTML = '';
        if (w.synonyms) {
            const syns = w.synonyms.split(',').map(s => s.trim()).filter(s => s);
            syns.slice(0, 4).forEach(s => {
                const tag = document.createElement('span');
                tag.className = 'syn-tag';
                tag.textContent = `≈ ${s}`;
                this.dom.wordDetailTags.appendChild(tag);
            });
        }
        if (w.antonyms) {
            const ants = w.antonyms.split(',').map(a => a.trim()).filter(a => a);
            ants.slice(0, 3).forEach(a => {
                const tag = document.createElement('span');
                tag.className = 'ant-tag';
                tag.textContent = `≠ ${a}`;
                this.dom.wordDetailTags.appendChild(tag);
            });
        }

        this.dom.wordModal.classList.add('active');
    }

    hideWordModal() {
        this.dom.wordModal.classList.remove('active');
    }

    // Advance to next word, or next round, or level complete
    nextWord() {
        if (this.wordIndex + 1 < 20) {
            // Next word in current round
            this.loadWord(this.wordIndex + 1);
        } else {
            // Finished 20 words for this round!
            if (this.currentRound < this.maxRounds) {
                // Round Complete! ("20yi bitir sonra bi daha 4 tur böyle git")
                this.showRoundCompletedModal();
            } else {
                // All 4 rounds complete! Level Complete!
                this.handleLevelComplete();
            }
        }
    }

    showRoundCompletedModal() {
        if (window.sounds) window.sounds.playFanfare();
        this.dom.roundModalTitle.textContent = `🎯 ${this.currentRound}. Tur Tamamlandı!`;
        this.dom.roundModalDesc.textContent = `Harika gidiyorsun! 20 kelimeyi tamamladın. Şimdi ${this.currentRound + 1}. Tur başlıyor. Kelimeler taze ve tamamen yeni yerleşimleriyle karşına çıkacak!`;
        this.dom.roundModal.classList.add('active');
    }

    handleLevelComplete() {
        if (window.sounds) window.sounds.playFanfare();

        // 3 Stars & 50 Bonus Coins
        const starKey = this.isPractice ? `${this.currentDay}_p` : this.currentDay;
        this.dayStars[starKey] = 3;
        this.addCoins(50);

        // Unlock next day if not already unlocked
        if (this.currentDay < 54 && !this.unlockedDays.includes(this.currentDay + 1)) {
            this.unlockedDays.push(this.currentDay + 1);
        }

        this.saveState();

        if (this.isPractice) {
            this.dom.levelModalTitle.textContent = `🏆 ${this.currentDay}. Gün Alıştırma Tamamlandı!`;
            if (this.dom.levelModalNextBtn) {
                this.dom.levelModalNextBtn.innerHTML = this.currentDay < 54
                    ? `<span>Sonraki Gün (${this.currentDay + 1}. Gün)</span> ➔`
                    : `<span>Seviye Seçimi</span> ➔`;
            }
        } else {
            this.dom.levelModalTitle.textContent = `🏆 ${this.currentDay}. Gün Tamamlandı!`;
            if (this.dom.levelModalNextBtn) {
                this.dom.levelModalNextBtn.innerHTML = `<span>🎯 ${this.currentDay}. Gün Alıştırmaya Geç</span> ➔`;
            }
        }
        this.dom.levelModal.classList.add('active');
    }

    // Timer Implementation (100% GPU compositor CSS transition for zero-stutter bar + lightweight 250ms clock check)
    startTimerBarTransition(seconds) {
        const fill = this.dom.timerFill;
        if (!fill) return;
        const ratio = Math.max(0, Math.min(1, seconds / this.timerMaxSeconds));
        fill.style.transition = 'none';
        fill.style.transform = `scaleX(${ratio})`;
        // Flush only timerFill style so compositor starts linear glide to 0 cleanly
        void fill.offsetWidth;
        if (seconds > 0 && !this.isPaused && this.settings.timer) {
            fill.style.transition = `transform ${seconds.toFixed(2)}s linear`;
            fill.style.transform = 'scaleX(0)';
        }
    }

    resetTimer() {
        this.stopTimer();
        if (!this.settings.timer) {
            this.dom.timerFill.style.transition = 'none';
            this.dom.timerFill.style.transform = 'scaleX(1)';
            this.dom.timerSublabel.textContent = 'Rahat Mod (Süresiz)';
            return;
        }

        this.timerRemaining = this.timerMaxSeconds;
        this.timerEndTime = performance.now() + this.timerRemaining * 1000;
        this.lastDisplayedSec = null;
        this.updateTimerDisplay();
        this.startTimerBarTransition(this.timerRemaining);

        this.timerInterval = setInterval(() => {
            if (this.isPaused) return;
            const now = performance.now();
            this.timerRemaining = Math.max(0, (this.timerEndTime - now) / 1000);
            if (this.timerRemaining <= 0) {
                this.timerRemaining = 0;
                this.updateTimerDisplay();
                this.handleTimeOut();
            } else {
                this.updateTimerDisplay();
            }
        }, 250);
    }

    updateTimerDisplay() {
        const sec = Math.ceil(this.timerRemaining);
        if (sec !== this.lastDisplayedSec) {
            this.lastDisplayedSec = sec;
            this.dom.timerSublabel.textContent = `${sec} sn`;
        }
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.dom && this.dom.timerFill) {
            const ratio = Math.max(0, Math.min(1, this.timerRemaining / this.timerMaxSeconds));
            this.dom.timerFill.style.transition = 'none';
            this.dom.timerFill.style.transform = `scaleX(${ratio})`;
        }
    }

    pauseTimer() {
        if (this.isPaused) return;
        this.isPaused = true;
        if (this.settings.timer && this.timerEndTime) {
            this.timerRemaining = Math.max(0, (this.timerEndTime - performance.now()) / 1000);
            const ratio = Math.max(0, Math.min(1, this.timerRemaining / this.timerMaxSeconds));
            if (this.dom && this.dom.timerFill) {
                this.dom.timerFill.style.transition = 'none';
                this.dom.timerFill.style.transform = `scaleX(${ratio})`;
            }
        }
    }

    resumeTimer() {
        if (!this.isPaused) return;
        this.isPaused = false;
        if (this.settings.timer && this.timerRemaining > 0) {
            this.timerEndTime = performance.now() + this.timerRemaining * 1000;
            this.startTimerBarTransition(this.timerRemaining);
        }
    }

    handleTimeOut() {
        this.stopTimer();
        this.isPaused = true;
        this.isPointerDown = false;
        this.resetSelection();

        if (window.sounds) window.sounds.playError();

        // Shake grid gently
        this.dom.grid.classList.add('shake');
        setTimeout(() => this.dom.grid.classList.remove('shake'), 450);

        // Flash correct solution path to teach user
        this.solutionPath.forEach(([r, c]) => {
            const cellEl = document.getElementById(`cell-${r}-${c}`);
            if (cellEl) cellEl.classList.add('hint-highlight');
        });

        // Show non-blocking Timeout Modal
        setTimeout(() => {
            if (this.dom.timeoutModalWord) {
                const wName = this.currentWord ? (this.currentWord.displayWord || this.currentWord.word) : '';
                const trTarget = this.currentWord ? (this.currentWord.trWord || this.currentWord.meaning) : '';
                const trName = this.currentWord ? this.currentWord.meaning : '';
                if (this.isPractice) {
                    this.dom.timeoutModalWord.innerHTML = `<strong>${wName}</strong> ➔ <strong>${trTarget}</strong> (${trName})<br><br>Bu kelimeyi tekrar denemek ister misin?`;
                } else {
                    this.dom.timeoutModalWord.innerHTML = `<strong>${wName}</strong> (${trName})<br><br>Bu kelimeyi tekrar denemek ister misin?`;
                }
            }
            if (this.dom.timeoutModal) {
                this.dom.timeoutModal.classList.add('active');
            }
        }, 550);
    }

    // Modals Handling
    showPauseModal() {
        this.pauseTimer();
        this.dom.pauseModal.classList.add('active');
    }

    hidePauseModal() {
        this.dom.pauseModal.classList.remove('active');
        this.resumeTimer();
    }

    showLevelSelectModal() {
        this.pauseTimer();
        this.renderLevelGrid();
        this.dom.levelSelectModal.classList.add('active');
    }

    renderLevelGrid() {
        const grid = this.dom.levelGrid;
        grid.innerHTML = '';
        const frag = document.createDocumentFragment();

        const formatStars = (stars, defaultLabel) => {
            if (stars === 3) return '⭐⭐⭐';
            if (stars === 2) return '⭐⭐☆';
            if (stars === 1) return '⭐☆☆';
            return defaultLabel;
        };

        for (let d = 1; d <= 54; d++) {
            const isUnlocked = this.unlockedDays.includes(d);

            // 1) Normal Day Card (Left): Find English word
            const isCurrentNormal = d === this.currentDay && !this.isPractice;
            const starsNormal = this.dayStars[d] || 0;
            const btnNormal = document.createElement('div');
            btnNormal.className = `level-card-btn ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrentNormal ? 'current' : ''}`;
            btnNormal.innerHTML = `
                <span class="level-number">${d}. Gün</span>
                <span class="level-stars">${isUnlocked ? formatStars(starsNormal, 'İngilizce Bul') : '🔒 Kilitli'}</span>
            `;
            if (isUnlocked) {
                btnNormal.addEventListener('click', () => {
                    this.dom.levelSelectModal.classList.remove('active');
                    this.loadDay(d, false, false);
                });
            }
            frag.appendChild(btnNormal);

            // 2) Practice (Alıştırma) Card (Right, side by side): Find Turkish word
            const isCurrentPractice = d === this.currentDay && this.isPractice;
            const starsPractice = this.dayStars[`${d}_p`] || 0;
            const btnPractice = document.createElement('div');
            btnPractice.className = `level-card-btn practice ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrentPractice ? 'current' : ''}`;
            btnPractice.innerHTML = `
                <span class="level-number">${d}. Gün Alıştırma</span>
                <span class="level-stars">${isUnlocked ? formatStars(starsPractice, 'Türkçe Bul') : '🔒 Kilitli'}</span>
            `;
            if (isUnlocked) {
                btnPractice.addEventListener('click', () => {
                    this.dom.levelSelectModal.classList.remove('active');
                    this.loadDay(d, false, true);
                });
            }
            frag.appendChild(btnPractice);
        }

        grid.appendChild(frag);
    }

    showDictionaryModal() {
        this.pauseTimer();
        const dayEntry = this.wordsData.find(d => d.day === this.currentDay);
        this.dom.dictTitle.textContent = `📖 ${this.currentDay}. Gün Kelimeleri (${dayEntry.words.length})`;
        
        const list = this.dom.dictList;
        list.innerHTML = '';

        dayEntry.words.forEach((w, i) => {
            const item = document.createElement('div');
            item.className = 'dict-item';
            item.innerHTML = `
                <div class="dict-item-info">
                    <div class="dict-item-word">${i + 1}. ${w.displayWord || w.word} <small style="color:#a3e635;font-weight:normal;">(${w.pos || ''})</small></div>
                    <div class="dict-item-tr">${w.meaning}</div>
                </div>
                <button class="dict-speak-btn" title="Dinle">🔊</button>
            `;

            item.querySelector('.dict-speak-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.sounds) window.sounds.speak(w.displayWord || w.word);
            });

            list.appendChild(item);
        });

        this.dom.dictModal.classList.add('active');
    }

    // Utility: Shuffle Array
    shuffleArray(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }
}

// Start Game on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new IngoGame();
});
