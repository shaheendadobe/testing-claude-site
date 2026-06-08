import { readBlockConfig } from '../../scripts/aem.js';

/*
 * Countdown Block
 * Live countdown to a target date/time with optional title and expiry message.
 * Authored as labeled rows (Title / Date / Expired) or a single cell with a date.
 */

const UNITS = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Minutes'],
  ['seconds', 'Seconds'],
];

/**
 * Parse an author-supplied date string into a timestamp.
 * Accepts ISO 8601 and any format Date.parse understands. No timezone = local time.
 * @param {string} value
 * @returns {number|null} epoch ms, or null if unparseable
 */
function parseTarget(value) {
  if (!value) return null;
  const ts = Date.parse(value.trim());
  return Number.isNaN(ts) ? null : ts;
}

/** Break a positive millisecond delta into day/hour/minute/second parts. */
function diffParts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n) => String(n).padStart(2, '0');

export default function decorate(block) {
  const config = readBlockConfig(block);
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  // labeled value first, otherwise treat the whole block as a bare date
  const targetTs = parseTarget(
    config.date || config.target || config.deadline || block.textContent,
  );
  const title = config.title || (heading && heading.textContent.trim());
  const expiredMsg = config.expired || config['expired-message'] || 'The countdown has ended.';

  block.textContent = '';

  if (targetTs === null) {
    // eslint-disable-next-line no-console
    console.warn('countdown: no valid target date found — provide a "Date" row (e.g. 2026-12-25T17:00:00)');
    return;
  }

  block.setAttribute('role', 'timer');

  if (title) {
    const titleEl = document.createElement('p');
    titleEl.className = 'countdown-title';
    titleEl.textContent = title;
    block.append(titleEl);
  }

  const display = document.createElement('div');
  display.className = 'countdown-display';
  const valueEls = {};
  UNITS.forEach(([key, label]) => {
    const unit = document.createElement('div');
    unit.className = 'countdown-unit';
    const value = document.createElement('span');
    value.className = 'countdown-value';
    const labelEl = document.createElement('span');
    labelEl.className = 'countdown-label';
    labelEl.textContent = label;
    unit.append(value, labelEl);
    display.append(unit);
    valueEls[key] = value;
  });
  block.append(display);

  const expired = document.createElement('p');
  expired.className = 'countdown-expired';
  expired.textContent = expiredMsg;
  expired.hidden = true;
  block.append(expired);

  let timer;
  const render = () => {
    const remaining = targetTs - Date.now();
    if (remaining <= 0) {
      clearInterval(timer);
      display.hidden = true;
      expired.hidden = false;
      block.setAttribute('aria-label', expiredMsg);
      return;
    }
    const parts = diffParts(remaining);
    valueEls.days.textContent = parts.days;
    valueEls.hours.textContent = pad(parts.hours);
    valueEls.minutes.textContent = pad(parts.minutes);
    valueEls.seconds.textContent = pad(parts.seconds);
    block.setAttribute(
      'aria-label',
      `${title ? `${title}: ` : ''}${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds remaining`,
    );
  };

  render();
  timer = setInterval(render, 1000);
}
