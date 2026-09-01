(() => {
  'use strict';
  const access = Object.freeze({
    key: 'scope.access.v1',
    digest: '29e5686dacf7ef28c84317644bf7c395f9b11873f6732d0d0a20985f2c09f002'
  });
  const root = document.documentElement;
  const local = location.protocol === 'file:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  const audit = local && new URLSearchParams(location.search).has('scope-audit');
  root.classList.add('mg-auth');
  try {
    if (audit || sessionStorage.getItem(access.key) === access.digest) {
      root.dataset.scopeUnlocked = audit ? 'audit' : 'session';
    }
  } catch (error) {
    if (audit) root.dataset.scopeUnlocked = 'audit';
  }

  const mount = () => {
    if (!document.body || document.getElementById('mgAccessGate')) return;
    const scope = document.body.dataset.authScope || 'PORTAL';
    const gate = document.createElement('section');
    gate.className = 'mg-access-gate';
    gate.id = 'mgAccessGate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'mgAccessTitle');
    gate.innerHTML = `
      <div class="mg-access-console">
        <p class="mg-access-kicker">RESTRICTED DIRECTORY · AUTH CHANNEL 00</p>
        <h2 class="mg-access-title" id="mgAccessTitle">Multichain Gang <span>${scope} · operator access required</span></h2>
        <p class="mg-access-readout">Enter the shared operator code to energize this session. The code is verified locally and retained only for this browser tab.</p>
        <form class="mg-access-form" id="mgAccessForm">
          <label for="mgAccessCode">Access code</label>
          <input id="mgAccessCode" name="code" type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" required aria-describedby="mgAccessStatus">
          <button type="submit">UNLOCK ▸</button>
          <p class="mg-access-status" id="mgAccessStatus" role="status" aria-live="polite">CHANNEL LOCKED · CODE REQUIRED</p>
        </form>
      </div>`;
    document.body.prepend(gate);
    if (root.hasAttribute('data-scope-unlocked')) {
      gate.setAttribute('aria-hidden', 'true');
      return;
    }
    const panel = gate.querySelector('.mg-access-console');
    const form = gate.querySelector('form');
    const input = gate.querySelector('input');
    const submit = gate.querySelector('button');
    const status = gate.querySelector('[role="status"]');
    input.focus({ preventScroll: true });
    input.addEventListener('input', () => {
      delete panel.dataset.denied;
      status.textContent = 'CHANNEL LOCKED · CODE REQUIRED';
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = 'VERIFYING OPERATOR CODE…';
      try {
        const bytes = new TextEncoder().encode(input.value.trim().toUpperCase());
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
        if (hash !== access.digest) throw new Error('denied');
        try { sessionStorage.setItem(access.key, access.digest); } catch (error) {}
        root.dataset.scopeUnlocked = 'code';
        gate.setAttribute('aria-hidden', 'true');
        input.value = '';
        requestAnimationFrame(() => {
          dispatchEvent(new Event('resize'));
          const heading = document.querySelector('h1');
          if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
            heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
          }
        });
      } catch (error) {
        panel.dataset.denied = '';
        status.textContent = error.message === 'denied' ? 'CODE REJECTED · CHECK AND RETRY' : 'VERIFICATION UNAVAILABLE';
        input.select();
      } finally {
        submit.disabled = false;
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
