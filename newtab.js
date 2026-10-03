'use strict';

// ── Constants ──────────────────────────────────────────────────────────────────
const TILES_KEY  = 'supertab_tiles';
const WP_KEY     = 'supertab_wallpaper';
const NOTE_KEY   = 'supertab_note';
const OPTS_KEY   = 'supertab_options';
const TB_KEY     = 'supertab_toolbar';
const LANG_KEY   = 'supertab_lang';
const THEME_KEY  = 'supertab_theme';
const ICONS_KEY  = 'supertab_icons';   // chrome.storage.local: { iconId: dataUrl }
const ICON_ID_RE = /^[a-z0-9]{12,32}$/;
const ICON_SIZE  = 64;                 // ikony skalowane do max 64×64 px
const MAX_URL_LEN = 2048;

const ALLOWED_THEMES = ['default', 'futuristic', 'dark'];
const MAX       = 30;

// ── Storage helpers ────────────────────────────────────────────────────────────
function syncGet(keys, cb) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get(keys, data => {
      if (chrome.runtime.lastError) { console.warn('storage.get error:', chrome.runtime.lastError); }
      cb(data || {});
    });
  } else {
    const res = {};
    keys.forEach(k => {
      try { const v = localStorage.getItem(k); res[k] = v ? JSON.parse(v) : null; } catch {}
    });
    cb(res);
  }
}
// cb(err) — err to komunikat błędu albo null
function storageSet(area, obj, cb) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage[area].set(obj, () => {
      const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
      if (err) console.warn('storage.' + area + '.set error:', err);
      if (cb) cb(err);
    });
  } else {
    let err = null;
    Object.entries(obj).forEach(([k, v]) => {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { err = String(e); }
    });
    if (cb) cb(err);
  }
}
function syncSet(obj, cb) { storageSet('sync', obj, cb); }
function localSet(obj, cb) { storageSet('local', obj, cb); }

// [FIX M7] Ikony trzymamy w chrome.storage.local (limit 10 MB), bo sync ma limit 8 KB na klucz
function localGet(keys, cb) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(keys, data => {
      if (chrome.runtime.lastError) { console.warn('storage.local.get error:', chrome.runtime.lastError); }
      cb(data || {});
    });
  } else {
    const res = {};
    keys.forEach(k => {
      try { const v = localStorage.getItem(k); res[k] = v ? JSON.parse(v) : null; } catch {}
    });
    cb(res);
  }
}
function lsGet(key)      { try { return localStorage.getItem(key); }   catch { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, val); }     catch {} }
function lsRemove(key)   { try { localStorage.removeItem(key); }        catch {} }

