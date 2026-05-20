async function loadSettings() {
    try {
        const { data: sets, error: sErr } = await db.from('site_settings').select('*').eq('id', 1).single();
        if (sErr) throw sErr;

        document.getElementById('set-welcome-toggle').value = sets.welcome_bonus_enabled.toString();
        document.getElementById('set-welcome-amt').value = sets.welcome_bonus_amount;
        document.getElementById('set-bonus-rate').value = sets.deposit_bonus_rate;
        document.getElementById('set-turnover-x').value = sets.turnover_multiplier;
        document.getElementById('set-min-wd').value = sets.min_withdrawal;
        document.getElementById('set-max-wd').value = sets.max_withdrawal;

        const { data: methods, error: pmErr } = await db.from('payment_methods').select('*');
        if (pmErr) throw pmErr;

        const wrapper = document.getElementById('payment-list');
        document.getElementById('pm-loading-text')?.remove();
        wrapper.innerHTML = '';

        if (!methods || methods.length === 0) {
            wrapper.innerHTML = `<p class="text-[11px] text-amber-500 p-1">No active gateways found.</p>`;
            return;
        }

        methods.forEach(m => {
            const id = m.id.toString();
            wrapper.innerHTML += `
            <div class="bg-black p-3 rounded border border-gray-900 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] text-indigo-400 font-bold uppercase tracking-wider">${m.provider_name || 'Gateway'}</span>
                    <div class="flex gap-1">
                        <select id="pm-status-${id}" class="text-[10px] px-1.5 py-1 rounded outline-none">
                            <option value="true" ${m.is_active !== false ? 'selected' : ''}>Active</option>
                            <option value="false" ${m.is_active === false ? 'selected' : ''}>Inactive</option>
                        </select>
                        <button onclick="updatePM('${id}')" class="compact-btn bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 px-3 py-1">Save</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[9px] text-gray-500 block mb-0.5">Account Name</label>
                        <input type="text" value="${m.account_name || ''}" id="pm-name-${id}"
                            class="text-[11px] w-full p-1 rounded px-2 outline-none" placeholder="အမည်">
                    </div>
                    <div>
                        <label class="text-[9px] text-gray-500 block mb-0.5">Account Number</label>
                        <input type="text" value="${m.account_number || ''}" id="pm-num-${id}"
                            class="text-[11px] w-full p-1 rounded px-2 outline-none" placeholder="ဖုန်းနံပါတ်">
                    </div>
                </div>
            </div>`;
        });

    } catch (e) {
        console.error('loadSettings error:', e);
        document.getElementById('payment-list').innerHTML =
            `<p class="text-[11px] text-rose-500">Failed to fetch payment providers.</p>`;
    }
}

async function saveSiteSettings() {
    try {
        const payload = {
            welcome_bonus_enabled: document.getElementById('set-welcome-toggle').value === 'true',
            welcome_bonus_amount: parseFloat(document.getElementById('set-welcome-amt').value || 0),
            deposit_bonus_rate: parseFloat(document.getElementById('set-bonus-rate').value || 0),
            turnover_multiplier: parseFloat(document.getElementById('set-turnover-x').value || 0),
            min_withdrawal: parseFloat(document.getElementById('set-min-wd').value || 0),
            max_withdrawal: parseFloat(document.getElementById('set-max-wd').value || 0)
        };
        const { error } = await db.from('site_settings').update(payload).eq('id', 1);
        if (error) throw error;
        showToast('Configuration saved!', 'success');
    } catch (e) {
        showToast('Failed to save config.', 'error');
    }
}

async function updatePM(id) {
    const nameInput = document.getElementById(`pm-name-${id}`);
    const numInput = document.getElementById(`pm-num-${id}`);
    const statusInput = document.getElementById(`pm-status-${id}`);

    if (!nameInput || !numInput) {
        showToast('DOM element error.', 'error');
        return;
    }

    const name = nameInput.value.trim();
    const num = numInput.value.trim();
    const isActive = statusInput ? statusInput.value === 'true' : true;

    if (!name || !num) {
        showToast('အချက်အလက်များ ပြည့်စုံအောင် ဖြည့်ပါ။', 'error');
        return;
    }

    try {
        const { error } = await db.from('payment_methods').update({
            account_name: name,
            account_number: num,
            is_active: isActive
        }).eq('id', parseInt(id));
        if (error) throw error;
        showToast('Gateway updated!', 'success');
        loadSettings();
    } catch (e) {
        showToast('Failed: ' + e.message, 'error');
    }
}
