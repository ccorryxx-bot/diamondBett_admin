let allUsers = [];
let userSearchQuery = '';
let userFilter = 'all';

async function loadUsers() {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 text-[11px] animate-pulse">ကစားသမားများ တင်နေသည်...</td></tr>`;
    try {
        const { data: users, error } = await db.from('users').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allUsers = users || [];
        renderUsers();
    } catch(e) {
        document.getElementById('user-table-body').innerHTML =
            `<tr><td colspan="5" class="text-center py-6 text-rose-500 text-[11px]">ဒေတာ တင်မရပါ။</td></tr>`;
    }
}

function renderUsers() {
    const tbody = document.getElementById('user-table-body');
    const q = userSearchQuery.toLowerCase();

    let filtered = allUsers.filter(u => {
        const name   = (u.fullname || '').toLowerCase();
        const phone  = (u.phone || '').toLowerCase();
        const ref    = (u.ref_code || '').toLowerCase();
        const matchQ = !q || name.includes(q) || phone.includes(q) || ref.includes(q);
        const matchF =
            userFilter === 'all' ||
            (userFilter === 'active' && !u.is_banned) ||
            (userFilter === 'banned' && u.is_banned);
        return matchQ && matchF;
    });

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 text-[11px]">ကစားသမား မတွေ့ပါ။</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        const name = u.fullname || u.phone || 'Unknown';
        const bal  = parseFloat(u.balance || 0);
        const to   = parseFloat(u.remaining_turnover || 0);
        const badge = u.is_banned
            ? `<span class="badge badge-banned">ပိတ်</span>`
            : `<span class="badge badge-active">Active</span>`;
        return `<tr class="cursor-pointer" onclick="openUserModal('${u.id}')">
            <td>
                <div class="font-semibold text-slate-800 text-[12px] max-w-[110px] truncate">${name}</div>
                <div class="text-[9px] text-slate-400 font-mono">${u.ref_code || u.phone || ''}</div>
            </td>
            <td class="text-emerald-600 font-bold">${bal.toLocaleString()} K</td>
            <td class="text-amber-600 font-bold">${to.toLocaleString()} K</td>
            <td>${badge}</td>
            <td class="text-right">
                <button onclick="event.stopPropagation();openUserModal('${u.id}')"
                    class="compact-btn btn-ghost text-[10px]">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function setUserFilter(f) {
    userFilter = f;
    document.querySelectorAll('#user-filter-bar .filter-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.filter === f));
    renderUsers();
}

function onUserSearch(val) {
    userSearchQuery = val;
    renderUsers();
}

async function openUserModal(uid) {
    const user = allUsers.find(u => u.id === uid);
    if (!user) return;

    const overlay = document.getElementById('modal-overlay');
    // Show loading modal first
    overlay.innerHTML = buildUserModalShell(user);
    overlay.classList.remove('hidden');

    // Fetch all data in parallel
    try {
        const [
            { data: txs },
            { data: subordinates },
            referrerResult,
            txSummary
        ] = await Promise.all([
            db.from('transactions').select('type,amount,status,created_at,payment_method,payment_details,reference')
                .eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
            db.from('users').select('id,fullname,phone,ref_code,created_at,balance,is_banned')
                .eq('referrer_id', uid).order('created_at', { ascending: false }),
            user.referrer_id
                ? (user.referrer_id.length < 20
                    ? db.from('users').select('fullname,phone,ref_code').eq('ref_code', user.referrer_id).single()
                    : db.from('users').select('fullname,phone,ref_code').eq('id', user.referrer_id).single())
                : Promise.resolve({ data: null }),
            fetchTxSummary(uid)
        ]);

        const referrer = referrerResult.data;
        fillModalData(user, txs, subordinates, referrer, txSummary);
    } catch(e) {
        console.error('Modal data error:', e);
    }
}

async function fetchTxSummary(uid) {
    const { data } = await db.from('transactions')
        .select('type,amount').eq('user_id', uid).eq('status', 'approved');
    let totalDep = 0, totalWd = 0, countDep = 0, countWd = 0;
    data?.forEach(t => {
        if (t.type === 'deposit')    { totalDep += parseFloat(t.amount||0); countDep++; }
        if (t.type === 'withdrawal') { totalWd  += parseFloat(t.amount||0); countWd++;  }
    });
    return { totalDep, totalWd, countDep, countWd };
}

function buildUserModalShell(user) {
    const name    = user.fullname || user.phone || 'Unknown';
    const bal     = parseFloat(user.balance || 0);
    const to      = parseFloat(user.remaining_turnover || 0);
    const joined  = user.created_at ? new Date(user.created_at).toLocaleString('my-MM') : '-';
    const isBanned = user.is_banned;

    return `<div class="modal-overlay" onclick="closeModal(event,this)">
    <div class="modal-box">
        <div class="modal-drag"></div>

        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
            <div>
                <h3 class="text-slate-800 font-bold text-[16px]">${name}</h3>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] text-slate-400 font-mono">${user.ref_code || '-'}</span>
                    ${user.is_banned ? '<span class="badge badge-banned">ပိတ်ပင်</span>' : '<span class="badge badge-active">Active</span>'}
                    ${user.is_admin ? '<span class="badge badge-admin">Admin</span>' : user.role === 'agent' ? '<span class="badge badge-agent">Agent</span>' : '<span class="badge badge-player">Player</span>'}
                </div>
            </div>
            <button onclick="document.getElementById('modal-overlay').classList.add('hidden')"
                class="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <!-- Balance cards -->
        <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-100">
                <p class="text-[8px] text-emerald-600 uppercase font-semibold mb-0.5">ကျန်ငွေ</p>
                <p class="text-emerald-700 font-bold text-[12px]">${bal.toLocaleString()} K</p>
            </div>
            <div class="bg-amber-50 rounded-lg p-2 text-center border border-amber-100">
                <p class="text-[8px] text-amber-600 uppercase font-semibold mb-0.5">Turnover</p>
                <p class="text-amber-700 font-bold text-[12px]">${to.toLocaleString()} K</p>
            </div>
            <div class="bg-slate-50 rounded-lg p-2 text-center border border-slate-200">
                <p class="text-[8px] text-slate-500 uppercase font-semibold mb-0.5">အကောင့် UUID</p>
                <p class="text-slate-600 font-mono text-[8px] truncate">${user.id.substring(0,10)}...</p>
            </div>
        </div>

        <!-- Player Info -->
        <div class="card mb-4">
            <p class="section-title mb-2">ကိုယ်ရေးအချက်အလက်</p>
            ${infoRow('အပြည့်အဝ အမည်', user.fullname || '-')}
            ${infoRow('ဖုန်းနံပါတ်', user.phone || '-')}
            ${infoRow('Game Ref Code', user.ref_code || '-')}
            ${infoRow('Role', user.is_admin ? 'Admin' : (user.role || 'player'))}
            ${infoRow('Points', (user.points||0).toLocaleString())}
            ${infoRow('အကောင့် ဖွင့်သည့်နေ့', joined)}
        </div>

        <!-- Referrer -->
        <div id="modal-referrer" class="card mb-4">
            <p class="section-title mb-2">မိဘ Agent (ဘယ်သူ့အောက်က လူ)</p>
            <div class="skeleton h-8 rounded"></div>
        </div>

        <!-- TX Summary -->
        <div id="modal-tx-summary" class="grid grid-cols-2 gap-2 mb-4">
            <div class="bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-center">
                <div class="skeleton h-5 rounded mx-auto w-20"></div>
            </div>
            <div class="bg-rose-50 rounded-lg p-3 border border-rose-100 text-center">
                <div class="skeleton h-5 rounded mx-auto w-20"></div>
            </div>
        </div>

        <!-- Quick Adjust -->
        <div class="card mb-4">
            <p class="section-title mb-2 text-indigo-600">လျင်မြန်သော ပြင်ဆင်မှု</p>
            <div class="grid grid-cols-2 gap-2 mb-3">
                <div>
                    <label class="text-[9px] text-slate-500 block mb-1">ငွေ ပေါင်း/နုတ် (K)</label>
                    <input type="number" id="modal-bal-adjust" placeholder="+ or -"
                        class="w-full px-2 py-1.5 rounded-lg text-[11px]">
                </div>
                <div>
                    <label class="text-[9px] text-slate-500 block mb-1">Turnover သတ်မှတ် (K)</label>
                    <input type="number" id="modal-to-set" value="${to}"
                        class="w-full px-2 py-1.5 rounded-lg text-[11px]">
                </div>
            </div>
            <button onclick="applyUserEdit('${user.id}',${bal},${to})"
                class="compact-btn btn-primary w-full py-2">
                <i class="fa-solid fa-floppy-disk mr-1"></i> သိမ်းမည်
            </button>
        </div>

        <!-- Ban Button -->
        <button onclick="toggleBan('${user.id}',${isBanned})"
            class="compact-btn w-full py-2 mb-4 ${isBanned ? 'btn-success' : 'btn-danger'}">
            <i class="fa-solid ${isBanned ? 'fa-unlock' : 'fa-ban'} mr-1"></i>
            ${isBanned ? 'ပိတ်ပင်မှု ဖြေပေးမည်' : 'ကစားသမား ပိတ်ပင်မည်'}
        </button>

        <!-- Subordinates -->
        <div id="modal-subordinates" class="card mb-4">
            <p class="section-title mb-2">လက်အောက်ငယ်သားများ</p>
            <div class="skeleton h-8 rounded"></div>
        </div>

        <!-- TX History -->
        <div class="card">
            <p class="section-title mb-2">ငွေကြေးသမိုင်း (နောက်ဆုံး ၂၀)</p>
            <div class="overflow-x-auto no-scrollbar -mx-2">
                <table>
                    <thead><tr>
                        <th>နေ့ရက်</th><th>အမျိုးအစား</th><th>ပမာဏ</th><th>ငွေပေးချေ</th><th>အခြေအနေ</th>
                    </tr></thead>
                    <tbody id="modal-tx-body">
                        <tr><td colspan="5" class="text-center py-4 text-slate-400 text-[11px] animate-pulse">တင်နေသည်...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>`;
}

function fillModalData(user, txs, subordinates, referrer, txSummary) {
    // Referrer
    const refEl = document.getElementById('modal-referrer');
    if (refEl) {
        if (referrer) {
            refEl.innerHTML = `<p class="section-title mb-2">မိဘ Agent (ဘယ်သူ့အောက်က လူ)</p>
            <div class="flex items-center gap-3 bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <i class="fa-solid fa-user-tie text-indigo-600 text-xs"></i>
                </div>
                <div>
                    <p class="text-[12px] font-bold text-slate-800">${referrer.fullname || referrer.phone}</p>
                    <p class="text-[9px] text-indigo-500 font-mono">${referrer.ref_code || referrer.phone}</p>
                </div>
            </div>`;
        } else {
            refEl.innerHTML = `<p class="section-title mb-2">မိဘ Agent (ဘယ်သူ့အောက်က လူ)</p>
            <p class="text-[11px] text-slate-400 text-center py-2">တိုက်ရိုက် မှတ်ပုံတင်သူ</p>`;
        }
    }

    // TX Summary
    const sumEl = document.getElementById('modal-tx-summary');
    if (sumEl) {
        sumEl.innerHTML = `
        <div class="bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-center">
            <p class="text-[8px] text-emerald-600 uppercase font-semibold mb-1">ငွေသွင်း စုစုပေါင်း</p>
            <p class="text-emerald-700 font-bold text-[14px]">${txSummary.totalDep.toLocaleString()} K</p>
            <p class="text-[9px] text-emerald-500">${txSummary.countDep} ကြိမ်</p>
        </div>
        <div class="bg-rose-50 rounded-lg p-3 border border-rose-100 text-center">
            <p class="text-[8px] text-rose-600 uppercase font-semibold mb-1">ငွေထုတ် စုစုပေါင်း</p>
            <p class="text-rose-700 font-bold text-[14px]">${txSummary.totalWd.toLocaleString()} K</p>
            <p class="text-[9px] text-rose-500">${txSummary.countWd} ကြိမ်</p>
        </div>`;
    }

    // Subordinates
    const subEl = document.getElementById('modal-subordinates');
    if (subEl) {
        if (subordinates && subordinates.length > 0) {
            subEl.innerHTML = `<p class="section-title mb-2">လက်အောက်ငယ်သားများ (${subordinates.length} ဦး)</p>
            <div class="space-y-2">` +
            subordinates.map(s => {
                const bal = parseFloat(s.balance || 0);
                const joined = new Date(s.created_at).toLocaleDateString('en-GB');
                return `<div class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <div>
                        <p class="text-[11px] font-semibold text-slate-800">${s.fullname || s.phone}</p>
                        <p class="text-[9px] text-slate-400 font-mono">${s.ref_code || ''} · ${joined}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[11px] font-bold text-emerald-600">${bal.toLocaleString()} K</p>
                        ${s.is_banned ? '<span class="badge badge-banned text-[8px]">ပိတ်</span>' : ''}
                    </div>
                </div>`;
            }).join('') + '</div>';
        } else {
            subEl.innerHTML = `<p class="section-title mb-2">လက်အောက်ငယ်သားများ</p>
            <p class="text-[11px] text-slate-400 text-center py-2">လက်အောက်ငယ်သား မရှိသေးပါ</p>`;
        }
    }

    // TX History
    const txBody = document.getElementById('modal-tx-body');
    if (txBody) {
        txBody.innerHTML = txs && txs.length > 0 ? txs.map(t => {
            const d = new Date(t.created_at).toLocaleDateString('en-GB');
            const typeLabel = t.type === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်';
            const amtCol = t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600';
            return `<tr>
                <td class="text-[10px] text-slate-500">${d}</td>
                <td><span class="badge badge-${t.type}">${typeLabel}</span></td>
                <td class="${amtCol} font-bold text-[11px]">${parseFloat(t.amount).toLocaleString()} K</td>
                <td class="text-[10px] text-slate-500">${t.payment_method || '-'} ${t.payment_details ? '·'+t.payment_details : ''}</td>
                <td><span class="badge badge-${t.status}">${t.status === 'pending' ? 'ဆိုင်းငံ့' : t.status === 'approved' ? 'အတည်' : 'ငြင်းပယ်'}</span></td>
            </tr>`;
        }).join('') : `<tr><td colspan="5" class="text-center py-4 text-slate-400 text-[11px]">မှတ်တမ်း မရှိသေးပါ</td></tr>`;
    }
}

function infoRow(label, value) {
    return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`;
}

function closeModal(e, overlay) {
    if (e.target === overlay) document.getElementById('modal-overlay').classList.add('hidden');
}

async function applyUserEdit(uid, currentBal, currentTo) {
    const adj   = parseFloat(document.getElementById('modal-bal-adjust').value || 0);
    const newTo = parseFloat(document.getElementById('modal-to-set').value || currentTo);
    const newBal = currentBal + adj;
    try {
        const { error } = await db.from('users').update({ balance: newBal, remaining_turnover: newTo }).eq('id', uid);
        if (error) throw error;
        showToast('ကစားသမား အချက်အလက် ပြင်ဆင်ပြီး!', 'success');
        document.getElementById('modal-overlay').classList.add('hidden');
        loadUsers();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

async function toggleBan(uid, isBanned) {
    try {
        const { error } = await db.from('users').update({ is_banned: !isBanned }).eq('id', uid);
        if (error) throw error;
        showToast(isBanned ? 'ပိတ်ပင်မှု ဖြေပြီး!' : 'ကစားသမား ပိတ်ပင်ပြီ!', isBanned ? 'success' : 'error');
        document.getElementById('modal-overlay').classList.add('hidden');
        loadUsers();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}
