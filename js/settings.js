async function loadSettings() {
    try {
        const [{ data: sets }, { data: methods }, { data: bonusCodes }, { data: claims }] = await Promise.all([
            db.from('site_settings').select('*').eq('id',1).single(),
            db.from('payment_methods').select('*').order('id', { ascending: true }),
            db.from('bonus_codes').select('*').order('created_at',{ascending:false}),
            db.from('user_bonus_claims').select('id,claimed_at,amount,bonus_type,user_id,users(fullname,phone)')
                .order('claimed_at',{ascending:false}).limit(20)
        ]);

        // Site settings
        if (sets) {
            document.getElementById('set-welcome-toggle').value = (sets.welcome_bonus_enabled||false).toString();
            document.getElementById('set-welcome-amt').value    = sets.welcome_bonus_amount   || 0;
            document.getElementById('set-bonus-rate').value     = sets.deposit_bonus_rate      || 0;
            document.getElementById('set-turnover-x').value     = sets.turnover_multiplier     || 10;
            document.getElementById('set-min-wd').value         = sets.min_withdrawal          || 10000;
            document.getElementById('set-max-wd').value         = sets.max_withdrawal          || 1000000;
            document.getElementById('set-min-dep').value        = sets.min_deposit             || 5000;
            document.getElementById('set-max-daily-wd').value   = sets.max_daily_withdrawal    || 500000;
            document.getElementById('set-maintenance').value    = (sets.maintenance_mode||false).toString();
            const annEl = document.getElementById('set-announcement');
            if (annEl) annEl.value = sets.site_announcement || '';
        }

        // Payment methods
        const wrapper = document.getElementById('payment-list');
        document.getElementById('pm-loading-text')?.remove();
        wrapper.innerHTML = '';

        // Add New Gateway button (always show)
        wrapper.innerHTML = `
        <button onclick="showAddGateway()"
            class="compact-btn btn-primary w-full py-2.5 mb-2 text-[11px]">
            <i class="fa-solid fa-plus mr-1"></i> Gateway အသစ် ထည့်မည်
        </button>`;

        if (!methods?.length) {
            wrapper.innerHTML += `<p class="text-[11px] text-amber-500 p-2 text-center">Gateway မရှိသေးပါ — အသစ်ထည့်ပါ</p>`;
        } else {
            methods.forEach(m => {
                const id        = m.id.toString();
                const isActive  = m.is_active !== false;
                const isRec     = m.is_recommended === true;
                // min/max_amount columns may not exist yet (before migration)
                const minAmt    = m.min_amount  != null ? m.min_amount  : 5000;
                const maxAmt    = m.max_amount  != null ? m.max_amount  : 5000000;
                const provIcon  = (m.provider_name||'').toLowerCase().includes('kbz')  ? '🏦' :
                                  (m.provider_name||'').toLowerCase().includes('wave') ? '🌊' :
                                  (m.provider_name||'').toLowerCase().includes('aya')  ? '🏛️' : '💳';
                wrapper.innerHTML += `
                <div class="card space-y-3" style="will-change:transform;contain:content;border-left:3px solid ${isActive ? 'var(--cyan)' : 'rgba(255,77,141,0.5)'}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-[18px]">${provIcon}</span>
                            <div>
                                <p class="text-[12px] font-bold" style="color:var(--purple-bright)">${m.provider_name || 'Gateway'}</p>
                                ${isRec ? '<span class="badge badge-active text-[8px]">⭐ Recommended</span>' : ''}
                            </div>
                        </div>
                        <div class="flex gap-1.5 items-center">
                            <select id="pm-status-${id}" class="text-[10px] px-2 py-1 rounded-lg">
                                <option value="true"  ${isActive  ? 'selected':''}>✅ Active</option>
                                <option value="false" ${!isActive ? 'selected':''}>🔴 Inactive</option>
                            </select>
                            <button onclick="updatePM('${id}')" class="compact-btn btn-success px-3 py-1 text-[10px]">
                                <i class="fa-solid fa-floppy-disk"></i>
                            </button>
                            <button onclick="deletePM('${id}','${m.provider_name||''}')" class="compact-btn btn-danger px-2 py-1 text-[10px]">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Provider / ဝန်ဆောင်မှု</label>
                            <input type="text" value="${m.provider_name||''}" id="pm-provider-${id}"
                                class="text-[11px] w-full p-1.5 rounded-lg px-2" placeholder="KBZ Pay">
                        </div>
                        <div>
                            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Recommended</label>
                            <select id="pm-rec-${id}" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                                <option value="true"  ${isRec  ? 'selected':''}>⭐ ပင်မ</option>
                                <option value="false" ${!isRec ? 'selected':''}>ပုံမှန်</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">အကောင့်အမည်</label>
                            <input type="text" value="${m.account_name||''}" id="pm-name-${id}"
                                class="text-[11px] w-full p-1.5 rounded-lg px-2" placeholder="ဦးအောင်မြင့်">
                        </div>
                        <div>
                            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">အကောင့်နံပါတ်</label>
                            <input type="text" value="${m.account_number||''}" id="pm-num-${id}"
                                class="text-[11px] w-full p-1.5 rounded-lg px-2" placeholder="09xxxxxxxxx">
                        </div>
                        <div>
                            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">အနည်းဆုံး (K)</label>
                            <input type="number" value="${minAmt}" id="pm-min-${id}"
                                class="text-[11px] w-full p-1.5 rounded-lg px-2">
                        </div>
                        <div>
                            <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">အများဆုံး (K)</label>
                            <input type="number" value="${maxAmt}" id="pm-max-${id}"
                                class="text-[11px] w-full p-1.5 rounded-lg px-2">
                        </div>
                    </div>
                </div>`;
            });
        }

        // Bonus codes
        renderBonusCodes(bonusCodes || []);
        renderBonusClaims(claims || []);

    } catch(e) { console.error('loadSettings:', e); }
}

