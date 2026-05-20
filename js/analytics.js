async function loadStats() {
    const ids = ['stat-total-users','stat-active-today','stat-pending-tx','stat-total-deposit','stat-total-withdraw','stat-ggr','stat-monthly-dep','stat-monthly-wd'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="skeleton w-16 h-5 mt-1"></div>';
    });

    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const todayISO = today.toISOString();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

        const [
            { count: userCount },
            { count: activeToday },
            { count: pendingCount },
            { data: todayTxs },
            { data: monthTxs }
        ] = await Promise.all([
            db.from('users').select('*', { count: 'exact', head: true }),
            db.from('users').select('*', { count: 'exact', head: true }).gte('updated_at', todayISO),
            db.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            db.from('transactions').select('amount,type').eq('status','approved').gte('created_at', todayISO),
            db.from('transactions').select('amount,type').eq('status','approved').gte('created_at', monthStart),
        ]);

        let dep = 0, wit = 0, mDep = 0, mWit = 0;
        todayTxs?.forEach(t => {
            if (t.type === 'deposit') dep += parseFloat(t.amount || 0);
            if (t.type === 'withdrawal') wit += parseFloat(t.amount || 0);
        });
        monthTxs?.forEach(t => {
            if (t.type === 'deposit') mDep += parseFloat(t.amount || 0);
            if (t.type === 'withdrawal') mWit += parseFloat(t.amount || 0);
        });

        const set = (id, val, cls) => {
            const el = document.getElementById(id);
            if (el) { el.textContent = val; el.className = `stat-value ${cls}`; }
        };
        set('stat-total-users',   (userCount||0).toLocaleString(),            'text-slate-800');
        set('stat-active-today',  (activeToday||0).toLocaleString(),          'text-sky-600');
        set('stat-pending-tx',    (pendingCount||0).toLocaleString(),         'text-amber-600');
        set('stat-total-deposit', dep.toLocaleString() + ' K',               'text-emerald-600');
        set('stat-total-withdraw',wit.toLocaleString() + ' K',               'text-rose-600');
        set('stat-ggr',           (dep-wit).toLocaleString() + ' K',         (dep-wit)>=0 ? 'text-indigo-600' : 'text-rose-600');
        set('stat-monthly-dep',   mDep.toLocaleString() + ' K',              'text-emerald-500');
        set('stat-monthly-wd',    mWit.toLocaleString() + ' K',              'text-rose-500');
    } catch(e) { console.error('loadStats:', e); }
}
