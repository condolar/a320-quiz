// =======================
// Global state
// =======================

let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let score = 0;

let categoryStats =
  JSON.parse(localStorage.getItem("categoryStats")) || {};

let failedQuestions =
  JSON.parse(localStorage.getItem("failedQuestions")) || [];

// =======================
// DOM elements
// =======================

const startScreen = document.getElementById("startScreen");
const quiz = document.getElementById("quiz");
const scoreScreen = document.getElementById("scoreScreen");
const performanceScreen = document.getElementById("performanceScreen");

const homeBtn = document.getElementById("homeBtn");
const performanceBtn = document.getElementById("performanceBtn");

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
const retryFailedBtn = document.getElementById("retryFailed");

const performanceList = document.getElementById("performanceList");
const performanceSummary = document.getElementById("performanceSummary");
const resetPerformanceBtn = document.getElementById("resetPerformanceBtn");

// =======================
// Initial UI state
// =======================

startExamBtn.disabled = true;
startCategoryBtn.disabled = true;
retryFailedBtn.disabled = failedQuestions.length === 0;

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
// Retry failed questions
// =======================

retryFailedBtn.addEventListener("click", () => {
  if (failedQuestions.length === 0) return;

  quizQuestions = [...failedQuestions].sort(() => Math.random() - 0.5);
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
  performanceScreen.classList.add("hidden");
  scoreScreen.classList.add("hidden");
  quiz.classList.remove("hidden");

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
  progress.textContent =
    `Question ${currentIndex + 1} of ${quizQuestions.length}`;

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

  const cat = q.category;

  if (!categoryStats[cat]) {
    categoryStats[cat] = { attempts: 0, correct: 0 };
  }

  categoryStats[cat].attempts++;

  if (index === q.correctIndex) {
    categoryStats[cat].correct++;
    score++;

    // Remove from failed list
    failedQuestions = failedQuestions.filter(
      fq => fq.question !== q.question
    );
  } else {
    button.classList.add("incorrect");

    // Add to failed list if not already there
    if (!failedQuestions.find(fq => fq.question === q.question)) {
      failedQuestions.push(q);
    }
  }

  localStorage.setItem(
    "categoryStats",
    JSON.stringify(categoryStats)
  );

  localStorage.setItem(
    "failedQuestions",
    JSON.stringify(failedQuestions)
  );

  retryFailedBtn.disabled = failedQuestions.length === 0;

  setTimeout(() => {
    nextBtn.classList.remove("hidden");
  }, 600);
}

nextBtn.addEventListener("click", () => {
  currentIndex < quizQuestions.length - 1
    ? (currentIndex++, showQuestion())
    : finishQuiz();
});

function finishQuiz() {
  quiz.classList.add("hidden");
  scoreScreen.classList.remove("hidden");

  finalScore.textContent =
    `You scored ${score} out of ${quizQuestions.length}`;
}

// =======================
// Performance screen
// =======================

// Reset performance stats (keeps failed question list)
if (resetPerformanceBtn) {
  resetPerformanceBtn.addEventListener("click", () => {
    const ok = confirm(
      "Reset category performance stats? This will clear your category performance percentages."
    );
    if (!ok) return;

    categoryStats = {};
    localStorage.removeItem("categoryStats");
    renderPerformance();
  });
}

performanceBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  quiz.classList.add("hidden");
  scoreScreen.classList.add("hidden");

  performanceScreen.classList.remove("hidden");
  homeBtn.classList.remove("hidden");

  renderPerformance();
});

function renderPerformance() {
  performanceList.innerHTML = "";

  const entries = Object.entries(categoryStats);

  // Summary
  if (entries.length === 0) {
    if (performanceSummary) {
      performanceSummary.classList.add("hidden");
      performanceSummary.innerHTML = "";
    }
    performanceList.innerHTML =
      `<p class="muted">No data yet. Complete a quiz to see performance.</p>`;
    return;
  }

  const totals = entries.reduce(
    (acc, [, s]) => {
      acc.attempts += s.attempts || 0;
      acc.correct += s.correct || 0;
      return acc;
    },
    { attempts: 0, correct: 0 }
  );

  const overallPct = totals.attempts
    ? Math.round((totals.correct / totals.attempts) * 100)
    : 0;

  if (performanceSummary) {
    performanceSummary.classList.remove("hidden");
    performanceSummary.innerHTML = `
    <div class="summary-row">
      <div>
        <div class="summary-title">Overall</div>
        <div class="summary-meta">${totals.correct}/${totals.attempts} correct</div>
      </div>
      <div class="summary-score">${overallPct}%</div>
    </div>
    <div class="performance-bar summary-bar">
      <div class="performance-fill ${overallPct >= 80 ? "pass" : overallPct >= 60 ? "borderline" : "fail"}"
           style="width: ${overallPct}%"></div>
    </div>
  `;
  }

  // Per-category rows
  entries
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([category, stats]) => {
      const percent = stats.attempts
        ? Math.round((stats.correct / stats.attempts) * 100)
        : 0;

      let status = "fail";
      if (percent >= 80) status = "pass";
      else if (percent >= 60) status = "borderline";

      const item = document.createElement("div");
      item.className = "performance-item";

      item.innerHTML = `
        <div class="performance-row">
          <div class="performance-left">
            <span class="category-pill">${category}</span>
            <div class="performance-meta muted">${stats.correct}/${stats.attempts} correct</div>
          </div>
          <div class="performance-score">${percent}%</div>
        </div>
        <div class="performance-bar">
          <div class="performance-fill ${status}"
               style="width: ${percent}%"></div>
        </div>
      `;

      performanceList.appendChild(item);
    });
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
  performanceScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");

  homeBtn.classList.add("hidden");
  progressFill.style.width = "0%";

  retryFailedBtn.disabled = failedQuestions.length === 0;
}

homeBtn.addEventListener("click", resetApp);
