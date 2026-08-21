const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PAYMENT_ROUTES,
  STATUSES,
  createShift,
  normaliseShift,
  summariseShifts,
  buildPrivatePath,
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

test('supports only NHS bank PAYE and agency PAYE with the agreed workflow', () => {
  assert.deepEqual(PAYMENT_ROUTES, ['nhs_bank_paye', 'agency_paye']);
  assert.deepEqual(STATUSES, ['booked', 'worked', 'timesheet_submitted', 'paid']);
  assert.equal(normaliseShift({ id:'x', paymentRoute:'umbrella', status:'booked' }), null);
  assert.equal(normaliseShift({ id:'x', paymentRoute:'agency_paye', status:'invoiced' }), null);
  assert.equal(normaliseShift({
    id:'x',paymentRoute:'agency_paye',organisation:'Agency',date:'2026-09-13',startTime:'09:00',endTime:'17:00',
    hourlyRate:70,paidHours:8,expectedPaymentDate:'2026-09-12',status:'booked',updatedAt:1,
  }), null);
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