// ── i18n ───────────────────────────────────────────────────────────────────────
const I18N = {
  pl: {
    note_title:          'Notatka',
    note_placeholder:    'Wpisz notatkę…',
    search_placeholder:  'Szukaj w Google lub wpisz URL…',
    btn_edit:            '✏️ Edytuj',
    btn_edit_done:       '✅ Gotowe',
    btn_wallpaper:       '🖼️ Tapeta',
    btn_wallpaper_del:   '🗑️ Usuń tapetę',
    btn_options:         '⚙️ Opcje',
    btn_reset:           '↺ Reset',
    opts_title:          '⚙️ Opcje',
    opts_color_section:  'Kolor podświetlenia zakładek',
    opts_color_hint:     'Dwuklik na zakładce zaznacza ją ramką w wybranym kolorze.',
    opts_save:           'Zapisz',
    opts_saved:          'Zapisano!',
    info_tagline:        'Twój nowy ekran startowy Chrome\'a.',
    info_license:        'Możesz używać i modyfikować tę wtyczkę dowolnie. Jeśli coś zmienisz i będziesz ją dalej udostępniać, podaj autora.',
    info_kofi:           'Postaw kawę',
    modal_new:           'Nowa zakładka',
    modal_edit:          'Edytuj zakładkę',
    modal_url:           'Adres URL',
    modal_icon_preview:  'Podgląd ikony',
    modal_icon_hint:     'Wpisz URL, by zobaczyć ikonę',
    modal_icon_invalid:  'Nieprawidłowy URL',
    modal_custom_icon:   'Własna ikona (PNG / ICO, opcjonalne)',
    modal_choose_file:   'Wybierz plik',
    modal_clear_icon:    '✕ Usuń',
    modal_name:          'Nazwa (opcjonalna)',
    modal_name_ph:       'Moja strona',
    modal_cancel:        'Anuluj',
    modal_save:          'Zapisz',
    url_error:           'Wpisz prawidłowy adres (np. https://example.com)',
    url_error2:          'Nieprawidłowy adres URL',
    confirm_reset:       'Przywrócić domyślne zakładki? Twoje zmiany zostaną utracone.',
    confirm_note_del:    'Usunąć notatkę?',
    confirm_wp_large:    'Plik jest większy niż 5 MB. Kontynuować?',
    tile_add_label:      'Dodaj',
    tile_delete_title:   'Usuń',
    note_hide:           'Ukryj notatkę',
    note_add:            'Dodaj notatkę',
    note_delete_title:   'Usuń notatkę',
    icon_type_error:       'Dozwolone tylko pliki graficzne (PNG, JPG, ICO, WebP, GIF).',
    storage_error:         'Błąd zapisu. Dane mogą być za duże.',
    opts_theme_section:    'Motyw',
    opts_theme_default:    'Default',
    opts_theme_futuristic: 'Futuristic',
    opts_theme_dark:       'Dark',
  },
  en: {
    note_title:          'Note',
    note_placeholder:    'Write a note…',
    search_placeholder:  'Search Google or type a URL…',
    btn_edit:            '✏️ Edit',
    btn_edit_done:       '✅ Done',
    btn_wallpaper:       '🖼️ Wallpaper',
    btn_wallpaper_del:   '🗑️ Remove wallpaper',
    btn_options:         '⚙️ Options',
    btn_reset:           '↺ Reset',
    opts_title:          '⚙️ Options',
    opts_color_section:  'Highlight color',
    opts_color_hint:     'Double-click a tile to mark it with a colored border.',
    opts_save:           'Save',
    opts_saved:          'Saved!',
    info_tagline:        'Your new Chrome start page.',
    info_license:        'Free to use and modify. If you redistribute a modified version, please credit the author.',
    info_kofi:           'Buy me a coffee',
    modal_new:           'New bookmark',
    modal_edit:          'Edit bookmark',
    modal_url:           'URL',
    modal_icon_preview:  'Icon preview',
    modal_icon_hint:     'Enter a URL to preview its icon',
    modal_icon_invalid:  'Invalid URL',
    modal_custom_icon:   'Custom icon (PNG / ICO, optional)',
    modal_choose_file:   'Choose file',
    modal_clear_icon:    '✕ Remove',
    modal_name:          'Name (optional)',
    modal_name_ph:       'My site',
    modal_cancel:        'Cancel',
    modal_save:          'Save',
    url_error:           'Enter a valid URL (e.g. https://example.com)',
    url_error2:          'Invalid URL',
    confirm_reset:       'Restore default bookmarks? Your changes will be lost.',
    confirm_note_del:    'Delete note?',
    confirm_wp_large:    'File is larger than 5 MB. Continue?',
    tile_add_label:      'Add',
    tile_delete_title:   'Delete',
    note_hide:           'Hide note',
    note_add:            'Add note',
    note_delete_title:   'Delete note',
    icon_type_error:       'Only image files are allowed (PNG, JPG, ICO, WebP, GIF).',
    storage_error:         'Save error. Data may be too large.',
    opts_theme_section:    'Theme',
    opts_theme_default:    'Default',
    opts_theme_futuristic: 'Futuristic',
    opts_theme_dark:       'Dark',
  }
};

// [FIX M6] Whitelist języków — blokuje prototype pollution przez localStorage
const ALLOWED_LANGS = ['pl', 'en'];
const rawLang = lsGet(LANG_KEY);
let lang = ALLOWED_LANGS.includes(rawLang) ? rawLang : 'pl';

function t(key) { return (I18N[lang] && I18N[lang][key]) || (I18N.pl[key]) || key; }

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  const toggle = document.getElementById('langToggle');
  if (toggle) toggle.textContent = lang === 'pl' ? '🇬🇧' : '🇵🇱';
  const noteDeleteBtn = document.getElementById('noteDeleteBtn');
  if (noteDeleteBtn) noteDeleteBtn.title = t('note_delete_title');
  const noteAddBtn = document.getElementById('noteAddBtn');
  if (noteAddBtn) {
    const isShown = !noteCard.classList.contains('hidden');
    noteAddBtn.title = isShown ? t('note_hide') : t('note_add');
  }
}

// ── Defaults ───────────────────────────────────────────────────────────────────
const DEFAULT_TILES = [
  { url: 'https://claude.ai',           name: 'Claude' },
  { url: 'https://gemini.google.com',   name: 'Gemini' },
  { url: 'https://mail.google.com',     name: 'Gmail' },
  { url: 'https://calendar.google.com', name: 'Kalendarz' },
  { url: 'https://drive.google.com',    name: 'Drive' },
  { url: 'https://youtube.com',         name: 'YouTube' },
  { url: 'https://github.com',          name: 'GitHub' },
  { url: 'https://twitter.com',         name: 'X/Twitter' },
  { url: 'https://reddit.com',          name: 'Reddit' },
  { url: 'https://wikipedia.org',       name: 'Wikipedia' },
];

// ── State ──────────────────────────────────────────────────────────────────────
let tiles             = [];
let options           = { highlightColor: '#f59e0b', theme: 'default' };
let editMode          = false;
let pendingIndex      = null;
let customIconDataUrl = null;
let dragSrcIndex      = null;

// ── URL validation ─────────────────────────────────────────────────────────────
// [FIX H1] Whitelist protokołów — blokuje javascript:, data:, vbscript: itp.
const ALLOWED_PROTOCOLS = ['https:', 'http:'];

