// =======================
// A320 Question Trainer — script.js
// Mastery-based performance (fixed denominators) + completion indicators
// + practice UNSEEN questions per selected category (separate section, no slider)
// + RANDOMISED answer option order (per question display)
// =======================

// -----------------------
// Storage helpers
// -----------------------
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getQuestionId(q) {
  // Stable key for "denominator integrity"
  if (q && q.reference) return String(q.reference);

  // Deterministic fallback if references are missing
  const cat = q && q.category ? String(q.category) : "UNCAT";
  const text = q && q.question ? String(q.question) : "NOQUESTION";
  return `${cat}::${text}`;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// -----------------------
// Global state
// -----------------------
let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let score = 0;

// Mastery tracking:
// performanceStats[category][questionId] = { correct: boolean }
let performanceStats = loadJSON("performanceStats", {});

// Seen tracking (for unseen practice):
// seenStats[category][questionId] = true
let seenStats = loadJSON("seenStats", {});

// Failed questions list:
let failedQuestions = loadJSON("failedQuestions", []);

// Current shuffled options for the question being displayed
let currentOptionOrder = []; // array of { text: string, isCorrect: boolean }

// -----------------------
// DOM
// -----------------------
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
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const resultEmoji = document.getElementById("resultEmoji");
const scorePercent = document.getElementById("scorePercent");
const scoreMeterFill = document.getElementById("scoreMeterFill");
const progressFill = document.getElementById("progressFill");
const confetti = document.getElementById("confetti");

const categorySelect = document.getElementById("categorySelect");
const categorySlider = document.getElementById("categorySlider");
const categoryCountLabel = document.getElementById("categoryCountLabel");
const categoryMaxLabel = document.getElementById("categoryMax");

const questionCountSelect = document.getElementById("questionCount");
const startExamBtn = document.getElementById("startExam");
const startCategoryBtn = document.getElementById("startCategory");
const retryFailedBtn = document.getElementById("retryFailed");

// Separate "Unseen Questions by Category" section in HTML
const unseenCategorySelect = document.getElementById("unseenCategorySelect");
const practiceUnseenCategoryBtn = document.getElementById("practiceUnseenCategory");

const performanceList = document.getElementById("performanceList");
const performanceSummary = document.getElementById("performanceSummary");
const resetPerformanceBtn = document.getElementById("resetPerformanceBtn");

// -----------------------
// Initial UI state
// -----------------------
if (startExamBtn) startExamBtn.disabled = true;
if (startCategoryBtn) startCategoryBtn.disabled = true;
if (retryFailedBtn) retryFailedBtn.disabled = failedQuestions.length === 0;
if (practiceUnseenCategoryBtn) practiceUnseenCategoryBtn.disabled = true;

// -----------------------
// Load questions.json
// -----------------------
fetch("./questions.json")
  .then(res => res.json())
  .then(data => {
    allQuestions = data;

    if (startExamBtn) startExamBtn.disabled = false;

    // Populate category dropdowns
    const categories = [...new Set(data.map(q => q.category))].sort();

    if (categorySelect) {
      categorySelect.innerHTML = `<option value="">Select category</option>`;
      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
      });
    }

    if (unseenCategorySelect) {
      unseenCategorySelect.innerHTML = `<option value="">Select category</option>`;
      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        unseenCategorySelect.appendChild(opt);
      });
    }

    // If Performance is open already, render now
    if (performanceScreen && !performanceScreen.classList.contains("hidden")) {
      renderPerformance();
    }

    // Ensure unseen section button state is correct after initial load
    updateUnseenSectionUI();
  })
  .catch(() => alert("Failed to load questions.json"));

// -----------------------
// Home: Randomised Mock Test
// -----------------------
if (startExamBtn) {
  startExamBtn.addEventListener("click", () => {
    const countValue = questionCountSelect ? questionCountSelect.value : "10";
    const shuffled = shuffle(allQuestions);

    quizQuestions =
      countValue === "all" ? shuffled : shuffled.slice(0, parseInt(countValue, 10));

    startQuiz();
  });
}

