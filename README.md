# Accessibility Audit Training Lab

A practice environment for WCAG 2.2 conformance audits. You audit a realistic web page with known, intentionally injected Level A/AA violations, document what you find, and then compare your report against an answer key to see exactly what you caught and what you missed.

**Try it:** <https://daymond-blair.github.io/accessibility-audit-training-lab/>. Select **See a sample audit** to see a finished, scored audit in one click.

Built with vanilla HTML, CSS and JavaScript. No frameworks, build step or backend.

## Why this exists

A WCAG conformance audit is more than spotting problems. A professional audit follows a repeatable workflow:

1. **Investigation:** systematically testing a page with a keyboard, a screen reader, visual checks, code inspection and automated tools.
2. **Reproduction:** confirming each issue reliably and knowing the exact steps and conditions that expose it.
3. **Documentation:** recording each finding clearly: where it is, what fails, who it affects, and which success criterion it violates.
4. **Remediation:** recommending a specific, correct fix.

The only way to get good at this workflow is repetition. The obvious way to practise is to pick a random website and audit it, but **auditing a random site gives you no feedback.** You never learn which violations you missed, so you can't tell whether a clean result means the site is accessible or your testing has gaps. Blind spots stay blind.

This lab closes that loop. Every violation on the audit page is known and documented. Everything else on the page has been verified to pass, so a missed item is a real gap in your process rather than an ambiguity in the test. After you submit, the answer key shows each violation with how to find it (reproduction) and how to fix it (remediation). You can compare your own documentation against that model, not just tick a box.

There are three scenarios, each covering a different kind of page that audits often focus on:

| Scenario | Page | What it exercises |
|---|---|---|
| **Fernhill Coworking** | Marketing landing page | Navigation, a pricing table, testimonials, a contact form |
| **Larkspur Outdoor** | E-commerce product page | An image gallery, product options, a quantity stepper, cart and size-guide dialogs, a tooltip, reflow and text spacing |
| **Cedar Valley Rec Center** | Registration form | Labels and instructions, validation, error messages and summaries, timing, re-entry and a review step before payment |

Each attempt is different. Every scenario has a pool of 20 possible defects, and each attempt randomly activates 10 of them, so you can practise repeatedly without memorising the answers.

It is also deliberately designed so that **automated tools are not enough.** Even with all 20 defects active, axe-core detects only 7 on Fernhill, 5 on Larkspur and 1 on Cedar Valley. The rest need manual keyboard, screen reader and visual testing, the same skills a real audit and an interview audit exercise test.

## How the project was specified