function normalizeUrl(raw) {
  raw = raw.trim();
  if (!raw) return null;
  // Jeśli zaczyna od protokołu — nie dodajemy nic
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(raw)) return raw;
  // Wygląda jak domena (np. example.com) — dodaj https://
  if (/^[\w-]+(\.[\w-]+)+/.test(raw)) return 'https://' + raw;
  return null;
}

function validateUrl(raw) {
  const norm = normalizeUrl(raw);
  if (!norm) return { ok: false, msg: t('url_error') };
  if (norm.length > MAX_URL_LEN) return { ok: false, msg: t('url_error2') };
  try {
    const parsed = new URL(norm);
    // Whitelist protokołów
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return { ok: false, msg: t('url_error') };
    }
    // Hostname nie może być pusty
    if (!parsed.hostname) {
      return { ok: false, msg: t('url_error2') };
    }
    // [FIX L1] Odrzucamy dane logowania w URL (np. google.com@evil.com prowadzi na evil.com)
    if (parsed.username || parsed.password) {
      return { ok: false, msg: t('url_error2') };
    }
    return { ok: true, url: norm };
  } catch {
    return { ok: false, msg: t('url_error2') };
  }
}

// ── [FIX H3] Walidacja MIME typu pliku ikony ──────────────────────────────────
const ALLOWED_IMAGE_TYPES = [
  'image/png', 'image/jpeg', 'image/gif',
  'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'
];

function validateImageFile(file) {
  if (!file) return false;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return false;
  // Sprawdzamy też rozszerzenie jako drugą linię obrony
  const ext = file.name.split('.').pop().toLowerCase();
  const allowedExt = ['png','jpg','jpeg','gif','webp','ico'];
  return allowedExt.includes(ext);
}

// [FIX H3] Sanityzacja data URI — akceptujemy tylko bezpieczne MIME typy obrazów
// Blokuje data:image/svg+xml (może zawierać <script>) i data:text/html itp.
const ALLOWED_DATA_MIME = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/x-icon'
];

function isSafeDataUri(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return false;
  const mimeMatch = dataUrl.match(/^data:([^;,]+)/);
  if (!mimeMatch) return false;
  return ALLOWED_DATA_MIME.includes(mimeMatch[1].toLowerCase());
}

// ── Favicon / icon ─────────────────────────────────────────────────────────────
function faviconUrl(url) {
  try {
    const origin = new URL(url).origin;
    return 'https://www.google.com/s2/favicons?sz=64&domain_url=' + encodeURIComponent(origin);
  } catch { return null; }
}

function labelFrom(tile) {
  if (tile.name) return tile.name;
  try { return new URL(tile.url).hostname.replace(/^www\./, ''); } catch { return tile.url; }
}

function placeholderEl(url) {
  const span = document.createElement('span');
  span.className = 'placeholder-icon';
  try { span.textContent = new URL(url).hostname[0].toUpperCase(); } catch { span.textContent = '?'; }
  return span;
}

// ── Theme ──────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  const safe = ALLOWED_THEMES.includes(theme) ? theme : 'default';
  options.theme = safe;
  document.documentElement.setAttribute('data-theme', safe);
  // Zaznacz aktywny przycisk w theme-pickerie
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === safe);
  });
}

// ── Options ────────────────────────────────────────────────────────────────────
function loadOptions(cb) {
  syncGet([OPTS_KEY], res => {
    if (res[OPTS_KEY] && typeof res[OPTS_KEY] === 'object') {
      // Waliduj highlightColor — musi być hex #rrggbb
      const c = res[OPTS_KEY].highlightColor;
      if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) {
        options.highlightColor = c;
      }
      // Waliduj motyw
      const th = res[OPTS_KEY].theme;
      if (typeof th === 'string' && ALLOWED_THEMES.includes(th)) {
        options.theme = th;
      }
    }
    document.documentElement.style.setProperty('--highlight-color', options.highlightColor);
    applyTheme(options.theme);
    cb();
  });
}

// Zmiany opcji z innej karty lub ze strony opcji (walidowane jak przy wczytywaniu)
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[OPTS_KEY]) return;
    const nv = changes[OPTS_KEY].newValue;
    if (!nv || typeof nv !== 'object') return;
    if (typeof nv.highlightColor === 'string' && /^#[0-9a-f]{6}$/i.test(nv.highlightColor)) {
      options.highlightColor = nv.highlightColor;
      document.documentElement.style.setProperty('--highlight-color', options.highlightColor);
    }
    if (typeof nv.theme === 'string' && ALLOWED_THEMES.includes(nv.theme)) {
      applyTheme(nv.theme);
    }
  });
}

function saveOptions() {
  syncSet({ [OPTS_KEY]: { highlightColor: options.highlightColor, theme: options.theme } });
  document.documentElement.style.setProperty('--highlight-color', options.highlightColor);
}

