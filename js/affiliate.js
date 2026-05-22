async function loadAffiliate() {
    const el = document.getElementById('affiliate-config-list');
    if (!el) return;
    el.innerHTML = `<div class="text-center py-3 text-[11px] animate-pulse" style="color:var(--text-dim)">တင်နေသည်...</div>`;
    try {
        const { data, error } = await db.from('affiliate_config')
            .select('*').order('level', { ascending: true });
        if (error) throw error;
        renderAffiliateConfig(data || []);
    } catch(e) { el.innerHTML = `<p class="text-rose-400 text-[11px] p-2">${e.message}</p>`; }
}

function renderAffiliateConfig(configs) {
    const el = document.getElementById('affiliate-config-list');
    if (!el) return;
    if (!configs.length) {
        el.innerHTML = `<p class="text-center py-3 text-[11px]" style="color:var(--text-dim)">Config မရှိသေးပါ</p>`;
        return;
    }
    el.innerHTML = configs.map(c => `
        <div class="rounded-xl p-3 space-y-2" style="background:var(--bg-card-2);border:1px solid ${c.is_active ? 'var(--border-p)' : 'rgba(255,77,141,0.3)'}">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                         style="background:var(--purple-dim);color:var(--purple-bright);border:1px solid var(--border-p)">
                        L${c.level||'?'}
                    </div>
                    <div>
                        <p class="text-[11px] font-bold" style="color:var(--text-primary)">${c.description || 'Level '+c.level}</p>
                        <p class="text-[9px]" style="color:var(--text-dim)">${c.key||''}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <select id="aff-active-${c.id}" class="text-[10px] px-2 py-1 rounded-lg">
                        <option value="true"  ${c.is_active !== false ? 'selected':''}>✅ ON</option>
                        <option value="false" ${c.is_active === false  ? 'selected':''}>🔴 OFF</option>
                    </select>
                    <button onclick="saveAffiliateConfig('${c.id}')"
                        class="compact-btn btn-success px-2 py-1 text-[10px]">
                        <i class="fa-solid fa-floppy-disk"></i>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div>
                    <label class="text-[8px] block mb-0.5" style="color:var(--text-dim)">Deposit Rate (%)</label>
                    <input type="number" id="aff-dep-${c.id}" value="${c.deposit_rate||0}" min="0" max="100" step="0.5"
                        class="text-[11px] w-full p-1.5 rounded px-2 font-bold text-emerald-400">
                </div>
                <div>
                    <label class="text-[8px] block mb-0.5" style="color:var(--text-dim)">Withdraw Rate (%)</label>
                    <input type="number" id="aff-wd-${c.id}" value="${c.withdraw_rate||0}" min="0" max="100" step="0.5"
                        class="text-[11px] w-full p-1.5 rounded px-2 font-bold text-rose-400">
                </div>
                <div>
                    <label class="text-[8px] block mb-0.5" style="color:var(--text-dim)">Value (%)</label>
                    <input type="number" id="aff-val-${c.id}" value="${c.value||0}" min="0" max="100" step="0.5"
                        class="text-[11px] w-full p-1.5 rounded px-2">
                </div>
            </div>
        </div>`).join('');
}

async function saveAffiliateConfig(id) {
    const depRate  = parseFloat(document.getElementById(`aff-dep-${id}`)?.value || 0);
    const wdRate   = parseFloat(document.getElementById(`aff-wd-${id}`)?.value  || 0);
    const val      = parseFloat(document.getElementById(`aff-val-${id}`)?.value || 0);
    const isActive = document.getElementById(`aff-active-${id}`)?.value === 'true';
    try {
        const { error } = await db.from('affiliate_config').update({
            deposit_rate: depRate, withdraw_rate: wdRate,
            value: val, is_active: isActive
        }).eq('id', id);
        if (error) throw error;
        showToast('Affiliate config သိမ်းပြီ ✅', 'success');
        loadAffiliate();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}
