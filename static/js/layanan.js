console.log('layanan.js loaded at ' + new Date().toLocaleString());

// Ambil user_info dari /api/user
async function fetchUserInfo() {
    try {
        console.log('Fetching user info from /api/user');
        const response = await fetch('/api/user', {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
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

// Load data dari server
async function loadData() {
    try {
        console.log('Loading data from /api/layanan/load');
        const response = await fetch('/api/layanan/load', {
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        console.log('Loaded data:', data);
        if (data.type === 'FeatureCollection') {
            window.layananData.features = [...window.layananData.features, ...data.features];
        }
        updateDataDisplay();
        updateMap();
    } catch (e) {
        console.error('Load error:', e);
        console.log('Using hardcoded dummy data');
        updateDataDisplay();
        updateMap();
    }
}

// Parse alamat untuk mendapatkan provinsi, kab_kota, kecamatan, desa
function parseAlamat(alamat) {
    const parts = alamat.split(',').map(part => part.trim());
    let desa = '', kecamatan = '', kab_kota = '', provinsi = '';
    if (parts.length >= 4) {
        desa = parts[0];
        kecamatan = parts[1].replace(/^Kec\.?\s*/i, '');
        kab_kota = parts[2].replace(/^Kab\.?\s*/i, '').replace(/^Kota\s*/i, '');
        provinsi = parts[3];
    } else if (parts.length === 3) {
        kecamatan = parts[0].replace(/^Kec\.?\s*/i, '');
        kab_kota = parts[1].replace(/^Kab\.?\s*/i, '').replace(/^Kota\s*/i, '');
        provinsi = parts[2];
    } else if (parts.length === 2) {
        kab_kota = parts[0].replace(/^Kec\.?\s*/i, '').replace(/^Kota\s*/i, '');
        provinsi = parts[1];
    } else {
        provinsi = alamat;
    }
    return { desa: desa || kecamatan, kecamatan, kab_kota, provinsi };
}

// Update peta
function updateMap(filterJenis = '', filterProvinsi = '') {
    console.log('Updating map:', filterJenis, filterProvinsi, window.layananData.features.length);
    window.layananMarkers.clearLayers();
    window.layananLayer.clearLayers();
    if (window.heatmapLayer) window.map.removeLayer(window.heatmapLayer);
    const filteredData = {
        type: 'FeatureCollection',
        features: window.layananData.features.filter(f => {
            const jenisMatch = !filterJenis || f.properties.jenis_program === filterJenis;
            const provinsiMatch = !filterProvinsi || f.properties.lokasi.provinsi === filterProvinsi;
            return jenisMatch && provinsiMatch;
        })
    };
    console.log('Filtered features:', filteredData.features);
    if (window.isHeatmapActive) {
        window.heatmapLayer = L.heatLayer(
            filteredData.features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0], f.properties.peserta / 50]),
            { radius: 25, blur: 15 }
        ).addTo(window.map);
    } else {
        window.layananLayer.addData(filteredData);
        window.layananMarkers.addLayer(window.layananLayer);
        window.map.addLayer(window.layananMarkers);
    }
    const validFeatures = filteredData.features.filter(f => f.geometry.coordinates[0] !== 0);
    if (validFeatures.length) {
        window.map.fitBounds(
            L.latLngBounds(validFeatures.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]])),
            { padding: [50, 50] }
        );
    }
}