// -----------------------
// Home: Retry Failed Questions
// -----------------------
if (retryFailedBtn) {
  retryFailedBtn.addEventListener("click", () => {
    failedQuestions = loadJSON("failedQuestions", []);
    if (failedQuestions.length === 0) return;

    quizQuestions = shuffle(failedQuestions);
    startQuiz();
  });
}

// -----------------------
// Unseen pool helpers
// -----------------------
function getUnseenPoolForCategory(category) {
  // Re-hydrate latest
  seenStats = loadJSON("seenStats", {});
  return allQuestions.filter(q => {
    if (q.category !== category) return false;
    const id = getQuestionId(q);
    return !(seenStats[category] && seenStats[category][id] === true);
  });
}

// -----------------------
// Category: slider section (All Questions by Category)
// -----------------------
function updateCategoryUI(cat) {
  if (!cat) {
    if (startCategoryBtn) startCategoryBtn.disabled = true;
    return;
  }

  const total = allQuestions.filter(q => q.category === cat).length;

  if (categorySlider) {
    categorySlider.max = total;
    categorySlider.value = total;
  }
  if (categoryCountLabel) categoryCountLabel.textContent = total;
  if (categoryMaxLabel) categoryMaxLabel.textContent = total;
  if (startCategoryBtn) startCategoryBtn.disabled = false;
}

if (categorySelect) {
  categorySelect.addEventListener("change", () => {
    updateCategoryUI(categorySelect.value);
  });
}

if (categorySlider) {
  categorySlider.addEventListener("input", () => {
    if (categoryCountLabel) categoryCountLabel.textContent = categorySlider.value;
  });
}

// -----------------------
// Category: Start Category Quiz (uses slider)
// -----------------------
if (startCategoryBtn) {
  startCategoryBtn.addEventListener("click", () => {
    const cat = categorySelect ? categorySelect.value : "";
    const count = categorySlider ? parseInt(categorySlider.value, 10) : 0;
    if (!cat || !count) return;

    const pool = allQuestions.filter(q => q.category === cat);
    quizQuestions = shuffle(pool).slice(0, count);

    startQuiz();
  });
}

// -----------------------
// Unseen section: enable/disable button on selection
// -----------------------
function updateUnseenSectionUI() {
  if (!practiceUnseenCategoryBtn) return;

  const cat = unseenCategorySelect ? unseenCategorySelect.value : "";
  if (!cat) {
    practiceUnseenCategoryBtn.disabled = true;
    practiceUnseenCategoryBtn.textContent = "Practice Unseen";
    return;
  }

  const unseenPool = getUnseenPoolForCategory(cat);
  practiceUnseenCategoryBtn.disabled = unseenPool.length === 0;

  // Optional: count in button text
  practiceUnseenCategoryBtn.textContent =
    unseenPool.length === 0 ? "Practice Unseen" : `Practice Unseen (${unseenPool.length})`;
}

if (unseenCategorySelect) {
  unseenCategorySelect.addEventListener("change", updateUnseenSectionUI);
}

// -----------------------
// Unseen section: Practice Unseen (This Category) — NO slider
// -----------------------
if (practiceUnseenCategoryBtn) {
  practiceUnseenCategoryBtn.addEventListener("click", () => {
    const cat = unseenCategorySelect ? unseenCategorySelect.value : "";
    if (!cat) return;

    const unseenPool = getUnseenPoolForCategory(cat);
    if (unseenPool.length === 0) {
      alert("No unseen questions left in this category.");
      updateUnseenSectionUI();
      return;
    }

    // Take ALL unseen for the category (no slider in this section)
    quizQuestions = shuffle(unseenPool);
    startQuiz();
  });
}

// -----------------------
// Quiz flow
// -----------------------
function startQuiz() {
  currentIndex = 0;
  score = 0;

  if (startScreen) startScreen.classList.add("hidden");
  if (performanceScreen) performanceScreen.classList.add("hidden");
  if (scoreScreen) scoreScreen.classList.add("hidden");
  if (quiz) quiz.classList.remove("hidden");

  if (homeBtn) homeBtn.classList.remove("hidden");

  showQuestion();
}

