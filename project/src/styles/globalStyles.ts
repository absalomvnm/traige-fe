

const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans' !important;
    color: #23272F;
    font-weight: 400;
    letter-spacing: 0.01em;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'DM Sans' !important;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: #181A20;
    margin-bottom: 0.5em;
  }
  .card, .profile-card, .stats-card {
    border-radius: 18px;
    box-shadow: 0 2px 16px rgba(30, 41, 59, 0.07);
    background: #fff;
  }
  input, select, button, textarea, label, .stat-label, .stat-value {
    font-family: 'DM Sans' !important;
    font-weight: 400;
    letter-spacing: 0.01em;
  }
  // --- Google Fonts DM Sans import for testing ---
  const googleFontLink = document.createElement("link");
  googleFontLink.rel = "stylesheet";
  googleFontLink.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap";
  document.head.appendChild(googleFontLink);
  .stat-label {
    font-size: 13px;
    font-weight: 500;
    color: #6B7280;
    letter-spacing: 0.03em;
    margin-bottom: 2px;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #23272F;
    letter-spacing: 0.01em;
    margin-bottom: 0;
  }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2A7D4F55; border-radius: 8px; }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes slideUp  { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse    { 0%,100%{ opacity:1; } 50%{ opacity:.4; } }
  @keyframes shimmer  { 0%{ background-position:-200% 0; } 100%{ background-position:200% 0; } }
  @keyframes glow     { 0%,100%{ box-shadow:0 0 8px rgba(220,38,38,.4); } 50%{ box-shadow:0 0 22px rgba(220,38,38,.9); } }
  @keyframes walkRise0 {
    0%   { transform: translate3d(63px, 0, 0) scale(.92); opacity: 0; }
    12%  { opacity: 1; }
    72%  { transform: translate3d(0, -34px, 0) scale(1); opacity: 1; }
    100% { transform: translate3d(0, -34px, 0) scale(1); opacity: 1; }
  }
  @keyframes walkRise1 {
    0%   { transform: translate3d(0, 0, 0) scale(.92); opacity: 0; }
    12%  { opacity: 1; }
    72%  { transform: translate3d(0, -34px, 0) scale(1); opacity: 1; }
    100% { transform: translate3d(0, -34px, 0) scale(1); opacity: 1; }
  }
  @keyframes walkRise2 {
    0%   { transform: translate3d(-63px, 0, 0) scale(.92); opacity: 0; }
    12%  { opacity: 1; }
    72%  { transform: translate3d(0, -34px, 0) scale(1); opacity: 1; }
    100% { transform: translate3d(0, -34px, 0) scale(1); opacity: 1; }
  }
  .walk-step {
    animation-duration: 3.6s;
    animation-timing-function: cubic-bezier(.22,1,.36,1);
    animation-iteration-count: 1;
    animation-fill-mode: both;
    will-change: transform, opacity;
  }
  .walk-step-0 { animation-name: walkRise0; }
  .walk-step-1 { animation-name: walkRise1; }
  .walk-step-2 { animation-name: walkRise2; }
  .fade-up   { animation: fadeUp  .4s cubic-bezier(.22,1,.36,1) both; }
  .fade-in   { animation: fadeIn  .25s ease both; }
  @keyframes toast-in { from { opacity:0; transform:translateY(16px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
  .slide-up  { animation: slideUp .5s cubic-bezier(.22,1,.36,1) both; }
  .pulse     { animation: pulse   2s ease-in-out infinite; }
  .glow-p1   { animation: glow    1.8s ease-in-out infinite; }
  @keyframes vitalPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.55), 0 2px 10px rgba(220,38,38,.25); } 50% { box-shadow: 0 0 0 6px rgba(220,38,38,0), 0 4px 16px rgba(220,38,38,.45); } }
  .vital-critical-pulse { animation: vitalPulse 1.6s ease-in-out infinite; }
  @keyframes ctgSpin { to { transform: rotate(360deg); } }
  .ctg-spin { animation: ctgSpin .9s linear infinite; }
  /* ── Card hover / press ─────────────────────────────────────────────── */
  .card-hover {
    transition: transform .18s cubic-bezier(.22,1,.36,1), box-shadow .18s;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .card-hover:hover  { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,.11) !important; }
  .card-hover:active { transform: scale(.97) translateY(0) !important; box-shadow: 0 2px 8px rgba(0,0,0,.10) !important; filter: brightness(.96); transition: transform .07s, filter .07s, box-shadow .07s; }

  /* ── Button press ───────────────────────────────────────────────────── */
  .btn-press {
    transition: transform .1s cubic-bezier(.22,1,.36,1), filter .1s, box-shadow .1s;
    -webkit-tap-highlight-color: transparent;
    position: relative;
    overflow: hidden;
  }
  .btn-press:hover  { filter: brightness(1.07); }
  .btn-press:active { transform: scale(.93); filter: brightness(.88); box-shadow: 0 1px 4px rgba(0,0,0,.18) !important; transition: transform .06s, filter .06s; }

  /* ── Ripple on btn-press ────────────────────────────────────────────── */
  .btn-press::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, rgba(255,255,255,.35) 0%, transparent 70%);
    opacity: 0;
    transition: opacity .4s ease;
    pointer-events: none;
    border-radius: inherit;
  }
  .btn-press:active::after { opacity: 1; transition: opacity .05s ease; }

  /* ── All bare buttons get a subtle press feel ───────────────────────── */
  button:not(.btn-press):not(.card-hover):not(.nav-tab) {
    -webkit-tap-highlight-color: transparent;
    transition: opacity .12s, transform .1s;
  }
  button:not(.btn-press):not(.card-hover):not(.nav-tab):active {
    opacity: .72;
    transform: scale(.95);
    transition: opacity .05s, transform .05s;
  }

  /* ── Nav tab ────────────────────────────────────────────────────────── */
  .nav-tab {
    transition: color .15s, background .15s, transform .1s;
    -webkit-tap-highlight-color: transparent;
  }
  .nav-tab:hover  { background: rgba(42,125,79,.08); }
  .nav-tab:active { transform: scale(.88); background: rgba(42,125,79,.14); transition: transform .06s; }

  /* ── Inputs ─────────────────────────────────────────────────────────── */
  input:focus, select:focus, textarea:focus { outline:none !important; border-color:#2A7D4F !important; box-shadow:0 0 0 3px rgba(42,125,79,.15) !important; }

  /* ── Checkbox ───────────────────────────────────────────────────────── */
  .check-box { width:20px; height:20px; border-radius:6px; border:2px solid #CBD5E1; appearance:none; cursor:pointer; transition:all .15s; flex-shrink:0; background:#fff; }
  .check-box:checked { background:linear-gradient(135deg,#2A7D4F,#3da868); border-color:#2A7D4F; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6.5 11.5L3 8l1.5-1.5 2 2 5-5L13 5z'/%3E%3C/svg%3E"); }
  .check-box:active { transform: scale(.88); }

  /* ── Misc ───────────────────────────────────────────────────────────── */
  .glass { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  select option { background: #1e293b; color: #f1f5f9; }

  /* ── Stat / quick-action cards ──────────────────────────────────────── */
  @keyframes tap-flash {
    0%   { opacity: 1; }
    40%  { opacity: .72; }
    100% { opacity: 1; }
  }
  .card-hover:active { animation: tap-flash .22s ease; }
`;
document.head.appendChild(style);

// --- DM Sans font-face (ensure DM_Sans is in /public/DM_Sans)
const dmSansFontFace = `
  @font-face {
    font-family: 'DM Sans';
    src: url('/DM_Sans/DMSans-VariableFont_opsz,wght.ttf') format('truetype');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'DM Sans';
    src: url('/DM_Sans/DMSans-Italic-VariableFont_opsz,wght.ttf') format('truetype');
    font-weight: 100 900;
    font-style: italic;
    font-display: swap;
  }
`;
const dmSansStyle = document.createElement("style");
dmSansStyle.textContent = dmSansFontFace;
document.head.appendChild(dmSansStyle);
