async function loadAgents() {
    const container = document.getElementById('tab-agents');
    if (!container) return;

    try {
        const [{ data: sets }, { data: allUsers }, { data: commHistory }] = await Promise.all([
            db.from('site_settings').select('commission_rate,commission_enabled').eq('id',1).single(),
            db.from('users').select('id,fullname,phone,ref_code,balance,role,created_at,total_deposited').order('created_at',{ascending:false}),
            db.from('commissions').select('id,agent_id,user_id,amount,percentage,level,type,created_at')
                .order('created_at',{ascending:false}).limit(50)
        ]);

        const rate    = parseFloat(sets?.commission_rate ?? 5);
        const enabled = sets?.commission_enabled ?? true;

        const rateEl = document.getElementById('agent-rate-live');
        if (rateEl) {
            rateEl.textContent = rate + '%';
            rateEl.className   = `text-[22px] font-bold ${enabled ? 'text-indigo-600' : 'text-slate-400'}`;
        }
        const rateInput = document.getElementById('agent-rate-input');
        if (rateInput) rateInput.value = rate;
        const toggleEl = document.getElementById('agent-comm-toggle');
        if (toggleEl) toggleEl.value = enabled.toString();

        // ── BUG FIX: ref_code → UUID resolver ───────────────────────────────
        const refCodeToId = {};
        allUsers?.forEach(u => { if (u.ref_code) refCodeToId[u.ref_code] = u.id; });
        const resolveRef = (rid) => refCodeToId[rid] || rid;

        const referrerIds = new Set(
            allUsers?.map(u => u.referrer_id).filter(Boolean).map(resolveRef) || []
        );
        const agents = allUsers?.filter(u => referrerIds.has(u.id) || u.role === 'agent') || [];
        // ────────────────────────────────────────────────────────────────────

        // Commission totals per agent — split this month vs all-time
        const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0,0,0,0);
        const commTotals    = {};
        const commThisMonth = {};
        commHistory?.forEach(c => {
            commTotals[c.agent_id]    = (commTotals[c.agent_id]    || 0) + parseFloat(c.amount || 0);
            if (new Date(c.created_at) >= thisMonthStart)
                commThisMonth[c.agent_id] = (commThisMonth[c.agent_id] || 0) + parseFloat(c.amount || 0);
        });

        // Sub counts + this-month new referrals (resolved UUIDs)
        const subCounts  = {};
        const newThisMonth = {};
        allUsers?.forEach(u => {
            if (u.referrer_id) {
                const agentUUID = resolveRef(u.referrer_id);
                subCounts[agentUUID] = (subCounts[agentUUID] || 0) + 1;
                if (new Date(u.created_at) >= thisMonthStart)
                    newThisMonth[agentUUID] = (newThisMonth[agentUUID] || 0) + 1;
            }
        });

        // Render agent cards
        const agentList = document.getElementById('agent-list');
        if (agentList) {
            if (!agents.length) {
                agentList.innerHTML = `<p class="text-[11px] text-slate-400 text-center py-4">Agent မရှိသေးပါ</p>`;
            } else {
                agentList.innerHTML = agents.map(a => {
                    const name       = a.fullname || a.phone || 'Unknown';
                    const subs       = subCounts[a.id]    || 0;
                    const earned     = commTotals[a.id]   || 0;
                    const thisM      = commThisMonth[a.id]|| 0;
                    const newRefs    = newThisMonth[a.id] || 0;
                    const bal        = parseFloat(a.balance || 0);
                    const refLink    = `${window.location.origin}?ref=${a.ref_code}`;

                    return `<div class="card" style="will-change:transform;contain:content;">
                        <div class="flex items-start justify-between mb-3">
                            <div>
                                <p class="font-bold text-[14px]">${name}</p>
                                <p class="text-[9px] font-mono mt-0.5" style="color:var(--purple-bright)">${a.ref_code || '-'}</p>
                            </div>
                            <span class="badge badge-agent">Agent</span>
                        </div>

                        <!-- Stats grid -->
                        <div class="grid grid-cols-2 gap-2 mb-3">
                            <div class="rounded-lg p-2 text-center" style="background:var(--cyan-dim);border:1px solid var(--border-c)">
                                <p class="text-[8px] mb-0.5" style="color:var(--text-dim)">လက်အောက်သား</p>
                                <p class="text-[15px] font-bold" style="color:var(--cyan)">${subs}</p>
                                ${newRefs > 0 ? `<p class="text-[8px] text-emerald-400">+${newRefs} ဒီလ</p>` : ''}
                            </div>
                            <div class="rounded-lg p-2 text-center" style="background:var(--purple-dim);border:1px solid var(--border-p)">
                                <p class="text-[8px] mb-0.5" style="color:var(--text-dim)">ကျန်ငွေ</p>
                                <p class="text-[13px] font-bold" style="color:var(--purple-bright)">${bal.toLocaleString()} K</p>
                            </div>
                            <div class="rounded-lg p-2 text-center" style="background:rgba(0,255,179,0.08);border:1px solid rgba(0,255,179,0.25)">
                                <p class="text-[8px] text-emerald-500 mb-0.5">ဒီလ Commission</p>
                                <p class="text-[13px] font-bold text-emerald-400">${thisM.toLocaleString()} K</p>
                            </div>
                            <div class="rounded-lg p-2 text-center" style="background:rgba(0,255,179,0.05);border:1px solid rgba(0,255,179,0.15)">
                                <p class="text-[8px] text-emerald-500/70 mb-0.5">စုစုပေါင်း Commission</p>
                                <p class="text-[11px] font-bold text-emerald-500">${earned.toLocaleString()} K</p>
                            </div>
                        </div>

                        <!-- Referral link -->
                        <div class="rounded-lg p-2 flex items-center gap-2" style="background:rgba(0,229,255,0.06);border:1px solid var(--border-c)">
                            <p class="text-[9px] font-mono truncate flex-1" style="color:var(--text-secondary)">${refLink}</p>
                            <button onclick="copyRefLink('${refLink}')"
                                class="compact-btn btn-ghost text-[9px] flex-shrink-0 px-2 py-1">
                                <i class="fa-solid fa-copy mr-1"></i>Copy
                            </button>
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
                    const dt = new Date(c.created_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'});
                    return `<div class="flex items-center justify-between py-2" style="border-bottom:1px solid rgba(157,78,221,0.1)">
                        <div>
                            <p class="text-[11px] font-semibold">${agentName}</p>
                            <p class="text-[9px]" style="color:var(--text-dim)">${c.type||'deposit'} · Lv${c.level||1} · ${dt}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[12px] font-bold text-emerald-400">+${parseFloat(c.amount||0).toLocaleString()} K</p>
                            <p class="text-[9px]" style="color:var(--text-dim)">${parseFloat(c.percentage||0)}%</p>
                        </div>
                    </div>`;
                }).join('');
            }
        }

    } catch(e) { console.error('loadAgents:', e); }
}

function copyRefLink(link) {
    navigator.clipboard.writeText(link).then(() => showToast('Referral Link copied!', 'success'));
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
