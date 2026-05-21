let financeFilter  = 'pending';
let financeType    = 'all';
let financeSearch  = '';

async function loadFinance() {
    const container = document.getElementById('finance-cards');
    container.innerHTML = `<div class="text-center py-8 text-slate-400 text-[11px] animate-pulse">ငွေကြေးမှတ်တမ်း တင်နေသည်...</div>`;
    try {
        let query = db.from('transactions')
            .select('*, users(id,fullname,phone,ref_code,balance,remaining_turnover,role,is_admin)')
            .order('created_at', { ascending: false }).limit(150);

        if (financeFilter !== 'all') query = query.eq('status', financeFilter);
        if (financeType   !== 'all') query = query.eq('type', financeType);

        const { data: txs, error } = await query;
        if (error) throw error;

        // Client-side search filter
        let filtered = txs || [];
        if (financeSearch.trim()) {
            const q = financeSearch.toLowerCase();
            filtered = filtered.filter(t => {
                const u = t.users || {};
                return (u.fullname||'').toLowerCase().includes(q) ||
                       (u.phone||'').toLowerCase().includes(q) ||
                       (t.reference||'').toLowerCase().includes(q);
            });
        }

        if (!filtered.length) {
            container.innerHTML = `<div class="text-center py-8 text-slate-400 text-[11px]">မှတ်တမ်း မရှိသေးပါ</div>`;
            return;
        }

        // Pending summary bar
        const pending = filtered.filter(t => t.status === 'pending');
        const pendingTotal = pending.reduce((s,t) => s + parseFloat(t.amount||0), 0);
        const summaryBar = pending.length > 0 ? `
        <div class="mb-3 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
            <span class="text-[11px] text-amber-400 font-bold">
                <i class="fa-solid fa-clock mr-1"></i>ဆိုင်းငံ့ ${pending.length} ခု
            </span>
            <span class="text-[13px] font-bold text-amber-300">${pendingTotal.toLocaleString()} K</span>
        </div>` : '';

        container.innerHTML = summaryBar + filtered.map(t => buildTxCard(t)).join('');
    } catch(e) {
        document.getElementById('finance-cards').innerHTML =
            `<div class="text-center py-4 text-rose-500 text-[11px]">ဒေတာ တင်မရပါ</div>`;
    }
}

