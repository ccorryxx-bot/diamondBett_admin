async function loadSettings() {
    try {
        const { data: sets, error: sErr } = await db.from('site_settings').select('*').eq('id',1).single();
        if (sErr) throw sErr;

        document.getElementById('set-welcome-toggle').value = sets.welcome_bonus_enabled.toString();
        document.getElementById('set-welcome-amt').value   = sets.welcome_bonus_amount;
        document.getElementById('set-bonus-rate').value    = sets.deposit_bonus_rate;
        document.getElementById('set-turnover-x').value    = sets.turnover_multiplier;
        document.getElementById('set-min-wd').value        = sets.min_withdrawal;
        document.getElementById('set-max-wd').value        = sets.max_withdrawal;

        const { data: methods, error: pmErr } = await db.from('payment_methods').select('*');
        if (pmErr) throw pmErr;

        const wrapper = document.getElementById('payment-list');
        document.getElementById('pm-loading-text')?.remove();
        wrapper.innerHTML = '';

        if (!methods || !methods.length) {
            wrapper.innerHTML = `<p class="text-[11px] text-amber-500 p-2">Gateway မတွေ့ပါ</p>`;
            return;
        }

        methods.forEach(m => {
            const id = m.id.toString();
            wrapper.innerHTML += `
            <div class="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold text-indigo-600 uppercase">${m.provider_name || 'Gateway'}</span>
                    <div class="flex gap-1.5 items-center">
                        <select id="pm-status-${id}" class="text-[10px] px-2 py-1 rounded-lg outline-none border border-slate-200">
                            <option value="true" ${m.is_active !== false ? 'selected' : ''}>Active</option>
                            <option value="false" ${m.is_active === false ? 'selected' : ''}>Inactive</option>
                        </select>
                        <button onclick="updatePM('${id}')" class="compact-btn btn-success px-3 py-1 text-[10px]">သိမ်း</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[9px] text-slate-500 block mb-0.5">အကောင့်အမည်</label>
                        <input type="text" value="${m.account_name || ''}" id="pm-name-${id}"
                            class="text-[11px] w-full p-1.5 rounded-lg px-2 outline-none" placeholder="အမည်">
                    </div>
                    <div>
                        <label class="text-[9px] text-slate-500 block mb-0.5">အကောင့်နံပါတ်</label>
                        <input type="text" value="${m.account_number || ''}" id="pm-num-${id}"
                            class="text-[11px] w-full p-1.5 rounded-lg px-2 outline-none" placeholder="ဖုန်းနံပါတ်">
                    </div>
                </div>
            </div>`;
        });
    } catch(e) {
        document.getElementById('payment-list').innerHTML =
            `<p class="text-[11px] text-rose-500">Gateway ဒေတာ တင်မရပါ</p>`;
    }
}

async function saveSiteSettings() {
    try {
        const payload = {
            welcome_bonus_enabled: document.getElementById('set-welcome-toggle').value === 'true',
            welcome_bonus_amount:  parseFloat(document.getElementById('set-welcome-amt').value || 0),
            deposit_bonus_rate:    parseFloat(document.getElementById('set-bonus-rate').value || 0),
            turnover_multiplier:   parseFloat(document.getElementById('set-turnover-x').value || 0),
            min_withdrawal:        parseFloat(document.getElementById('set-min-wd').value || 0),
            max_withdrawal:        parseFloat(document.getElementById('set-max-wd').value || 0)
        };
        const { error } = await db.from('site_settings').update(payload).eq('id',1);
        if (error) throw error;
        showToast('ဆက်တင် သိမ်းပြီ!', 'success');
    } catch(e) { showToast('မအောင်မြင်ပါ', 'error'); }
}

async function updatePM(id) {
    const name  = document.getElementById(`pm-name-${id}`)?.value.trim();
    const num   = document.getElementById(`pm-num-${id}`)?.value.trim();
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
