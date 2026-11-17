import assert from 'node:assert/strict';
import { showsBusy, statusText, statusTooltip } from '../src/view/statusText';

describe('status bar text', () => {
  it('shows on/off and a spinner only while enabled and busy', () => {
    assert.equal(statusText({ enabled: true, busy: false, mode: 'continuous' }), '$(book) Quran: On');
    assert.equal(statusText({ enabled: true, busy: true, mode: 'continuous' }), '$(book) $(loading~spin) Quran: On');
    assert.equal(statusText({ enabled: false, busy: true, mode: 'continuous' }), '$(book) Quran: Off');
  });
  it('highlights only while enabled and busy', () => {
    assert.equal(showsBusy({ enabled: true, busy: true, mode: 'continuous' }), true);
    assert.equal(showsBusy({ enabled: true, busy: false, mode: 'continuous' }), false);
    assert.equal(showsBusy({ enabled: false, busy: true, mode: 'continuous' }), false);
  });
  it('tooltip shows mode, bookmark when known, and the click action', () => {
    assert.equal(
      statusTooltip({ enabled: true, busy: false, mode: 'continuous', bookmarkRef: '2:255' }),
      'Quran for Claude Code (Unofficial)\nContinuous · bookmark 2:255\nClick to turn off',
    );
    assert.equal(
      statusTooltip({ enabled: false, busy: false, mode: 'random' }),
      'Quran for Claude Code (Unofficial)\nRandom\nClick to turn on',
    );
  });
});
