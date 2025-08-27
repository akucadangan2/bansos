let userRole = 'public';
let userRegionId = null;
let isAuthenticated = false;

async function fetchUserInfo() {
    try {
        console.log('Fetching user info from /api/user');
        const response = await fetch('/api/user', {
            headers: { 'X-Bypass-RBAC': 'true' }
        });
        if (!response.ok) throw new Error(`Failed to fetch user info: ${response.status}`);
        const user = await response.json();
        userRole = user.role;
        userRegionId = user.region_id;
        isAuthenticated = user.is_authenticated;
        console.log('User info loaded:', { role: userRole, region_id: userRegionId, is_authenticated: isAuthenticated });
        adjustUIForRole();
    } catch (error) {
        console.error('Error fetching user info:', error);
        userRole = 'public';
        isAuthenticated = false;
        adjustUIForRole();
    }
}

function adjustUIForRole() {
    console.log('Adjusting UI for role:', userRole, 'Authenticated:', isAuthenticated);
    const inputBtn = document.getElementById('input-btn');
    const poskoInputBtn = document.getElementById('posko-input-btn');
    const exportBtn = document.getElementById('export-btn');
    const filterBtn = document.getElementById('filter-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const poskoBtn = document.getElementById('posko-btn');
    const laporanBtn = document.getElementById('laporan-btn');
    const heatmapBtn = document.getElementById('heatmap-btn');
    const simpanBtn = document.getElementById('simpan-btn');
    const simpanPoskoBtn = document.getElementById('simpan-posko-btn');
    const editButtons = document.querySelectorAll('.edit-btn, [id*="edit"]');
    const deleteButtons = document.querySelectorAll('.delete-btn, [id*="delete"]');
    const submitDataBtn = document.getElementById('submit-data-btn');
    const reviewSubmissionsLink = document.getElementById('review-submissions-link');
    const accountLink = document.querySelector('a[href="/akun"]');
    const submissionsLink = document.querySelector('a[href="/auth?tab=submissions"]');

    if (!isAuthenticated) {
        console.log('User not authenticated, hiding interactive elements');
        if (inputBtn) inputBtn.style.display = 'none';
        if (poskoInputBtn) poskoInputBtn.style.display = 'none';
        if (exportBtn) exportBtn.style.display = 'none';
        if (filterBtn) filterBtn.style.display = 'block';
        if (dashboardBtn) dashboardBtn.style.display = 'block';
        if (poskoBtn) poskoBtn.style.display = 'none';
        if (laporanBtn) laporanBtn.style.display = 'block';
        if (heatmapBtn) heatmapBtn.style.display = 'block';
        if (simpanBtn) simpanBtn.style.display = 'none';
        if (simpanPoskoBtn) simpanPoskoBtn.style.display = 'none';
        editButtons.forEach(btn => btn.style.display = 'none');
        deleteButtons.forEach(btn => btn.style.display = 'none');
        if (submitDataBtn) submitDataBtn.style.display = 'none';
        if (reviewSubmissionsLink) reviewSubmissionsLink.style.display = 'none';
        if (accountLink) accountLink.style.display = 'none';
        if (submissionsLink) submissionsLink.style.display = 'none';
    } else if (userRole === 'public') {
        console.log('User is public, allowing input form but redirecting to submissions');
        if (inputBtn) inputBtn.style.display = 'block';
        if (poskoInputBtn) poskoInputBtn.style.display = 'none';
        if (exportBtn) exportBtn.style.display = 'none';
        if (filterBtn) filterBtn.style.display = 'block';
        if (dashboardBtn) dashboardBtn.style.display = 'block';
        if (poskoBtn) poskoBtn.style.display = 'none';
        if (laporanBtn) laporanBtn.style.display = 'block';
        if (heatmapBtn) heatmapBtn.style.display = 'block';
        if (simpanBtn) simpanBtn.style.display = 'block';
        if (simpanPoskoBtn) simpanPoskoBtn.style.display = 'none';
        editButtons.forEach(btn => btn.style.display = 'none');
        deleteButtons.forEach(btn => btn.style.display = 'none');
        if (submitDataBtn) submitDataBtn.style.display = 'none';
        if (reviewSubmissionsLink) reviewSubmissionsLink.style.display = 'none';
        if (accountLink) accountLink.style.display = 'block';
        if (submissionsLink) submissionsLink.style.display = 'block';
    } else if (userRole === 'admin') {
        console.log('User is admin, showing all elements');
        if (inputBtn) inputBtn.style.display = 'block';
        if (poskoInputBtn) poskoInputBtn.style.display = 'block';
        if (exportBtn) exportBtn.style.display = 'block';
        if (filterBtn) filterBtn.style.display = 'block';
        if (dashboardBtn) dashboardBtn.style.display = 'block';
        if (poskoBtn) poskoBtn.style.display = 'block';
        if (laporanBtn) laporanBtn.style.display = 'block';
        if (heatmapBtn) heatmapBtn.style.display = 'block';
        if (simpanBtn) simpanBtn.style.display = 'block';
        if (simpanPoskoBtn) simpanPoskoBtn.style.display = 'block';
        editButtons.forEach(btn => btn.style.display = 'block');
        deleteButtons.forEach(btn => btn.style.display = 'block');
        if (submitDataBtn) submitDataBtn.style.display = 'none';
        if (reviewSubmissionsLink) reviewSubmissionsLink.style.display = 'block';
        if (accountLink) accountLink.style.display = 'block';
        if (submissionsLink) submissionsLink.style.display = 'block';
    }

    // Modifikasi form input untuk pengguna public
    if (isAuthenticated && userRole === 'public' && simpanBtn) {
        const inputForm = document.getElementById('input-form');
        if (inputForm) {
            inputForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Public user submitting form, redirecting to /api/submissions');
                const formData = new FormData(inputForm);
                const data = {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [parseFloat(formData.get('latitude') || 0), parseFloat(formData.get('longitude') || 0)] },
                    properties: {
                        id: String(Date.now()),
                        nama: formData.get('lokasi_nama'),
                        alamat: formData.get('alamat'),
                        waktu_kejadian: formData.get('waktu_kejadian'),
                        jenis_bencana: formData.get('jenis_bencana'),
                        tingkat_keparahan: formData.get('tingkat_keparahan'),
                        luas_terdampak: parseFloat(formData.get('luas_terdampak') || 0),
                        kebutuhan_mendesak: formData.get('kebutuhan_mendesak'),
                        korban_meninggal: parseInt(formData.get('korban_meninggal') || 0),
                        korban_luka_berat: parseInt(formData.get('korban_luka_berat') || 0),
                        korban_luka_ringan: parseInt(formData.get('korban_luka_ringan') || 0),
                        korban_pengungsi: parseInt(formData.get('korban_pengungsi') || 0),
                        rumah_rusak_berat: parseInt(formData.get('rumah_rusak_berat') || 0),
                        rumah_rusak_sedang: parseInt(formData.get('rumah_rusak_sedang') || 0),
                        rumah_rusak_ringan: parseInt(formData.get('rumah_rusak_ringan') || 0),
                        fasilitas_umum: formData.get('fasilitas_umum')
                    }
                };
                try {
                    const response = await fetch('/api/submissions', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'X-Bypass-RBAC': 'true'
                        },
                        body: JSON.stringify({ data, feature_type: 'bencana' })
                    });
                    const result = await response.json();
                    if (response.ok) {
                        alert('Data berhasil diajukan untuk ditinjau.');
                        inputForm.reset();
                        document.getElementById('input-modal').classList.remove('active');
                    } else {
                        alert('Gagal mengajukan data: ' + result.error);
                    }
                } catch (error) {
                    console.error('Error submitting data:', error);
                    alert('Terjadi kesalahan saat mengajukan data.');
                }
            });
        }
    }

    // Blokir aksi edit/hapus untuk pengguna public/anonymous
    [poskoInputBtn, exportBtn, ...editButtons, ...deleteButtons, simpanPoskoBtn].forEach(btn => {
        if (btn && (!isAuthenticated || userRole === 'public')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Action blocked, redirecting to login');
                window.location.href = '/auth?tab=login';
            });
        }
    });
}

