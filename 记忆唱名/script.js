document.addEventListener('DOMContentLoaded', () => {
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

    let currentDifficulty = 3;
    let currentNumbers = [];
    let currentCorrectNoteNames = [];
    let userSelectedNoteNames = [];
    let score = 0;
    let gameStarted = false;

    startGameButton.addEventListener('click', () => {
        currentDifficulty = parseInt(difficultySelect.value);
        startGame();
    });

    checkAnswerButton.addEventListener('click', checkAnswer);
    nextLevelButton.addEventListener('click', startGame); // Next level just starts a new game with same difficulty

    function startGame() {
        gameStarted = true;
        userSelectedNoteNames = [];
        currentNumbers = [];
        currentCorrectNoteNames = [];
        feedbackDisplay.textContent = '';
        feedbackDisplay.className = '';
        selectedNotesDisplay.innerHTML = '';
        numbersDisplay.innerHTML = '';
        optionsDisplay.innerHTML = '';
        checkAnswerButton.style.display = 'inline-block';
        nextLevelButton.style.display = 'none';
        difficultySelect.disabled = true;
        startGameButton.disabled = true;

        // Generate random numbers
        const availableNumbers = Object.keys(noteMapping).map(n => parseInt(n));
        for (let i = 0; i < currentDifficulty; i++) {
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            const randomNumber = availableNumbers.splice(randomIndex, 1)[0];
            currentNumbers.push(randomNumber);
            currentCorrectNoteNames.push(noteMapping[randomNumber].noteName);
        }

        // Display numbers
        currentNumbers.forEach(num => {
            const numberCard = document.createElement('div');
            numberCard.classList.add('number-card');
            numberCard.textContent = num;
            numbersDisplay.appendChild(numberCard);
        });

        // Prepare and display options (note names and solfege)
        const allNoteDetails = Object.values(noteMapping); // [{ solfege: 'do', noteName: 'C' }, ...]
        
        // Shuffle options (shuffling the details themselves)
        const shuffledOptions = [...allNoteDetails].sort(() => Math.random() - 0.5);

        shuffledOptions.forEach(noteDetail => { // noteDetail is { solfege: '...', noteName: '...' }
            const optionCard = document.createElement('div');
            optionCard.classList.add('option-card');

            // Create internal structure for the card
            const noteNameSpan = document.createElement('span');
            noteNameSpan.classList.add('option-note-name');
            noteNameSpan.textContent = noteDetail.noteName;

            const solfegeSpan = document.createElement('span');
            solfegeSpan.classList.add('option-solfege');
            solfegeSpan.textContent = noteDetail.solfege;

            optionCard.appendChild(noteNameSpan);
            optionCard.appendChild(solfegeSpan);
            
            // Store the noteName for logic, as this is what's used for checking
            // The click handler will use noteDetail.noteName directly
            optionCard.addEventListener('click', () => handleOptionClick(noteDetail.noteName, optionCard));
            optionsDisplay.appendChild(optionCard);
        });
    }

    function handleOptionClick(selectedNoteName, cardElement) { // Renamed selectedName to selectedNoteName for clarity
        if (!gameStarted || userSelectedNoteNames.length >= currentDifficulty) return;

        userSelectedNoteNames.push(selectedNoteName); // Push the noteName 'C', 'D' etc.
        const selectedCard = document.createElement('div');
        selectedCard.classList.add('selected-card');
        
        // Display both in selected card as well for consistency
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
            selectedCard.textContent = selectedNoteName; // Fallback
        }
        
        selectedNotesDisplay.appendChild(selectedCard);
        
        cardElement.style.opacity = '0.5';
        cardElement.style.pointerEvents = 'none';

        // No need to enable check answer button here specifically, 
        // it's already visible and its click handler checks the length.
    }

    function checkAnswer() {
        if (userSelectedNoteNames.length !== currentDifficulty) return;

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
        } else {
            feedbackDisplay.textContent = '错误。正确的顺序是: ' + currentCorrectNoteNames.join(', ');
            feedbackDisplay.className = 'incorrect';
            // Optionally, reset score or implement a penalty
        }
        checkAnswerButton.style.display = 'none';
        difficultySelect.disabled = false;
        startGameButton.disabled = false;
        gameStarted = false; // Allow starting a new game or changing difficulty
        // Re-enable option cards for a new attempt if needed, or wait for 'Next Level' / 'Start Game'
        document.querySelectorAll('.option-card').forEach(card => {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        });
    }
}); 