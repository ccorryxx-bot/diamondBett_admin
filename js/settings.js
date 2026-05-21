async function loadSettings() {
    try {
        const [{ data: sets }, { data: methods }, { data: bonusCodes }, { data: claims }] = await Promise.all([
            db.from('site_settings').select('*').eq('id',1).single(),
            db.from('payment_methods').select('*').order('display_order'),
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
        if (!methods?.length) { wrapper.innerHTML = `<p class="text-[11px] text-amber-500 p-2">Gateway မတွေ့ပါ</p>`; }
        else methods.forEach(m => {
            const id = m.id.toString();
            wrapper.innerHTML += `
            <div class="card space-y-2" style="will-change:transform;contain:content;">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold uppercase" style="color:var(--purple-bright)">${m.provider_name || 'Gateway'}</span>
                    <div class="flex gap-1.5 items-center">
                        <select id="pm-status-${id}" class="text-[10px] px-2 py-1 rounded-lg">
                            <option value="true"  ${m.is_active !== false ? 'selected':''}>Active</option>
                            <option value="false" ${m.is_active === false  ? 'selected':''}>Inactive</option>
                        </select>
                        <button onclick="updatePM('${id}')" class="compact-btn btn-success px-3 py-1 text-[10px]">သိမ်း</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[9px] block mb-0.5" style="color:var(--text-secondary)">အကောင့်အမည်</label>
                        <input type="text" value="${m.account_name||''}" id="pm-name-${id}" class="text-[11px] w-full p-1.5 rounded-lg px-2" placeholder="အမည်">
                    </div>
                    <div>
                        <label class="text-[9px] block mb-0.5" style="color:var(--text-secondary)">အကောင့်နံပါတ်</label>
                        <input type="text" value="${m.account_number||''}" id="pm-num-${id}" class="text-[11px] w-full p-1.5 rounded-lg px-2" placeholder="ဖုန်းနံပါတ်">
                    </div>
                    <div>
                        <label class="text-[9px] block mb-0.5" style="color:var(--text-secondary)">အနည်းဆုံး (K)</label>
                        <input type="number" value="${m.min_amount||5000}" id="pm-min-${id}" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                    </div>
                    <div>
                        <label class="text-[9px] block mb-0.5" style="color:var(--text-secondary)">အများဆုံး (K)</label>
                        <input type="number" value="${m.max_amount||5000000}" id="pm-max-${id}" class="text-[11px] w-full p-1.5 rounded-lg px-2">
                    </div>
                </div>
            </div>`;
        });

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
        const updates = {
            account_name:   document.getElementById(`pm-name-${id}`)?.value,
            account_number: document.getElementById(`pm-num-${id}`)?.value,
            is_active:      document.getElementById(`pm-status-${id}`)?.value === 'true',
            min_amount:     parseFloat(document.getElementById(`pm-min-${id}`)?.value || 5000),
            max_amount:     parseFloat(document.getElementById(`pm-max-${id}`)?.value || 5000000),
            updated_at:     new Date().toISOString()
        };
        const { error } = await db.from('payment_methods').update(updates).eq('id', id);
        if (error) throw error;
        showToast('Payment method သိမ်းပြီ!', 'success');
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
