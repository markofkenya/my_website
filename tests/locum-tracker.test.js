const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PAYMENT_ROUTES,
  STATUSES,
  createShift,
  normaliseShift,
  summariseShifts,
  buildPrivatePath,
  canTransitionStatus,
  buildShiftIcs,
} = require('../locum-tracker.js');

test('creates a bounded NHS bank PAYE shift and calculates expected gross pay', () => {
  const shift = createShift({
    id: 'locum-1', paymentRoute: 'nhs_bank_paye', organisation: 'North Hospital',
    date: '2026-09-12', startTime: '08:00', endTime: '20:00', hourlyRate: 65,
    paidHours: 11.5, expectedPaymentDate: '2026-10-28', bookingReference: 'BANK-42',
  }, 1789000000000);
  assert.deepEqual(shift, {
    id: 'locum-1', paymentRoute: 'nhs_bank_paye', organisation: 'North Hospital',
    date: '2026-09-12', startTime: '08:00', endTime: '20:00', hourlyRate: 65,
    paidHours: 11.5, expectedGross: 747.5, expectedPaymentDate: '2026-10-28',
    bookingReference: 'BANK-42', status: 'booked', updatedAt: 1789000000000,
  });
});

test('calculates split social and unsocial rates with decimal paid hours', () => {
  const shift = createShift({
    id:'split-rate', paymentRoute:'agency_paye', organisation:'Agency One', date:'2026-09-14',
    startTime:'09:00', endTime:'23:00', expectedPaymentDate:'2026-10-15',
    payBands:{social:{hourlyRate:60,paidHours:7.33},unsocial:{hourlyRate:80,paidHours:5.67}},
  }, 2);
  assert.deepEqual(shift.payBands, {
    social:{hourlyRate:60,paidHours:7.33},
    unsocial:{hourlyRate:80,paidHours:5.67},
  });
  assert.equal(shift.expectedGross, 893.4);
  assert.equal(shift.hourlyRate, undefined);
  assert.equal(shift.paidHours, undefined);
  assert.throws(() => createShift({
    id:'too-many-hours', paymentRoute:'agency_paye', organisation:'Agency One', date:'2026-09-14',
    startTime:'00:00', endTime:'23:59', expectedPaymentDate:'2026-10-15',
    payBands:{social:{hourlyRate:60,paidHours:24},unsocial:{hourlyRate:80,paidHours:24}},
  }, 3));
});

test('builds a private calendar event without financial or payment details', () => {
  const shift = createShift({
    id:'ics-1', paymentRoute:'nhs_bank_paye', organisation:'North Hospital', date:'2026-09-14',
    startTime:'20:00', endTime:'08:00', expectedPaymentDate:'2026-10-15',
    payBands:{unsocial:{hourlyRate:80,paidHours:12}}, bookingReference:'SECRET-RATE-REF',
  }, 2);
  const ics=buildShiftIcs(shift, Date.UTC(2026,7,21,12,0,0));
  assert.match(ics, /SUMMARY:Locum shift - North Hospital/);
  assert.match(ics, /DTSTART:20260914T200000/);
  assert.match(ics, /DTEND:20260915T080000/);
  assert.doesNotMatch(ics, /SECRET-RATE-REF|payment|PAYE|hourly|paid hours|£/i);
});

test('escapes ICS line breaks and folds every content line to 75 UTF-8 octets', () => {
  const shift = createShift({
    id:'ics-fold', paymentRoute:'nhs_bank_paye', organisation:'Safe\rX-PRIVATE:leak,semi;slash\\'+'診'.repeat(20),
    date:'2026-09-14', startTime:'09:00', endTime:'17:00', expectedPaymentDate:'2026-10-15',
    hourlyRate:70, paidHours:8,
  }, 2);
  const ics=buildShiftIcs(shift, Date.UTC(2026,7,21,12,0,0));
  assert.doesNotMatch(ics, /\r\nX-PRIVATE:/);
  assert.match(ics, /Safe\\nX-PRIVATE:leak\\,semi\\;slash\\\\/);
  ics.split('\r\n').filter(Boolean).forEach(line=>assert.ok(Buffer.byteLength(line,'utf8')<=75, `${Buffer.byteLength(line,'utf8')} octets: ${line}`));
  assert.match(ics, /\r\n /);
});

