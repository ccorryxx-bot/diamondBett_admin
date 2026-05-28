// ═══════════════════════════════════════════════════════
//  GAMES  —  ImageKit CDN upload + provider_url + CRUD
// ═══════════════════════════════════════════════════════

let allGameCards  = [];
let gameCatFilter = 'all';

async function loadGames() {
    const el = document.getElementById('game-cards-list');
    if (!el) return;
    el.innerHTML = `<div class="game-grid">${Array(4).fill('<div class="skeleton h-32 rounded-xl"></div>').join('')}</div>`;
    try {
        const { data, error } = await db.from('game_cards')
            .select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allGameCards = data || [];
        updateGameCategoryFilter(allGameCards);
        renderGameCards(gameCatFilter === 'all' ? allGameCards :
            allGameCards.filter(c => c.category === gameCatFilter));
        const cnt = document.getElementById('game-count');
        if (cnt) cnt.textContent = allGameCards.length;
    } catch(e) {
        el.innerHTML = `<p class="text-rose-400 text-[11px] p-2">⚠ ${e.message}</p>`;
    }
}

function updateGameCategoryFilter(cards) {
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
        el.innerHTML = `<p class="text-center py-8 text-[11px]" style="color:var(--text-dim)">Game မရှိသေးပါ</p>`;
        return;
    }
    el.innerHTML = `<div class="game-grid">${cards.map(g => `
        <div class="game-card-item">
            <div style="position:relative">
                <img src="${g.image_url||''}" alt="${g.game_name||''}"
                    style="width:100%;height:90px;object-fit:cover;display:block"
                    onerror="this.src='https://placehold.co/200x90/000000/9d4edd?text=Game'">
                <span style="position:absolute;top:4px;right:4px;padding:2px 6px;border-radius:4px;
                    background:rgba(0,0,0,0.75);color:var(--cyan);font-size:8px;font-weight:800;
                    border:1px solid var(--border-c)">${g.category||'?'}</span>
            </div>
            <div class="p-2 space-y-1.5">
                <p class="font-bold truncate" style="font-size:11px;color:var(--text-primary)">${g.game_name||'Unnamed'}</p>
                ${g.provider_url ? `<p class="truncate" style="font-size:8px;color:var(--text-dim)">🔗 ${g.provider_url.replace(/^https?:\/\//,'').slice(0,28)}...</p>` : ''}
                <div class="flex gap-1">
                    <button onclick="openEditGameModal('${g.id}')"
                        class="compact-btn btn-ghost flex-1 text-[10px]" style="min-height:28px;padding:5px 6px">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="deleteGameCard('${g.id}','${(g.game_name||'').replace(/'/g,'')}')"
                        class="compact-btn btn-danger text-[10px]" style="min-height:28px;padding:5px 8px">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>`).join('')}</div>`;
}

// ── File Upload ──────────────────────────────────────────
let gameFileToUpload = null;

function onGameFileChange(input) {
    const file = input.files[0];
    if (!file) return;
    gameFileToUpload = file;
    const preview = document.getElementById('game-preview');
    if (preview) { preview.src = URL.createObjectURL(file); preview.style.display = 'block'; }
    const label = document.getElementById('game-upload-label');
    if (label) label.textContent = '📎 ' + file.name;
}