// Update tabel dan grafik
async function updateDataDisplay() {
    if (!window.user_info) {
        console.warn('User info not loaded before rendering table, fetching now');
        await fetchUserInfo();
    }
    console.log('Updating display:', window.layananData.features.length);
    const jenisCounts = { 'Pelatihan': 0, 'UMKM': 0, 'Posyandu': 0 };
    let pesertaCount = 0;
    let aktifCount = 0;
    const provinsiSet = new Set();
    window.layananData.features.forEach(f => {
        if (f.properties?.lokasi?.provinsi && f.properties.jenis_program) {
            jenisCounts[f.properties.jenis_program]++;
            pesertaCount += f.properties.peserta || 0;
            if (f.properties.status === 'Aktif') aktifCount++;
            provinsiSet.add(f.properties.lokasi.provinsi);
        }
    });
    window.jenisChart.data.datasets[0].data = Object.values(jenisCounts);
    window.jenisChart.update();
    window.pesertaChart.data.datasets[0].data = [pesertaCount];
    window.pesertaChart.update();
    document.getElementById('total-program').textContent = window.layananData.features.length;
    document.getElementById('peserta-aktif').textContent = pesertaCount;
    document.getElementById('program-aktif').textContent = aktifCount;
    document.getElementById('provinsi-tercakup').textContent = provinsiSet.size;

    const tableBody = document.getElementById('data-table');
    tableBody.innerHTML = '';
    const updateTable = document.getElementById('update-table');
    updateTable.innerHTML = '';
    const isAdmin = window.user_info && window.user_info.role === 'admin';
    const grouped = {};
    window.layananData.features.forEach(f => {
        if (!f.properties?.lokasi?.provinsi) return;
        const key = f.properties.jenis_program;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(f);
    });

    for (const [jenis, items] of Object.entries(grouped)) {
        // Tabel utama (data-table)
        const groupDiv = document.createElement('tr');
        groupDiv.className = 'bg-gray-200';
        groupDiv.innerHTML = `<td colspan="4" class="p-2 font-semibold text-f9a8d4">${jenis}</td>`;
        tableBody.appendChild(groupDiv);
        items.forEach(f => {
            const row = document.createElement('tr');
            row.className = 'table-row border-b border-gray-300';
            row.dataset.id = f.properties.id;
            const editButton = isAdmin ? `<button class="edit-btn text-f9a8d4 hover:underline text-xs mr-2 cursor-pointer" data-id="${f.properties.id}">Edit</button>` : '';
            row.innerHTML = `
                <td class="p-2">${f.properties.nama_program}</td>
                <td class="p-2">${f.properties.jenis_program}</td>
                <td class="p-2">${f.properties.peserta}</td>
                <td class="p-2">
                    ${editButton}
                    <button class="delete-btn text-red-600 hover:underline text-xs ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}" data-id="${f.properties.id}" ${isAdmin ? '' : 'disabled'}>Hapus</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Tabel update (update-table)
        const updateGroupDiv = document.createElement('div');
        updateGroupDiv.className = 'bg-blue-50 p-4 rounded-lg shadow mb-3';
        updateGroupDiv.innerHTML = `<h3 class="font-semibold text-f9a8d4">${jenis}</h3>`;
        items.forEach(f => {
            const row = document.createElement('div');
            row.className = 'text-sm text-gray-600 border-t pt-2 mt-2 flex justify-between items-center';
            const isDisabled = isAdmin ? '' : 'disabled';
            row.innerHTML = `
                <span><b>${f.properties.nama_program}</b> - ${f.properties.alamat} (${f.properties.status})</span>
                <button class="edit-btn text-f9a8d4 hover:text-a7f3d0 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}" data-id="${f.properties.id}" ${isDisabled}>Edit</button>
            `;
            updateGroupDiv.appendChild(row);
        });
        updateTable.appendChild(updateGroupDiv);
    }

    // Pastikan tombol edit aktif untuk admin
    if (isAdmin) {
        console.log('Enabling edit buttons for admin');
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.removeAttribute('disabled');
            btn.classList.remove('cursor-not-allowed', 'opacity-50');
            btn.classList.add('cursor-pointer');
            console.log('Edit button enabled for id:', btn.dataset.id, 'in section:', btn.closest('#data-table') ? 'data-table' : 'update-table');
        });
    }

    attachButtonListeners();
}

// Pasang event listener untuk tombol
function attachButtonListeners() {
    console.log('Attaching button listeners');
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.removeEventListener('click', handleEdit);
        btn.addEventListener('click', (e) => {
            console.log('Edit button clicked for id:', btn.dataset.id, 'in section:', btn.closest('#data-table') ? 'data-table' : 'update-table');
            handleEdit(e);
        });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.removeEventListener('click', handleDelete);
        btn.addEventListener('click', (e) => {
            console.log('Delete button clicked for id:', btn.dataset.id);
            handleDelete(e);
        });
    });
    document.querySelectorAll('.table-row').forEach(row => {
        row.removeEventListener('click', handleRowClick);
        row.addEventListener('click', handleRowClick);
    });
}

// Handle klik baris tabel
function handleRowClick(e) {
    if (e.target.tagName !== 'BUTTON') {
        const id = this.dataset.id;
        const feature = window.layananData.features.find(f => f.properties.id === id);
        if (feature) {
            window.map.setView([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 12);
            console.log('Row clicked, centering map on:', feature.properties.nama_program);
        }
    }
}

// Cari koordinat
async function cariKoordinat(alamat) {
    if (!alamat) {
        console.warn('No address provided for geocoding');
        alert('Masukkan alamat terlebih dahulu!');
        return;
    }
    try {
        console.log('Sending request to /api/geocode for:', alamat);
        const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ address: alamat }),
            credentials: 'include'
        });
        console.log('Geocode response status:', response.status);
        const result = await response.json();
        console.log('Geocode response:', result);
        if (result.error) throw new Error(result.error);
        alert(`Koordinat ditemukan: Lat ${result.lat}, Lon ${result.lon}`);
        if (window.mapInitialized && window.map) {
            if (window.tempMarker) window.map.removeLayer(window.tempMarker);
            window.tempMarker = L.marker([result.lat, result.lon]).addTo(window.map).bindPopup(`Koordinat: ${result.lat}, ${result.lon}`);
            window.map.setView([result.lat, result.lon], 13);
            console.log('Temporary marker added at:', { lat: result.lat, lon: result.lon });
        }
    } catch (error) {
        console.error('Geocode error:', error.message);
        alert(`Gagal menemukan koordinat: ${error.message}`);
    }
}

// Form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('Form submitted at:', new Date().toLocaleString());
    if (!window.user_info) {
        console.warn('User info not loaded, fetching again');
        await fetchUserInfo();
    }
    console.log('User info before submission:', window.user_info);
    console.log('Session cookies before submission:', document.cookie);

    const editId = document.getElementById('edit-id').value;
    const data = {
        id: editId || crypto.randomUUID(),
        nama_program: document.getElementById('nama_program').value.trim(),
        jenis_program: document.getElementById('jenis_program').value,
        alamat: document.getElementById('alamat').value.trim(),
        jadwal_mulai: document.getElementById('jadwal_mulai').value,
        jadwal_selesai: document.getElementById('jadwal_selesai').value,
        peserta: parseInt(document.getElementById('peserta').value) || 0,
        anggaran: parseInt(document.getElementById('anggaran').value) || 0,
        status: document.getElementById('status').value,
        fasilitas_terkait: ""
    };

    console.log('Form data to submit:', JSON.stringify(data, null, 2));

    if (!data.nama_program || !data.jenis_program || !data.alamat || !data.jadwal_mulai || !data.jadwal_selesai || !data.peserta || !data.anggaran || !data.status) {
        console.warn('Validation failed: Required fields missing');
        alert('Semua field wajib diisi!');
        return;
    }

    try {
        // Verifikasi sesi
        console.log('Checking session before submission');
        const sessionCheck = await fetch('/api/user', {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
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

        let lat = 105.258, lon = -5.425;
        if (editId === '' || data.alamat !== (window.layananData.features.find(f => f.properties.id === editId)?.properties.alamat || '')) {
            console.log('Geocoding address:', data.alamat);
            const response = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Bypass-RBAC': 'true'
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
                lat = parseFloat(result.lat);
                lon = parseFloat(result.lon);
                if (isNaN(lat) || isNaN(lon)) throw new Error('Invalid coordinates');
            }
        } else if (editId !== '') {
            const feature = window.layananData.features.find(f => f.properties.id === editId);
            lat = feature.geometry.coordinates[1];
            lon = feature.geometry.coordinates[0];
            console.log('Using existing coordinates:', { lat, lon });
        }

        const parsedLokasi = parseAlamat(data.alamat);
        data.lokasi = {
            provinsi: parsedLokasi.provinsi,
            kab_kota: parsedLokasi.kab_kota,
            kecamatan: parsedLokasi.kecamatan,
            desa: parsedLokasi.desa || data.nama_program
        };
        data.koordinat = [lon, lat];

        const feature = {
            type: "Feature",
            geometry: { type: "Point", coordinates: [lon, lat] },
            properties: data
        };

        console.log('Feature to save:', JSON.stringify(feature, null, 2));

        if (window.user_info && window.user_info.is_authenticated && window.user_info.role === 'admin') {
            // Admin: Simpan langsung ke layanan.json
            console.log('Preparing to save as admin to /api/layanan/save');
            const saveData = {
                type: "FeatureCollection",
                features: window.layananData.features ? [...window.layananData.features] : [],
            };
            if (editId === '') {
                saveData.features.push(feature);
                console.log('Adding new feature:', feature.properties.id);
            } else {
                const index = window.layananData.features.findIndex(f => f.properties.id === editId);
                if (index === -1) throw new Error('Data not found');
                saveData.features[index] = feature;
                console.log('Updating existing feature:', feature.properties.id);
            }
            console.log('Sending save request to /api/layanan/save with data:', JSON.stringify(saveData, null, 2));
            const response = await fetch('/api/layanan/save', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Bypass-RBAC': 'true'
                },
                body: JSON.stringify(saveData),
                credentials: 'include'
            });
            console.log('Save response status:', response.status);
            const result = await response.json();
            console.log('Save response:', result);
            if (!response.ok) throw new Error(`Gagal menyimpan data: ${result.error || response.status}`);
            window.layananData = saveData;
            updateDataDisplay();
            updateMap(document.getElementById('filter_jenis').value, document.getElementById('filter_provinsi').value);
            document.getElementById('input-form').reset();
            document.getElementById('input-modal').classList.add('hidden');
            toggleToolbar(true);
            alert(editId === '' ? 'Data berhasil ditambahkan!' : 'Data berhasil diperbarui!');
        } else {
            // Non-admin: Ajukan ke /api/submissions
            console.log('Preparing to submit as non-admin to /api/submissions');
            const submissionData = {
                feature_type: 'layanan',
                data: feature
            };
            console.log('Submitting data to /api/submissions:', JSON.stringify(submissionData, null, 2));
            const response = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Bypass-RBAC': 'true'
                },
                body: JSON.stringify(submissionData),
                credentials: 'include'
            });
            console.log('Submission response status:', response.status);
            const result = await response.json();
            console.log('Submission response:', result);
            if (!response.ok) throw new Error(`Gagal mengajukan data: ${result.error || response.status}`);
            document.getElementById('input-form').reset();
            document.getElementById('input-modal').classList.add('hidden');
            toggleToolbar(true);
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

// Handle penghapusan
async function handleDelete(e) {
    const id = e.target.dataset.id;
    if (!id) {
        console.error('Feature ID not found for delete');
        alert('ID data tidak ditemukan.');
        return;
    }
    if (!window.user_info) {
        console.warn('User info not loaded, fetching again');
        await fetchUserInfo();
    }
    if (window.user_info && window.user_info.role !== 'admin') {
        console.error('Unauthorized delete attempt: User is not admin');
        alert('Hanya admin yang dapat menghapus data.');
        return;
    }
    try {
        console.log('Attempting to delete feature:', id);
        const response = await fetch(`/api/layanan/delete/${id}`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            credentials: 'include'
        });
        console.log('Delete response status:', response.status);
        const result = await response.json();
        console.log('Delete response:', result);
        if (response.ok) {
            window.layananData.features = window.layananData.features.filter(f => f.properties.id !== id);
            updateDataDisplay();
            updateMap(document.getElementById('filter_jenis').value, document.getElementById('filter_provinsi').value);
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

// Handle edit
function handleEdit(e) {
    if (!window.user_info) {
        console.warn('User info not loaded, fetching again');
        fetchUserInfo();
    }
    if (window.user_info && window.user_info.role !== 'admin') {
        console.error('Unauthorized edit attempt: User is not admin');
        alert('Hanya admin yang dapat mengedit data.');
        return;
    }
    const id = e.target.dataset.id;
    const feature = window.layananData.features.find(f => f.properties.id === id);
    console.log('Editing feature at id:', id, 'data:', JSON.stringify(feature, null, 2));
    if (!feature?.properties?.lokasi) return;
    document.getElementById('edit-id').value = id;
    document.getElementById('nama_program').value = feature.properties.nama_program || '';
    document.getElementById('jenis_program').value = feature.properties.jenis_program || '';
    document.getElementById('alamat').value = feature.properties.alamat || '';
    document.getElementById('jadwal_mulai').value = feature.properties.jadwal_mulai || '';
    document.getElementById('jadwal_selesai').value = feature.properties.jadwal_selesai || '';
    document.getElementById('peserta').value = feature.properties.peserta || 0;
    document.getElementById('anggaran').value = feature.properties.anggaran || 0;
    document.getElementById('status').value = feature.properties.status || '';
    document.getElementById('input-modal').classList.remove('hidden');
    document.getElementById('update-modal').classList.add('hidden');
    toggleToolbar(false);
    console.log('Input modal opened for editing');
}

// Switch tema peta
function switchMapTheme(theme) {
    if (window.currentLayer) window.map.removeLayer(window.currentLayer);
    window.currentLayer = L.tileLayer(window.themes[theme].url, { attribution: window.themes[theme].attribution }).addTo(window.map);
    localStorage.setItem('mapTheme', theme);
    console.log('Switched to theme:', theme);
}

// Toggle toolbar
function toggleToolbar(show) {
    const toolbar = document.getElementById('toolbar');
    toolbar.style.display = show ? 'flex' : 'none';
    toolbar.style.opacity = show ? '1' : '0';
    console.log('Toolbar toggled:', show);
}

// Fungsi untuk menampilkan tab
function showTab(tab) {
    console.log('Switching to tab:', tab);
    document.getElementById('table-content').classList.toggle('hidden', tab !== 'table');
    document.getElementById('calendar-content').classList.toggle('hidden', tab !== 'calendar');
    document.getElementById('charts-content').classList.toggle('hidden', tab !== 'charts');
    document.getElementById('stats-content').classList.toggle('hidden', tab !== 'stats');
    document.getElementById('tab-table').classList.toggle('tab-active', tab === 'table');
    document.getElementById('tab-calendar').classList.toggle('tab-active', tab === 'calendar');
    document.getElementById('tab-charts').classList.toggle('tab-active', tab === 'charts');
    document.getElementById('tab-stats').classList.toggle('tab-active', tab === 'stats');

    // Inisialisasi atau render ulang kalender saat tab Kalender ditampilkan
    if (tab === 'calendar') {
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';
        window.calendarInstance = new FullCalendar.Calendar(calendar, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
            events: window.layananData.features.map(f => ({
                title: f.properties.nama_program || 'Program Tanpa Nama',
                start: f.properties.jadwal_mulai,
                end: f.properties.jadwal_selesai,
                id: f.properties.id
            })),
            eventClick: function(info) {
                const isAdmin = window.user_info && window.user_info.role === 'admin';
                if (!isAdmin) {
                    console.error('Unauthorized calendar event click: User is not admin');
                    alert('Hanya admin yang dapat mengedit data.');
                    return;
                }
                const feature = window.layananData.features.find(f => f.properties.id === info.event.id);
                if (feature) {
                    console.log('Calendar event clicked, editing:', feature.properties.id);
                    document.getElementById('edit-id').value = feature.properties.id;
                    document.getElementById('nama_program').value = feature.properties.nama_program || '';
                    document.getElementById('jenis_program').value = feature.properties.jenis_program || '';
                    document.getElementById('alamat').value = feature.properties.alamat || '';
                    document.getElementById('jadwal_mulai').value = feature.properties.jadwal_mulai || '';
                    document.getElementById('jadwal_selesai').value = feature.properties.jadwal_selesai || '';
                    document.getElementById('peserta').value = feature.properties.peserta || 0;
                    document.getElementById('anggaran').value = feature.properties.anggaran || 0;
                    document.getElementById('status').value = feature.properties.status || '';
                    document.getElementById('input-modal').classList.remove('hidden');
                    toggleToolbar(false);
                }
            }
        });
        setTimeout(() => {
            window.calendarInstance.render();
            console.log('Calendar initialized and rendered');
        }, 100); // Delay untuk memastikan transisi selesai
    }
}

// Event listener utama
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded in layanan.js');

    // Inisialisasi data dummy
    window.layananData = {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [105.258, -5.425] },
                properties: {
                    id: "1",
                    nama_program: "Pelatihan Keterampilan",
                    jenis_program: "Pelatihan",
                    lokasi: { provinsi: "Lampung", kab_kota: "Bandar Lampung", kecamatan: "Telukbetung Utara", desa: "Kupang Teba" },
                    alamat: "Kupang Teba, Telukbetung Utara, Bandar Lampung, Lampung",
                    koordinat: [105.258, -5.425],
                    jadwal_mulai: "2025-07-01",
                    jadwal_selesai: "2025-07-15",
                    peserta: 50,
                    anggaran: 50000000,
                    status: "Aktif",
                    fasilitas_terkait: "Panti Asuhan Budi Mulia"
                }
            },
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [106.8456, -6.2145] },
                properties: {
                    id: "2",
                    nama_program: "Pemberdayaan UMKM",
                    jenis_program: "UMKM",
                    lokasi: { provinsi: "DKI Jakarta", kab_kota: "Jakarta Timur", kecamatan: "Jatinegara", desa: "Kampung Melayu" },
                    alamat: "Kampung Melayu, Jatinegara, Jakarta Timur, DKI Jakarta",
                    koordinat: [106.8456, -6.2145],
                    jadwal_mulai: "2025-08-01",
                    jadwal_selesai: "2025-08-30",
                    peserta: 30,
                    anggaran: 75000000,
                    status: "Direncanakan",
                    fasilitas_terkait: "Sentra Kreasi Atensi Jakarta"
                }
            },
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [120.27876891195774, -4.506734681248464] },
                properties: {
                    id: "3",
                    nama_program: "Posyandu Lansia",
                    jenis_program: "Posyandu",
                    lokasi: { provinsi: "Sulawesi Selatan", kab_kota: "Bone", kecamatan: "Bontocani", desa: "Mattiro Walie" },
                    alamat: "Mattiro Walie, Bontocani, Bone, Sulawesi Selatan",
                    koordinat: [120.27876891195774, -4.506734681248464],
                    jadwal_mulai: "2025-06-01",
                    jadwal_selesai: "2025-06-30",
                    peserta: 40,
                    anggaran: 30000000,
                    status: "Selesai",
                    fasilitas_terkait: "RPTC Sulsel"
                }
            }
        ]
    };

    // Inisialisasi peta
    window.map = L.map('map').setView([-6.2145, 106.8456], 5);
    window.themes = {
        dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '© OpenStreetMap, CartoDB' },
        light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attribution: '© OpenStreetMap, CartoDB' },
        satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, Maxar, Earthstar' },
        retro: { url: 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', attribution: '© Stamen Design, OpenStreetMap' }
    };
    window.currentLayer = L.tileLayer(window.themes.dark.url, { attribution: window.themes.dark.attribution }).addTo(window.map);
    window.heatmapLayer = null;
    window.isHeatmapActive = false;
    window.layananMarkers = L.markerClusterGroup();
    window.layananLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
            console.log('Creating layanan pin:', feature.properties.nama_program, latlng);
            const jenis = feature.properties.jenis_program;
            const iconColors = { 'Pelatihan': '#a7f3d0', 'UMKM': '#f9a8d4', 'Posyandu': '#fefce8' };
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: 'custom-pin',
                    html: `<svg viewBox="0 0 24 24" width="24" height="24" fill="${iconColors[jenis]}" stroke="#1f2937" stroke-width="1"><path d="M12 2l-6 6 6 6 6-6-6-6zm0 4l4 4-4 4-4-4 4-4z"/></svg>`,
                    iconSize: [24, 24],
                    tooltipAnchor: [0, -12]
                })
            });
        },
        onEachFeature: (feature, layer) => {
            if (!layer) return;
            const p = feature.properties;
            layer.bindTooltip(`<div class="tooltip">${p.nama_program}</div>`, { persistent: false, sticky: true });
            layer.bindPopup(`
                <div class="bg-white p-3 rounded-lg border border-a7f3d0 text-sm">
                    <h3 class="font-bold text-f9a8d4 mb-2">${p.nama_program}</h3>
                    <p>Jenis: ${p.jenis_program}</p>
                    <p>Lokasi: ${p.alamat}</p>
                    <p>Jadwal: ${p.jadwal_mulai} s/d ${p.jadwal_selesai}</p>
                    <p>Peserta: ${p.peserta} orang</p>
                    <p>Anggaran: Rp${p.anggaran.toLocaleString()}</p>
                    <p>Status: ${p.status}</p>
                    <p>Fasilitas: ${p.fasilitas_terkait || 'Tidak ada'}</p>
                    <p><a href="https://www.google.com/maps/dir/?api=1&destination=${p.koordinat[1]},${p.koordinat[0]}" target="_blank" class="text-f9a8d4 hover:underline">Navigasi</a></p>
                </div>
            `);
        }
    });

    // Inisialisasi grafik
    window.jenisChart = new Chart(document.getElementById('jenisChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Pelatihan', 'UMKM', 'Posyandu'],
            datasets: [{
                label: 'Jumlah',
                data: [0, 0, 0],
                backgroundColor: ['#a7f3d0', '#f9a8d4', '#fefce8'],
                borderColor: ['#1f2937', '#1f2937', '#1f2937'],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, ticks: { color: '#1f2937', font: { size: 10 } }, title: { display: true, text: 'Jumlah', color: '#1f2937', font: { size: 12 } } },
                x: { ticks: { color: '#1f2937', font: { size: 10 }, maxRotation: 45, minRotation: 45 } }
            },
            plugins: {
                legend: { labels: { color: '#1f2937', font: { size: 10 } } },
                title: { display: true, text: 'Jenis Program', color: '#1f2937', font: { size: 12 } }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    window.pesertaChart = new Chart(document.getElementById('pesertaChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Peserta'],
            datasets: [{
                label: 'Jumlah',
                data: [0],
                backgroundColor: ['#a7f3d0'],
                borderColor: ['#1f2937'],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, ticks: { color: '#1f2937', font: { size: 10 } }, title: { display: true, text: 'Jumlah', color: '#1f2937', font: { size: 12 } } },
                x: { ticks: { color: '#1f2937', font: { size: 10 }, maxRotation: 45, minRotation: 45 } }
            },
            plugins: {
                legend: { labels: { color: '#1f2937', font: { size: 10 } } },
                title: { display: true, text: 'Peserta', color: '#1f2937', font: { size: 12 } }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Load data user dan atur UI
    await fetchUserInfo();
    const savedTheme = localStorage.getItem('mapTheme') || 'dark';
    switchMapTheme(savedTheme);
    document.getElementById('map-theme').value = savedTheme;
    await loadData();

    // Event listener untuk tombol navigasi
    const buttons = {
        'input-btn': () => {
            document.getElementById('input-modal').classList.remove('hidden');
            toggleToolbar(false);
            console.log('Input modal opened');
        },
        'batal-btn': () => {
            document.getElementById('input-modal').classList.add('hidden');
            document.getElementById('input-form').reset();
            toggleToolbar(true);
            console.log('Input modal cancelled');
        },
        'batal-update-btn': () => {
            document.getElementById('update-modal').classList.add('hidden');
            toggleToolbar(true);
            console.log('Update modal closed');
        },
        'update-btn': () => {
            document.getElementById('update-modal').classList.remove('hidden');
            toggleToolbar(false);
            updateDataDisplay();
            console.log('Update modal opened');
        },
        'tab-table': () => showTab('table'),
        'tab-calendar': () => showTab('calendar'),
        'tab-charts': () => showTab('charts'),
        'tab-stats': () => showTab('stats'),
        'filter_jenis': (e) => {
            updateMap(e.target.value, document.getElementById('filter_provinsi').value);
            updateDataDisplay();
            console.log('Filter jenis changed to:', e.target.value);
        },
        'filter_provinsi': (e) => {
            updateMap(document.getElementById('filter_jenis').value, e.target.value);
            updateDataDisplay();
            console.log('Filter provinsi changed to:', e.target.value);
        },
        'map-theme': (e) => {
            switchMapTheme(e.target.value);
        },
        'toggle-heatmap': () => {
            window.isHeatmapActive = !window.isHeatmapActive;
            document.getElementById('toggle-heatmap').textContent = window.isHeatmapActive ? 'Pin' : 'Heatmap';
            updateMap(document.getElementById('filter_jenis').value, document.getElementById('filter_provinsi').value);
            console.log('Heatmap toggled:', window.isHeatmapActive);
        },
        'cari-koordinat': () => cariKoordinat(document.getElementById('alamat').value.trim()),
        'simpan-btn': (e) => {
            e.preventDefault();
            console.log('Simpan button clicked');
            document.getElementById('input-form').dispatchEvent(new Event('submit'));
        },
        'search-nearest-btn': async () => {
            const alamat = document.getElementById('search-alamat').value.trim();
            const radius = parseFloat(document.getElementById('search-radius').value) || Infinity;
            console.log('Search terdekat:', alamat, radius);
            if (!alamat) {
                alert('Masukkan alamat!');
                return;
            }
            try {
                const response = await fetch('/api/geocode', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Bypass-RBAC': 'true'
                    },
                    body: JSON.stringify({ address: alamat }),
                    credentials: 'include'
                });
                console.log('Geocode response status:', response.status);
                const result = await response.json();
                console.log('Geocode response:', result);
                if (result.error) throw new Error(result.error);
                const userLat = parseFloat(result.lat);
                const userLon = parseFloat(result.lon);
                const distances = window.layananData.features.map(f => {
                    const d = Math.sqrt(
                        Math.pow(f.geometry.coordinates[1] - userLat, 2) +
                        Math.pow(f.geometry.coordinates[0] - userLon, 2)
                    ) * 111;
                    return { feature: f, distance: d };
                }).filter(f => f.distance <= radius).sort((a, b) => a.distance - b.distance);
                if (!distances.length) {
                    alert('Tidak ada program dalam radius!');
                    return;
                }
                const nearest = distances[0].feature;
                window.map.setView([nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]], 12);
                alert(`Program terdekat: ${nearest.properties.nama_program} (${distances[0].distance.toFixed(2)} km)`);
            } catch (e) {
                console.error('Search error:', e);
                alert(`Gagal mencari: ${e.message}`);
            }
        }
    };

    Object.entries(buttons).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(id.includes('filter') || id === 'map-theme' ? 'change' : 'click', handler);
            console.log(`Event listener attached for: ${id}`);
        } else {
            console.error(`Element ${id} not found`);
        }
    });

    document.getElementById('input-form')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('alamat')?.addEventListener('input', () => {
        const alamat = document.getElementById('alamat').value;
        const alamatLink = document.getElementById('alamat-link');
        alamatLink.href = alamat ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}` : '#';
        console.log('Alamat link updated:', alamatLink.href);
    });

    document.getElementById('table-search')?.addEventListener('input', () => {
        const query = document.getElementById('table-search').value.toLowerCase();
        document.querySelectorAll('#data-table tr').forEach(row => {
            const nama = row.cells[0].textContent.toLowerCase();
            row.style.display = nama.includes(query) ? '' : 'none';
        });
        console.log('Table search query:', query);
    });

    document.querySelectorAll('th[data-sort]')?.forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            const rows = Array.from(document.querySelectorAll('#data-table tr'));
            const isAsc = th.dataset.order !== 'asc';
            rows.sort((a, b) => {
                const aVal = a.querySelector(`td:nth-child(${key === 'nama_program' ? 1 : 2})`).textContent;
                const bVal = b.querySelector(`td:nth-child(${key === 'nama_program' ? 1 : 2})`).textContent;
                return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
            th.dataset.order = isAsc ? 'asc' : 'desc';
            document.getElementById('data-table').innerHTML = '';
            rows.forEach(row => document.getElementById('data-table').appendChild(row));
            console.log('Table sorted by:', key, isAsc ? 'asc' : 'desc');
        });
    });

    document.getElementById('jenisChart')?.addEventListener('click', (e) => {
        const activePoints = window.jenisChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
        if (activePoints.length) {
            const index = activePoints[0].index;
            const jenis = ['Pelatihan', 'UMKM', 'Posyandu'][index];
            document.getElementById('filter_jenis').value = jenis;
            updateMap(jenis, document.getElementById('filter_provinsi').value);
            console.log('Chart clicked, filtering jenis:', jenis);
        }
    });
});