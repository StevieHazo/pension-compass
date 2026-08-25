/** OFFICIAL - Pension Compass Scenario Builder */
const round=(n,d=2)=>Math.round((Number(n)+Number.EPSILON)*10**d)/10**d;
const money=(v,label)=>{const n=Number(v||0);if(!Number.isFinite(n)||n<0)throw new RangeError(`${label} must be zero or greater.`);return round(n)};
export function createScenario(input){
 const name=String(input.name||'').trim();
 const retirementAge=Number(input.retirementAge);
 if(!name)throw new RangeError('Enter a scenario name.');
 if(!Number.isFinite(retirementAge)||retirementAge<50||retirementAge>80)throw new RangeError('Retirement age must be between 50 and 80.');
 const annualPension=money(input.annualPension,'Annual pension');
 const lumpSum=money(input.lumpSum,'Lump sum');
 const annualSalary=money(input.annualSalary,'Annual salary');
 const otherIncome=money(input.otherIncome,'Other income');
 const combinedAnnualIncome=round(annualPension+annualSalary+otherIncome);
 return{id:input.id||globalThis.crypto?.randomUUID?.()||`scenario-${Date.now()}-${Math.random().toString(16).slice(2)}`,name,retirementAge,scheme:String(input.scheme||'Not selected'),annualPension,lumpSum,annualSalary,otherIncome,combinedAnnualIncome,monthlyIncome:round(combinedAnnualIncome/12),notes:String(input.notes||'').trim(),createdAt:input.createdAt||new Date().toISOString()};
}
export function compareScenarios(items){
 const scenarios=items.map(createScenario);
 if(!scenarios.length)return{scenarios:[],maxIncome:0,bestIncomeId:null,earliestId:null,largestLumpSumId:null};
 const sorted=(key,dir=1)=>[...scenarios].sort((a,b)=>(a[key]-b[key])*dir);
 return{scenarios,maxIncome:Math.max(...scenarios.map(x=>x.combinedAnnualIncome)),bestIncomeId:sorted('combinedAnnualIncome',-1)[0].id,earliestId:sorted('retirementAge')[0].id,largestLumpSumId:sorted('lumpSum',-1)[0].id};
}
export const serialiseScenarios=items=>JSON.stringify(items.map(createScenario));
export function parseScenarios(raw){if(!raw)return[];const data=JSON.parse(raw);if(!Array.isArray(data))throw new TypeError('Saved scenarios are invalid.');return data.map(createScenario)}
export function formatScenario(s,locale='en-GB'){const f=new Intl.NumberFormat(locale,{style:'currency',currency:'GBP'});return{...s,display:{annualPension:f.format(s.annualPension),lumpSum:f.format(s.lumpSum),annualSalary:f.format(s.annualSalary),otherIncome:f.format(s.otherIncome),combinedAnnualIncome:f.format(s.combinedAnnualIncome),monthlyIncome:f.format(s.monthlyIncome)}}}