function markSeen(q) {
  const cat = q.category || "Uncategorised";
  const id = getQuestionId(q);

  seenStats = loadJSON("seenStats", {});
  if (!seenStats[cat]) seenStats[cat] = {};

  if (seenStats[cat][id] !== true) {
    seenStats[cat][id] = true;
    saveJSON("seenStats", seenStats);
  }
}

function showQuestion() {
  const q = quizQuestions[currentIndex];
  if (!q) return finishQuiz();

  // Mark as seen immediately on display
  markSeen(q);

  // Progress
  if (progressFill) {
    progressFill.style.width = `${((currentIndex + 1) / quizQuestions.length) * 100}%`;
  }

  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.textContent = currentIndex < quizQuestions.length - 1 ? "Next" : "Finish";
  }

  // Reset UI
  if (optionsDiv) optionsDiv.innerHTML = "";
  if (questionText) questionText.textContent = q.question || "";
  if (categoryLabel) categoryLabel.textContent = q.category || "";
  if (progress) progress.textContent = `Question ${currentIndex + 1} of ${quizQuestions.length}`;

  // Build + shuffle options while preserving correct answer identity
  currentOptionOrder = (q.options || []).map((text, idx) => ({
    text,
    isCorrect: idx === q.correctIndex
  }));
  currentOptionOrder = shuffle(currentOptionOrder);

  currentOptionOrder.forEach(optObj => {
    const btn = document.createElement("button");
    btn.textContent = optObj.text;
    btn.dataset.correct = optObj.isCorrect ? "1" : "0";
    btn.addEventListener("click", () => selectAnswer(btn));
    optionsDiv.appendChild(btn);
  });

  // Keep unseen section button state accurate while user progresses
  updateUnseenSectionUI();
}

function selectAnswer(clickedBtn) {
  const q = quizQuestions[currentIndex];
  const buttons = optionsDiv ? optionsDiv.querySelectorAll("button") : [];

  // Lock answers + reveal correct
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === "1") btn.classList.add("correct");
  });

  // Re-hydrate latest storage (prevents stale state bugs)
  performanceStats = loadJSON("performanceStats", {});
  failedQuestions = loadJSON("failedQuestions", []);

  const cat = q.category || "Uncategorised";
  const id = getQuestionId(q);

  if (!performanceStats[cat]) performanceStats[cat] = {};
  if (!performanceStats[cat][id]) performanceStats[cat][id] = { correct: false };

  const isCorrect = clickedBtn && clickedBtn.dataset.correct === "1";

  if (isCorrect) {
    // Mastery: once correct, stays correct
    performanceStats[cat][id].correct = true;
    score++;

    // Remove from failed list
    failedQuestions = failedQuestions.filter(fq => getQuestionId(fq) !== id);
  } else {
    if (clickedBtn) clickedBtn.classList.add("incorrect");

    // Add to failed list if not already there
    if (!failedQuestions.find(fq => getQuestionId(fq) === id)) {
      failedQuestions.push(q);
    }
  }

  saveJSON("performanceStats", performanceStats);
  saveJSON("failedQuestions", failedQuestions);

  if (retryFailedBtn) retryFailedBtn.disabled = failedQuestions.length === 0;
  if (nextBtn) nextBtn.disabled = false;

  // Keep unseen section button state accurate
  updateUnseenSectionUI();
}

if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    if (currentIndex < quizQuestions.length - 1) {
      currentIndex++;
      showQuestion();
    } else {
      finishQuiz();
    }
  });
}

