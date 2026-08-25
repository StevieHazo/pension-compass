import {
  createScenario,
  compareScenarios,
  serialiseScenarios,
  parseScenarios,
  formatScenario
} from './scenario-builder-engine.js';

import { buildTimeline } from './retirement-timeline-engine.js';

import {
  buildRetirementDashboard,
  formatDashboard
} from './retirement-dashboard-engine.js';

import {
  calculateCompensation,
  formatCompensationResult
} from './compensation-engine.js';

import {
  calculateEPA,
  formatEPA
} from './epa-engine.js';

import {
  calculateAddedPension,
  formatAddedPension
} from './added-pension-engine.js';

import {
  calculatePartialRetirement,
  formatPartialRetirement
} from './partial-retirement-engine.js';

import {
  calculateEarlyRetirement,
  formatEarlyRetirement
} from './early-retirement-engine.js';

import {
  calculateARRBuyOut,
  formatARRBuyOut
} from './arr-buyout-engine.js';


/* =========================================================
   SHARED HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const num = value =>
  Number(String(value ?? '').replace(/[^0-9.]/g, ''));

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP'
});

const esc = value =>
  String(value).replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]
  );

const renderWarnings = (element, warnings = []) => {
  if (!element) return;

  element.innerHTML = warnings
    .map(warning => `<p>${esc(warning)}</p>`)
    .join('');
};


/* =========================================================
   PAGE ROUTING AND NAVIGATION
   ========================================================= */

const pages = [...document.querySelectorAll('.page')];
const navigationLinks = [...document.querySelectorAll('nav a')];

const mobileMenu = $('mobile');
const menuButton = $('menu');

function route() {
  const requestedPage = (location.hash || '#home').slice(1);

  const selectedPage =
    pages.find(page => page.dataset.page === requestedPage) ||
    pages.find(page => page.dataset.page === 'home') ||
    pages[0];

  if (!selectedPage) return;

  pages.forEach(page => {
    page.classList.toggle('active', page === selectedPage);
  });

  navigationLinks.forEach(link => {
    link.classList.toggle(
      'active',
      link.hash === `#${selectedPage.dataset.page}`
    );
  });

  if (mobileMenu) {
    mobileMenu.hidden = true;
  }

  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);

route();

if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    mobileMenu.hidden = !mobileMenu.hidden;
  });
}

if (mobileMenu) {
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.hidden = true;
    });
  });
}


/* =========================================================
   LUMP SUM EXPLORER
   ========================================================= */

$('lumpForm')?.addEventListener('submit', event => {
  event.preventDefault();

  const annualPension = num($('annualPension')?.value);
  const chosenLumpSum = num($('chosenLump')?.value);
  const error = $('lumpError');

  if (error) {
    error.textContent = '';
  }

  const pensionExchanged = chosenLumpSum / 12;

  if (
    !(annualPension > 0) ||
    !(chosenLumpSum >= 0) ||
    pensionExchanged > annualPension
  ) {
    if (error) {
      error.textContent =
        'Enter valid figures. The chosen lump sum cannot exchange more annual pension than entered.';
    }

    return;
  }

  const remainingAnnualPension =
    annualPension - pensionExchanged;

  $('lumpAnnual').textContent =
    gbp.format(remainingAnnualPension);

  $('lumpMonthly').textContent =
    gbp.format(remainingAnnualPension / 12);

  $('lumpAmount').textContent =
    gbp.format(chosenLumpSum);

  $('lumpExchanged').textContent =
    gbp.format(pensionExchanged);

  $('lumpResults').hidden = false;

  $('lumpResults').scrollIntoView({
    behaviour: 'smooth'
  });
});


/* =========================================================
   COMPENSATION CALCULATOR
   ========================================================= */

if ($('partTime')) {
  $('partTime').addEventListener('change', () => {
    if ($('partTimeFields')) {
      $('partTimeFields').hidden =
        !$('partTime').checked;
    }
  });
}

document
  .querySelectorAll('[name="compType"]')
  .forEach(radio => {
    radio.addEventListener('change', () => {
      if ($('veOptions')) {
        $('veOptions').hidden =
          radio.value !== 'voluntary-exit';
      }
    });
  });

$('compForm')?.addEventListener('submit', event => {
  event.preventDefault();

  const error = $('compError');

  if (error) {
    error.textContent = '';
  }

  try {
    const selectedType =
      document.querySelector(
        '[name="compType"]:checked'
      )?.value;

    const result = calculateCompensation({
      type: selectedType,
      dateOfBirth: $('dob')?.value,
      firstDayOfContinuousService:
        $('startDate')?.value,
      lastDayOfService:
        $('lastDate')?.value,
      normalPensionDate:
        $('pensionDate')?.value,
      reckonableServiceYears:
        num($('service')?.value),
      basicSalary:
        num($('salary')?.value),
      pensionableAllowances:
        num($('allowances')?.value),
      partTime:
        Boolean($('partTime')?.checked),
      partTimeHours:
        num($('ptHours')?.value),
      fullTimeHours:
        num($('ftHours')?.value),
      fullTimeEquivalentServiceYears:
        num($('fteService')?.value),
      lowerPaidUnderpin:
        Boolean($('underpin')?.checked),
      standardTariffMultiple:
        num($('multiple')?.value),
      runStatutoryTest: true
    });

    renderCompensation(
      formatCompensationResult(result)
    );
  } catch (errorCaught) {
    if (error) {
      error.textContent = errorCaught.message;
    }
  }
});

