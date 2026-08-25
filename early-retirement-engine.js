/** OFFICIAL
 * Early Retirement Explorer preview.
 * Uses the legacy NPA 60 actuarial-reduction points contained in the supplied workbook
 * and linear interpolation between completed ages. Other NPAs use an explicit user-entered factor.
 */
const PEN60={50:.65,51:.675,52:.701,53:.73,54:.76,55:.794,56:.83,57:.868,58:.91,59:.954,60:1};
const LS60={50:.79,51:.809,52:.828,53:.848,54:.868,55:.889,56:.91,57:.932,58:.955,59:.978,60:1};
const round=(n,d=2)=>Math.round((Number(n)+Number.EPSILON)*10**d)/10**d;
function interpolate(table,age){const keys=Object.keys(table).map(Number).sort((a,b)=>a-b);if(age<=keys[0])return table[keys[0]];if(age>=keys.at(-1))return table[keys.at(-1)];const lo=Math.floor(age),hi=Math.ceil(age);if(lo===hi)return table[lo];return table[lo]+(table[hi]-table[lo])*(age-lo)}
export function calculateEarlyRetirement(input){
 const age=Number(input.retirementAge),npa=Number(input.normalPensionAge),pension=Number(input.unreducedPension),lump=Number(input.unreducedLumpSum||0),custom=Number(input.customPensionFactor||0);
 if(!Number.isFinite(age)||!Number.isFinite(npa)||!Number.isFinite(pension)||age<50||pension<0)throw new RangeError('Enter valid age, Normal Pension Age and pension figures.');
 if(age>=npa)return result(1,1,'No early-payment reduction applied.',age,npa,pension,lump);
 let pf,lf,method;
 if(npa===60){pf=interpolate(PEN60,age);lf=interpolate(LS60,age);method='Supplied NPA 60 age table with interpolation.'}
 else {if(!(custom>0&&custom<=1))throw new RangeError('For Normal Pension Ages other than 60, enter an official pension factor between 0 and 1.');pf=custom;lf=custom;method='User-entered official factor. No lump-sum-specific factor was supplied.'}
 return result(pf,lf,method,age,npa,pension,lump);
}
function result(pf,lf,method,age,npa,pension,lump){const rp=pension*pf,rl=lump*lf;return{retirementAge:age,normalPensionAge:npa,yearsEarly:round(Math.max(0,npa-age),2),pensionFactor:round(pf,5),lumpSumFactor:round(lf,5),unreducedPension:round(pension),reducedPension:round(rp),annualPensionReduction:round(pension-rp),monthlyPension:round(rp/12),unreducedLumpSum:round(lump),reducedLumpSum:round(rl),lumpSumReduction:round(lump-rl),method,warnings:['Illustration only. Do not use this result as a retirement quotation or financial advice.','The supplied Early Retirement workbook covers multiple schemes and factor sets. This preview provides the NPA 60 table journey and accepts an official factor for other NPAs.','Confirm current factors, eligibility and benefits with the pension administrator before making decisions.']}}
export function formatEarlyRetirement(r,locale='en-GB'){const f=new Intl.NumberFormat(locale,{style:'currency',currency:'GBP'});return{...r,display:Object.fromEntries(['unreducedPension','reducedPension','annualPensionReduction','monthlyPension','unreducedLumpSum','reducedLumpSum','lumpSumReduction'].map(k=>[k,f.format(r[k])]))}}
