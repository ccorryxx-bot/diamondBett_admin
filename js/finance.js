let financeFilter = 'pending';

async function loadFinance() {
    const container = document.getElementById('finance-cards');
    container.innerHTML = `<div class="text-center py-8 text-slate-400 text-[11px] animate-pulse">ငွေကြေးမှတ်တမ်း တင်နေသည်...</div>`;
    try {
        let query = db.from('transactions')
            .select('*, users(id,fullname,phone,ref_code,balance,remaining_turnover,role)')
            .order('created_at', { ascending: false }).limit(100);
        if (financeFilter !== 'all') query = query.eq('status', financeFilter);

        const { data: txs, error } = await query;
        if (error) throw error;

        if (!txs || !txs.length) {
            container.innerHTML = `<div class="text-center py-8 text-slate-400 text-[11px]">မှတ်တမ်း မရှိသေးပါ</div>`;
            return;
        }
        container.innerHTML = txs.map(t => buildTxCard(t)).join('');
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
    const amtColor  = t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600';

    // ── Admin approve amount input (pending only) ──
    const actionBtns = isPending ? `
    <div class="mt-3 pt-3 border-t border-slate-100 space-y-2">

        <!-- Actual amount input row -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p class="text-[9px] text-amber-700 font-semibold uppercase mb-1.5">
                <i class="fa-solid fa-pen-to-square mr-1"></i>တကယ် ရောက်သော ပမာဏ ရိုက်ထည့်ပါ
            </p>
            <div class="flex items-center gap-2">
                <div class="relative flex-1">
                    <input type="number"
                        id="approve-amt-${t.id}"
                        value="${reqAmt}"
                        class="w-full px-3 py-2 rounded-lg text-[13px] font-bold text-slate-800 border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="ပမာဏ ရိုက်ပါ...">
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-[8px] text-slate-400">တောင်းဆိုထား</p>
                    <p class="text-[12px] font-bold ${amtColor} line-through opacity-60">${reqAmt.toLocaleString()} K</p>
                </div>
            </div>
            ${t.type === 'deposit' ? `<p class="text-[9px] text-amber-600 mt-1 italic">
                * ရိုက်ထည့်သော ပမာဏ × turnover_multiplier (×10) → Turnover တွက်မည်
            </p>` : ''}
        </div>

        <!-- Approve / Reject buttons -->
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

    return `<div class="tx-card ${t.status}">
        <!-- Top row -->
        <div class="flex items-start justify-between mb-3">
            <div>
                <p class="font-bold text-slate-800 text-[13px]">${name}</p>
                <p class="text-[10px] text-slate-400 font-mono mt-0.5">${u.phone || '-'}</p>
            </div>
            <div class="text-right">
                <span class="badge badge-${t.status}">${
                    t.status === 'pending'  ? 'ဆိုင်းငံ့' :
                    t.status === 'approved' ? 'အတည်'     : 'ငြင်းပယ်'}</span>
                <p class="text-[9px] text-slate-400 font-mono mt-1">${date} ${time}</p>
            </div>
        </div>

        <!-- Amount row -->
        <div class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 mb-3 border border-slate-100">
            <div class="flex items-center gap-2">
                <span class="badge badge-${t.type}">${typeLabel}</span>
                ${t.bonus_opted ? '<span class="badge badge-pending">+ဘောနပ်</span>' : ''}
            </div>
            <span class="${amtColor} font-bold text-[17px]">${reqAmt.toLocaleString()} K</span>
        </div>

        <!-- Detail grid -->
        <div class="grid grid-cols-2 gap-2 mb-3">
            ${txCell('ငွေပေးချေနည်း', t.payment_method || '-', 'text-sky-600 font-semibold')}
            ${txCell('နောက်ဆုံး ၅ လုံး', t.payment_details || '-', 'text-amber-600 font-mono font-bold text-[13px]')}
            ${txCell('ကိုးကားနံပါတ်', t.reference || '-', 'text-indigo-600 font-mono text-[10px]')}
            ${txCell('TX UUID', shortUUID + '...', 'text-slate-400 font-mono text-[10px]')}
        </div>

        <!-- Account summary -->
        <div class="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p class="section-title mb-2">ကစားသမား အကောင့်</p>
            <div class="grid grid-cols-3 gap-1 text-center mb-2">
                <div>
                    <p class="text-[8px] text-slate-500">Game ID</p>
                    <p class="text-[10px] font-bold text-indigo-600 font-mono">${u.ref_code || '-'}</p>
                </div>
                <div>
                    <p class="text-[8px] text-slate-500">ကျန်ငွေ</p>
                    <p class="text-[10px] font-bold text-emerald-600">${bal.toLocaleString()} K</p>
                </div>
                <div>
                    <p class="text-[8px] text-slate-500">Turnover</p>
                    <p class="text-[10px] font-bold text-amber-600">${to.toLocaleString()} K</p>
                </div>
            </div>
            <p class="text-[9px] text-slate-400 font-mono truncate">UUID: ${t.user_id ? t.user_id.substring(0,20)+'...' : '-'}</p>
            ${t.admin_note ? `<p class="text-[9px] text-amber-600 mt-1">မှတ်ချက်: ${t.admin_note}</p>` : ''}
        </div>

        ${actionBtns}
    </div>`;
}

function txCell(label, value, valClass = 'text-slate-700') {
    return `<div class="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5">
        <p class="text-[8px] text-slate-400 uppercase mb-0.5">${label}</p>
        <p class="${valClass} text-[11px] truncate">${value}</p>
    </div>`;
}

function setFinanceFilter(f) {
    financeFilter = f;
    document.querySelectorAll('#finance-filter-bar .filter-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.filter === f));
    loadFinance();
}

// Called from Approve button — reads actual amount from input
async function processTxWithInput(id, uid, type, status) {
    const inputEl = document.getElementById(`approve-amt-${id}`);
    const actualAmount = parseFloat(inputEl?.value || 0);
    if (!actualAmount || actualAmount <= 0) {
        showToast('ပမာဏ မဖြည့်သေးပါ!', 'error');
        inputEl?.focus();
        return;
    }
    await processTx(id, uid, type, actualAmount, status);
}

// Core process function — uses passed amount
async function processTx(id, uid, type, amount, status) {
    try {
        if (status === 'approved') {
            const [{ data: sets }, { data: profile }] = await Promise.all([
                db.from('site_settings').select('*').eq('id',1).single(),
                db.from('users').select('balance,remaining_turnover').eq('id',uid).single()
            ]);
            let newBal = parseFloat(profile.balance || 0);
            let newTO  = parseFloat(profile.remaining_turnover || 0);

            if (type === 'deposit') {
                const bonusRate = parseFloat(sets.deposit_bonus_rate || 0);
                const bonus     = amount * (bonusRate / 100);
                const turnoverX = parseFloat(sets.turnover_multiplier || 10);
                newBal += amount + bonus;
                newTO  += amount * turnoverX;
            } else if (type === 'withdrawal') {
                newBal -= amount;
            }

            await db.from('users').update({ balance: newBal, remaining_turnover: newTO }).eq('id', uid);
            // Save the actual approved amount back to transaction
            await db.from('transactions').update({ status, amount }).eq('id', id);
        } else {
            await db.from('transactions').update({ status }).eq('id', id);
        }

        showToast(status === 'approved' ? `${amount.toLocaleString()} K အတည်ပြုပြီ!` : 'ငြင်းပယ်ပြီ!',
                  status === 'approved' ? 'success' : 'error');
        loadFinance();
        loadStats();
    } catch(err) {
        showToast('မအောင်မြင်ပါ: ' + err.message, 'error');
    }
}
