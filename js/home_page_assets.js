// ═══════════════════════════════════════════════════════════
//  HOME PAGE ASSETS — 7 Social Icon slots + 9 License slots
//  Table: home_page_assets  |  key TEXT PRIMARY KEY
// ═══════════════════════════════════════════════════════════

const HOME_ICON_DEFS = [
  { key:'ic_1', label:'Social Icon 1' },
  { key:'ic_2', label:'Social Icon 2' },
  { key:'ic_3', label:'Social Icon 3' },
  { key:'ic_4', label:'Social Icon 4' },
  { key:'ic_5', label:'Social Icon 5' },
  { key:'ic_6', label:'Social Icon 6' },
  { key:'ic_7', label:'Social Icon 7' },
];

const HOME_LICENSE_DEFS = [
  { key:'lc_1', label:'License Logo 1' },
  { key:'lc_2', label:'License Logo 2' },
  { key:'lc_3', label:'License Logo 3' },
  { key:'lc_4', label:'License Logo 4' },
  { key:'lc_5', label:'License Logo 5' },
  { key:'lc_6', label:'License Logo 6' },
  { key:'lc_7', label:'License Logo 7' },
  { key:'lc_8', label:'License Logo 8' },
  { key:'lc_9', label:'License Logo 9' },
];

let _haTab = 'icon';

function openHomeAssetsPanel() {
  document.getElementById('panel-home-assets')?.classList.add('open');
  haShowTab('icon');
}
function closeHomeAssetsPanel() {
  document.getElementById('panel-home-assets')?.classList.remove('open');
}

// ── Sub-tab switch ────────────────────────────────────────
function haShowTab(tab) {
  _haTab = tab;
  document.querySelectorAll('.ha-tab-btn').forEach(b => {
    const isActive = b.dataset.tab === tab;
    b.style.borderBottomColor = isActive ? 'var(--gold)' : 'transparent';
    b.style.color = isActive ? 'var(--gold)' : 'var(--text-dim)';
  });
  document.getElementById('ha-icons-panel').style.display   = tab === 'icon'    ? 'block' : 'none';
  document.getElementById('ha-license-panel').style.display = tab === 'license' ? 'block' : 'none';
  loadHomeAssets();
}

// ── Load from Supabase ────────────────────────────────────
async function loadHomeAssets() {
  const allKeys = [...HOME_ICON_DEFS, ...HOME_LICENSE_DEFS].map(d => d.key);
  const { data } = await db.from('home_page_assets').select('key,image_url').in('key', allKeys);
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.image_url || ''; });

  [...HOME_ICON_DEFS, ...HOME_LICENSE_DEFS].forEach(d => {
    const input = document.getElementById('ha_' + d.key);
    if (input) input.value = map[d.key] || '';
    haPreview(d.key, map[d.key] || '');
  });
}

// ── Live preview ──────────────────────────────────────────
function haPreviewInput(key) {
  const url = document.getElementById('ha_' + key)?.value || '';
  haPreview(key, url);
}

function haPreview(key, url) {
  const prev = document.getElementById('haprev_' + key);
  if (!prev) return;
  if (url) {
    prev.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;border-radius:6px"
      onerror="this.parentElement.innerHTML='<i class=\\"fa-solid fa-image\\" style=\\"color:rgba(255,255,255,.2);font-size:16px\\"></i>'">`;
  } else {
    prev.innerHTML = '<i class="fa-solid fa-image" style="color:rgba(255,255,255,.2);font-size:16px"></i>';
  }
}

// ── Save All ──────────────────────────────────────────────
async function haIconsSave() {
  await _haSave(HOME_ICON_DEFS, 'ha-icons-save-btn', 'ha-icons-msg');
}
async function haLicenseSave() {
  await _haSave(HOME_LICENSE_DEFS, 'ha-license-save-btn', 'ha-license-msg');
}

async function _haSave(defs, btnId, msgId) {
  const btn = document.getElementById(btnId);
  const msg = document.getElementById(msgId);
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>သိမ်းနေသည်...'; }
  if (msg) msg.textContent = '';

  const rows = defs.map(d => ({
    key: d.key,
    image_url: (document.getElementById('ha_' + d.key)?.value || '').trim(),
  }));

  const { error } = await db.from('home_page_assets').upsert(rows, { onConflict: 'key' });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>သိမ်းဆည်း'; }
  if (error) {
    if (msg) { msg.style.color = 'var(--red)'; msg.textContent = '❌ ' + error.message; }
    showToast('Error: ' + error.message, 'error');
  } else {
    if (msg) { msg.style.color = 'var(--green)'; msg.textContent = '✅ သိမ်းပြီးပြီ!'; setTimeout(() => { if(msg) msg.textContent=''; }, 3000); }
    showToast('သိမ်းပြီ ✅', 'success');
  }
}
