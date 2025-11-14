#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Thresholds - adjust if you want stricter checks
const THRESHOLDS = {
  statements: 15,
  branches: 15,
  functions: 15,
  lines: 15
};

const summaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');

if (!fs.existsSync(summaryPath)) {
  console.error('coverage-summary.json not found. Make sure tests ran with coverage.');
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const totals = summary.total;

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