function renderCompensation(result) {
  const breakdown = result.breakdown;
  const display = result.display;

  const typeNames = {
    'voluntary-exit': 'Voluntary Exit',
    'voluntary-redundancy':
      'Voluntary Redundancy',
    'compulsory-redundancy':
      'Compulsory Redundancy'
  };

  $('finalAward').textContent =
    display.finalAward;

  $('awardType').textContent =
    typeNames[result.type] +
    (
      result.statutorySubstituted
        ? ' · statutory amount substituted'
        : ''
    );

  $('schemeAward').textContent =
    display.schemeAward;

  $('payUsed').textContent =
    gbp.format(breakdown.calculationPay);

  $('monthlyPay').textContent =
    display.monthlyPay;

  $('serviceUsed').textContent =
    `${breakdown.reckonableServiceYears.toFixed(4)} years`;

  $('standardTariff').textContent =
    display.standardTariff;

  $('applicableMax').textContent =
    display.applicableMaximum;

  $('monthsToPA').textContent =
    `${breakdown.monthsToPensionAge} months`;

  $('statutoryAmount').textContent =
    display.statutoryAmount;

  $('compBreakdown').innerHTML = `
    <p>
      <b>Pay used:</b>
      ${gbp.format(breakdown.calculationPay)}
    </p>
    <p>
      <b>Standard tariff:</b>
      ${gbp.format(breakdown.standardTariff)}
    </p>
    <p>
      <b>Applicable maximum:</b>
      ${gbp.format(breakdown.applicableMaximum)}
    </p>
    <p>
      <b>Scheme illustration:</b>
      ${gbp.format(result.schemeAward)}
    </p>
    <p>
      <b>Statutory comparison:</b>
      ${gbp.format(result.statutory.amount)}
    </p>
  `;

  renderWarnings(
    $('compWarnings'),
    result.warnings
  );

  $('compResults').hidden = false;

  $('compResults').scrollIntoView({
    behaviour: 'smooth'
  });
}

if ($('printComp')) {
  $('printComp').addEventListener('click', () => {
    window.print();
  });
}


/* =========================================================
   EPA ESTIMATOR
   ========================================================= */

$('epaForm')?.addEventListener('submit', event => {
  event.preventDefault();

  const error = $('epaError');

  if (error) {
    error.textContent = '';
  }

  try {
    const selectedOption =
      document.querySelector(
        '[name="epaOption"]:checked'
      )?.value;

    const result = formatEPA(
      calculateEPA({
        dateOfBirth:
          $('epaDob')?.value,
        epaStartDate:
          $('epaStart')?.value,
        normalPensionDate:
          $('epaNpaDate')?.value,
        pensionableEarnings:
          num($('epaSalary')?.value),
        option:
          Number(selectedOption)
      })
    );

    $('epaRate').textContent =
      result.display.percentageOfEarnings;

    $('epaMonthly').textContent =
      result.display.monthlyCost;

    $('epaAnnual').textContent =
      result.display.annualCost;

    $('epaOptionResult').textContent =
      `EPA-${result.option}`;

    $('epaNpa').textContent =
      `${result.normalPensionAge.years} years ` +
      `${result.normalPensionAge.months} months`;

    $('epaBreakdown').innerHTML = `
      <p>
        <b>Factor used:</b>
        ${result.contractRate}
      </p>
      <p>
        <b>Pensionable earnings:</b>
        ${gbp.format(num($('epaSalary')?.value))}
      </p>
      <p>
        <b>Annual cost:</b>
        ${result.display.annualCost}
      </p>
      <p>
        <b>Monthly cost:</b>
        ${result.display.monthlyCost}
      </p>
    `;

    renderWarnings(
      $('epaWarnings'),
      result.warnings
    );

    $('epaResults').hidden = false;

    $('epaResults').scrollIntoView({
      behaviour: 'smooth'
    });
  } catch (errorCaught) {
    if (error) {
      error.textContent = errorCaught.message;
    }
  }
});


/* =========================================================
   ADDED PENSION ESTIMATOR
   ========================================================= */

function synchroniseAddedPensionForm() {
  const direction =
    document.querySelector(
      '[name="apDirection"]:checked'
    )?.value;

  const frequency =
    document.querySelector(
      '[name="apFrequency"]:checked'
    )?.value;

  const amountLabel = $('apAmountLabel');

  if (!amountLabel) return;

  if (direction === 'payment-to-pension') {
    amountLabel.childNodes[0].nodeValue =
      frequency === 'monthly'
        ? 'Monthly contribution'
        : 'One-off payment';
  } else {
    amountLabel.childNodes[0].nodeValue =
      'Target annual added pension';
  }
}

document
  .querySelectorAll(
    '[name="apDirection"], [name="apFrequency"]'
  )
  .forEach(control => {
    control.addEventListener(
      'change',
      synchroniseAddedPensionForm
    );
  });

synchroniseAddedPensionForm();

