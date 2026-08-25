/** OFFICIAL
 * Retirement Dashboard engine.
 * Creates a planning summary and routes users to relevant Pension Compass tools.
 * It does not calculate entitlement or provide financial advice.
 */
const round=(n,d=1)=>Math.round((Number(n)+Number.EPSILON)*10**d)/10**d;
const money=n=>Math.max(0,Number(n||0));
export function buildRetirementDashboard(input){
  const currentAge=Number(input.currentAge),targetAge=Number(input.targetAge),normalPensionAge=Number(input.normalPensionAge),salary=money(input.currentSalary),annualPension=money(input.annualPension),lumpSum=money(input.lumpSum),scheme=input.scheme||'Not selected';
  if(!Number.isFinite(currentAge)||!Number.isFinite(targetAge)||!Number.isFinite(normalPensionAge))throw new RangeError('Enter valid current, target and Normal Pension Ages.');
  if(targetAge<currentAge)throw new RangeError('Target retirement age cannot be below current age.');
  const yearsToTarget=round(targetAge-currentAge,1),yearsFromNPA=round(targetAge-normalPensionAge,1),early=yearsFromNPA<0;
  const monthlyPension=round(annualPension/12,2),salaryReplacement=salary>0?round(annualPension/salary*100,1):null;
  const recommendations=[];
  if(early)recommendations.push({priority:'high',title:'Explore early retirement',reason:`Your target is ${Math.abs(yearsFromNPA)} years before the Normal Pension Age entered.`,href:'#early-retirement',action:'Open Early Retirement Explorer'});
  else recommendations.push({priority:'normal',title:'Review retirement income',reason:'Your target is at or after the Normal Pension Age entered.',href:'#lump-sum',action:'Open Lump Sum Explorer'});
  if(input.considerPartial)recommendations.push({priority:'high',title:'Model partial retirement',reason:'You indicated that reducing hours or reshaping your job may be relevant.',href:'#partial-retirement',action:'Open Partial Retirement Planner'});
  if(input.considerAddedPension)recommendations.push({priority:'normal',title:'Explore Added Pension',reason:'You indicated that paying more for pension benefits may be relevant.',href:'#added-pension',action:'Open Added Pension Estimator'});
  if(input.hasEPA)recommendations.push({priority:'normal',title:'Review EPA',reason:'You indicated that an EPA arrangement applies.',href:'#epa',action:'Open EPA Estimator'});
  if(input.hasCompensation)recommendations.push({priority:'normal',title:'Review compensation and buy-out options',reason:'You indicated that compensation may be available.',href:'#compensation',action:'Open Compensation Calculator'});
  recommendations.push({priority:'normal',title:'Check pension tax guidance',reason:'Use official guidance for allowances and potential tax issues.',href:'#tax-hub',action:'Open Tax & Allowances Hub'});
  return{scheme,currentAge,targetAge,normalPensionAge,yearsToTarget,yearsFromNPA,early,salary,annualPension,lumpSum,monthlyPension,salaryReplacement,recommendations,warnings:['Planning summary only. Results depend entirely on the figures and options entered.','Pension Compass does not confirm benefit entitlement, tax liability or whether a retirement option is available.','Use current benefit statements and official quotations before making decisions.']};
}
export function formatDashboard(r,locale='en-GB'){const f=new Intl.NumberFormat(locale,{style:'currency',currency:'GBP'});return{...r,display:{salary:f.format(r.salary),annualPension:f.format(r.annualPension),monthlyPension:f.format(r.monthlyPension),lumpSum:f.format(r.lumpSum)}}}
