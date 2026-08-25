/** OFFICIAL
 * Actuarial Reduction Buy-Out Planner.
 * Uses official quoted buy-out costs and models compensation/personal-fund allocation.
 * It does not derive actuarial buy-out factors that are absent from the web release.
 */
const round=(n,d=2)=>Math.round((Number(n)+Number.EPSILON)*10**d)/10**d;
const positive=(v,n)=>{v=Number(v||0);if(!Number.isFinite(v)||v<0)throw new RangeError(`${n} must be zero or greater.`);return v};
export function calculateARRBuyOut(input){
 const pcspsCost=positive(input.pcspsPensionBuyoutCost,'PCSPS pension buy-out cost')+positive(input.pcspsLumpSumBuyoutCost,'PCSPS lump-sum buy-out cost');
 const alphaCost=positive(input.alphaPensionBuyoutCost,'alpha pension buy-out cost');
 const fullCost=round(pcspsCost+alphaCost);
 if(fullCost<=0)throw new RangeError('Enter at least one official buy-out cost.');
 const compensation=positive(input.compensation,'Compensation');
 const employerTopUp=positive(input.employerTopUp,'Employer top-up');
 const personalFunds=positive(input.personalFunds,'Personal funds');
 const available=round(compensation+employerTopUp+personalFunds);
 const amountUsed=round(Math.min(fullCost,available));
 const fundedPercentage=round(amountUsed/fullCost*100,1);
 const shortfall=round(Math.max(0,fullCost-available));
 const remainingCompensation=round(Math.max(0,compensation-Math.min(compensation,fullCost)));
 const compensationUsed=round(Math.min(compensation,fullCost));
 const employerUsed=round(Math.min(employerTopUp,Math.max(0,fullCost-compensationUsed)));
 const personalUsed=round(Math.min(personalFunds,Math.max(0,fullCost-compensationUsed-employerUsed)));
 const restoredPCSPS=round(pcspsCost*(fundedPercentage/100));
 const restoredAlpha=round(alphaCost*(fundedPercentage/100));
 return{fullCost,pcspsCost,alphaCost,available,amountUsed,shortfall,remainingCompensation,compensationUsed,employerUsed,personalUsed,fundedPercentage,restoredPCSPS,restoredAlpha,fullyFunded:shortfall===0,warnings:['Illustration only. Enter buy-out costs from an official quotation. This planner does not calculate actuarial factors or confirm eligibility.','The source calculator states that users should not enter into financial commitments based on calculator figures and that scheme rules prevail.','A partial funding percentage is shown as a planning aid. Confirm how partial buy-out is applied across scheme benefits with the pension administrator.']};
}
export function formatARRBuyOut(r,locale='en-GB'){const f=new Intl.NumberFormat(locale,{style:'currency',currency:'GBP'});return{...r,display:Object.fromEntries(['fullCost','pcspsCost','alphaCost','available','amountUsed','shortfall','remainingCompensation','compensationUsed','employerUsed','personalUsed','restoredPCSPS','restoredAlpha'].map(k=>[k,f.format(r[k])]))}}
