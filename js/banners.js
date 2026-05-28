// ═══════════════════════════════════════════════════════
//  BANNERS  —  ImageKit CDN upload + CRUD
// ═══════════════════════════════════════════════════════

async function loadBanners() {
    const el = document.getElementById('banner-list');
    if (!el) return;
    el.innerHTML = skeletonRows(3, 'h-28');
    try {
        const { data, error } = await db.from('banners').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        renderBanners(data || []);
        const cnt = document.getElementById('banner-count');
        if (cnt) cnt.textContent = (data || []).length;
    } catch(e) { el.innerHTML = errEl(e.message); }
}

function skeletonRows(n, h = 'h-12') {
    return Array(n).fill(0).map(() => `<div class="skeleton ${h} rounded-xl mb-2"></div>`).join('');
}
function errEl(msg) { return `<p class="text-rose-400 text-[11px] p-2">⚠ ${msg}</p>`; }

function renderBanners(banners) {
    const el = document.getElementById('banner-list');
    if (!el) return;
    if (!banners.length) {
        el.innerHTML = `<p class="text-center py-6 text-[11px]" style="color:var(--text-dim)">Banner မရှိသေးပါ — အပေါ်က Form မှ ထည့်ပါ</p>`;
        return;
    }
    el.innerHTML = banners.map(b => `
        <div class="rounded-xl overflow-hidden mb-2" style="border:1px solid var(--border-p)">
            <img src="${b.image_url}" alt="${b.title||''}"
                class="w-full object-cover" style="height:130px;object-position:center;display:block"
                onerror="this.src='https://placehold.co/400x130/000000/9d4edd?text=Banner'">
            <div class="flex items-center justify-between px-3 py-2.5" style="background:var(--bg-card-2)">
                <div class="flex-1 mr-2 min-w-0">
                    <p class="text-[12px] font-bold truncate" style="color:var(--text-primary)">${b.title || '(အမည်မဲ့)'}</p>
                    <p class="text-[9px]" style="color:var(--text-dim)">${new Date(b.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <button onclick="deleteBanner('${b.id}')"
                    class="compact-btn btn-danger px-3 py-2 text-[11px] flex-shrink-0">
                    <i class="fa-solid fa-trash mr-1"></i>ဖျက်
                </button>
            </div>
        </div>`).join('');
}

// ── FILE UPLOAD to ImageKit CDN ──────────────────────────
let bannerFileToUpload = null;

function onBannerFileChange(input) {
    const file = input.files[0];
    if (!file) return;
    bannerFileToUpload = file;
    const preview = document.getElementById('banner-preview');
    if (preview) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    }
    const label = document.getElementById('banner-upload-label');
    if (label) label.textContent = '📎 ' + file.name;
}

async function uploadBanner() {
    const titleEl = document.getElementById('banner-title-input');
    const title   = titleEl?.value?.trim() || '';

    if (!bannerFileToUpload) { showToast('Image ရွေးပါ', 'error'); return; }

    const btn = document.getElementById('banner-upload-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'တင်နေသည်...'; }

    try {
        // Upload to ImageKit CDN
        const publicUrl = await uploadToImageKit(bannerFileToUpload, 'banners');

        // Save URL to Supabase DB
        const { error: insErr } = await db.from('banners').insert({
            image_url: publicUrl, title, created_at: new Date().toISOString()
        });
        if (insErr) throw insErr;

        showToast('Banner ထည့်ပြီ ✅', 'success');
        bannerFileToUpload = null;
        if (titleEl) titleEl.value = '';
        const preview = document.getElementById('banner-preview');
        if (preview) { preview.style.display = 'none'; preview.src = ''; }
        const label = document.getElementById('banner-upload-label');
        if (label) label.textContent = '📁 Image ရွေးချယ်ပါ';
        const inp = document.getElementById('banner-file-input');
        if (inp) inp.value = '';
        loadBanners();
    } catch(e) {
        showToast('မအောင်မြင်ပါ: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Banner ထည့်မည်'; }
    }
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

// ── Panel open/close ─────────────────────────────────────
function openBannerPanel() {
    closeSidebar();
    const p = document.getElementById('panel-banners');
    if (p) { p.classList.add('open'); loadBanners(); }
}
function closeBannerPanel() {
    const p = document.getElementById('panel-banners');
    if (p) p.classList.remove('open');
}
