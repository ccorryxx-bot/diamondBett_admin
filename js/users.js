let allUsers = [];
let userSearchQuery = '';
let userFilter = 'all';

async function loadUsers() {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-600 text-[11px] animate-pulse">Loading players...</td></tr>`;

    try {
        const { data: users, error } = await db
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allUsers = users || [];
        renderUsers();
    } catch (e) {
        console.error('loadUsers error:', e);
        document.getElementById('user-table-body').innerHTML =
            `<tr><td colspan="5" class="text-center py-4 text-rose-500 text-[11px]">Failed to load players.</td></tr>`;
    }
}

function renderUsers() {
    const tbody = document.getElementById('user-table-body');
    const q = userSearchQuery.toLowerCase();

    let filtered = allUsers.filter(u => {
        const name = (u.fullname || u.phone || u.username || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const matchSearch = !q || name.includes(q) || phone.includes(q);
        const matchFilter =
            userFilter === 'all' ||
            (userFilter === 'active' && !u.is_banned) ||
            (userFilter === 'banned' && u.is_banned);
        return matchSearch && matchFilter;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-600 text-[11px]">No players found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        const name = u.fullname || u.phone || u.username || 'Unknown';
        const bal = parseFloat(u.balance || 0);
        const to = parseFloat(u.remaining_turnover || 0);
        const isBanned = u.is_banned;
        const badge = isBanned
            ? `<span class="badge badge-banned">Banned</span>`
            : `<span class="badge badge-active">Active</span>`;
        return `
        <tr class="hover:bg-[#0d0d0d] cursor-pointer" onclick="openUserModal('${u.id}')">
            <td>
                <div class="text-white font-medium text-[12px] max-w-[110px] truncate">${name}</div>
                <div class="text-[9px] text-gray-600 font-mono truncate max-w-[110px]">${u.phone || u.username || ''}</div>
            </td>
            <td class="text-emerald-400 font-bold">${bal.toLocaleString()} K</td>
            <td class="text-amber-400 font-bold">${to.toLocaleString()} K</td>
            <td>${badge}</td>
            <td class="text-right">
                <button onclick="event.stopPropagation(); openUserModal('${u.id}')" class="compact-btn bg-gray-900 border border-gray-800 text-gray-300">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function setUserFilter(f) {
    userFilter = f;
    document.querySelectorAll('#user-filter-bar .filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.filter === f);
    });
    renderUsers();
}

function onUserSearch(val) {
    userSearchQuery = val;
    renderUsers();
}

async function openUserModal(uid) {
    const user = allUsers.find(u => u.id === uid);
    if (!user) return;

    const name = user.fullname || user.phone || user.username || 'Unknown';
    const bal = parseFloat(user.balance || 0);
    const to = parseFloat(user.remaining_turnover || 0);
    const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : '-';
    const isBanned = user.is_banned;

    let txRows = '<tr><td colspan="3" class="text-center py-3 text-gray-600 text-[11px] animate-pulse">Loading...</td></tr>';

    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = buildUserModal(uid, name, user, bal, to, joinDate, isBanned, txRows);
    overlay.classList.remove('hidden');

    try {
        const { data: txs } = await db
            .from('transactions')
            .select('type, amount, status, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(20);

        txRows = txs && txs.length > 0 ? txs.map(t => {
            const d = new Date(t.created_at).toLocaleDateString();
            const col = t.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400';
            const sBadge = `<span class="badge badge-${t.status}">${t.status}</span>`;
            return `<tr>
                <td class="text-[10px] text-gray-400">${d}</td>
                <td><span class="badge badge-${t.type}">${t.type}</span></td>
                <td class="${col} font-bold text-[11px]">${parseFloat(t.amount).toLocaleString()} K</td>
                <td>${sBadge}</td>
            </tr>`;
        }).join('') : `<tr><td colspan="4" class="text-center py-3 text-gray-600 text-[11px]">No transactions found.</td></tr>`;
    } catch (e) {
        txRows = `<tr><td colspan="4" class="text-center py-3 text-rose-500 text-[11px]">Failed to load.</td></tr>`;
    }

    const txBody = document.getElementById('modal-tx-body');
    if (txBody) txBody.innerHTML = txRows;
}

function buildUserModal(uid, name, user, bal, to, joinDate, isBanned, txRows) {
    return `
    <div class="modal-overlay" onclick="closeModal(event, this)">
        <div class="modal-box">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 class="text-white font-bold text-[15px]">${name}</h3>
                    <p class="text-[10px] text-gray-500 font-mono">${user.phone || user.username || user.id}</p>
                </div>
                <button onclick="document.getElementById('modal-overlay').classList.add('hidden')"
                    class="text-gray-600 hover:text-white text-lg p-1">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="grid grid-cols-3 gap-2 mb-4">
                <div class="bg-black p-2.5 rounded border border-gray-900 text-center">
                    <p class="text-[8px] text-gray-500 uppercase mb-0.5">Balance</p>
                    <p class="text-emerald-400 font-bold text-[13px]">${bal.toLocaleString()} K</p>
                </div>
                <div class="bg-black p-2.5 rounded border border-gray-900 text-center">
                    <p class="text-[8px] text-gray-500 uppercase mb-0.5">Turnover</p>
                    <p class="text-amber-400 font-bold text-[13px]">${to.toLocaleString()} K</p>
                </div>
                <div class="bg-black p-2.5 rounded border border-gray-900 text-center">
                    <p class="text-[8px] text-gray-500 uppercase mb-0.5">Joined</p>
                    <p class="text-gray-300 font-bold text-[11px]">${joinDate}</p>
                </div>
            </div>

            <div class="space-y-2 mb-4">
                <p class="text-[9px] text-gray-500 uppercase font-semibold">Player Info</p>
                ${infoRow('Full Name', user.fullname || '-')}
                ${infoRow('Phone', user.phone || '-')}
                ${infoRow('Username', user.username || '-')}
                ${infoRow('Status', isBanned ? '<span class="badge badge-banned">Banned</span>' : '<span class="badge badge-active">Active</span>')}
            </div>

            <div class="bg-black border border-gray-900 rounded p-3 mb-4 space-y-3">
                <p class="text-[9px] text-indigo-400 uppercase font-bold">Quick Adjust</p>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[9px] text-gray-500 block mb-1">Balance Adjust (K)</label>
                        <input type="number" id="modal-bal-adjust" placeholder="+ or -"
                            class="w-full px-2 py-1.5 rounded outline-none text-[11px]">
                    </div>
                    <div>
                        <label class="text-[9px] text-gray-500 block mb-1">Set Turnover (K)</label>
                        <input type="number" id="modal-to-set" placeholder="New value"
                            class="w-full px-2 py-1.5 rounded outline-none text-[11px]"
                            value="${to}">
                    </div>
                </div>
                <button onclick="applyUserEdit('${uid}', ${bal}, ${to})"
                    class="compact-btn bg-indigo-600 hover:bg-indigo-500 text-white w-full py-2">
                    <i class="fa-solid fa-floppy-disk mr-1"></i> Save Changes
                </button>
            </div>

            <div class="mb-4">
                <button onclick="toggleBan('${uid}', ${isBanned})"
                    class="compact-btn w-full py-2 ${isBanned ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-900'}">
                    <i class="fa-solid ${isBanned ? 'fa-unlock' : 'fa-ban'} mr-1"></i>
                    ${isBanned ? 'Unban Player' : 'Ban Player'}
                </button>
            </div>

            <div>
                <p class="text-[9px] text-gray-500 uppercase font-semibold mb-2">Transaction History (Latest 20)</p>
                <div class="bg-black border border-gray-900 rounded overflow-x-auto">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="modal-tx-body">${txRows}</tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>`;
}

function infoRow(label, value) {
    return `<div class="flex items-center justify-between py-1.5 border-b border-gray-900/50">
        <span class="text-[10px] text-gray-500">${label}</span>
        <span class="text-[11px] text-white font-medium">${value}</span>
    </div>`;
}

function closeModal(e, overlay) {
    if (e.target === overlay) {
        document.getElementById('modal-overlay').classList.add('hidden');
    }
}

async function applyUserEdit(uid, currentBal, currentTo) {
    const balAdj = parseFloat(document.getElementById('modal-bal-adjust').value || 0);
    const newTo = parseFloat(document.getElementById('modal-to-set').value || currentTo);
    const newBal = currentBal + balAdj;

    try {
        const { error } = await db.from('users').update({
            balance: newBal,
            remaining_turnover: newTo
        }).eq('id', uid);
        if (error) throw error;
        showToast('Player updated successfully!', 'success');
        document.getElementById('modal-overlay').classList.add('hidden');
        loadUsers();
    } catch (e) {
        showToast('Failed: ' + e.message, 'error');
    }
}

async function toggleBan(uid, isBanned) {
    try {
        const { error } = await db.from('users').update({ is_banned: !isBanned }).eq('id', uid);
        if (error) throw error;
        showToast(isBanned ? 'Player unbanned.' : 'Player banned.', isBanned ? 'success' : 'error');
        document.getElementById('modal-overlay').classList.add('hidden');
        loadUsers();
    } catch (e) {
        showToast('Failed: ' + e.message, 'error');
    }
}
