// Webview script. Renders payloads from the extension (see RenderPayload in src/session.ts).
// Text is always set with textContent, never innerHTML.
(function () {
  'use strict';

  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);

  const el = {
    reader: $('reader'),
    status: $('status'),
    surahLatin: $('surah-latin'),
    surahArabic: $('surah-arabic'),
    basmalah: $('basmalah'),
    arabic: $('arabic'),
    translation: $('translation'),
    translationText: $('translation-text'),
    translationLabel: $('translation-label'),
    next: $('next'),
    prev: $('prev'),
    content: $('content'),
    modeLabel: $('mode-label'),
    popover: $('popover'),
    popoverItems: $('popover-items'),
    popoverLabel: $('popover-label'),
    popoverClose: $('popover-close'),
    about: $('about'),
  };

  const send = (type) => vscode.postMessage({ type });

  let translationAvailable = false;

  /** Two columns only when there is something to put beside the Arabic. */
  function updateColumns() {
    el.content.classList.toggle('two-col', !el.translation.hidden || !el.popover.hidden);
  }

  // 'rtl': ← Next on the left, ← = next. 'ltr': Next → on the right, → = next.
  let direction = 'rtl';

  function layoutNavigation(dir) {
    direction = dir === 'ltr' ? 'ltr' : 'rtl';
    const ltr = direction === 'ltr';
    el.next.textContent = ltr ? 'Next →' : '← Next';
    el.prev.textContent = ltr ? '← Prev' : 'Prev →';
    el.next.title = ltr ? 'Next ayah (→)' : 'Next ayah (←)';
    el.prev.title = ltr ? 'Previous ayah (←)' : 'Previous ayah (→)';
    // Swap the buttons in the DOM (not just visually) so Tab order matches what is shown.
    if (ltr) el.next.parentNode.insertBefore(el.prev, el.next);
    else el.next.parentNode.insertBefore(el.next, el.prev);
  }

  function render(p) {
    hidePopover();
    document.documentElement.style.setProperty('--arabic-size', p.arabicFontSize + 'px');
    layoutNavigation(p.navigationDirection);

    el.surahLatin.textContent = p.surahNameLatin + ' · ' + p.ref;
    el.surahArabic.textContent = p.surahNameArabic;

    el.basmalah.hidden = !p.basmalah;
    el.basmalah.textContent = p.basmalah || '';

    el.arabic.textContent = p.text;
    el.arabic.dataset.index = String(p.index);

    el.translation.hidden = !p.translation;
    el.translationText.textContent = p.translation ? p.translation.text : '';
    el.translationLabel.textContent = p.translation ? p.translation.label : '';

    el.modeLabel.textContent = p.mode === 'random' ? 'Random' : 'Continuous';
    translationAvailable = p.translationAvailable;
    updateColumns();

    el.status.hidden = true;
    el.reader.hidden = false;
  }

  function hidePopover() {
    el.popover.hidden = true;
    el.popoverItems.textContent = '';
    el.popoverLabel.textContent = '';
    updateColumns();
  }

  function showPopover(items, label) {
    el.popoverItems.textContent = '';
    for (const item of items) {
      const p = document.createElement('p');
      if (item.ref) {
        const ref = document.createElement('span');
        ref.className = 'ref';
        ref.textContent = item.ref;
        p.appendChild(ref);
      }
      p.appendChild(document.createTextNode(item.text));
      el.popoverItems.appendChild(p);
    }
    el.popoverLabel.textContent = label || '';
    el.popover.hidden = false;
    updateColumns();
  }

  /** Global ayah indices of the Arabic elements the current selection touches. */
  function selectedIndices() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim() === '') return [];
    const out = [];
    for (const node of [el.basmalah, el.arabic]) {
      if (!node.hidden && sel.containsNode(node, true)) out.push(Number(node.dataset.index));
    }
    return out;
  }

  function translateSelection() {
    const indices = selectedIndices();
    if (indices.length === 0) {
      showPopover([{ text: 'Select some Arabic text in the panel first.' }], '');
      return;
    }
    vscode.postMessage({ type: 'translateSelection', indices });
  }

  function showError(message) {
    el.reader.hidden = true;
    el.status.hidden = false;
    el.status.classList.add('error');
    el.status.textContent = 'Could not load the Quran data: ' + message;
  }

  window.addEventListener('message', (event) => {
    const m = event.data;
    if (!m || typeof m !== 'object') return;
    if (m.type === 'render') render(m.payload);
    else if (m.type === 'error') showError(String(m.message));
    else if (m.type === 'requestSelection') translateSelection();
    else if (m.type === 'selectionTranslation') {
      if (m.payload) showPopover(m.payload.items, m.payload.label);
      else showPopover([{ text: 'No translation found for this selection.' }], '');
    }
  });

  el.next.addEventListener('click', () => send('next'));
  el.prev.addEventListener('click', () => send('prev'));
  el.popoverClose.addEventListener('click', hidePopover);
  el.about.addEventListener('click', () => send('about'));

  // Arrow keys follow the button layout (see layoutNavigation).
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const forward = direction === 'ltr' ? 'ArrowRight' : 'ArrowLeft';
    const back = direction === 'ltr' ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === forward) send('next');
    else if (e.key === back) send('prev');
    else if (e.key === 't' || e.key === 'T') {
      if (translationAvailable) send('toggleTranslation');
    } else if (e.key === 's' || e.key === 'S') translateSelection();
    else if (e.key === 'Escape' && !el.popover.hidden) hidePopover();
    else return;
    e.preventDefault();
  });

  send('ready');
})();
