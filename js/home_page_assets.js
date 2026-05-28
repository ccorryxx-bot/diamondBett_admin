// ═══════════════════════════════════════════════════════════
//  HOME PAGE ASSETS — Social Icons (7) + License Logos (9)
//  Table: home_page_assets
//  type: 'icon' | 'license'
// ═══════════════════════════════════════════════════════════

let _haSubTab = 'icon'; // current sub-tab

function openHomeAssetsPanel() {
  document.getElementById('panel-home-assets')?.classList.add('open');
  loadHomeAssets('icon');
}
function closeHomeAssetsPanel() {
  document.getElementById('panel-home-assets')?.classList.remove('open');
  _closeHaForm();
}

function haSubTab(el, type) {
  document.querySelectorAll('.ha-sub-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  _haSubTab = type;
  loadHomeAssets(type);
}

// ── Load & Render ────────────────────────────────────────
async function loadHomeAssets(type) {
  _haSubTab = type || _haSubTab;
  const list = document.getElementById('ha-list');
  if (!list) return;
  list.innerHTML = [1,2,3].map(() => '<div class="skeleton h-16 rounded-xl mb-2"></div>').join('');

  const { data, error } = await db
    .from('home_page_assets')
    .select('*')
    .eq('type', _haSubTab)
    .order('sort_order', { ascending: true });

  if (error) { list.innerHTML = `<p style="color:var(--red);font-size:11px;padding:8px">⚠ ${error.message}</p>`; return; }
  if (!data?.length) {
    const lbl = _haSubTab === 'icon' ? 'Social Icon' : 'License Logo';
    list.innerHTML = `<div style="text-align:center;padding:24px;font-size:11px;color:var(--text-dim);border:1px dashed rgba(255,255,255,.1);border-radius:12px">${lbl} မရှိသေးပါ — အပေါ်ကခလုတ်ဖြင့် ထည့်ပါ</div>`;
    return;
  }
  const isIcon = _haSubTab === 'icon';
  list.innerHTML = data.map(a => `
    <div id="ha-card-${a.id}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--bg-card-2);border:1px solid ${a.is_active ? 'var(--border-p)' : 'rgba(239,68,68,.25)'};margin-bottom:8px">
      <div style="flex-shrink:0;width:${isIcon?'42px':'64px'};height:42px;border-radius:${isIcon?'50%':'8px'};overflow:hidden;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center">
        <img src="${a.image_url}" alt="${a.name}"
          style="width:100%;height:100%;object-fit:${isIcon?'cover':'contain'};border-radius:${isIcon?'50%':'6px'}"
          onerror="this.style.opacity='.2'">
      </div>
      <div style="flex:1;min-width:0">
        <p style="font-size:12px;font-weight:700;color:var(--text-primary)">${a.name}</p>
        <p style="font-size:9px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${a.image_url}</p>
        <p style="font-size:9px;margin-top:1px">Sort: ${a.sort_order} · <span style="color:${a.is_active?'var(--green)':'var(--red)'}">${a.is_active?'Active':'Hidden'}</span></p>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
        <button onclick="haEditCard('${a.id}')" class="compact-btn btn-ghost" style="font-size:9px;padding:4px 8px"><i class="fa-solid fa-pen"></i></button>
        <button onclick="haToggle('${a.id}',${a.is_active})" class="compact-btn ${a.is_active?'btn-warning':'btn-success'}" style="font-size:9px;padding:4px 8px">${a.is_active?'Hide':'Show'}</button>
        <button onclick="haDelete('${a.id}')" class="compact-btn btn-danger" style="font-size:9px;padding:4px 8px"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('');
}

// ── Form Open/Close ──────────────────────────────────────
let _haEditId = null;

function openHaForm() {
  _haEditId = null;
  document.getElementById('ha-form-title').textContent = _haSubTab === 'icon' ? 'Social Icon အသစ်' : 'License Logo အသစ်';
  document.getElementById('ha-type').value    = _haSubTab;
  document.getElementById('ha-name').value    = '';
  document.getElementById('ha-img').value     = '';
  document.getElementById('ha-link').value    = '';
  document.getElementById('ha-sort').value    = '0';
  _haPreview('');
  document.getElementById('ha-form').style.display = 'block';
  document.getElementById('ha-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function haEditCard(id) {
  // fetch the card data from DOM
  const row = document.getElementById('ha-card-' + id);
  if (!row) return;
  // re-fetch from DB for accuracy
  db.from('home_page_assets').select('*').eq('id', id).single().then(({ data }) => {
    if (!data) return;
    _haEditId = id;
    document.getElementById('ha-form-title').textContent = 'ပြင်ဆင်မည်';
    document.getElementById('ha-type').value  = data.type;
    document.getElementById('ha-name').value  = data.name;
    document.getElementById('ha-img').value   = data.image_url;
    document.getElementById('ha-link').value  = data.link_url || '';
    document.getElementById('ha-sort').value  = data.sort_order;
    _haPreview(data.image_url);
    document.getElementById('ha-form').style.display = 'block';
    document.getElementById('ha-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function _closeHaForm() {
  _haEditId = null;
  document.getElementById('ha-form').style.display = 'none';
}

// ── Image Preview ────────────────────────────────────────
function _haPreview(url) {
  const wrap = document.getElementById('ha-preview-wrap');
  const img  = document.getElementById('ha-preview-img');
  if (!wrap || !img) return;
  if (url) { img.src = url; wrap.style.display = 'flex'; }
  else      { wrap.style.display = 'none'; img.src = ''; }
}
function haPreviewInput() {
  _haPreview(document.getElementById('ha-img')?.value?.trim());
}

// ── Save ─────────────────────────────────────────────────
async function haSave() {
  const name  = document.getElementById('ha-name')?.value?.trim();
  const img   = document.getElementById('ha-img')?.value?.trim();
  const link  = document.getElementById('ha-link')?.value?.trim();
  const type  = document.getElementById('ha-type')?.value || _haSubTab;
  const sort  = parseInt(document.getElementById('ha-sort')?.value || 0);
  const btn   = document.getElementById('ha-save-btn');
  const msg   = document.getElementById('ha-form-msg');

  if (!name) { showToast('Name ဖြည့်ပါ', 'error'); return; }
  if (!img)  { showToast('Image URL ဖြည့်ပါ', 'error'); return; }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>သိမ်းနေသည်...'; }
  if (msg) msg.textContent = '';

  const row = { type, name, image_url: img, link_url: link || null, sort_order: sort };
  let error;

  if (_haEditId) {
    ({ error } = await db.from('home_page_assets').update(row).eq('id', _haEditId));
  } else {
    ({ error } = await db.from('home_page_assets').insert({ ...row, is_active: true }));
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>သိမ်းဆည်း'; }

  if (error) {
    if (msg) { msg.style.color = 'var(--red)'; msg.textContent = '❌ ' + error.message; }
    showToast('Error: ' + error.message, 'error');
  } else {
    showToast(_haEditId ? 'ပြင်ဆင်ပြီ ✅' : 'ထည့်ပြီ ✅', 'success');
    _closeHaForm();
    loadHomeAssets(_haSubTab);
  }
}

// ── Toggle Active ────────────────────────────────────────
async function haToggle(id, cur) {
  const { error } = await db.from('home_page_assets').update({ is_active: !cur }).eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast(!cur ? 'Active ဖြစ်ပြီ ✅' : 'Hidden ဖြစ်ပြီ', 'success');
  loadHomeAssets(_haSubTab);
}

// ── Delete ───────────────────────────────────────────────
async function haDelete(id) {
  if (!confirm('ဤ item ကို ဖျက်မှာ သေချာပါသလား?')) return;
  const { error } = await db.from('home_page_assets').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('ဖျက်ပြီ!', 'success');
  loadHomeAssets(_haSubTab);
}
