"use strict";

const SELECTED_KEY = "a11y-audit-lab:selected";
const THEME_KEY = "a11y-audit-lab:theme";
const storageKey = (id) => `a11y-audit-lab:${id}`;

const $ = (id) => document.getElementById(id);

const els = {
  loadError: $("load-error"),
  scenarioList: $("scenario-list"),
  title: $("scenario-title"),
  summary: $("scenario-summary"),
  meta: $("scenario-meta"),
  scope: $("scenario-scope"),
  launch: $("launch-link"),
  auditState: $("audit-state"),
  form: $("finding-form"),
  formHeading: $("form-heading"),
  formLocked: $("form-locked"),
  location: $("f-location"),
  description: $("f-description"),
  steps: $("f-steps"),
  fix: $("f-fix"),
  wcag: $("f-wcag"),
  wcagHelp: $("f-wcag-help"),
  saveBtn: $("save-btn"),
  cancelBtn: $("cancel-edit-btn"),
  findingsHeading: $("findings-heading"),
  findingsCount: $("findings-count"),
  findingsEmpty: $("findings-empty"),
  findingsList: $("findings-list"),
  submitPanel: $("submit-panel"),
  submitBtn: $("submit-btn"),
  results: $("results"),
  resultsHeading: $("results-heading"),
  score: $("score"),
  answerKey: $("answer-key"),
  identifiedList: $("identified-list"),
  missedList: $("missed-list"),
  resetBtn: $("reset-btn"),
  themeBtn: $("theme-btn"),
  announcer: $("announcer"),
  corrected: $("corrected-link"),
};

let scenarios = [];
let scenario = null;
let attempt = null;
let criteria = new Map();
const answerKeys = new Map();
let editingId = null;
let state = { attempt: "", findings: [], submitted: false, identified: [] };

/* ---------- State ---------- */

function emptyState() {
  return { attempt: A11yAttempt.newCode(), findings: [], submitted: false, identified: [] };
}

function loadState(id) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(id)));
    if (saved && Array.isArray(saved.findings)) {
      // Audits saved before randomization keep the original fixed defect set.
      if (!saved.attempt && saved.findings.length) saved.attempt = "classic";
      return { ...emptyState(), ...saved };
    }
  } catch (err) {
    // Storage unavailable or corrupt: start fresh.
  }
  return emptyState();
}

function saveState() {
  try {
    localStorage.setItem(storageKey(scenario.id), JSON.stringify(state));
  } catch (err) {
    // Private mode or quota exceeded: the app still works for this session.
  }
}

function announce(message) {
  els.announcer.textContent = "";
  // Clearing first lets screen readers repeat an identical message.
  setTimeout(() => {
    els.announcer.textContent = message;
  }, 50);
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

/* ---------- Rendering helpers ---------- */

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child != null) node.append(child);
  }
  return node;
}

function criterionLabel(id) {
  const c = criteria.get(id);
  return c ? `${c.id} ${c.name} (Level ${c.level})` : id;
}

/* ---------- Scenario ---------- */

function renderScenario() {
  els.title.textContent = scenario.title;
  els.summary.textContent = scenario.summary;
  els.scope.textContent = scenario.scope;
  els.launch.href = `${scenario.url}?attempt=${encodeURIComponent(state.attempt)}`;
  els.corrected.href = `${scenario.url}?defects=none`;
  els.meta.replaceChildren(
    ...[
      ["Standard", scenario.standard],
      ["Known violations", `${attempt.size}, drawn from a pool of ${attempt.ALL.length}`],
      ["Attempt", state.attempt === "classic" ? "Original fixed set" : state.attempt],
    ].map(([term, value]) => el("div", {}, el("dt", { text: term }), el("dd", { text: value })))
  );
}

function scenarioStatus(s) {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey(s.id)));
  } catch (err) {
    // Unreadable storage counts as not started.
  }
  if (!saved || (!saved.findings?.length && !saved.submitted)) return "Not started";
  if (saved.submitted) {
    const size = A11yAttempt.get(s.id)?.size ?? s.violation_count;
    return `Submitted · ${(saved.identified || []).length} of ${size} found`;
  }
  return `In progress · ${saved.findings.length} logged`;
}

function renderScenarioList() {
  els.scenarioList.replaceChildren(
    ...scenarios.map((s) => {
      const current = s.id === scenario?.id;
      const item = el(
        "li",
        { class: `scenario-card${current ? " is-current" : ""}` },
        el("h3", { text: s.title }),
        el("p", { class: "muted", text: s.focus }),
        el("p", { class: "scenario-status", text: scenarioStatus(s) })
      );
      if (current) {
        item.setAttribute("aria-current", "true");
        item.append(el("p", { class: "badge is-current-badge", text: "Current scenario" }));
      } else {
        const btn = el("button", { type: "button", class: "btn btn-secondary btn-small" }, "Audit this page", el("span", { class: "visually-hidden", text: `: ${s.title}` }));
        btn.addEventListener("click", () => selectScenario(s.id, true));
        item.append(btn);
      }
      return item;
    })
  );
}