I wrote a structured brief before any code existed and used it to direct Claude Code (an AI coding agent) through the build. Before the build, I used v0 (Vercel's AI prototyping tool) to refine the brief and visualize how the app and audit pages might look. The full prompt is in [`docs/project-spec.md`](docs/project-spec.md). Each section addresses one aspect of the problem:

| Section of the brief | What it pinned down | Why it mattered |
|---|---|---|
| **Project overview** | Simulate a real audit: examine, document, compare against known violations | Set the goal as practising a workflow rather than a quiz |
| **Features** | One page, 10 violations, a findings log (add, edit, delete), submit, answer key, manual marking, score, reset | Defined the minimum loop: audit, document, get feedback, repeat |
| **WCAG reference library** | All active 2.2 A/AA criteria from W3C sources, a fixed schema, AAA and obsolete criteria excluded, validated against the spec | Grounded every finding and answer in the official standard instead of AI recall |
| **Scenario generation** | Distinct, reproducible defects across keyboard, screen reader, semantics, forms and visual design; answer key kept separate and hidden | Required genuine, testable failures covering the full range of audit skills, not arbitrary bugs |
| **Technical** | Vanilla stack, JSON data, localStorage, static hosting, no backend or paid APIs | Kept it simple, free to run and easy to deploy for demos |
| **Accessibility** | The training app itself meets WCAG 2.2 AA; the defective page is kept separate; injected defects are never auto-fixed | An accessibility tool has to be accessible, and the defects must survive as test material |
| **UI** | QA-tool styling, responsive, a professional audit-report form, no gamification | Mirrors a professional audit, not a game |
| **Development approach** | MVP first, one scenario, no runtime AI, explain the plan before building, verify it runs | Scoped the AI's work and required a plan and verification instead of unchecked output |

After the MVP worked, I extended it in small, separately verified steps: reproduction and fix fields in the findings log, so reports mirror the answer key, then randomized defects for repeated practice, then e-commerce and form validation scenarios. Randomization reverses one MVP rule, "no randomized scenario creation", once the fixed version had proved the concept.

## How AI output was verified

An AI agent wrote the code, injected the defects and drafted the WCAG library. None of that output was trusted without checks, and every check below can be re-run (see [Run the tests](#run-the-tests)):

- **WCAG library:** `tools/validate_wcag.py` fetches the official W3C Recommendation and confirms that the JSON contains exactly the 55 active Level A and AA criteria, with matching ids, names and levels.
- **Injected defects:** a browser test harness switched on each of the 60 defects in isolation and confirmed it is present, behaves as described (including keyboard traps, focus movement, timing and pointer behavior) and changes nothing else.
- **No unintended violations:** with no defects active, each page has zero axe-core violations, passes a computed contrast scan of every text element, reflows at 320px and survives the WCAG text-spacing overrides. Interactive states were checked too: open dialogs, the open tooltip, form errors and the review step. With each defect active alone, the automated tools flag only that defect. A missed item is always a real gap, never noise.
- **Randomization:** 2,000 random attempts each produced 10 distinct defects, 2 from each group, with every defect active about half the time. The page and the app always agree on which defects an attempt contains.
- **The training app:** axe-core reported zero violations, contrast passes in light and dark mode, the layout reflows at 320px, and focus management and screen reader announcements were tested for every action.

This matters in accessibility work in particular. AI-generated code often introduces accessibility defects, so AI-assisted work is only useful when it's verified against the standard.

## How it works

1. **Pick a scenario and launch it.** The page opens in a new tab with this attempt's 10 defects. Each scenario keeps its own findings, attempt and score. Test it with any tools you like: keyboard, screen reader, browser DevTools, axe or WAVE, a contrast checker. Defects are applied when the page loads, so inspect the live DOM in DevTools rather than View Source.
2. **Log findings.** For each issue, record the element or location and a description. Optionally add steps to reproduce, a recommended fix and the WCAG success criterion, matching the fields in the answer key. Choosing a criterion shows its definition and testing technique. You can edit and delete findings, and they are saved to `localStorage`.
3. **Submit.** Your findings are locked and the answer key for this attempt is revealed, along with a link to the corrected page for side-by-side comparison.
4. **Score.** Tick each known violation you identified. Findings that cite the same or a related criterion are suggested as possible matches. The score, identified list and missed list update as you go.
5. **New attempt** clears the current scenario's findings and picks a new set of defects.

**Just looking?** Select **See a sample audit** at the top of the app. It shows a finished audit of the current scenario, with example findings, a score and the answer key, including links to the page as audited and the corrected page. The sample is never saved and doesn't affect your own audit.

The app has light and dark themes. It follows your system setting until you pick one with the theme button in the header, and then it remembers your choice.

### Randomized defects

Each scenario's pool has 20 defects in five groups of four. Each attempt activates **two from every group**, so every audit has a balanced mix.

**Fernhill Coworking (landing page)**

| Group | Defects (WCAG success criterion) |
|---|---|
| Page structure | Missing page language (3.1.1) · fake headings (1.3.1) · meaningless page title (2.4.2) · zoom disabled (1.4.4) |
| Keyboard and interaction | No focus indicator (2.4.7) · div used as a button (2.1.1) · positive tabindex (2.4.3) · select that submits the form (3.2.2) |
| Screen reader | Unnamed close button (4.1.2) · image without alt (1.1.1) · unnamed icon links (2.4.4) · unannounced confirmation (4.1.3) |
| Forms | Placeholder-only labels (3.3.2) · missing autocomplete (1.3.5) · color-only errors (3.3.1) · faint field borders (1.4.11) |
| Visual | Color-only table (1.4.1) · low-contrast text (1.4.3) · auto-rotating content (2.2.2) · tiny tap targets (2.5.8) |

**Larkspur Outdoor (e-commerce)**

| Group | Defects (WCAG success criterion) |
|---|---|
| Layout and structure | Foreign-language review not marked (3.1.2) · table without headers (1.3.1) · fixed-width layout (1.4.10) · text clipped by spacing (1.4.12) |
| Keyboard and interaction | Swatches not keyboard operable (2.1.1) · size guide keyboard trap (2.1.2) · cart dialog doesn't take focus (2.4.3) · action on pointer-down (2.5.2) |
| Screen reader | Product image without alt (1.1.1) · unnamed quantity buttons (4.1.2) · unannounced add to cart (4.1.3) · name doesn't match label (2.5.3) |
| Options and controls | Option groups without fieldset or legend (1.3.1) · color-only link (1.4.1) · tiny quantity buttons (2.5.8) · faint selection ring (1.4.11) |
| Visual and content | Low-contrast stock text (1.4.3) · image of text (1.4.5) · sensory instructions (1.3.3) · tooltip can't be dismissed or hovered (1.4.13) |

**Cedar Valley Rec Center (form validation)**

| Group | Defects (WCAG success criterion) |
|---|---|
| Labels and instructions | Date format not explained (3.3.2) · hint not linked to field (1.3.1) · duplicate "Name" labels (2.4.6) · required shown by red only (1.4.1) |
| Error handling | Error shown by color only (3.3.1) · errors without suggestions (3.3.3) · error summary not announced (4.1.3) · errors not linked to fields (1.3.1) |
| Interaction and timing | No focus indicator (2.4.7) · radio change moves focus (3.2.2) · div used as a checkbox (2.1.1) · silent timeout (2.2.1) |
| Process and data entry | Address must be retyped (3.3.7) · no review before payment (3.3.4) · missing autocomplete (1.3.5) · toggle state not exposed (4.1.2) |
| Visual and layout | Low-contrast hints (1.4.3) · sticky bar hides focus (2.4.11) · sensory instructions (1.3.3) · faint checkbox borders (1.4.11) |

Each attempt has a six-character code, such as `HUX8UX`, and the app opens the page as `scenarios/fernhill/index.html?attempt=HUX8UX`. The same code always produces the same defects, so reloading the page never reshuffles them. There are 7,776 possible combinations.

Other URL options, for comparison and testing:

- `?defects=none`: the corrected page, with no defects.
- `?defects=all`: all 20 defects at once.
- `?defects=V03,V14`: specific defects, by answer-key id.
- No parameter: a fixed default set (for Fernhill, the original 10 from the first version).

## Project structure

```
index.html                         Training app (scenario list, findings log, results)
css/app.css                        App styles (light/dark, visible focus, responsive)
js/app.js                          App logic: per-scenario state, findings CRUD, scoring
data/wcag-criteria.json            All 55 WCAG 2.2 Level A/AA success criteria
data/scenarios.json                Scenario list shown on the dashboard
data/answer-keys/<scenario>.json   Answer keys (fetched only after submission)
scenarios/shared/attempt-engine.js Picks each attempt's defects (shared by pages and app)
scenarios/<scenario>/attempt.js    The scenario's defect groups
scenarios/<scenario>/script.js     Applies the active defects and runs the page
scenarios/<scenario>/index.html    The audit page (accessible by default)
tools/validate_wcag.py             Validates the WCAG data and answer keys
tests/                             Browser test suites and their runner
docs/project-spec.md            The original project brief
```

Each page in `scenarios/` is built correctly, and its `script.js` breaks it on purpose according to the attempt. **Do not remove the defect code**, because the answer key depends on it. Apart from the active defects, the page passes, so testers aren't penalized for finding real issues that aren't in the key. If you add a defect, add it to `attempt.js` and the answer key together. `tools/validate_wcag.py` checks that the two match.

## Run locally

The app loads JSON with `fetch`, so it must be served over HTTP. Opening `index.html` directly from disk will not work.

```bash
git clone https://github.com/Daymond-Blair/accessibility-audit-training-lab.git
cd accessibility-audit-training-lab
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Validate the WCAG data

```bash
python3 tools/validate_wcag.py
```

This fetches the [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/) and confirms that `data/wcag-criteria.json` contains exactly the active Level A and AA criteria (31 A, 24 AA, with 4.1.1 Parsing excluded as obsolete), with matching ids, names and levels and all required fields. It also checks that every criterion referenced in the answer keys exists, and that each answer key lists exactly the defects in its scenario's `attempt.js`. To validate offline, pass a saved copy of the spec: `python3 tools/validate_wcag.py spec.html`.

## Run the tests

The browser test suites behind the verification claims above are in `tests/`. They need Google Chrome (or Chromium) and an internet connection, because axe-core is loaded from cdnjs.

```bash
python3 tests/run_tests.py            # all suites, about 2 minutes
python3 tests/run_tests.py app -v     # one suite, printing every check
```

| Suite | What it checks |
|---|---|
| `app` | Findings log: add, edit, delete, validation, persistence, submit, scoring, reset, focus management, axe and contrast |
| `fernhill` | Randomizer properties, the corrected page, every Fernhill defect alone and all together, and the app's attempt flow |
| `larkspur-cedarvalley` | The corrected e-commerce and form pages in all their interactive states, plus every defect alone and all together |
| `multi-scenario` | Scenario switching, separate progress per scenario, persistence, reflow at 320px, and the 90-second timeout defect |

The runner serves the project on a random local port with a temporary browser profile, so it never touches findings you saved while practising. You can also open a suite in a browser through any local server, for example `http://localhost:8000/tests/app.html`, and read the results on the page. Don't do this on the address where you practise, because the suites clear that address's saved findings.

## Deploy

The project is a plain static site with no build step, so it runs on any static host.

### GitHub Pages (recommended for this repo)

The code is already on GitHub, so this needs no extra account and redeploys automatically on every push.

1. On GitHub, open the repo and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`, and click **Save**.
3. After a minute or two the site is live at `https://<username>.github.io/<repo>/`.

All paths in the project are relative, so it works from that sub-folder URL.

### Netlify

**Drag and drop (fastest):**
1. Sign in at <https://app.netlify.com>.
2. Go to **Sites → Add new site → Deploy manually**.
3. Drag the project folder onto the upload area.

**From a Git repository (auto-deploys on push):**
1. Push the project to GitHub, GitLab or Bitbucket.
2. In Netlify, choose **Add new site → Import an existing project** and select the repo.
3. Leave **Build command** empty and set **Publish directory** to the folder containing `index.html` (`.` if it is the repo root).
4. Click **Deploy**.


## Notes and limitations

- On a static host the answer key and the defect code are public files. They stay out of the interface until submission, but a determined user could read them directly. This is a practice tool that runs on the honor system. Real secrecy would need a backend.
- Findings live only in the current browser's `localStorage`.
- To add a scenario, create a folder under `scenarios/` with an `attempt.js` that registers its defect groups, an answer key under `data/answer-keys/` with the same name, and an entry in `data/scenarios.json`. The app picks it up automatically.

## Credits

Success criterion names and levels come from the W3C [WCAG 2.2](https://www.w3.org/TR/WCAG22/) Recommendation. Definitions and testing guidance are concise paraphrases. See [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/) for the authoritative text. Fernhill Coworking, Larkspur Outdoor and Cedar Valley Recreation Center are fictional organizations.
