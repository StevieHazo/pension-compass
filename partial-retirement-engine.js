/** OFFICIAL
 * Partial Retirement scenario engine.
 * Models the income effect of reshaping a job and drawing part of an existing pension.
 * It is an illustration, not a full recreation of every legacy scheme projection.
 */
const round=(n,d=2)=>Math.round((Number(n)+Number.EPSILON)*10**d)/10**d;
const pct=n=>Number(n)/100;
export function calculatePartialRetirement(input){
 const currentSalary=Number(input.currentSalary),newSalary=Number(input.newSalary),annualPension=Number(input.annualPension),standardLumpSum=Number(input.standardLumpSum||0),drawPercentage=Number(input.drawPercentage),age=Number(input.age),normalPensionAge=Number(input.normalPensionAge||60),otherIncome=Number(input.otherIncome||0),abatement=Number(input.abatement||0),cpi=Number(input.cpi||0),payGrowth=Number(input.payGrowth||0),years=Number(input.yearsToFinalRetirement||0);
 const errors=[];for(const [k,v] of Object.entries({currentSalary,newSalary,annualPension,drawPercentage,age,normalPensionAge,years}))if(!Number.isFinite(v)||v<0)errors.push(`${k} must be zero or greater.`);if(drawPercentage>100)errors.push('drawPercentage cannot exceed 100.');if(newSalary>currentSalary)errors.push('newSalary cannot exceed currentSalary in this illustration.');if(errors.length)throw new RangeError(errors.join(' '));
 const pensionFactor=age>=normalPensionAge?1:clamp(0.65+(age-50)*(0.35/10),0.65,1);
 const lumpFactor=age>=normalPensionAge?1:clamp(0.79+(age-50)*(0.21/10),0.79,1);
 const grossPensionDrawn=annualPension*pct(drawPercentage)*pensionFactor;
 const pensionInPayment=Math.max(0,grossPensionDrawn-abatement);
 const lumpSumDrawn=standardLumpSum*pct(drawPercentage)*lumpFactor;
 const beforeAnnual=currentSalary+otherIncome;
 const afterAnnual=newSalary+pensionInPayment+otherIncome;
 const annualDifference=afterAnnual-beforeAnnual;
 const salaryReduction=currentSalary-newSalary;
 const eligibilityReduction=pct(currentSalary?salaryReduction/currentSalary*100:0);
 const projection=[];
 for(let y=0;y<=Math.min(30,years);y++){
  const projectedSalary=newSalary*(1+pct(payGrowth))**y;
  const projectedPension=pensionInPayment*(1+pct(cpi))**y;
  projection.push({year:y,salary:round(projectedSalary),pension:round(projectedPension),combined:round(projectedSalary+projectedPension+otherIncome)});
 }
 return{beforeAnnual:round(beforeAnnual),afterAnnual:round(afterAnnual),beforeMonthly:round(beforeAnnual/12),afterMonthly:round(afterAnnual/12),annualDifference:round(annualDifference),monthlyDifference:round(annualDifference/12),salaryReduction:round(salaryReduction),salaryReductionPercentage:round(eligibilityReduction,1),pensionDrawn:round(pensionInPayment),grossPensionDrawn:round(grossPensionDrawn),lumpSumDrawn:round(lumpSumDrawn),pensionFactor:round(pensionFactor,4),lumpFactor:round(lumpFactor,4),projection,warnings:['Illustration only. The source workbook states that its projections are simplified and may not reflect individual circumstances.','This preview models entered salary, pension drawdown, abatement and growth assumptions. It does not confirm scheme eligibility or final benefits.',...(eligibilityReduction<20?['The entered salary reduction is less than 20%. Check the applicable partial retirement eligibility rules.']:[])]};
}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
export function formatPartialRetirement(r,locale='en-GB'){const f=new Intl.NumberFormat(locale,{style:'currency',currency:'GBP'});return{...r,display:Object.fromEntries(['beforeAnnual','afterAnnual','beforeMonthly','afterMonthly','annualDifference','monthlyDifference','salaryReduction','pensionDrawn','lumpSumDrawn'].map(k=>[k,f.format(r[k])]))}}
