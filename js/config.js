const SUPABASE_URL = 'https://xjqrwcsxiaybpztzestb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqcXJ3Y3N4aWF5YnB6dHplc3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzQxMDksImV4cCI6MjA5NDM1MDEwOX0.Kn5sLOTBdNtlooaH-q8ml0cOEswMlgMTSP7GFe7mbxg';

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

// ── ImageKit CDN Config ─────────────────────────────────
const IMAGEKIT_PUBLIC_KEY   = 'public_5ANbrVB/DbJPPuwQHcEpBAhRM24=';
const IMAGEKIT_PRIVATE_KEY  = 'private_qfomcuJQOZryHrHciooDxysb5BY=';
const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/tdpebgueq';
const IMAGEKIT_UPLOAD_URL   = 'https://upload.imagekit.io/api/v1/files/upload';

async function uploadToImageKit(file, folder) {
    const ext      = file.name.split('.').pop().toLowerCase();
    const fileName = folder + '_' + Date.now() + '.' + ext;

    const formData = new FormData();
    formData.append('file',             file);
    formData.append('fileName',         fileName);
    formData.append('folder',           '/' + folder);
    formData.append('useUniqueFileName','false');

    const resp = await fetch(IMAGEKIT_UPLOAD_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + btoa(IMAGEKIT_PRIVATE_KEY + ':') },
        body: formData
    });

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || 'ImageKit upload မအောင်မြင်ပါ (HTTP ' + resp.status + ')');
    }

    const result = await resp.json();
    return result.url;
}