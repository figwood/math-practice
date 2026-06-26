const TOTAL_QUESTIONS = 20;

const setupScreen = document.querySelector("#setup-screen");
const quizScreen = document.querySelector("#quiz-screen");
const finishScreen = document.querySelector("#finish-screen");
const startButton = document.querySelector("#start-button");
const backButton = document.querySelector("#back-button");
const restartButton = document.querySelector("#restart-button");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer-input");
const questionText = document.querySelector("#question-text");
const progressText = document.querySelector("#progress-text");
const progressFill = document.querySelector("#progress-fill");
const feedback = document.querySelector("#feedback");

let questions = [];
let currentIndex = 0;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(items) {
  return items[randomInt(0, items.length - 1)];
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
  const category = document.querySelector('input[name="category"]:checked').value;
  questions = generateQuestions(category);
  currentIndex = 0;
  showScreen(quizScreen);
  renderQuestion();
}

function finishPractice() {
  progressFill.style.width = "100%";
  showScreen(finishScreen);
}

function submitAnswer(event) {
  event.preventDefault();

  const userAnswer = Number(answerInput.value);
  const rightAnswer = questions[currentIndex].answer;

  if (userAnswer !== rightAnswer) {
    feedback.textContent = "✗ 再想一想，重新答一次";
    feedback.className = "feedback wrong";
    answerInput.select();
    return;
  }

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
restartButton.addEventListener("click", () => showScreen(setupScreen));
backButton.addEventListener("click", () => showScreen(setupScreen));
answerForm.addEventListener("submit", submitAnswer);
