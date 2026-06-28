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
const questionLabel = document.querySelector(".question-label");
const questionText = document.querySelector("#question-text");
const formulaHint = document.querySelector("#formula-hint");
const progressText = document.querySelector("#progress-text");
const progressFill = document.querySelector("#progress-fill");
const feedback = document.querySelector("#feedback");
const timerText = document.querySelector("#timer-text");
const elapsedTimeText = document.querySelector("#elapsed-time");
const choiceArea = document.querySelector("#choice-area");
const choiceButtons = document.querySelectorAll(".choice-button");

let questions = [];
let currentIndex = 0;
let audioContext = null;
let backgroundMusicTimer = 0;
let backgroundMusicGain = null;
let backgroundStep = 0;
let soundEnabled = false;
let userMutedSound = false;
let practiceStartTime = 0;
let practiceTimer = 0;

const BACKGROUND_PATTERN = [
  { bass: 130.81, chord: [261.63, 329.63, 392], melody: [659.25, null, 783.99, null] },
  { bass: 196, chord: [246.94, 392, 493.88], melody: [587.33, null, 659.25, null] },
  { bass: 174.61, chord: [261.63, 349.23, 440], melody: [698.46, null, 783.99, null] },
  { bass: 196, chord: [293.66, 392, 493.88], melody: [659.25, null, 587.33, null] },
  { bass: 146.83, chord: [293.66, 349.23, 440], melody: [587.33, null, 698.46, null] },
  { bass: 164.81, chord: [329.63, 392, 493.88], melody: [659.25, null, 783.99, null] },
  { bass: 174.61, chord: [261.63, 349.23, 523.25], melody: [880, null, 783.99, null] },
  { bass: 196, chord: [293.66, 392, 523.25], melody: [698.46, null, 587.33, null] },
  { bass: 130.81, chord: [261.63, 329.63, 392], melody: [523.25, null, 659.25, null] },
  { bass: 164.81, chord: [329.63, 392, 493.88], melody: [783.99, null, 659.25, null] },
  { bass: 174.61, chord: [349.23, 440, 523.25], melody: [880, null, 783.99, null] },
  { bass: 196, chord: [392, 493.88, 587.33], melody: [698.46, null, 659.25, null] },
];
const BACKGROUND_SPARKLES = [783.99, 880, 987.77, 1046.5];