if ($('apCover')) {
  $('apCover').addEventListener('change', () => {
    if ($('apSexLabel')) {
      $('apSexLabel').hidden =
        $('apCover').value === 'dependants';
    }
  });
}

$('apForm')?.addEventListener('submit', event => {
  event.preventDefault();

  const error = $('apError');

  if (error) {
    error.textContent = '';
  }

  try {
    const direction =
      document.querySelector(
        '[name="apDirection"]:checked'
      )?.value;

    const frequency =
      document.querySelector(
        '[name="apFrequency"]:checked'
      )?.value;

    const result = formatAddedPension(
      calculateAddedPension({
        direction,
        paymentFrequency: frequency,
        dateOfBirth:
          $('apDob')?.value,
        contractStartDate:
          $('
        /* =========================================================
   PARTIAL RETIREMENT PLANNER
   ========================================================= */

$('prForm')?.addEventListener('submit', event => {
  event.preventDefault();

  const error = $('prError');

  if (error) {
    error.textContent = '';
  }

  try {
    const result = formatPartialRetirement(
      calculatePartialRetirement({
        age:
          num($('prAge')?.value),
        normalPensionAge:
          num($('prNpa')?.value),
        currentSalary:
          num($('prCurrentSalary')?.value),
        newSalary:
          num($('prNewSalary')?.value),
        annualPension:
          num($('prPension')?.value),
        standardLumpSum:
          num($('prLump')?.value),
        drawPercentage:
          num($('prDraw')?.value),
        abatement:
          num($('prAbatement')?.value),
        otherIncome:
          num($('prOther')?.value),
        yearsToFinalRetirement:
          num($('prYears')?.value),
        payGrowth:
          num($('prPayGrowth')?.value),
        cpi:
          num($('prCpi')?.value)
      })
    );

    $('prAfterAnnual').textContent =
      result.display.afterAnnual;

    $('prChange').textContent =
      `${result.annualDifference >= 0 ? '+' : ''}` +
      `${result.display.annualDifference} ` +
      'a year compared with before';

    $('prBeforeAnnual').textContent =
      result.display.beforeAnnual;

    $('prBeforeMonthly').textContent =
      `${result.display.beforeMonthly} per month`;

    $('prAfterAnnualCard').textContent =
      result.display.afterAnnual;

    $('prAfterMonthly').textContent =
      `${result.display.afterMonthly} per month`;

    $('prSalaryResult').textContent =
      gbp.format(
        num($('prNewSalary')?.value)
      );

    $('prPensionResult').textContent =
      result.display.pensionDrawn;

    $('prLumpResult').textContent =
      result.display.lumpSumDrawn;

    $('prReduction').textContent =
      `${result.display.salaryReduction} ` +
      `(${result.salaryReductionPercentage}%)`;

    const maximumProjection =
      Math.max(
        ...result.projection.map(
          point => point.combined
        ),
        1
      );

    $('prChart').innerHTML =
      result.projection
        .map(point => {
          const barHeight = Math.max(
            8,
            (
              point.combined /
              maximumProjection
            ) * 150
          );

          return `
            <div>
              <b>
                ${gbp.format(point.combined)}
              </b>
              <i
                style="height:${barHeight}px"
              ></i>
              <span>
                Year ${point.year}
              </span>
            </div>
          `;
        })
        .join('');

    if ($('prBreakdown')) {
      $('prBreakdown').innerHTML = `
        <p>
          <b>New salary:</b>
          ${gbp.format(
            num($('prNewSalary')?.value)
          )}
        </p>
        <p>
          <b>Pension percentage drawn:</b>
          ${num($('prDraw')?.value)}%
        </p>
        <p>
          <b>Pension in payment:</b>
          ${result.display.pensionDrawn}
        </p>
        <p>
          <b>Combined annual income:</b>
          ${result.display.afterAnnual}
        </p>
      `;
    }

    renderWarnings(
      $('prWarnings'),
      result.warnings
    );

    $('prResults').hidden = false;

    $('prResults').scrollIntoView({
      behavior: 'smooth'
    });
  } catch (errorCaught) {
    if (error) {
      error.textContent = errorCaught.message;
    }
  }
});


/* =========================================================
   EARLY RETIREMENT EXPLORER
   ========================================================= */

function synchroniseEarlyRetirementForm() {
  if (!$('erNpa') || !$('erCustomWrap')) {
    return;
  }

  $('erCustomWrap').hidden =
    $('erNpa').value === '60';
}

if ($('erNpa')) {
  $('erNpa').addEventListener(
    'change',
    synchroniseEarlyRetirementForm
  );

  synchroniseEarlyRetirementForm();
}

$('erForm')?.addEventListener('submit', event => {
  event.preventDefault();

  const error = $('erError');

  if (error) {
    error.textContent = '';
  }

  try {
    const result = formatEarlyRetirement(
      calculateEarlyRetirement({
        retirementAge:
          num($('erAge')?.value),
        normalPensionAge:
          num($('erNpa')?.value),
        unreducedPension:
          num($('erPension')?.value),
        unreducedLumpSum:
          num($('erLump')?.value),
        customPensionFactor:
          num($('erCustomFactor')?.value)
      })
    );

    $('erReducedPension').textContent =
      result.display.reducedPension;

    $('erBeforePension').textContent =
      result.display.unreducedPension;

    $('erAfterPension').textContent =
      result.display.reducedPension;

    $('erMonthly').textContent =
      `${result.display.monthlyPension} per month`;

    $('erYearsEarly').textContent =
      result.yearsEarly;

    $('erFactor').textContent =
      result.pensionFactor;

    $('erReduction').textContent =
      result.display.annualPensionReduction;

    $('erReducedLump').textContent =
      result.display.reducedLumpSum;

    $('erBreakdown').innerHTML = `
      <p>
        <b>Method:</b>
        ${esc(result.method)}
      </p>
      <p>
        <b>Unreduced pension:</b>
        ${result.display.unreducedPension}
      </p>
      <p>
        <b>Pension factor:</b>
        ${result.pensionFactor}
      </p>
      <p>
        <b>Reduced pension:</b>
        ${result.display.reducedPension}
      </p>
      <p>
        <b>Lump-sum factor:</b>
        ${result.lumpSumFactor}
      </p>
      <p>
        <b>Reduced lump sum:</b>
        ${result.display.reducedLumpSum}
      </p>
    `;

    renderWarnings(
      $('erWarnings'),
      result.warnings
    );

    $('erResults').hidden = false;

    $('erResults').scrollIntoView({
      behavior: 'smooth'
    });
  } catch (errorCaught) {
    if (error) {
      error.textContent = errorCaught.message;
    }
  }
});


/* =========================================================
   ACTUARIAL REDUCTION BUY-OUT PLANNER
   ========================================================= */

$('arrForm')?.addEventListener('submit', event => {
  event.preventDefault();

  const error = $('arrError');

  if (error) {
    error.textContent = '';
  }

  try {
    const result = formatARRBuyOut(
      calculateARRBuyOut({
        pcspsPensionBuyoutCost:
          num($('arrPCSPSPen')?.value),
        pcspsLumpSumBuyoutCost:
          num($('arrPCSPSLS')?.value),
        alphaPensionBuyoutCost:
          num($('arrAlpha')?.value),
        compensation:
          num($('arrComp')?.value),
        employerTopUp:
          num($('arrEmployer')?.value),
        personalFunds:
          num($('arrPersonal')?.value)
      })
    );

    $('arrFundedPc').textContent =
      `${result.fundedPercentage.toFixed(1)}%`;

    $('arrPosition').textContent =
      result.fullyFunded
        ? 'Fully funded'
        : `${result.display.shortfall} shortfall`;

    $('arrStatus').textContent =
      result.fullyFunded
        ? 'Fully funded'
        : 'Funding gap';

    $('arrStatus').classList.toggle(
      'fail',
      !result.fullyFunded
    );

    $('arrBar').style.width =
      `${Math.min(
        100,
        result.fundedPercentage
      )}%`;

    $('arrFullCost').textContent =
      result.display.fullCost;

    $('arrAvailable').textContent =
      result.display.available;

    $('arrShortfall').textContent =
      result.display.shortfall;

    $('arrCompUsed').textContent =
      result.display.compensationUsed;

    $('arrEmployerUsed').textContent =
      result.display.employerUsed;

    $('arrPersonalUsed').textContent =
      result.display.personalUsed;

    $('arrCompRemaining').textContent =
      result.display.remainingCompensation;

    if ($('arrBreakdown')) {
      $('arrBreakdown').innerHTML = `
        <p>
          <b>PCSPS quoted cost:</b>
          ${result.display.pcspsCost}
        </p>
        <p>
          <b>Alpha quoted cost:</b>
          ${result.display.alphaCost}
        </p>
        <p>
          <b>Total quoted cost:</b>
          ${result.display.fullCost}
        </p>
        <p>
          <b>Total funding entered:</b>
          ${result.display.available}
        </p>
        <p>
          <b>Remaining shortfall:</b>
          ${result.display.shortfall}
        </p>
      `;
    }

    renderWarnings(
      $('arrWarnings'),
      result.warnings
    );

    $('arrResults').hidden = false;

    $('arrResults').scrollIntoView({
      behavior: 'smooth'
    });
  } catch (errorCaught) {
    if (error) {
      error.textContent = errorCaught.message;
    }
  }
});


/* =========================================================
   RETIREMENT DASHBOARD
   ========================================================= */

const DASHBOARD_STORAGE_KEY =
  'pension-compass-retirement-plan-v1';

function getDashboardInput() {
  return {
    currentAge:
      num($('dashCurrentAge')?.value),

    targetAge:
      num($('dashTargetAge')?.value),

    normalPensionAge:
      num($('dashNpa')?.value),

    scheme:
      $('dashScheme')?.value || '',

    currentSalary:
      num($('dashSalary')?.value),

    annualPension:
      num($('dashPension')?.value),

    lumpSum:
      num($('dashLump')?.value),

    considerPartial:
      Boolean($('dashPartial')?.checked),

    considerAddedPension:
      Boolean($('dashAdded')?.checked),

    hasEPA:
      Boolean($('dashEPA')?.checked),

    hasCompensation:
      Boolean($('dashComp')?.checked)
  };
}

function renderDashboard(rawDashboard) {
  const result = formatDashboard(
    buildRetirementDashboard(rawDashboard)
  );

  $('dashTargetResult').textContent =
    `Age ${result.targetAge}`;

  $('dashCountdown').textContent =
    `${result.yearsToTarget} years ` +
    'from the age entered';

  $('dashPensionResult').textContent =
    result.display.annualPension;

  $('dashMonthlyResult').textContent =
    `${result.display.monthlyPension} per month`;

  $('dashLumpResult').textContent =
    result.display.lumpSum;

  $('dashSchemeResult').textContent =
    result.scheme || 'Scheme not selected';

  if (result.early) {
    $('dashNpaPosition').textContent =
      `${Math.abs(result.yearsFromNPA)} ` +
      'years before NPA';
  } else if (result.yearsFromNPA === 0) {
    $('dashNpaPosition').textContent =
      'At NPA';
  } else {
    $('dashNpaPosition').textContent =
      `${result.yearsFromNPA} ` +
      'years after NPA';
  }

  $('dashReplacement').textContent =
    result.salaryReplacement === null
      ? 'Not available'
      : `${result.salaryReplacement}%`;

  $('dashSalaryResult').textContent =
    result.display.salary;

  $('dashActionCount').textContent =
    result.recommendations.length;

  $('dashActions').innerHTML =
    result.recommendations
      .map(recommendation => {
        return `
          <article
            class="action-card
              ${esc(recommendation.priority)}"
          >
            <div>
              <h4>
                ${esc(recommendation.title)}
              </h4>
              <p>
                ${esc(recommendation.reason)}
              </p>
            </div>
            ${esc(recommendation.href)}
              ${esc(recommendation.action)} →
            </a>
          </article>
        `;
      })
      .join('');

  renderWarnings(
    $('dashWarnings'),
    result.warnings
  );

  $('dashResults').hidden = false;
}

$('dashForm')?.addEventListener(
  'submit',
  event => {
    event.preventDefault();

    const error = $('dashError');

    if (error) {
      error.textContent = '';
    }

    try {
      const dashboardInput =
        getDashboardInput();

      localStorage.setItem(
        DASHBOARD_STORAGE_KEY,
        JSON.stringify(dashboardInput)
      );

      renderDashboard(dashboardInput);

      if (
        typeof renderRetirementTimeline ===
        'function'
      ) {
        renderRetirementTimeline();
      }

      $('dashResults').scrollIntoView({
        behavior: 'smooth'
      });
    } catch (errorCaught) {
      if (error) {
        error.textContent =
          errorCaught.message;
      }
    }
  }
);

if ($('dashClear')) {
  $('dashClear').addEventListener(
    'click',
    () => {
      localStorage.removeItem(
        DASHBOARD_STORAGE_KEY
      );

      $('dashForm')?.reset();

      if ($('dashResults')) {
        $('dashResults').hidden = true;
      }

      if (
        typeof renderRetirementTimeline ===
        'function'
      ) {
        renderRetirementTimeline();
      }
    }
  );
}

function loadSavedDashboard() {
  try {
    const savedDashboard =
      JSON.parse(
        localStorage.getItem(
          DASHBOARD_STORAGE_KEY
        )
      );

    if (!savedDashboard) {
      return;
    }

    const textValues = {
      dashCurrentAge:
        savedDashboard.currentAge,

      dashTargetAge:
        savedDashboard.targetAge,

      dashNpa:
        savedDashboard.normalPensionAge,

      dashScheme:
        savedDashboard.scheme,

      dashSalary:
        savedDashboard.currentSalary,

      dashPension:
        savedDashboard.annualPension,

      dashLump:
        savedDashboard.lumpSum
    };

    Object.entries(textValues).forEach(
      ([elementId, value]) => {
        const element = $(elementId);

        if (element) {
          element.value = value ?? '';
        }
      }
    );

    if ($('dashPartial')) {
      $('dashPartial').checked =
        Boolean(
          savedDashboard.considerPartial
        );
    }

    if ($('dashAdded')) {
      $('dashAdded').checked =
        Boolean(
          savedDashboard
            .considerAddedPension
        );
    }

    if ($('dashEPA')) {
      $('dashEPA').checked =
        Boolean(savedDashboard.hasEPA);
    }

    if ($('dashComp')) {
      $('dashComp').checked =
        Boolean(
          savedDashboard.hasCompensation
        );
    }

    renderDashboard(savedDashboard);
  } catch {
    localStorage.removeItem(
      DASHBOARD_STORAGE_KEY
    );
  }
}

loadSavedDashboard();


/* =========================================================
   END OF PART 2
   Paste Part 3 immediately underneath this comment.
   ========================================================= */
  /* =========================================================
   CORRECTION TO THE DASHBOARD ACTIONS BLOCK IN PART 2

   Replace the existing $('dashActions').innerHTML block
   in Part 2 with this corrected version.
   ========================================================= */

$('dashActions').innerHTML =
  result.recommendations
    .map(recommendation => {
      return `
        <article
          class="action-card ${esc(
            recommendation.priority
          )}"
        >
          <div>
            <h4>
              ${esc(recommendation.title)}
            </h4>
            <p>
              ${esc(recommendation.reason)}
            </p>
          </div>

          ${esc(
            recommendation.href
          )}
            ${esc(recommendation.action)} →
          </a>
        </article>
      `;
    })
    .join('');


/* =========================================================
   SCENARIO BUILDER
   ========================================================= */

const SCENARIO_STORAGE_KEY =
  'pension-compass-scenarios-v1';

let scenarios = [];

function loadStoredScenarios() {
  try {
    scenarios = parseScenarios(
      localStorage.getItem(
        SCENARIO_STORAGE_KEY
      )
    );
  } catch {
    scenarios = [];

    localStorage.removeItem(
      SCENARIO_STORAGE_KEY
    );
  }
}

function saveScenarios() {
  localStorage.setItem(
    SCENARIO_STORAGE_KEY,
    serialiseScenarios(scenarios)
  );

  renderRetirementTimeline();
}

function getScenarioInput() {
  const storedScenario =
    scenarios.find(
      scenario =>
        scenario.id ===
        $('scenarioId')?.value
    );

  return {
    id:
      $('scenarioId')?.value ||
      undefined,

    name:
      $('scenarioName')?.value || '',

    retirementAge:
      num($('scenarioAge')?.value),

    scheme:
      $('scenarioScheme')?.value || '',

    annualPension:
      num($('scenarioPension')?.value),

    lumpSum:
      num($('scenarioLump')?.value),

    annualSalary:
      num($('scenarioSalary')?.value),

    otherIncome:
      num($('scenarioOther')?.value),

    notes:
      $('scenarioNotes')?.value || '',

    createdAt:
      storedScenario?.createdAt
  };
}

function resetScenarioForm() {
  $('scenarioForm')?.reset();

  if ($('scenarioId')) {
    $('scenarioId').value = '';
  }

  if ($('scenarioSave')) {
    $('scenarioSave').textContent =
      'Save scenario';
  }

  if ($('scenarioError')) {
    $('scenarioError').textContent = '';
  }
}

function editScenario(scenarioId) {
  const scenario =
    scenarios.find(
      item => item.id === scenarioId
    );

  if (!scenario) {
    return;
  }

  const values = {
    scenarioId:
      scenario.id,

    scenarioName:
      scenario.name,

    scenarioAge:
      scenario.retirementAge,

    scenarioScheme:
      scenario.scheme === 'Not selected'
        ? ''
        : scenario.scheme,

    scenarioPension:
      scenario.annualPension,

    scenarioLump:
      scenario.lumpSum,

    scenarioSalary:
      scenario.annualSalary,

    scenarioOther:
      scenario.otherIncome,

    scenarioNotes:
      scenario.notes
  };

  Object.entries(values).forEach(
    ([elementId, value]) => {
      const element = $(elementId);

      if (element) {
        element.value = value ?? '';
      }
    }
  );

  if ($('scenarioSave')) {
    $('scenarioSave').textContent =
      'Update scenario';
  }

  $('scenarioForm')?.scrollIntoView({
    behavior: 'smooth'
  });
}

function deleteScenario(scenarioId) {
  scenarios =
    scenarios.filter(
      scenario =>
        scenario.id !== scenarioId
    );

  saveScenarios();
  renderScenarios();
}

function createScenarioCard(rawScenario) {
  const scenario =
    formatScenario(rawScenario);

  const notesMarkup =
    scenario.notes
      ? `
        <p class="scenario-notes">
          ${esc(scenario.notes)}
        </p>
      `
      : '';

  return `
    <article class="scenario-card">
      <header>
        <div>
          <h3>
            ${esc(scenario.name)}
          </h3>

          <p>
            Age ${scenario.retirementAge}
            ·
            ${esc(scenario.scheme)}
          </p>
        </div>
      </header>

      <div class="scenario-values">
        <span>
          Combined annual income
          <b>
            ${scenario.display
              .combinedAnnualIncome}
          </b>
        </span>

        <span>
          Monthly income
          <b>
            ${scenario.display.monthlyIncome}
          </b>
        </span>

        <span>
          Annual pension
          <b>
            ${scenario.display.annualPension}
          </b>
        </span>

        <span>
          Lump sum
          <b>
            ${scenario.display.lumpSum}
          </b>
        </span>
      </div>

      ${notesMarkup}

      <div class="scenario-actions">
        <button
          class="edit"
          type="button"
          data-edit-scenario="${esc(
            scenario.id
          )}"
        >
          Edit
        </button>

        <button
          class="delete"
          type="button"
          data-delete-scenario="${esc(
            scenario.id
          )}"
        >
          Delete
        </button>
      </div>
    </article>
  `;
}

function renderScenarioComparison() {
  const comparisonSection =
    $('scenarioComparison');

  if (!comparisonSection) {
    return;
  }

  comparisonSection.hidden =
    scenarios.length < 2;

  if (scenarios.length < 2) {
    return;
  }

  const comparison =
    compareScenarios(scenarios);

  if ($('scenarioTableBody')) {
    $('scenarioTableBody').innerHTML =
      comparison.scenarios
        .map(rawScenario => {
          const scenario =
            formatScenario(rawScenario);

          const highestIncome =
            scenario.id ===
            comparison.bestIncomeId;

          const salaryAndOther =
            scenario.annualSalary +
            scenario.otherIncome;

          return `
            <tr>
              <td class="${
                highestIncome
                  ? 'best'
                  : ''
              }">
                ${esc(scenario.name)}

                ${
                  highestIncome
                    ? '<small>Highest entered income</small>'
                    : ''
                }
              </td>

              <td>
                ${scenario.retirementAge}
              </td>

              <td>
                ${scenario.display
                  .annualPension}
              </td>

              <td>
                ${gbp.format(
                  salaryAndOther
                )}
              </td>

              <td>
                ${scenario.display
                  .combinedAnnualIncome}
              </td>

              <td>
                ${scenario.display
                  .monthlyIncome}
              </td>

              <td>
                ${scenario.display
                  .lumpSum}
              </td>
            </tr>
          `;
        })
        .join('');
  }

  if ($('scenarioChart')) {
    const maximumIncome =
      Math.max(
        comparison.maxIncome,
        1
      );

    $('scenarioChart').innerHTML =
      comparison.scenarios
        .map(scenario => {
          const barHeight =
            Math.max(
              12,
              (
                scenario
                  .combinedAnnualIncome /
                maximumIncome
              ) * 180
            );

          return `
            <article>
              <b>
                ${gbp.format(
                  scenario
                    .combinedAnnualIncome
                )}
              </b>

              <i
                style="height:${barHeight}px"
              ></i>

              <span>
                ${esc(scenario.name)}
              </span>
            </article>
          `;
        })
        .join('');
  }
}

function renderScenarios() {
  if (!$('scenarioCards')) {
    return;
  }

  if ($('scenarioEmpty')) {
    $('scenarioEmpty').hidden =
      scenarios.length > 0;
  }

  if ($('scenarioDeleteAll')) {
    $('scenarioDeleteAll').hidden =
      scenarios.length === 0;
  }

  $('scenarioCards').innerHTML =
    scenarios
      .map(createScenarioCard)
      .join('');

  $('scenarioCards')
    .querySelectorAll(
      '[data-edit-scenario]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          editScenario(
            button.dataset.editScenario
          );
        }
      );
    });

  $('scenarioCards')
    .querySelectorAll(
      '[data-delete-scenario]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          deleteScenario(
            button.dataset
              .deleteScenario
          );
        }
      );
    });

  renderScenarioComparison();
}

