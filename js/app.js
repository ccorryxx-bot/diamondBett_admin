// ===== TOAST =====
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `show ${type}`;
    setTimeout(() => { t.className = ''; }, 2800);
}

// ===== TAB SWITCH =====
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
    if (tab === 'overview')     loadStats();
    if (tab === 'users')        loadUsers();
    if (tab === 'finance')      loadFinance();
    if (tab === 'agents')       loadAgents();
    if (tab === 'settings')     { loadSettings(); loadAffiliate(); }
    if (tab === 'banners')      loadBanners();
    if (tab === 'games')        loadGames();
    if (tab === 'wheel')        loadWheel();
    if (tab === 'suggestions')  loadSuggestions();
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

        const roles = { admin: 0, agent: 0, player: 0 };
        allUsers?.forEach(u => {
            if (u.is_admin) roles.admin++;
            else if (u.role === 'agent') roles.agent++;
            else roles.player++;
        });

        const roleColors = {
            admin:  { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'fa-shield-halved', label: 'Admin' },
            agent:  { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'fa-user-tie',      label: 'Agent' },
            player: { bg: 'bg-slate-50',  text: 'text-slate-600',  icon: 'fa-gamepad',        label: 'ကစားသမား' }
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

        document.getElementById('sidebar-stats').innerHTML = `
        <div class="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
            <span class="text-[11px] text-amber-700"><i class="fa-solid fa-clock-rotate-left mr-1"></i> ဆိုင်းငံ့တောင်းဆိုမှု</span>
            <span class="text-[13px] font-bold text-amber-600">${pendingCount || 0}</span>
        </div>
        <div class="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
            <span class="text-[11px] text-emerald-700"><i class="fa-solid fa-users mr-1"></i> ကစားသမား စုစုပေါင်း</span>
            <span class="text-[13px] font-bold text-emerald-600">${allUsers?.length || 0}</span>
        </div>`;

        document.getElementById('sidebar-activity').innerHTML = recentTxs?.map(t => {
            const name = t.users ? (t.users.fullname || t.users.phone) : 'Unknown';
            const dt   = new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const col  = t.status === 'approved' ? 'text-emerald-600' :
                         t.status === 'rejected'  ? 'text-rose-600'   : 'text-amber-600';
            const typeLabel = t.type === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်';
            return `<div class="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div>
                    <p class="text-[11px] font-semibold text-slate-700 truncate max-w-[140px]">${name}</p>
                    <p class="text-[9px] text-slate-400">${typeLabel} · ${dt}</p>
                </div>
                <span class="text-[11px] font-bold ${col}">${parseFloat(t.amount).toLocaleString()} K</span>
            </div>`;
        }).join('') || '<p class="text-[11px] text-slate-400">မှတ်တမ်း မရှိသေးပါ</p>';

    } catch (e) { console.error('Sidebar error:', e); }
}

// ===== NOTIFICATION SOUND (Web Audio API) =====
let _audioCtx = null;
function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
}

