const TOTAL_QUESTIONS = 20;

const setupScreen = document.querySelector("#setup-screen");
const quizScreen = document.querySelector("#quiz-screen");
const finishScreen = document.querySelector("#finish-screen");
const startButton = document.querySelector("#start-button");
const backButton = document.querySelector("#back-button");
const restartButton = document.querySelector("#restart-button");
const soundButton = document.querySelector("#sound-button");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer-input");
const questionText = document.querySelector("#question-text");
const progressText = document.querySelector("#progress-text");
const progressFill = document.querySelector("#progress-fill");
const feedback = document.querySelector("#feedback");

let questions = [];
let currentIndex = 0;
let audioContext = null;
let backgroundMusicTimer = 0;
let backgroundMusicGain = null;
let soundEnabled = false;

const BACKGROUND_NOTES = [
  261.63, 329.63, 392, 329.63,
  293.66, 349.23, 440, 349.23,
  261.63, 329.63, 392, 523.25,
  440, 392, 329.63, 293.66,
];

const SUCCESS_NOTES = [523.25, 659.25, 783.99];
const WRONG_NOTES = [220, 185, 146.83];
const FINISH_NOTES = [392, 523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(items) {
  return items[randomInt(0, items.length - 1)];
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, startTime, duration, options = {}) {
  if (!soundEnabled) {
    return;
  }

  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const volume = options.volume ?? 0.12;

  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(options.destination ?? context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function playMelody(notes, options = {}) {
  const context = getAudioContext();
  const startTime = context.currentTime + (options.delay ?? 0);
  const noteDuration = options.noteDuration ?? 0.16;
  const gap = options.gap ?? 0.05;

  notes.forEach((frequency, index) => {
    playTone(frequency, startTime + index * (noteDuration + gap), noteDuration, options);
  });
}

function startBackgroundMusic() {
  soundEnabled = true;
  soundButton.setAttribute("aria-pressed", "true");
  soundButton.setAttribute("aria-label", "关闭背景音乐");
  const context = getAudioContext();

  if (backgroundMusicTimer) {
    return;
  }

  backgroundMusicGain = context.createGain();
  backgroundMusicGain.gain.value = 1.86;
  backgroundMusicGain.connect(context.destination);

  let noteIndex = 0;
  const playNextNote = () => {
    if (!backgroundMusicTimer || !backgroundMusicGain) {
      return;
    }

    const now = context.currentTime;
    const frequency = BACKGROUND_NOTES[noteIndex % BACKGROUND_NOTES.length];
    playTone(frequency, now, 0.32, {
      destination: backgroundMusicGain,
      type: noteIndex % 4 === 0 ? "triangle" : "sine",
      volume: 0.08,
    });
    noteIndex += 1;
  };

  backgroundMusicTimer = window.setInterval(playNextNote, 420);
  playNextNote();
}

function stopBackgroundMusic() {
  window.clearInterval(backgroundMusicTimer);
  backgroundMusicTimer = 0;

  if (backgroundMusicGain) {
    backgroundMusicGain.disconnect();
    backgroundMusicGain = null;
  }
}

function turnOffSound() {
  soundEnabled = false;
  soundButton.setAttribute("aria-pressed", "false");
  soundButton.setAttribute("aria-label", "开启背景音乐");
  stopBackgroundMusic();
}

function toggleSound() {
  if (soundEnabled) {
    turnOffSound();
    return;
  }

  startBackgroundMusic();
}

function playCorrectSound() {
  playMelody(SUCCESS_NOTES, { noteDuration: 0.12, gap: 0.035, type: "triangle", volume: 0.28 });
}

function playWrongSound() {
  playMelody(WRONG_NOTES, { noteDuration: 0.13, gap: 0.025, type: "square", volume: 0.2 });
}

function playFinishMusic() {
  stopBackgroundMusic();
  soundEnabled = true;
  soundButton.setAttribute("aria-pressed", "true");
  soundButton.setAttribute("aria-label", "关闭背景音乐");
  playMelody(FINISH_NOTES, { noteDuration: 0.2, gap: 0.045, type: "triangle", volume: 0.17 });
}

function makeAdditionQuestion() {
  const choices = [];

  for (let a = 1; a <= 19; a += 1) {
    for (let b = 1; b <= 20 - a; b += 1) {
      const needsCarry = (a % 10) + (b % 10) >= 10;
      const sum = a + b;

      if (sum > 10 && needsCarry) {
        choices.push({ a, b });
      }
    }
  }

  const { a, b } = pickRandom(choices);

  return {
    text: `${a} + ${b} = ?`,
    answer: a + b,
  };
}

function makeSubtractionQuestion() {
  const choices = [];

  for (let a = 11; a <= 20; a += 1) {
    for (let b = 1; b <= a; b += 1) {
      const needsBorrow = a % 10 < b % 10;

      if (needsBorrow) {
        choices.push({ a, b });
      }
    }
  }

  const { a, b } = pickRandom(choices);

  return {
    text: `${a} - ${b} = ?`,
    answer: a - b,
  };
}

function generateQuestions(category) {
  return Array.from({ length: TOTAL_QUESTIONS }, () => {
    return category === "subtract" ? makeSubtractionQuestion() : makeAdditionQuestion();
  });
}

function showScreen(screen) {
  setupScreen.classList.add("hidden");
  quizScreen.classList.add("hidden");
  finishScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function renderQuestion() {
  const question = questions[currentIndex];
  questionText.textContent = question.text;
  progressText.textContent = `第 ${currentIndex + 1} / ${TOTAL_QUESTIONS} 题`;
  progressFill.style.width = `${(currentIndex / TOTAL_QUESTIONS) * 100}%`;
  feedback.textContent = "";
  feedback.className = "feedback";
  answerInput.value = "";
  answerInput.focus();
}

function startPractice() {
  getAudioContext();
  startBackgroundMusic();
  const category = document.querySelector('input[name="category"]:checked').value;
  questions = generateQuestions(category);
  currentIndex = 0;
  showScreen(quizScreen);
  renderQuestion();
}

function finishPractice() {
  progressFill.style.width = "100%";
  showScreen(finishScreen);
  playFinishMusic();
}

function submitAnswer(event) {
  event.preventDefault();

  const userAnswer = Number(answerInput.value);
  const rightAnswer = questions[currentIndex].answer;

  if (userAnswer !== rightAnswer) {
    playWrongSound();
    feedback.textContent = "✗ 再想一想，重新答一次";
    feedback.className = "feedback wrong";
    answerInput.select();
    return;
  }

  playCorrectSound();
  feedback.textContent = "✓ 答对啦！";
  feedback.className = "feedback correct";

  window.setTimeout(() => {
    currentIndex += 1;

    if (currentIndex >= TOTAL_QUESTIONS) {
      finishPractice();
      return;
    }

    renderQuestion();
  }, 650);
}

startButton.addEventListener("click", startPractice);
soundButton.addEventListener("click", toggleSound);
restartButton.addEventListener("click", () => {
  turnOffSound();
  showScreen(setupScreen);
});
backButton.addEventListener("click", () => {
  turnOffSound();
  showScreen(setupScreen);
});
answerForm.addEventListener("submit", submitAnswer);