test('supports only NHS bank PAYE and agency PAYE with the agreed workflow', () => {
  assert.deepEqual(PAYMENT_ROUTES, ['nhs_bank_paye', 'agency_paye']);
  assert.deepEqual(STATUSES, ['booked', 'worked', 'timesheet_submitted', 'paid']);
  assert.equal(normaliseShift({ id:'x', paymentRoute:'umbrella', status:'booked' }), null);
  assert.equal(normaliseShift({ id:'x', paymentRoute:'agency_paye', status:'invoiced' }), null);
  assert.equal(normaliseShift({
    id:'x',paymentRoute:'agency_paye',organisation:'Agency',date:'2026-09-13',startTime:'09:00',endTime:'17:00',
    payBands:{social:{hourlyRate:70,paidHours:7.5},unsocial:{hourlyRate:90}},expectedPaymentDate:'2026-10-12',status:'booked',updatedAt:1,
  }), null);
  assert.equal(normaliseShift({
    id:'x',paymentRoute:'agency_paye',organisation:'Agency',date:'2026-09-13',startTime:'09:00',endTime:'17:00',
    hourlyRate:70,paidHours:8,expectedPaymentDate:'2026-09-12',status:'booked',updatedAt:1,
  }), null);
});

test('enforces the booked-to-paid lifecycle without skips or backwards transitions', () => {
  assert.equal(canTransitionStatus('booked', 'worked'), true);
  assert.equal(canTransitionStatus('worked', 'timesheet_submitted'), true);
  assert.equal(canTransitionStatus('timesheet_submitted', 'paid'), true);
  assert.equal(canTransitionStatus('booked', 'timesheet_submitted'), false);
  assert.equal(canTransitionStatus('booked', 'paid'), false);
  assert.equal(canTransitionStatus('paid', 'worked'), false);
  assert.equal(canTransitionStatus('worked', 'booked'), false);
  assert.equal(canTransitionStatus('worked', 'worked'), false);
  assert.equal(canTransitionStatus('unknown', 'worked'), false);
});

test('drops unknown and privacy-risk fields from stored locum data', () => {
  const clean = normaliseShift({
    id:'locum-2', paymentRoute:'agency_paye', organisation:'Agency One', date:'2026-09-13',
    startTime:'09:00', endTime:'17:00', hourlyRate:70, paidHours:8,
    expectedGross:560, expectedPaymentDate:'2026-10-15', bookingReference:'A-7',
    status:'worked', updatedAt:1789000000000, patientName:'Never store', notes:'free text', rotaCode:'secret',
  });
  assert.deepEqual(Object.keys(clean).sort(), [
    'bookingReference','date','endTime','expectedGross','expectedPaymentDate','hourlyRate','id',
    'organisation','paidHours','paymentRoute','startTime','status','updatedAt',
  ].sort());
});

test('summarises NHS bank and agency earnings separately and flags overdue unpaid shifts', () => {
  const shifts = [
    {...createShift({id:'a',paymentRoute:'nhs_bank_paye',organisation:'Trust',date:'2026-08-01',startTime:'08:00',endTime:'16:00',hourlyRate:50,paidHours:8,expectedPaymentDate:'2026-08-20'}, 1), status:'worked'},
    {...createShift({id:'b',paymentRoute:'agency_paye',organisation:'Agency',date:'2026-08-02',startTime:'08:00',endTime:'18:00',hourlyRate:60,paidHours:10,expectedPaymentDate:'2026-08-25'}, 2), status:'paid'},
  ];
  assert.deepEqual(summariseShifts(shifts, '2026-08-21'), {
    nhs_bank_paye:{expected:400, paid:0, outstanding:400},
    agency_paye:{expected:600, paid:600, outstanding:0},
    awaitingTimesheet:1, overdue:1,
  });
});

test('uses an authenticated per-user path rather than a rota-room code', () => {
  assert.equal(buildPrivatePath('uid_ABC-123'), 'homePrivate/uid_ABC-123/locumShifts');
  assert.throws(() => buildPrivatePath('../slotShare/room'));
});
