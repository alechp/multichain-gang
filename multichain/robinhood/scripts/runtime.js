(() => {
  'use strict';

  const SCOPE = window.SCOPE = window.SCOPE || {};
  const dataNode = document.getElementById('chainData');
  let data = null;
  try {
    data = JSON.parse(dataNode?.textContent || 'null');
    if (!data || data.schemaVersion !== 1) throw new Error('Unsupported schema');
  } catch (error) {
    document.documentElement.classList.add('data-failed');
    console.error('Robinhood Scope data disabled:', error.message);
  }
  SCOPE.data = data;

  const announce = message => {
    const live = document.getElementById('appLive');
    if (!live) return;
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = message; });
  };

  const Store = {
    create(key, fallback) {
      let memory = fallback;
      return {
        get() {
          try {
            const value = localStorage.getItem(key);
            return value == null ? memory : JSON.parse(value);
          } catch { return memory; }
        },
        set(value) {
          memory = value;
          try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* session memory remains */ }
          return value;
        },
        remove() {
          memory = fallback;
          try { localStorage.removeItem(key); } catch { /* no-op */ }
        }
      };
    }
  };

  const overlayStack = [];
  const focusable = root => [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(node => !node.hidden && node.getClientRects().length);
  const Overlay = {
    open(element, trigger, { modal = true } = {}) {
      if (!element) return false;
      const existing = overlayStack.find(item => item.element === element);
      if (existing) return true;
      element.hidden = false;
      overlayStack.push({ element, trigger: trigger || document.activeElement, modal });
      if (modal) document.body.classList.add(element.id === 'commandShell' ? 'command-open' : 'route-open');
      requestAnimationFrame(() => focusable(element)[0]?.focus());
      return true;
    },
    close(element, { restore = true } = {}) {
      const index = overlayStack.findIndex(item => item.element === element);
      if (index < 0) return false;
      const [entry] = overlayStack.splice(index, 1);
      entry.element.hidden = true;
      if (!overlayStack.some(item => item.modal)) document.body.classList.remove('route-open', 'command-open');
      if (restore && entry.trigger?.isConnected) entry.trigger.focus({ preventScroll: true });
      return true;
    },
    top() { return overlayStack.at(-1) || null; },
    isOpen(element) { return overlayStack.some(item => item.element === element); }
  };

  document.addEventListener('keydown', event => {
    const top = Overlay.top();
    if (event.key === 'Escape' && top) {
      event.preventDefault();
      event.stopPropagation();
      if (top.element.id === 'routeShell' && location.hash.startsWith('#/')) history.back();
      else Overlay.close(top.element);
      return;
    }
    if (event.key !== 'Tab' || !top?.modal) return;
    const nodes = focusable(top.element);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener('pointerdown', event => {
    const top = Overlay.top();
    if (!top || top.element.contains(event.target) || top.trigger?.contains?.(event.target)) return;
    Overlay.close(top.element, { restore: false });
  }, true);

  const safeUrl = value => {
    try {
      const url = new URL(value, document.baseURI);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };

  const escapeHTML = value => String(value ?? '').replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);

  const clockStore = Store.create('scope.robinhood.clock.v1', 'soft');
  const trigger = document.getElementById('clockTrigger');
  const menu = document.getElementById('clockMenu');
  const heroTrace = document.getElementById('heroTrace');
  const clockById = new Map((data?.baseline?.clocks || []).map(clock => [clock.id, clock]));
  const selectClock = id => {
    const clock = clockById.get(id) || clockById.get('soft');
    if (!clock) return;
    clockStore.set(clock.id);
    document.getElementById('clockValue').textContent = `${clock.label} · ${clock.timing}`;
    trigger?.style.setProperty('--clock-color', ({ soft: '#ccff00', posted: '#46d8f4', final: '#a8a7ff', withdrawal: '#f0c36c' })[clock.id]);
    const dot = trigger?.querySelector('.clock-dot');
    if (dot) dot.style.background = ({ soft: '#ccff00', posted: '#46d8f4', final: '#a8a7ff', withdrawal: '#f0c36c' })[clock.id];
    menu?.querySelectorAll('[data-clock]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.clock === clock.id)));
    if (heroTrace) heroTrace.dataset.activeClock = clock.id;
    const live = document.getElementById('clockLive');
    if (live) live.textContent = `${clock.label}, ${clock.timing}, ${clock.meaning}`;
    const sweep = document.querySelector('.clock-sweep');
    sweep?.classList.remove('is-tracing');
    requestAnimationFrame(() => sweep?.classList.add('is-tracing'));
  };
  selectClock(clockStore.get());
  trigger?.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('[aria-checked="true"]')?.focus();
  });
  menu?.addEventListener('click', event => {
    const button = event.target.closest('[data-clock]');
    if (!button) return;
    selectClock(button.dataset.clock);
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });
  document.addEventListener('pointerdown', event => {
    if (!menu?.hidden && !event.target.closest('.clock-picker')) {
      menu.hidden = true;
      trigger?.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || menu?.hidden) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    menu.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.focus({ preventScroll: true });
  }, true);

  const revealNodes = [...document.querySelectorAll('.reveal')];
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) revealNodes.forEach(node => node.classList.add('visible'));
  else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revealNodes.forEach(node => observer.observe(node));
  }
  window.setTimeout(() => revealNodes.forEach(node => node.classList.add('visible')), 900);

  SCOPE.Store = Store;
  SCOPE.Overlay = Overlay;
  SCOPE.announce = announce;
  SCOPE.safeUrl = safeUrl;
  SCOPE.escapeHTML = escapeHTML;
  SCOPE.clock = { select: selectClock };
  SCOPE.Runtime = SCOPE.Runtime || {};
})();
