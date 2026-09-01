(() => {
  'use strict';
  const SCOPE = window.SCOPE;
  const cues = SCOPE?.data?.cues || [];
  if (!cues.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const store = SCOPE.Store.create('scope.robinhood.reader.v1', { index: -1, scale: 100 });
  let saved = store.get() || { index: -1, scale: 100 };
  let index = Number.isInteger(saved.index) ? Math.max(-1, Math.min(cues.length - 1, saved.index)) : -1;
  let engaged = index >= 0;
  let playing = false;
  let timer = 0;
  let focusNode = null;
  const toggle = document.getElementById('readerToggle');
  const count = document.getElementById('readerCount');
  const note = document.getElementById('readerNote');
  const scale = document.getElementById('readerScale');

  const save = () => store.set({ index, scale: Number(scale.value) });
  const setScale = value => {
    const allowed = ['85','95','100','110','120'];
    scale.value = allowed.includes(String(value)) ? String(value) : '100';
    document.body.style.setProperty('--reader-scale', String(Number(scale.value) / 100));
    save();
  };
  setScale(saved.scale);
  scale.addEventListener('change', () => { setScale(scale.value); SCOPE.announce(`Reading scale ${scale.value} percent`); });

  const clearTimer = () => { clearTimeout(timer); timer = 0; };
  const pause = reason => {
    clearTimer(); playing = false;
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = engaged ? 'PLAY' : 'READ THROUGH';
    if (reason) SCOPE.announce(`Read-through paused: ${reason}`);
  };
  const schedule = () => {
    clearTimer();
    if (!playing || reduced.matches) return;
    timer = setTimeout(() => { if (index >= cues.length - 1) pause('complete'); else go(index + 1, { user: false }); }, 4300);
  };
  const runAction = action => {
    if (!action) return;
    const [kind, a, b] = action.split(':');
    if (kind === 'replay') SCOPE.Runtime.restartFigure?.(a);
    if (kind === 'dock') SCOPE.Runtime.openDock?.(a, b);
    if (kind === 'visibility') SCOPE.Runtime.cascadeVisibility?.();
    if (kind === 'grid') SCOPE.Runtime.openGridCell?.(a, b);
    if (kind === 'bench') SCOPE.Runtime.filterBench?.(a);
    if (kind === 'route') SCOPE.Router?.open(a);
  };
  function go(next, { user = true } = {}) {
    index = (next + cues.length) % cues.length;
    engaged = true;
    const cue = cues[index];
    focusNode?.classList.remove('cue-focus');
    focusNode = document.querySelector(`[data-cue-anchor="${CSS.escape(cue.anchor)}"]`);
    if (!focusNode) { pause('missing cue target'); return false; }
    focusNode.classList.add('cue-focus');
    focusNode.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cues.length).padStart(2, '0')}`;
    note.textContent = cue.note;
    toggle.textContent = playing ? 'PAUSE' : 'PLAY';
    runAction(cue.action);
    save();
    if (user) SCOPE.announce(`Cue ${index + 1} of ${cues.length}: ${cue.note}`);
    schedule();
    return true;
  }
  const play = () => {
    if (!engaged) go(0);
    if (reduced.matches) { pause(); SCOPE.announce('Reduced motion is on; use previous and next for manual stepping'); return; }
    playing = true; toggle.setAttribute('aria-pressed', 'true'); toggle.textContent = 'PAUSE'; schedule();
  };
  const exit = () => {
    pause(); engaged = false; index = -1; focusNode?.classList.remove('cue-focus'); focusNode = null; count.textContent = `00 / ${cues.length}`; note.textContent = `A ${cues.length}-cue guided tour of the instrument.`; toggle.textContent = 'READ THROUGH'; save();
  };
  toggle.addEventListener('click', () => playing ? pause() : play());
  document.getElementById('readerPrev').addEventListener('click', () => { pause(); go(index < 0 ? 0 : index - 1); });
  document.getElementById('readerNext').addEventListener('click', () => { pause(); go(index < 0 ? 0 : index + 1); });
  document.getElementById('readerExit').addEventListener('click', exit);
  if (engaged) go(index, { user: false });

  const outsideControl = target => target.closest('input, select, textarea, [contenteditable], [role="grid"], [role="tablist"], .command-shell, .route-shell');
  addEventListener('wheel', () => { if (playing) pause('manual scroll'); }, { passive: true });
  addEventListener('touchmove', () => { if (playing) pause('touch scroll'); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause('page hidden'); });
  document.addEventListener('focusin', event => { if (playing && outsideControl(event.target) && !event.target.closest('#reader')) pause('focus moved to another control'); });
  document.addEventListener('keydown', event => {
    if (!engaged || outsideControl(event.target) || SCOPE.Overlay.top()) return;
    if (event.key === 'Escape') { event.preventDefault(); exit(); }
    else if (event.key === ' ' && event.target === document.body) { event.preventDefault(); playing ? pause() : play(); }
    else if (event.key.toLowerCase() === 'j') { event.preventDefault(); pause(); go(index + 1); }
    else if (event.key.toLowerCase() === 'k') { event.preventDefault(); pause(); go(index - 1); }
    else if (['PageDown','PageUp','Home','End','ArrowDown','ArrowUp'].includes(event.key) && playing) pause('manual navigation');
  });
  SCOPE.Playbar = { go, play, pause, exit, get index() { return index; } };
})();