$('scenarioForm')?.addEventListener(
  'submit',
  event => {
    event.preventDefault();

    const error = $('scenarioError');

    if (error) {
      error.textContent = '';
    }

    try {
      const scenario =
        createScenario(
          getScenarioInput()
        );

      const existingIndex =
        scenarios.findIndex(
          item =>
            item.id === scenario.id
        );

      if (existingIndex >= 0) {
        scenarios[existingIndex] =
          scenario;
      } else {
        scenarios.push(scenario);
      }

      saveScenarios();
      resetScenarioForm();
      renderScenarios();
    } catch (errorCaught) {
      if (error) {
        error.textContent =
          errorCaught.message;
      }
    }
  }
);

if ($('scenarioReset')) {
  $('scenarioReset').addEventListener(
    'click',
    resetScenarioForm
  );
}

if ($('scenarioDeleteAll')) {
  $('scenarioDeleteAll')
    .addEventListener(
      'click',
      () => {
        scenarios = [];

        localStorage.removeItem(
          SCENARIO_STORAGE_KEY
        );

        resetScenarioForm();
        renderScenarios();
        renderRetirementTimeline();
      }
    );
}

loadStoredScenarios();
renderScenarios();


/* =========================================================
   RETIREMENT TIMELINE
   ========================================================= */

