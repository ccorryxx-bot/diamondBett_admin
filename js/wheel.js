async function loadWheel() {
    const el = document.getElementById('wheel-slots-list');
    if (!el) return;
    el.innerHTML = `<div class="text-center py-4 text-[11px] animate-pulse" style="color:var(--text-dim)">တင်နေသည်...</div>`;
    try {
        const [{ data: slots, error: e1 }, { data: history, error: e2 }] = await Promise.all([
            db.from('wheel_config').select('*').order('slot_index', { ascending: true }),
            db.from('lucky_wheel_history')
                .select('id,user_id,prize_amount,spun_at,users(fullname,phone)')
                .order('spun_at', { ascending: false }).limit(20)
        ]);
        if (e1) throw e1;
        renderWheelSlots(slots || []);
        renderWheelHistory(history || []);
        renderWheelStats(slots || [], history || []);
    } catch(e) { el.innerHTML = `<p class="text-rose-400 text-[11px] p-2">${e.message}</p>`; }
}

function renderWheelStats(slots, history) {
    const totalSpins  = history.length;
    const totalPrize  = history.reduce((s,h) => s + parseFloat(h.prize_amount||0), 0);
    const winSpins    = history.filter(h => h.prize_amount > 0).length;
    const winRate     = totalSpins > 0 ? Math.round((winSpins/totalSpins)*100) : 0;
    const el = document.getElementById('wheel-stats');
    if (!el) return;
    el.innerHTML = `
        <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-lg p-2" style="background:var(--bg-card-2);border:1px solid var(--border-p)">
                <p class="text-[18px] font-bold" style="color:var(--cyan)">${totalSpins}</p>
                <p class="text-[9px]" style="color:var(--text-dim)">စုစုပေါင်း Spin</p>
            </div>
            <div class="rounded-lg p-2" style="background:var(--bg-card-2);border:1px solid var(--border-p)">
                <p class="text-[18px] font-bold" style="color:var(--purple-bright)">${winRate}%</p>
                <p class="text-[9px]" style="color:var(--text-dim)">Win Rate</p>
            </div>
            <div class="rounded-lg p-2" style="background:var(--bg-card-2);border:1px solid var(--border-p)">
                <p class="text-[18px] font-bold text-amber-500">${(totalPrize/1000).toFixed(0)}K</p>
                <p class="text-[9px]" style="color:var(--text-dim)">ထုတ်ပေးပြီး</p>
            </div>
        </div>`;
}

function renderWheelSlots(slots) {
    const el = document.getElementById('wheel-slots-list');
    if (!el) return;
    if (!slots.length) {
        el.innerHTML = `<p class="text-[11px] text-center py-2" style="color:var(--text-dim)">Slot မရှိသေးပါ</p>`;
        return;
    }
    const totalWeight = slots.reduce((s,w) => s + (w.weight||0), 0);
    el.innerHTML = `
        <div class="space-y-2">
            ${slots.map(s => {
                const prob = totalWeight > 0 ? ((s.weight/totalWeight)*100).toFixed(1) : 0;
                const isWin = s.prize_amount > 0;
                return `
                <div class="rounded-lg p-3 flex items-center gap-3"
                     style="background:var(--bg-card-2);border:1px solid var(--border-p)">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0"
                         style="background:${isWin ? 'var(--purple-dim)' : 'rgba(255,77,141,0.1)'};
                                color:${isWin ? 'var(--purple-bright)' : '#ff4d8d'};
                                border:1px solid ${isWin ? 'var(--border-p)' : 'rgba(255,77,141,0.4)'}">
                        ${s.slot_index}
                    </div>
                    <div class="flex-1 grid grid-cols-3 gap-2">
                        <div>
                            <p class="text-[8px]" style="color:var(--text-dim)">ဆုငွေ (K)</p>
                            <input type="number" value="${s.prize_amount||0}" id="ws-prize-${s.slot_index}"
                                class="text-[11px] w-full p-1 rounded px-1.5 font-bold"
                                style="color:${isWin ? '#ffd700' : 'var(--text-dim)'}">
                        </div>
                        <div>
                            <p class="text-[8px]" style="color:var(--text-dim)">Turnover ×</p>
                            <input type="number" value="${s.turnover_multiplier||0}" id="ws-to-${s.slot_index}"
                                class="text-[11px] w-full p-1 rounded px-1.5">
                        </div>
                        <div>
                            <p class="text-[8px]" style="color:var(--text-dim)">Weight (${prob}%)</p>
                            <input type="number" value="${s.weight||0}" id="ws-wt-${s.slot_index}"
                                class="text-[11px] w-full p-1 rounded px-1.5">
                        </div>
                    </div>
                    <button onclick="saveWheelSlot(${s.slot_index})"
                        class="compact-btn btn-success px-2 py-1.5 text-[10px] flex-shrink-0">
                        <i class="fa-solid fa-floppy-disk"></i>
                    </button>
                </div>`;
            }).join('')}
        </div>
        <p class="text-[9px] mt-2" style="color:var(--text-dim)">
            * Weight = ထွက်နိုင်ခြေ အချိုး — Weight ကြီးလေ ထွက်ငွေ များလေ
        </p>`;
}

async function saveWheelSlot(slotIndex) {
    const prize = parseFloat(document.getElementById(`ws-prize-${slotIndex}`)?.value || 0);
    const to    = parseFloat(document.getElementById(`ws-to-${slotIndex}`)?.value || 0);
    const wt    = parseInt(document.getElementById(`ws-wt-${slotIndex}`)?.value || 0);
    try {
        const { error } = await db.from('wheel_config')
            .update({ prize_amount: prize, turnover_multiplier: to, weight: wt })
            .eq('slot_index', slotIndex);
        if (error) throw error;
        showToast(`Slot ${slotIndex} သိမ်းပြီ ✅`, 'success');
        loadWheel();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

function renderWheelHistory(history) {
    const el = document.getElementById('wheel-history-list');
    if (!el) return;
    if (!history.length) {
        el.innerHTML = `<p class="text-[11px] text-center py-2" style="color:var(--text-dim)">မှတ်တမ်း မရှိသေးပါ</p>`;
        return;
    }
    el.innerHTML = history.map(h => {
        const u    = h.users || {};
        const name = u.fullname || u.phone || h.user_id?.slice(0,8) || '?';
        const dt   = new Date(h.spun_at).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' });
        const isWin = h.prize_amount > 0;
        return `
        <div class="flex items-center justify-between py-2" style="border-bottom:1px solid rgba(157,78,221,0.1)">
            <div>
                <p class="text-[11px] font-semibold" style="color:var(--text-primary)">${name}</p>
                <p class="text-[9px]" style="color:var(--text-dim)">${dt}</p>
            </div>
            <div class="text-right">
                <p class="text-[13px] font-bold ${isWin ? 'text-amber-400' : ''}"
                   style="${!isWin ? 'color:var(--text-dim)' : ''}">
                    ${isWin ? h.prize_amount.toLocaleString()+' K' : 'ပေါ်မသွား'}
                </p>
                <p class="text-[8px]" style="color:var(--text-dim)">
                    ${h.required_turnover > 0 ? 'TO: '+h.required_turnover.toLocaleString()+'K' : ''}
                </p>
            </div>
        </div>`;
    }).join('');
}
