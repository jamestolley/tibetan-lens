const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const errors = [];

function collectJsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(full);
    }
  }
  return results;
}

const jsFiles = ["src", "data"].flatMap((subdir) => collectJsFiles(path.join(root, subdir)));

for (const file of jsFiles) {
  try {
    execSync(`node --check "${file}"`, { stdio: "pipe" });
  } catch (error) {
    errors.push(`Syntax error in ${path.relative(root, file)}:\n${error.stderr?.toString() || error.message}`);
  }
}

function extractHtmlIds(html) {
  const ids = new Set();
  const regex = /id=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

function extractReferencedIds(js) {
  const ids = new Set();
  const regex = /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = regex.exec(js)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

// Extension pages: each HTML file and the script that drives it.
const pages = [
  { html: "src/options/index.html", js: "src/options/index.js" },
  { html: "src/popup/index.html", js: "src/popup/index.js" },
  { html: "pages/dictionary.html", js: "src/dictionary/index.js" },
  { html: "pages/words.html", js: "src/words/index.js" }
];

for (const page of pages) {
  const htmlPath = path.join(root, page.html);
  const jsPath = path.join(root, page.js);
  if (!fs.existsSync(htmlPath) || !fs.existsSync(jsPath)) {
    errors.push(`Missing extension page file: ${page.html} or ${page.js}`);
    continue;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const js = fs.readFileSync(jsPath, "utf8");
  const htmlIds = extractHtmlIds(html);
  const referencedIds = extractReferencedIds(js);
  const missing = [...referencedIds].filter((id) => !htmlIds.has(id));
  if (missing.length) {
    errors.push(`${page.js} references IDs missing from ${page.html}: ${missing.join(", ")}`);
  }
}

function extractI18nKeysFromHtml(html) {
  const keys = new Set();
  const regex = /data-i18n(?:-title|-placeholder)?=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function extractI18nKeysFromJs(js) {
  const keys = new Set();
  const regex = /(?:extension\.i18n|i18n)\.getMessage\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = regex.exec(js)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

const messagesPath = path.join(root, "_locales", "en", "messages.json");
let messageKeys = new Set();
if (fs.existsSync(messagesPath)) {
  try {
    const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
    messageKeys = new Set(Object.keys(messages));
  } catch (error) {
    errors.push(`Could not parse _locales/en/messages.json: ${error.message}`);
  }
} else {
  errors.push("Missing _locales/en/messages.json");
}

for (const page of pages) {
  const htmlPath = path.join(root, page.html);
  if (!fs.existsSync(htmlPath)) {
    continue;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const htmlKeys = extractI18nKeysFromHtml(html);
  const missing = [...htmlKeys].filter((key) => !messageKeys.has(key));
  if (missing.length) {
    errors.push(`Missing i18n message keys for ${page.html} [data-i18n]: ${missing.join(", ")}`);
  }
  if (!/src="[^"]*shared\/i18n\.js"/.test(html)) {
    errors.push(`${page.html} does not load shared/i18n.js`);
  }
}

for (const file of jsFiles) {
  if (path.basename(file) === "i18n.js") {
    continue;
  }
  const js = fs.readFileSync(file, "utf8");
  const jsKeys = extractI18nKeysFromJs(js);
  const missing = [...jsKeys].filter((key) => !messageKeys.has(key));
  if (missing.length) {
    errors.push(`Missing i18n message keys in ${path.relative(root, file)}: ${missing.join(", ")}`);
  }
}

// Every locale must define exactly the English keys, with non-empty messages
// that fit Chrome Web Store limits for the localized name and description.
const localesDir = path.join(root, "_locales");
for (const locale of fs.readdirSync(localesDir)) {
  const file = path.join(localesDir, locale, "messages.json");
  let messages;
  try {
    messages = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`Could not parse _locales/${locale}/messages.json: ${error.message}`);
    continue;
  }
  const keys = new Set(Object.keys(messages));
  const missing = [...messageKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !messageKeys.has(key));
  const empty = [...keys].filter((key) => !messages[key]?.message?.trim());
  if (missing.length) errors.push(`_locales/${locale} is missing keys: ${missing.join(", ")}`);
  if (extra.length) errors.push(`_locales/${locale} has keys not in en: ${extra.join(", ")}`);
  if (empty.length) errors.push(`_locales/${locale} has empty messages: ${empty.join(", ")}`);
  for (const key of ["extensionName", "extensionFullName"]) {
    if ((messages[key]?.message || "").length > 75) {
      errors.push(`_locales/${locale} ${key} exceeds 75 characters`);
    }
  }
  if ((messages.extensionDescription?.message || "").length > 132) {
    errors.push(`_locales/${locale} extensionDescription exceeds 132 characters`);
  }
}

const manifestPath = path.join(root, "manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = fs.readFileSync(manifestPath, "utf8");
  if (!manifest.includes('"src/shared/i18n.js"')) {
    errors.push("manifest.json content_scripts does not include src/shared/i18n.js");
  }
} else {
  errors.push("Missing manifest.json");
}

// Spaced-repetition scheduler in src/shared/wordList.js (FSRS via ts-fsrs).
{
  const vm = require("vm");
  const context = { console, Date, Math };
  context.globalThis = context;
  context.self = context;
  vm.createContext(context);
  for (const file of ["src/shared/ts-fsrs.js", "src/shared/wordList.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  const { schedule, previewSchedule, migrateReview, GRADES, STATES } = context.TibetanExtension.wordList;
  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * MINUTE;
  const now = Date.UTC(2026, 0, 1);
  const exact = { fuzz: false };
  const fresh = migrateReview(null, now);

  const expectations = [];
  const learning = schedule(fresh, GRADES.good, now, exact);
  expectations.push(["a new card graded 'good' enters a short learning step", learning.state === STATES.learning && learning.due - now <= 10 * MINUTE]);

  let card = learning;
  let at = learning.due;
  const intervals = [];
  for (let i = 0; i < 4; i += 1) {
    card = schedule(card, GRADES.good, at, exact);
    intervals.push(card.scheduled_days);
    at = card.due;
  }
  expectations.push(["repeated 'good' answers graduate the card to review", card.state === STATES.review]);
  expectations.push(["review intervals keep growing", intervals.every((days, i) => i === 0 || days > intervals[i - 1])]);

  const lapse = schedule(card, GRADES.again, at, exact);
  expectations.push([
    "'again' on a review card counts a lapse and relearns within minutes",
    lapse.lapses === 1 && lapse.state === STATES.relearning && lapse.due - at < 30 * MINUTE
  ]);

  const preview = previewSchedule(card, at, exact);
  expectations.push([
    "preview orders intervals again < hard < good < easy",
    preview.again.due < preview.hard.due && preview.hard.due < preview.good.due && preview.good.due < preview.easy.due
  ]);
  expectations.push(["preview matches schedule()", preview.good.due === schedule(card, GRADES.good, at, exact).due]);

  const strict = schedule(card, GRADES.good, at, { fuzz: false, retention: 0.95 });
  expectations.push(["a higher target retention gives shorter intervals", strict.scheduled_days < preview.good.scheduled_days]);

  const legacy = migrateReview({ due: now + 5 * DAY, interval: 8, ease: 2.5, reps: 3, lapses: 1, last: now - 3 * DAY }, now);
  expectations.push([
    "SM-2 records migrate to FSRS review state, keeping due date and history",
    legacy.state === STATES.review && legacy.due === now + 5 * DAY && legacy.stability === 8 && legacy.lapses === 1 && legacy.reps === 3
  ]);
  const legacyNext = schedule(legacy, GRADES.good, legacy.due, exact);
  expectations.push(["migrated records keep scheduling forward", legacyNext.due > legacy.due && legacyNext.scheduled_days >= 8]);

  // Stages and the study queue.
  const { stageOf, getStudyQueue } = context.TibetanExtension.wordList;
  const reviewCard = (days, dueOffset) => ({ ...card, scheduled_days: days, due: now + dueOffset });
  const word = (id, review, extra = {}) => ({ headword: `w${id}`, savedAt: now - id * MINUTE, review, ...extra });
  expectations.push(["unstudied words are 'new'", stageOf(word(1, fresh)) === "new"]);
  expectations.push(["learning-step words are 'learning'", stageOf(word(1, learning)) === "learning"]);
  expectations.push(["short review intervals are 'reviewing'", stageOf(word(1, reviewCard(10, DAY))) === "reviewing"]);
  expectations.push(["intervals of 21+ days are 'mastered'", stageOf(word(1, reviewCard(21, DAY))) === "mastered"]);

  const savedOnly = Array.from({ length: 30 }, (_, i) => word(i, fresh));
  const firstDay = getStudyQueue(savedOnly, { newWordsPerDay: 10 }, now);
  expectations.push([
    "new words are introduced up to the daily allowance, oldest saved first",
    firstDay.newWords.length === 10 && firstDay.newWords[0].headword === "w29" && firstDay.limitReason === "daily" && firstDay.waiting === 30
  ]);
  const introduced = savedOnly.map((w, i) => (i < 4 ? { ...w, review: learning, firstReviewedAt: now } : w));
  expectations.push([
    "words started today use up the allowance",
    getStudyQueue(introduced, { newWordsPerDay: 10 }, now).newWords.length === 6
  ]);
  const backlog = [...Array.from({ length: 100 }, (_, i) => word(100 + i, reviewCard(5, -DAY))), ...savedOnly];
  const paused = getStudyQueue(backlog, { newWordsPerDay: 10 }, now);
  expectations.push([
    "a review backlog pauses new words but keeps reviews",
    paused.newWords.length === 0 && paused.limitReason === "backlog" && paused.reviews.length === 100
  ]);
  const busy = [...Array.from({ length: 150 }, (_, i) => word(300 + i, reviewCard(5, DAY))), ...savedOnly];
  expectations.push([
    "too many words in progress pauses new words",
    getStudyQueue(busy, { newWordsPerDay: 10 }, now).limitReason === "active"
  ]);
  const mastered = [...Array.from({ length: 500 }, (_, i) => word(600 + i, reviewCard(40, DAY))), ...savedOnly];
  expectations.push([
    "mastered words never block new ones (no cap on total words)",
    getStudyQueue(mastered, { newWordsPerDay: 10 }, now).newWords.length === 10
  ]);

  const knownLater = word(900, { ...card, due: now + 100 * DAY }, { known: true });
  const knownDue = word(901, { ...card, due: now - DAY }, { known: true });
  expectations.push(["known words are their own stage", stageOf(knownLater) === "known"]);
  const withKnown = getStudyQueue([knownLater, knownDue, ...savedOnly], { newWordsPerDay: 10 }, now);
  expectations.push([
    "known words skip review until their check-in is due, and never count as in progress",
    withKnown.reviews.length === 1 && withKnown.reviews[0] === knownDue && withKnown.active === 0
  ]);

  expectations
    .filter(([, passed]) => !passed)
    .forEach(([name]) => errors.push(`wordList: expected ${name}`));
}

if (errors.length) {
  console.error("Tests failed:");
  for (const error of errors) {
    console.error(`\n${error}`);
  }
  process.exit(1);
}

console.log(`All ${jsFiles.length} JavaScript files passed syntax check, UI IDs and i18n keys are consistent.`);
