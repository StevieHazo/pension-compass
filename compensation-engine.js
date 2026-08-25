/**
 * CAPITA - CONFIDENTIAL INTERNAL
 * Compensation Calculator Engine v0.1
 *
 * Clean JavaScript translation of the formula layers in:
 * - Cscs-voluntary-exit-calculator-members-april-2024 (pp).xlsx
 * - Cscs-vr-or-cr-calculator-members-april-2024 (pp) (1).xlsx
 *
 * No DOM dependencies. Dates must be ISO YYYY-MM-DD strings or Date objects.
 * Monetary results are rounded to 2 decimal places, matching Excel ROUND(...,2).
 */

export const COMPENSATION_RULES = Object.freeze({
  lowerPayThreshold: 23000,
  higherPayThreshold: 149820,
  statutoryWeeklyRate: 700,
  voluntaryExitMaxMonths: 21,
  voluntaryRedundancyMaxMonths: 21,
  compulsoryRedundancyMaxMonths: 12,
  postPensionAgeMaxMonths: 6,
  statutoryServiceCapYears: 20,
  compulsoryRedundancyMinimumServiceYears: 2,
});

const MS_DAY = 86400000;
const round = (n, dp = 2) => Math.round((n + Number.EPSILON) * 10 ** dp) / 10 ** dp;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function asDate(value, field) {
  const d = value instanceof Date ? new Date(value.getTime()) : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new TypeError(`${field} must be a valid date.`);
  return d;
}
function utcDate(y, m, d) { return new Date(Date.UTC(y, m, d)); }
function parts(d) { return { y:d.getUTCFullYear(), m:d.getUTCMonth(), d:d.getUTCDate() }; }
function daysBetween(a,b) { return Math.round((b-a)/MS_DAY); }
function daysInMonth(y,m){ return new Date(Date.UTC(y,m+1,0)).getUTCDate(); }