const TIMELINE_STORAGE_KEY =
  'pension-compass-timeline-v1';

let timelineEvents = [];

function loadTimelineEvents() {
  try {
    const storedEvents =
      JSON.parse(
        localStorage.getItem(
          TIMELINE_STORAGE_KEY
        ) || '[]'
      );

    timelineEvents =
      Array.isArray(storedEvents)
        ? storedEvents
        : [];
  } catch {
    timelineEvents = [];

    localStorage.removeItem(
      TIMELINE_STORAGE_KEY
    );
  }
}

function saveTimelineEvents() {
  localStorage.setItem(
    TIMELINE_STORAGE_KEY,
    JSON.stringify(timelineEvents)
  );
}

function getSavedDashboard() {
  try {
    return JSON.parse(
      localStorage.getItem(
        DASHBOARD_STORAGE_KEY
      )
    );
  } catch {
    return null;
  }
}

function removeTimelineEvent(eventId) {
  timelineEvents =
    timelineEvents.filter(
      event => event.id !== eventId
    );

  saveTimelineEvents();
  renderRetirementTimeline();
}

function createTimelinePoint(
  point,
  timeline
) {
  const range =
    Math.max(
      1,
      timeline.maxAge -
      timeline.minAge
    );

  const position =
    (
      (
        point.age -
        timeline.minAge
      ) /
      range
    ) * 100;

  const scenario =
    point.scenario;

  const scenarioMarkup =
    scenario
      ? `
        <div class="timeline-values">
          <span>
            Annual pension
            <b>
              ${gbp.format(
                scenario.annualPension
              )}
            </b>
          </span>

          <span>
            Salary and other income
            <b>
              ${gbp.format(
                scenario.annualSalary +
                scenario.otherIncome
              )}
            </b>
          </span>

          <span>
            Combined annual income
            <b>
              ${gbp.format(
                scenario
                  .combinedAnnualIncome
              )}
            </b>
          </span>

          <span>
            Lump sum
            <b>
              ${gbp.format(
                scenario.lumpSum
              )}
            </b>
          </span>
        </div>
      `
      : '';

  const removeMarkup =
    point.custom
      ? `
        <button
          type="button"
          data-remove-timeline-event="${esc(
            point.id
          )}"
        >
          Remove milestone
        </button>
      `
      : '';

  return `
    <article
      class="timeline-point
        ${esc(point.type || 'event')}"
      style="--pos:${position}%"
    >
      <button
        type="button"
        class="timeline-trigger"
        aria-expanded="false"
      >
        <span class="timeline-dot"></span>

        <small>
          Age ${point.age}
        </small>

        <strong>
          ${esc(point.title)}
        </strong>
      </button>

      <div class="timeline-card">
        <p>
          ${esc(point.detail || '')}
        </p>

        ${scenarioMarkup}
        ${removeMarkup}
      </div>
    </article>
  `;
}