const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    console.log('Intercepted fetch to:', url);
    // Lewati intersepsi jika header X-Bypass-RBAC ada
    if (options.headers && options.headers['X-Bypass-RBAC'] === 'true') {
        console.log('Bypassing RBAC check due to X-Bypass-RBAC header');
        return originalFetch(url, options);
    }
    if (url.includes('/api/load')) {
        console.log('Invalid route /api/load, redirecting to correct load endpoint');
        const feature_type = window.location.pathname.split('/')[1] || 'penerima';
        url = `/api/${feature_type}/load`;
    }
    if (url.includes('/api/bencana/save') || url.includes('/api/fasilitas/save') || url.includes('/api/layanan/save') || url.includes('/api/penerima/save') || url.includes('/api/posko/save')) {
        if (!isAuthenticated) {
            console.log('Unauthorized fetch attempt, redirecting to login');
            window.location.href = '/auth?tab=login';
            return new Response(JSON.stringify({ error: 'Silakan login terlebih dahulu' }), { status: 401 });
        }
        if (userRole === 'public') {
            console.log('Public user fetch, redirecting to submission');
            const data = JSON.parse(options.body || '{}');
            const feature_type = url.split('/api/')[1].split('/')[0];
            const submissionResponse = await originalFetch('/api/submissions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Bypass-RBAC': 'true'
                },
                body: JSON.stringify({ data, feature_type })
            });
            return submissionResponse;
        }
        if (userRole === 'admin') {
            console.log('Admin fetch, allowing direct save');
            return originalFetch(url, options);
        }
    }
    if (url.includes('/api/bencana/delete') || url.includes('/api/fasilitas/delete') || url.includes('/api/layanan/delete') || url.includes('/api/penerima/delete')) {
        if (!isAuthenticated || userRole !== 'admin') {
            console.log('Unauthorized delete attempt');
            window.location.href = '/auth?tab=login';
            return new Response(JSON.stringify({ error: 'Hanya admin yang dapat menghapus data' }), { status: 403 });
        }
        console.log('Admin delete, allowing request');
        return originalFetch(url, options);
    }
    return originalFetch(url, options);
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('rbac.js loaded, initializing');
    fetchUserInfo();
});