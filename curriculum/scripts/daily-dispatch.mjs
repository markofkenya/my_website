#!/usr/bin/env node
/** Select and persist distinct daily Quiz and new-card anchors before any delivery. */
import dispatchModule from '../../sce-daily-dispatch.js';
import { appendDailyEvent, pendingEventFromSelection, readDailyEvents } from './daily-events.mjs';

async function main() {
  if (process.argv[2] !== 'select') throw new Error('Usage: daily-dispatch.mjs select <candidates-json>');
  const candidates = JSON.parse(process.argv[3] || '');
  const dispatch = dispatchModule.selectDailyDispatch({ candidates, events: await readDailyEvents() });
  if (!dispatch.quiz.candidate || !dispatch.cards.candidate) {
    throw new Error('Daily dispatch requires two distinct eligible anchors; no events were written.');
  }
  const quizEvent = pendingEventFromSelection(dispatch.quiz);
  const cardEvent = { ...pendingEventFromSelection(dispatch.cards), mode: 'daily-cards', cold_case_status: 'not-applicable', mcq_status: 'not-applicable' };
  const quizWrite = await appendDailyEvent(quizEvent);
  const cardWrite = await appendDailyEvent(cardEvent);
  console.log(JSON.stringify({ quiz: dispatch.quiz.candidate, cards: dispatch.cards.candidate, quizEvent, cardEvent, quizWrite, cardWrite }, null, 2));
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