function initialiseTimelineControls() {
  if (!$('timelineVisual')) {
    return;
  }

  $('timelineVisual')
    .querySelectorAll(
      '.timeline-trigger'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          const currentlyOpen =
            button.getAttribute(
              'aria-expanded'
            ) === 'true';

          $('timelineVisual')
            .querySelectorAll(
              '.timeline-trigger'
            )
            .forEach(otherButton => {
              otherButton.setAttribute(
                'aria-expanded',
                'false'
              );
            });

          button.setAttribute(
            'aria-expanded',
            String(!currentlyOpen)
          );
        }
      );
    });

  $('timelineVisual')
    .querySelectorAll(
      '[data-remove-timeline-event]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          removeTimelineEvent(
            button.dataset
              .removeTimelineEvent
          );
        }
      );
    });
}

function renderRetirementTimeline() {
  const timelineVisual =
    $('timelineVisual');

  if (!timelineVisual) {
    return;
  }

  const dashboard =
    getSavedDashboard();

  if ($('timelineEmpty')) {
    $('timelineEmpty').hidden =
      Boolean(dashboard);
  }

  timelineVisual.innerHTML = '';

  if (!dashboard) {
    return;
  }

  const error = $('timelineError');

  if (error) {
    error.textContent = '';
  }

  try {
    const timeline =
      buildTimeline({
        dashboard,
        scenarios,
        events: timelineEvents
      });

    timelineVisual.innerHTML =
      `
        <div
          class="timeline-axis"
          aria-hidden="true"
        ></div>
      ` +
      timeline.points
        .map(point =>
          createTimelinePoint(
            point,
            timeline
          )
        )
        .join('');

    initialiseTimelineControls();
  } catch (errorCaught) {
    if (error) {
      error.textContent =
        errorCaught.message;
    }
  }
}