async function selectScenario(id, fromUser = false) {
  const next = scenarios.find((s) => s.id === id) || scenarios[0];
  try {
    await loadScript(next.attempt_script);
  } catch (err) {
    showLoadError(err);
    return;
  }
  scenario = next;
  attempt = A11yAttempt.get(scenario.id);
  state = loadState(scenario.id);
  saveState();
  try {
    localStorage.setItem(SELECTED_KEY, scenario.id);
  } catch (err) {
    // Selection simply isn't remembered.
  }
  resetForm();
  if (state.submitted) {
    try {
      await loadAnswerKey();
    } catch (err) {
      showLoadError(err);
    }
  }
  renderAll();
  if (fromUser) {
    announce(`${scenario.title} selected.`);
    els.title.focus();
  }
}

const loadedScripts = new Map();
function loadScript(src) {
  if (!loadedScripts.has(src)) {
    loadedScripts.set(
      src,
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`${src}: failed to load`));
        document.head.append(script);
      })
    );
  }
  return loadedScripts.get(src);
}

function populateCriteria() {
  const principles = { 1: "Perceivable", 2: "Operable", 3: "Understandable", 4: "Robust" };
  const groups = {};
  for (const c of criteria.values()) {
    const p = c.id.split(".")[0];
    groups[p] ??= el("optgroup", { label: `${p}. ${principles[p]}` });
    groups[p].append(el("option", { value: c.id, text: `${c.id} ${c.name} (${c.level})` }));
  }
  els.wcag.append(...Object.values(groups));
}

function renderCriterionHelp() {
  const c = criteria.get(els.wcag.value);
  if (!c) {
    els.wcagHelp.replaceChildren();
    return;
  }
  els.wcagHelp.replaceChildren(
    el("p", {}, el("strong", { text: "Definition: " }), c.definition),
    el("p", {}, el("strong", { text: "How to test: " }), c.testing_technique)
  );
}

/* ---------- Findings ---------- */

function renderFindings() {
  const { findings, submitted } = state;
  els.findingsCount.textContent = `(${findings.length})`;
  els.findingsEmpty.hidden = findings.length > 0;

  els.findingsList.replaceChildren(
    ...findings.map((f, i) => {
      const n = i + 1;
      const item = el(
        "li",
        { class: "finding", id: `finding-${f.id}` },
        el("h3", {}, el("span", { class: "finding-number", text: `#${n} ` }), f.location),
        el("p", { text: f.description }),
        findingDetails(f),
        f.wcag
          ? el("span", { class: "sc-tag", text: criterionLabel(f.wcag) })
          : el("span", { class: "muted", text: "No criterion specified" })
      );
      if (!submitted) {
        item.append(
          el(
            "div",
            { class: "finding-actions" },
            actionButton("Edit", `finding ${n}`, "btn-secondary", () => startEdit(f.id)),
            actionButton("Delete", `finding ${n}`, "btn-secondary btn-danger", () => deleteFinding(f.id))
          )
        );
      }
      return item;
    })
  );
}

function findingDetails(f) {
  const rows = [
    ["Steps to reproduce", f.steps],
    ["Recommended fix", f.fix],
  ].filter(([, value]) => value);
  if (!rows.length) return null;
  return el("dl", { class: "finding-details" }, ...rows.flatMap(([term, value]) => [el("dt", { text: term }), el("dd", { text: value })]));
}

function actionButton(label, context, variant, onClick) {
  const btn = el(
    "button",
    { type: "button", class: `btn btn-small ${variant}` },
    label,
    el("span", { class: "visually-hidden", text: ` ${context}` })
  );
  btn.addEventListener("click", onClick);
  return btn;
}

function setFieldError(input, message) {
  const error = $(`${input.id}-error`);
  if (message) {
    error.textContent = `Error: ${message}`;
    error.hidden = false;
    input.setAttribute("aria-invalid", "true");
  } else {
    error.textContent = "";
    error.hidden = true;
    input.removeAttribute("aria-invalid");
  }
}

function validateForm() {
  const checks = [
    [els.location, "Enter the element or location of the issue."],
    [els.description, "Describe the issue."],
  ];
  let firstInvalid = null;
  for (const [input, message] of checks) {
    const invalid = !input.value.trim();
    setFieldError(input, invalid ? message : "");
    if (invalid && !firstInvalid) firstInvalid = input;
  }
  return firstInvalid;
}