const SUCCESS_NOTES = [523.25, 659.25, 783.99];
const WRONG_NOTES = [220, 185, 146.83];
const FINISH_LEAD = [
  523.25, 659.25, 783.99, 1046.5,
  987.77, 783.99, 880, 1174.66,
  1046.5, 1318.51, 1567.98,
];
const FINISH_CHORDS = [
  [261.63, 329.63, 392],
  [349.23, 440, 523.25],
  [392, 493.88, 587.33],
  [523.25, 659.25, 783.99],
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(items) {
  return items[randomInt(0, items.length - 1)];
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
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

function playNoise(startTime, duration, options = {}) {
  if (!soundEnabled) {
    return;
  }

  const context = getAudioContext();
  const sampleCount = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const output = buffer.getChannelData(0);
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  for (let index = 0; index < sampleCount; index += 1) {
    output[index] = Math.random() * 2 - 1;
  }

  filter.type = options.filterType ?? "highpass";
  filter.frequency.value = options.frequency ?? 2400;
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(options.volume ?? 0.05, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(options.destination ?? context.destination);
  source.start(startTime);
  source.stop(startTime + duration);
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

function playChord(notes, startTime, duration, options = {}) {
  notes.forEach((frequency) => {
    playTone(frequency, startTime, duration, options);
  });
}

function playBackgroundStep() {
  if (!backgroundMusicTimer || !backgroundMusicGain) {
    return;
  }

  const context = getAudioContext();
  const now = context.currentTime;
  const barIndex = Math.floor(backgroundStep / 4) % BACKGROUND_PATTERN.length;
  const beatIndex = backgroundStep % 4;
  const pattern = BACKGROUND_PATTERN[barIndex];
  const melodyNote = pattern.melody[beatIndex];

  if (beatIndex === 0 || beatIndex === 2) {
    playTone(beatIndex === 0 ? pattern.bass : pattern.bass * 1.5, now, 0.42, {
      destination: backgroundMusicGain,
      type: "triangle",
      volume: beatIndex === 0 ? 0.052 : 0.026,
    });
  }

  if (beatIndex === 0) {
    playChord(pattern.chord, now + 0.04, 1.1, {
      destination: backgroundMusicGain,
      type: "sine",
      volume: 0.03,
    });
  }

  if (melodyNote) {
    playTone(melodyNote, now + 0.08, 0.42, {
      destination: backgroundMusicGain,
      type: "triangle",
      volume: 0.045,
    });
  }

  if (beatIndex === 1) {
    const arpeggioNote = pattern.chord[(barIndex + 1) % pattern.chord.length] * 2;
    playTone(arpeggioNote, now + 0.18, 0.28, {
      destination: backgroundMusicGain,
      type: "sine",
      volume: 0.018,
    });
  }

  if (beatIndex === 3 && barIndex % 4 === 3) {
    playTone(pickRandom(BACKGROUND_SPARKLES), now + 0.22, 0.24, {
      destination: backgroundMusicGain,
      type: "sine",
      volume: 0.022,
    });
  }

  if (beatIndex === 2 && barIndex % 2 === 0) {
    playNoise(now + 0.04, 0.08, {
      destination: backgroundMusicGain,
      frequency: 3800,
      volume: 0.012,
    });
  }

  backgroundStep += 1;
}

function startBackgroundMusic() {
  if (userMutedSound) {
    return;
  }

  soundEnabled = true;
  soundButton.setAttribute("aria-pressed", "true");
  soundButton.setAttribute("aria-label", "关闭背景音乐");
  const context = getAudioContext();

  if (backgroundMusicTimer) {
    return;
  }

  backgroundMusicGain = context.createGain();
  backgroundMusicGain.gain.value = 1.35;
  backgroundMusicGain.connect(context.destination);
  backgroundStep = 0;

  backgroundMusicTimer = window.setInterval(playBackgroundStep, 620);
  playBackgroundStep();
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
    userMutedSound = true;
    turnOffSound();
    return;
  }

  userMutedSound = false;
  startBackgroundMusic();
}

function unlockBackgroundMusic() {
  if (!soundEnabled || userMutedSound || !audioContext || audioContext.state !== "suspended") {
    return;
  }

  audioContext.resume().catch(() => {});
}

function playCorrectSound() {
  playMelody(SUCCESS_NOTES, { noteDuration: 0.11, gap: 0.03, type: "triangle", volume: 0.2 });
}

function playWrongSound() {
  playMelody(WRONG_NOTES, { noteDuration: 0.13, gap: 0.025, type: "square", volume: 0.14 });
}

function playFinishMusic() {
  const shouldCelebrateWithSound = soundEnabled;

  stopBackgroundMusic();

  if (!shouldCelebrateWithSound) {
    return;
  }

  const context = getAudioContext();
  const startTime = context.currentTime + 0.04;
  playMelody(FINISH_LEAD, { noteDuration: 0.18, gap: 0.035, type: "triangle", volume: 0.18 });

  FINISH_CHORDS.forEach((chord, index) => {
    const chordTime = startTime + index * 0.42;
    playChord(chord, chordTime, 0.38, { type: "sine", volume: 0.07 });
    playTone(chord[0] / 2, chordTime, 0.2, { type: "triangle", volume: 0.12 });
  });

  [0.02, 0.36, 0.72, 1.08, 1.44].forEach((delay) => {
    playNoise(startTime + delay, 0.08, { frequency: 6500, volume: 0.05 });
  });
}

function makeAdditionQuestion() {
  const choices = [];

  for (let a = 1; a <= 19; a += 1) {
    for (let b = 1; b <= 20 - a; b += 1) {
      const needsCarry = (a % 10) + (b % 10) >= 10;
      const sum = a + b;

      if (sum > 10 && needsCarry) {
        const weight = a < 10 && b < 10 ? 5 : 1;

        for (let index = 0; index < weight; index += 1) {
          choices.push({ a, b });
        }
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

function makeMixedOperationQuestion() {
  const target = pickRandom([
    "addend",
    "addend",
    "addend",
    "subtrahend",
    "subtrahend",
    "subtrahend",
    "minuend",
    "minuend",
    "minuend",
    "sum",
    "difference",
  ]);

  if (target === "addend" || target === "sum") {
    const addendA = randomInt(1, 19);
    const addendB = randomInt(1, 20 - addendA);
    const sum = addendA + addendB;

    if (target === "sum") {
      return {
        text: `${addendA} + ${addendB} = ?`,
        answer: sum,
        formula: "和 = 加数 + 加数",
      };
    }

    return Math.random() < 0.5
      ? {
          text: `? + ${addendB} = ${sum}`,
          answer: addendA,
          formula: "加数 = 和 - 加数",
        }
      : {
          text: `${addendA} + ? = ${sum}`,
          answer: addendB,
          formula: "加数 = 和 - 加数",
        };
  }

  const minuend = randomInt(1, 20);
  const subtrahend = randomInt(1, minuend);
  const difference = minuend - subtrahend;

  if (target === "minuend") {
    return {
      text: `? - ${subtrahend} = ${difference}`,
      answer: minuend,
      formula: "被减数 = 减数 + 差",
    };
  }

  if (target === "subtrahend") {
    return {
      text: `${minuend} - ? = ${difference}`,
      answer: subtrahend,
      formula: "减数 = 被减数 - 差",
    };
  }

  return {
    text: `${minuend} - ${subtrahend} = ?`,
    answer: difference,
    formula: "差 = 被减数 - 减数",
  };
}

function makeMultiplyDivideQuestion() {
  const factorA = randomInt(1, 9);
  const factorB = randomInt(1, 9);
  const product = factorA * factorB;
  const target = pickRandom([
    "factor",
    "factor",
    "factor",
    "factor",
    "factor",
    "dividend",
    "dividend",
    "divisor",
    "divisor",
    "product",
    "quotient",
  ]);

  if (target === "product") {
    return {
      text: `${factorA} × ${factorB} = ?`,
      answer: product,
      formula: "积 = 乘数 × 乘数",
    };
  }

  if (target === "factor") {
    return Math.random() < 0.5
      ? {
          text: `? × ${factorB} = ${product}`,
          answer: factorA,
          formula: "乘数 = 积 ÷ 乘数",
        }
      : {
          text: `${factorA} × ? = ${product}`,
          answer: factorB,
          formula: "乘数 = 积 ÷ 乘数",
        };
  }

  if (target === "dividend") {
    return {
      text: `? ÷ ${factorB} = ${factorA}`,
      answer: product,
      formula: "被除数 = 除数 × 商",
    };
  }

  if (target === "divisor") {
    return {
      text: `${product} ÷ ? = ${factorA}`,
      answer: factorB,
      formula: "除数 = 被除数 ÷ 商",
    };
  }

  return Math.random() < 0.5
    ? {
        text: `${product} ÷ ${factorB} = ?`,
        answer: factorA,
        formula: "商 = 被除数 ÷ 除数",
      }
    : {
        text: `${product} ÷ ${factorA} = ?`,
        answer: factorB,
        formula: "商 = 被除数 ÷ 除数",
      };
}

function numberFromDigits(digits) {
  return Number(digits.join(""));
}

function makeCompareQuestion(kind) {
  if (kind === "different-length") {
    const shortLength = randomInt(1, 3);
    const longLength = randomInt(shortLength + 1, 4);
    const shortNumber = randomInt(10 ** (shortLength - 1), 10 ** shortLength - 1);
    const longNumber = randomInt(10 ** (longLength - 1), 10 ** longLength - 1);
    const [left, right] = Math.random() < 0.5 ? [shortNumber, longNumber] : [longNumber, shortNumber];

    return makeCompareQuestionFromNumbers(left, right);
  }

  if (kind === "equal") {
    const number = randomInt(1, 9999);
    return makeCompareQuestionFromNumbers(number, number);
  }

  const differentDigitIndexByKind = {
    first: 0,
    second: 1,
    third: 2,
    fourth: 3,
  };
  const differentDigitIndex = differentDigitIndexByKind[kind];
  const length = Math.max(2, differentDigitIndex + 1, randomInt(differentDigitIndex + 1, 4));
  const leftDigits = Array.from({ length }, (_, index) => {
    return index === 0 ? randomInt(1, 9) : randomInt(0, 9);
  });
  const rightDigits = [...leftDigits];
  let nextDigit = leftDigits[differentDigitIndex];

  while (nextDigit === leftDigits[differentDigitIndex]) {
    nextDigit = differentDigitIndex === 0 ? randomInt(1, 9) : randomInt(0, 9);
  }

  rightDigits[differentDigitIndex] = nextDigit;

  for (let index = differentDigitIndex + 1; index < length; index += 1) {
    rightDigits[index] = randomInt(0, 9);
  }

  return makeCompareQuestionFromNumbers(numberFromDigits(leftDigits), numberFromDigits(rightDigits));
}

function makeCompareQuestionFromNumbers(left, right) {
  return {
    text: `${left} ○ ${right}`,
    answer: left > right ? ">" : left < right ? "<" : "=",
    type: "choice",
  };
}

function generateCompareQuestions() {
  const nonEqualKinds = ["different-length", "first", "second", "third", "fourth"];
  const equalQuestionCount = Math.max(1, Math.round(TOTAL_QUESTIONS * 0.1));
  const kinds = Array.from({ length: TOTAL_QUESTIONS }, (_, index) => {
    return index < equalQuestionCount ? "equal" : nonEqualKinds[index % nonEqualKinds.length];
  });

  shuffle(kinds);

  return kinds.map((kind) => makeCompareQuestion(kind));
}

function generateQuestions(category) {
  if (category === "compare") {
    return generateCompareQuestions();
  }

  if (category === "mixed") {
    return Array.from({ length: TOTAL_QUESTIONS }, makeMixedOperationQuestion);
  }

  if (category === "multiply-divide") {
    return Array.from({ length: TOTAL_QUESTIONS }, makeMultiplyDivideQuestion);
  }

  return Array.from({ length: TOTAL_QUESTIONS }, () => {
    return category === "subtract" ? makeSubtractionQuestion() : makeAdditionQuestion();
  });
}

function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds} 秒`;
  }

  return `${minutes} 分 ${seconds} 秒`;
}

function renderTimer() {
  timerText.textContent = `用时：${formatElapsedTime(Date.now() - practiceStartTime)}`;
}

function startPracticeTimer() {
  window.clearInterval(practiceTimer);
  renderTimer();
  practiceTimer = window.setInterval(renderTimer, 1000);
}

function stopPracticeTimer() {
  window.clearInterval(practiceTimer);
  practiceTimer = 0;
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
  formulaHint.textContent = question.formula ?? "";
  formulaHint.classList.toggle("hidden", !question.formula);
  progressText.textContent = `第 ${currentIndex + 1} / ${TOTAL_QUESTIONS} 题`;
  progressFill.style.width = `${(currentIndex / TOTAL_QUESTIONS) * 100}%`;
  feedback.textContent = "";
  feedback.className = "feedback";

  if (question.type === "choice") {
    questionLabel.textContent = "请选择";
    answerForm.classList.add("hidden");
    choiceArea.classList.remove("hidden");
    choiceButtons[0].focus();
    return;
  }

  questionLabel.textContent = "请回答";
  choiceArea.classList.add("hidden");
  answerForm.classList.remove("hidden");
  answerInput.value = "";
  answerInput.focus();
}

function startPractice() {
  userMutedSound = false;
  getAudioContext();
  startBackgroundMusic();
  const category = document.querySelector('input[name="category"]:checked').value;
  questions = generateQuestions(category);
  currentIndex = 0;
  practiceStartTime = Date.now();
  startPracticeTimer();
  showScreen(quizScreen);
  renderQuestion();
}

function finishPractice() {
  progressFill.style.width = "100%";
  stopPracticeTimer();
  elapsedTimeText.textContent = `本次用时：${formatElapsedTime(Date.now() - practiceStartTime)}`;
  showScreen(finishScreen);
  playFinishMusic();
}

function checkAnswer(userAnswer) {
  const rightAnswer = questions[currentIndex].answer;

  if (userAnswer !== rightAnswer) {
    playWrongSound();
    feedback.textContent = "✗ 再想一想，重新答一次";
    feedback.className = "feedback wrong";

    if (questions[currentIndex].type === "choice") {
      choiceButtons[0].focus();
    } else {
      answerInput.select();
    }

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

function submitAnswer(event) {
  event.preventDefault();
  checkAnswer(Number(answerInput.value));
}

startButton.addEventListener("click", startPractice);
soundButton.addEventListener("click", toggleSound);
restartButton.addEventListener("click", () => {
  stopPracticeTimer();
  showScreen(setupScreen);
  userMutedSound = false;
  startBackgroundMusic();
});
backButton.addEventListener("click", () => {
  stopPracticeTimer();
  showScreen(setupScreen);
  userMutedSound = false;
  startBackgroundMusic();
});
answerForm.addEventListener("submit", submitAnswer);
choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    checkAnswer(button.dataset.answer);
  });
});
document.addEventListener("pointerdown", unlockBackgroundMusic, { passive: true });
document.addEventListener("keydown", unlockBackgroundMusic);
startBackgroundMusic();