// ── Tiles ──────────────────────────────────────────────────────────────────────
// [FIX] Sanityzacja danych z chrome.storage — nie ufamy danym z storage
function sanitizeTile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  // URL — musi przejść walidację
  if (typeof raw.url !== 'string') return null;
  const { ok, url } = validateUrl(raw.url);
  if (!ok) return null;
  // Nazwa — string, max 100 znaków
  const name = typeof raw.name === 'string' ? raw.name.slice(0, 100) : '';
  // CustomIcon — tylko bezpieczne data URI (starsze wersje trzymały ikonę w sync)
  const customIcon = (typeof raw.customIcon === 'string' && isSafeDataUri(raw.customIcon))
    ? raw.customIcon : undefined;
  // iconId — identyfikator ikony w chrome.storage.local, ścisły format
  const iconId = (typeof raw.iconId === 'string' && ICON_ID_RE.test(raw.iconId))
    ? raw.iconId : undefined;
  // highlighted — tylko boolean
  const highlighted = raw.highlighted === true;
  const result = { url, name };
  if (customIcon) result.customIcon = customIcon;
  if (iconId) result.iconId = iconId;
  if (highlighted) result.highlighted = true;
  return result;
}

function newIconId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function loadTiles(cb) {
  syncGet([TILES_KEY], res => {
    localGet([ICONS_KEY], localRes => {
      const data  = res[TILES_KEY];
      const store = localRes[ICONS_KEY];
      const icons = (store && typeof store === 'object' && !Array.isArray(store)) ? store : {};
      let migrate = false;

      if (Array.isArray(data)) {
        // Klucz istnieje — pusta tablica to świadomy wybór, nie przywracamy domyślnych
        tiles = data.slice(0, MAX).map(sanitizeTile).filter(Boolean);
        tiles.forEach(tile => {
          if (tile.customIcon) {
            // Migracja ze starej wersji: ikona leżała w sync, przenosimy ją do local
            if (!tile.iconId) tile.iconId = newIconId();
            migrate = true;
          } else if (tile.iconId) {
            const icon = Object.prototype.hasOwnProperty.call(icons, tile.iconId) ? icons[tile.iconId] : null;
            if (typeof icon === 'string' && isSafeDataUri(icon)) tile.customIcon = icon;
            // Brak ikony w local (np. dodana na innym komputerze): pokazujemy favicon,
            // ale iconId zostaje, żeby zapis tutaj nie zerwał ikony na tamtym komputerze
          }
        });
      } else {
        // Klucz nie istnieje — pierwsze uruchomienie
        tiles = JSON.parse(JSON.stringify(DEFAULT_TILES));
        migrate = true;
      }
      if (migrate) saveTiles();
      cb();
    });
  });
}

// [FIX M7] Do sync trafiają tylko lekkie dane (url, nazwa, iconId), ikony do local
function saveTiles() {
  const syncTiles = [];
  const icons = Object.create(null);
  tiles.forEach(tile => {
    const entry = { url: tile.url, name: tile.name || '' };
    if (tile.highlighted) entry.highlighted = true;
    if (tile.customIcon && isSafeDataUri(tile.customIcon)) {
      if (!tile.iconId) tile.iconId = newIconId();
      entry.iconId = tile.iconId;
      icons[tile.iconId] = tile.customIcon;
    } else if (tile.iconId) {
      entry.iconId = tile.iconId; // ikona istnieje tylko na innym komputerze
    }
    syncTiles.push(entry);
  });
  // Najpierw ikony, potem zakładki; zapis całej mapy usuwa ikony usuniętych zakładek
  localSet({ [ICONS_KEY]: icons }, errLocal => {
    syncSet({ [TILES_KEY]: syncTiles }, errSync => {
      if (errLocal || errSync) alert(t('storage_error'));
    });
  });
}

