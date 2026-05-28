let _csCurrent = [];

async function loadCSContacts() {
    try {
        const { data, error } = await db
            .from('cs_contacts').select('*')
            .order('platform').order('sort_order', { ascending: true });
        if (error) throw error;
        _csCurrent = data || [];
        renderCSList(_csCurrent);
        const el = document.getElementById('cs-count');
        if (el) el.textContent = _csCurrent.length;
    } catch(e) { console.error('loadCSContacts:', e); }
}

const _CS_ICONS = {
    viber:    'https://ik.imagekit.io/tdpebgueq/icons/viber_logo_wG8S5sFl5P.png?tr=w-40,h-40,f-auto',
    telegram: 'https://ik.imagekit.io/tdpebgueq/icons/telegram_logo_QeWRW9-okP.png?tr=w-40,h-40,f-auto'
};

function renderCSList(contacts) {
    const el = document.getElementById('cs-contact-list');
    if (!el) return;
    if (!contacts.length) {
        el.innerHTML = '<p class="text-[11px] text-center py-4" style="color:var(--text-dim)">Contact မရှိသေးပါ</p>';
        return;
    }
    el.innerHTML = contacts.map(c => {
        const icon     = _CS_ICONS[c.platform] || _CS_ICONS.viber;
        const platLbl  = c.platform === 'viber' ? '💜 Viber' : '💙 Telegram';
        const isActive = c.is_active !== false;
        const id       = c.id;
        return `<div class="card space-y-2" style="border-left:3px solid ${isActive ? 'var(--cyan)' : 'rgba(255,77,141,0.5)'}">
            <div class="flex items-center gap-2">
                <img src="${icon}" width="32" height="32" style="border-radius:50%;flex-shrink:0" loading="lazy">
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold" style="color:var(--text-primary)">${c.name}</p>
                    <p class="text-[9px]" style="color:var(--text-dim)">${platLbl} · order: ${c.sort_order}</p>
                </div>
                <span class="badge ${isActive ? 'badge-active' : 'badge-banned'}" style="font-size:8px">${isActive ? 'Active' : 'Off'}</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="col-span-2">
                    <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">အမည်</label>
                    <input type="text" id="cs-name-${id}" value="${c.name.replace(/"/g,'&quot;')}" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                </div>
                <div class="col-span-2">
                    <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Contact URL</label>
                    <input type="text" id="cs-url-${id}" value="${c.contact_url}" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                </div>
                <div>
                    <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Display Label</label>
                    <input type="text" id="cs-label-${id}" value="${c.display_label.replace(/"/g,'&quot;')}" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                </div>
                <div>
                    <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">ချိတ်ဆက်ချိန်</label>
                    <input type="text" id="cs-hours-${id}" value="${c.hours||'00:00 - 23:59'}" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                </div>
                <div>
                    <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Sort</label>
                    <input type="number" id="cs-sort-${id}" value="${c.sort_order||0}" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                </div>
                <div>
                    <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Status</label>
                    <select id="cs-active-${id}" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                        <option value="true"  ${isActive  ? 'selected':''}>✅ Active</option>
                        <option value="false" ${!isActive ? 'selected':''}>🔴 Inactive</option>
                    </select>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="updateCSContact(${id})" class="compact-btn btn-success flex-1 py-1.5 text-[10px]">
                    <i class="fa-solid fa-floppy-disk mr-1"></i>သိမ်းမည်
                </button>
                <button onclick="deleteCSContact(${id},'${c.name.replace(/'/g,"\\'")}')" class="compact-btn btn-danger px-3 py-1.5 text-[10px]">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

async function updateCSContact(id) {
    try {
        const updates = {
            name:          document.getElementById(`cs-name-${id}`)?.value?.trim(),
            contact_url:   document.getElementById(`cs-url-${id}`)?.value?.trim(),
            display_label: document.getElementById(`cs-label-${id}`)?.value?.trim(),
            hours:         document.getElementById(`cs-hours-${id}`)?.value?.trim(),
            sort_order:    parseInt(document.getElementById(`cs-sort-${id}`)?.value || 0),
            is_active:     document.getElementById(`cs-active-${id}`)?.value === 'true'
        };
        if (!updates.name || !updates.contact_url) { showToast('အမည် နှင့် URL ဖြည့်ပါ', 'error'); return; }
        const { error } = await db.from('cs_contacts').update(updates).eq('id', id);
        if (error) throw error;
        showToast('CS Contact သိမ်းပြီ! ✅', 'success');
        loadCSContacts();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

async function deleteCSContact(id, name) {
    if (!confirm(`"${name}" ကို ဖျက်မှာ သေချာပါသလား?`)) return;
    try {
        const { error } = await db.from('cs_contacts').delete().eq('id', id);
        if (error) throw error;
        showToast(`${name} ဖျက်ပြီ!`, 'success');
        loadCSContacts();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

function showAddCSForm() {
    const existing = document.getElementById('add-cs-form');
    if (existing) { existing.remove(); return; }
    const form = document.createElement('div');
    form.id = 'add-cs-form';
    form.className = 'card space-y-3 mt-2';
    form.style.cssText = 'border:1px solid var(--border-c);box-shadow:var(--glow-border-c)';
    form.innerHTML = `
        <p class="section-title" style="color:var(--cyan)">🆕 Contact အသစ် ထည့်မည်</p>
        <div>
            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Platform</label>
            <select id="new-cs-platform" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                <option value="viber">💜 Viber</option>
                <option value="telegram">💙 Telegram</option>
            </select>
        </div>
        <div>
            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">အမည် *</label>
            <input type="text" id="new-cs-name" placeholder="Viber ဝန်ဆောင်မှု ၃" class="text-[11px] w-full p-1.5 rounded-lg px-2">
        </div>
        <div>
            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Contact URL * (viber://chat?number=+959... / https://t.me/...)</label>
            <input type="text" id="new-cs-url" placeholder="viber://chat?number=+959..." class="text-[11px] w-full p-1.5 rounded-lg px-2">
        </div>
        <div>
            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Display Label (ဖုန်းနံပါတ် / @username)</label>
            <input type="text" id="new-cs-label" placeholder="+95978..." class="text-[11px] w-full p-1.5 rounded-lg px-2">
        </div>
        <div>
            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">ချိတ်ဆက်ချိန်</label>
            <input type="text" id="new-cs-hours" value="00:00 - 23:59" class="text-[11px] w-full p-1.5 rounded-lg px-2">
        </div>
        <div class="flex gap-2">
            <button onclick="createCSContact()" class="compact-btn btn-primary flex-1 py-2 text-[10px]">
                <i class="fa-solid fa-plus mr-1"></i>ထည့်မည်
            </button>
            <button onclick="document.getElementById('add-cs-form').remove()" class="compact-btn btn-ghost px-4 py-2 text-[10px]">မလုပ်တော့</button>
        </div>`;
    const list = document.getElementById('cs-contact-list');
    if (list) list.before(form);
    document.getElementById('new-cs-name')?.focus();
}

async function createCSContact() {
    const platform = document.getElementById('new-cs-platform')?.value;
    const name     = document.getElementById('new-cs-name')?.value?.trim();
    const url      = document.getElementById('new-cs-url')?.value?.trim();
    const label    = document.getElementById('new-cs-label')?.value?.trim();
    const hours    = document.getElementById('new-cs-hours')?.value?.trim() || '00:00 - 23:59';
    if (!name || !url) { showToast('အမည် နှင့် URL ဖြည့်ပါ', 'error'); return; }
    try {
        const sortNum = _csCurrent.filter(c => c.platform === platform).length + 1;
        const { error } = await db.from('cs_contacts').insert({
            platform, name, contact_url: url,
            display_label: label || url, hours,
            is_active: true, sort_order: sortNum,
            created_at: new Date().toISOString()
        });
        if (error) throw error;
        showToast(`${name} ထည့်ပြီ! ✅`, 'success');
        document.getElementById('add-cs-form')?.remove();
        loadCSContacts();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

function openCSPanel() {
    document.getElementById('panel-cs').classList.add('open');
    loadCSContacts();
}
function closeCSPanel() {
    document.getElementById('panel-cs').classList.remove('open');
}
