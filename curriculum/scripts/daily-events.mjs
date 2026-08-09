#!/usr/bin/env node
/** Read and append the minimal DailyEvents ledger history for SCE daily-loop selection. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import selectionModule from '../../sce-daily-selection.js';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const configPath = path.join(root, 'curriculum', 'coverage-ledger-config.json');
const columns = [
  'daily_event_id', 'selected_at', 'mode', 'anchor_id', 'anchor_type',
  'anchor_label', 'topic_key', 'source_reference', 'cold_case_status',
  'mcq_status', 'outcome', 'repeat_permitted', 'repeat_reason', 'completed_at'
];

function text(value) {
  return String(value ?? '').trim();
}

export function rowsFromDailyEventValues(values) {
  if (!Array.isArray(values) || values.length < 2 || !Array.isArray(values[0])) return [];
  const headers = values[0].map(text);
  return values.slice(1)
    .filter(row => Array.isArray(row) && row.some(value => text(value)))
    .map(row => Object.fromEntries(columns.map(column => [column, text(row[headers.indexOf(column)])])));
}

export function dailyEventRowIndex(values, dailyEventId) {
  if (!Array.isArray(values) || !Array.isArray(values[0])) return null;
  const idIndex = values[0].map(text).indexOf('daily_event_id');
  if (idIndex < 0) return null;
  const target = text(dailyEventId);
  const index = values.slice(1).findIndex(row => Array.isArray(row) && text(row[idIndex]) === target);
  return index < 0 ? null : index + 2;
}

export function pendingEventFromSelection(selection, selectedAt = new Date().toISOString(), uuid = randomUUID) {
  const selected = selection && typeof selection === 'object' ? selection : {};
  const candidate = selected.candidate && typeof selected.candidate === 'object' ? selected.candidate : {};
  if (!text(candidate.id) || !text(candidate.anchor_type) || !text(candidate.anchor_label) || !text(candidate.topic_key)) {
    throw new Error('A pending daily event requires a complete selected candidate.');
  }
  return {
    daily_event_id: `daily-${uuid()}`,
    selected_at: text(selectedAt),
    mode: 'daily-loop',
    anchor_id: text(candidate.id),
    anchor_type: text(candidate.anchor_type),
    anchor_label: text(candidate.anchor_label),
    topic_key: text(candidate.topic_key),
    source_reference: text(candidate.source_reference) || text(candidate.anchor_type),
    cold_case_status: 'selected',
    mcq_status: 'not-started',
    outcome: 'pending',
    repeat_permitted: text(selected.repeat_permitted) || 'no',
    repeat_reason: text(selected.repeat_reason) || 'new-anchor',
    completed_at: '',
  };
}

export function dailyEventRow(event) {
  const value = event && typeof event === 'object' ? event : {};
  for (const required of ['daily_event_id', 'selected_at', 'mode', 'anchor_id', 'anchor_type', 'anchor_label', 'topic_key', 'source_reference', 'cold_case_status', 'mcq_status', 'outcome', 'repeat_permitted', 'repeat_reason']) {
    if (!text(value[required])) throw new Error(`Daily event requires ${required}.`);
  }
  return [columns.map(column => text(value[column]))];
}

function googlePython() {
  return process.env.HERMES_PYTHON || '/usr/local/lib/hermes-agent/venv/bin/python';
}

function googleApiPath() {
  return path.join(process.env.HERMES_HOME || path.join(process.env.HOME, '.hermes'), 'skills', 'productivity', 'google-workspace', 'scripts', 'google_api.py');
}

async function spreadsheetId() {
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  if (!text(config.spreadsheet_id)) throw new Error('Coverage ledger configuration has no spreadsheet_id.');
  return config.spreadsheet_id;
}

async function readDailyEventValues() {
  const id = await spreadsheetId();
  const { stdout } = await execFileAsync(googlePython(), [googleApiPath(), 'sheets', 'get', id, 'DailyEvents!A:N'], { maxBuffer: 1024 * 1024 });
  return JSON.parse(stdout);
}

export async function readDailyEvents() {
  return rowsFromDailyEventValues(await readDailyEventValues());
}

export async function appendDailyEvent(event) {
  const id = await spreadsheetId();
  const values = JSON.stringify(dailyEventRow(event));
  const { stdout } = await execFileAsync(googlePython(), [googleApiPath(), 'sheets', 'append', id, 'DailyEvents!A:N', '--values', values], { maxBuffer: 1024 * 1024 });
  return JSON.parse(stdout);
}

export async function updateDailyEvent(event) {
  const row = dailyEventRowIndex(await readDailyEventValues(), event?.daily_event_id);
  if (!row) throw new Error(`Daily event not found: ${text(event?.daily_event_id) || '(missing id)'}.`);
  const id = await spreadsheetId();
  const values = JSON.stringify(dailyEventRow(event));
  const range = `DailyEvents!A${row}:N${row}`;
  const { stdout } = await execFileAsync(googlePython(), [googleApiPath(), 'sheets', 'update', id, range, '--values', values], { maxBuffer: 1024 * 1024 });
  return JSON.parse(stdout);
}

async function main() {
  const command = process.argv[2];
  if (command === 'list') {
    console.log(JSON.stringify(await readDailyEvents(), null, 2));
    return;
  }
  if (command === 'select') {
    const candidates = JSON.parse(process.argv[3] || '');
    const selection = selectionModule.selectDailyAnchor({ candidates, events: await readDailyEvents() });
    if (!selection.candidate) {
      console.log(JSON.stringify(selection, null, 2));
      return;
    }
    const event = pendingEventFromSelection(selection);
    const write = await appendDailyEvent(event);
    console.log(JSON.stringify({ selection, event, write }, null, 2));
    return;
  }
  if (command === 'update') {
    const event = JSON.parse(process.argv[3] || '');
    console.log(JSON.stringify(await updateDailyEvent(event), null, 2));
    return;
  }
  if (command === 'record') {
    const event = JSON.parse(process.argv[3] || '');
    console.log(JSON.stringify(await appendDailyEvent(event), null, 2));
    return;
  }
  throw new Error('Usage: daily-events.mjs list | select <candidates-json> | record <event-json> | update <event-json>');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