// ── Render ─────────────────────────────────────────────────────────────────────
function render() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  tiles.forEach((tile_data, i) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.index = i;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'tile-icon' + (tile_data.highlighted ? ' highlighted' : '');

    const imgWrap = document.createElement('div');
    imgWrap.className = 'icon-img-wrap';

    if (tile_data.customIcon && isSafeDataUri(tile_data.customIcon)) {
      // [FIX H3] Ponowna walidacja przy renderowaniu
      const img = document.createElement('img');
      img.src = tile_data.customIcon;
      img.alt = '';
      imgWrap.appendChild(img);
    } else {
      const fav = faviconUrl(tile_data.url);
      if (fav) {
        const img = document.createElement('img');
        img.alt = '';
        // [FIX] onerror PRZED img.src — Chrome może pominąć event gdy obraz jest w cache'u
        // z błędem lub gdy request jest blokowany; bez tego zostaje puste miejsce zamiast placeholder
        img.onerror = () => {
          img.onerror = null; // zapobiegamy nieskończonej pętli
          imgWrap.innerHTML = '';
          imgWrap.appendChild(placeholderEl(tile_data.url));
        };
        img.src = fav;
        imgWrap.appendChild(img);
      } else {
        imgWrap.appendChild(placeholderEl(tile_data.url));
      }
    }
    iconWrap.appendChild(imgWrap);

    const del = document.createElement('button');
    del.className = 'tile-delete';
    del.title = t('tile_delete_title');
    del.textContent = '×';
    del.addEventListener('click', e => {
      e.stopPropagation();
      tiles.splice(i, 1);
      saveTiles();
      render();
    });
    iconWrap.appendChild(del);

    const label = document.createElement('div');
    label.className = 'tile-label';
    label.textContent = labelFrom(tile_data); // textContent — bezpieczne

    tile.appendChild(iconWrap);
    tile.appendChild(label);

    // Middle click — otwórz w nowym tabie
    tile.addEventListener('auxclick', e => {
      if (e.button !== 1) return;
      if (e.target === del) return;
      if (editMode) return;
      e.preventDefault();
      const { ok, url } = validateUrl(tile_data.url);
      if (ok) window.open(url, '_blank', 'noopener');
    });

    // Kliknięcia — single vs double
    let clickTimer = null;
    tile.addEventListener('click', e => {
      if (e.target === del) return;
      if (editMode) { openModal(i); return; }
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        tiles[i].highlighted = !tiles[i].highlighted;
        saveTiles();
        render();
        return;
      }
      clickTimer = setTimeout(() => {
        clickTimer = null;
        // [FIX H1] Dodatkowa walidacja przed nawigacją
        const { ok, url } = validateUrl(tile_data.url);
        if (ok) window.location.href = url;
      }, 220);
    });

    // Drag & drop
    tile.setAttribute('draggable', 'true');
    tile.addEventListener('dragstart', e => {
      if (!editMode) { e.preventDefault(); return; }
      dragSrcIndex = i;
      tile.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    tile.addEventListener('dragend', () => {
      tile.classList.remove('dragging');
      document.querySelectorAll('.tile').forEach(t2 => t2.classList.remove('drag-over'));
    });
    tile.addEventListener('dragover', e => {
      if (!editMode || dragSrcIndex === null || dragSrcIndex === i) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.tile').forEach(t2 => t2.classList.remove('drag-over'));
      tile.classList.add('drag-over');
    });
    tile.addEventListener('drop', e => {
      if (!editMode || dragSrcIndex === null || dragSrcIndex === i) return;
      e.preventDefault();
      const moved = tiles.splice(dragSrcIndex, 1)[0];
      tiles.splice(i, 0, moved);
      dragSrcIndex = null;
      saveTiles();
      render();
    });

    grid.appendChild(tile);
  });

  // Kafelek ADD
  if (tiles.length < MAX) {
    const tile = document.createElement('div');
    tile.className = 'tile tile-add';
    const iconWrap = document.createElement('div');
    iconWrap.className = 'tile-icon';
    const imgWrap = document.createElement('div');
    imgWrap.className = 'icon-img-wrap';
    const plus = document.createElement('span');
    plus.className = 'plus';
    plus.textContent = '+';
    imgWrap.appendChild(plus);
    iconWrap.appendChild(imgWrap);
    const label = document.createElement('div');
    label.className = 'tile-label';
    label.textContent = t('tile_add_label');
    tile.appendChild(iconWrap);
    tile.appendChild(label);
    tile.addEventListener('click', () => openModal(null));
    grid.appendChild(tile);
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────────
let previewDebounce;

let iconChanged = false; // czy w tym otwarciu modala wgrano lub usunięto ikonę

function openModal(index) {
  pendingIndex = index;
  customIconDataUrl = null;
  iconChanged = false;

  if (index !== null && tiles[index] && tiles[index].customIcon) {
    // Waliduj ponownie przy otwarciu modala
    if (isSafeDataUri(tiles[index].customIcon)) {
      customIconDataUrl = tiles[index].customIcon;
    }
  }

  const isEdit = index !== null;
  document.getElementById('modalTitle').textContent = isEdit ? t('modal_edit') : t('modal_new');
  document.getElementById('inputUrl').value  = isEdit ? (tiles[index].url || '') : '';
  document.getElementById('inputName').value = isEdit ? (tiles[index].name || '') : '';
  document.getElementById('urlError').textContent = '';
  document.getElementById('inputUrl').classList.remove('invalid');
  updateFaviconPreview(isEdit ? tiles[index].url : '');
  updateCustomIconPreview(customIconDataUrl);
  document.getElementById('overlay').classList.add('open');
  setTimeout(() => document.getElementById('inputUrl').focus(), 50);
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  iconLoadToken++;
  pendingIndex = null;
  customIconDataUrl = null;
  document.getElementById('customIconInput').value = '';
}

function updateFaviconPreview(url) {
  const box = document.getElementById('faviconPreview');
  box.innerHTML = '';
  const fav = faviconUrl(url);
  if (fav) {
    try {
      const hostname = new URL(url).hostname;
      const img = document.createElement('img');
      img.src = fav;
      img.alt = '';
      const span = document.createElement('span');
      span.textContent = hostname; // textContent — bezpieczne
      box.appendChild(img);
      box.appendChild(span);
    } catch {
      const span = document.createElement('span');
      span.textContent = t('modal_icon_invalid');
      box.appendChild(span);
    }
  } else {
    const span = document.createElement('span');
    span.textContent = t('modal_icon_hint');
    box.appendChild(span);
  }
}

function updateCustomIconPreview(dataUrl) {
  const preview = document.getElementById('customIconPreview');
  const clearBtn = document.getElementById('clearIconBtn');
  preview.innerHTML = '';
  if (dataUrl && isSafeDataUri(dataUrl)) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = '';
    preview.appendChild(img);
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }
}