function handleSubmitFinding(event) {
  event.preventDefault();
  const firstInvalid = validateForm();
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const data = {
    location: els.location.value.trim(),
    description: els.description.value.trim(),
    steps: els.steps.value.trim(),
    fix: els.fix.value.trim(),
    wcag: els.wcag.value,
  };

  if (editingId) {
    const index = state.findings.findIndex((f) => f.id === editingId);
    state.findings[index] = { ...state.findings[index], ...data };
    const id = editingId;
    saveState();
    resetForm();
    renderFindings();
    announce(`Finding ${index + 1} updated.`);
    focusFinding(id);
  } else {
    state.findings.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), ...data });
    saveState();
    resetForm();
    renderFindings();
    announce(`Finding ${state.findings.length} added. ${state.findings.length} findings logged.`);
    els.location.focus();
  }
  renderAuditState();
}

function startEdit(id) {
  const index = state.findings.findIndex((f) => f.id === id);
  const finding = state.findings[index];
  editingId = id;
  els.location.value = finding.location;
  els.description.value = finding.description;
  els.steps.value = finding.steps || "";
  els.fix.value = finding.fix || "";
  els.wcag.value = finding.wcag;
  renderCriterionHelp();
  setFieldError(els.location, "");
  setFieldError(els.description, "");
  els.formHeading.textContent = `Edit finding #${index + 1}`;
  els.saveBtn.textContent = "Save changes";
  els.cancelBtn.hidden = false;
  els.location.focus();
}

function resetForm() {
  editingId = null;
  els.form.reset();
  renderCriterionHelp();
  setFieldError(els.location, "");
  setFieldError(els.description, "");
  els.formHeading.textContent = "Log a finding";
  els.saveBtn.textContent = "Add finding";
  els.cancelBtn.hidden = true;
}

function cancelEdit() {
  const id = editingId;
  resetForm();
  announce("Edit cancelled.");
  focusFinding(id);
}

function focusFinding(id) {
  const button = document.querySelector(`#finding-${CSS.escape(id)} button`);
  (button || els.findingsHeading).focus();
}

function deleteFinding(id) {
  const index = state.findings.findIndex((f) => f.id === id);
  if (!window.confirm(`Delete finding #${index + 1}? This cannot be undone.`)) return;
  state.findings.splice(index, 1);
  if (editingId === id) resetForm();
  saveState();
  renderFindings();
  renderAuditState();
  announce(`Finding ${index + 1} deleted. ${state.findings.length} findings remaining.`);
  els.findingsHeading.focus();
}

/* ---------- Submission and results ---------- */

function renderAuditState() {
  const { submitted, findings } = state;
  els.auditState.textContent = submitted ? "Submitted" : `In progress · ${findings.length} logged`;
  els.auditState.classList.toggle("is-submitted", submitted);
  els.form.hidden = submitted;
  els.formLocked.hidden = !submitted;
  els.formHeading.textContent = submitted ? "Findings locked" : els.formHeading.textContent;
  els.submitPanel.hidden = submitted;
  els.results.hidden = !submitted;
  if (scenario) renderScenarioList();
}

async function submitAudit() {
  if (editingId) {
    window.alert("Save or cancel the finding you are editing before submitting.");
    els.location.focus();
    return;
  }
  const count = state.findings.length;
  const message =
    count === 0
      ? "You have not logged any findings. Submit anyway and reveal the answer key?"
      : `Submit your audit with ${count} finding${count === 1 ? "" : "s"}? Your findings will be locked.`;
  if (!window.confirm(message)) return;

  try {
    await loadAnswerKey();
  } catch (err) {
    showLoadError(err);
    return;
  }
  state.submitted = true;
  state.identified = [];
  saveState();
  renderAll();
  els.resultsHeading.focus();
}

async function loadAnswerKey() {
  if (!answerKeys.has(scenario.id)) answerKeys.set(scenario.id, await fetchJson(scenario.answer_key));
}

// The answer key holds the whole pool; only this attempt's defects are scored.
function activeViolations() {
  const ids = attempt.pick(state.attempt);
  return answerKeys.get(scenario.id).violations.filter((v) => ids.includes(v.id));
}

function renderResults() {
  if (!answerKeys.has(scenario.id)) return;
  els.answerKey.replaceChildren(...activeViolations().map(renderViolation));
  renderScore();
}

