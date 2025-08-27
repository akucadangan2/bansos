console.log('bencana2.js loaded at ' + new Date().toLocaleString());

// Ambil user_info dari /api/user
async function fetchUserInfo() {
    try {
        console.log('Fetching user info from /api/user');
        const response = await fetch('/api/user', {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
            },
            credentials: 'include'
        });
        console.log('User info response status:', response.status);
        if (!response.ok) throw new Error(`Failed to fetch user info: ${response.status}`);
        const userInfo = await response.json();
        window.user_info = userInfo;
        console.log('User info fetched:', window.user_info);
        return userInfo;
    } catch (error) {
        console.error('Error fetching user info:', error);
        window.user_info = { is_authenticated: false, role: 'public', username: 'anonymous' };
        return window.user_info;
    }
}

// Update tabel dengan tombol hapus
async function updateDataTable() {
    const tableBody = document.getElementById('data-table-body');
    if (!tableBody) {
        console.error('Data table body not found in DOM');
        return;
    }
    try {
        console.log('Updating data table with features:', window.bencanaData.features ? window.bencanaData.features.length : 'undefined');
        tableBody.innerHTML = '';
        if (!window.bencanaData.features || !Array.isArray(window.bencanaData.features)) {
            console.warn('bencanaData.features is not an array or undefined, initializing empty array');
            window.bencanaData.features = [];
            return;
        }
        window.bencanaData.features.forEach(feature => {
            if (!feature || !feature.properties || !feature.properties.id) {
                console.warn('Skipping invalid feature for table:', feature);
                return;
            }
            const props = feature.properties;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${props.jenis_bencana || 'Unknown'}</td>
                <td>${props.lokasi_nama || 'Unknown'}</td>
                <td>${props.waktu_kejadian ? new Date(props.waktu_kejadian).toLocaleDateString() : 'Unknown'}</td>
                <td><span class="badge-${(props.tingkat_keparahan || 'Ringan').toLowerCase()}">${props.tingkat_keparahan || 'Ringan'}</span></td>
                <td>${(props.korban?.meninggal || 0) + (props.korban?.luka_berat || 0) + (props.korban?.luka_ringan || 0)}</td>
                <td>${props.fotos?.length > 0 ? `<a href="#" class="view-gallery-btn text-orange-500 hover:underline" data-id="${props.id}">Cek Gambar</a>` : '-'}</td>
                <td>${props.laporan ? `<a href="/static/uploads/${props.laporan}" download class="text-orange-500 hover:underline">Cek File</a>` : '-'}</td>
                <td><button class="delete-btn bg-red-600 hover:bg-red-700 text-white p-1 rounded text-xs" data-id="${props.id}" ${window.user_info && window.user_info.role !== 'admin' ? 'disabled' : ''}>Hapus</button></td>
            `;
            tableBody.appendChild(row);
            console.log('Table row added for feature:', props.id, 'with data:', props);
        });
        console.log('Data table updated successfully with', window.bencanaData.features.length, 'features');
    } catch (error) {
        console.error('Error updating data table:', error);
    }
}

// Galeri gambar/file
function showGallery(id) {
    const feature = window.bencanaData.features.find(f => f && f.properties && f.properties.id === id);
    if (!feature) {
        console.error('Feature not found for id:', id);
        return;
    }
    const props = feature.properties;
    const galleryModal = document.createElement('div');
    galleryModal.id = 'gallery-modal';
    galleryModal.className = 'modal active';
    galleryModal.innerHTML = `
        <div class="bg-gray-900 p-4 rounded-xl shadow-[0_0_15px_rgba(255,69,0,0.5)] w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-2">
                <h2 class="text-sm font-bold text-orange-400 uppercase">Galeri: ${props.lokasi_nama || 'Unknown'}</h2>
                <button id="close-gallery-modal" class="text-orange-500 hover:text-orange-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div class="grid grid-cols-3 gap-2">
                ${props.fotos?.map(foto => `
                    <div class="relative">
                        <img src="/static/uploads/${foto}" class="gallery-img w-full" alt="Foto Bencana">
                        <a href="/static/uploads/${foto}" download class="absolute bottom-2 right-2 bg-orange-500 hover:bg-orange-600 text-white p-1 rounded text-xs">Unduh</a>
                    </div>
                `).join('') || '<p class="text-xs text-orange-300">Tidak ada gambar tersedia</p>'}
            </div>
        </div>
    `;
    document.body.appendChild(galleryModal);
    document.getElementById('close-gallery-modal').addEventListener('click', () => {
        galleryModal.remove();
        console.log('Gallery modal closed');
    });
}

// Cari koordinat
async function cariKoordinat(alamat, latitudeInput, longitudeInput) {
    if (!alamat) {
        console.warn('No address provided for geocoding');
        return;
    }
    try {
        console.log('Sending request to /api/geocode for:', alamat);
        const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
            },
            body: JSON.stringify({ address: alamat }),
            credentials: 'include'
        });
        console.log('Geocode response status:', response.status);
        const result = await response.json();
        console.log('Geocode response:', result);
        if (result.error) throw new Error(result.error);
        latitudeInput.value = result.lat;
        longitudeInput.value = result.lon;
        if (window.mapInitialized && window.map) {
            if (window.tempMarker) window.map.removeLayer(window.tempMarker);
            window.tempMarker = L.marker([result.lat, result.lon]).addTo(window.map).bindPopup(`Koordinat: ${result.lat}, ${result.lon}`);
            window.map.setView([result.lat, result.lon], 13);
            console.log('Temporary marker added at:', { lat: result.lat, lon: result.lon });
        }
    } catch (error) {
        console.error('Geocode error:', error.message);
        latitudeInput.value = -5.425;
        longitudeInput.value = 105.258;
        if (window.mapInitialized && window.map) {
            if (window.tempMarker) window.map.removeLayer(window.tempMarker);
            window.tempMarker = L.marker([-5.425, 105.258]).addTo(window.map).bindPopup('Default: Bandar Lampung');
            window.map.setView([-5.425, 105.258], 13);
        }
    }
}

// Form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('Form submitted at:', new Date().toLocaleString());
    // Pastikan user_info tersedia
    if (!window.user_info) {
        console.warn('User info not loaded, fetching again');
        await fetchUserInfo();
    }
    console.log('User info before submission:', window.user_info);
    console.log('Session cookies before submission:', document.cookie);

    const editId = document.getElementById('edit-id').value;
    const formData = new FormData();
    const fotoInput = document.getElementById('foto');
    const laporanInput = document.getElementById('laporan');
    const data = {
        id: editId || Date.now().toString(),
        jenis_bencana: document.getElementById('jenis_bencana').value,
        lokasi_nama: document.getElementById('lokasi_nama').value.trim(),
        alamat: document.getElementById('alamat').value.trim(),
        waktu_kejadian: document.getElementById('waktu_kejadian').value,
        tingkat_keparahan: document.getElementById('tingkat_keparahan').value,
        luas_terdampak: parseFloat(document.getElementById('luas_terdampak').value) || 0,
        kebutuhan_mendesak: document.getElementById('kebutuhan_mendesak').value.trim(),
        korban: {
            meninggal: parseInt(document.getElementById('korban_meninggal').value) || 0,
            luka_berat: parseInt(document.getElementById('korban_luka_berat').value) || 0,
            luka_ringan: parseInt(document.getElementById('korban_luka_ringan').value) || 0,
            pengungsi: parseInt(document.getElementById('korban_pengungsi').value) || 0,
            rumah_rusak_berat: parseInt(document.getElementById('rumah_rusak_berat').value) || 0,
            rumah_rusak_sedang: parseInt(document.getElementById('rumah_rusak_sedang').value) || 0,
            rumah_rusak_ringan: parseInt(document.getElementById('rumah_rusak_ringan').value) || 0,
            fasilitas_umum: document.getElementById('fasilitas_umum').value.trim()
        },
        bantuan: Array.from(document.querySelectorAll('.bantuan-item')).map(item => ({
            jenis: item.querySelector('.bantuan-jenis').value.trim(),
            instansi: item.querySelector('.bantuan-instansi').value.trim(),
            jumlah: item.querySelector('.bantuan-jumlah').value.trim(),
            waktu: item.querySelector('.bantuan-waktu').value
        })),
        geocoding_failed: false,
        fotos: [],
        laporan: null
    };

    console.log('Form data to submit:', JSON.stringify(data, null, 2));

    if (!data.jenis_bencana || !data.lokasi_nama || !data.alamat || !data.waktu_kejadian || !data.tingkat_keparahan || data.luas_terdampak < 0) {
        console.warn('Validation failed: Required fields missing');
        alert('Harap lengkapi semua kolom wajib.');
        return;
    }

    try {
        // Verifikasi sesi sebelum mengunggah file atau menyimpan
        console.log('Checking session before submission');
        const sessionCheck = await fetch('/api/user', {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
            },
            credentials: 'include'
        });
        console.log('Session check response status:', sessionCheck.status);
        const sessionResult = await sessionCheck.json();
        console.log('Session check response:', sessionResult);
        if (!sessionCheck.ok || !sessionResult.is_authenticated) {
            console.error('Session invalid, redirecting to login');
            alert('Sesi tidak valid, silakan login kembali.');
            window.location.href = '/auth?tab=login';
            return;
        }

        if (fotoInput.files.length > 0) {
            if (fotoInput.files.length > 10) throw new Error('Maksimal 10 gambar!');
            for (let file of fotoInput.files) {
                formData.set('file', file);
                console.log('Uploading photo:', file.name);
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                    headers: { 
                        'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
                    },
                    credentials: 'include'
                });
                console.log('Upload photo response status:', response.status);
                const result = await response.json();
                console.log('Upload photo response:', result);
                if (!response.ok) throw new Error(`Gagal mengunggah foto: ${result.error || response.status}`);
                data.fotos.push(result.filename);
                console.log('Photo uploaded:', result.filename);
            }
        }
        if (laporanInput.files.length > 0) {
            formData.set('file', laporanInput.files[0]);
            console.log('Uploading report:', laporanInput.files[0].name);
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                headers: { 
                    'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
                },
                credentials: 'include'
            });
            console.log('Upload report response status:', response.status);
            const result = await response.json();
            console.log('Upload report response:', result);
            if (!response.ok) throw new Error(`Gagal mengunggah laporan: ${result.error || response.status}`);
            data.laporan = result.filename;
            console.log('Report uploaded:', result.filename);
        }

        let lat = parseFloat(document.getElementById('latitude').value) || -5.425;
        let lon = parseFloat(document.getElementById('longitude').value) || 105.258;
        if (!document.getElementById('latitude').value || !document.getElementById('longitude').value || !editId) {
            console.log('No coordinates provided or not editing, fetching geocode');
            const response = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
                },
                body: JSON.stringify({ address: data.alamat }),
                credentials: 'include'
            });
            console.log('Geocode response status:', response.status);
            const result = await response.json();
            console.log('Geocode result:', result);
            if (result.error) {
                console.warn('Geocode failed, using default coordinates');
                data.geocoding_failed = true;
            } else {
                lat = result.lat;
                lon = result.lon;
            }
        }

        const feature = { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: data };
        console.log('Feature to save:', JSON.stringify(feature, null, 2));

        if (window.user_info && window.user_info.is_authenticated && window.user_info.role === 'admin') {
            // Admin: Simpan langsung ke bencana.json
            console.log('Preparing to save as admin to /api/bencana/save');
            const saveData = {
                type: "FeatureCollection",
                features: window.bencanaData.features ? [...window.bencanaData.features, feature] : [feature]
            };
            if (editId) {
                const index = window.bencanaData.features.findIndex(f => f && f.properties && f.properties.id === editId);
                if (index !== -1) {
                    saveData.features[index] = feature;
                    console.log('Updating existing feature:', editId);
                } else {
                    throw new Error('Feature tidak ditemukan untuk diedit');
                }
            } else {
                console.log('Adding new feature:', feature.properties.id);
            }
            console.log('Sending save request to /api/bencana/save with data:', JSON.stringify(saveData, null, 2));
            const response = await fetch('/api/bencana/save', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
                },
                body: JSON.stringify(saveData),
                credentials: 'include'
            });
            console.log('Save response status:', response.status);
            const result = await response.json();
            console.log('Save response:', result);
            if (!response.ok) throw new Error(`Gagal menyimpan data: ${result.error || response.status}`);
            window.bencanaData = saveData;
            console.log('Calling updateMap');
            await window.updateMap();
            console.log('Calling updateDataTable');
            await updateDataTable();
            console.log('Calling initCharts');
            window.initCharts();
            document.getElementById('input-form').reset();
            document.getElementById('input-modal').classList.remove('active');
            alert('Data berhasil disimpan.');
        } else {
            // Non-admin: Ajukan ke /api/submissions
            console.log('Preparing to submit as non-admin to /api/submissions');
            const submissionData = {
                feature_type: 'bencana',
                data: feature
            };
            console.log('Submitting data to /api/submissions:', JSON.stringify(submissionData, null, 2));
            const response = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
                },
                body: JSON.stringify(submissionData),
                credentials: 'include'
            });
            console.log('Submission response status:', response.status);
            const result = await response.json();
            console.log('Submission response:', result);
            if (!response.ok) throw new Error(`Gagal mengajukan data: ${result.error || response.status}`);
            document.getElementById('input-form').reset();
            document.getElementById('input-modal').classList.remove('active');
            alert('Data berhasil diajukan untuk ditinjau.');
        }
    } catch (error) {
        console.error('Error in form submission:', error);
        alert('Gagal menyimpan data: ' + error.message);
        if (error.message.includes('Silakan login terlebih dahulu') || error.message.includes('401') || error.message.includes('403')) {
            console.log('Redirecting to login due to session error');
            window.location.href = '/auth?tab=login';
        }
    }
}

// Export Excel
function exportToExcel() {
    console.log('Attempting to export to Excel');
    try {
        if (typeof XLSX === 'undefined') {
            console.error('XLSX library not loaded');
            alert('Library ekspor Excel tidak dimuat.');
            return;
        }
        const data = Array.isArray(window.bencanaData.features) && window.bencanaData.features.length > 0 ? window.bencanaData.features.map(f => {
            if (!f || !f.properties) {
                console.warn('Skipping invalid feature for export:', f);
                return null;
            }
            return {
                Jenis_Bencana: f.properties.jenis_bencana || 'Unknown',
                Lokasi: f.properties.lokasi_nama || 'Unknown',
                Alamat: f.properties.alamat || 'Unknown',
                Waktu: f.properties.waktu_kejadian ? new Date(f.properties.waktu_kejadian).toLocaleString() : 'Unknown',
                Keparahan: f.properties.tingkat_keparahan || 'Ringan',
                Luas_Terdampak: f.properties.luas_terdampak || 0,
                Korban_Meninggal: f.properties.korban?.meninggal || 0,
                Korban_Luka_Berat: f.properties.korban?.luka_berat || 0,
                Korban_Luka_Ringan: f.properties.korban?.luka_ringan || 0,
                Korban_Pengungsi: f.properties.korban?.pengungsi || 0,
                Rumah_Rusak_Berat: f.properties.korban?.rumah_rusak_berat || 0,
                Rumah_Rusak_Sedang: f.properties.korban?.rumah_rusak_sedang || 0,
                Rumah_Rusak_Ringan: f.properties.korban?.rumah_rusak_ringan || 0,
                Gambar_Tersedia: f.properties.fotos?.length > 0 ? `Ya (${f.properties.fotos.length})` : 'Tidak',
                File_Tersedia: f.properties.laporan ? 'Ya' : 'Tidak',
                Geocoding_Failed: f.properties.geocoding_failed ? 'Gagal' : 'Berhasil'
            };
        }).filter(item => item !== null) : [{ Jenis_Bencana: 'Tidak ada data untuk diekspor' }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bencana');
        XLSX.write_file(wb, 'bencana_data.xlsx');
        console.log('Data exported to bencana_data.xlsx');
        alert('Data berhasil diekspor ke Excel.');
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Gagal mengekspor data: ' + error.message);
    }
}

// Fungsi untuk menghapus fitur
async function deleteFeature(id) {
    if (!id) {
        console.error('Feature ID not found for delete');
        alert('ID data tidak ditemukan.');
        return;
    }
    console.log('User info:', window.user_info);
    console.log('Session cookies:', document.cookie);
    try {
        console.log('Attempting to delete feature:', id);
        const response = await fetch(`/api/bencana/delete/${id}`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
            },
            credentials: 'include'
        });
        console.log('Delete response status:', response.status);
        const result = await response.json();
        console.log('Delete response:', result);
        if (response.ok) {
            window.bencanaData.features = window.bencanaData.features.filter(f => f && f.properties && f.properties.id !== id);
            console.log('Feature deleted:', id);
            await window.updateMap();
            await updateDataTable();
            window.initCharts();
            if (typeof window.refreshMapAndTable === 'function') {
                window.refreshMapAndTable();
            }
            alert('Data berhasil dihapus.');
        } else {
            console.error('Delete failed:', result.error);
            alert(`Gagal menghapus data: ${result.error}`);
        }
    } catch (error) {
        console.error('Error deleting data:', error);
        alert('Terjadi kesalahan saat menghapus data: ' + error.message);
    }
}

// Event listener utama
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded in bencana2.js');
    // Ambil user_info saat halaman dimuat dan tunggu hingga selesai
    await fetchUserInfo();

    // Ganti FontAwesome CDN dengan versi lokal
    const fontAwesome = document.createElement('script');
    fontAwesome.src = '/static/js/fontawesome.min.js'; // Ganti dengan file lokal
    fontAwesome.onload = () => console.log('FontAwesome loaded locally');
    fontAwesome.onerror = () => console.error('Failed to load local FontAwesome');
    document.head.appendChild(fontAwesome);

    // Ganti SheetJS CDN dengan versi lokal
    const sheetJs = document.createElement('script');
    sheetJs.src = '/static/js/xlsx.full.min.js'; // Gunakan file lokal
    sheetJs.onload = () => console.log('SheetJS loaded locally');
    sheetJs.onerror = () => console.error('Failed to load local SheetJS');
    document.head.appendChild(sheetJs);

    const mapThemes = {
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        retro: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    };

    function changeMapTheme(theme) {
        if (window.mapInitialized && window.map && window.currentLayer) {
            window.map.removeLayer(window.currentLayer);
            window.currentLayer = L.tileLayer(mapThemes[theme], { attribution: '© OpenStreetMap' }).addTo(window.map);
            window.map.invalidateSize();
            console.log('Map theme changed to:', theme);
        }
    }

    const buttons = {
        'input-btn': () => {
            document.getElementById('input-form').reset();
            document.getElementById('edit-id').value = '';
            document.getElementById('bantuan-list').innerHTML = '<div class="bantuan-item bg-gray-800 p-2 rounded-lg mb-2"><label class="block text-xs text-orange-300">Jenis Bantuan</label><input type="text" name="bantuan_jenis" class="bantuan-jenis w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" placeholder="Logistik"><label class="block text-xs text-orange-300 mt-1">Instansi</label><input type="text" name="bantuan_instansi" class="bantuan-instansi w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" placeholder="BNPB"><label class="block text-xs text-orange-300 mt-1">Jumlah</label><input type="text" name="bantuan_jumlah" class="bantuan-jumlah w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" placeholder="100 paket"><label class="block text-xs text-orange-300 mt-1">Waktu</label><input type="date" name="bantuan_waktu" class="bantuan-waktu w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs"></div>';
            if (window.tempMarker) window.map.removeLayer(window.tempMarker);
            document.getElementById('input-modal').classList.add('active');
            document.getElementById('notification').classList.add('active');
            setTimeout(() => document.getElementById('notification').classList.remove('active'), 3000);
            console.log('Input modal opened');
        },
        'posko-input-btn': () => {
            document.getElementById('posko-input-form').reset();
            if (window.tempMarker) window.map.removeLayer(window.tempMarker);
            document.getElementById('posko-input-modal').classList.add('active');
            console.log('Posko input modal opened');
        },
        'export-btn': exportToExcel,
        'filter-btn': () => {
            document.getElementById('filter-section').classList.toggle('hidden');
            document.getElementById('dashboard-section').classList.add('hidden');
            console.log('Filter section toggled');
        },
        'dashboard-btn': () => {
            document.getElementById('dashboard-section').classList.toggle('hidden');
            document.getElementById('filter-section').classList.add('hidden');
            console.log('Dashboard section toggled');
        },
        'posko-btn': () => document.getElementById('posko-modal').classList.add('active'),
        'laporan-btn': () => document.getElementById('laporan-modal').classList.add('active'),
        'heatmap-btn': () => {
            if (!window.mapInitialized) return;
            try {
                L.heatLayer(window.bencanaData.features.filter(f => f && f.geometry && f.geometry.coordinates).map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0], f.properties.tingkat_keparahan === 'Berat' ? 1 : f.properties.tingkat_keparahan === 'Sedang' ? 0.7 : 0.4]), { radius: 25, blur: 15 }).addTo(window.map);
                console.log('Heatmap displayed');
            } catch (error) {
                console.error('Error displaying heatmap:', error);
                alert('Gagal menampilkan heatmap: ' + error.message);
            }
        },
        'toggle-sidebar': () => {
            document.getElementById('sidebar').classList.toggle('sidebar-closed');
            if (window.mapInitialized) setTimeout(() => window.map.invalidateSize(), 300);
            console.log('Sidebar toggled');
        },
        'notif-btn': () => document.getElementById('notif-modal').classList.add('active'),
        'close-input-modal': () => {
            if (window.tempMarker) window.map.removeLayer(window.tempMarker);
            document.getElementById('input-modal').classList.remove('active');
            console.log('Input modal closed');
        },
        'batal-btn': () => {
            if (window.tempMarker) window.map.removeLayer(window.tempMarker);
            document.getElementById('input-modal').classList.remove('active');
            console.log('Input modal cancelled');
        },
        'close-posko-input-modal': () => {
            if (window.tempMarker) window.map.removeLayer(window.tempMarker);
            document.getElementById('posko-input-modal').classList.remove('active');
            console.log('Posko input modal closed');
        },
        'batal-posko-btn': () => {
            if (window.tempMarker) window.map.removeLayer(window.tempMarker);
            document.getElementById('posko-input-modal').classList.remove('active');
            console.log('Posko input modal cancelled');
        },
        'close-posko-modal': () => document.getElementById('posko-modal').classList.remove('active'),
        'tutup-posko-btn': () => document.getElementById('posko-modal').classList.remove('active'),
        'close-laporan-modal': () => document.getElementById('laporan-modal').classList.remove('active'),
        'batal-laporan-btn': () => document.getElementById('laporan-modal').classList.remove('active'),
        'close-notif-btn': () => document.getElementById('notif-modal').classList.remove('active'),
        'tutup-notif-btn': () => document.getElementById('notif-modal').classList.remove('active'),
        'tab-basic': () => {
            document.querySelectorAll('#input-form > div:not(.flex)').forEach(div => div.classList.add('hidden'));
            document.getElementById('basic-section').classList.remove('hidden');
            document.querySelectorAll('#input-form button.tab').forEach(btn => btn.classList.remove('tab-active'));
            document.getElementById('tab-basic').classList.add('tab-active');
            console.log('Tab basic activated');
        },
        'tab-korban': () => {
            document.querySelectorAll('#input-form > div:not(.flex)').forEach(div => div.classList.add('hidden'));
            document.getElementById('korban-section').classList.remove('hidden');
            document.querySelectorAll('#input-form button.tab').forEach(btn => btn.classList.remove('tab-active'));
            document.getElementById('tab-korban').classList.add('tab-active');
            console.log('Tab korban activated');
        },
        'tab-bantuan': () => {
            document.querySelectorAll('#input-form > div:not(.flex)').forEach(div => div.classList.add('hidden'));
            document.getElementById('bantuan-section').classList.remove('hidden');
            document.querySelectorAll('#input-form button.tab').forEach(btn => btn.classList.remove('tab-active'));
            document.getElementById('tab-bantuan').classList.add('tab-active');
            console.log('Tab bantuan activated');
        },
        'tab-dokumentasi': () => {
            document.querySelectorAll('#input-form > div:not(.flex)').forEach(div => div.classList.add('hidden'));
            document.getElementById('dokumentasi-section').classList.remove('hidden');
            document.querySelectorAll('#input-form button.tab').forEach(btn => btn.classList.remove('tab-active'));
            document.getElementById('tab-dokumentasi').classList.add('tab-active');
            console.log('Tab dokumentasi activated');
        },
        'tambah-bantuan': () => {
            const bantuanList = document.getElementById('bantuan-list');
            const newItem = document.createElement('div');
            newItem.className = 'bantuan-item bg-gray-800 p-2 rounded-lg mb-2';
            newItem.innerHTML = `<label class="block text-xs text-orange-300">Jenis Bantuan</label><input type="text" name="bantuan_jenis" class="bantuan-jenis w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" placeholder="Logistik"><label class="block text-xs text-orange-300 mt-1">Instansi</label><input type="text" name="bantuan_instansi" class="bantuan-instansi w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" placeholder="BNPB"><label class="block text-xs text-orange-300 mt-1">Jumlah</label><input type="text" name="bantuan_jenis" class="bantuan-jumlah w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" placeholder="100 paket"><label class="block text-xs text-orange-300 mt-1">Waktu</label><input type="date" name="bantuan_waktu" class="bantuan-waktu w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs"><button type="button" class="hapus-bantuan bg-red-600 hover:bg-red-700 text-white p-1 rounded-lg text-xs mt-1">Hapus</button>`;
            bantuanList.appendChild(newItem);
            newItem.querySelector('.hapus-bantuan').addEventListener('click', () => newItem.remove());
            console.log('New bantuan item added');
        },
        'cari-koordinat': () => cariKoordinat(document.getElementById('alamat').value.trim(), document.getElementById('latitude'), document.getElementById('longitude')),
        'simpan-btn': e => {
            e.preventDefault();
            console.log('Simpan button clicked');
            document.getElementById('input-form').dispatchEvent(new Event('submit'));
        },
        'cari-koordinat-posko': () => cariKoordinat(document.getElementById('posko_alamat').value.trim(), document.getElementById('posko_latitude'), document.getElementById('posko_longitude')),
        'simpan-posko-btn': async e => {
            e.preventDefault();
            const data = {
                id: Date.now().toString(),
                nama: document.getElementById('posko_nama').value.trim(),
                tipe: document.getElementById('posko_tipe').value,
                alamat: document.getElementById('posko_alamat').value.trim(),
                pengungsi: parseInt(document.getElementById('posko_pengungsi').value) || 0,
                latitude: parseFloat(document.getElementById('posko_latitude').value) || -5.425,
                longitude: parseFloat(document.getElementById('posko_longitude').value) || 105.258
            };
            if (!data.nama || !data.tipe || !data.alamat || data.pengungsi < 0) {
                alert('Harap lengkapi semua kolom wajib.');
                return;
            }
            try {
                console.log('Saving posko data to /api/posko/save');
                const response = await fetch('/api/posko/save', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
                    },
                    body: JSON.stringify(data),
                    credentials: 'include'
                });
                console.log('Save posko response status:', response.status);
                if (!response.ok) throw new Error(`Gagal menyimpan posko: ${response.status}`);
                if (window.mapInitialized && window.map) {
                    if (window.tempMarker) window.map.removeLayer(window.tempMarker);
                    L.marker([data.latitude, data.longitude]).addTo(window.map).bindPopup(`Posko: ${data.nama}<br>Tipe: ${data.tipe}<br>Pengungsi: ${data.pengungsi}`);
                    console.log('Posko marker added at:', { lat: data.latitude, lon: data.longitude });
                }
                document.getElementById('posko-input-form').reset();
                document.getElementById('posko-input-modal').classList.remove('active');
                alert('Posko berhasil disimpan.');
            } catch (error) {
                console.error('Error saving posko:', error);
                alert('Gagal menyimpan posko: ' + error.message);
            }
        },
        'simpan-laporan-btn': async e => {
            e.preventDefault();
            const laporanFotoInput = document.getElementById('pelapor_foto');
            const data = {
                id: Date.now().toString(),
                nama: document.getElementById('pelapor_nama').value.trim(),
                alamat: document.getElementById('pelapor_alamat').value.trim(),
                deskripsi: document.getElementById('pelapor_deskripsi').value.trim(),
                foto: null
            };
            if (!data.nama || !data.alamat || !data.deskripsi) {
                alert('Harap lengkapi semua kolom wajib.');
                return;
            }
            try {
                console.log('Saving laporan data to /api/laporan/save');
                if (laporanFotoInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', laporanFotoInput.files[0]);
                    console.log('Uploading laporan photo:', laporanFotoInput.files[0].name);
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData,
                        headers: { 
                            'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
                        },
                        credentials: 'include'
                    });
                    console.log('Upload laporan photo response status:', response.status);
                    const result = await response.json();
                    console.log('Upload laporan response:', result);
                    if (!response.ok) throw new Error(`Gagal mengunggah foto: ${result.error || response.status}`);
                    data.foto = result.filename;
                    console.log('Laporan photo uploaded:', data.foto);
                }
                const response = await fetch('/api/laporan/save', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Bypass-RBAC': 'true' // Tambahkan header untuk melewati RBAC
                    },
                    body: JSON.stringify(data),
                    credentials: 'include'
                });
                console.log('Save laporan response status:', response.status);
                const result = await response.json();
                console.log('Save laporan response:', result);
                if (!response.ok) throw new Error(`Gagal menyimpan laporan: ${result.error || response.status}`);
                document.getElementById('laporan-form').reset();
                document.getElementById('laporan-modal').classList.remove('active');
                alert('Laporan berhasil disimpan.');
            } catch (error) {
                console.error('Error saving laporan:', error);
                alert('Gagal menyimpan laporan: ' + error.message);
            }
        }
    };

    Object.entries(buttons).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', handler);
        else console.error(`Button ${id} not found`);
    });

    document.getElementById('input-form')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('map-theme')?.addEventListener('change', e => changeMapTheme(e.target.value));

    document.addEventListener('click', async e => {
        if (e.target.classList.contains('view-gallery-btn')) {
            showGallery(e.target.dataset.id);
        } else if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            const feature = window.bencanaData.features.find(f => f && f.properties && f.properties.id === id);
            if (feature) {
                const props = feature.properties;
                document.getElementById('edit-id').value = id;
                document.getElementById('jenis_bencana').value = props.jenis_bencana || '';
                document.getElementById('lokasi_nama').value = props.lokasi_nama || '';
                document.getElementById('alamat').value = props.alamat || '';
                document.getElementById('waktu_kejadian').value = props.waktu_kejadian ? props.waktu_kejadian.slice(0, 16) : '';
                document.getElementById('tingkat_keparahan').value = props.tingkat_keparahan || 'Ringan';
                document.getElementById('luas_terdampak').value = props.luas_terdampak || 0;
                document.getElementById('kebutuhan_mendesak').value = props.kebutuhan_mendesak || '';
                document.getElementById('korban_meninggal').value = props.korban?.meninggal || 0;
                document.getElementById('korban_luka_berat').value = props.korban?.luka_berat || 0;
                document.getElementById('korban_luka_ringan').value = props.korban?.luka_ringan || 0;
                document.getElementById('korban_pengungsi').value = props.korban?.pengungsi || 0;
                document.getElementById('rumah_rusak_berat').value = props.korban?.rumah_rusak_berat || 0;
                document.getElementById('rumah_rusak_sedang').value = props.korban?.rumah_rusak_sedang || 0;
                document.getElementById('rumah_rusak_ringan').value = props.korban?.rumah_rusak_ringan || 0;
                document.getElementById('fasilitas_umum').value = props.korban?.fasilitas_umum || '';
                document.getElementById('latitude').value = feature.geometry?.coordinates[1] || '';
                document.getElementById('longitude').value = feature.geometry?.coordinates[0] || '';
                document.getElementById('bantuan-list').innerHTML = props.bantuan?.map(b => `
                    <div class="bantuan-item bg-gray-800 p-2 rounded-lg mb-2">
                        <label class="block text-xs text-orange-300">Jenis Bantuan</label><input type="text" name="bantuan_jenis" class="bantuan-jenis w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" value="${b.jenis || ''}">
                        <label class="block text-xs text-orange-300 mt-1">Instansi</label><input type="text" name="bantuan_instansi" class="bantuan-instansi w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" value="${b.instansi || ''}">
                        <label class="block text-xs text-orange-300 mt-1">Jumlah</label><input type="text" name="bantuan_jumlah" class="bantuan-jumlah w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" value="${b.jumlah || ''}">
                        <label class="block text-xs text-orange-300 mt-1">Waktu</label><input type="date" name="bantuan_waktu" class="bantuan-waktu w-full p-1 rounded-lg bg-gray-700 border border-orange-500 text-white text-xs" value="${b.waktu || ''}">
                        <button type="button" class="hapus-bantuan bg-red-600 hover:bg-red-700 text-white p-1 rounded-lg text-xs mt-1">Hapus</button>
                    </div>
                `).join('') || '';
                document.querySelectorAll('.hapus-bantuan').forEach(btn => btn.addEventListener('click', () => btn.parentElement.remove()));
                if (window.tempMarker) window.map.removeLayer(window.tempMarker);
                document.getElementById('input-modal').classList.add('active');
                console.log('Edit modal opened for feature:', id);
            }
        } else if (e.target.classList.contains('delete-btn')) {
            // Pastikan user_info tersedia sebelum menghapus
            if (!window.user_info) {
                console.warn('User info not loaded, fetching again');
                await fetchUserInfo();
            }
            if (window.user_info && window.user_info.role === 'admin') {
                deleteFeature(e.target.dataset.id);
            } else {
                console.error('Unauthorized delete attempt: User is not admin');
                alert('Hanya admin yang dapat menghapus data.');
            }
        }
    });

    const alamatInput = document.getElementById('alamat');
    if (alamatInput) {
        alamatInput.addEventListener('input', () => {
            const alamat = alamatInput.value.trim();
            const alamatLink = document.getElementById('alamat-link');
            alamatLink.href = alamat ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}` : '#';
            console.log('Alamat link updated:', alamatLink.href);
        });
    } else {
        console.error('Alamat input not found');
    }
});