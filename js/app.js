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

    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active-tab'));
    const activeBtn = document.getElementById(`btn-${tab}`);
    if (activeBtn) activeBtn.classList.add('active-tab');

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

window.onload = () => loadStats();
