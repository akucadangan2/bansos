console.log('penerima.js loaded at ' + new Date().toLocaleString());

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
        console.log('Loading data from /api/penerima/load');
        const response = await fetch('/api/penerima/load', {
            headers: { 
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            credentials: 'include'
        });
        const data = await response.json();
        console.log('Raw load response:', data);
        if (data.type === 'FeatureCollection') {
            window.penerimaData.features = [...window.penerimaData.features, ...data.features];
            window.penerimaData.custom_bantuan = data.custom_bantuan || [];
        }
        console.log('Loaded penerimaData:', window.penerimaData);
        updateDataDisplay();
        updateMap();
        updateFilterOptions();
    } catch (e) {
        console.error('Error loading data:', e);
        console.log('Using hardcoded dummy data');
        updateDataDisplay();
        updateMap();
        updateFilterOptions();
    }
}

// Update peta
function updateMap(filter = '') {
    console.log('Updating map with filter:', filter);
    window.markers.clearLayers();
    window.penerimaLayer.clearLayers();
    const filteredData = filter ? 
        { type: 'FeatureCollection', features: window.penerimaData.features.filter(f => f.properties.jenis_bantuan === filter.replace('!', '')) } : 
        window.penerimaData;
    console.log('Filtered data features:', filteredData.features.length);
    window.penerimaLayer.addData(filteredData.features);
    window.markers.addLayer(window.penerimaLayer);
    window.map.addLayer(window.markers);

    const validFeatures = filteredData.features.filter(f => !f.properties.geocoding_failed || f.geometry.coordinates[0] !== 0);
    if (validFeatures.length > 0) {
        const bounds = L.latLngBounds(validFeatures.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]));
        window.map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Update opsi filter bantuan
function updateFilterOptions() {
    console.log('Updating filter options with custom_bantuan:', window.penerimaData.custom_bantuan);
    const select = document.getElementById('filter_bantuan');
    const defaultOptions = ['PKH', 'BPNT', 'BLT', 'Bansos Covid-19'];
    select.innerHTML = '<option value="">Semua</option>';
    defaultOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });
    window.penerimaData.custom_bantuan.forEach(bantuan => {
        const option = document.createElement('option');
        option.value = bantuan + '!';
        option.textContent = bantuan + '!';
        select.appendChild(option);
    });
    const jenisBantuanSelect = document.getElementById('jenis_bantuan');
    jenisBantuanSelect.innerHTML = '';
    defaultOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        jenisBantuanSelect.appendChild(option);
    });
    window.penerimaData.custom_bantuan.forEach(bantuan => {
        const option = document.createElement('option');
        option.value = bantuan;
        option.textContent = bantuan + '!';
        jenisBantuanSelect.appendChild(option);
    });
}

