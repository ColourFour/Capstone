/* =========================================================
   Conditional Probability Mini-Site
   - Renders quiz on practice.html
   - Renders worked solutions on solutions.html
   - Saves answers to localStorage
   - Supports multi-part answers: enter as a,b,c (comma-separated)
========================================================= */

const QUESTIONS = [
  // ----- Original set (kept) -----
  {
    id: "q1",
    difficulty: "Easy",
    prompt:
      "Given P(A)=0.3, P(B)=0.5, and P(A ∩ B)=0.15, find P(A | B).",
    answer: 0.3,
    hint: "Use P(A | B) = P(A ∩ B) / P(B).",
    solution:
      "P(A | B) = 0.15 / 0.5 = 0.3."
  },
  {
    id: "q2",
    difficulty: "Easy",
    prompt:
      "In a group of 100 students: 60 play sports. Of those 60, 30 also play an instrument. Find P(instrument | sports).",
    answer: 0.5,
    hint: "Conditioning on sports means the sample space is the 60 sports students.",
    solution:
      "P(instrument | sports) = 30/60 = 0.5."
  },
  {
    id: "q3",
    difficulty: "Easy → Medium",
    prompt:
      "A card is drawn from a standard deck. Given it is a face card (J, Q, K), what is P(it is a King | face card)?",
    answer: 1 / 3,
    hint: "Count face cards total, then count kings among them.",
    solution:
      "There are 12 face cards (J,Q,K across 4 suits) and 4 kings.\nSo P = 4/12 = 1/3."
  },
  {
    id: "q4",
    difficulty: "Medium",
    prompt:
      "Two fair dice are rolled. Given the sum is 8, what is P(first die is 3 | sum is 8)?",
    answer: 1 / 5,
    hint: "List all outcomes that sum to 8, then count how many have first die = 3.",
    solution:
      "Sum 8 outcomes: (2,6)(3,5)(4,4)(5,3)(6,2).\nOnly (3,5) has first die 3, so 1/5."
  },
  {
    id: "q5",
    difficulty: "Medium",
    prompt:
      "A bag has 5 red and 3 blue balls. Two balls are drawn without replacement. Given the first is red, what is P(second is red | first is red)?",
    answer: 4 / 7,
    hint: "After a red is removed, update the counts.",
    solution:
      "After first red: 4 red remain, total 7 remain.\nSo P = 4/7."
  },
  {
    id: "q6",
    difficulty: "Medium",
    prompt:
      "If events A and B are independent and P(A)=0.4, what is P(A | B)?",
    answer: 0.4,
    hint: "Independence means B doesn’t change the probability of A.",
    solution:
      "If independent, P(A | B)=P(A)=0.4."
  },
  {
    id: "q7",
    difficulty: "Challenging",
    prompt:
      "A disease has prevalence 1%. A test has sensitivity 90% and specificity 95%. Given a positive test, estimate P(disease | positive).",
    answer: 0.009 / (0.009 + 0.0495),
    hint: "Bayes: P(D|+)= P(+|D)P(D) / [P(+|D)P(D)+P(+|not D)P(not D)].",
    solution:
      "P(D)=0.01, P(+|D)=0.90, P(+|not D)=1-0.95=0.05, P(not D)=0.99.\n" +
      "P(D|+) = (0.90*0.01) / (0.90*0.01 + 0.05*0.99)\n" +
      "= 0.009 / (0.009 + 0.0495) ≈ 0.1538."
  },
  {
    id: "q8",
    difficulty: "Challenging",
    prompt:
      "60% of items come from Machine 1 (defect rate 2%), 40% from Machine 2 (defect rate 5%). Given an item is defective, find P(Machine 2 | defective).",
    answer: (0.4 * 0.05) / (0.6 * 0.02 + 0.4 * 0.05),
    hint: "Use Bayes with machines as causes and defective as evidence.",
    solution:
      "P(M2|D) = (0.05*0.40) / (0.02*0.60 + 0.05*0.40)\n" +
      "= 0.02 / 0.032 = 0.625."
  },
  {
    id: "q9",
    difficulty: "Challenging",
    prompt:
      "Two fair coins are flipped. Given at least one head occurred, what is P(both heads | at least one head)?",
    answer: 1 / 3,
    hint: "Remove the outcome TT from the sample space.",
    solution:
      "Outcomes: HH, HT, TH, TT.\nGiven at least one head → exclude TT.\n" +
      "Remaining 3 outcomes, only HH works → 1/3."
  },
  {
    id: "q10",
    difficulty: "Extension",
    prompt:
      "You know P(A)=0.6, P(B)=0.5, and P(A | B)=0.8. Find P(B | A).",
    answer: (0.5 * 0.8) / 0.6,
    hint: "Find P(A ∩ B) first, then divide by P(A).",
    solution:
      "P(A|B)=0.8= P(A∩B)/0.5 ⇒ P(A∩B)=0.4.\n" +
      "Then P(B|A)=0.4/0.6=2/3 ≈ 0.6667."
  },

  // ----- NEW: 5 harder tree-diagram style questions (multi-part) -----

  {
    id: "q11",
    difficulty: "Tree Diagram (Exam-style, 3 parts)",
    prompt:
      "A fair 4-sided die has faces 1,2,3,4. One turn: throw repeatedly up to a maximum of 3 throws. Stop early if a 4 occurs. A player scores 1 point if they obtain a 4 in their turn.\n\n" +
      "(a) Show that P(score 1 in one turn) = 37/64.\n" +
      "(b) Xeno and Yao each take 2 turns. Find P(neither scores any points in their first two turns).\n" +
      "(c) Xeno and Yao each have 3 turns. Find P(Xeno scores 2 more points than Yao).\n\n" +
      "Enter answers as a,b,c (comma-separated).",
    answer: [
      37 / 64,
      Math.pow(27 / 64, 4),
      3140709147 / 34359738368
    ],
    hint:
      "(a) Use complement: no 4 in 3 throws.\n" +
      "(b) 'No points in a turn' means no 4 in 3 throws.\n" +
      "(c) Let X,Y ~ Bin(3,p) with p=37/64 and compute P(X=Y+2).",
    solution:
      "(a) P(score 1) = 1 − P(no 4 in 3 throws) = 1 − (3/4)^3 = 1 − 27/64 = 37/64.\n\n" +
      "(b) P(no points in one turn) = (3/4)^3 = 27/64.\n" +
      "Two turns for Xeno and two for Yao are independent ⇒ (27/64)^4.\n\n" +
      "(c) p=37/64, q=27/64. X,Y ~ Bin(3,p).\n" +
      "Need X=Y+2 ⇒ (X,Y)=(2,0) or (3,1).\n" +
      "P = P(X=2)P(Y=0)+P(X=3)P(Y=1)\n" +
      "= (3p^2q)(q^3) + (p^3)(3pq^2)\n" +
      "= 3p^2q^4 + 3p^4q^2.\n" +
      "With p=37/64, q=27/64 ⇒ P = 3140709147/34359738368 ≈ 0.0914."
  },

  {
    id: "q12",
    difficulty: "Tree Diagram (Stopping rule, 3 parts)",
    prompt:
      "A biased coin has P(H)=0.6. One turn: toss up to 3 times, stopping early if the first Head occurs.\n\n" +
      "(a) Find P(at least one Head in the turn).\n" +
      "(b) Find P(exactly 2 tosses are made).\n" +
      "(c) Find the expected number of tosses in one turn.\n\n" +
      "Enter answers as a,b,c (comma-separated).",
    answer: [117 / 125, 6 / 25, 39 / 25],
    hint:
      "Draw a tree: stop after 1 toss if H, stop after 2 tosses if TH, otherwise you must do a 3rd toss.",
    solution:
      "Let p=0.6, q=0.4.\n" +
      "(a) P(at least one H) = 1 − q^3 = 1 − 0.064 = 0.936 = 117/125.\n" +
      "(b) Exactly 2 tosses happens only on TH: q·p = 0.4·0.6 = 0.24 = 6/25.\n" +
      "(c) P(1 toss)=p, P(2 tosses)=q·p, P(3 tosses)=q^2.\n" +
      "E = 1·p + 2·(q·p) + 3·q^2 = 1·0.6 + 2·0.24 + 3·0.16 = 1.56 = 39/25."
  },

  {
    id: "q13",
    difficulty: "Tree Diagram (Two-stage + Bayes, 3 parts)",
    prompt:
      "A box is chosen at random.\n" +
      "• Box A has 4 Red and 1 Blue.\n" +
      "• Box B has 2 Red and 3 Blue.\n" +
      "Two balls are drawn without replacement from the chosen box.\n\n" +
      "(a) Find P(two Reds).\n" +
      "(b) Given exactly one Red was drawn, find P(Box A was chosen).\n" +
      "(c) Find P(second ball is Red | first ball is Red).\n\n" +
      "Enter answers as a,b,c (comma-separated).",
    answer: [7 / 20, 2 / 5, 7 / 12],
    hint:
      "Tree: choose box → draw 1st ball → draw 2nd ball. For (b), use Bayes on 'exactly one Red'.",
    solution:
      "Choose A or B with probability 1/2 each.\n\n" +
      "(a) P(2R|A)=(4/5)(3/4)=3/5. P(2R|B)=(2/5)(1/4)=1/10.\n" +
      "So P(2R)= (1/2)(3/5)+(1/2)(1/10)=3/10+1/20=7/20.\n\n" +
      "(b) P(1R|A)=1−P(2R|A)=1−3/5=2/5 (0 blues impossible for A).\n" +
      "P(1R|B)=P(RB)+P(BR)=(2/5)(3/4)+(3/5)(1/2)=3/10+3/10=3/5.\n" +
      "Bayes: P(A|1R)= [(1/2)(2/5)] / ( (1/2)(2/5) + (1/2)(3/5) ) = (2/5)/(1) = 2/5.\n\n" +
      "(c) P(2R)=7/20 and P(first R)= (1/2)(4/5)+(1/2)(2/5)=3/5.\n" +
      "So P(second R | first R)=P(2R)/P(first R)=(7/20)/(3/5)=7/12."
  },

  {
    id: "q14",
    difficulty: "Tree Diagram (Conditional process, 3 parts)",
    prompt:
      "A fair coin is tossed.\n" +
      "• If it shows H, roll a fair die once.\n" +
      "• If it shows T, roll a fair die twice and take the maximum.\n" +
      "Let event A be: 'the final result is at least 5'.\n\n" +
      "(a) Find P(A).\n" +
      "(b) Find P(T | A).\n" +
      "(c) Find P(exactly one die was rolled | A).\n\n" +
      "Enter answers as a,b,c (comma-separated).",
    answer: [4 / 9, 5 / 8, 3 / 8],
    hint:
      "For T-branch: P(max ≥ 5)=1−P(both ≤4). Then use Bayes for (b) and (c).",
    solution:
      "P(H)=P(T)=1/2.\n" +
      "If H: P(A|H)=P(die≥5)=2/6=1/3.\n" +
      "If T: P(A|T)=1−(4/6)^2 = 1−16/36 = 20/36 = 5/9.\n\n" +
      "(a) P(A)=(1/2)(1/3)+(1/2)(5/9)=1/6+5/18=8/18=4/9.\n" +
      "(b) P(T|A)= (P(A|T)P(T))/P(A)=((5/9)(1/2))/(4/9)=5/8.\n" +
      "(c) Exactly one die rolled means coin was H.\n" +
      "So P(one die | A)=P(H|A)=((1/3)(1/2))/(4/9)=3/8."
  },

  {
    id: "q15",
    difficulty: "Tree Diagram (Two components, conditional, 3 parts)",
    prompt:
      "Each product uses TWO components.\n" +
      "For each component independently:\n" +
      "• Supplier A is used with probability 0.7 (good with probability 0.96)\n" +
      "• Supplier B is used with probability 0.3 (good with probability 0.90)\n" +
      "The product passes inspection if BOTH components are good.\n\n" +
      "(a) Find P(product passes).\n" +
      "(b) Given the product fails, find P(at least one component came from Supplier B).\n" +
      "(c) Given the product passes, find P(both components were from Supplier A).\n\n" +
      "Enter answers as a,b,c (comma-separated).",
    answer: [
      221841 / 250000, // 0.887364
      18555 / 28159,   // ≈ 0.6588
      12544 / 24649    // ≈ 0.5087
    ],
    hint:
      "Build a tree for each component: Supplier → Good/Bad. Use independence between components. Use conditional probability for (b) and (c).",
    solution:
      "Let one component be good with probability:\n" +
      "P(G)=0.7·0.96 + 0.3·0.90 = 0.672 + 0.27 = 0.942.\n\n" +
      "(a) Components independent ⇒ P(pass)=0.942^2 = 0.887364 = 221841/250000.\n\n" +
      "(b) P(fail)=1−0.887364 = 0.112636 = 28159/250000.\n" +
      "P(at least one B) = 1−P(AA)=1−0.7^2 = 0.51.\n" +
      "P(at least one B AND pass) = pass − P(AA AND pass).\n" +
      "P(AA AND pass)=0.7^2·0.96^2=0.49·0.9216=0.451584.\n" +
      "So P(at least one B AND pass)=0.887364−0.451584=0.43578.\n" +
      "Thus P(at least one B AND fail)=0.51−0.43578=0.07422.\n" +
      "So P(at least one B | fail)=0.07422/0.112636 ≈ 0.6588 = 18555/28159.\n\n" +
      "(c) P(AA | pass) = P(AA AND pass) / P(pass)\n" +
      "= 0.451584/0.887364 ≈ 0.5087 = 12544/24649."
  }
];

