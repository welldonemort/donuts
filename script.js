const boxesRoot = document.getElementById("boxes");
const donutsWrap = document.querySelector(".donuts");
const donutEls = document.querySelectorAll(".donut");

const MAX_IN_BOX = 2;
const MAX_BOXES = 4;

const BOX_OPEN_SRC = "/img/box.svg";
const BOX_LID_SRC = "/img/glass.svg";

const titleEl = document.querySelector(".title");
const quizEl = document.getElementById("quiz");
const quizInput = document.getElementById("quizInput");
const quizBtn = document.getElementById("quizBtn");
const countOverlay = document.getElementById("countOverlay");

const CORRECT_TOTAL = 8;
let quizDone = false;

let activeBox = document.querySelector(".box");
let activeContent = activeBox.querySelector(".box__content");
let boxesCreated = 1;
let activeBoxCount = 0;
let isAnimating = false;
let packedTotal = 0;

document.addEventListener("dragstart", (e) => {
  e.preventDefault();
});

function lockClicks(lock) {
  isAnimating = lock;
  donutsWrap.classList.toggle("is-locked", lock);
}

function createBox({ fadeIn = false } = {}) {
  const box = document.createElement("div");
  box.className = "box";

  box.innerHTML = `
    <img class="box__img" src="${BOX_OPEN_SRC}" alt="box">
    <div class="box__content"></div>
    <img class="box__lid" src="${BOX_LID_SRC}" alt="">
  `;

  if (fadeIn) box.classList.add("is-new");
  boxesRoot.appendChild(box);
  if (fadeIn) requestAnimationFrame(() => box.classList.add("is-visible"));

  return box;
}

function getSlotInBoxContent(boxEl, slotIndex) {
  const content = boxEl.querySelector(".box__content");
  const cr = content.getBoundingClientRect();

  const centerY = cr.height * 0.4;
  const gap = cr.width * 0.45;

  const centerX = cr.width / 2;
  const x = slotIndex === 0 ? centerX - gap / 2 : centerX + gap / 2;

  return { left: x, top: centerY };
}

