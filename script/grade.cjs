#!/usr/bin/env node

/**
 * Lab Autograder — 4-2-js-advance-main
 *
 * Marking:
 * - 80 marks for TODOs (JS checks)
 * - 20 marks for submission timing (deadline-based)
 *   - On/before deadline => 20/20
 *   - After deadline     => 10/20
 *
 * Deadline: 04 Feb 2026 11:59 PM (Asia/Riyadh, UTC+03:00)
 *
 * Notes:
 * - Ignores HTML comments and JS comments (so examples inside comments do NOT count).
 * - Light checks only (not strict): looks for top-level structure and key constructs.
 * - Accepts common equivalents and flexible naming.
 *
 * Update:
 * - Adds timing analytics to feedback (Riyadh time):
 *   1) Accepted (repo created_at)
 *   2) Accept -> first push duration (based on first push-triggered workflow run)
 *   3) 2nd -> 3rd push duration (based on 2nd and 3rd push-triggered workflow runs)
 *
 * Requires:
 * - Running inside GitHub Actions (GITHUB_TOKEN + GITHUB_REPOSITORY available)
 * - Your autograder workflow must trigger on "push" (so workflow runs represent pushes)
 */

(async () => {
  try {
    const fs = require("fs");
    const path = require("path");
    const { execSync } = require("child_process");

    // Node 18+ has global fetch in Actions; keep a safe fallback if not present.
    const fetch = global.fetch || require("node-fetch");

    const ARTIFACTS_DIR = "artifacts";
    const FEEDBACK_DIR = path.join(ARTIFACTS_DIR, "feedback");
    fs.mkdirSync(FEEDBACK_DIR, { recursive: true });

    /* -----------------------------
       Deadline (Asia/Riyadh)
       04 Feb 2026, 11:59 PM
    -------------------------------- */
    const DEADLINE_RIYADH_ISO = "2026-02-04T23:59:00+03:00";
    const DEADLINE_MS = Date.parse(DEADLINE_RIYADH_ISO);

    // Submission marks policy
    const SUBMISSION_MAX = 20;
    const SUBMISSION_LATE = 10;

    /* -----------------------------
       TODO marks (out of 80)
       (You can adjust later if needed.)
    -------------------------------- */
    const tasks = [
      { id: "todo1", name: "TODO 1: Object with getters & setters (Student)", marks: 16 },
      { id: "todo2", name: "TODO 2: Object as map + for...in loop", marks: 10 },
      { id: "todo3", name: "TODO 3: String charAt() & length", marks: 8 },
      { id: "todo4", name: "TODO 4: Date (getDate/getMonth/getFullYear)", marks: 8 },
      { id: "todo5", name: "TODO 5: Array + spread (Math.min/Math.max from 10 nums)", marks: 12 },
      { id: "todo6", name: "TODO 6: Exceptions (try/catch/finally + empty array risky line)", marks: 12 },
      { id: "todo7", name: "TODO 7: Regex + forEach (match 'ab' using pattern.test)", marks: 14 },
    ];

    const STEPS_MAX = tasks.reduce((sum, t) => sum + t.marks, 0); // 80
    const TOTAL_MAX = STEPS_MAX + SUBMISSION_MAX; // 100

    /* -----------------------------
       Helpers
    -------------------------------- */
    function safeRead(filePath) {
      try {
        return fs.readFileSync(filePath, "utf8");
      } catch {
        return null;
      }
    }

    function mdEscape(s) {
      return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function round2(n) {
      return Math.round(n * 100) / 100;
    }

    function splitMarks(stepMarks, missingCount, totalChecks) {
      if (missingCount <= 0) return stepMarks;
      const perItem = stepMarks / totalChecks;
      const deducted = perItem * missingCount;
      return Math.max(0, round2(stepMarks - deducted));
    }

    function stripHtmlComments(html) {
      return html.replace(/<!--[\s\S]*?-->/g, "");
    }

    /**
     * Strip JS comments while trying to preserve strings/templates.
     * Not a full parser, but robust enough for beginner labs and avoids
     * counting commented-out code.
     */
    function stripJsComments(code) {
      if (!code) return code;

      let out = "";
      let i = 0;

      let inSingle = false;
      let inDouble = false;
      let inTemplate = false;

      while (i < code.length) {
        const ch = code[i];
        const next = code[i + 1];

        // Handle string/template boundaries (with escapes)
        if (!inDouble && !inTemplate && ch === "'" && !inSingle) {
          inSingle = true;
          out += ch;
          i++;
          continue;
        }
        if (inSingle && ch === "'") {
          let backslashes = 0;
          for (let k = i - 1; k >= 0 && code[k] === "\\"; k--) backslashes++;
          if (backslashes % 2 === 0) inSingle = false;
          out += ch;
          i++;
          continue;
        }

        if (!inSingle && !inTemplate && ch === '"' && !inDouble) {
          inDouble = true;
          out += ch;
          i++;
          continue;
        }
        if (inDouble && ch === '"') {
          let backslashes = 0;
          for (let k = i - 1; k >= 0 && code[k] === "\\"; k--) backslashes++;
          if (backslashes % 2 === 0) inDouble = false;
          out += ch;
          i++;
          continue;
        }

        if (!inSingle && !inDouble && ch === "`" && !inTemplate) {
          inTemplate = true;
          out += ch;
          i++;
          continue;
        }
        if (inTemplate && ch === "`") {
          let backslashes = 0;
          for (let k = i - 1; k >= 0 && code[k] === "\\"; k--) backslashes++;
          if (backslashes % 2 === 0) inTemplate = false;
          out += ch;
          i++;
          continue;
        }

        // If not inside a string/template, strip comments
        if (!inSingle && !inDouble && !inTemplate) {
          // line comment
          if (ch === "/" && next === "/") {
            i += 2;
            while (i < code.length && code[i] !== "\n") i++;
            continue;
          }
          // block comment
          if (ch === "/" && next === "*") {
            i += 2;
            while (i < code.length) {
              if (code[i] === "*" && code[i + 1] === "/") {
                i += 2;
                break;
              }
              i++;
            }
            continue;
          }
        }

        out += ch;
        i++;
      }

      return out;
    }

    function findAnyHtmlFile() {
      const preferred = path.join(process.cwd(), "index.html");
      if (fs.existsSync(preferred)) return preferred;

      const ignoreDirs = new Set(["node_modules", ".git", ARTIFACTS_DIR]);
      const stack = [process.cwd()];

      while (stack.length) {
        const dir = stack.pop();
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const e of entries) {
          const full = path.join(dir, e.name);

          if (e.isDirectory()) {
            if (!ignoreDirs.has(e.name)) stack.push(full);
          } else if (e.isFile() && e.name.toLowerCase().endsWith(".html")) {
            return full;
          }
        }
      }
      return null;
    }

    function findStudentJsFile() {
      // Prefer common names
      const preferredNames = ["script.js", "app.js", "main.js", "index.js"];
      for (const name of preferredNames) {
        const p = path.join(process.cwd(), name);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
      }

      const ignoreDirs = new Set(["node_modules", ".git", ARTIFACTS_DIR]);
      const ignoreFiles = new Set(["grade.cjs", "grade.js"]);

      const stack = [process.cwd()];
      while (stack.length) {
        const dir = stack.pop();
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const e of entries) {
          const full = path.join(dir, e.name);

          if (e.isDirectory()) {
            if (!ignoreDirs.has(e.name)) stack.push(full);
          } else if (e.isFile()) {
            const lower = e.name.toLowerCase();
            if (ignoreFiles.has(lower)) continue;
            if (lower.endsWith(".js")) return full;
          }
        }
      }
      return null;
    }

    function normalizeHead(html) {
      const m = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
      return m ? m[1] : "";
    }

    /* Extract <script> tags; return array of { attrs, content } */
    function extractScriptTags(html) {
      const scripts = [];
      const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = re.exec(html)) !== null) {
        scripts.push({ attrs: m[1] || "", content: m[2] || "" });
      }
      return scripts;
    }

    function scriptHasSrc(attrs) {
      return /\bsrc\s*=\s*["'][^"']+["']/i.test(attrs || "");
    }

    function getScriptSrc(attrs) {
      const m = (attrs || "").match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      return m ? m[1] : null;
    }

    function hasAnyExternalScriptTag(html) {
      if (!html) return false;
      const scripts = extractScriptTags(html);
      return scripts.some(s => scriptHasSrc(s.attrs));
    }

    function jsLinkedSomewhereMatchesStudentFile(html, studentJsPath) {
      if (!html || !studentJsPath) return false;
      const studentBase = path.basename(studentJsPath).toLowerCase();
      const scripts = extractScriptTags(html);
      for (const s of scripts) {
        if (!scriptHasSrc(s.attrs)) continue;
        const src = (getScriptSrc(s.attrs) || "").toLowerCase();
        if (src.endsWith("/" + studentBase) || src === studentBase || src.endsWith(studentBase)) return true;
      }
      return false;
    }

    /* Roughly count numeric literals in array literals like: [1, 2, 3, ...] */
    function maxNumericCountInArrayLiterals(code) {
      if (!code) return 0;

      // very light; avoids grabbing object literals by requiring at least one comma
      const arrRe = /\[\s*([^\]]*?,[^\]]*?)\s*\]/g;
      let m;
      let best = 0;

      while ((m = arrRe.exec(code)) !== null) {
        const inside = m[1] || "";
        // match numbers: -12, 3.14, .5 (rare), 1e3
        const nums = inside.match(/(?<![\w$])[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?![\w$])/gi);
        if (nums && nums.length > best) best = nums.length;
      }

      return best;
    }

    /* -----------------------------
       GitHub timing analytics helpers
    -------------------------------- */
    async function ghJson(url, token) {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GitHub API error ${res.status} for ${url}: ${text.slice(0, 200)}`);
      }
      return res.json();
    }

    function formatRiyadh(iso) {
      if (!iso) return null;
      const d = new Date(iso);

      // Example output: "04/02/2026, 08:03:12" (en-GB)
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(d);

      // Convert dd/mm/yyyy, HH:MM:SS -> yyyy-mm-dd HH:MM:SS
      const [dd, mm, rest] = fmt.split("/");
      const [yyyy, time] = rest.split(",").map(s => s.trim());
      return `${yyyy}-${mm}-${dd} ${time} (Riyadh)`;
    }

    function minutesBetween(isoA, isoB) {
      if (!isoA || !isoB) return null;
      const a = Date.parse(isoA);
      const b = Date.parse(isoB);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      return Math.round(((b - a) / 60000) * 100) / 100; // 2 dp
    }

    async function getAcceptAndPushTimings() {
      const token = process.env.GITHUB_TOKEN;
      const repoFull = process.env.GITHUB_REPOSITORY; // "org/repo"
      if (!token || !repoFull) return { ok: false, reason: "Missing GITHUB_TOKEN or GITHUB_REPOSITORY." };

      const apiBase = "https://api.github.com";

      // Accept time proxy = repo created_at (repo created on acceptance)
      const repo = await ghJson(`${apiBase}/repos/${repoFull}`, token);
      const acceptedISO = repo.created_at || null;

      // Push times proxy = workflow runs triggered by "push"
      const runs = await ghJson(`${apiBase}/repos/${repoFull}/actions/runs?per_page=100`, token);
      const pushRuns = (runs.workflow_runs || [])
        .filter(r => (r.event || "").toLowerCase() === "push")
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)); // oldest -> newest

      const firstPushISO = pushRuns[0]?.created_at || null;
      const secondPushISO = pushRuns[1]?.created_at || null;
      const thirdPushISO = pushRuns[2]?.created_at || null;

      return {
        ok: true,
        acceptedISO,
        firstPushISO,
        secondPushISO,
        thirdPushISO,
        acceptedRiyadh: formatRiyadh(acceptedISO),
        firstPushRiyadh: formatRiyadh(firstPushISO),
        secondPushRiyadh: formatRiyadh(secondPushISO),
        thirdPushRiyadh: formatRiyadh(thirdPushISO),
        acceptToFirstMin: minutesBetween(acceptedISO, firstPushISO),
        secondToThirdMin: minutesBetween(secondPushISO, thirdPushISO),
        pushCount: pushRuns.length,
      };
    }

    /* -----------------------------
       Determine submission time
    -------------------------------- */
    let lastCommitISO = null;
    let lastCommitMS = null;

    try {
      lastCommitISO = execSync("git log -1 --format=%cI", { encoding: "utf8" }).trim();
      lastCommitMS = Date.parse(lastCommitISO);
    } catch {
      // fallback (still grades, but treat as "now")
      lastCommitISO = new Date().toISOString();
      lastCommitMS = Date.now();
    }

    /* -----------------------------
       Submission marks
    -------------------------------- */
    const isLate = Number.isFinite(lastCommitMS) ? lastCommitMS > DEADLINE_MS : true;
    const submissionScore = isLate ? SUBMISSION_LATE : SUBMISSION_MAX;

    /* -----------------------------
       Load student files
    -------------------------------- */
    const htmlFile = findAnyHtmlFile();
    const jsFile = findStudentJsFile();

    const htmlRaw = htmlFile ? safeRead(htmlFile) : null;
    const jsRaw = jsFile ? safeRead(jsFile) : null;

    const html = htmlRaw ? stripHtmlComments(htmlRaw) : null;
    const js = jsRaw ? stripJsComments(jsRaw) : null;

    const results = []; // { id, name, max, score, checklist[], deductions[] }

    /* -----------------------------
       Result helpers
    -------------------------------- */
    function addResult(task, required, missing) {
      const score = splitMarks(task.marks, missing.length, required.length);
      results.push({
        id: task.id,
        name: task.name,
        max: task.marks,
        score,
        checklist: required.map(r => `${r.ok ? "✅" : "❌"} ${r.label}`),
        deductions: missing.length ? missing.map(m => `Missing: ${m.label}`) : [],
      });
    }

    function failTask(task, reason) {
      results.push({
        id: task.id,
        name: task.name,
        max: task.marks,
        score: 0,
        checklist: [],
        deductions: [reason],
      });
    }

    /* -----------------------------
       Grade TODOs (JS)
    -------------------------------- */
    if (!js) {
      // If JS missing: fail all TODOs (1..7)
      for (const t of tasks) {
        failTask(t, jsFile ? `Could not read JS file at: ${jsFile}` : "No student .js file found.");
      }
    } else {
      const has = re => re.test(js);

      /* TODO1: Student object with getters & setters */
      {
        const required = [
          { label: "Has a Student object or similar (object literal / class / const student)", ok: has(/\b(student)\b/i) || has(/\bclass\s+Student\b/i) || has(/\bconst\s+\w+\s*=\s*\{/i) },
          { label: "Includes firstName property (or key)", ok: has(/\bfirstName\b\s*[:=]/i) || has(/\bfirstName\b/i) },
          { label: "Includes lastName property (or key)", ok: has(/\blastName\b\s*[:=]/i) || has(/\blastName\b/i) },
          { label: "Includes gpa property (or key)", ok: has(/\bgpa\b\s*[:=]/i) || has(/\bgpa\b/i) },
          { label: "Has getter fullName (get fullName()) OR equivalent accessor", ok: has(/\bget\s+fullName\s*\(/i) || has(/\bfullName\s*:\s*function\b/i) || has(/\bfullName\s*=\s*\(/i) },
          {
            label: "Has a setter for gpa or updateGpa (set gpa(...) or set updateGpa(...) or function updateGpa)",
            ok: has(/\bset\s+gpa\s*\(/i) || has(/\bset\s+updateGpa\s*\(/i) || has(/\bupdateGpa\s*\(\s*newGpa\b/i) || has(/\bfunction\s+updateGpa\s*\(/i),
          },
          {
            label: "Validation present for GPA range (0..4) (light check)",
            ok: has(/>=\s*0(\.0+)?/i) && (has(/<=\s*4(\.0+)?/i) || has(/<\s*4(\.0+)?/i)),
          },
          { label: "Logs something using getter(s) or object fields (console.log(...))", ok: has(/console\.log\s*\(/i) },
        ];
        const missing = required.filter(r => !r.ok);
        addResult(tasks[0], required, missing);
      }

      /* TODO2: Object as map + for...in */
      {
        const hasObjMap =
          has(/\b(const|let|var)\s+\w+\s*=\s*\{[\s\S]*?:[\s\S]*?\}/i) || has(/\{[\s\S]*?:[\s\S]*?\}/);

        const hasForIn = has(/for\s*\(\s*(const|let|var)?\s*\w+\s+in\s+\w+\s*\)\s*\{/i);
        const hasKeyValueUse = has(/\[\s*\w+\s*\]/) || has(/\.\s*\w+/);

        const required = [
          { label: "Creates an object used as a map (key:value pairs)", ok: hasObjMap },
          { label: "Uses a for...in loop", ok: hasForIn },
          { label: "Accesses value via obj[key] or similar inside loop (light)", ok: hasKeyValueUse },
          { label: "Logs key/value in loop using console.log(...)", ok: has(/for\s*\([\s\S]*?\)\s*\{[\s\S]*?console\.log\s*\(/i) },
        ];
        const missing = required.filter(r => !r.ok);
        addResult(tasks[1], required, missing);
      }

      /* TODO3: String charAt & length */
      {
        const required = [
          { label: "Creates a string (string literal or new String)", ok: has(/\bnew\s+String\s*\(/i) || has(/["'`][\s\S]*?["'`]/) },
          { label: "Uses .charAt(index)", ok: has(/\.charAt\s*\(\s*\d+\s*\)/i) || has(/\.charAt\s*\(/i) },
          { label: "Uses .length", ok: has(/\.length\b/i) },
          { label: "Logs outputs using console.log(...)", ok: has(/console\.log\s*\(/i) },
        ];
        const missing = required.filter(r => !r.ok);
        addResult(tasks[2], required, missing);
      }

      /* TODO4: Date day/month/year */
      {
        const required = [
          { label: "Creates a Date using new Date()", ok: has(/\bnew\s+Date\s*\(\s*\)/i) || has(/\bnew\s+Date\s*\(/i) },
          { label: "Uses getDate()", ok: has(/\.getDate\s*\(\s*\)/i) },
          { label: "Uses getMonth()", ok: has(/\.getMonth\s*\(\s*\)/i) },
          { label: "Uses getFullYear()", ok: has(/\.getFullYear\s*\(\s*\)/i) },
          { label: "Logs date parts using console.log(...)", ok: has(/console\.log\s*\(/i) },
        ];
        const missing = required.filter(r => !r.ok);
        addResult(tasks[3], required, missing);
      }

      /* TODO5: Array + spread, 10 numbers, Math.min/max */
      {
        const maxNums = maxNumericCountInArrayLiterals(js);
        const hasSpreadMin = has(/Math\.min\s*\(\s*\.\.\.\s*\w+/i) || has(/Math\.min\s*\(\s*\.\.\.\s*\[/i);
        const hasSpreadMax = has(/Math\.max\s*\(\s*\.\.\.\s*\w+/i) || has(/Math\.max\s*\(\s*\.\.\.\s*\[/i);

        const required = [
          { label: "Has an array literal with ~10 numeric values (light count)", ok: maxNums >= 10 },
          { label: "Uses Math.min(...arr) with spread syntax", ok: hasSpreadMin },
          { label: "Uses Math.max(...arr) with spread syntax", ok: hasSpreadMax },
          { label: "Logs min/max using console.log(...)", ok: has(/console\.log\s*\(/i) },
        ];

        const missing = required.filter(r => !r.ok);
        addResult(tasks[4], required, missing);
      }

      /* TODO6: Exceptions try/catch/finally (graded part only) */
      {
        const hasTry = has(/\btry\s*\{/i);
        const hasCatch = has(/\bcatch\s*\(\s*\w+\s*\)\s*\{/i) || has(/\bcatch\s*\{/i);
        const hasFinally = has(/\bfinally\s*\{/i);

        // Look for the risky access somewhere in try block (light)
        const tryBlock = (js.match(/\btry\s*\{([\s\S]*?)\}\s*(catch\b|finally\b)/i) || [])[1] || "";
        const riskyLineInTry =
          /\barr\s*\[\s*0\s*\]\s*\.\s*toString\s*\(\s*\)/i.test(tryBlock) ||
          /\barr\s*\[\s*0\s*\]\s*\.\s*toString\s*\(\s*\)/i.test(js);

        const hasCaughtLog =
          /catch[\s\S]*?console\.log\s*\([\s\S]*?["'`]Caught["'`][\s\S]*?\)/i.test(js) ||
          /console\.log\s*\([\s\S]*?["'`]Caught["'`][\s\S]*?\)/i.test(js);

        const hasFinallyLog =
          /finally[\s\S]*?console\.log\s*\([\s\S]*?["'`]Finally["'`][\s\S]*?\)/i.test(js) ||
          /console\.log\s*\([\s\S]*?["'`]Finally["'`][\s\S]*?\)/i.test(js);

        const required = [
          { label: "Uses try { ... }", ok: hasTry },
          { label: "Uses catch (e) { ... } (or catch { ... })", ok: hasCatch },
          { label: "Uses finally { ... }", ok: hasFinally },
          { label: "Runs risky line inside try (arr[0].toString()) (light)", ok: riskyLineInTry },
          { label: 'In catch, logs a message containing "Caught"', ok: hasCaughtLog },
          { label: 'In finally, logs a message containing "Finally"', ok: hasFinallyLog },
        ];

        const missing = required.filter(r => !r.ok);
        addResult(tasks[5], required, missing);
      }

      /* TODO7: Regex + forEach + pattern.test(word) and "matches!" log */
      {
        const hasWordsArray =
          has(/\bconst\s+words\s*=\s*\[\s*["'`]ban["'`]\s*,\s*["'`]babble["'`]\s*,\s*["'`]make["'`]\s*,\s*["'`]flab["'`]\s*\]/i) ||
          has(/\bwords\s*=\s*\[/i);

        const hasRegex = has(/\/ab\/[gimsuy]*/i) || has(/\bnew\s+RegExp\s*\(\s*["'`]ab["'`]/i);

        const hasForEach = has(/\.forEach\s*\(\s*\(?\s*\w+\s*\)?\s*=>/i) || has(/\.forEach\s*\(\s*function\s*\(/i);

        const hasPatternTest =
          has(/\.test\s*\(\s*\w+\s*\)/i) &&
          (has(/\bpattern\b/i) || has(/\bregex\b/i) || has(/\/ab\//i) || has(/new\s+RegExp/i));

        const hasMatchesLog =
          /console\.log\s*\(\s*[`"']\s*\$\{\s*\w+\s*\}\s+matches!\s*[`"']\s*\)/i.test(js) ||
          /console\.log\s*\([\s\S]*?matches!\s*["'`][\s\S]*?\)/i.test(js);

        const required = [
          { label: "Defines words array (given list or similar)", ok: hasWordsArray },
          { label: "Creates a RegExp to detect 'ab' ( /ab/ or new RegExp('ab') )", ok: hasRegex },
          { label: "Loops through words using forEach()", ok: hasForEach },
          { label: "Uses pattern.test(word) (or equivalent .test call)", ok: hasPatternTest },
          { label: 'Logs "<word> matches!" for matched words (light)', ok: hasMatchesLog },
        ];

        const missing = required.filter(r => !r.ok);
        addResult(tasks[6], required, missing);
      }
    }

    /* -----------------------------
       Final scoring
    -------------------------------- */
    const stepsScore = results.reduce((sum, r) => sum + r.score, 0);
    const totalScore = round2(stepsScore + submissionScore);

    /* -----------------------------
       Timing analytics block (3 things requested)
    -------------------------------- */
    let timingBlock = "";
    try {
      const t = await getAcceptAndPushTimings();
      if (t.ok) {
        const acceptLine = `- **Accepted (repo created):** ${t.acceptedRiyadh || "N/A"}`;

        const firstPushLine = `- **First push:** ${t.firstPushRiyadh || "N/A"} ${
          t.acceptToFirstMin != null ? `(**Accept → First push:** ${t.acceptToFirstMin} min)` : "(Accept → First push: N/A)"
        }`;

        // Third push-to-push duration means 2nd -> 3rd (if both exist)
        const thirdGapLine =
          t.secondPushRiyadh && t.thirdPushRiyadh
            ? `- **2nd → 3rd push duration:** ${t.secondToThirdMin ?? "N/A"} min (2nd: ${t.secondPushRiyadh}, 3rd: ${t.thirdPushRiyadh})`
            : `- **2nd → 3rd push duration:** N/A (need at least 3 pushes; detected pushes: ${t.pushCount})`;

        timingBlock = `${acceptLine}\n${firstPushLine}\n${thirdGapLine}\n`;
      } else {
        timingBlock = `- **Timing analytics:** N/A (${t.reason})\n`;
      }
    } catch (err) {
      timingBlock = `- **Timing analytics:** N/A (${String(err.message || err)})\n`;
    }

    /* -----------------------------
       Build summary + feedback
    -------------------------------- */
    const submissionLine = `- **Lab:** 4-2-js-advance-main
- **Deadline (Riyadh / UTC+03:00):** ${DEADLINE_RIYADH_ISO}
- **Last commit time (from git log):** ${lastCommitISO}
- **Submission marks:** **${submissionScore}/${SUBMISSION_MAX}** ${isLate ? "(Late submission)" : "(On time)"}
${timingBlock}`;

    const extraLinkInfo = (() => {
      if (!html || !jsFile) return "";
      const okAny = hasAnyExternalScriptTag(html);
      const okMatch = jsLinkedSomewhereMatchesStudentFile(html, jsFile);
      return `\n- **HTML script link (not graded):** ${okAny ? "✅ Has external <script src=...>" : "❌ No external <script src=...> found"}${
        okAny && jsFile ? (okMatch ? " (matches your JS filename)" : " (may not match your JS filename)") : ""
      }`;
    })();

    let summary = `# 4-2-js-advance-main — Autograding Summary

## Submission

${submissionLine}

## Files Checked

- HTML: ${htmlFile ? `✅ ${htmlFile}` : "❌ No HTML file found"}
- JS: ${jsFile ? `✅ ${jsFile}` : "❌ No student .js file found"}${extraLinkInfo}

## Marks Breakdown

| Component | Marks |
|---|---:|
`;

    for (const r of results) summary += `| ${r.name} | ${r.score}/${r.max} |\n`;
    summary += `| Submission (timing) | ${submissionScore}/${SUBMISSION_MAX} |\n`;

    summary += `
## Total Marks

**${totalScore} / ${TOTAL_MAX}**

## Detailed Checks (What you did / missed)
`;

    for (const r of results) {
      const done = (r.checklist || []).filter(x => x.startsWith("✅"));
      const missed = (r.checklist || []).filter(x => x.startsWith("❌"));

      summary += `
<details>
  <summary><strong>${mdEscape(r.name)}</strong> — ${r.score}/${r.max}</summary>

  <br/>

  <strong>✅ Found</strong>
  ${done.length ? "\n" + done.map(x => `- ${mdEscape(x)}`).join("\n") : "\n- (Nothing detected)"}

  <br/><br/>

  <strong>❌ Missing</strong>
  ${missed.length ? "\n" + missed.map(x => `- ${mdEscape(x)}`).join("\n") : "\n- (Nothing missing)"}

  <br/><br/>

  <strong>❗ Deductions / Notes</strong>
  ${
    r.deductions && r.deductions.length
      ? "\n" + r.deductions.map(d => `- ${mdEscape(d)}`).join("\n")
      : "\n- No deductions."
  }

</details>
`;
    }

    summary += `
> Full feedback is also available in: \`artifacts/feedback/README.md\`
`;

    let feedback = `# 4-2-js-advance-main — Feedback

## Submission

${submissionLine}

## Files Checked

- HTML: ${htmlFile ? `✅ ${htmlFile}` : "❌ No HTML file found"}
- JS: ${jsFile ? `✅ ${jsFile}` : "❌ No student .js file found"}${extraLinkInfo}

---

## TODO-by-TODO Feedback
`;

    for (const r of results) {
      feedback += `
### ${r.name} — **${r.score}/${r.max}**

**Checklist**
${r.checklist.length ? r.checklist.map(x => `- ${x}`).join("\n") : "- (No checks available)"}

**Deductions / Notes**
${r.deductions.length ? r.deductions.map(d => `- ❗ ${d}`).join("\n") : "- ✅ No deductions. Good job!"}
`;
    }

    feedback += `
---

## How marks were deducted (rules)

- HTML comments are ignored (so examples in comments do NOT count).
- JS comments are ignored (so examples in comments do NOT count).
- Checks are intentionally light: they look for key constructs and basic structure.
- Code can be in ANY order; repeated code is allowed.
- Common equivalents are accepted, and naming is flexible.
- Missing required items reduce marks proportionally within that TODO.

---

## Timing analytics notes

- "Accepted" time is based on the repository **created_at** timestamp (repo is created when the assignment is accepted).
- "Push" times are inferred from **GitHub Actions workflow runs** triggered by the **push** event.
  - If your workflow does not run on push, or Actions is disabled, timing values may show as N/A.
`;

    /* -----------------------------
       Write outputs
    -------------------------------- */
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

    const csv = `student,score,max_score
all_students,${totalScore},${TOTAL_MAX}
`;

    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "grade.csv"), csv);
    fs.writeFileSync(path.join(FEEDBACK_DIR, "README.md"), feedback);

    console.log(
      `✔ Lab graded: ${totalScore}/${TOTAL_MAX} (Submission: ${submissionScore}/${SUBMISSION_MAX}, TODOs: ${stepsScore}/${STEPS_MAX}).`
    );
  } catch (err) {
    console.error("❌ Grader crashed:", err);
    process.exit(1);
  }
})();
