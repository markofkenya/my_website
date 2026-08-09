#!/usr/bin/env node
/** Sync the Google Sheets coverage ledger projection into Firebase for SCE.html. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import projectionModule from '../../sce-ledger-projection.js';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const configPath = path.join(root, 'curriculum', 'coverage-ledger-config.json');
const hierarchyPath = path.join(root, 'curriculum', 'ksap-hierarchy-v1.json');
const googleApiPath = path.join(process.env.HERMES_HOME || path.join(process.env.HOME, '.hermes'), 'skills', 'productivity', 'google-workspace', 'scripts', 'google_api.py');

export function rowsFromValues(values) {
  if (!Array.isArray(values) || values.length < 2 || !Array.isArray(values[0])) return [];
  const headers = values[0].map(value => String(value || '').trim());
  return values.slice(1)
    .filter(row => Array.isArray(row) && row.some(value => String(value || '').trim()))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, String(row[index] || '').trim()])));
}

async function readSheet(spreadsheetId, range) {
  const { stdout } = await execFileAsync('python3', [googleApiPath, 'sheets', 'get', spreadsheetId, range], { maxBuffer: 5 * 1024 * 1024 });
  return rowsFromValues(JSON.parse(stdout));
}

async function buildLiveProjection() {
  const [config, hierarchy] = await Promise.all([
    fs.readFile(configPath, 'utf8').then(JSON.parse),
    fs.readFile(hierarchyPath, 'utf8').then(JSON.parse),
  ]);
  const spreadsheetId = config.spreadsheet_id;
  if (!spreadsheetId) throw new Error('Coverage-ledger config is missing spreadsheet_id.');
  const [concepts, attempts, cards] = await Promise.all([
    readSheet(spreadsheetId, 'Concepts!A:O'),
    readSheet(spreadsheetId, 'Attempts!A:J'),
    readSheet(spreadsheetId, 'Cards!A:J'),
  ]);
  const topicNames = Object.fromEntries(hierarchy.main_topics.map(topic => [topic.id, topic.name]));
  return projectionModule.buildDashboardProjection({ concepts, attempts, cards, topicNames });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const projection = await buildLiveProjection();
  const databaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://task-monitor-bd7ee-default-rtdb.europe-west1.firebasedatabase.app';
  const destination = `${databaseUrl.replace(/\/$/, '')}/sceData/hermesDashboard.json`;
  if (dryRun) {
    console.log(JSON.stringify({ status: 'dry-run', destination, projection }, null, 2));
    return;
  }
  const response = await fetch(destination, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(projection),
  });
  if (!response.ok) throw new Error(`Firebase write failed: HTTP ${response.status} ${await response.text()}`);
  const saved = await response.json();
  console.log(JSON.stringify({ status: 'synced', destination, generatedAt: saved.generatedAt, summary: saved.summary }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
