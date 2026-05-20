let financeFilter = 'pending';

async function loadFinance() {
    const container = document.getElementById('finance-cards');
    container.innerHTML = `<div class="text-center py-8 text-gray-600 text-[11px] animate-pulse">Loading transactions...</div>`;

    try {
        let query = db
            .from('transactions')
            .select('*, users(id, fullname, phone, ref_code, balance, remaining_turnover, role)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (financeFilter !== 'all') {
            query = query.eq('status', financeFilter);
        }

        const { data: txs, error } = await query;
        if (error) throw error;

        if (!txs || txs.length === 0) {
            container.innerHTML = `<div class="text-center py-8 text-gray-600 text-[11px]">No transactions found.</div>`;
            return;
        }

        container.innerHTML = txs.map(t => buildTxCard(t)).join('');

    } catch (e) {
        console.error('loadFinance error:', e);
        document.getElementById('finance-cards').innerHTML =
            `<div class="text-center py-4 text-rose-500 text-[11px]">Failed to load transactions.</div>`;
    }
}

function buildTxCard(t) {
    const dt = new Date(t.created_at);
    const dateStr = dt.toLocaleDateString('en-GB');
    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const u = t.users || {};
    const playerName = u.fullname || u.phone || 'Unknown';
    const phone = u.phone || '-';
    const refCode = u.ref_code || '-';
    const bal = parseFloat(u.balance || 0);
    const to = parseFloat(u.remaining_turnover || 0);
    const isPending = t.status === 'pending';
    const txId = t.id;
    const shortId = t.id ? t.id.substring(0, 8).toUpperCase() : '-';

    const statusColor = t.status === 'pending' ? 'text-amber-400' :
                        t.status === 'approved' ? 'text-emerald-400' : 'text-rose-400';
    const typeColor = t.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400';

    const actionBtns = isPending ? `
        <div class="flex gap-2 mt-3">
            <button onclick="processTx('${txId}','${t.user_id}','${t.type}',${t.amount},'approved')"
                class="compact-btn bg-indigo-600 hover:bg-indigo-500 text-white flex-1 py-2">
                <i class="fa-solid fa-check mr-1"></i> Approve
            </button>
            <button onclick="processTx('${txId}','${t.user_id}','${t.type}',${t.amount},'rejected')"
                class="compact-btn bg-rose-950 text-rose-400 border border-rose-900 flex-1 py-2">
                <i class="fa-solid fa-xmark mr-1"></i> Reject
            </button>
        </div>
    ` : '';

    return `
    <div class="bg-[#0a0a0a] border ${isPending ? 'border-amber-900/40' : 'border-gray-900'} rounded-lg p-3 space-y-3">

        <!-- Header row: player + status -->
        <div class="flex items-start justify-between">
            <div>
                <div class="text-white font-bold text-[13px]">${playerName}</div>
                <div class="text-[10px] text-gray-500 font-mono mt-0.5">${phone}</div>
            </div>
            <div class="text-right">
                <span class="badge badge-${t.status}">${t.status.toUpperCase()}</span>
                <div class="text-[9px] text-gray-600 mt-1 font-mono">${dateStr} ${timeStr}</div>
            </div>
        </div>

        <!-- Amount + type -->
        <div class="flex items-center justify-between bg-black/40 rounded px-3 py-2 border border-gray-900">
            <div class="flex items-center gap-2">
                <span class="badge badge-${t.type}">${t.type.toUpperCase()}</span>
                ${t.bonus_opted ? '<span class="badge badge-pending">+BONUS</span>' : ''}
            </div>
            <span class="${typeColor} font-bold text-[16px]">${parseFloat(t.amount).toLocaleString()} K</span>
        </div>

        <!-- Payment details grid -->
        <div class="grid grid-cols-2 gap-1.5">
            ${txDetailCell('Payment', t.payment_method || '-', 'text-sky-400')}
            ${txDetailCell('Last 5 Digits', t.payment_details || '-', 'text-yellow-400 font-mono font-bold text-[13px]')}
            ${txDetailCell('Reference', t.reference || '-', 'text-indigo-300 font-mono text-[10px]')}
            ${txDetailCell('TX UUID', shortId + '...', 'text-gray-500 font-mono text-[10px]')}
        </div>

        <!-- User account info -->
        <div class="bg-black border border-gray-900 rounded px-3 py-2 space-y-1.5">
            <p class="text-[8px] text-gray-600 uppercase tracking-widest font-semibold">Player Account</p>
            <div class="grid grid-cols-3 gap-1 text-center">
                <div>
                    <p class="text-[8px] text-gray-500">Game ID</p>
                    <p class="text-[10px] text-indigo-300 font-bold font-mono">${refCode}</p>
                </div>
                <div>
                    <p class="text-[8px] text-gray-500">Balance</p>
                    <p class="text-[10px] text-emerald-400 font-bold">${bal.toLocaleString()} K</p>
                </div>
                <div>
                    <p class="text-[8px] text-gray-500">Turnover</p>
                    <p class="text-[10px] text-amber-400 font-bold">${to.toLocaleString()} K</p>
                </div>
            </div>
            <div class="flex items-center justify-between pt-1 border-t border-gray-900/50">
                <span class="text-[9px] text-gray-600 font-mono">UUID: ${t.user_id ? t.user_id.substring(0,16) + '...' : '-'}</span>
                ${t.admin_note ? `<span class="text-[9px] text-amber-400">Note: ${t.admin_note}</span>` : ''}
            </div>
        </div>

        ${actionBtns}
    </div>`;
}

function txDetailCell(label, value, valClass = 'text-white') {
    return `
    <div class="bg-black/50 border border-gray-900 rounded px-2 py-1.5">
        <p class="text-[8px] text-gray-600 uppercase mb-0.5">${label}</p>
        <p class="${valClass} text-[11px] font-medium truncate">${value}</p>
    </div>`;
}

function setFinanceFilter(f) {
    financeFilter = f;
    document.querySelectorAll('#finance-filter-bar .filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.filter === f);
    });
    loadFinance();
}

async function processTx(id, uid, type, amount, status) {
    try {
        if (status === 'approved') {
            const [{ data: sets }, { data: profile }] = await Promise.all([
                db.from('site_settings').select('*').eq('id', 1).single(),
                db.from('users').select('balance, remaining_turnover').eq('id', uid).single()
            ]);

            let newBal = parseFloat(profile.balance || 0);
            let newTO = parseFloat(profile.remaining_turnover || 0);

            if (type === 'deposit') {
                const bonus = amount * (parseFloat(sets.deposit_bonus_rate || 0) / 100);
                newBal += amount + bonus;
                newTO += amount * parseFloat(sets.turnover_multiplier || 0);
            } else if (type === 'withdrawal') {
                newBal -= amount;
            }

            await db.from('users').update({ balance: newBal, remaining_turnover: newTO }).eq('id', uid);
        }

        await db.from('transactions').update({ status }).eq('id', id);
        showToast(status === 'approved' ? 'Transaction approved!' : 'Transaction rejected.', status === 'approved' ? 'success' : 'error');
        loadFinance();
        loadStats();
    } catch (err) {
        console.error(err);
        showToast('Failed: ' + err.message, 'error');
    }
}