function renderViolation(v) {
  const identified = state.identified.includes(v.id);
  const matches = state.findings
    .map((f, i) => ({ ...f, n: i + 1 }))
    .filter((f) => f.wcag && (f.wcag === v.wcag || v.related_wcag.includes(f.wcag)));

  const checkbox = el("input", { type: "checkbox", id: `identified-${v.id}` });
  checkbox.checked = identified;
  checkbox.addEventListener("change", () => toggleIdentified(v.id, checkbox.checked));

  const rows = [
    ["Criterion", criterionLabel(v.wcag)],
    v.related_wcag.length ? ["Related", v.related_wcag.map(criterionLabel).join("; ")] : null,
    ["Element", el("span", {}, `${v.element} `, el("code", { text: v.selector }))],
    ["Issue", v.description],
    ["How to find", v.how_to_find],
    ["Fix", v.fix],
  ].filter(Boolean);

  return el(
    "li",
    { class: `violation${identified ? " is-identified" : ""}`, id: `violation-${v.id}` },
    el("h4", {}, el("span", { class: "violation-id", text: `${v.id} ` }), v.title),
    el("dl", {}, ...rows.flatMap(([term, value]) => [el("dt", { text: term }), el("dd", {}, value)])),
    el(
      "p",
      { class: "matches muted" },
      matches.length
        ? `Possible matches in your findings: ${matches.map((m) => `#${m.n}`).join(", ")} (same or related criterion).`
        : "No findings cite this criterion. Check your findings in case you logged it under a different one."
    ),
    el("label", { class: "check", for: checkbox.id }, checkbox, `I identified ${v.id}: ${v.title}`)
  );
}

function toggleIdentified(id, checked) {
  state.identified = checked
    ? [...new Set([...state.identified, id])]
    : state.identified.filter((x) => x !== id);
  saveState();
  $(`violation-${id}`).classList.toggle("is-identified", checked);
  renderScore();
  renderScenarioList();
}

function renderScore() {
  const violations = activeViolations();
  const total = violations.length;
  const found = violations.filter((v) => state.identified.includes(v.id));
  const missed = violations.filter((v) => !state.identified.includes(v.id));
  const percent = Math.round((found.length / total) * 100);

  els.score.replaceChildren(
    el("span", { class: "score-value", text: `${found.length} of ${total} found` }),
    el("span", { text: `${percent}% of known violations identified · ${state.findings.length} findings logged` })
  );

  const item = (v) => el("li", {}, el("a", { href: `#violation-${v.id}`, text: `${v.id}: ${v.title}` }));
  els.identifiedList.replaceChildren(...(found.length ? found.map(item) : [el("li", { text: "None marked yet." })]));
  els.missedList.replaceChildren(...(missed.length ? missed.map(item) : [el("li", { text: "None. Every known violation identified." })]));
}

function resetAudit() {
  if (!window.confirm("Start a new attempt? All findings and results will be deleted, and the audit page will get a new set of defects.")) return;
  state = emptyState();
  saveState();
  resetForm();
  renderAll();
  announce(`New attempt ${state.attempt} started. Findings cleared and a new set of defects selected.`);
  els.formHeading.focus();
}

function renderAll() {
  if (scenario) renderScenario();
  renderFindings();
  renderAuditState();
  if (state.submitted) renderResults();
}

function showLoadError(err) {
  els.loadError.textContent = `Could not load scenario data (${err.message}). Serve the project over HTTP, for example with "python3 -m http.server", rather than opening the file directly.`;
  els.loadError.hidden = false;
  console.error(err);
}

/* ---------- Init ---------- */

/* ---------- Theme ---------- */

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function renderThemeButton() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  els.themeBtn.textContent = `Switch to ${next} theme`;
}

function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {
    // Storage blocked: the theme still applies for this visit.
  }
  renderThemeButton();
  announce(`${next === "dark" ? "Dark" : "Light"} theme on.`);
}

async function init() {
  els.themeBtn.addEventListener("click", toggleTheme);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderThemeButton);
  renderThemeButton();
  els.themeBtn.hidden = false;
  els.form.addEventListener("submit", handleSubmitFinding);
  els.cancelBtn.addEventListener("click", cancelEdit);
  els.wcag.addEventListener("change", renderCriterionHelp);
  els.submitBtn.addEventListener("click", submitAudit);
  els.resetBtn.addEventListener("click", resetAudit);
  for (const input of [els.location, els.description]) {
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true" && input.value.trim()) setFieldError(input, "");
    });
  }

  try {
    const [scenarioData, wcag] = await Promise.all([
      fetchJson("data/scenarios.json"),
      fetchJson("data/wcag-criteria.json"),
    ]);
    scenarios = scenarioData.scenarios;
    criteria = new Map(wcag.criteria.map((c) => [c.id, c]));
    populateCriteria();
    // Load every scenario's defect pool so the list can show each one's status.
    await Promise.all(scenarios.map((s) => loadScript(s.attempt_script)));
    let selected = null;
    try {
      selected = localStorage.getItem(SELECTED_KEY);
    } catch (err) {
      // Fall back to the first scenario.
    }
    await selectScenario(selected);
  } catch (err) {
    showLoadError(err);
    renderAll();
  }
}

init();
