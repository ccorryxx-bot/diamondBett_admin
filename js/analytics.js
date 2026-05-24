async function loadStats() {
    const ids = ['stat-total-users','stat-active-today','stat-pending-tx','stat-total-deposit','stat-total-withdraw','stat-ggr','stat-monthly-dep','stat-monthly-wd','stat-new-today','stat-total-agents','stat-system-balance'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="skeleton w-16 h-5 mt-1"></div>';
    });

    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const todayISO   = today.toISOString();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

        // Bug fix: last_login_at column does not exist — replaced with is_banned=false for active count
        // Bug fix: use select('count') instead of head:true+count:exact (more reliable with RLS)
        const [
            { data: totalData,   error: e1 },
            { data: activeData,  error: e2 },
            { data: pendingData, error: e3 },
            { data: newData,     error: e4 },
            { data: agentData,   error: e5 },
            { data: todayTxs,    error: e6 },
            { data: monthTxs,    error: e7 },
            { data: balanceData, error: e8 }
        ] = await Promise.all([
            db.from('users').select('count'),
            db.from('users').select('count').eq('is_banned', false),
            db.from('transactions').select('count').eq('status', 'pending'),
            db.from('users').select('count').gte('created_at', todayISO),
            db.from('users').select('count').eq('role', 'agent'),
            db.from('transactions').select('amount,type').eq('status','approved').gte('created_at', todayISO),
            db.from('transactions').select('amount,type').eq('status','approved').gte('created_at', monthStart),
            db.from('users').select('balance').eq('is_banned', false),
        ]);

        [e1,e2,e3,e4,e5,e6,e7,e8].forEach((e,i) => {
            if (e) console.warn('loadStats query ' + (i+1) + ' error:', e.message);
        });

        const userCount    = parseInt(totalData?.[0]?.count   || 0);
        const activeToday  = parseInt(activeData?.[0]?.count  || 0);
        const pendingCount = parseInt(pendingData?.[0]?.count || 0);
        const newToday     = parseInt(newData?.[0]?.count     || 0);
        const agentCount   = parseInt(agentData?.[0]?.count   || 0);

        let dep = 0, wit = 0, mDep = 0, mWit = 0, sysBalance = 0;
        todayTxs?.forEach(t => {
            if (t.type === 'deposit')    dep += parseFloat(t.amount || 0);
            if (t.type === 'withdrawal') wit += parseFloat(t.amount || 0);
        });
        monthTxs?.forEach(t => {
            if (t.type === 'deposit')    mDep += parseFloat(t.amount || 0);
            if (t.type === 'withdrawal') mWit += parseFloat(t.amount || 0);
        });
        balanceData?.forEach(u => { sysBalance += parseFloat(u.balance || 0); });

        const set = (id, val, cls) => {
            const el = document.getElementById(id);
            if (el) { el.textContent = val; el.className = 'stat-value ' + cls; }
        };
        set('stat-total-users',    userCount.toLocaleString(),            'text-slate-800');
        set('stat-active-today',   activeToday.toLocaleString(),          'text-sky-600');
        set('stat-pending-tx',     pendingCount.toLocaleString(),         'text-amber-600');
        set('stat-new-today',      newToday.toLocaleString(),             'text-cyan-400');
        set('stat-total-agents',   agentCount.toLocaleString(),           'text-purple-400');
        set('stat-total-deposit',  dep.toLocaleString()  + ' K',          'text-emerald-600');
        set('stat-total-withdraw', wit.toLocaleString()  + ' K',          'text-rose-600');
        set('stat-ggr',            (dep - wit).toLocaleString() + ' K',   (dep-wit) >= 0 ? 'text-indigo-600' : 'text-rose-600');
        set('stat-monthly-dep',    mDep.toLocaleString() + ' K',          'text-emerald-500');
        set('stat-monthly-wd',     mWit.toLocaleString() + ' K',          'text-rose-500');
        set('stat-system-balance', sysBalance.toLocaleString() + ' K',    'text-amber-500');

    } catch(e) { console.error('loadStats fatal:', e); }
}
