(() => {
  'use strict';

  const controls = new Set();
  let active = null;
  let serial = 0;

  const optionButtons = control => [...control.menu.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];

  const close = (control = active, { focus = false } = {}) => {
    if (!control) return false;
    control.menu.hidden = true;
    control.trigger.setAttribute('aria-expanded', 'false');
    control.wrapper.removeAttribute('data-open');
    if (active === control) active = null;
    if (focus) control.trigger.focus({ preventScroll: true });
    return true;
  };

  const position = control => {
    if (control.menu.hidden) return;
    const triggerRect = control.trigger.getBoundingClientRect();
    const width = Math.min(Math.max(triggerRect.width, 156), innerWidth - 16);
    control.menu.style.width = `${width}px`;
    control.menu.style.left = `${Math.max(8, Math.min(triggerRect.left, innerWidth - width - 8))}px`;
    control.menu.style.top = `${triggerRect.bottom + 6}px`;
    const menuRect = control.menu.getBoundingClientRect();
    const roomAbove = triggerRect.top - 8;
    const roomBelow = innerHeight - triggerRect.bottom - 8;
    const opensUp = menuRect.height > roomBelow && roomAbove > roomBelow;
    control.menu.style.top = `${opensUp ? Math.max(8, triggerRect.top - menuRect.height - 6) : triggerRect.bottom + 6}px`;
    control.menu.dataset.side = opensUp ? 'top' : 'bottom';
  };

  const sync = control => {
    const selected = control.select.options[control.select.selectedIndex] || control.select.options[0];
    const label = selected?.textContent?.trim() || 'Choose';
    control.value.textContent = label;
    control.trigger.setAttribute('aria-label', `${control.label}: ${label}`);
    control.menu.querySelectorAll('[role="option"]').forEach((button, index) => {
      const isSelected = index === control.select.selectedIndex;
      button.setAttribute('aria-selected', String(isSelected));
      button.querySelector('.mg-select-check').textContent = isSelected ? '✓' : '';
    });
  };

  const choose = (control, index) => {
    const option = control.select.options[index];
    if (!option || option.disabled) return;
    control.select.selectedIndex = index;
    control.select.dispatchEvent(new Event('change', { bubbles: true }));
    sync(control);
    close(control, { focus: true });
  };

  const rebuild = control => {
    control.menu.replaceChildren();
    [...control.select.options].forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mg-select-option';
      button.setAttribute('role', 'option');
      button.dataset.index = String(index);
      button.setAttribute('aria-disabled', String(option.disabled));
      button.disabled = option.disabled;
      const check = document.createElement('span');
      check.className = 'mg-select-check';
      check.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      copy.textContent = option.textContent;
      button.append(check, copy);
      control.menu.append(button);
    });
    sync(control);
  };

  const open = control => {
    if (active && active !== control) close(active);
    active = control;
    control.menu.hidden = false;
    control.trigger.setAttribute('aria-expanded', 'true');
    control.wrapper.dataset.open = 'true';
    position(control);
    requestAnimationFrame(() => {
      position(control);
      optionButtons(control).find(button => button.getAttribute('aria-selected') === 'true')?.focus({ preventScroll: true });
    });
  };

  const labelFor = select => {
    if (select.getAttribute('aria-label')) return select.getAttribute('aria-label');
    const label = select.closest('label');
    const direct = label ? [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent.trim()).filter(Boolean).join(' ') : '';
    return direct || select.id || 'Select option';
  };

  const enhance = select => {
    if (!(select instanceof HTMLSelectElement) || select.dataset.selectUi === 'true') return;
    const label = labelFor(select);
    const wrapper = document.createElement('span');
    wrapper.className = 'mg-select';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'mg-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const value = document.createElement('span');
    value.className = 'mg-select-value';
    const caret = document.createElement('span');
    caret.className = 'mg-select-caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.textContent = '⌄';
    trigger.append(value, caret);

    const menu = document.createElement('div');
    menu.className = 'mg-select-menu';
    menu.id = `mgSelectMenu${++serial}`;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', label);
    menu.hidden = true;
    trigger.setAttribute('aria-controls', menu.id);

    select.before(wrapper);
    wrapper.append(select, trigger);
    document.body.append(menu);
    select.classList.add('mg-native-select');
    select.dataset.selectUi = 'true';
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const control = { select, wrapper, trigger, value, menu, label };
    controls.add(control);
    rebuild(control);

    trigger.addEventListener('click', () => control.menu.hidden ? open(control) : close(control));
    trigger.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      if (control.menu.hidden) open(control);
      else {
        const buttons = optionButtons(control);
        const current = Math.max(0, buttons.indexOf(document.activeElement));
        buttons[(current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      }
    });
    menu.addEventListener('click', event => {
      const button = event.target.closest('[data-index]');
      if (button) choose(control, Number(button.dataset.index));
    });
    menu.addEventListener('keydown', event => {
      const buttons = optionButtons(control);
      const current = Math.max(0, buttons.indexOf(document.activeElement));
      let next = null;
      if (event.key === 'ArrowDown') next = (current + 1) % buttons.length;
      else if (event.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      if (next == null) return;
      event.preventDefault();
      buttons[next]?.focus();
    });
    select.addEventListener('change', () => sync(control));
    select.addEventListener('focus', () => {
      sync(control);
      trigger.focus({ preventScroll: true });
    });
    new MutationObserver(() => rebuild(control)).observe(select, { childList: true, subtree: true });
  };

  document.querySelectorAll('select').forEach(enhance);
  document.addEventListener('pointerdown', event => {
    if (active && !active.wrapper.contains(event.target) && !active.menu.contains(event.target)) close(active);
  }, true);
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close(active, { focus: true });
    } else if (event.key === 'Tab') close(active);
  }, true);
  document.addEventListener('click', () => queueMicrotask(() => controls.forEach(sync)));
  addEventListener('resize', () => active && position(active), { passive: true });
  addEventListener('scroll', event => {
    if (active && !active.menu.contains(event.target)) close(active);
  }, { passive: true, capture: true });

  window.MultichainSelectUI = Object.freeze({ enhance, close: () => close(), get size() { return controls.size; } });
})();
