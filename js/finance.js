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
    const dt   = new Date(t.created_at);
    const date = dt.toLocaleDateString('en-GB');
    const time = dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const u    = t.users || {};
    const name = u.fullname || u.phone || 'Unknown';
    const bal  = parseFloat(u.balance || 0);
    const to   = parseFloat(u.remaining_turnover || 0);
    const isPending = t.status === 'pending';
    const shortUUID = t.id ? t.id.substring(0,8).toUpperCase() : '-';
    const typeLabel = t.type === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်';
    const amtColor  = t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600';

    const actionBtns = isPending ? `
    <div class="flex gap-2 mt-3 pt-3 border-t border-slate-100">
        <button onclick="processTx('${t.id}','${t.user_id}','${t.type}',${t.amount},'approved')"
            class="compact-btn btn-primary flex-1 py-2">
            <i class="fa-solid fa-check mr-1"></i> အတည်ပြု
        </button>
        <button onclick="processTx('${t.id}','${t.user_id}','${t.type}',${t.amount},'rejected')"
            class="compact-btn btn-danger flex-1 py-2">
            <i class="fa-solid fa-xmark mr-1"></i> ငြင်းပယ်
        </button>
    </div>` : '';

    return `<div class="tx-card ${t.status}">
        <!-- Top row -->
        <div class="flex items-start justify-between mb-3">
            <div>
                <p class="font-bold text-slate-800 text-[13px]">${name}</p>
                <p class="text-[10px] text-slate-400 font-mono mt-0.5">${u.phone || '-'}</p>
            </div>
            <div class="text-right">
                <span class="badge badge-${t.status}">${t.status === 'pending' ? 'ဆိုင်းငံ့' : t.status === 'approved' ? 'အတည်' : 'ငြင်းပယ်'}</span>
                <p class="text-[9px] text-slate-400 font-mono mt-1">${date} ${time}</p>
            </div>
        </div>

        <!-- Amount row -->
        <div class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 mb-3 border border-slate-100">
            <div class="flex items-center gap-2">
                <span class="badge badge-${t.type}">${typeLabel}</span>
                ${t.bonus_opted ? '<span class="badge badge-pending">+ဘောနပ်</span>' : ''}
            </div>
            <span class="${amtColor} font-bold text-[17px]">${parseFloat(t.amount).toLocaleString()} K</span>
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
                const bonus = amount * (parseFloat(sets.deposit_bonus_rate || 0) / 100);
                newBal += amount + bonus;
                newTO  += amount * parseFloat(sets.turnover_multiplier || 0);
            } else if (type === 'withdrawal') {
                newBal -= amount;
            }
            await db.from('users').update({ balance: newBal, remaining_turnover: newTO }).eq('id', uid);
        }
        await db.from('transactions').update({ status }).eq('id', id);
        showToast(status === 'approved' ? 'အတည်ပြုပြီ!' : 'ငြင်းပယ်ပြီ!', status === 'approved' ? 'success' : 'error');
        loadFinance(); loadStats();
    } catch(err) {
        showToast('မအောင်မြင်ပါ: ' + err.message, 'error');
    }
}