function finishQuiz() {
  if (quiz) quiz.classList.add("hidden");
  if (scoreScreen) scoreScreen.classList.remove("hidden");

  const total = quizQuestions.length || 0;
  const pct = total ? Math.round((score / total) * 100) : 0;

  const tier = pct === 100 ? "perfect" : pct >= 75 ? "pass" : pct >= 60 ? "near" : "fail";

    // Apply tier styling (restores score screen outline + meter colour)
  if (scoreScreen) {
  scoreScreen.classList.remove("score-perfect", "score-pass", "score-near", "score-fail");
  scoreScreen.classList.add(
    tier === "perfect" ? "score-perfect" :
    tier === "pass" ? "score-pass" :
    tier === "near" ? "score-near" :
    "score-fail"
  );
}



  if (finalScore) finalScore.textContent = `You scored ${score} out of ${total}`;
  if (scorePercent) scorePercent.textContent = `${pct}%`;
  if (scoreMeterFill) scoreMeterFill.style.width = `${pct}%`;

  if (tier === "perfect") {
  if (resultTitle) resultTitle.textContent = "Perfect — 100%!";
  if (resultMessage) resultMessage.textContent = "Category mastery just got easier. Keep going.";
  if (resultEmoji) resultEmoji.textContent = "🏆";
  launchConfetti();
} else if (tier === "pass") {
  if (resultTitle) resultTitle.textContent = "Well done — you passed!";
  if (resultMessage) resultMessage.textContent = "Strong result. Push for 100% next run.";
  if (resultEmoji) resultEmoji.textContent = "✅";
} else if (tier === "near") {
  if (resultTitle) resultTitle.textContent = "Almost there";
  if (resultMessage) resultMessage.textContent = "Close to 75%. Retry failed and aim for full mastery.";
  if (resultEmoji) resultEmoji.textContent = "⚡";
} else {
  if (resultTitle) resultTitle.textContent = "Let’s go again";
  if (resultMessage) resultMessage.textContent = "Practice weak areas and try again.";
  if (resultEmoji) resultEmoji.textContent = "💪";
}

}

// -----------------------
// Confetti (lightweight)
// -----------------------
function launchConfetti() {
  if (!confetti) return;

  confetti.innerHTML = "";

  const colors = ["var(--accent)", "var(--correct)", "#facc15", "rgba(255,255,255,0.85)"];
  const pieceCount = 26;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    const left = Math.random() * 100;
    const size = 6 + Math.random() * 6;
    const duration = 700 + Math.random() * 700;
    const delay = Math.random() * 120;
    const dx = (Math.random() * 2 - 1) * 80;

    piece.style.left = `${left}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${Math.max(8, size * 1.3)}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${duration}ms`;
    piece.style.animationDelay = `${delay}ms`;
    piece.style.setProperty("--dx", `${dx}px`);

    confetti.appendChild(piece);
  }

  window.setTimeout(() => {
    if (confetti) confetti.innerHTML = "";
  }, 1600);
}

// -----------------------
// Performance screen
// -----------------------
if (resetPerformanceBtn) {
  resetPerformanceBtn.addEventListener("click", () => {
    const ok = confirm("Reset mastery + seen stats? (Failed-question list is kept.)");
    if (!ok) return;

    performanceStats = {};
    seenStats = {};

    localStorage.removeItem("performanceStats");
    localStorage.removeItem("seenStats");

    renderPerformance();
    updateUnseenSectionUI();
  });
}

if (performanceBtn) {
  performanceBtn.addEventListener("click", () => {
    performanceStats = loadJSON("performanceStats", {});
    seenStats = loadJSON("seenStats", {});

    if (startScreen) startScreen.classList.add("hidden");
    if (quiz) quiz.classList.add("hidden");
    if (scoreScreen) scoreScreen.classList.add("hidden");

    if (performanceScreen) performanceScreen.classList.remove("hidden");
    if (homeBtn) homeBtn.classList.remove("hidden");

    renderPerformance();
  });
}

