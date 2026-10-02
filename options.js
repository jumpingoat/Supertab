'use strict';

const OPTS_KEY = 'supertab_options';

const PRESETS = [
  '#f59e0b', // amber
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

let options = { highlightColor: '#f59e0b' };

function syncGet(keys, cb) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get(keys, cb);
  } else {
    const res = {};
    keys.forEach(k => { try { const v = localStorage.getItem(k); res[k] = v ? JSON.parse(v) : null; } catch {} });
    cb(res);
  }
}
function syncSet(obj, cb) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.set(obj, cb);
  } else {
    Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
    if (cb) cb();
  }
}

// Build presets
const presetsEl = document.getElementById('presets');
PRESETS.forEach(color => {
  const btn = document.createElement('button');
  btn.className = 'preset';
  btn.style.background = color;
  btn.title = color;
  btn.addEventListener('click', () => {
    document.getElementById('highlightColor').value = color;
    updateSelected(color);
  });
  presetsEl.appendChild(btn);
});

function updateSelected(color) {
  document.querySelectorAll('.preset').forEach(b => {
    b.classList.toggle('selected', b.style.background === color || b.style.background === hexToRgb(color));
  });
}
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgb(${r}, ${g}, ${b})`;
}

document.getElementById('highlightColor').addEventListener('input', e => {
  updateSelected(e.target.value);
});

// Load
syncGet([OPTS_KEY], res => {
  // [FIX M5] Selektywne kopiowanie — nie używamy Object.assign, żeby nie wstrzyknąć
  // nieznanych właściwości do obiektu options ze storage (storage traktujemy jako niezaufane)
  if (res[OPTS_KEY] && typeof res[OPTS_KEY] === 'object') {
    const c = res[OPTS_KEY].highlightColor;
    if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) {
      options.highlightColor = c;
    }
  }
  document.getElementById('highlightColor').value = options.highlightColor || '#f59e0b';
  updateSelected(options.highlightColor || '#f59e0b');
});

// Save
document.getElementById('saveBtn').addEventListener('click', () => {
  const rawColor = document.getElementById('highlightColor').value;
  // [FIX S1] Walidacja formatu hex przed zapisem — ochrona przed manipulacją DOM
  if (!/^#[0-9a-f]{6}$/i.test(rawColor)) return;
  options.highlightColor = rawColor;
  syncSet({ [OPTS_KEY]: options }, () => {
    const msg = document.getElementById('savedMsg');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
  });
});