function playNotificationSound(type) {
    try {
        const ctx  = getAudioCtx();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        const notes = type === 'deposit'
            ? [{ freq: 880, t: 0 }, { freq: 1100, t: 0.12 }, { freq: 1320, t: 0.24 }]
            : [{ freq: 660, t: 0 }, { freq: 550, t: 0.14 }, { freq: 440, t: 0.28 }];

        notes.forEach(({ freq, t }) => {
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(g);
            g.connect(ctx.destination);
            const now = ctx.currentTime + t;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.35, now + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    } catch(e) { console.warn('Sound error:', e); }
}

// ===== PENDING NOTIFICATION POLLING =====
let _lastPendingCount = null;
let _pollTimer = null;

async function pollPendingRequests() {
    try {
        const { count } = await db.from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const c = count || 0;
        updateFinanceBadge(c);

        if (_lastPendingCount !== null && c > _lastPendingCount) {
            const diff = c - _lastPendingCount;
            const { data: latest } = await db.from('transactions')
                .select('type').eq('status','pending').order('created_at',{ascending:false}).limit(1).single();
            const txType = latest?.type || 'deposit';
            playNotificationSound(txType);
            showToast(
                `⚡ တောင်းဆိုမှု ${diff} ခု အသစ်ရောက်သည်! (${txType === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်'})`,
                'success'
            );
        }
        _lastPendingCount = c;
    } catch(e) { console.warn('Poll error:', e); }
}

function updateFinanceBadge(count) {
    const btn = document.getElementById('btn-finance');
    if (!btn) return;
    const old = btn.querySelector('.notif-badge');
    if (old) old.remove();
    if (count > 0) {
        btn.insertAdjacentHTML('beforeend',
            `<span class="notif-badge">${count > 9 ? '9+' : count}</span>`);
    }
}

function startPolling() {
    pollPendingRequests();
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(pollPendingRequests, 60000);
}

// ===== REALTIME SUBSCRIPTIONS =====
let _realtimeChannels = [];
let _realtimeRetryTimer = null;
let _realtimeRetryCount = 0;

function _cleanupChannels() {
    _realtimeChannels.forEach(ch => {
        try { db.removeChannel(ch); } catch(e) {}
    });
    _realtimeChannels = [];
}

function setupRealtimeSubscriptions() {
    _cleanupChannels();

    // ── Transactions channel ──────────────────────────────
    const txChannel = db.channel('admin-transactions-' + Date.now())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
            loadSidebarData();
            loadStats();

            const financeTab = document.getElementById('tab-finance');
            if (financeTab && !financeTab.classList.contains('hidden')) loadFinance();

            if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
                const txType = payload.new.type || 'deposit';
                playNotificationSound(txType);
                showToast(
                    `⚡ တောင်းဆိုမှုအသစ်ရောက်သည်! (${txType === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်'})`,
                    'success'
                );
            }
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                _realtimeRetryCount = 0;
                console.log('[Realtime] transactions: connected ✓');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.warn('[Realtime] transactions:', status, err);
                _scheduleRealtimeReconnect();
            }
        });

    // ── Users channel ─────────────────────────────────────
    const usersChannel = db.channel('admin-users-' + Date.now())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
            loadStats();
            const usersTab = document.getElementById('tab-users');
            if (usersTab && !usersTab.classList.contains('hidden')) loadUsers();
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('[Realtime] users: connected ✓');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.warn('[Realtime] users:', status, err);
                _scheduleRealtimeReconnect();
            }
        });

    // ── Suggestions channel ───────────────────────────────
    const sugChannel = db.channel('admin-suggestions-' + Date.now())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suggestions' }, payload => {
            console.log('[Realtime] new suggestion:', payload.new);
            if (typeof onNewSuggestion === 'function') onNewSuggestion();
            showToast('💡 Suggestion အသစ်ရောက်သည်!', 'success');
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('[Realtime] suggestions: connected ✓');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.warn('[Realtime] suggestions:', status, err);
            }
        });

    _realtimeChannels = [txChannel, usersChannel, sugChannel];
}

function _scheduleRealtimeReconnect() {
    if (_realtimeRetryTimer) return;
    _realtimeRetryCount++;
    const delay = Math.min(5000 * _realtimeRetryCount, 60000);
    console.log(`[Realtime] reconnecting in ${delay / 1000}s (attempt ${_realtimeRetryCount})...`);
    _realtimeRetryTimer = setTimeout(() => {
        _realtimeRetryTimer = null;
        setupRealtimeSubscriptions();
    }, delay);
}

// ===== INIT =====
window.onload = async () => {
    try {
        const { data: { session } } = await db.auth.getSession();
        // if (!session) { window.location.href = 'login.html'; return; }
    } catch(e) { console.warn('Session check failed:', e); }

    loadStats();

    document.addEventListener('click', () => {
        if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
    }, { once: true });

    setupRealtimeSubscriptions();
    startPolling();
};