// ---------- localStorage helpers ----------
const STORAGE_KEY = "cp_answers_v2";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---------- parsing + checking ----------
function parseNumberMaybeFraction(text) {
  const s = (text || "").trim();
  if (!s) return { ok: false, value: NaN };

  const normalized = s.replace(/,/g, "."); // allow 0,25 -> 0.25

  if (normalized.includes("/")) {
    const parts = normalized.split("/").map(x => x.trim());
    if (parts.length !== 2) return { ok: false, value: NaN };
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return { ok: false, value: NaN };
    return { ok: true, value: a / b };
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return { ok: false, value: NaN };
  return { ok: true, value: n };
}

function approxEqual(a, b, tol = 1e-3) {
  return Math.abs(a - b) <= tol;
}

function expectedArray(q) {
  return Array.isArray(q.answer) ? q.answer : [q.answer];
}

function splitParts(inputText) {
  // split on commas; allow spaces
  return (inputText || "")
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ---------- UI rendering ----------
function setActiveNav() {
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".navlink").forEach(a => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === path) a.classList.add("active");
  });
}

function renderQuiz() {
  const host = document.getElementById("quiz");
  if (!host) return;

  const state = loadState();

  host.innerHTML = QUESTIONS.map((q, idx) => {
    const saved = state[q.id]?.answerText ?? "";
    const status = state[q.id]?.status ?? "unanswered";
    const isMulti = expectedArray(q).length > 1;

    return `
      <article class="qcard" data-qid="${q.id}">
        <div class="qhead">
          <div class="qnum">Question ${idx + 1}</div>
          <div class="qdiff">${escapeHtml(q.difficulty)}</div>
        </div>

        <p>${escapeHtml(q.prompt).replaceAll("\n", "<br/>")}</p>

        <div class="pillrow">
          <span class="pill">${isMulti ? "Multi-part: enter a,b,c…" : "Single answer"}</span>
          <span class="pill">Accepts decimals or fractions</span>
        </div>

        <div class="inputrow">
          <input class="input" type="text"
            placeholder="${isMulti ? "e.g. 1/2, 0.3, 7/12" : "e.g. 0.3 or 3/10"}"
            value="${escapeAttr(saved)}" aria-label="Answer for question ${idx + 1}" />
          <button class="btn btn-ghost check-btn" type="button">Check</button>
        </div>

        <div class="feedback ${statusClass(status)}" aria-live="polite">
          ${feedbackText(status)}
        </div>

        <details>
          <summary>Hint</summary>
          <p class="muted">${escapeHtml(q.hint).replaceAll("\n", "<br/>")}</p>
        </details>

        <details>
          <summary>Solution</summary>
          <p class="mono">${escapeHtml(q.solution).replaceAll("\n", "<br/>")}</p>
        </details>
      </article>
    `;
  }).join("");

  // Attach handlers
  host.querySelectorAll(".qcard").forEach(card => {
    const qid = card.getAttribute("data-qid");
    const q = QUESTIONS.find(x => x.id === qid);
    const input = card.querySelector(".input");
    const btn = card.querySelector(".check-btn");
    const fb = card.querySelector(".feedback");

    input.addEventListener("input", () => {
      const s = loadState();
      s[qid] = s[qid] || {};
      s[qid].answerText = input.value;
      saveState(s);
    });

    btn.addEventListener("click", () => {
      const expected = expectedArray(q);
      const parts = expected.length > 1 ? splitParts(input.value) : [ (input.value || "").trim() ];

      const s = loadState();
      s[qid] = s[qid] || {};
      s[qid].answerText = input.value;

      if (parts.length !== expected.length) {
        s[qid].status = "invalid";
        saveState(s);
        setFeedback(fb, "invalid", `Need ${expected.length} value(s) separated by commas.`);
        return;
      }

      // parse all parts
      const parsed = parts.map(parseNumberMaybeFraction);
      if (parsed.some(p => !p.ok)) {
        s[qid].status = "invalid";
        saveState(s);
        setFeedback(fb, "invalid", "One of your parts isn't a valid number/fraction.");
        return;
      }

      // check which are correct
      const wrongParts = [];
      for (let i = 0; i < expected.length; i++) {
        if (!approxEqual(parsed[i].value, expected[i])) {
          wrongParts.push(String.fromCharCode(97 + i)); // a,b,c...
        }
      }

      if (wrongParts.length === 0) {
        s[qid].status = "correct";
        saveState(s);
        setFeedback(fb, "correct");
      } else {
        s[qid].status = "incorrect";
        saveState(s);
        setFeedback(fb, "incorrect", `Parts wrong: ${wrongParts.join(", ")}.`);
      }
    });
  });

  const resetBtn = document.getElementById("reset-progress");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetState();
      renderQuiz();
    });
  }
}

