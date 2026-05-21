async function loadSettings() {
    try {
        const { data: sets } = await db.from('site_settings').select('*').eq('id',1).single();
        document.getElementById('set-welcome-toggle').value = sets.welcome_bonus_enabled.toString();
        document.getElementById('set-welcome-amt').value   = sets.welcome_bonus_amount;
        document.getElementById('set-bonus-rate').value    = sets.deposit_bonus_rate;
        document.getElementById('set-turnover-x').value    = sets.turnover_multiplier;
        document.getElementById('set-min-wd').value        = sets.min_withdrawal;
        document.getElementById('set-max-wd').value        = sets.max_withdrawal;

        const { data: methods } = await db.from('payment_methods').select('*');
        const wrapper = document.getElementById('payment-list');
        document.getElementById('pm-loading-text')?.remove();
        wrapper.innerHTML = '';
        if (!methods?.length) { wrapper.innerHTML = `<p class="text-[11px] text-amber-500 p-2">Gateway မတွေ့ပါ</p>`; }
        else methods.forEach(m => {
            const id = m.id.toString();
            wrapper.innerHTML += `
            <div class="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold text-indigo-600 uppercase">${m.provider_name || 'Gateway'}</span>
                    <div class="flex gap-1.5 items-center">
                        <select id="pm-status-${id}" class="text-[10px] px-2 py-1 rounded-lg border border-slate-200">
                            <option value="true" ${m.is_active !== false ? 'selected':''}>Active</option>
                            <option value="false" ${m.is_active===false ? 'selected':''}>Inactive</option>
                        </select>
                        <button onclick="updatePM('${id}')" class="compact-btn btn-success px-3 py-1 text-[10px]">သိမ်း</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="text-[9px] text-slate-500 block mb-0.5">အကောင့်အမည်</label>
                        <input type="text" value="${m.account_name||''}" id="pm-name-${id}" class="text-[11px] w-full p-1.5 rounded-lg px-2" placeholder="အမည်"></div>
                    <div><label class="text-[9px] text-slate-500 block mb-0.5">အကောင့်နံပါတ်</label>
                        <input type="text" value="${m.account_number||''}" id="pm-num-${id}" class="text-[11px] w-full p-1.5 rounded-lg px-2" placeholder="ဖုန်းနံပါတ်"></div>
                </div>
            </div>`;
        });
    } catch(e) {
        document.getElementById('payment-list').innerHTML = `<p class="text-[11px] text-rose-500">Gateway ဒေတာ တင်မရပါ</p>`;
    }
    loadBonusCodes();
    loadBonusClaims();
}

async function saveSiteSettings() {
    try {
        const payload = {
            welcome_bonus_enabled: document.getElementById('set-welcome-toggle').value === 'true',
            welcome_bonus_amount:  parseFloat(document.getElementById('set-welcome-amt').value||0),
            deposit_bonus_rate:    parseFloat(document.getElementById('set-bonus-rate').value||0),
            turnover_multiplier:   parseFloat(document.getElementById('set-turnover-x').value||0),
            min_withdrawal:        parseFloat(document.getElementById('set-min-wd').value||0),
            max_withdrawal:        parseFloat(document.getElementById('set-max-wd').value||0)
        };
        const { error } = await db.from('site_settings').update(payload).eq('id',1);
        if (error) throw error;
        showToast('ဆက်တင် သိမ်းပြီ!', 'success');
    } catch(e) { showToast('မအောင်မြင်ပါ', 'error'); }
}

