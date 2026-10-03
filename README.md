# SuperTab

**SuperTab** is a Chrome extension that replaces your new tab page with a clean, customizable bookmark grid.

![SuperTab preview](preview.png)

## Features

- **30-tile bookmark grid** — up to 30 shortcuts displayed as icon tiles. Click to navigate, middle-click to open in a new tab, double-click to highlight with a colored border
- **Drag & drop reordering** — reorganize tiles in Edit mode
- **Custom icons** — upload your own PNG, ICO, JPG, WebP or GIF icon per bookmark. Icons are automatically resized to 64×64 px
- **Wallpaper** — set any image as the background (stored locally, never uploaded anywhere)
- **Sticky note** — a quick-access note widget in the top-right corner, auto-saved
- **Google Search bar** — search or navigate directly from the new tab page
- **Themes** — choose between Default (light), Futuristic (dark neon) and Dark (minimal dark) from the Options popup. The theme is saved as soon as you click it and synced across devices
- **Highlight color** — choose the color used for double-click tile markers
- **PL / EN language toggle** — switch the interface language at any time
- **Toolbar show/hide** — collapse the bottom toolbar when you don't need it
- **Reset to defaults** — restore the original 10 bookmarks

## Privacy

SuperTab works entirely locally. Bookmarks and options are stored in `chrome.storage.sync` (synced by Chrome between your devices). Custom icons are stored in `chrome.storage.local` on the current computer only, because sync storage is limited to 8 KB per item. Wallpaper, note and interface preferences are kept in `localStorage`. Nothing is sent to any external server. The only external request is the Google favicon service (`www.google.com/s2/favicons`) used to fetch bookmark icons.

## Installation (developer mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `supertab-v3` folder
5. Open a new tab — SuperTab will appear immediately

## Security

SuperTab v3.1 was audited six times and includes the following protections:

**Input validation**
- Protocol whitelist for bookmark URLs (`https:` and `http:` only — blocks `javascript:`, `data:`, `vbscript:` and similar)
- URLs containing credentials (e.g. `google.com@evil.com`, which actually leads to `evil.com`) are rejected, and URL length is capped at 2048 characters
- Hex color validated with a strict regex before saving to storage (`/^#[0-9a-f]{6}$/i`)
- Language preference validated against an allowlist (`pl`, `en`) before use — prevents prototype pollution via `localStorage`
- Theme validated against an allowlist (`default`, `futuristic`, `dark`) on every read from storage and on every apply — arbitrary strings cannot be set as the `data-theme` attribute

**File and image handling**
- MIME type whitelist for custom tile icons: PNG, JPEG, WebP, GIF, ICO. SVG is explicitly blocked (can carry embedded `<script>`)
- The same MIME whitelist applies to wallpapers — checked both at file selection and after `FileReader` completes
- Extension double-check alongside MIME type on uploaded files
- Custom icons are limited to 2 MB, then redrawn on a canvas and re-encoded as a 64×64 PNG. Only clean pixel data is stored (no metadata or data appended to the original file)
- Wallpaper data URI is stripped of quote characters before injection into a CSS `url()` value — prevents CSS injection via a crafted data URL

**Storage and DOM**
- All data read from `chrome.storage.sync` and `chrome.storage.local` is sanitized before use (`sanitizeTile()`, strict icon ID format, MIME check on every stored icon). Storage is treated as untrusted
- Storage write errors are reported to the user instead of failing silently
- Options are loaded field-by-field with explicit type and format checks, not via `Object.assign` — prevents unknown properties from being injected from storage
- Dynamic DOM content built exclusively with `createElement` / `textContent`. No `innerHTML` with user-supplied data anywhere in the codebase

**Network and policy**
- Strict Content Security Policy in `manifest.json`: `script-src 'self'`, `style-src 'self'` (no `'unsafe-inline'`), no inline scripts or styles, no `eval`, `connect-src 'none'`, `form-action 'none'`. Images are allowed only from the extension itself, `data:` URIs and Google's favicon hosts (`www.google.com`, `*.gstatic.com`)
- All styles live in `.css` files; the HTML contains no `<style>` blocks or `style=` attributes
- No external fonts, scripts, or stylesheets loaded at runtime — all CSS uses a system font stack so no `@import` requests are made from extension pages
- No telemetry, no analytics. The only outbound request is the Google favicon service used to fetch bookmark icons

## Usage

| Action | Result |
|--------|--------|
| Click tile | Open the bookmarked URL |
| Middle-click tile | Open the bookmarked URL in a new tab |
| Double-click tile | Toggle highlight border |
| Edit mode → click tile | Edit or delete bookmark |
| Edit mode → drag tile | Reorder tiles |
| `···` handle | Show / hide the toolbar |
| `+` tile | Add a new bookmark |
| Options → Theme | Switch between Default, Futuristic and Dark theme |

## License

Free to use and modify. If you redistribute a modified version, please credit the original author: **kozinek**.

Want to say thanks? [Buy me a coffee ☕](https://ko-fi.com/kozinek)