function renderSolutions() {
  const host = document.getElementById("solutions");
  if (!host) return;

  host.innerHTML = QUESTIONS.map((q, idx) => {
    return `
      <article class="card">
        <div class="qhead">
          <div class="qnum">Question ${idx + 1}</div>
          <div class="qdiff">${escapeHtml(q.difficulty)}</div>
        </div>
        <p>${escapeHtml(q.prompt).replaceAll("\n", "<br/>")}</p>
        <div class="mathbox">
          <div class="mono">${escapeHtml(q.solution).replaceAll("\n", "<br/>")}</div>
        </div>
      </article>
    `;
  }).join("");
}

// ---------- feedback helpers ----------
function statusClass(status) {
  if (status === "correct") return "good";
  if (status === "incorrect" || status === "invalid") return "bad";
  return "";
}

function feedbackText(status) {
  if (status === "correct") return "✅ Correct!";
  if (status === "incorrect") return "❌ Not quite. Try the hint, then re-check.";
  if (status === "invalid") return "⚠️ Please enter valid value(s).";
  return "—";
}

function setFeedback(el, status, extra = "") {
  el.classList.remove("good", "bad");
  const cls = statusClass(status);
  if (cls) el.classList.add(cls);

  const base = feedbackText(status);
  el.innerHTML = extra ? `${base} <span class="muted">${escapeHtml(extra)}</span>` : base;
}

// ---------- tiny escaping helpers ----------
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("\n", " ");
}

// ---------- boot ----------
document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  renderQuiz();
  renderSolutions();
});