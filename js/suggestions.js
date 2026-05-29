// ============================================================
//  SUGGESTIONS PANEL
// ============================================================

let _suggestionsData = [];
let _suggestionsFilter = 'all';

function openSuggestionsPanel() {
    document.getElementById('panel-suggestions')?.classList.add('open');
    loadSuggestions();
}

function closeSuggestionsPanel() {
    document.getElementById('panel-suggestions')?.classList.remove('open');
}

async function loadSuggestions() {
    const list = document.getElementById('suggestions-list');
    const countEl = document.getElementById('suggestions-count');
    if (!list) return;
    list.innerHTML = [1,2,3].map(()=>'<div class="skeleton h-20 rounded-xl mb-2"></div>').join('');

    try {
        const { data, error } = await db.from('suggestions')
            .select('*, users(fullname, phone, username)')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) throw error;

        _suggestionsData = data || [];
        if (countEl) countEl.textContent = _suggestionsData.length + ' ခု';
        renderSuggestions();
        updateSuggestionsBadge(_suggestionsData.length);
    } catch(e) {
        list.innerHTML = `<p style="font-size:11px;color:var(--red);padding:12px;text-align:center">Error: ${_escSug(e.message)}</p>`;
    }
}

function renderSuggestions() {
    const list = document.getElementById('suggestions-list');
    if (!list) return;

    if (_suggestionsData.length === 0) {
        list.innerHTML = `
            <div style="text-align:center;padding:40px 16px">
                <i class="fa-solid fa-inbox" style="font-size:32px;color:var(--text-dim);display:block;margin-bottom:10px"></i>
                <p style="font-size:12px;color:var(--text-dim)">Suggestion မရှိသေးပါ</p>
            </div>`;
        return;
    }

    list.innerHTML = _suggestionsData.map(s => {
        const user = s.users;
        const name = user ? (user.fullname || user.username || user.phone || 'Unknown') : 'Unknown';
        const dt   = new Date(s.created_at);
        const dateStr = dt.toLocaleDateString('my-MM', { day:'2-digit', month:'2-digit', year:'2-digit' });
        const timeStr = dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        const txt = _escSug(s.content || '(ဗလာ)');

        return `
        <div class="card" style="margin-bottom:10px;border:1px solid var(--border-p)">
            <div class="flex items-start justify-between gap-2 mb-3">
                <div class="flex items-center gap-2">
                    <div style="width:34px;height:34px;border-radius:50%;background:var(--purple-dim);border:1px solid var(--border-p);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                        <i class="fa-solid fa-user" style="font-size:12px;color:var(--purple-bright)"></i>
                    </div>
                    <div>
                        <p style="font-size:12px;font-weight:700;color:var(--text-primary)">${name}</p>
                        <p style="font-size:9px;color:var(--text-dim)">${dateStr} · ${timeStr}</p>
                    </div>
                </div>
                <button onclick="deleteSuggestion('${s.id}')"
                    style="width:30px;height:30px;border-radius:8px;background:rgba(220,38,38,0.1);border:1px solid rgba(220,38,38,0.25);color:var(--red);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0"
                    title="ဖျက်မည်">
                    <i class="fa-solid fa-trash" style="font-size:11px"></i>
                </button>
            </div>
            <div style="padding:12px;background:var(--bg-card-2);border-radius:10px;border:1px solid var(--border-p)">
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.7;word-break:break-word">${txt}</p>
            </div>
        </div>`;
    }).join('');
}

function _escSug(str) {
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

async function deleteSuggestion(id) {
    if (!confirm('ဤ Suggestion ကို ဖျက်မှာ သေချာပါသလား?')) return;
    try {
        const { error } = await db.from('suggestions').delete().eq('id', id);
        if (error) throw error;
        _suggestionsData = _suggestionsData.filter(s => s.id !== id);
        const countEl = document.getElementById('suggestions-count');
        if (countEl) countEl.textContent = _suggestionsData.length + ' ခု';
        renderSuggestions();
        updateSuggestionsBadge(_suggestionsData.length);
        showToast('Suggestion ဖျက်ပြီ ✓', 'success');
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    }
}

async function deleteAllSuggestions() {
    if (_suggestionsData.length === 0) return;
    if (!confirm(`Suggestion ${_suggestionsData.length} ခု အားလုံး ဖျက်မှာ သေချာပါသလား?`)) return;
    try {
        const ids = _suggestionsData.map(s => s.id);
        const { error } = await db.from('suggestions').delete().in('id', ids);
        if (error) throw error;
        _suggestionsData = [];
        const countEl = document.getElementById('suggestions-count');
        if (countEl) countEl.textContent = '0 ခု';
        renderSuggestions();
        updateSuggestionsBadge(0);
        showToast('Suggestion အားလုံး ဖျက်ပြီ ✓', 'success');
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    }
}

function updateSuggestionsBadge(count) {
    const badge = document.getElementById('suggestions-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Called from Realtime when new suggestion arrives
async function onNewSuggestion() {
    updateSuggestionsBadge((_suggestionsData.length || 0) + 1);
    const panel = document.getElementById('panel-suggestions');
    if (panel && panel.classList.contains('open')) {
        loadSuggestions();
    } else {
        // Refresh badge count from DB
        const { count } = await db.from('suggestions')
            .select('*', { count: 'exact', head: true });
        updateSuggestionsBadge(count || 0);
    }
}