async function flyDonutToBox(donutEl) {
  const slotIndex = activeBoxCount;

  const from = donutEl.getBoundingClientRect();

  const content = activeBox.querySelector(".box__content");
  const cr = content.getBoundingClientRect();
  const slot = getSlotInBoxContent(activeBox, slotIndex);

  const targetX = cr.left + slot.left;
  const targetY = cr.top + slot.top;

  donutEl.classList.add("is-flying");
  donutEl.style.position = "fixed";
  donutEl.style.left = `${from.left}px`;
  donutEl.style.top = `${from.top}px`;
  donutEl.style.margin = "0";
  donutEl.style.zIndex = "9999";
  donutEl.style.transform = "none";

  const dx = targetX - (from.left + from.width / 2);
  const dy = targetY - (from.top + from.height / 2);

  requestAnimationFrame(() => {
    donutEl.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  await new Promise((r) => setTimeout(r, 500));

  donutEl.style.transition = "none";
  donutEl.style.position = "absolute";
  donutEl.style.left = `${slot.left}px`;
  donutEl.style.top = `${slot.top}px`;
  donutEl.style.transform = "translate(-50%, -50%)";
  donutEl.style.zIndex = "1";

  activeContent = content;
  activeContent.appendChild(donutEl);

  requestAnimationFrame(() => {
    donutEl.style.transition = "transform 0.5s ease, opacity 0.2s ease";
  });

  donutEl.dataset.packed = "1";
  donutEl.classList.remove("is-flying");
}

function closeActiveBox() {
  activeBox.classList.add("is-closed");
}

async function spawnNextBox() {
  if (boxesCreated >= MAX_BOXES) return;

  const newBox = createBox({ fadeIn: true });
  boxesCreated++;

  await new Promise((r) => setTimeout(r, 1000));

  activeBox = newBox;
  activeContent = activeBox.querySelector(".box__content");
  activeBoxCount = 0;
}

donutEls.forEach((donut) => {
  donut.addEventListener("click", async () => {
    if (isAnimating) return;
    if (donut.dataset.packed === "1") return;
    if (activeBoxCount >= MAX_IN_BOX) return;

    lockClicks(true);

    await flyDonutToBox(donut);
    activeBoxCount += 1;
    packedTotal += 1;

    if (packedTotal === CORRECT_TOTAL) {
      titleEl.classList.add("is-hidden");
      boxesRoot.classList.add("with-offset");
      quizEl.classList.remove("is-hidden");
      quizInput.focus();
    }

    if (activeBoxCount === MAX_IN_BOX) {
      closeActiveBox();
      await spawnNextBox();
    }

    lockClicks(false);
  });
});

function sanitizeNumberInput(value) {
  return value.replace(/\D/g, "");
}

quizInput.addEventListener("input", () => {
  countOverlay.innerHTML = "";

  if (quizDone) return;

  const clean = sanitizeNumberInput(quizInput.value);
  if (quizInput.value !== clean) quizInput.value = clean;

  updateQuizButtonState();

  quizBtn.classList.remove("is-error", "is-success");
  quizInput.classList.remove("is-error", "is-success");
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function showErrorAnimation() {
  quizBtn.classList.remove("is-success");
  quizInput.classList.remove("is-success");
  quizBtn.classList.add("is-error");
  quizInput.classList.add("is-error");

  await showNumbersSequentially();

  await sleep(1000);

  quizBtn.classList.remove("is-error");
  quizInput.classList.remove("is-error");
  quizInput.focus();
}

function showSuccess() {
  quizDone = true;

  quizBtn.disabled = false;
  quizBtn.classList.remove("is-active", "is-error");
  quizBtn.classList.add("is-success");

  quizInput.classList.remove("is-error");
  quizInput.classList.add("is-success");

  quizInput.setAttribute("disabled", "true");
}

function updateQuizButtonState() {
  const clean = sanitizeNumberInput(quizInput.value);
  const hasValue = clean.length > 0;

  quizBtn.disabled = !hasValue;
  quizBtn.classList.toggle("is-active", hasValue);

  if (!hasValue) {
    quizBtn.classList.remove("is-error", "is-success");
  }
}

quizBtn.addEventListener("click", async () => {
  if (quizDone) return;

  const value = quizInput.value.trim();
  if (!value) return;

  const num = Number(value);
  if (Number.isNaN(num)) return;

  if (num === CORRECT_TOTAL) {
    showSuccess();
    return;
  }

  lockClicks(true);
  quizInput.setAttribute("disabled", "true");
  quizBtn.setAttribute("disabled", "true");

  await showErrorAnimation();

  quizInput.removeAttribute("disabled");
  quizBtn.removeAttribute("disabled");
  updateQuizButtonState();

  lockClicks(false);
});

function getPackedDonutsInOrder() {
  return Array.from(document.querySelectorAll(".box__content .donut"));
}

function getCenterInBoxes(el) {
  const elRect = el.getBoundingClientRect();
  const boxesRect = boxesRoot.getBoundingClientRect();

  const x = elRect.left + elRect.width / 2 - boxesRect.left;
  const y = elRect.top + elRect.height / 2 - boxesRect.top;

  return { x, y };
}

function renderCountNumbers() {
  const donuts = getPackedDonutsInOrder();
  countOverlay.innerHTML = "";

  donuts.forEach((donut, idx) => {
    const n = idx + 1;
    const { x, y } = getCenterInBoxes(donut);

    const el = document.createElement("div");
    el.className = "count-num";
    el.textContent = String(n);

    el.style.left = `${x}px`;
    el.style.top = `${y - 18}px`;

    countOverlay.appendChild(el);
  });
}

async function showNumbersSequentially() {
  renderCountNumbers();

  const nums = Array.from(countOverlay.querySelectorAll(".count-num"));
  for (let i = 0; i < nums.length; i++) {
    nums[i].classList.add("is-visible");
    await sleep(500);
  }
}
