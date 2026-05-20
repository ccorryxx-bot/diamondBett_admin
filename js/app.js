function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `show ${type}`;
    setTimeout(() => { t.className = ''; }, 2800);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
    refreshData(tab);
}

function refreshData(tab) {
    if (!tab) {
        const visible = document.querySelector('.tab-content:not(.hidden)');
        tab = visible ? visible.id.replace('tab-', '') : 'overview';
    }
    if (tab === 'overview') loadStats();
    if (tab === 'users') loadUsers();
    if (tab === 'finance') loadFinance();
    if (tab === 'settings') loadSettings();
}

// ===== SIDEBAR =====
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.remove('hidden');
    loadSidebarData();
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.add('hidden');
}

async function loadSidebarData() {
    try {
        const [
            { data: allUsers },
            { data: recentTxs },
            { count: pendingCount }
        ] = await Promise.all([
            db.from('users').select('role, is_admin'),
            db.from('transactions').select('type, amount, status, created_at, users(fullname, phone)')
                .order('created_at', { ascending: false }).limit(5),
            db.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        // Role breakdown
        const roles = { admin: 0, agent: 0, player: 0 };
        allUsers?.forEach(u => {
            if (u.is_admin) roles.admin++;
            else if (u.role === 'agent') roles.agent++;
            else roles.player++;
        });

        const roleColors = {
            admin: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'fa-shield-halved', label: 'Admin' },
            agent: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'fa-user-tie', label: 'Agent' },
            player: { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'fa-gamepad', label: 'ကစားသမား' }
        };

        document.getElementById('sidebar-roles').innerHTML = Object.entries(roles).map(([role, count]) => {
            const c = roleColors[role];
            return `<div class="flex items-center justify-between ${c.bg} rounded-lg px-3 py-2">
                <div class="flex items-center gap-2">
                    <i class="fa-solid ${c.icon} ${c.text} text-xs w-4"></i>
                    <span class="text-[11px] font-medium text-slate-700">${c.label}</span>
                </div>
                <span class="text-[12px] font-bold ${c.text}">${count}</span>
            </div>`;
        }).join('');

        // Live stats
        document.getElementById('sidebar-stats').innerHTML = `
        <div class="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
            <span class="text-[11px] text-amber-700"><i class="fa-solid fa-clock-rotate-left mr-1"></i> ဆိုင်းငံ့တောင်းဆိုမှု</span>
            <span class="text-[13px] font-bold text-amber-600">${pendingCount || 0}</span>
        </div>
        <div class="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
            <span class="text-[11px] text-emerald-700"><i class="fa-solid fa-users mr-1"></i> ကစားသမား စုစုပေါင်း</span>
            <span class="text-[13px] font-bold text-emerald-600">${allUsers?.length || 0}</span>
        </div>`;

        // Recent activity
        document.getElementById('sidebar-activity').innerHTML = recentTxs?.map(t => {
            const name = t.users ? (t.users.fullname || t.users.phone) : 'Unknown';
            const dt = new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const col = t.status === 'approved' ? 'text-emerald-600' :
                        t.status === 'rejected' ? 'text-rose-600' : 'text-amber-600';
            const typeLabel = t.type === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်';
            return `<div class="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div>
                    <p class="text-[11px] font-semibold text-slate-700 truncate max-w-[140px]">${name}</p>
                    <p class="text-[9px] text-slate-400">${typeLabel} · ${dt}</p>
                </div>
                <span class="text-[11px] font-bold ${col}">${parseFloat(t.amount).toLocaleString()} K</span>
            </div>`;
        }).join('') || '<p class="text-[11px] text-slate-400">မှတ်တမ်း မရှိသေးပါ</p>';

    } catch (e) {
        console.error('Sidebar error:', e);
    }
}

window.onload = () => loadStats();