$('timelineEventForm')?.addEventListener(
  'submit',
  event => {
    event.preventDefault();

    const error = $('timelineError');

    if (error) {
      error.textContent = '';
    }

    try {
      const age =
        num(
          $('timelineEventAge')?.value
        );

      const title =
        $('timelineEventTitle')
          ?.value
          .trim();

      if (!Number.isFinite(age)) {
        throw new Error(
          'Enter a valid age.'
        );
      }

      if (!title) {
        throw new Error(
          'Enter a milestone title.'
        );
      }

      const customEvent = {
        id:
          globalThis.crypto
            ?.randomUUID?.() ||
          `timeline-${Date.now()}`,

        age,

        type:
          $('timelineEventType')
            ?.value ||
          'event',

        title,

        detail:
          $('timelineEventDetail')
            ?.value
            .trim() || ''
      };

      timelineEvents.push(
        customEvent
      );

      saveTimelineEvents();

      $('timelineEventForm').reset();

      renderRetirementTimeline();
    } catch (errorCaught) {
      if (error) {
        error.textContent =
          errorCaught.message;
      }
    }
  }
);

if ($('timelineClearCustom')) {
  $('timelineClearCustom')
    .addEventListener(
      'click',
      () => {
        timelineEvents = [];

        localStorage.removeItem(
          TIMELINE_STORAGE_KEY
        );

        renderRetirementTimeline();
      }
    );
}

loadTimelineEvents();
renderRetirementTimeline();


/* =========================================================
   INTERNAL NAVIGATION LINKS

   The Dashboard recommendations and other page links change
   the hash. The standard router handles the page transition.
   This listener also closes the mobile menu immediately.
   ========================================================= */

document.addEventListener('click', event => {
  const link =
    event.target.closest(
      'a[href^="#"]'
    );

  if (!link) {
    return;
  }

  if (mobileMenu) {
    mobileMenu.hidden = true;
  }
});


/* =========================================================
   FINAL INITIALISATION

   Run the router again after all modules and locally stored
   planning information have been initialised.
   ========================================================= */

route();
