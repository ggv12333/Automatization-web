#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Thresholds - adjust if you want stricter checks
const THRESHOLDS = {
  statements: 15,
  branches: 15,
  functions: 15,
  lines: 15
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const summaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');

// Try coverage-summary.json first (standard Jest), otherwise fall back to coverage-final.json
let totals = null;
if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  totals = summary.total;
} else {
  // Fallback: compute totals from coverage-final.json
  const finalPath = path.join(__dirname, '..', 'coverage', 'coverage-final.json');
  if (!fs.existsSync(finalPath)) {
    console.error('No coverage summary found. Make sure tests ran with coverage.');
    process.exit(1);
  }

  const final = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
  // Aggregate totals
  let stmtTotal = 0, stmtCovered = 0;
  let funcTotal = 0, funcCovered = 0;
  let branchTotal = 0, branchCovered = 0;
  let lineTotal = 0, lineCovered = 0;

  for (const fileKey of Object.keys(final)) {
    const entry = final[fileKey];
    // statements
    const sMap = entry.statementMap || {};
    const sCounts = entry.s || {};
    const sKeys = Object.keys(sMap);
    stmtTotal += sKeys.length;
    for (const k of sKeys) {
      const val = sCounts[k] || 0;
      if (val > 0) stmtCovered += 1;
    }

    // functions
    const fMap = entry.fnMap || {};
    const fCounts = entry.f || {};
    const fKeys = Object.keys(fMap);
    funcTotal += fKeys.length;
    for (const k of fKeys) {
      const val = fCounts[k] || 0;
      if (val > 0) funcCovered += 1;
    }

    // branches
    const bMap = entry.branchMap || {};
    const bCounts = entry.b || {};
    // bCounts is an array per branch key
    let idx = 0;
    for (const key of Object.keys(bMap)) {
      const arr = bCounts[idx] || [];
      branchTotal += arr.length;
      for (const v of arr) if (v > 0) branchCovered += 1;
      idx += 1;
    }

    // lines - approximate using statements map length (jest coverage may not include lines separately)
    lineTotal += sKeys.length;
    for (const k of sKeys) {
      const val = sCounts[k] || 0;
      if (val > 0) lineCovered += 1;
    }
  }

  const percent = (covered, total) => (total === 0 ? 100 : Math.round((covered / total) * 100 * 100) / 100);
  totals = {
    statements: { pct: percent(stmtCovered, stmtTotal) },
    functions: { pct: percent(funcCovered, funcTotal) },
    branches: { pct: percent(branchCovered, branchTotal) },
    lines: { pct: percent(lineCovered, lineTotal) }
  };
}

let failed = false;
for (const key of ['statements','branches','functions','lines']) {
  const pct = totals[key].pct;
  const threshold = THRESHOLDS[key];
  console.log(`${key}: ${pct}% (threshold ${threshold}%)`);
  if (pct < threshold) {
    console.error(`Coverage for ${key} is below threshold: ${pct}% < ${threshold}%`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('Coverage thresholds met.');
process.exit(0);
