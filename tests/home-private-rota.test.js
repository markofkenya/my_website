const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRotaSummary, validatePrivateWeekSummary, projectPrivateWeekForDisplay } = require('../home-private-rota.js');

const valid = {
  today: { dutyState: 'clinical', capacity: 'normal', conflict: false },
  week: { workload: 'limited', recovery: true, protectedStudyWindow: false, nextDutyProximity: 'upcoming' },
  attention: { conflict: false, recoveryProtection: true },
};

test('accepts only the closed rota Home aggregate contract', () => {
  assert.deepEqual(validateRotaSummary(valid), valid);
});

test('reads only the closed detailed personal-week contract', () => {
  const week = {
    generatedAt: '2026-08-10T08:00:00.000Z',
    days: Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(10 + index).padStart(2, '0')}`,
      duties: index === 0 ? ['ward'] : [],
    })),
  };
  assert.deepEqual(validatePrivateWeekSummary(week), week);
  assert.equal(validatePrivateWeekSummary({ ...week, room: 'private' }), null);
  assert.equal(validatePrivateWeekSummary({ ...week, days: week.days.slice(0, 6) }), null);
  assert.equal(validatePrivateWeekSummary({ ...week, days: [{ date: '2026-08-10', duties: ['free-text'] }, ...week.days.slice(1)] }), null);
});

test('projects authenticated private week labels for the Home week strip without raw rota fields', () => {
  const result = projectPrivateWeekForDisplay({
    generatedAt: '2026-08-10T08:00:00.000Z',
    days: [
      { date: '2026-08-10', duties: ['ward', 'procedure'] },
      ...Array.from({ length: 6 }, (_, index) => ({ date: `2026-08-${String(11 + index).padStart(2, '0')}`, duties: [] })),
    ],
  });
  assert.deepEqual(result[0], { date: '2026-08-10', weekday: 'Mon', dayNum: 10, context: 'working', workloadBand: 'normal', studyBand: 'none', categories: ['Ward', 'Procedure'] });
  assert.equal(JSON.stringify(result).includes('generatedAt'), false);
  assert.equal(JSON.stringify(result).includes('room'), false);
});

test('rejects private fields and malformed aggregate values', () => {
  assert.equal(validateRotaSummary({ ...valid, rotaCode: 'private' }), null);
  assert.equal(validateRotaSummary({ ...valid, today: { ...valid.today, capacity: 'busy' } }), null);
  assert.equal(validateRotaSummary({ ...valid, attention: { ...valid.attention, note: 'private' } }), null);
});
