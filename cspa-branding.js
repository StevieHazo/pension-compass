/* OFFICIAL
   Branding and wording only. No router, calculator or storage logic. */

(() => {
  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  const updateBrand = brand => {
    if (!brand) return;

    const icon = brand.querySelector('i');
    if (icon) {
      icon.textContent = 'C';
      icon.setAttribute('aria-hidden', 'true');
    }

    Array.from(brand.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .forEach(node => node.remove());

    const label = document.createElement('span');
    label.className = 'cspa-brand-name';
    label.innerHTML = 'Civil Service<br>Pension Assistant';
    brand.append(label);
    brand.setAttribute('aria-label', 'Civil Service Pension Assistant');
  };

  updateBrand(document.querySelector('header .brand'));
  updateBrand(document.querySelector('footer .brand'));

  document.title = 'Civil Service Pension Assistant';

  const home = document.querySelector('.page[data-page="home"]');

  if (home) {
    setText(
      '.page[data-page="home"] .eyebrow',
      'Civil Service pension planning'
    );

    const heading = home.querySelector('h1');
    if (heading) {
      heading.innerHTML =
        'Understand your Civil Service pension <em>with confidence.</em>';
    }

    const introduction = home.querySelector('.hero > div:first-child > p');
    if (introduction) {
      introduction.textContent =
        'Model retirement options, compare outcomes and understand the impact of pension decisions using specialist Civil Service pension planning tools.';
    }

    const primaryButton = home.querySelector('.buttons .primary');
    if (primaryButton) {
      primaryButton.textContent = 'Start retirement planning →';
    }

    const secondaryButton = home.querySelector('.buttons .secondary');
    if (secondaryButton) {
      secondaryButton.textContent = 'Explore planning tools';
      secondaryButton.setAttribute('href', '#tools');
    }

    const cardLabel = home.querySelector('.hero-card small');
    if (cardLabel) {
      cardLabel.textContent = 'Civil Service Pension Assistant';
    }
  }

  setText(
    '.page[data-page="tools"] .eyebrow',
    'Civil Service pension planning tools'
  );

  const replacements = new Map([
    ['Lump sum explorer', 'Lump Sum Planner'],
    ['Compensation calculator', 'Compensation Planner'],
    ['EPA Estimator', 'EPA Planner'],
    ['Added Pension Estimator', 'Added Pension Planner'],
    ['Early Retirement Explorer', 'Early Retirement Planner']
  ]);

  document
    .querySelectorAll('.tool h2, .hero-card p span')
    .forEach(element => {
      const replacement = replacements.get(element.textContent.trim());
      if (replacement) element.textContent = replacement;
    });
})();
