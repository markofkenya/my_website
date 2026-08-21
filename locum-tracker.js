(function(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.LocumTracker=api;
})(typeof globalThis!=='undefined'?globalThis:this, function(){
  'use strict';

  const PAYMENT_ROUTES=Object.freeze(['nhs_bank_paye','agency_paye']);
  const STATUSES=Object.freeze(['booked','worked','timesheet_submitted','paid']);
  const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
  const TIME=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const ID=/^[A-Za-z0-9_-]{1,80}$/;

  function validDate(value){
    if(typeof value!=='string' || !ISO_DATE.test(value)) return false;
    const d=new Date(value+'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value;
  }
  function text(value,max){
    const result=String(value==null?'':value).trim();
    return result && result.length<=max ? result : null;
  }
  function money(value){ return Math.round((Number(value)+Number.EPSILON)*100)/100; }
  function safeNumber(value,min,max){
    const n=Number(value);
    return Number.isFinite(n) && n>=min && n<=max ? n : null;
  }
  function normaliseShift(input){
    if(!input || typeof input!=='object') return null;
    const id=typeof input.id==='string' && ID.test(input.id) ? input.id : null;
    const paymentRoute=PAYMENT_ROUTES.includes(input.paymentRoute) ? input.paymentRoute : null;
    const organisation=text(input.organisation,80);
    const date=validDate(input.date) ? input.date : null;
    const startTime=typeof input.startTime==='string' && TIME.test(input.startTime) ? input.startTime : null;
    const endTime=typeof input.endTime==='string' && TIME.test(input.endTime) ? input.endTime : null;
    const hourlyRate=safeNumber(input.hourlyRate,0.01,1000);
    const paidHours=safeNumber(input.paidHours,0.01,24);
    const expectedPaymentDate=validDate(input.expectedPaymentDate) ? input.expectedPaymentDate : null;
    const bookingReference=text(input.bookingReference,60) || '';
    const status=STATUSES.includes(input.status) ? input.status : null;
    const updatedAt=safeNumber(input.updatedAt,1,Number.MAX_SAFE_INTEGER);
    if(!id || !paymentRoute || !organisation || !date || !startTime || !endTime || hourlyRate===null || paidHours===null || !expectedPaymentDate || expectedPaymentDate<date || !status || updatedAt===null) return null;
    return {id,paymentRoute,organisation,date,startTime,endTime,hourlyRate,paidHours,expectedGross:money(hourlyRate*paidHours),expectedPaymentDate,bookingReference,status,updatedAt};
  }
  function createShift(input,now){
    const candidate=Object.assign({},input,{status:'booked',updatedAt:Number(now)||Date.now()});
    const clean=normaliseShift(candidate);
    if(!clean) throw new TypeError('Invalid locum shift');
    return clean;
  }
  function canTransitionStatus(from,to){
    const fromIndex=STATUSES.indexOf(from);
    return fromIndex>=0 && STATUSES[fromIndex+1]===to;
  }
  function summariseShifts(values,today){
    const out={
      nhs_bank_paye:{expected:0,paid:0,outstanding:0},
      agency_paye:{expected:0,paid:0,outstanding:0},
      awaitingTimesheet:0, overdue:0,
    };
    const current=validDate(today)?today:new Date().toISOString().slice(0,10);
    (Array.isArray(values)?values:[]).forEach(raw=>{
      const shift=normaliseShift(raw); if(!shift) return;
      const bucket=out[shift.paymentRoute];
      bucket.expected=money(bucket.expected+shift.expectedGross);
      if(shift.status==='paid') bucket.paid=money(bucket.paid+shift.expectedGross);
      else bucket.outstanding=money(bucket.outstanding+shift.expectedGross);
      if(shift.status==='worked') out.awaitingTimesheet++;
      if(shift.status!=='paid' && shift.expectedPaymentDate<current) out.overdue++;
    });
    return out;
  }
  function buildPrivatePath(uid){
    if(typeof uid!=='string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new TypeError('Invalid Firebase UID');
    return `homePrivate/${uid}/locumShifts`;
  }
  function sanitiseCollection(value){
    if(!value || typeof value!=='object' || Array.isArray(value)) return [];
    return Object.values(value).map(normaliseShift).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
  }
  return {PAYMENT_ROUTES,STATUSES,createShift,normaliseShift,canTransitionStatus,summariseShifts,buildPrivatePath,sanitiseCollection};
});