/** Excel-like completed service years from first continuous service to final service date inclusive. */
function completedServiceYears(start, end) {
  const inclusiveEnd = new Date(end.getTime() + MS_DAY);
  let years = inclusiveEnd.getUTCFullYear() - start.getUTCFullYear();
  const anniversary = utcDate(inclusiveEnd.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  if (inclusiveEnd < anniversary) years -= 1;
  return Math.max(0, years);
}

/**
 * Translation of Calculation!B6 and supporting cells B23:D25/H26:I28.
 * Returns completed/fractional months from last day of service to normal pension date.
 */
export function monthsToPensionAge(lastDay, pensionDate) {
  const lds = asDate(lastDay,'lastDayOfService');
  const npd = asDate(pensionDate,'normalPensionDate');
  if (npd <= lds) return 0;
  const a=parts(lds), b=parts(npd);
  let years=b.y-a.y;
  let dayDiff=b.d-a.d;
  let months=b.m-a.m-(dayDiff<1?1:0);
  if(months<0){years-=1;months+=12;}
  const previousMonth=(dayDiff<1?b.m-1:b.m+12)%12;
  const previousMonthYear=previousMonth>b.m?b.y-1:b.y;
  const denominator=daysInMonth(previousMonthYear,previousMonth);
  const adjustedDayDiff=dayDiff<1?dayDiff+Math.max(a.d,denominator):dayDiff;
  const dayFraction=Math.round(adjustedDayDiff/denominator);
  return Math.max(0,years*12+months+dayFraction);
}

function validate(i){
  const errors=[];
  for(const k of ['dateOfBirth','firstDayOfContinuousService','lastDayOfService','normalPensionDate']){
    try{asDate(i[k],k)}catch(e){errors.push(e.message)}
  }
  for(const k of ['reckonableServiceYears','basicSalary','pensionableAllowances']){
    if(!Number.isFinite(Number(i[k]))||Number(i[k])<0)errors.push(`${k} must be zero or greater.`);
  }
  if(i.partTime){
    if(!(Number(i.partTimeHours)>0))errors.push('partTimeHours must be greater than zero.');
    if(!(Number(i.fullTimeHours)>0))errors.push('fullTimeHours must be greater than zero.');
    if(!(Number(i.fullTimeEquivalentServiceYears)>0))errors.push('fullTimeEquivalentServiceYears must be greater than zero.');
    if(Number(i.partTimeHours)>Number(i.fullTimeHours))errors.push('partTimeHours cannot exceed fullTimeHours.');
  }
  if(i.type==='voluntary-exit'&&(!(Number(i.standardTariffMultiple)>0)||Number(i.standardTariffMultiple)>2))errors.push('standardTariffMultiple must be greater than 0 and no more than 2.');
  if(errors.length)throw new RangeError(errors.join(' '));
}

function statutoryRedundancy(i, actualWeeklyPay, continuousServiceYears, ageAtLeaving){
  const totalYears=Math.min(COMPENSATION_RULES.statutoryServiceCapYears,continuousServiceYears);
  const yearsOver41=Math.max(0,Math.trunc(Math.min(ageAtLeaving-41,totalYears)));
  const years22to40=Math.max(0,Math.trunc(Math.min(ageAtLeaving-22,totalYears-yearsOver41)));
  const yearsUnder22=Math.max(0,Math.trunc(Math.min(totalYears-22,totalYears-yearsOver41-years22to40)));
  const weightedWeeks=yearsOver41*1.5+years22to40+yearsUnder22*.5;
  const weeklyPayUsed=Math.min(actualWeeklyPay,COMPENSATION_RULES.statutoryWeeklyRate);
  return {totalYears,yearsOver41,years22to40,yearsUnder22,weightedWeeks,weeklyPayUsed,amount:round(weightedWeeks*weeklyPayUsed)};
}

function ageAtLeaving(dob,lds){
  const a=parts(dob),b=parts(lds);
  const birthday=utcDate(b.y,a.m,a.d);
  return round(b.y-a.y+(lds-birthday)/MS_DAY/365,4);
}

/**
 * @param {object} input
 * @param {'voluntary-exit'|'voluntary-redundancy'|'compulsory-redundancy'} input.type
 * @param {string|Date} input.dateOfBirth
 * @param {string|Date} input.firstDayOfContinuousService
 * @param {string|Date} input.lastDayOfService
 * @param {string|Date} input.normalPensionDate
 * @param {number} input.reckonableServiceYears - decimal years used by the workbook
 * @param {number} input.basicSalary - annual FTE salary
 * @param {number} [input.pensionableAllowances=0] - annual FTE permanent pensionable allowances
 * @param {boolean} [input.partTime=false]
 * @param {number} [input.partTimeHours]
 * @param {number} [input.fullTimeHours]
 * @param {number} [input.fullTimeEquivalentServiceYears]
 * @param {boolean} [input.lowerPaidUnderpin=true] - VE choice; VR/CR always use workbook PayUsed
 * @param {number} [input.standardTariffMultiple=1] - VE only
 * @param {boolean} [input.runStatutoryTest=true]
 */
export function calculateCompensation(input){
  const i={pensionableAllowances:0,partTime:false,lowerPaidUnderpin:true,standardTariffMultiple:1,runStatutoryTest:true,...input};
  validate(i);
  const dob=asDate(i.dateOfBirth,'dateOfBirth');
  const start=asDate(i.firstDayOfContinuousService,'firstDayOfContinuousService');
  const lds=asDate(i.lastDayOfService,'lastDayOfService');
  const npd=asDate(i.normalPensionDate,'normalPensionDate');
  if(start>lds)throw new RangeError('firstDayOfContinuousService cannot be after lastDayOfService.');
  const service=Number(i.reckonableServiceYears);
  const fteService=i.partTime?Number(i.fullTimeEquivalentServiceYears):service;
  const serviceRatio=i.partTime?service/fteService:1;
  const hoursRatio=i.partTime?Number(i.partTimeHours)/Number(i.fullTimeHours):1;
  const rawPay=Number(i.basicSalary)+Number(i.pensionableAllowances);
  const payUsed=clamp(rawPay,COMPENSATION_RULES.lowerPayThreshold,COMPENSATION_RULES.higherPayThreshold);
  const vePay=i.lowerPaidUnderpin?payUsed:clamp(rawPay,0,COMPENSATION_RULES.higherPayThreshold);
  const monthToPA=monthsToPensionAge(lds,npd);
  const afterPensionAge=lds>=npd;
  const continuousYears=completedServiceYears(start,lds);
  const age=ageAtLeaving(dob,lds);
  const weeklyActual=round(rawPay/52*hoursRatio);
  const statutory=statutoryRedundancy(i,weeklyActual,continuousYears,age);

  let standard, fullTimeMaximum, partTimeMaximum, schemeAward, maxMonths, calculationPay;
  if(i.type==='voluntary-exit'){
    calculationPay=vePay;maxMonths=COMPENSATION_RULES.voluntaryExitMaxMonths;
    // Dedicated VE workbook Calculation!F13: H16*RSCurr*(MultStdTarrVE/12)
    standard=round(calculationPay*service*(Number(i.standardTariffMultiple)/12));
    fullTimeMaximum=round(Math.min(monthToPA+6,maxMonths)/12*calculationPay);
  }else if(i.type==='voluntary-redundancy'){
    calculationPay=payUsed;maxMonths=COMPENSATION_RULES.voluntaryRedundancyMaxMonths;
    standard=round(calculationPay*service/12);
    fullTimeMaximum=round(Math.min(monthToPA+6,maxMonths)/12*calculationPay);
  }else if(i.type==='compulsory-redundancy'){
    calculationPay=payUsed;maxMonths=COMPENSATION_RULES.compulsoryRedundancyMaxMonths;
    standard=round(calculationPay*service/12);
    fullTimeMaximum=round(Math.min(monthToPA+6,maxMonths)/12*calculationPay);
  }else throw new RangeError('Unknown compensation type.');

  if(i.partTime){
    // Workbook J8/J22 and I7/I13/I21 translation.
    const monthsToNpdDetailed=monthToPA;
    const ptTaperMonths=Math.round(monthsToNpdDetailed*hoursRatio+6*serviceRatio);
    const underAgeCapMonths=Math.min(maxMonths*serviceRatio,ptTaperMonths);
    const selectedMonths=afterPensionAge?6*serviceRatio:underAgeCapMonths;
    partTimeMaximum=round(calculationPay/12*selectedMonths);
  }else partTimeMaximum=fullTimeMaximum;

  const applicableMaximum=i.partTime?partTimeMaximum:fullTimeMaximum;
  schemeAward=Math.min(standard,applicableMaximum);
  if(i.type==='compulsory-redundancy'&&continuousYears<COMPENSATION_RULES.compulsoryRedundancyMinimumServiceYears)schemeAward=0;
  schemeAward=round(schemeAward);

  // Workbook result cells substitute statutory pay only where statutory is higher.
  const statutorySubstituted=Boolean(i.runStatutoryTest&&statutory.amount>schemeAward);
  const finalAward=statutorySubstituted?statutory.amount:schemeAward;

  return {
    type:i.type,
    finalAward:round(finalAward),
    schemeAward,
    statutorySubstituted,
    statutory,
    inputs:{...i},
    breakdown:{rawPay,payUsed,calculationPay,monthlyPay:round(calculationPay/12),reckonableServiceYears:service,fullTimeEquivalentServiceYears:fteService,serviceRatio:round(serviceRatio,6),hoursRatio:round(hoursRatio,6),monthsToPensionAge:monthToPA,afterPensionAge,continuousServiceYears:continuousYears,ageAtLeaving:age,standardTariff:standard,fullTimeMaximum,partTimeMaximum,applicableMaximum,maxMonths,lowerPaidUnderpinApplied:i.type==='voluntary-exit'&&i.lowerPaidUnderpin&&rawPay<COMPENSATION_RULES.lowerPayThreshold,higherPayCapApplied:rawPay>COMPENSATION_RULES.higherPayThreshold},
    warnings:[
      'Illustration only. The actual compensation award may differ after employment history is confirmed.',
      ...(continuousYears<2?['Less than two completed years of continuous service. VE/VR may be at employer discretion; CR is zero in the workbook.']:[]),
      ...(i.partTime?['A part-time maximum compensation restriction has been applied using the workbook service and hours ratios.']:[]),
      ...(statutorySubstituted?['The statutory redundancy calculation is higher and has replaced the scheme illustration.']:[]),
    ]
  };
}

export function formatCompensationResult(result,locale='en-GB'){
  const gbp=new Intl.NumberFormat(locale,{style:'currency',currency:'GBP'});
  return {...result,display:{finalAward:gbp.format(result.finalAward),schemeAward:gbp.format(result.schemeAward),statutoryAmount:gbp.format(result.statutory.amount),monthlyPay:gbp.format(result.breakdown.monthlyPay),standardTariff:gbp.format(result.breakdown.standardTariff),applicableMaximum:gbp.format(result.breakdown.applicableMaximum)}};
}