function buildTxCard(t) {
    const dt        = new Date(t.created_at);
    const date      = dt.toLocaleDateString('en-GB');
    const time      = dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const u         = t.users || {};
    const name      = u.fullname || u.phone || 'Unknown';
    const bal       = parseFloat(u.balance || 0);
    const to        = parseFloat(u.remaining_turnover || 0);
    const isPending = t.status === 'pending';
    const shortUUID = t.id ? t.id.substring(0,8).toUpperCase() : '-';
    const reqAmt    = parseFloat(t.amount || 0);
    const typeLabel = t.type === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်';
    const amtColor  = t.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400';

    // Role badge
    const roleBadge = u.is_admin
        ? '<span class="badge badge-admin">Admin</span>'
        : u.role === 'agent'
            ? '<span class="badge badge-agent">Agent</span>'
            : '<span class="badge badge-player">Player</span>';

    // processed info
    const processedInfo = (t.processed_at && !isPending)
        ? `<p class="text-[9px] text-slate-500 mt-0.5">
               <i class="fa-solid fa-check-circle mr-0.5"></i>
               ${new Date(t.processed_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'})}
               ${t.processed_by ? '· ' + t.processed_by : ''}
           </p>` : '';

    // original amount (if admin changed it)
    const origAmtNote = (t.original_amount && t.original_amount !== t.amount)
        ? `<p class="text-[9px] text-amber-400 mt-0.5">မူရင်း: ${parseFloat(t.original_amount).toLocaleString()} K</p>` : '';

    const actionBtns = isPending ? `
    <div class="mt-3 pt-3 border-t border-purple-500/20 space-y-2">
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p class="text-[9px] text-amber-400 font-bold uppercase mb-1.5">
                <i class="fa-solid fa-pen-to-square mr-1"></i>တကယ် ရောက်သော ပမာဏ
            </p>
            <div class="flex items-center gap-2">
                <input type="number"
                    id="approve-amt-${t.id}"
                    value="${reqAmt}"
                    class="flex-1 px-3 py-2 rounded-lg text-[13px] font-bold"
                    placeholder="ပမာဏ ရိုက်ပါ...">
                <div class="text-right flex-shrink-0">
                    <p class="text-[8px] text-slate-500">တောင်းဆိုထား</p>
                    <p class="text-[12px] font-bold ${amtColor} line-through opacity-60">${reqAmt.toLocaleString()} K</p>
                </div>
            </div>
            ${t.type === 'deposit' ? `<p class="text-[9px] text-amber-500/80 mt-1 italic">* ×turnover_multiplier → Turnover တွက်မည်</p>` : ''}
        </div>
        <!-- Admin note -->
        <div>
            <label class="text-[9px] text-slate-500 uppercase font-bold mb-1 block">Admin မှတ်ချက်</label>
            <input type="text"
                id="admin-note-${t.id}"
                value="${t.admin_note || ''}"
                placeholder="မှတ်ချက် ရေးနိုင်သည် (optional)..."
                class="w-full px-2 py-1.5 rounded-lg text-[11px]">
        </div>
        <div class="flex gap-2">
            <button onclick="processTxWithInput('${t.id}','${t.user_id}','${t.type}','approved')"
                class="compact-btn btn-primary flex-1 py-2.5">
                <i class="fa-solid fa-check mr-1"></i> အတည်ပြု
            </button>
            <button onclick="processTx('${t.id}','${t.user_id}','${t.type}',${reqAmt},'rejected')"
                class="compact-btn btn-danger flex-1 py-2.5">
                <i class="fa-solid fa-xmark mr-1"></i> ငြင်းပယ်
            </button>
        </div>
    </div>` : '';

    return `<div class="tx-card ${t.status}" style="will-change:transform;contain:content;">
        <div class="flex items-start justify-between mb-3">
            <div>
                <div class="flex items-center gap-1.5 mb-0.5">
                    <p class="font-bold text-[13px]">${name}</p>
                    ${roleBadge}
                </div>
                <p class="text-[10px] text-slate-500 font-mono">${u.phone || '-'}</p>
            </div>
            <div class="text-right">
                <span class="badge badge-${t.status}">${
                    t.status === 'pending'  ? 'ဆိုင်းငံ့' :
                    t.status === 'approved' ? 'အတည်'     : 'ငြင်းပယ်'}</span>
                <p class="text-[9px] text-slate-500 font-mono mt-1">${date} ${time}</p>
                ${processedInfo}
            </div>
        </div>

        <div class="flex items-center justify-between rounded-lg px-3 py-2 mb-3"
             style="background:rgba(255,255,255,0.04);border:1px solid rgba(157,78,221,0.2)">
            <div class="flex items-center gap-2">
                <span class="badge badge-${t.type}">${typeLabel}</span>
                ${t.bonus_opted ? '<span class="badge badge-pending">+ဘောနပ်</span>' : ''}
            </div>
            <span class="${amtColor} font-bold text-[17px]">${reqAmt.toLocaleString()} K</span>
        </div>
        ${origAmtNote}

        <div class="grid grid-cols-2 gap-2 mb-3">
            ${txCell('ငွေပေးချေနည်း', t.payment_method || '-', 'text-cyan-400 font-semibold')}
            ${txCell('နောက်ဆုံး ၅ လုံး', t.payment_details || '-', 'text-amber-400 font-mono font-bold text-[13px]')}
            ${txCell('ကိုးကားနံပါတ်', t.reference || '-', 'text-purple-400 font-mono text-[10px]')}
            ${txCell('TX ID', shortUUID + '...', 'text-slate-500 font-mono text-[10px]')}
        </div>

        <div class="rounded-lg p-3" style="background:rgba(255,255,255,0.03);border:1px solid rgba(157,78,221,0.15)">
            <p class="section-title mb-2">ကစားသမား အကောင့်</p>
            <div class="grid grid-cols-3 gap-1 text-center mb-2">
                <div>
                    <p class="text-[8px] text-slate-500">Game ID</p>
                    <p class="text-[10px] font-bold text-purple-400 font-mono">${u.ref_code || '-'}</p>
                </div>
                <div>
                    <p class="text-[8px] text-slate-500">ကျန်ငွေ</p>
                    <p class="text-[10px] font-bold text-emerald-400">${bal.toLocaleString()} K</p>
                </div>
                <div>
                    <p class="text-[8px] text-slate-500">Turnover</p>
                    <p class="text-[10px] font-bold text-amber-400">${to.toLocaleString()} K</p>
                </div>
            </div>
            ${t.admin_note ? `<p class="text-[9px] text-amber-400 mt-1"><i class="fa-solid fa-note-sticky mr-1"></i>${t.admin_note}</p>` : ''}
        </div>

        ${actionBtns}
    </div>`;
}

function txCell(label, value, valClass = '') {
    return `<div class="rounded-lg px-2 py-1.5" style="background:rgba(255,255,255,0.03);border:1px solid rgba(157,78,221,0.15)">
        <p class="text-[8px] text-slate-500 uppercase mb-0.5">${label}</p>
        <p class="${valClass} text-[11px] truncate">${value}</p>
    </div>`;
}

