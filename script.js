// =======================
// Global state
// =======================

let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let score = 0;

// =======================
// DOM elements
// =======================

const startScreen = document.getElementById("startScreen");
const quiz = document.getElementById("quiz");
const scoreScreen = document.getElementById("scoreScreen");

const homeBtn = document.getElementById("homeBtn");

const questionText = document.getElementById("questionText");
const optionsDiv = document.getElementById("options");
const nextBtn = document.getElementById("nextBtn");
const progress = document.getElementById("progress");
const categoryLabel = document.getElementById("categoryLabel");
const finalScore = document.getElementById("finalScore");
const progressFill = document.getElementById("progressFill");

const categorySelect = document.getElementById("categorySelect");
const categorySlider = document.getElementById("categorySlider");
const categoryCountLabel = document.getElementById("categoryCountLabel");
const categoryMaxLabel = document.getElementById("categoryMax");

const questionCountSelect = document.getElementById("questionCount");
const startExamBtn = document.getElementById("startExam");
const startCategoryBtn = document.getElementById("startCategory");

// =======================
// Initial UI state
// =======================

startExamBtn.disabled = true;
startCategoryBtn.disabled = true;

// =======================
// Load questions
// =======================

fetch("./questions.json")
  .then(res => res.json())
  .then(data => {
    allQuestions = data;

    startExamBtn.disabled = false;

    const categories = [...new Set(data.map(q => q.category))].sort();
    categorySelect.innerHTML = `<option value="">Select category</option>`;

    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  })
  .catch(() => {
    alert("Failed to load questions.json");
  });

// =======================
// Exam mode
// =======================

startExamBtn.addEventListener("click", () => {
  const countValue = questionCountSelect.value;
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);

  quizQuestions =
    countValue === "all"
      ? shuffled
      : shuffled.slice(0, parseInt(countValue, 10));

  startQuiz();
});

// =======================
// Category mode setup
// =======================

categorySelect.addEventListener("change", () => {
  const cat = categorySelect.value;
  startCategoryBtn.disabled = true;

  if (!cat) return;

  const total = allQuestions.filter(q => q.category === cat).length;

  categorySlider.max = total;
  categorySlider.value = total;

  categoryCountLabel.textContent = total;
  categoryMaxLabel.textContent = total;

  startCategoryBtn.disabled = false;
});

categorySlider.addEventListener("input", () => {
  categoryCountLabel.textContent = categorySlider.value;
});

// =======================
// Start category quiz
// =======================

startCategoryBtn.addEventListener("click", () => {
  const cat = categorySelect.value;
  const count = parseInt(categorySlider.value, 10);

  if (!cat || count === 0) return;

  const pool = allQuestions.filter(q => q.category === cat);
  quizQuestions = pool.sort(() => Math.random() - 0.5).slice(0, count);

  startQuiz();
});

// =======================
// Quiz flow
// =======================

function startQuiz() {
  currentIndex = 0;
  score = 0;

  startScreen.classList.add("hidden");
  quiz.classList.remove("hidden");
  scoreScreen.classList.add("hidden");

  homeBtn.classList.remove("hidden");

  showQuestion();
}

function showQuestion() {
  const q = quizQuestions[currentIndex];
  if (!q) return finishQuiz();

  progressFill.style.width =
    `${((currentIndex + 1) / quizQuestions.length) * 100}%`;

  nextBtn.classList.add("hidden");
  optionsDiv.innerHTML = "";

  questionText.textContent = q.question;
  categoryLabel.textContent = q.category;
  progress.textContent = `Question ${currentIndex + 1} of ${quizQuestions.length}`;

  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.addEventListener("click", () => selectAnswer(btn, idx));
    optionsDiv.appendChild(btn);
  });
}

function selectAnswer(button, index) {
  const q = quizQuestions[currentIndex];
  const buttons = optionsDiv.querySelectorAll("button");

  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === q.correctIndex) btn.classList.add("correct");
  });

  if (index === q.correctIndex) {
    score++;
  } else {
    button.classList.add("incorrect");
  }

  nextBtn.classList.remove("hidden");
}

nextBtn.addEventListener("click", () => {
  currentIndex < quizQuestions.length - 1
    ? (currentIndex++, showQuestion())
    : finishQuiz();
});

function finishQuiz() {
  quiz.classList.add("hidden");
  scoreScreen.classList.remove("hidden");

  finalScore.textContent = `You scored ${score} out of ${quizQuestions.length}`;
}

// =======================
// Reset / Home
// =======================

function resetApp() {
  currentIndex = 0;
  score = 0;
  quizQuestions = [];

  quiz.classList.add("hidden");
  scoreScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");

  homeBtn.classList.add("hidden");
  progressFill.style.width = "0%";
}

homeBtn.addEventListener("click", resetApp);