function renderBonusCodes(codes) {
    const el = document.getElementById('bonus-codes-list');
    if (!el) return;
    if (!codes.length) {
        el.innerHTML = `<p class="text-[11px] text-center py-2" style="color:var(--text-dim)">Code မရှိသေးပါ</p>`;
        return;
    }
    el.innerHTML = codes.map(c => {
        const expired = c.expires_at && new Date(c.expires_at) < new Date();
        const pct     = c.max_uses > 0 ? Math.round((c.current_uses / c.max_uses) * 100) : 0;
        return `<div class="rounded-xl p-3 space-y-2" style="background:var(--bg-card-2);border:1px solid var(--border-p);will-change:transform;contain:content;">
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-mono font-bold text-[13px]" style="color:var(--purple-bright)">${c.code}</p>
                    <p class="text-[9px] mt-0.5" style="color:var(--text-dim)">${c.description||''}</p>
                </div>
                <div class="text-right">
                    <span class="badge ${c.is_active && !expired ? 'badge-active' : 'badge-banned'}">
                        ${expired ? 'သက်တမ်းကုန်' : c.is_active ? 'Active' : 'ပိတ်'}
                    </span>
                    <p class="text-[9px] mt-0.5 text-amber-400">${c.amount?.toLocaleString()||0} K</p>
                </div>
            </div>
            <div>
                <div class="flex justify-between text-[9px] mb-1">
                    <span style="color:var(--text-dim)">သုံးမှု: ${c.current_uses||0} / ${c.max_uses||0}</span>
                    <span style="color:var(--text-secondary)">${pct}%</span>
                </div>
                <div class="w-full rounded-full h-1.5" style="background:var(--bg-hover)">
                    <div class="h-1.5 rounded-full transition-all" style="width:${pct}%;background:linear-gradient(90deg,var(--purple),var(--cyan))"></div>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="toggleBonusCode('${c.id}',${c.is_active})"
                    class="compact-btn flex-1 py-1 text-[10px] ${c.is_active ? 'btn-danger' : 'btn-success'}">
                    ${c.is_active ? 'ပိတ်မည်' : 'ဖွင့်မည်'}
                </button>
                <button onclick="deleteBonusCode('${c.id}')"
                    class="compact-btn btn-danger px-3 py-1 text-[10px]">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

function renderBonusClaims(claims) {
    const el = document.getElementById('bonus-claims-list');
    if (!el) return;
    if (!claims.length) {
        el.innerHTML = `<p class="text-[11px] text-center py-2" style="color:var(--text-dim)">မှတ်တမ်း မရှိသေးပါ</p>`;
        return;
    }
    el.innerHTML = claims.map(c => {
        const u    = c.users || {};
        const name = u.fullname || u.phone || 'Unknown';
        const dt   = new Date(c.claimed_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'});
        return `<div class="flex items-center justify-between py-2" style="border-bottom:1px solid rgba(157,78,221,0.1)">
            <div>
                <p class="text-[11px] font-semibold">${name}</p>
                <p class="text-[9px]" style="color:var(--text-dim)">${c.bonus_type||'code'} · ${dt}</p>
            </div>
            <p class="text-[12px] font-bold text-emerald-400">${parseFloat(c.amount||0).toLocaleString()} K</p>
        </div>`;
    }).join('');
}

async function saveSettings() {
    try {
        const updates = {
            welcome_bonus_enabled:  document.getElementById('set-welcome-toggle').value === 'true',
            welcome_bonus_amount:   parseFloat(document.getElementById('set-welcome-amt').value || 0),
            deposit_bonus_rate:     parseFloat(document.getElementById('set-bonus-rate').value  || 0),
            turnover_multiplier:    parseFloat(document.getElementById('set-turnover-x').value  || 10),
            min_withdrawal:         parseFloat(document.getElementById('set-min-wd').value       || 10000),
            max_withdrawal:         parseFloat(document.getElementById('set-max-wd').value       || 1000000),
            min_deposit:            parseFloat(document.getElementById('set-min-dep')?.value     || 5000),
            max_daily_withdrawal:   parseFloat(document.getElementById('set-max-daily-wd')?.value|| 500000),
            maintenance_mode:       document.getElementById('set-maintenance')?.value === 'true',
            site_announcement:      document.getElementById('set-announcement')?.value || '',
            updated_at:             new Date().toISOString()
        };
        const { error } = await db.from('site_settings').update(updates).eq('id', 1);
        if (error) throw error;
        showToast('ဆက်တင်များ သိမ်းဆည်းပြီ!', 'success');
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

async function updatePM(id) {
    try {
        // Base fields (always exist)
        const updates = {
            provider_name:    document.getElementById(`pm-provider-${id}`)?.value?.trim() || '',
            account_name:     document.getElementById(`pm-name-${id}`)?.value?.trim()     || '',
            account_number:   document.getElementById(`pm-num-${id}`)?.value?.trim()      || '',
            is_active:        document.getElementById(`pm-status-${id}`)?.value === 'true',
            is_recommended:   document.getElementById(`pm-rec-${id}`)?.value   === 'true',
            updated_at:       new Date().toISOString()
        };
        // Optional limit columns (exist after migration)
        const minEl = document.getElementById(`pm-min-${id}`);
        const maxEl = document.getElementById(`pm-max-${id}`);
        if (minEl?.value) updates.min_amount = parseFloat(minEl.value);
        if (maxEl?.value) updates.max_amount = parseFloat(maxEl.value);

        const { error } = await db.from('payment_methods').update(updates).eq('id', id);
        if (error) throw error;
        showToast(`${updates.provider_name} သိမ်းပြီ! ✅`, 'success');
        loadSettings();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

async function deletePM(id, name) {
    if (!confirm(`"${name}" ကို ဖျက်မှာ သေချာပါသလား?`)) return;
    try {
        const { error } = await db.from('payment_methods').delete().eq('id', id);
        if (error) throw error;
        showToast(`${name} ဖျက်ပြီ!`, 'success');
        loadSettings();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

function showAddGateway() {
    const existing = document.getElementById('add-gateway-form');
    if (existing) { existing.remove(); return; }

    const form = document.createElement('div');
    form.id = 'add-gateway-form';
    form.className = 'card space-y-3 mt-2';
    form.style.cssText = 'border:1px solid var(--border-c);box-shadow:var(--glow-border-c)';
    form.innerHTML = `
        <p class="section-title text-cyan-400">🆕 Gateway အသစ် ထည့်မည်</p>
        <div class="grid grid-cols-2 gap-2">
            <div class="col-span-2">
                <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Provider အမည် (KBZ Pay / Wave / AYA Bank)</label>
                <input type="text" id="new-pm-provider" placeholder="KBZ Pay"
                    class="text-[11px] w-full p-1.5 rounded-lg px-2">
            </div>
            <div>
                <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">အကောင့်အမည်</label>
                <input type="text" id="new-pm-name" placeholder="ဦးအောင်မြင့်"
                    class="text-[11px] w-full p-1.5 rounded-lg px-2">
            </div>
            <div>
                <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">ဖုန်းနံပါတ် / အကောင့်</label>
                <input type="text" id="new-pm-number" placeholder="09xxxxxxxxx"
                    class="text-[11px] w-full p-1.5 rounded-lg px-2">
            </div>
            <div>
                <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Recommended</label>
                <select id="new-pm-rec" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                    <option value="false">ပုံမှန်</option>
                    <option value="true">⭐ ပင်မ</option>
                </select>
            </div>
            <div>
                <label class="text-[9px] block mb-0.5" style="color:var(--text-dim)">Status</label>
                <select id="new-pm-status" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                    <option value="true">✅ Active</option>
                    <option value="false">🔴 Inactive</option>
                </select>
            </div>
        </div>
        <div class="flex gap-2">
            <button onclick="createGateway()" class="compact-btn btn-primary flex-1 py-2">
                <i class="fa-solid fa-plus mr-1"></i> ထည့်မည်
            </button>
            <button onclick="document.getElementById('add-gateway-form').remove()"
                class="compact-btn btn-ghost px-4 py-2">
                မလုပ်တော့
            </button>
        </div>`;

    const wrapper = document.getElementById('payment-list');
    wrapper.appendChild(form);
    document.getElementById('new-pm-provider')?.focus();
}

async function createGateway() {
    const provider = document.getElementById('new-pm-provider')?.value?.trim();
    const name     = document.getElementById('new-pm-name')?.value?.trim();
    const number   = document.getElementById('new-pm-number')?.value?.trim();
    const rec      = document.getElementById('new-pm-rec')?.value === 'true';
    const active   = document.getElementById('new-pm-status')?.value === 'true';

    if (!provider || !name || !number) {
        showToast('Provider, အမည် နှင့် နံပါတ် ဖြည့်ပါ', 'error'); return;
    }
    try {
        const { error } = await db.from('payment_methods').insert({
            provider_name:  provider,
            account_name:   name,
            account_number: number,
            is_recommended: rec,
            is_active:      active,
            created_at:     new Date().toISOString(),
            updated_at:     new Date().toISOString()
        });
        if (error) throw error;
        showToast(`${provider} ထည့်ပြီ! ✅`, 'success');
        loadSettings();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

async function createBonusCode() {
    const code    = document.getElementById('bc-code')?.value?.trim().toUpperCase();
    const amount  = parseFloat(document.getElementById('bc-amount')?.value || 0);
    const maxUses = parseInt(document.getElementById('bc-maxuses')?.value || 0);
    const turnover= parseFloat(document.getElementById('bc-turnover')?.value || 10);
    const minDep  = parseFloat(document.getElementById('bc-mindeposit')?.value || 0);
    const expires = document.getElementById('bc-expires')?.value;
    const desc    = document.getElementById('bc-desc')?.value?.trim();

    if (!code || !amount || !maxUses) {
        showToast('Code, ငွေပမာဏ နှင့် အများဆုံးသုံးနိုင်သောကြိမ် ထည့်ပါ', 'error'); return;
    }
    try {
        const { error } = await db.from('bonus_codes').insert({
            code, amount, max_uses: maxUses, current_uses: 0,
            turnover_multiplier: turnover, min_deposit: minDep,
            expires_at: expires ? new Date(expires).toISOString() : null,
            description: desc || null, is_active: true,
            created_at: new Date().toISOString()
        });
        if (error) throw error;
        showToast(`Code "${code}" ဖန်တီးပြီ!`, 'success');
        ['bc-code','bc-amount','bc-maxuses','bc-expires','bc-desc'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        loadSettings();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

async function toggleBonusCode(id, isActive) {
    try {
        const { error } = await db.from('bonus_codes').update({ is_active: !isActive }).eq('id', id);
        if (error) throw error;
        showToast(`Code ${isActive ? 'ပိတ်' : 'ဖွင့်'}ပြီ!`, 'success');
        loadSettings();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

async function deleteBonusCode(id) {
    if (!confirm('Code ကို ဖျက်မှာ သေချာပါသလား?')) return;
    try {
        const { error } = await db.from('bonus_codes').delete().eq('id', id);
        if (error) throw error;
        showToast('Code ဖျက်ပြီ!', 'success');
        loadSettings();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}