function setFinanceFilter(f) {
    financeFilter = f;
    document.querySelectorAll('#finance-filter-bar .filter-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.filter === f));
    loadFinance();
}

function setFinanceType(t) {
    financeType = t;
    document.querySelectorAll('#finance-type-bar .filter-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.type === t));
    loadFinance();
}

function onFinanceSearch(val) {
    financeSearch = val;
    loadFinance();
}

async function processTxWithInput(id, uid, type, status) {
    const inputEl  = document.getElementById(`approve-amt-${id}`);
    const noteEl   = document.getElementById(`admin-note-${id}`);
    const actualAmount = parseFloat(inputEl?.value || 0);
    if (!actualAmount || actualAmount <= 0) {
        showToast('ပမာဏ မဖြည့်သေးပါ!', 'error');
        inputEl?.focus();
        return;
    }
    await processTx(id, uid, type, actualAmount, status, noteEl?.value || '');
}

async function processTx(id, uid, type, amount, status, adminNote = '') {
    try {
        const now     = new Date().toISOString();
        const adminId = 'admin';

        if (status === 'approved') {
            const [{ data: sets }, { data: profile }] = await Promise.all([
                db.from('site_settings').select('*').eq('id',1).single(),
                db.from('users').select('balance,remaining_turnover,referrer_id,total_deposited,total_withdrawn').eq('id',uid).single()
            ]);

            // Resolve referrer_id (may be ref_code or UUID)
            let referrerId = profile.referrer_id || null;
            if (referrerId && referrerId.length < 20) {
                const { data: ref } = await db.from('users').select('id').eq('ref_code', referrerId).single();
                referrerId = ref?.id || null;
            }

            let newBal  = parseFloat(profile.balance || 0);
            let newTO   = parseFloat(profile.remaining_turnover || 0);
            let newDep  = parseFloat(profile.total_deposited || 0);
            let newWd   = parseFloat(profile.total_withdrawn || 0);

            if (type === 'deposit') {
                const bonusRate = parseFloat(sets.deposit_bonus_rate || 0);
                const bonus     = amount * (bonusRate / 100);
                const turnoverX = parseFloat(sets.turnover_multiplier || 10);
                newBal += amount + bonus;
                newTO  += amount * turnoverX;
                newDep += amount;

                // Commission to referrer
                if (referrerId && sets.commission_enabled) {
                    const commRate = parseFloat(sets.commission_rate || 0);
                    if (commRate > 0) {
                        const commAmt = amount * (commRate / 100);
                        const { data: referrer, error: refErr } = await db.from('users')
                                .select('balance').eq('id', referrerId).single();
                        if (refErr) {
                            showToast('Agent ရှာမတွေ့: ' + refErr.message, 'error');
                        } else {
                            const newRefBal = parseFloat(referrer?.balance || 0) + commAmt;
                            const [{ error: balErr }, { error: commErr }] = await Promise.all([
                                db.from('users').update({ balance: newRefBal }).eq('id', referrerId),
                                db.from('commissions').insert({
                                    agent_id:       referrerId,
                                    user_id:        uid,
                                    transaction_id: id,
                                    amount:         commAmt,
                                    percentage:     commRate,
                                    level:          1,
                                    type:           'deposit',
                                    created_at:     now
                                })
                            ]);
                            if (balErr)  showToast('Agent balance error: ' + balErr.message,  'error');
                            if (commErr) showToast('Commission insert error: ' + commErr.message, 'error');
                            if (!balErr && !commErr) showToast(`Commission ${commAmt.toLocaleString()} K → Agent ကို ပေးပြီ`, 'success');
                        }
                    }
                }
            } else if (type === 'withdrawal') {
                newBal -= amount;
                newWd  += amount;
            }

            await db.from('users').update({
                balance:           newBal,
                remaining_turnover: newTO,
                total_deposited:   newDep,
                total_withdrawn:   newWd
            }).eq('id', uid);

            // Get original amount before updating
            const { data: origTx } = await db.from('transactions').select('amount').eq('id', id).single();
            await db.from('transactions').update({
                status,
                amount,
                original_amount: origTx?.amount,
                admin_note:      adminNote || null,
                processed_at:    now,
                processed_by:    adminId
            }).eq('id', id);

        } else {
            await db.from('transactions').update({
                status,
                admin_note:   adminNote || null,
                processed_at: now,
                processed_by: adminId
            }).eq('id', id);
        }

        showToast(status === 'approved' ? `${amount.toLocaleString()} K အတည်ပြုပြီ!` : 'ငြင်းပယ်ပြီ!',
                  status === 'approved' ? 'success' : 'error');
        loadFinance();
        loadStats();
    } catch(err) {
        showToast('မအောင်မြင်ပါ: ' + err.message, 'error');
    }
}
