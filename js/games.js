async function loadGames() {
    const el = document.getElementById('game-cards-list');
    if (!el) return;
    el.innerHTML = `<div class="col-span-2 text-center py-4 text-[11px] animate-pulse" style="color:var(--text-dim)">တင်နေသည်...</div>`;
    try {
        const { data, error } = await db.from('game_cards')
            .select('*').order('created_at', { ascending: false });
        if (error) throw error;
        renderGameCards(data || []);
        updateGameCategoryFilter(data || []);
    } catch(e) { el.innerHTML = `<p class="text-rose-400 text-[11px] p-2 col-span-2">${e.message}</p>`; }
}

let allGameCards = [];
let gameCatFilter = 'all';

function updateGameCategoryFilter(cards) {
    allGameCards = cards;
    const cats = ['all', ...new Set(cards.map(c => c.category).filter(Boolean))];
    const bar  = document.getElementById('game-cat-bar');
    if (!bar) return;
    bar.innerHTML = cats.map(c => `
        <span class="filter-chip ${c === gameCatFilter ? 'active' : ''}"
              onclick="setGameCat('${c}')">${c === 'all' ? 'အားလုံး' : c}</span>`).join('');
}

function setGameCat(cat) {
    gameCatFilter = cat;
    document.querySelectorAll('#game-cat-bar .filter-chip').forEach(c =>
        c.classList.toggle('active', c.textContent === (cat === 'all' ? 'အားလုံး' : cat)));
    renderGameCards(cat === 'all' ? allGameCards : allGameCards.filter(c => c.category === cat));
}

function renderGameCards(cards) {
    const el = document.getElementById('game-cards-list');
    if (!el) return;
    if (!cards.length) {
        el.innerHTML = `<p class="col-span-2 text-center py-4 text-[11px]" style="color:var(--text-dim)">Game မရှိသေးပါ</p>`;
        return;
    }
    el.innerHTML = cards.map(g => `
        <div class="rounded-xl overflow-hidden border" style="border-color:var(--border-p);background:var(--bg-card)">
            <div style="position:relative">
                <img src="${g.image_url||''}" alt="${g.game_name||''}"
                    class="w-full object-cover" style="height:90px"
                    onerror="this.src='https://placehold.co/200x90/0e0e1c/9d4edd?text=Game'">
                <span class="badge" style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);color:var(--cyan);border:1px solid var(--border-c)">
                    ${g.category||'?'}
                </span>
            </div>
            <div class="p-2 space-y-1.5">
                <p class="text-[11px] font-bold truncate" style="color:var(--text-primary)">${g.game_name||'Unnamed'}</p>
                <p class="text-[9px] font-mono truncate" style="color:var(--text-dim)">${g.game_code||''}</p>
                <div class="flex gap-1.5">
                    <button onclick="editGameCard('${g.id}')"
                        class="compact-btn btn-ghost flex-1 py-1 text-[9px]">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button onclick="deleteGameCard('${g.id}','${(g.game_name||'').replace(/'/g,'')}')"
                        class="compact-btn btn-danger px-2 py-1 text-[9px]">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>`).join('');
}

function editGameCard(id) {
    const card = allGameCards.find(c => c.id == id);
    if (!card) return;
    const nameEl = document.getElementById(`gc-name-edit-${id}`);
    // Simple inline edit using prompt
    const newName = prompt('Game အမည် ပြောင်းမည်:', card.game_name || '');
    if (newName === null) return;
    const newCat = prompt('Category (show/slots/live/...):', card.category || '');
    if (newCat === null) return;
    db.from('game_cards').update({ game_name: newName.trim(), category: newCat.trim() }).eq('id', id)
        .then(({ error }) => {
            if (error) showToast('မအောင်မြင်ပါ: ' + error.message, 'error');
            else { showToast(`${newName} ပြောင်းပြီ ✅`, 'success'); loadGames(); }
        });
}

async function deleteGameCard(id, name) {
    if (!confirm(`"${name}" ကို ဖျက်မှာ သေချာပါသလား?`)) return;
    try {
        const { error } = await db.from('game_cards').delete().eq('id', id);
        if (error) throw error;
        showToast(`${name} ဖျက်ပြီ!`, 'success');
        loadGames();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

async function addGameCard() {
    const name   = document.getElementById('new-gc-name')?.value?.trim();
    const imgUrl = document.getElementById('new-gc-img')?.value?.trim();
    const cat    = document.getElementById('new-gc-cat')?.value?.trim() || 'slots';
    const code   = document.getElementById('new-gc-code')?.value?.trim() ||
                   'game_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    if (!name || !imgUrl) { showToast('Game အမည် နဲ့ Image URL ထည့်ပါ', 'error'); return; }
    try {
        const { error } = await db.from('game_cards').insert({
            game_name: name, image_url: imgUrl, category: cat,
            game_code: code, created_at: new Date().toISOString()
        });
        if (error) throw error;
        showToast(`${name} ထည့်ပြီ ✅`, 'success');
        ['new-gc-name','new-gc-img','new-gc-code'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        loadGames();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}