document.getElementById('inputUrl').addEventListener('input', e => {
  clearTimeout(previewDebounce);
  const raw = e.target.value.trim();
  previewDebounce = setTimeout(() => {
    const norm = normalizeUrl(raw);
    if (norm) updateFaviconPreview(norm);
    else {
      const box = document.getElementById('faviconPreview');
      box.innerHTML = '';
      const span = document.createElement('span');
      span.textContent = t('modal_icon_hint');
      box.appendChild(span);
    }
  }, 400);
  document.getElementById('urlError').textContent = '';
  e.target.classList.remove('invalid');
});

// [FIX M7] Skalowanie ikony do max 64×64 i ponowne kodowanie jako PNG.
// Mały rozmiar w storage, a przy okazji z pliku zostaje tylko czysty obraz
// (bez metadanych i ewentualnych danych doklejonych za obrazem).
const MAX_ICON_FILE = 2 * 1024 * 1024;

function downscaleIcon(dataUrl, cb) {
  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) { cb(null); return; }
    const scale = Math.min(1, ICON_SIZE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, cw, ch);
    let out = null;
    try { out = canvas.toDataURL('image/png'); } catch { out = null; }
    cb(out && isSafeDataUri(out) ? out : null);
  };
  img.onerror = () => cb(null);
  img.src = dataUrl;
}

let iconLoadToken = 0; // chroni przed wynikiem z poprzedniego otwarcia modala

// [FIX H3 + M4] Walidacja MIME i rozszerzenia przy wyborze pliku ikony
document.getElementById('customIconInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!validateImageFile(file) || file.size > MAX_ICON_FILE) {
    alert(t('icon_type_error'));
    e.target.value = '';
    return;
  }
  const token = ++iconLoadToken;
  const reader = new FileReader();
  reader.onload = ev => {
    const result = ev.target.result;
    // Finalna weryfikacja — odrzuć SVG i inne potencjalnie niebezpieczne MIME
    if (!isSafeDataUri(result)) {
      alert(t('icon_type_error'));
      e.target.value = '';
      return;
    }
    downscaleIcon(result, small => {
      if (token !== iconLoadToken) return;
      if (!small) { alert(t('icon_type_error')); e.target.value = ''; return; }
      customIconDataUrl = small;
      iconChanged = true;
      updateCustomIconPreview(customIconDataUrl);
    });
  };
  reader.readAsDataURL(file);
});

document.getElementById('clearIconBtn').addEventListener('click', () => {
  iconLoadToken++;
  customIconDataUrl = null;
  iconChanged = true;
  document.getElementById('customIconInput').value = '';
  updateCustomIconPreview(null);
});

document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const rawUrl = document.getElementById('inputUrl').value;
  const { ok, url, msg } = validateUrl(rawUrl);
  if (!ok) {
    document.getElementById('urlError').textContent = msg;
    document.getElementById('inputUrl').classList.add('invalid');
    document.getElementById('inputUrl').focus();
    return;
  }
  // Sanityzuj nazwę
  const name = document.getElementById('inputName').value.trim().slice(0, 100);
  const entry = { url, name };
  const old = (pendingIndex !== null && tiles[pendingIndex]) ? tiles[pendingIndex] : null;
  // Ikona — tylko po walidacji
  if (customIconDataUrl && isSafeDataUri(customIconDataUrl)) {
    entry.customIcon = customIconDataUrl;
  }
  // Ikona bez zmian: zachowujemy iconId (nowa ikona dostanie nowe id w saveTiles)
  if (!iconChanged && old && old.iconId) {
    entry.iconId = old.iconId;
  }
  // Zachowaj flagę highlighted
  if (old && old.highlighted) {
    entry.highlighted = true;
  }
  if (pendingIndex !== null) {
    tiles[pendingIndex] = entry;
  } else {
    tiles.push(entry);
  }
  saveTiles();
  closeModal();
  render();
});

document.getElementById('inputName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('saveBtn').click();
});

// ── Toolbar ────────────────────────────────────────────────────────────────────
let toolbarVisible = lsGet(TB_KEY) !== 'false';

function applyToolbarState() {
  document.getElementById('toolbar').classList.toggle('hidden', !toolbarVisible);
}