// Update tabel dan grafik
function updateDataDisplay() {
    console.log('Updating data display with features:', window.penerimaData.features.length);
    const allBantuan = ['PKH', 'BPNT', 'BLT', 'Bansos Covid-19', ...window.penerimaData.custom_bantuan];
    const counts = {};
    allBantuan.forEach(b => counts[b] = 0);
    window.penerimaData.features.forEach(f => counts[f.properties.jenis_bantuan]++);
    window.defaultChart.data.labels = allBantuan.map(b => window.penerimaData.custom_bantuan.includes(b) ? `${b}!` : b);
    window.defaultChart.data.datasets[0].data = allBantuan.map(b => counts[b]);
    window.defaultChart.update();
    window.bantuanChart.data.labels = window.defaultChart.data.labels;
    window.bantuanChart.data.datasets[0].data = window.defaultChart.data.datasets[0].data;
    window.bantuanChart.update();

    const statusCounts = { 'Aktif': 0, 'Selesai': 0, 'Ditunda': 0 };
    window.penerimaData.features.forEach(f => statusCounts[f.properties.status]++);
    window.statusChart.data.datasets[0].data = Object.values(statusCounts);
    window.statusChart.update();

    const table = document.getElementById('data-table');
    table.innerHTML = '';
    const grouped = {};
    window.penerimaData.features.forEach((f, index) => {
        const key = f.properties.jenis_bantuan;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ index, feature: f });
    });
    for (const [jenis, items] of Object.entries(grouped)) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'bg-blue-50 p-4 rounded-xl shadow mb-3';
        const displayJenis = window.penerimaData.custom_bantuan.includes(jenis) ? `${jenis}!` : jenis;
        groupDiv.innerHTML = `<h3 class="font-semibold text-blue-700">${displayJenis}</h3>`;
        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'text-sm text-gray-600 border-t pt-2 mt-2 flex justify-between items-center';
            row.innerHTML = `
                <span><b>${item.feature.properties.nama}</b> - ${item.feature.properties.alamat} (${item.feature.properties.status})${item.feature.properties.geocoding_failed ? ' <span class="text-red-600">(Alamat belum ditemukan)</span>' : ''}</span>
                <div>
                    ${item.feature.properties.geocoding_failed ? `<button class="retry-geocode-btn text-blue-600 hover:text-blue-800 mr-2" data-index="${item.index}">Coba Ulang</button>` : ''}
                    <button class="delete-btn text-red-600 hover:text-red-800" data-index="${item.index}" ${window.user_info && window.user_info.role !== 'admin' ? 'disabled' : ''}>Hapus</button>
                </div>
            `;
            groupDiv.appendChild(row);
        });
        table.appendChild(groupDiv);
    }

    const updateTable = document.getElementById('update-table');
    updateTable.innerHTML = '';
    for (const [jenis, items] of Object.entries(grouped)) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'bg-blue-50 p-4 rounded-xl shadow mb-3';
        const displayJenis = window.penerimaData.custom_bantuan.includes(jenis) ? `${jenis}!` : jenis;
        groupDiv.innerHTML = `<h3 class="font-semibold text-blue-700">${displayJenis}</h3>`;
        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'text-sm text-gray-600 border-t pt-2 mt-2 flex justify-between items-center';
            row.innerHTML = `
                <span><b>${item.feature.properties.nama}</b> - ${item.feature.properties.alamat} (${item.feature.properties.status})${item.feature.properties.geocoding_failed ? ' <span class="text-red-600">(Alamat belum ditemukan)</span>' : ''}</span>
                <button class="edit-btn text-blue-600 hover:text-blue-800" data-index="${item.index}" ${window.user_info && window.user_info.role !== 'admin' ? 'disabled' : ''}>Edit</button>
            `;
            groupDiv.appendChild(row);
        });
        updateTable.appendChild(groupDiv);
    }

    // Pastikan tombol edit aktif untuk admin
    if (window.user_info && window.user_info.role === 'admin') {
        console.log('Enabling edit buttons for admin');
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.removeAttribute('disabled');
            btn.classList.remove('cursor-not-allowed', 'opacity-50');
            btn.classList.add('cursor-pointer');
            console.log('Edit button enabled:', btn.dataset.index);
        });
    }

    // Pasang ulang event listener untuk tombol edit
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.removeEventListener('click', handleEdit);
        btn.addEventListener('click', (e) => {
            console.log('Edit button clicked for index:', btn.dataset.index);
            handleEdit(e);
        });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.removeEventListener('click', handleDelete);
        btn.addEventListener('click', handleDelete);
    });
    document.querySelectorAll('.retry-geocode-btn').forEach(btn => {
        btn.removeEventListener('click', handleRetryGeocode);
        btn.addEventListener('click', handleRetryGeocode);
    });
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

    const editIndex = document.getElementById('edit-index').value;
    const data = {
        id: editIndex === '' ? String(Date.now()) : window.penerimaData.features[parseInt(editIndex)]?.properties.id || String(Date.now()),
        nama: document.getElementById('nama').value.trim(),
        nik: document.getElementById('nik').value.trim(),
        alamat: document.getElementById('alamat').value.trim(),
        jenis_bantuan: document.getElementById('jenis_bantuan').value,
        jumlah_bantuan: parseInt(document.getElementById('jumlah_bantuan').value) || 0,
        status: document.getElementById('status').value,
        tanggal_terima: document.getElementById('tanggal_terima').value,
        durasi: document.getElementById('durasi').value.trim(),
        geocoding_failed: false,
        is_custom_bantuan: window.penerimaData.custom_bantuan.includes(document.getElementById('jenis_bantuan').value)
    };

    console.log('Form data to submit:', JSON.stringify(data, null, 2));

    if (!data.nama || !data.nik || !data.alamat || !data.jenis_bantuan || data.jumlah_bantuan < 0 || !data.status || !data.tanggal_terima || !data.durasi) {
        console.warn('Validation failed: Required fields missing');
        alert('Semua field harus diisi dengan benar!');
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
        if (editIndex === '' || data.alamat !== (window.penerimaData.features[parseInt(editIndex)]?.properties.alamat || '')) {
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
                lat = result.lat;
                lon = result.lon;
            }
        } else if (editIndex !== '') {
            lat = window.penerimaData.features[parseInt(editIndex)].geometry.coordinates[1];
            lon = window.penerimaData.features[parseInt(editIndex)].geometry.coordinates[0];
            data.geocoding_failed = window.penerimaData.features[parseInt(editIndex)].properties.geocoding_failed;
            console.log('Using existing coordinates:', { lat, lon });
        }

        const feature = {
            type: "Feature",
            geometry: { type: "Point", coordinates: [lon, lat] },
            properties: data
        };

        console.log('Feature to save:', JSON.stringify(feature, null, 2));

        if (window.user_info && window.user_info.is_authenticated && window.user_info.role === 'admin') {
            // Admin: Simpan langsung ke penerima.json
            console.log('Preparing to save as admin to /api/penerima/save');
            const saveData = {
                type: "FeatureCollection",
                features: window.penerimaData.features ? [...window.penerimaData.features] : [],
                custom_bantuan: window.penerimaData.custom_bantuan || []
            };
            if (editIndex === '') {
                saveData.features.push(feature);
                console.log('Adding new feature:', feature.properties.id);
            } else {
                const index = parseInt(editIndex);
                saveData.features[index] = feature;
                console.log('Updating existing feature:', feature.properties.id);
            }
            console.log('Sending save request to /api/penerima/save with data:', JSON.stringify(saveData, null, 2));
            const response = await fetch('/api/penerima/save', {
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
            window.penerimaData = saveData;
            updateDataDisplay();
            updateMap(document.getElementById('filter_bantuan').value);
            document.getElementById('input-form').reset();
            document.getElementById('input-modal').classList.add('hidden');
            alert(editIndex === '' ? 'Data berhasil ditambahkan!' : 'Data berhasil diperbarui!');
        } else {
            // Non-admin: Ajukan ke /api/submissions
            console.log('Preparing to submit as non-admin to /api/submissions');
            const submissionData = {
                feature_type: 'penerima',
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
    const index = parseInt(e.target.dataset.index);
    const featureId = window.penerimaData.features[index]?.properties.id;
    if (!featureId) {
        console.error('Feature ID not found for delete at index:', index);
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
        console.log('Attempting to delete feature:', featureId);
        const response = await fetch(`/api/penerima/delete/${featureId}`, {
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
            window.penerimaData.features.splice(index, 1);
            updateDataDisplay();
            updateMap(document.getElementById('filter_bantuan').value);
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

// Handle retry geocoding
async function handleRetryGeocode(e) {
    const index = parseInt(e.target.dataset.index);
    const feature = window.penerimaData.features[index];
    const alamat = feature.properties.alamat;
    try {
        console.log('Retrying geocode for:', alamat);
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
        feature.geometry.coordinates = [result.lon, result.lat];
        feature.properties.geocoding_failed = false;
        updateDataDisplay();
        updateMap(document.getElementById('filter_bantuan').value);
        if (window.user_info && window.user_info.role === 'admin') {
            const saveData = {
                type: "FeatureCollection",
                features: window.penerimaData.features,
                custom_bantuan: window.penerimaData.custom_bantuan
            };
            const response = await fetch('/api/penerima/save', {
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
        }
        alert('Koordinat berhasil diperbarui!');
    } catch (error) {
        console.error('Geocode retry error:', error);
        alert(`Gagal memperbarui koordinat: ${error.message}`);
        feature.geometry.coordinates = [105.258, -5.425];
        feature.properties.geocoding_failed = true;
        updateDataDisplay();
        updateMap(document.getElementById('filter_bantuan').value);
        if (window.user_info && window.user_info.role === 'admin') {
            const saveData = {
                type: "FeatureCollection",
                features: window.penerimaData.features,
                custom_bantuan: window.penerimaData.custom_bantuan
            };
            const response = await fetch('/api/penerima/save', {
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
        }
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
    const index = parseInt(e.target.dataset.index);
    const feature = window.penerimaData.features[index];
    console.log('Editing feature at index:', index, 'data:', feature);
    document.getElementById('edit-index').value = index;
    document.getElementById('nama').value = feature.properties.nama;
    document.getElementById('nik').value = feature.properties.nik;
    document.getElementById('alamat').value = feature.properties.alamat;
    document.getElementById('jenis_bantuan').value = feature.properties.jenis_bantuan;
    document.getElementById('jumlah_bantuan').value = feature.properties.jumlah_bantuan;
    document.getElementById('status').value = feature.properties.status;
    document.getElementById('tanggal_terima').value = feature.properties.tanggal_terima;
    document.getElementById('durasi').value = feature.properties.durasi;
    document.getElementById('input-modal-title').textContent = 'Edit Penerima Bantuan';
    document.getElementById('update-modal').classList.add('hidden');
    document.getElementById('input-modal').classList.remove('hidden');
    setTimeout(() => document.querySelector('#input-modal > div').classList.remove('scale-95'), 10);
}

// Event listener utama
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded in penerima.js');
    // Inisialisasi data dummy
    window.penerimaData = {
        type: "FeatureCollection",
        features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [106.8456, -6.2145] }, properties: { nama: 'Budi Santoso', nik: '1234567890123456', alamat: 'Jl. Sudirman No. 123, Jakarta Pusat, DKI Jakarta', jenis_bantuan: 'PKH', jumlah_bantuan: 500000, status: 'Aktif', tanggal_terima: '2025-06-01', durasi: 'Bulanan', geocoding_failed: false, is_custom_bantuan: false } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [106.8656, -6.2345] }, properties: { nama: 'Siti Aminah', nik: '9876543210987654', alamat: 'Jl. Thamrin No. 45, Jakarta Pusat, DKI Jakarta', jenis_bantuan: 'BPNT', jumlah_bantuan: 300000, status: 'Selesai', tanggal_terima: '2025-05-15', durasi: 'Satu Kali', geocoding_failed: false, is_custom_bantuan: false } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [106.8256, -6.1945] }, properties: { nama: 'Ahmad Yani', nik: '1122334455667788', alamat: 'Jl. Gatot Subroto No. 78, Jakarta Selatan, DKI Jakarta', jenis_bantuan: 'BLT', jumlah_bantuan: 600000, status: 'Aktif', tanggal_terima: '2025-06-10', durasi: 'Bulanan', geocoding_failed: false, is_custom_bantuan: false } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [106.8856, -6.2545] }, properties: { nama: 'Dewi Lestari', nik: '2233445566778899', alamat: 'Jl. Kebon Jeruk No. 12, Jakarta Barat, DKI Jakarta', jenis_bantuan: 'Bansos Covid-19', jumlah_bantuan: 400000, status: 'Ditunda', tanggal_terima: '2025-04-20', durasi: 'Satu Kali', geocoding_failed: false, is_custom_bantuan: false } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [106.8356, -6.2245] }, properties: { nama: 'Rina Susanti', nik: '3344556677889900', alamat: 'Jl. Pangeran Antasari No. 56, Jakarta Selatan, DKI Jakarta', jenis_bantuan: 'PKH', jumlah_bantuan: 550000, status: 'Aktif', tanggal_terima: '2025-06-05', durasi: 'Bulanan', geocoding_failed: false, is_custom_bantuan: false } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [105.258, -5.425] }, properties: { nama: 'Michael', nik: '2498239479276497', alamat: 'Jl. Ikan Tenggiri No.72, Pesawahan, Kec. Telukbetung Selatan, Kota Bandar Lampung, Lampung', jenis_bantuan: 'Bansos Covid-19', jumlah_bantuan: 2000, status: 'Aktif', tanggal_terima: '2025-06-11', durasi: 'Bulanan', geocoding_failed: false, is_custom_bantuan: false } }
        ],
        custom_bantuan: []
    };

    // Inisialisasi peta
    window.map = L.map('map').setView([-6.2145, 106.8456], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(window.map);
    window.markers = L.markerClusterGroup();
    window.penerimaLayer = L.geoJSON(null, {
        pointToLayer: function(feature, latlng) {
            const isInvalid = feature.properties.geocoding_failed && feature.geometry.coordinates[0] === 0 && feature.geometry.coordinates[1] === 0;
            const coords = isInvalid ? [105.258, -5.425] : latlng;
            const iconUrl = feature.properties.geocoding_failed ? 
                'https://img.icons8.com/emoji/25/000000/red-circle.png' : 
                feature.properties.jenis_bantuan === 'PKH' ? 
                'https://img.icons8.com/color/25/000000/marker.png' : 
                'https://img.icons8.com/ios-filled/25/000000/marker.png';
            console.log('Creating pin for:', feature.properties.nama, 'at coords:', coords, 'geocoding_failed:', feature.properties.geocoding_failed);
            return L.marker(coords, {
                icon: L.icon({ iconUrl: iconUrl, iconSize: [25, 25] })
            });
        },
        onEachFeature: function(feature, layer) {
            if (!layer) return;
            const jenisBantuan = feature.properties.is_custom_bantuan ? `${feature.properties.jenis_bantuan}!` : feature.properties.jenis_bantuan;
            layer.bindPopup(`
                <div class="bg-white p-4 rounded-lg shadow-lg border border-blue-200 text-sm font-poppins">
                    <h3 class="text-lg font-bold text-blue-700 mb-2 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    ${feature.properties.nama}
                    </h3>
                    <p class="flex items-center mb-1"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-12 0 6 6 0 0112 0z"></path></svg><b>NIK:</b> ${feature.properties.nik}</p>
                    <p class="flex items-center mb-1"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg><b>Alamat:</b> ${feature.properties.alamat}</p>
                    <p class="flex items-center mb-1"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg><b>Jenis Bantuan:</b> ${jenisBantuan}</p>
                    <p class="flex items-center mb-1"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zM12 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zM12 20c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z"></path></svg><b>Jumlah:</b> Rp ${feature.properties.jumlah_bantuan}</p>
                    <p class="flex items-center mb-1"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><b>Status:</b> ${feature.properties.status}</p>
                    <p class="flex items-center mb-1"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><b>Tanggal Terima:</b> ${feature.properties.tanggal_terima}</p>
                    <p class="flex items-center"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><b>Durasi:</b> ${feature.properties.durasi}</p>
                    ${feature.properties.geocoding_failed ? '<p class="text-red-600 mt-2"><b>Catatan:</b> Alamat belum ditemukan, pin default di Bandar Lampung</p>' : ''}
                </div>
            `);
        }
    });
    window.mapInitialized = true;

    // Inisialisasi grafik
    window.defaultChart = new Chart(document.getElementById('defaultChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['PKH', 'BPNT', 'BLT', 'Bansos Covid-19'],
            datasets: [{
                label: 'Jumlah Penerima',
                data: [0, 0, 0, 0],
                backgroundColor: ['#34D399', '#60A5FA', '#FBBF24', '#F87171'],
                borderColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
                borderWidth: 1,
                borderRadius: 6,
                barThickness: 15
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Jumlah', font: { size: 10, family: 'Poppins' } }, grid: { color: '#E5E7EB' }, ticks: { font: { size: 8 } } },
                x: { title: { display: true, text: 'Jenis Bantuan', font: { size: 10, family: 'Poppins' } }, grid: { display: false }, ticks: { font: { size: 8 } } }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Distribusi Penerima', font: { size: 12, family: 'Poppins', weight: 'bold' }, color: '#1E40AF' },
                tooltip: { backgroundColor: '#1E40AF', titleFont: { family: 'Poppins', size: 10 }, bodyFont: { family: 'Poppins', size: 10 } }
            },
            animation: { duration: 1000, easing: 'easeOutBounce' },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    window.bantuanChart = new Chart(document.getElementById('bantuanChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['PKH', 'BPNT', 'BLT', 'Bansos Covid-19'],
            datasets: [{
                label: 'Jumlah Penerima',
                data: [0, 0, 0, 0],
                backgroundColor: ['#34D399', '#60A5FA', '#FBBF24', '#F87171'],
                borderColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
                borderWidth: 1,
                borderRadius: 6,
                barThickness: 20
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Jumlah', font: { size: 12, family: 'Poppins' } }, grid: { color: '#E5E7EB' }, ticks: { font: { size: 10 } } },
                x: { title: { display: true, text: 'Jenis Bantuan', font: { size: 12, family: 'Poppins' } }, grid: { display: false }, ticks: { font: { size: 10 } } }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Jenis Bantuan', font: { size: 14, family: 'Poppins', weight: 'bold' }, color: '#1E40AF' },
                tooltip: { backgroundColor: '#1E40AF', titleFont: { family: 'Poppins', size: 12 }, bodyFont: { family: 'Poppins', size: 12 } }
            },
            animation: { duration: 1000, easing: 'easeOutBounce' },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    window.statusChart = new Chart(document.getElementById('statusChart').getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Aktif', 'Selesai', 'Ditunda'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#34D399', '#FBBF24', '#F87171'],
                borderColor: ['#10B981', '#F59E0B', '#EF4444'],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Poppins', size: 12 } } },
                title: { display: true, text: 'Status Bantuan', font: { size: 14, family: 'Poppins', weight: 'bold' }, color: '#1E40AF' },
                tooltip: { backgroundColor: '#1E40AF', titleFont: { family: 'Poppins', size: 12 }, bodyFont: { family: 'Poppins', size: 12 } }
            },
            animation: { duration: 1000, easing: 'easeOutBounce' },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Load data user dan atur UI
    await fetchUserInfo();
    loadData();

    // Event listener untuk tombol navigasi
    const buttons = {
        'input-btn': () => {
            document.getElementById('input-modal-title').textContent = 'Input Penerima Bantuan';
            document.getElementById('edit-index').value = '';
            document.getElementById('input-form').reset();
            document.getElementById('input-modal').classList.remove('hidden');
            setTimeout(() => document.querySelector('#input-modal > div').classList.remove('scale-95'), 10);
            console.log('Input modal opened');
        },
        'filter-btn': () => {
            document.getElementById('filter-section').classList.toggle('hidden');
            document.getElementById('grafik-default').classList.add('hidden');
            document.getElementById('tabel-section').classList.add('hidden');
            console.log('Filter section toggled');
        },
        'grafik-btn': () => {
            document.getElementById('grafik-modal').classList.remove('hidden');
            setTimeout(() => document.querySelector('#grafik-modal > div').classList.remove('scale-95'), 10);
            console.log('Grafik modal opened');
        },
        'tabel-btn': () => {
            document.getElementById('filter-section').classList.add('hidden');
            document.getElementById('grafik-default').classList.remove('hidden');
            document.getElementById('tabel-section').classList.remove('hidden');
            console.log('Tabel section shown');
        },
        'batal-btn': () => {
            document.getElementById('input-form').reset();
            document.getElementById('input-modal').classList.add('hidden');
            document.getElementById('filter-section').classList.add('hidden');
            document.getElementById('grafik-default').classList.remove('hidden');
            document.getElementById('tabel-section').classList.remove('hidden');
            console.log('Input modal cancelled');
        },
        'update-btn': () => {
            document.getElementById('update-modal').classList.remove('hidden');
            setTimeout(() => document.querySelector('#update-modal > div').classList.remove('scale-95'), 10);
            updateDataDisplay(); // Perbarui tabel untuk memastikan tombol edit aktif
            console.log('Update modal opened');
        },
        'batal-update-btn': () => {
            document.getElementById('update-modal').classList.add('hidden');
            document.getElementById('filter-section').classList.add('hidden');
            document.getElementById('grafik-default').classList.remove('hidden');
            document.getElementById('tabel-section').classList.remove('hidden');
            console.log('Update modal closed');
        },
        'tutup-grafik-btn': () => {
            document.getElementById('grafik-modal').classList.add('hidden');
            document.getElementById('filter-section').classList.add('hidden');
            document.getElementById('grafik-default').classList.remove('hidden');
            document.getElementById('tabel-section').classList.remove('hidden');
            console.log('Grafik modal closed');
        },
        'add-bantuan-btn': () => {
            const newBantuan = document.getElementById('new_bantuan').value.trim();
            console.log('Adding new bantuan:', newBantuan);
            if (!newBantuan) {
                alert('Nama bantuan tidak boleh kosong!');
                return;
            }
            if (window.penerimaData.custom_bantuan.includes(newBantuan) || ['PKH', 'BPNT', 'BLT', 'Bansos Covid-19'].includes(newBantuan)) {
                alert('Bantuan sudah ada!');
                return;
            }
            window.penerimaData.custom_bantuan.push(newBantuan);
            updateFilterOptions();
            document.getElementById('new_bantuan').value = '';
            if (window.user_info && window.user_info.role === 'admin') {
                const saveData = {
                    type: "FeatureCollection",
                    features: window.penerimaData.features,
                    custom_bantuan: window.penerimaData.custom_bantuan
                };
                fetch('/api/penerima/save', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Bypass-RBAC': 'true'
                    },
                    body: JSON.stringify(saveData),
                    credentials: 'include'
                }).then(response => response.json())
                  .then(result => {
                      console.log('Save response:', result);
                      if (result.error) throw new Error(result.error);
                      alert('Bantuan baru berhasil ditambahkan!');
                  })
                  .catch(error => {
                      console.error('Error saving new bantuan:', error);
                      alert('Gagal menyimpan bantuan baru: ' + error.message);
                  });
            } else {
                alert('Bantuan baru berhasil ditambahkan secara lokal (non-admin).');
            }
        },
        'cari-koordinat': () => cariKoordinat(document.getElementById('alamat').value.trim()),
        'simpan-btn': (e) => {
            e.preventDefault();
            console.log('Simpan button clicked');
            document.getElementById('input-form').dispatchEvent(new Event('submit'));
        }
    };

    Object.entries(buttons).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', handler);
        else console.error(`Button ${id} not found`);
    });

    document.getElementById('input-form')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('filter_bantuan')?.addEventListener('change', (e) => {
        console.log('Filter changed to:', e.target.value);
        updateMap(e.target.value);
        updateDataDisplay();
    });

    document.getElementById('alamat')?.addEventListener('input', () => {
        const alamat = document.getElementById('alamat').value.trim();
        const alamatLink = document.getElementById('alamat-link');
        alamatLink.href = alamat ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}` : '#';
        console.log('Alamat link updated:', alamatLink.href);
    });

    // Handle resizable sidebar
    let isResizing = false;
    const sidebar = document.getElementById('sidebar');
    sidebar.addEventListener('mousedown', (e) => {
        if (e.offsetX > sidebar.offsetWidth - 10) {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            const newWidth = e.clientX - sidebar.getBoundingClientRect().left;
            if (newWidth >= 300 && newWidth <= 600) {
                sidebar.style.width = `${newWidth}px`;
            }
        }
    });
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            window.map.invalidateSize();
        }
    });
});