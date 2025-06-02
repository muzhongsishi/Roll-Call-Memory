document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] DOMContentLoaded - Script execution started.');

    const noteMapping = {
        1: { solfege: 'do', noteName: 'C' },
        2: { solfege: 're', noteName: 'D' },
        3: { solfege: 'mi', noteName: 'E' },
        4: { solfege: 'fa', noteName: 'F' },
        5: { solfege: 'sol', noteName: 'G' },
        6: { solfege: 'la', noteName: 'A' },
        7: { solfege: 'ti', noteName: 'B' },
    };

    const difficultySelect = document.getElementById('difficulty');
    const startGameButton = document.getElementById('startGame');
    const numbersDisplay = document.getElementById('numbers-display');
    const optionsDisplay = document.getElementById('options-display');
    const selectedNotesDisplay = document.getElementById('selected-notes');
    const checkAnswerButton = document.getElementById('checkAnswer');
    const nextLevelButton = document.getElementById('nextLevel');
    const feedbackDisplay = document.getElementById('feedback');
    const scoreDisplay = document.getElementById('score');

    // Audio Elements (Placeholders - replace with actual paths)
    console.log('[DEBUG] Initializing AudioContext...');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext) {
        console.log('[DEBUG] AudioContext initialized successfully. State:', audioContext.state);
    } else {
        console.error('[DEBUG] FAILED to initialize AudioContext.');
        // If AudioContext fails, sound functions will not work.
    }

    const sounds = {
        click: 'assets/click.mp3',          // Replace with your click sound file
        correct: 'assets/correct.mp3',      // Replace with your correct sound file
        incorrect: 'assets/incorrect.mp3',  // Replace with your incorrect sound file
        victory: 'assets/victory.mp3'       // Replace with your victory sound file
    };
    let soundBuffers = {}; // To store preloaded sound data

    // Function to preload sounds
    function loadSound(name, url) {
        console.log(`[DEBUG] loadSound: Attempting to load '${name}' from '${url}'`);
        if (!audioContext) {
            console.error(`[DEBUG] loadSound: AudioContext not available for '${name}'.`);
            return Promise.reject('AudioContext not available');
        }
        return fetch(url)
            .then(response => {
                console.log(`[DEBUG] loadSound('${name}'): Fetch response status: ${response.status}`);
                if (!response.ok) {
                    throw new Error(`Sound file ${url} not found or failed to load (status: ${response.status}).`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                console.log(`[DEBUG] loadSound('${name}'): ArrayBuffer received, decoding...`);
                return audioContext.decodeAudioData(arrayBuffer);
            })
            .then(audioBuffer => {
                console.log(`[DEBUG] loadSound('${name}'): Decoded successfully, storing buffer.`);
                soundBuffers[name] = audioBuffer;
            })
            .catch(error => {
                console.error(`[DEBUG] Could not load sound: '${name}' from '${url}'. Error:`, error);
            });
    }

    // Preload all sounds when the script runs
    console.log('[DEBUG] Preloading sounds...');
    if (audioContext) { // Only attempt to load if context is there
        Object.keys(sounds).forEach(key => {
            console.log(`[DEBUG] Initiating load for sound key: '${key}'`);
            loadSound(key, sounds[key]);
        });
    } else {
        console.warn('[DEBUG] Sounds not preloaded because AudioContext is not available.');
    }

    function playSound(name) {
        console.log(`[DEBUG] playSound: Attempting to play '${name}'. Buffer exists:`, !!soundBuffers[name]);
        if (!audioContext) {
            console.error(`[DEBUG] playSound: AudioContext not available for '${name}'.`);
            return;
        }
        if (audioContext.state === 'suspended') {
            console.warn('[DEBUG] playSound: AudioContext is suspended. Attempting to resume...');
            audioContext.resume().then(() => {
                console.log('[DEBUG] playSound: AudioContext resumed. Now playing sound.');
                if (soundBuffers[name]) {
                    const source = audioContext.createBufferSource();
                    source.buffer = soundBuffers[name];

                    // Volume control
                    const gainNode = audioContext.createGain();
                    if (name === 'victory') {
                        gainNode.gain.value = 0.15; // Set volume to 15% for victory sound
                        console.log(`[DEBUG] playSound: Applying 15% volume for '${name}'`);
                    } else {
                        gainNode.gain.value = 1.0; // Default volume for other sounds
                    }

                    source.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    source.start(0);
                }
            }).catch(err => console.error('[DEBUG] Failed to resume AudioContext:', err));
        } else if (soundBuffers[name]) {
            const source = audioContext.createBufferSource();
            source.buffer = soundBuffers[name];

            // Volume control
            const gainNode = audioContext.createGain();
            if (name === 'victory') {
                gainNode.gain.value = 0.25; // Set volume to 25% for victory sound
                console.log(`[DEBUG] playSound: Applying 25% volume for '${name}'`);
            } else {
                gainNode.gain.value = 1.0; // Default volume for other sounds
            }

            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            source.start(0);
        } else {
            console.warn(`[DEBUG] Sound not loaded or found: '${name}', cannot play.`);
        }
    }

    // Game Mode Elements
    const classicModeButton = document.getElementById('selectClassicMode');
    const sequenceModeButton = document.getElementById('selectSequenceMode');
    const classicModeArea = document.getElementById('classicModeArea');
    const sequenceModeArea = document.getElementById('sequenceModeArea');

    // Sequence Mode Specific Elements (initialized from previous step, ensure they are grabbed)
    const sequenceNumbersDisplay = document.getElementById('sequence-numbers-display'); // Corrected ID
    const sequenceOptionsDisplay = document.getElementById('sequence-options-display'); // Corrected ID
    // const sequenceFeedbackDisplay = document.getElementById('sequence-feedback-display'); // If you added this one too

    let currentDifficulty = 3;
    let currentNumbers = []; // Used by Classic mode and as base for Sequence mode
    let currentCorrectNoteNames = []; // Used by Classic mode
    let userSelectedNoteNames = []; // Used by Classic mode for their direct selections
    let score = 0;
    let gameStarted = false;
    let currentMode = 'classic'; // Default mode

    // Sequence Mode State Variables
    let sequenceFullChallenge = []; // The 10-digit sequence
    let sequenceBaseNotes = []; // The unique notes making up the sequence (e.g., [C, G, B])
    let sequenceUserProgress = []; // What the user has clicked so far for the current part of sequence
    let currentSequenceStep = 0; // Tracks which of the 10 digits the user is trying to match

    // Event Listeners for Mode Switching
    classicModeButton.addEventListener('click', () => switchMode('classic'));
    sequenceModeButton.addEventListener('click', () => switchMode('sequence'));

    function switchMode(newMode) {
        if (newMode === currentMode) return;
        currentMode = newMode;
        gameStarted = false; // Reset game state when switching modes
        resetScore(); // Or decide if score should persist across modes

        // Update button active states
        classicModeButton.classList.toggle('active-mode', newMode === 'classic');
        sequenceModeButton.classList.toggle('active-mode', newMode === 'sequence');

        // Update card visibility and animation
        // The inactive-stacked gives a nice "behind" effect if desired
        if (newMode === 'classic') {
            classicModeArea.classList.remove('inactive-stacked');
            classicModeArea.classList.add('active');
            sequenceModeArea.classList.remove('active');
            sequenceModeArea.classList.add('inactive-stacked');
        } else { // sequence mode
            sequenceModeArea.classList.remove('inactive-stacked');
            sequenceModeArea.classList.add('active');
            classicModeArea.classList.remove('active');
            classicModeArea.classList.add('inactive-stacked');
        }

        // Reset UI elements for both modes to a clean state
        numbersDisplay.innerHTML = '';
        optionsDisplay.innerHTML = '';
        selectedNotesDisplay.innerHTML = '';
        if (sequenceNumbersDisplay) sequenceNumbersDisplay.innerHTML = '';
        if (sequenceOptionsDisplay) sequenceOptionsDisplay.innerHTML = '';
        feedbackDisplay.textContent = '';
        feedbackDisplay.className = '';
        checkAnswerButton.style.display = 'none';
        nextLevelButton.style.display = 'none';
        difficultySelect.disabled = false;
        startGameButton.disabled = false;
        startGameButton.textContent = '开始游戏'; // Reset button text

        // If game was in progress, ensure options are re-enabled visually
        document.querySelectorAll('.option-card').forEach(card => {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        });
         // If game starts automatically on mode switch, call startGame() here.
         // Otherwise, user will click "Start Game"
    }


    startGameButton.addEventListener('click', () => {
        currentDifficulty = parseInt(difficultySelect.value);
        if (currentMode === 'classic') {
            startGameClassic();
        } else {
            startGameSequence();
        }
    });

    checkAnswerButton.addEventListener('click', () => {
        if (currentMode === 'classic') {
            checkAnswerClassic();
        } else {
            // Sequence mode checks answer progressively, but might have a final check/next
            // For now, this button might be hidden or repurposed in sequence mode
        }
    });
    
    nextLevelButton.addEventListener('click', () => {
         if (currentMode === 'classic') {
            startGameClassic(); // Next level in classic mode
        } else {
            startGameSequence(); // Next level in sequence mode
        }
    });

    function resetScore() {
        score = 0;
        scoreDisplay.textContent = score;
    }

    // Renamed original startGame to startGameClassic
    function startGameClassic() {
        gameStarted = true;
        userSelectedNoteNames = [];
        currentNumbers = []; // Classic mode's displayed numbers
        currentCorrectNoteNames = []; // Correct sequence of note names for classic
        feedbackDisplay.textContent = '';
        feedbackDisplay.className = '';
        selectedNotesDisplay.innerHTML = '';
        numbersDisplay.innerHTML = '';
        optionsDisplay.innerHTML = '';
        
        checkAnswerButton.style.display = 'none'; // No longer needed as answers are checked automatically
        nextLevelButton.style.display = 'none';
        difficultySelect.disabled = true;
        startGameButton.disabled = true;

        const allPossibleNumbers = Object.keys(noteMapping).map(n => parseInt(n));
        let availableNumbers = [...allPossibleNumbers];

        for (let i = 0; i < currentDifficulty; i++) {
            if (availableNumbers.length === 0) break;
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            const randomNumber = availableNumbers.splice(randomIndex, 1)[0];
            currentNumbers.push(randomNumber); // These are the numbers shown to the user
            currentCorrectNoteNames.push(noteMapping[randomNumber].noteName); // These are the answers
        }

        currentNumbers.forEach(num => {
            const numberCard = document.createElement('div');
            numberCard.classList.add('number-card');
            numberCard.textContent = num;
            numbersDisplay.appendChild(numberCard);
        });

        let optionsForCurrentRoundDetails = currentNumbers.map(num => noteMapping[num]);
        const shuffledOptions = [...optionsForCurrentRoundDetails].sort(() => Math.random() - 0.5);

        shuffledOptions.forEach(noteDetail => {
            const optionCard = document.createElement('div');
            optionCard.classList.add('option-card');
            const noteNameSpan = document.createElement('span');
            noteNameSpan.classList.add('option-note-name');
            noteNameSpan.textContent = noteDetail.noteName;

            const solfegeSpan = document.createElement('span');
            solfegeSpan.classList.add('option-solfege');
            solfegeSpan.textContent = noteDetail.solfege;

            optionCard.appendChild(noteNameSpan);
            optionCard.appendChild(solfegeSpan);
            optionCard.addEventListener('click', () => handleOptionClickClassic(noteDetail.noteName, optionCard));
            optionsDisplay.appendChild(optionCard);
        });
        // playSound('click'); // Optional: sound for starting game/new round
    }

    // Renamed handleOptionClick to handleOptionClickClassic
    function handleOptionClickClassic(selectedNoteName, cardElement) {
        if (!gameStarted || userSelectedNoteNames.length >= currentDifficulty) return;
        playSound('click'); // Sound for clicking an option
        userSelectedNoteNames.push(selectedNoteName);
        const selectedCard = document.createElement('div');
        selectedCard.classList.add('selected-card');
        
        const noteDetail = Object.values(noteMapping).find(nd => nd.noteName === selectedNoteName);
        if (noteDetail) {
            const noteNameSpan = document.createElement('span');
            noteNameSpan.classList.add('option-note-name');
            noteNameSpan.textContent = noteDetail.noteName;
            const solfegeSpan = document.createElement('span');
            solfegeSpan.classList.add('option-solfege');
            solfegeSpan.textContent = noteDetail.solfege;
            selectedCard.appendChild(noteNameSpan);
            selectedCard.appendChild(solfegeSpan);
        } else {
            selectedCard.textContent = selectedNoteName;
        }
        
        selectedNotesDisplay.appendChild(selectedCard);
        cardElement.style.opacity = '0.5';
        cardElement.style.pointerEvents = 'none';

        // Problem 1 Fix: Automatically check answer if all options are selected
        if (userSelectedNoteNames.length === currentDifficulty) {
            checkAnswerClassic();
        }
    }

    // Renamed checkAnswer to checkAnswerClassic
    function checkAnswerClassic() {
        // if (userSelectedNoteNames.length !== currentDifficulty) return; // This check might be redundant if called automatically

        let correct = true;
        for (let i = 0; i < currentDifficulty; i++) {
            if (userSelectedNoteNames[i] !== currentCorrectNoteNames[i]) {
                correct = false;
                break;
            }
        }

        if (correct) {
            feedbackDisplay.textContent = '正确!';
            feedbackDisplay.className = 'correct';
            score += currentDifficulty;
            scoreDisplay.textContent = score;
            nextLevelButton.style.display = 'inline-block';
            playSound('correct'); // Sound for correct answer
            // Check for perfect score for victory effect
            // In classic mode, a perfect score means getting all `currentDifficulty` correct.
            triggerVictoryEffect(); // Assuming any correct completion is a small victory
        } else {
            feedbackDisplay.textContent = '错误。正确的顺序是: ' + currentCorrectNoteNames.join(', ');
            feedbackDisplay.className = 'incorrect';
            playSound('incorrect'); // Sound for incorrect answer
        }
        // checkAnswerButton.style.display = 'none'; // Button is already hidden or not used
        difficultySelect.disabled = false;
        startGameButton.disabled = false;
        startGameButton.textContent = '再来一轮'; // Update button text for classic mode post-round
        gameStarted = false; 
        document.querySelectorAll('#classicModeArea .option-card').forEach(card => { // Ensure targeting classic mode cards
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        });
    }

    // ---------- SEQUENCE MODE LOGIC ----------
    function startGameSequence() {
        gameStarted = true;
        sequenceFullChallenge = [];
        sequenceBaseNotes = [];
        sequenceUserProgress = [];
        currentSequenceStep = 0;

        feedbackDisplay.textContent = ''; // Clear general feedback
        feedbackDisplay.className = '';
        if (sequenceNumbersDisplay) sequenceNumbersDisplay.innerHTML = ''; // Clear previous sequence
        if (sequenceOptionsDisplay) sequenceOptionsDisplay.innerHTML = ''; // Clear previous options
        
        // Hide classic mode buttons, sequence mode might not use them or use them differently
        checkAnswerButton.style.display = 'none'; 
        nextLevelButton.style.display = 'none';
        difficultySelect.disabled = true;
        startGameButton.disabled = true; // Disable while game is in progress
        startGameButton.textContent = '游戏中...';


        // 1. Generate base random unique numbers (count = currentDifficulty)
        const allPossibleNumbers = Object.keys(noteMapping).map(n => parseInt(n));
        let availableNumbers = [...allPossibleNumbers];
        let baseNumbers = []; // e.g., [1, 5, 7] for difficulty 3
        for (let i = 0; i < currentDifficulty; i++) {
            if (availableNumbers.length === 0) break;
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            baseNumbers.push(availableNumbers.splice(randomIndex, 1)[0]);
        }
        sequenceBaseNotes = baseNumbers.map(num => noteMapping[num].noteName); // e.g., ['C', 'G', 'B']

        // 2. Generate 10-digit sequence from these base numbers
        for (let i = 0; i < 10; i++) {
            const randomNumberFromBase = baseNumbers[Math.floor(Math.random() * baseNumbers.length)];
            sequenceFullChallenge.push(randomNumberFromBase);
        }

        // 3. Display the 10-digit sequence as boxes
        sequenceFullChallenge.forEach((num, index) => {
            const box = document.createElement('div');
            box.classList.add('sequence-number-box');
            box.dataset.index = index; // To identify the box later
            // Problem 2 Fix: Display the actual number instead of ' ? '
            box.textContent = num; // Show the number (1-7) 
            // box.textContent = noteMapping[num].noteName; // Or show note name like 'C', 'D' for a different challenge
            // box.textContent = noteMapping[num].solfege; // Or show solfege like 'do', 're'
            sequenceNumbersDisplay.appendChild(box);
        });

        // 4. Display options (based on unique base notes, shuffled)
        let optionsForSequence = [...baseNumbers.map(num => noteMapping[num])]; // Get full details
        optionsForSequence.sort(() => Math.random() - 0.5); // Shuffle

        optionsForSequence.forEach(noteDetail => {
            const optionCard = document.createElement('div');
            optionCard.classList.add('option-card'); // Reuse option-card style

            const noteNameSpan = document.createElement('span');
            noteNameSpan.classList.add('option-note-name');
            noteNameSpan.textContent = noteDetail.noteName;

            const solfegeSpan = document.createElement('span');
            solfegeSpan.classList.add('option-solfege');
            solfegeSpan.textContent = noteDetail.solfege;

            optionCard.appendChild(noteNameSpan);
            optionCard.appendChild(solfegeSpan);
            
            optionCard.addEventListener('click', () => handleOptionClickSequence(noteDetail.noteName, optionCard));
            sequenceOptionsDisplay.appendChild(optionCard);
        });
        // playSound('click'); // Optional: sound for starting game/new round
    }

    function handleOptionClickSequence(selectedNoteName, cardElement) {
        if (!gameStarted || currentSequenceStep >= 10) return;
        playSound('click'); // Sound for clicking an option
        const currentChallengeNumber = sequenceFullChallenge[currentSequenceStep];
        const expectedNoteName = noteMapping[currentChallengeNumber].noteName; // Convert to 'C', 'G', 'B'

        const boxToUpdate = sequenceNumbersDisplay.querySelector(`.sequence-number-box[data-index="${currentSequenceStep}"]`);

        if (selectedNoteName === expectedNoteName) {
            boxToUpdate.textContent = selectedNoteName; // Or noteMapping[currentChallengeNumber].solfege
            boxToUpdate.classList.add('correct');
            boxToUpdate.classList.remove('incorrect'); // Just in case
            sequenceUserProgress.push(selectedNoteName); // Log correct selection
            // playSound('correct'); // Sound for each correct step in sequence (can be too much)
        } else {
            boxToUpdate.textContent = 'X'; // Or noteMapping[currentChallengeNumber].noteName to show correct
            boxToUpdate.classList.add('incorrect');
            boxToUpdate.classList.remove('correct');
            // Game over for this sequence? Or allow to continue? For now, just mark and proceed
            // We might want to end the round here if an error is made.
            // For this version, we'll let them finish the 10 steps.
            sequenceUserProgress.push(null); // Log incorrect selection as null or some other marker
            playSound('incorrect'); // Sound for incorrect step in sequence
        }
        
        currentSequenceStep++;

        if (currentSequenceStep >= 10) {
            // All 10 steps completed, check overall result
            finalizeSequence();
        }
    }

    function finalizeSequence() {
        gameStarted = false;
        difficultySelect.disabled = false;
        startGameButton.disabled = false;
        startGameButton.textContent = '再来一轮 (序列)';
        nextLevelButton.style.display = 'inline-block'; // Or specific "Next Sequence" button
        nextLevelButton.textContent = '下一序列';


        let correctCount = 0;
        for(let i=0; i < 10; i++) {
            if (noteMapping[sequenceFullChallenge[i]].noteName === sequenceUserProgress[i]) {
                correctCount++;
            }
        }

        if (correctCount === 10) {
            feedbackDisplay.textContent = `太棒了! 10个全部正确!`;
            feedbackDisplay.className = 'correct';
            score += 10; 
            playSound('victory'); // Special victory sound for all 10 correct
            triggerVictoryEffect(true); // true for a bigger confetti burst
        } else if (correctCount > 0) { // Some correct answers
            feedbackDisplay.textContent = `完成了! 你答对了 ${correctCount} 个，共 10 个。`;
            feedbackDisplay.className = correctCount > 5 ? 'correct' : 'incorrect'; 
            score += correctCount; 
            playSound('correct'); // Regular correct sound if not all 10, but some are right
        } else { // No correct answers
            feedbackDisplay.textContent = `完成了! 你答对了 ${correctCount} 个，共 10 个。`;
            feedbackDisplay.className = 'incorrect';
            // playSound('incorrect'); // Already played for each incorrect step, maybe not needed here
        }
        scoreDisplay.textContent = score;
        
        // Reveal all numbers in sequence display
        sequenceNumbersDisplay.childNodes.forEach((box, index) => {
            box.textContent = noteMapping[sequenceFullChallenge[index]].noteName;
        });
    }

    // ---------- EFFECTS ----------
    function triggerVictoryEffect(isGrandVictory = false) {
        if (typeof confetti === 'function') {
            // Basic confetti for any correct round completion
            confetti({
                particleCount: isGrandVictory ? 200 : 100,
                spread: isGrandVictory ? 90 : 70,
                origin: { y: 0.6 },
                angle: isGrandVictory ? Math.random() * 60 + 60 : Math.random() * 40 + 70, // more centered for grand
                scalar: isGrandVictory ? 1.2 : 1,
                drift: isGrandVictory ? (Math.random() > 0.5 ? 1 : -1) * 0.2 : 0,
                gravity: isGrandVictory ? 0.8 : 1,
                ticks: isGrandVictory ? 300 : 200,
                colors: ['#6a0dad', '#7e57c2', '#e1bee7', '#ffffff', '#f0e4f7']
            });

            if (isGrandVictory) {
                // More spread out for grand victory
                setTimeout(() => {
                    confetti({
                        particleCount: 100,
                        spread: 160,
                        origin: { y: 0.5 },
                        angle: Math.random() * 180,
                        scalar: 1.3,
                        drift: (Math.random() > 0.5 ? 1 : -1) * 0.3,
                        gravity: 0.7,
                        ticks: 400,
                        colors: ['#ffc107', '#ffeb3b', '#fff59d'] // Gold/yellow for grand
                    });
                }, 200);
            }
        }
    }

    // Initial setup when DOM is loaded
    function initializeGameView() {
        // Set classic mode as default active on page load
        classicModeButton.classList.add('active-mode');
        sequenceModeButton.classList.remove('active-mode');
        classicModeArea.classList.add('active');
        classicModeArea.classList.remove('inactive-stacked'); // Make sure it's not accidentally inactive
        sequenceModeArea.classList.remove('active'); // Ensure sequence starts inactive
        sequenceModeArea.classList.add('inactive-stacked'); // Stack it behind
    }

    initializeGameView(); // Call on DOMContentLoaded

});

// Minor correction in handleOptionClickSequence event listener, remove cardElement if not used
// In startGameSequence, for optionCard.addEventListener:
// optionCard.addEventListener('click', () => handleOptionClickSequence(noteDetail.noteName)); 
// The cardElement was passed but not defined in the lambda's scope.
// Let's assume it's not needed for sequence mode options based on the current logic.
// If disabling clicked options is needed for sequence mode, it can be added back.

// Minor correction in handleOptionClickClassic event listener, remove cardElement if not used
// In startGameClassic, for optionCard.addEventListener:
// optionCard.addEventListener('click', () => handleOptionClickClassic(noteDetail.noteName, optionCard)); 
// The cardElement was passed but not defined in the lambda's scope.
// Let's assume it's not needed for classic mode options based on the current logic.
// If disabling clicked options is needed for classic mode, it can be added back. 