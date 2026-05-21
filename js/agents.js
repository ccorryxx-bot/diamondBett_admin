async function loadAgents() {
    const container = document.getElementById('tab-agents');
    if (!container) return;

    // Load commission rate real-time + agents + history in parallel
    try {
        const [{ data: sets }, { data: allUsers }, { data: commHistory }] = await Promise.all([
            db.from('site_settings').select('commission_rate,commission_enabled').eq('id',1).single(),
            db.from('users').select('id,fullname,phone,ref_code,balance,role,created_at').order('created_at',{ascending:false}),
            db.from('commissions').select('id,agent_id,user_id,amount,percentage,level,type,created_at')
                .order('created_at',{ascending:false}).limit(50)
        ]);

        const rate    = parseFloat(sets?.commission_rate ?? 5);
        const enabled = sets?.commission_enabled ?? true;

        // Update live rate badge
        const rateEl = document.getElementById('agent-rate-live');
        if (rateEl) {
            rateEl.textContent = rate + '%';
            rateEl.className = `text-[22px] font-bold ${enabled ? 'text-indigo-600' : 'text-slate-400'}`;
        }
        const rateInput = document.getElementById('agent-rate-input');
        if (rateInput) rateInput.value = rate;
        const toggleEl = document.getElementById('agent-comm-toggle');
        if (toggleEl) toggleEl.value = enabled.toString();

        // Build agent map: users who are referrers
        const referrerIds = new Set(allUsers?.map(u => u.referrer_id).filter(Boolean) || []);
        const agents = allUsers?.filter(u => referrerIds.has(u.id) || u.role === 'agent') || [];

        // Commission totals per agent
        const commTotals = {};
        commHistory?.forEach(c => {
            if (!commTotals[c.agent_id]) commTotals[c.agent_id] = 0;
            commTotals[c.agent_id] += parseFloat(c.amount || 0);
        });

        // Subordinate count per agent
        const subCounts = {};
        allUsers?.forEach(u => {
            if (u.referrer_id) subCounts[u.referrer_id] = (subCounts[u.referrer_id] || 0) + 1;
        });

        // Render agent cards
        const agentList = document.getElementById('agent-list');
        if (agentList) {
            if (!agents.length) {
                agentList.innerHTML = `<p class="text-[11px] text-slate-400 text-center py-4">Agent မရှိသေးပါ</p>`;
            } else {
                agentList.innerHTML = agents.map(a => {
                    const name     = a.fullname || a.phone || 'Unknown';
                    const subs     = subCounts[a.id] || 0;
                    const earned   = commTotals[a.id] || 0;
                    const bal      = parseFloat(a.balance || 0);
                    return `<div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                        <div class="flex items-start justify-between mb-2">
                            <div>
                                <p class="font-bold text-slate-800 text-[13px]">${name}</p>
                                <p class="text-[9px] text-indigo-500 font-mono mt-0.5">${a.ref_code || a.phone || '-'}</p>
                            </div>
                            <span class="badge badge-agent">Agent</span>
                        </div>
                        <div class="grid grid-cols-3 gap-1.5 text-center">
                            <div class="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <p class="text-[8px] text-slate-400 mb-0.5">လက်အောက်သား</p>
                                <p class="text-[13px] font-bold text-sky-600">${subs}</p>
                            </div>
                            <div class="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                                <p class="text-[8px] text-emerald-600 mb-0.5">Commission</p>
                                <p class="text-[12px] font-bold text-emerald-700">${earned.toLocaleString()} K</p>
                            </div>
                            <div class="bg-indigo-50 rounded-lg p-2 border border-indigo-100">
                                <p class="text-[8px] text-indigo-500 mb-0.5">ကျန်ငွေ</p>
                                <p class="text-[12px] font-bold text-indigo-700">${bal.toLocaleString()} K</p>
                            </div>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        // Render commission history
        const histEl = document.getElementById('agent-comm-history');
        if (histEl) {
            if (!commHistory?.length) {
                histEl.innerHTML = `<p class="text-[11px] text-slate-400 text-center py-3">Commission မှတ်တမ်း မရှိသေးပါ</p>`;
            } else {
                const agentMap = {};
                allUsers?.forEach(u => { agentMap[u.id] = u.fullname || u.phone; });
                histEl.innerHTML = commHistory.map(c => {
                    const agentName = agentMap[c.agent_id] || c.agent_id?.substring(0,8) || '-';
                    const dt = new Date(c.created_at).toLocaleString('en-GB', {dateStyle:'short',timeStyle:'short'});
                    return `<div class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div>
                            <p class="text-[11px] font-semibold text-slate-800">${agentName}</p>
                            <p class="text-[9px] text-slate-400">${c.type || 'deposit'} · Lv${c.level||1} · ${dt}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[12px] font-bold text-emerald-600">+${parseFloat(c.amount||0).toLocaleString()} K</p>
                            <p class="text-[9px] text-slate-400">${parseFloat(c.percentage||0)}%</p>
                        </div>
                    </div>`;
                }).join('');
            }
        }

    } catch(e) {
        console.error('loadAgents:', e);
    }
}

async function saveCommissionRate() {
    const rate    = parseFloat(document.getElementById('agent-rate-input')?.value || 5);
    const enabled = document.getElementById('agent-comm-toggle')?.value === 'true';
    if (isNaN(rate) || rate < 0 || rate > 100) {
        showToast('Commission % ကို 0-100 ကြားထည့်ပါ', 'error'); return;
    }
    try {
        const { error } = await db.from('site_settings')
            .update({ commission_rate: rate, commission_enabled: enabled }).eq('id', 1);
        if (error) throw error;
        showToast(`Commission Rate: ${rate}% ${enabled ? 'ဖွင့်' : 'ပိတ်'}ပြီ!`, 'success');
        loadAgents();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}