function renderPerformance() {
  if (!performanceList) return;

  performanceStats = loadJSON("performanceStats", {});
  performanceList.innerHTML = "";

  if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
    if (performanceSummary) {
      performanceSummary.classList.add("hidden");
      performanceSummary.innerHTML = "";
    }
    performanceList.innerHTML = `<p class="muted">Loading questions…</p>`;
    return;
  }

  const categories = [...new Set(allQuestions.map(q => q.category))].sort();

  // Totals per category
  const totalByCategory = {};
  for (const q of allQuestions) {
    const cat = q.category || "Uncategorised";
    totalByCategory[cat] = (totalByCategory[cat] || 0) + 1;
  }

  // Overall
  let overallTotal = 0;
  let overallMastered = 0;

  for (const cat of categories) {
    const total = totalByCategory[cat] || 0;
    const mastered = Object.values(performanceStats[cat] || {}).filter(v => v && v.correct).length;

    overallTotal += total;
    overallMastered += Math.min(mastered, total);
  }

  const overallPct = overallTotal ? Math.round((overallMastered / overallTotal) * 100) : 0;

  if (performanceSummary) {
    performanceSummary.classList.remove("hidden");
    performanceSummary.innerHTML = `
      <div class="summary-row">
        <div>
          <div class="summary-title">Overall</div>
          <div class="summary-meta">${overallMastered}/${overallTotal} mastered</div>
        </div>
        <div class="summary-score">${overallPct}%</div>
      </div>
      <div class="performance-bar summary-bar">
        <div class="performance-fill ${
          overallPct >= 80 ? "pass" : overallPct >= 60 ? "borderline" : "fail"
        }" style="width: ${overallPct}%"></div>
      </div>
    `;
  }

  // Build category rows
  const rows = categories.map(cat => {
    const total = totalByCategory[cat] || 0;
    const masteredRaw = Object.values(performanceStats[cat] || {}).filter(v => v && v.correct).length;
    const mastered = Math.min(masteredRaw, total);

    const pct = total ? Math.round((mastered / total) * 100) : 0;
    const complete = total > 0 && mastered === total;

    return { cat, total, mastered, pct, complete };
  });

  // Sort: completed first, then higher % mastery, then name
  rows.sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    if (a.pct !== b.pct) return b.pct - a.pct;
    return a.cat.localeCompare(b.cat);
  });

  rows.forEach(r => {
    let status = "fail";
    if (r.pct >= 80) status = "pass";
    else if (r.pct >= 60) status = "borderline";

    const item = document.createElement("div");
    item.className = "performance-item";
    if (r.complete) item.classList.add("complete");

    const completeBadge = r.complete ? `<span class="complete-badge">✓ Complete</span>` : "";

    item.innerHTML = `
      <div class="performance-row">
        <div class="performance-left">
          <span class="category-pill ${r.complete ? "complete-pill" : ""}">
            ${r.cat}${r.complete ? " ✓" : ""}
          </span>
          <div class="performance-meta muted">
            ${r.mastered}/${r.total} mastered
            ${completeBadge}
          </div>
        </div>
        <div class="performance-score">${r.pct}%</div>
      </div>
      <div class="performance-bar">
        <div class="performance-fill ${status}" style="width: ${r.pct}%"></div>
      </div>
    `;

    performanceList.appendChild(item);
  });
}

// -----------------------
// Home button
// -----------------------
function resetApp() {
  currentIndex = 0;
  score = 0;
  quizQuestions = [];

  if (quiz) quiz.classList.add("hidden");
  if (scoreScreen) scoreScreen.classList.add("hidden");
  if (performanceScreen) performanceScreen.classList.add("hidden");
  if (startScreen) startScreen.classList.remove("hidden");
  if (scoreScreen) scoreScreen.classList.remove("score-perfect", "score-pass", "score-near", "score-fail");
  if (scoreMeterFill) scoreMeterFill.style.width = "0%";
  if (scorePercent) scorePercent.textContent = "";
  if (resultMessage) resultMessage.textContent = "";
  if (confetti) confetti.innerHTML = "";
  if (progressFill) progressFill.style.width = "0%";

  if (homeBtn) homeBtn.classList.add("hidden");

  failedQuestions = loadJSON("failedQuestions", []);
  if (retryFailedBtn) retryFailedBtn.disabled = failedQuestions.length === 0;

  if (categorySelect && categorySelect.value) updateCategoryUI(categorySelect.value);

  // Ensure unseen button state is correct on return home
  updateUnseenSectionUI();
}

if (homeBtn) homeBtn.addEventListener("click", resetApp);

// Expose resetApp for inline HTML button usage (your score screen uses onclick="resetApp()")
window.resetApp = resetApp;
