let financeFilter = 'pending';

async function loadFinance() {
    const tbody = document.getElementById('finance-table-body');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-600 text-[11px] animate-pulse">Loading transactions...</td></tr>`;

    try {
        let query = db
            .from('transactions')
            .select('*, users(username, fullname, phone)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (financeFilter !== 'all') {
            query = query.eq('status', financeFilter);
        }

        const { data: txs, error } = await query;
        if (error) throw error;

        if (!txs || txs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-600 text-[11px]">No transactions found.</td></tr>`;
            return;
        }

        tbody.innerHTML = txs.map(t => {
            const dt = new Date(t.created_at);
            const dateStr = dt.toLocaleDateString();
            const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const clientName = t.users ? (t.users.fullname || t.users.phone || t.users.username) : 'Unknown';
            const isPending = t.status === 'pending';

            const actionBtns = isPending ? `
                <button onclick="processTx('${t.id}','${t.user_id}','${t.type}',${t.amount},'approved')"
                    class="compact-btn bg-indigo-600 text-white">✓</button>
                <button onclick="processTx('${t.id}','${t.user_id}','${t.type}',${t.amount},'rejected')"
                    class="compact-btn bg-gray-900 text-rose-500 border border-rose-900/30">✗</button>
            ` : `<span class="badge badge-${t.status}">${t.status}</span>`;

            return `<tr>
                <td>
                    <div class="text-[12px] text-white font-medium max-w-[100px] truncate">${clientName}</div>
                    <div class="text-[9px] text-gray-600 font-mono">${dateStr} ${timeStr}</div>
                </td>
                <td><span class="badge badge-${t.type}">${t.type}</span></td>
                <td class="font-bold text-white">${parseFloat(t.amount).toLocaleString()} K</td>
                <td class="text-gray-500 text-[10px] max-w-[90px] truncate">${t.payment_details || '-'}</td>
                <td class="text-right space-x-1">${actionBtns}</td>
            </tr>`;
        }).join('');

    } catch (e) {
        console.error('loadFinance error:', e);
        document.getElementById('finance-table-body').innerHTML =
            `<tr><td colspan="5" class="text-center py-4 text-rose-500 text-[11px]">Failed to load transactions.</td></tr>`;
    }
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
