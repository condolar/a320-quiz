// =======================
// Global state
// =======================

let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let score = 0;

let categoryStats = JSON.parse(localStorage.getItem("categoryStats")) || {};

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

const categorySelect = document.getElementById("categorySelect");
const categorySlider = document.getElementById("categorySlider");
const categoryCountLabel = document.getElementById("categoryCountLabel");
const categoryMaxLabel = document.getElementById("categoryMax");

const questionCountSelect = document.getElementById("questionCount");
const startExamBtn = document.getElementById("startExam");
const startCategoryBtn = document.getElementById("startCategory");

const performanceList = document.getElementById("performanceList");

// =======================
// Load questions
// =======================

fetch("questions.json")
  .then(res => res.json())
  .then(data => {
    allQuestions = data;

    const categories = [...new Set(data.map(q => q.category))].sort();
    categorySelect.innerHTML = `<option value="">Select category</option>`;

    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });

    renderPerformance();
  });

// =======================
// Exam mode
// =======================

startExamBtn.addEventListener("click", () => {
  const countValue = questionCountSelect.value;
  let shuffled = [...allQuestions].sort(() => Math.random() - 0.5);

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
  if (!cat) return;

  const total = allQuestions.filter(q => q.category === cat).length;
  categorySlider.max = total;
  categorySlider.value = total;
  categoryCountLabel.textContent = total;
  categoryMaxLabel.textContent = total;
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
  nextBtn.classList.add("hidden");
  optionsDiv.innerHTML = "";

  const q = quizQuestions[currentIndex];
  questionText.textContent = q.question;
  categoryLabel.textContent = q.category;
  progress.textContent = `Question ${currentIndex + 1} of ${quizQuestions.length}`;

  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => selectAnswer(btn, idx);
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

  // Update stats
  const cat = q.category;
  if (!categoryStats[cat]) {
    categoryStats[cat] = { attempts: 0, correct: 0 };
  }

  categoryStats[cat].attempts++;
  if (index === q.correctIndex) {
    categoryStats[cat].correct++;
    score++;
  } else {
    button.classList.add("incorrect");
  }

  localStorage.setItem("categoryStats", JSON.stringify(categoryStats));
  nextBtn.classList.remove("hidden");
}

nextBtn.addEventListener("click", () => {
  currentIndex++;
  currentIndex < quizQuestions.length ? showQuestion() : finishQuiz();
});

function finishQuiz() {
  quiz.classList.add("hidden");
  scoreScreen.classList.remove("hidden");
  finalScore.textContent = `You scored ${score} out of ${quizQuestions.length}`;
  renderPerformance();
}

// =======================
// Performance rendering
// =======================

function renderPerformance() {
  performanceList.innerHTML = "";

  const entries = Object.entries(categoryStats);
  if (entries.length === 0) {
    performanceList.innerHTML = `<p class="muted">No data yet — complete a quiz to see stats.</p>`;
    return;
  }

  entries.forEach(([cat, stats]) => {
    const percent = Math.round((stats.correct / stats.attempts) * 100);
    let cls = percent >= 75 ? "pass" : percent >= 60 ? "borderline" : "fail";

    const item = document.createElement("div");
    item.className = "performance-item";
    item.innerHTML = `
      <div class="performance-header">
        <span>${cat}</span>
        <span>${percent}%</span>
      </div>
      <div class="performance-bar">
        <div class="performance-fill ${cls}" style="width:${percent}%"></div>
      </div>
    `;
    performanceList.appendChild(item);
  });
}

// =======================
// Home / reset
// =======================

homeBtn.addEventListener("click", resetApp);

function resetApp() {
  startScreen.classList.remove("hidden");
  quiz.classList.add("hidden");
  scoreScreen.classList.add("hidden");
  homeBtn.classList.add("hidden");
}