document.getElementById('toolbarHandle').addEventListener('click', () => {
  toolbarVisible = !toolbarVisible;
  lsSet(TB_KEY, toolbarVisible ? 'true' : 'false');
  applyToolbarState();
});

// ── Edit mode ──────────────────────────────────────────────────────────────────
document.getElementById('editBtn').addEventListener('click', () => {
  editMode = !editMode;
  document.body.classList.toggle('edit-mode', editMode);
  document.getElementById('editBtn').classList.toggle('active', editMode);
  document.getElementById('editBtn').textContent = editMode ? t('btn_edit_done') : t('btn_edit');
});

// ── Wallpaper ──────────────────────────────────────────────────────────────────
// [FIX S2] Biała lista MIME dla tapet — taka sama jak dla custom icons (blokuje SVG)
const ALLOWED_WP_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
function isSafeWallpaperUri(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return false;
  const mimeMatch = dataUrl.match(/^data:([^;,]+)/);
  if (!mimeMatch) return false;
  return ALLOWED_WP_MIME.includes(mimeMatch[1].toLowerCase());
}

function applyWallpaper(dataUrl) {
  // [FIX S2/M2] Walidacja białą listą MIME — nie tylko startsWith('data:image/')
  if (dataUrl && isSafeWallpaperUri(dataUrl)) {
    // [FIX M6] Usuwamy cudzysłowy z dataUrl przed wstrzyknięciem do CSS url("...")
    // Base64 nie zawiera " z definicji, ale explicite strip jako dodatkowa ochrona
    const safeUrl = dataUrl.replace(/"/g, '');
    document.body.style.setProperty('--wallpaper', 'url("' + safeUrl + '")');
    document.body.classList.add('has-wallpaper');
  } else {
    document.body.style.removeProperty('--wallpaper');
    document.body.classList.remove('has-wallpaper');
    dataUrl = null;
  }
  const btn = document.getElementById('wallpaperBtn');
  if (dataUrl) {
    btn.textContent = t('btn_wallpaper_del');
    btn.classList.add('btn-remove-wp');
  } else {
    btn.textContent = t('btn_wallpaper');
    btn.classList.remove('btn-remove-wp');
  }
}

document.getElementById('wallpaperBtn').addEventListener('click', () => {
  if (document.body.classList.contains('has-wallpaper')) {
    lsRemove(WP_KEY);
    applyWallpaper(null);
  } else {
    document.getElementById('wallpaperInput').click();
  }
});

document.getElementById('wallpaperInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  // Walidacja MIME tapety
  const allowedWpTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedWpTypes.includes(file.type)) {
    alert(t('icon_type_error'));
    e.target.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    if (!confirm(t('confirm_wp_large'))) { e.target.value = ''; return; }
  }
  const reader = new FileReader();
  reader.onload = ev => {
    const result = ev.target.result;
    // [FIX S2] Finalna weryfikacja białą listą MIME po odczycie przez FileReader
    if (!isSafeWallpaperUri(result)) { e.target.value = ''; return; }
    lsSet(WP_KEY, result);
    applyWallpaper(result);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

// ── Theme picker clicks ─────────────────────────────────────────────────────────
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme);
    // Motyw zapisujemy od razu, bez czekania na przycisk "Zapisz"
    saveOptions();
  });
});

