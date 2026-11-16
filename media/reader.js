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
    mode: $('mode'),
    toggleTranslation: $('toggle-translation'),
  };

  const send = (type) => vscode.postMessage({ type });

  function render(p) {
    document.documentElement.style.setProperty('--arabic-size', p.arabicFontSize + 'px');

    el.surahLatin.textContent = p.surahNameLatin + ' · ' + p.ref;
    el.surahArabic.textContent = p.surahNameArabic;

    el.basmalah.hidden = !p.basmalah;
    el.basmalah.textContent = p.basmalah || '';

    el.arabic.textContent = p.text;
    el.arabic.dataset.index = String(p.index);

    el.translation.hidden = !p.translation;
    el.translationText.textContent = p.translation ? p.translation.text : '';
    el.translationLabel.textContent = p.translation ? p.translation.label : '';

    el.mode.textContent = p.mode === 'random' ? 'Mode: Random' : 'Mode: Continuous';
    el.toggleTranslation.disabled = !p.translationAvailable;
    el.toggleTranslation.textContent = p.showTranslation ? 'Hide translation' : 'Show translation';

    el.status.hidden = true;
    el.reader.hidden = false;
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
  });

  el.next.addEventListener('click', () => send('next'));
  el.prev.addEventListener('click', () => send('prev'));
  el.mode.addEventListener('click', () => send('toggleMode'));
  el.toggleTranslation.addEventListener('click', () => send('toggleTranslation'));

  // RTL-natural keys: ← goes forward (next), → goes back (prev).
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft') send('next');
    else if (e.key === 'ArrowRight') send('prev');
    else if (e.key === 't' || e.key === 'T') {
      if (!el.toggleTranslation.disabled) send('toggleTranslation');
    } else return;
    e.preventDefault();
  });

  send('ready');
})();