async function updatePM(id) {
    const name     = document.getElementById(`pm-name-${id}`)?.value.trim();
    const num      = document.getElementById(`pm-num-${id}`)?.value.trim();
    const isActive = document.getElementById(`pm-status-${id}`)?.value === 'true';
    if (!name || !num) { showToast('အချက်အလက် ပြည့်စုံအောင် ဖြည့်ပါ', 'error'); return; }
    try {
        const { error } = await db.from('payment_methods')
            .update({ account_name: name, account_number: num, is_active: isActive })
            .eq('id', parseInt(id));
        if (error) throw error;
        showToast('Gateway ပြင်ဆင်ပြီ!', 'success');
        loadSettings();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

// ===== BONUS CODES =====
async function loadBonusCodes() {
    const el = document.getElementById('bonus-codes-list');
    if (!el) return;
    try {
        const { data: codes } = await db.from('bonus_codes')
            .select('id,code,amount,turnover_multiplier,is_active,used_count,max_uses,min_deposit,expires_at,description')
            .order('created_at', { ascending: false });

        if (!codes?.length) {
            el.innerHTML = `<p class="text-[11px] text-slate-400 text-center py-2">Code မရှိသေးပါ</p>`;
            return;
        }
        el.innerHTML = codes.map(c => {
            const used    = c.used_count || 0;
            const max     = c.max_uses || '∞';
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            const active  = c.is_active && !expired;
            return `<div class="bg-white border ${active ? 'border-purple-200' : 'border-slate-200'} rounded-lg p-3">
                <div class="flex items-start justify-between mb-2">
                    <div>
                        <span class="font-bold font-mono text-[13px] ${active ? 'text-purple-700' : 'text-slate-400'}">${c.code}</span>
                        ${expired ? '<span class="badge badge-rejected ml-1 text-[8px]">သက်တမ်းကုန်</span>' : ''}
                        ${!c.is_active ? '<span class="badge badge-banned ml-1 text-[8px]">ပိတ်</span>' : ''}
                    </div>
                    <div class="flex gap-1">
                        <button onclick="toggleBonusCode('${c.id}',${c.is_active})"
                            class="compact-btn ${c.is_active ? 'btn-danger' : 'btn-success'} px-2 py-1 text-[9px]">
                            ${c.is_active ? 'ပိတ်' : 'ဖွင့်'}
                        </button>
                        <button onclick="deleteBonusCode('${c.id}')"
                            class="compact-btn btn-ghost px-2 py-1 text-[9px] text-rose-500">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-1 text-center">
                    <div class="bg-slate-50 rounded p-1">
                        <p class="text-[8px] text-slate-400">ဘောနပ်ငွေ</p>
                        <p class="text-[11px] font-bold text-emerald-600">${parseFloat(c.amount||0).toLocaleString()} K</p>
                    </div>
                    <div class="bg-slate-50 rounded p-1">
                        <p class="text-[8px] text-slate-400">Turnover</p>
                        <p class="text-[11px] font-bold text-amber-600">×${c.turnover_multiplier||10}</p>
                    </div>
                    <div class="bg-slate-50 rounded p-1">
                        <p class="text-[8px] text-slate-400">သုံးမှု</p>
                        <p class="text-[11px] font-bold text-indigo-600">${used}/${max}</p>
                    </div>
                </div>
                ${c.description ? `<p class="text-[9px] text-slate-400 mt-1">${c.description}</p>` : ''}
                ${c.expires_at ? `<p class="text-[8px] text-slate-400 mt-0.5">သက်တမ်း: ${new Date(c.expires_at).toLocaleDateString('en-GB')}</p>` : ''}
            </div>`;
        }).join('');
    } catch(e) {
        if (el) el.innerHTML = `<p class="text-[11px] text-rose-400 text-center py-2">Codes တင်မရပါ</p>`;
    }
}

async function createBonusCode() {
    const code    = document.getElementById('bc-code')?.value.trim().toUpperCase();
    const amount  = parseFloat(document.getElementById('bc-amount')?.value || 0);
    const turnover= parseFloat(document.getElementById('bc-turnover')?.value || 10);
    const maxUses = parseInt(document.getElementById('bc-maxuses')?.value || 0) || null;
    const minDep  = parseFloat(document.getElementById('bc-mindeposit')?.value || 0);
    const expires = document.getElementById('bc-expires')?.value || null;
    const desc    = document.getElementById('bc-desc')?.value.trim() || null;

    if (!code || !amount) { showToast('Code နာမည်နှင့် ဘောနပ်ငွေ ဖြည့်ပါ', 'error'); return; }

    try {
        const { error } = await db.from('bonus_codes').insert({
            code, amount, turnover_multiplier: turnover,
            max_uses: maxUses, min_deposit: minDep,
            expires_at: expires, description: desc, is_active: true, used_count: 0
        });
        if (error) throw error;
        showToast(`"${code}" Code ဖန်တီးပြီ!`, 'success');
        ['bc-code','bc-amount','bc-desc','bc-expires'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        document.getElementById('bc-turnover').value = 10;
        document.getElementById('bc-mindeposit').value = 0;
        loadBonusCodes();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + (e.message.includes('duplicate') ? 'Code ထပ်နေသည်' : e.message), 'error'); }
}

async function toggleBonusCode(id, isActive) {
    try {
        const { error } = await db.from('bonus_codes').update({ is_active: !isActive }).eq('id', id);
        if (error) throw error;
        showToast(isActive ? 'Code ပိတ်ပြီ!' : 'Code ဖွင့်ပြီ!', 'success');
        loadBonusCodes();
    } catch(e) { showToast('မအောင်မြင်ပါ', 'error'); }
}

async function deleteBonusCode(id) {
    if (!confirm('ဤ Bonus Code ကို ဖျက်မည်လား?')) return;
    try {
        const { error } = await db.from('bonus_codes').delete().eq('id', id);
        if (error) throw error;
        showToast('Code ဖျက်ပြီ!', 'success');
        loadBonusCodes();
    } catch(e) { showToast('မအောင်မြင်ပါ', 'error'); }
}

// ===== BONUS CLAIMS =====
async function loadBonusClaims() {
    const el = document.getElementById('bonus-claims-list');
    if (!el) return;
    try {
        const { data: claims } = await db.from('user_bonus_claims')
            .select('id, claimed_at, amount, code_id, user_id, users(fullname,phone), bonus_codes(code,amount)')
            .order('claimed_at', { ascending: false }).limit(30);

        if (!claims?.length) {
            el.innerHTML = `<p class="text-[11px] text-slate-400 text-center py-2">Claim မှတ်တမ်း မရှိသေးပါ</p>`;
            return;
        }
        el.innerHTML = claims.map(c => {
            const name = c.users?.fullname || c.users?.phone || 'Unknown';
            const code = c.bonus_codes?.code || c.code_id || '-';
            const amt  = parseFloat(c.amount || c.bonus_codes?.amount || 0);
            const dt   = c.claimed_at ? new Date(c.claimed_at).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' }) : '-';
            return `<div class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                    <p class="text-[11px] font-semibold text-slate-800">${name}</p>
                    <p class="text-[9px] text-purple-500 font-mono font-bold">${code} · ${dt}</p>
                </div>
                <span class="text-[12px] font-bold text-emerald-600">+${amt.toLocaleString()} K</span>
            </div>`;
        }).join('');
    } catch(e) {
        if (el) el.innerHTML = `<p class="text-[11px] text-rose-400 text-center py-2">မှတ်တမ်း တင်မရပါ</p>`;
    }
}

// ===== PLAYER-SIDE BONUS CLAIM (called from player app via admin) =====
async function claimBonusCodeForUser(uid, code) {
    try {
        const { data: bc, error: bcErr } = await db.from('bonus_codes')
            .select('*').eq('code', code.toUpperCase()).eq('is_active', true).single();
        if (bcErr || !bc) throw new Error('Code မမှန်ကန်ပါ သို့မဟုတ် ပိတ်ထားပြီ');

        const now = new Date();
        if (bc.expires_at && new Date(bc.expires_at) < now) throw new Error('Code သက်တမ်းကုန်ပြီ');
        if (bc.max_uses && (bc.used_count || 0) >= bc.max_uses) throw new Error('Code အသုံးပြုမှု ကုန်ဆုံးပြီ');

        const { data: existing } = await db.from('user_bonus_claims')
            .select('id').eq('user_id', uid).eq('code_id', bc.id).limit(1);
        if (existing?.length) throw new Error('ဤ Code ကို တစ်ကြိမ်ပြီး Claim လုပ်ထားပြီ');

        const { data: profile } = await db.from('users').select('balance,remaining_turnover').eq('id',uid).single();
        const bonus   = parseFloat(bc.amount || 0);
        const turnoverX = parseFloat(bc.turnover_multiplier || 10);
        const newBal  = parseFloat(profile.balance || 0) + bonus;
        const newTO   = parseFloat(profile.remaining_turnover || 0) + (bonus * turnoverX);

        await Promise.all([
            db.from('users').update({ balance: newBal, remaining_turnover: newTO }).eq('id', uid),
            db.from('user_bonus_claims').insert({ user_id: uid, code_id: bc.id, amount: bonus, claimed_at: now.toISOString() }),
            db.from('bonus_codes').update({ used_count: (bc.used_count || 0) + 1 }).eq('id', bc.id)
        ]);

        return { success: true, bonus, message: `${bonus.toLocaleString()} K Claim ပြီ!` };
    } catch(e) {
        return { success: false, message: e.message };
    }
}
