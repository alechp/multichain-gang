(() => {
  'use strict';
  const SCOPE = window.SCOPE;
  if (!SCOPE) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const replay = target => {
    const element = typeof target === 'string' ? document.getElementById(target) || document.querySelector(target) : target;
    if (!element) return false;
    element.classList.remove('is-replaying');
    void element.offsetWidth;
    if (!reduced.matches) element.classList.add('is-replaying');
    setTimeout(() => element.classList.remove('is-replaying'), reduced.matches ? 1 : 2900);
    return true;
  };

  document.querySelectorAll('[data-replay]').forEach(button => button.addEventListener('click', () => replay(button.dataset.replay)));

  const visibility = document.querySelector('.visibility-map');
  const cascade = () => {
    if (!visibility) return false;
    visibility.classList.remove('is-cascading');
    void visibility.offsetWidth;
    if (!reduced.matches) visibility.classList.add('is-cascading');
    setTimeout(() => visibility.classList.remove('is-cascading'), reduced.matches ? 1 : 900);
    return true;
  };
  document.querySelector('[data-cascade-visibility]')?.addEventListener('click', cascade);

  document.querySelectorAll('[data-ladder-view]').forEach(button => button.addEventListener('click', () => {
    const engineering = button.dataset.ladderView === 'engineering';
    document.querySelector('.user-rail').hidden = engineering;
    document.querySelector('.ladder-engineering').hidden = !engineering;
    document.querySelectorAll('[data-ladder-view]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    SCOPE.Store.create('scope.robinhood.ladder.v1', 'user').set(button.dataset.ladderView);
    SCOPE.announce(`${button.textContent.trim()} latency view selected`);
  }));
  const storedView = SCOPE.Store.create('scope.robinhood.ladder.v1', 'user').get();
  document.querySelector(`[data-ladder-view="${storedView}"]`)?.click();

  const boot = () => {
    document.body.classList.add('booted');
    replay('heroTrace');
  };
  if (reduced.matches) document.body.classList.add('booted');
  else requestAnimationFrame(boot);

  SCOPE.Runtime.restartFigure = replay;
  SCOPE.Runtime.cascadeVisibility = cascade;
})();