async function addGameCard() {
    const name    = document.getElementById('new-gc-name')?.value?.trim();
    const cat     = document.getElementById('new-gc-cat')?.value?.trim() || 'slots';
    const code    = document.getElementById('new-gc-code')?.value?.trim() || 'game_' + Date.now();
    const provUrl = document.getElementById('new-gc-url')?.value?.trim() || '';

    if (!name) { showToast('Game အမည် ထည့်ပါ', 'error'); return; }
    if (!gameFileToUpload) { showToast('Image ရွေးပါ', 'error'); return; }

    const btn = document.getElementById('add-game-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'တင်နေသည်...'; }

    try {
        // Upload image to ImageKit CDN
        const imageUrl = await uploadToImageKit(gameFileToUpload, 'game-cards');

        const { error } = await db.from('game_cards').insert({
            game_name: name, image_url: imageUrl,
            category: cat, game_code: code, provider_url: provUrl,
            created_at: new Date().toISOString()
        });
        if (error) throw error;

        showToast(`${name} ထည့်ပြီ ✅`, 'success');
        ['new-gc-name','new-gc-code','new-gc-url'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        gameFileToUpload = null;
        const p = document.getElementById('game-preview');
        if (p) { p.style.display='none'; p.src=''; }
        const l = document.getElementById('game-upload-label');
        if (l) l.textContent = '📁 Image ရွေးချယ်ပါ';
        const fi = document.getElementById('game-file-input');
        if (fi) fi.value = '';
        loadGames();
    } catch(e) {
        showToast('မအောင်မြင်ပါ: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Game ထည့်မည်'; }
    }
}

// ── Edit Modal ───────────────────────────────────────────
let editingGameId = null;

function openEditGameModal(id) {
    const card = allGameCards.find(c => String(c.id) === String(id));
    if (!card) return;
    editingGameId = id;
    const m = document.getElementById('edit-game-modal');
    if (!m) return;
    document.getElementById('eg-name').value     = card.game_name   || '';
    document.getElementById('eg-cat').value      = card.category    || 'slots';
    document.getElementById('eg-code').value     = card.game_code   || '';
    document.getElementById('eg-url').value      = card.provider_url|| '';
    document.getElementById('eg-img-prev').src   = card.image_url   || '';
    document.getElementById('eg-img-prev').style.display = card.image_url ? 'block' : 'none';
    m.style.display = 'flex';
}
function closeEditGameModal() {
    const m = document.getElementById('edit-game-modal');
    if (m) m.style.display = 'none';
    editingGameId = null;
}

let editGameFile = null;
function onEditGameFile(input) {
    editGameFile = input.files[0];
    if (!editGameFile) return;
    const p = document.getElementById('eg-img-prev');
    if (p) { p.src = URL.createObjectURL(editGameFile); p.style.display = 'block'; }
}

async function saveEditGame() {
    if (!editingGameId) return;
    const name    = document.getElementById('eg-name')?.value?.trim();
    const cat     = document.getElementById('eg-cat')?.value?.trim() || 'slots';
    const code    = document.getElementById('eg-code')?.value?.trim() || '';
    const provUrl = document.getElementById('eg-url')?.value?.trim() || '';
    if (!name) { showToast('Game အမည် ထည့်ပါ','error'); return; }

    const btn = document.getElementById('eg-save-btn');
    if (btn) { btn.disabled=true; btn.textContent='သိမ်းနေသည်...'; }

    try {
        let imageUrl = allGameCards.find(c=>String(c.id)===String(editingGameId))?.image_url || '';

        // Upload new image to ImageKit if selected
        if (editGameFile) {
            imageUrl     = await uploadToImageKit(editGameFile, 'game-cards');
            editGameFile = null;
        }

        const { error } = await db.from('game_cards').update({
            game_name: name, category: cat,
            game_code: code, provider_url: provUrl, image_url: imageUrl
        }).eq('id', editingGameId);
        if (error) throw error;

        showToast(`${name} ပြောင်းပြီ ✅`, 'success');
        closeEditGameModal();
        loadGames();
    } catch(e) {
        showToast('မအောင်မြင်ပါ: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled=false; btn.textContent='သိမ်းမည်'; }
    }
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

// ── Panel open/close ─────────────────────────────────────
function openGamesPanel() {
    closeSidebar();
    const p = document.getElementById('panel-games');
    if (p) { p.classList.add('open'); loadGames(); }
}
function closeGamesPanel() {
    const p = document.getElementById('panel-games');
    if (p) p.classList.remove('open');
}
