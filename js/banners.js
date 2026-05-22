async function loadBanners() {
    const el = document.getElementById('banner-list');
    if (!el) return;
    el.innerHTML = `<div class="text-center py-4 text-[11px] animate-pulse" style="color:var(--text-dim)">တင်နေသည်...</div>`;
    try {
        const { data, error } = await db.from('banners').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        renderBanners(data || []);
    } catch(e) { el.innerHTML = `<p class="text-rose-400 text-[11px] p-2">${e.message}</p>`; }
}

function renderBanners(banners) {
    const el = document.getElementById('banner-list');
    if (!el) return;
    if (!banners.length) {
        el.innerHTML = `<p class="text-center py-4 text-[11px]" style="color:var(--text-dim)">Banner မရှိသေးပါ</p>`;
        return;
    }
    el.innerHTML = banners.map(b => `
        <div class="rounded-xl overflow-hidden border" style="border-color:var(--border-p)">
            <img src="${b.image_url}" alt="${b.title||''}"
                class="w-full object-cover" style="height:120px;object-position:center"
                onerror="this.src='https://placehold.co/400x120/0e0e1c/9d4edd?text=Banner'">
            <div class="flex items-center justify-between px-3 py-2" style="background:var(--bg-card-2)">
                <div>
                    <p class="text-[11px] font-semibold" style="color:var(--text-primary)">${b.title || '(အမည်မဲ့)'}</p>
                    <p class="text-[9px]" style="color:var(--text-dim)">${new Date(b.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <button onclick="deleteBanner('${b.id}')"
                    class="compact-btn btn-danger px-3 py-1 text-[10px]">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`).join('');
}

async function uploadBannerFromUrl() {
    const urlEl   = document.getElementById('banner-url-input');
    const titleEl = document.getElementById('banner-title-input');
    const imgUrl  = urlEl?.value?.trim();
    const title   = titleEl?.value?.trim() || '';
    if (!imgUrl) { showToast('Image URL ထည့်ပါ', 'error'); return; }
    try {
        const { error } = await db.from('banners').insert({
            image_url: imgUrl, title, created_at: new Date().toISOString()
        });
        if (error) throw error;
        showToast('Banner ထည့်ပြီ! ✅', 'success');
        if (urlEl)   urlEl.value   = '';
        if (titleEl) titleEl.value = '';
        loadBanners();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}

async function deleteBanner(id) {
    if (!confirm('Banner ဖျက်မှာ သေချာပါသလား?')) return;
    try {
        const { error } = await db.from('banners').delete().eq('id', id);
        if (error) throw error;
        showToast('Banner ဖျက်ပြီ!', 'success');
        loadBanners();
    } catch(e) { showToast('မအောင်မြင်ပါ: ' + e.message, 'error'); }
}