// ── Options popup ──────────────────────────────────────────────────────────────
const PRESETS = ['#f59e0b','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899','#14b8a6','#f97316'];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${r}, ${g}, ${b})`;
}

const popPresetsEl = document.getElementById('popPresets');
PRESETS.forEach(color => {
  const btn = document.createElement('button');
  btn.className = 'preset';
  btn.style.background = color;
  btn.title = color;
  btn.addEventListener('click', () => {
    document.getElementById('popHighlightColor').value = color;
    updatePopSelected(color);
  });
  popPresetsEl.appendChild(btn);
});

function updatePopSelected(color) {
  document.querySelectorAll('#popPresets .preset').forEach(b => {
    b.classList.toggle('selected', b.style.background === color || b.style.background === hexToRgb(color));
  });
}
document.getElementById('popHighlightColor').addEventListener('input', e => updatePopSelected(e.target.value));

function openPopup(id) {
  ['optionsPopup','infoPopup'].forEach(p => document.getElementById(p).classList.add('hidden'));
  document.getElementById('popupBackdrop').classList.remove('hidden');
  const popup = document.getElementById(id);
  popup.classList.remove('hidden');
  // Pozycjonuj popup nad toolbarWrap przez getBoundingClientRect
  const wrap = document.getElementById('toolbarWrap');
  const wr = wrap.getBoundingClientRect();
  const pr = popup.getBoundingClientRect();
  let left = wr.left + wr.width / 2 - pr.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8));
  const bottom = window.innerHeight - wr.top + 8;
  popup.style.left   = left + 'px';
  popup.style.bottom = bottom + 'px';
  popup.style.top    = '';
}

function closePopups() {
  document.getElementById('optionsPopup').classList.add('hidden');
  document.getElementById('infoPopup').classList.add('hidden');
  document.getElementById('popupBackdrop').classList.add('hidden');
}

document.getElementById('popupBackdrop').addEventListener('click', closePopups);
document.getElementById('optionsClose').addEventListener('click', closePopups);
document.getElementById('infoClose').addEventListener('click', closePopups);

document.getElementById('optionsBtn').addEventListener('click', () => {
  document.getElementById('popHighlightColor').value = options.highlightColor || '#f59e0b';
  updatePopSelected(options.highlightColor || '#f59e0b');
  // Zaznacz aktywny motyw przy otwarciu
  applyTheme(options.theme);
  openPopup('optionsPopup');
});

document.getElementById('popSaveBtn').addEventListener('click', () => {
  const rawColor = document.getElementById('popHighlightColor').value;
  // [FIX] Walidacja koloru przed zapisem — "Zapisano!" tylko gdy kolor jest prawidłowy
  if (!/^#[0-9a-f]{6}$/i.test(rawColor)) return;
  options.highlightColor = rawColor;
  saveOptions();
  render();
  const msg = document.getElementById('popSavedMsg');
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 2000);
});

document.getElementById('infoBtn').addEventListener('click', () => openPopup('infoPopup'));

// ── Language toggle ────────────────────────────────────────────────────────────
document.getElementById('langToggle').addEventListener('click', () => {
  lang = lang === 'pl' ? 'en' : 'pl';
  // Weryfikuj ponownie przed zapisem
  if (!ALLOWED_LANGS.includes(lang)) lang = 'pl';
  lsSet(LANG_KEY, lang);
  applyI18n();
  // [FIX] Przy zmianie języka też walidujemy tapetę białą listą MIME przed przekazaniem do applyWallpaper
  const currentWp = lsGet(WP_KEY);
  applyWallpaper((currentWp && isSafeWallpaperUri(currentWp)) ? currentWp : null);
  document.getElementById('editBtn').textContent = editMode ? t('btn_edit_done') : t('btn_edit');
  render();
});

// ── Reset ──────────────────────────────────────────────────────────────────────
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm(t('confirm_reset'))) {
    tiles = JSON.parse(JSON.stringify(DEFAULT_TILES));
    saveTiles();
    render();
  }
});

// ── Search ─────────────────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const q = e.target.value.trim();
  if (!q) return;
  const { ok, url } = validateUrl(q);
  if (ok) {
    window.location.href = url;
  } else {
    // Bezpieczny redirect do Google Search z encodeURIComponent
    window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
  }
});

// ── Sticky note ────────────────────────────────────────────────────────────────
const noteCard   = document.getElementById('noteCard');
const noteAddBtn = document.getElementById('noteAddBtn');
const noteText   = document.getElementById('noteText');

function loadNote() {
  const saved = lsGet(NOTE_KEY);
  if (saved !== null && saved !== '') {
    noteText.value = saved;
    noteCard.classList.remove('hidden');
    noteAddBtn.classList.add('active');
    noteAddBtn.title = t('note_hide');
  }
}

function saveNote() {
  // Notatka używana tylko jako textarea.value — nie jest renderowana jako HTML
  lsSet(NOTE_KEY, noteText.value);
}

function deleteNote() {
  lsRemove(NOTE_KEY);
  noteText.value = '';
}

noteAddBtn.addEventListener('click', () => {
  const isHidden = noteCard.classList.contains('hidden');
  noteCard.classList.toggle('hidden', !isHidden);
  noteAddBtn.classList.toggle('active', isHidden);
  noteAddBtn.title = isHidden ? t('note_hide') : t('note_add');
  if (isHidden) noteText.focus();
});

document.getElementById('noteSaveBtn').addEventListener('click', () => {
  saveNote();
  const btn = document.getElementById('noteSaveBtn');
  btn.textContent = '✓';
  setTimeout(() => { btn.textContent = '✓'; }, 600);
});

document.getElementById('noteDeleteBtn').addEventListener('click', () => {
  if (!noteText.value || confirm(t('confirm_note_del'))) {
    deleteNote();
    noteCard.classList.add('hidden');
    noteAddBtn.classList.remove('active');
    noteAddBtn.title = t('note_add');
  }
});

noteText.addEventListener('input', saveNote);

// ── Init ───────────────────────────────────────────────────────────────────────
// Reset inputów pliku przy starcie (defensywnie; widoczny input był skutkiem
// zablokowanego przez CSP style="display:none", teraz ukrywa go klasa CSS)
(function resetFileInputs() {
  ['wallpaperInput', 'customIconInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      try { el.value = ''; } catch {}
    }
  });
})();

applyI18n();
const savedWp = lsGet(WP_KEY);
// [FIX M2] Walidacja białą listą MIME przed zastosowaniem tapety z localStorage
if (savedWp && isSafeWallpaperUri(savedWp)) applyWallpaper(savedWp);
applyToolbarState();
loadNote();
loadOptions(() => {
  loadTiles(() => {
    render();
  });
});
