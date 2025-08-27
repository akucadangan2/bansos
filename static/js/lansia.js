console.log('lansia.js loaded at ' + new Date().toLocaleString());

// Cache untuk hasil geokoding
const geocodeCache = new Map();

// Ambil user_info dari /api/user
async function fetchUserInfo() {
    try {
        const response = await fetch('/api/user', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`Failed to fetch user info: ${response.status}`);
        const userInfo = await response.json();
        window.user_info = userInfo;
        console.log('User info fetched:', userInfo);
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
        const response = await fetch('/api/lansia/load', {
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        window.lansiaData = data;
        updateDataDisplay();
        updateMap();
        updateScheduleAlerts();
        updateCommunityMap();
    } catch (e) {
        console.error('Load error:', e);
        window.lansiaData = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [120.27876891195774, -4.506734681248464] },
                    properties: {
                        id: "1",
                        nama_program: "Posyandu Lansia Sulsel",
                        jenis_program: "Posyandu Lansia",
                        lokasi: { provinsi: "Sulawesi Selatan", kab_kota: "Bone", kecamatan: "Bontocani", desa: "Mattiro Walie" },
                        alamat: "Mattiro Walie, Bontocani, Bone, Sulawesi Selatan",
                        koordinat: [120.27876891195774, -4.506734681248464],
                        jadwal_mulai: "2025-06-01",
                        jadwal_selesai: "2025-07-25",
                        peserta: 40,
                        anggaran: 30000000,
                        status: "Aktif",
                        kebutuhan_khusus: ["Akses kursi roda", "Alat bantu dengar", "Konsultasi gizi"],
                        kesehatan_lansia: { diabetes: 10, hipertensi: 15, jantung: 5, penglihatan: 3 },
                        aktivitas_komunitas: ["Senam Lansia", "Klub Baca"],
                        dokumentasi: null
                    }
                },
                {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [106.8456, -6.2145] },
                    properties: {
                        id: "2",
                        nama_program: "Rehabilitasi Sosial Jakarta",
                        jenis_program: "Rehabilitasi Sosial",
                        lokasi: { provinsi: "DKI Jakarta", kab_kota: "Jakarta Timur", kecamatan: "Jatinegara", desa: "Kampung Melayu" },
                        alamat: "Kampung Melayu, Jatinegara, Jakarta Timur, DKI Jakarta",
                        koordinat: [106.8456, -6.2145],
                        jadwal_mulai: "2025-08-01",
                        jadwal_selesai: "2025-08-30",
                        peserta: 25,
                        anggaran: 50000000,
                        status: "Direncanakan",
                        kebutuhan_khusus: ["Fisioterapi", "Layanan kesehatan mental", "Perawatan demensia"],
                        kesehatan_lansia: { diabetes: 5, hipertensi: 8, jantung: 2, penglihatan: 1 },
                        aktivitas_komunitas: ["Terapi Kelompok", "Pelatihan Keterampilan"],
                        dokumentasi: null
                    }
                },
                {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [105.258, -5.425] },
                    properties: {
                        id: "3",
                        nama_program: "Bantuan Sosial Lampung",
                        jenis_program: "Bantuan Sosial",
                        lokasi: { provinsi: "Lampung", kab_kota: "Bandar Lampung", kecamatan: "Telukbetung Utara", desa: "Kupang Teba" },
                        alamat: "Kupang Teba, Telukbetung Utara, Bandar Lampung, Lampung",
                        koordinat: [105.258, -5.425],
                        jadwal_mulai: "2025-07-01",
                        jadwal_selesai: "2025-07-22",
                        peserta: 50,
                        anggaran: 20000000,
                        status: "Aktif",
                        kebutuhan_khusus: ["Bantuan pangan", "Transportasi", "Bantuan hukum"],
                        kesehatan_lansia: { diabetes: 12, hipertensi: 20, jantung: 8, penglihatan: 5 },
                        aktivitas_komunitas: ["Bazaar Lansia", "Kunjungan Sosial"],
                        dokumentasi: null
                    }
                }
            ]
        };
        updateDataDisplay();
        updateMap();
        updateScheduleAlerts();
        updateCommunityMap();
    }
}

// Parse alamat
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

// Update peta dengan heatmap kesehatan atau peserta
function updateMap(filterJenis = '', filterProvinsi = '') {
    if (!window.lansiaLayer || !window.lansiaMarkers) {
        console.error('Map layers not initialized');
        return;
    }
    window.lansiaMarkers.clearLayers();
    window.lansiaLayer.clearLayers();
    if (window.heatmapLayer) window.map.removeLayer(window.heatmapLayer);
    if (window.healthHeatmapLayer) window.map.removeLayer(window.healthHeatmapLayer);
    
    const filteredData = {
        type: 'FeatureCollection',
        features: window.lansiaData.features.filter(f => {
            const jenisMatch = !filterJenis || f.properties.jenis_program === filterJenis;
            const provinsiMatch = !filterProvinsi || f.properties.lokasi.provinsi === filterProvinsi;
            return jenisMatch && provinsiMatch;
        })
    };

    if (window.isHealthHeatmapActive) {
        window.healthHeatmapLayer = L.heatLayer(
            filteredData.features.map(f => [
                f.geometry.coordinates[1], 
                f.geometry.coordinates[0], 
                (f.properties.kesehatan_lansia.diabetes + f.properties.kesehatan_lansia.hipertensi + 
                 f.properties.kesehatan_lansia.jantung + f.properties.kesehatan_lansia.penglihatan) / 50
            ]),
            { radius: 30, blur: 20, gradient: { 0.4: 'yellow', 0.65: 'orange', 1: 'red' } }
        ).addTo(window.map);
    } else if (window.isHeatmapActive) {
        window.heatmapLayer = L.heatLayer(
            filteredData.features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0], f.properties.peserta / 50]),
            { radius: 25, blur: 15 }
        ).addTo(window.map);
    } else {
        window.lansiaLayer.addData(filteredData);
        window.lansiaMarkers.addLayer(window.lansiaLayer);
        window.map.addLayer(window.lansiaMarkers);
    }

    const validFeatures = filteredData.features.filter(f => f.geometry.coordinates[0] !== 0);
    if (validFeatures.length) {
        window.map.fitBounds(
            L.latLngBounds(validFeatures.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]])),
            { padding: [50, 50] }
        );
    } else {
        console.warn('No valid data to display on map');
    }
}

// Inisialisasi peta komunitas
function initCommunityMap() {
    if (window.communityMap) return;
    window.communityMap = L.map('community-map').setView([-6.2145, 106.8456], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, CartoDB'
    }).addTo(window.communityMap);
    window.communityLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: 'community-pin',
                    html: `<svg viewBox="0 0 24 24" width="24" height="24" fill="#319795" stroke="#1a202c" stroke-width="1"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z"/></svg>`,
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
                <div class="bg-white p-2 rounded-lg border border-gray-300 text-xs">
                    <h3 class="font-bold text-blue-600 mb-1">${p.nama_program}</h3>
                    <p>Aktivitas: ${p.aktivitas_komunitas.join(', ')}</p>
                    <p>Lokasi: ${p.lokasi.provinsi}</p>
                    ${p.dokumentasi ? `<img src="${p.dokumentasi}" alt="Dokumentasi" class="w-full h-24 object-cover rounded mt-2">` : ''}
                </div>
            `);
        }
    });
    window.communityLayer.addTo(window.communityMap);
}

// Update peta komunitas
function updateCommunityMap() {
    if (!window.communityMap || !window.communityLayer) {
        console.warn('Community map or layer not initialized, initializing now...');
        initCommunityMap();
    }
    window.communityLayer.clearLayers();
    const communityData = {
        type: 'FeatureCollection',
        features: window.lansiaData.features.filter(f => f.properties.aktivitas_komunitas && f.properties.aktivitas_komunitas.length > 0)
    };
    window.communityLayer.addData(communityData);
    const validFeatures = communityData.features.filter(f => f.geometry.coordinates[0] !== 0);
    if (validFeatures.length) {
        window.communityMap.fitBounds(
            L.latLngBounds(validFeatures.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]])),
            { padding: [20, 20] }
        );
    } else {
        console.warn('No valid community data to display on map');
        window.communityMap.setView([-6.2145, 106.8456], 5);
    }
}

// Inisialisasi peta pratinjau di modal
function initPreviewMap() {
    if (window.previewMap) return;
    window.previewMap = L.map('preview-map').setView([-6.2145, 106.8456], 10);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, CartoDB'
    }).addTo(window.previewMap);
    window.previewMap.on('click', function(e) {
        if (window.previewMarker) window.previewMap.removeLayer(window.previewMarker);
        window.previewMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(window.previewMap);
        document.getElementById('alamat').dataset.lat = e.latlng.lat;
        document.getElementById('alamat').dataset.lon = e.latlng.lng;
        document.getElementById('alamat-link').href = `https://www.google.com/maps/search/?api=1&query=${e.latlng.lat},${e.latlng.lng}`;
        showNotification('Lokasi dipilih pada peta!');
    });
}

// Tampilkan notifikasi
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.error('Notification element not found');
        return;
    }
    notification.textContent = message;
    notification.className = `notification ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 3000);
}

// Update peringatan jadwal
function updateScheduleAlerts() {
    const today = new Date();
    const alertsList = document.getElementById('schedule-alerts');
    if (!alertsList) {
        console.error('Schedule alerts element not found');
        return;
    }
    alertsList.innerHTML = '';
    window.lansiaData.features.forEach(f => {
        const endDate = new Date(f.properties.jadwal_selesai);
        const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilEnd <= 7 && daysUntilEnd >= 0 && f.properties.status === 'Aktif') {
            const li = document.createElement('li');
            li.className = 'mb-2 text-red-600';
            li.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${f.properties.nama_program} akan berakhir dalam ${daysUntilEnd} hari (${f.properties.jadwal_selesai})`;
            alertsList.appendChild(li);
        }
    });
}

// Update tabel kesehatan, analitik kebutuhan, dan aktivitas komunitas
async function updateDataDisplay() {
    if (!window.user_info) await fetchUserInfo();
    const jenisCounts = { 'Posyandu Lansia': 0, 'Rehabilitasi Sosial': 0, 'Bantuan Sosial': 0 };
    const healthStats = { diabetes: 0, hipertensi: 0, jantung: 0, penglihatan: 0 };
    const needsStats = {};
    const activityStats = {};
    let pesertaCount = 0;
    const provinsiSet = new Set();
    window.lansiaData.features.forEach(f => {
        if (f.properties?.lokasi?.provinsi && f.properties.jenis_program) {
            jenisCounts[f.properties.jenis_program]++;
            pesertaCount += f.properties.peserta || 0;
            provinsiSet.add(f.properties.lokasi.provinsi);
            if (f.properties.kesehatan_lansia) {
                healthStats.diabetes += f.properties.kesehatan_lansia.diabetes || 0;
                healthStats.hipertensi += f.properties.kesehatan_lansia.hipertensi || 0;
                healthStats.jantung += f.properties.kesehatan_lansia.jantung || 0;
                healthStats.penglihatan += f.properties.kesehatan_lansia.penglihatan || 0;
            }
            f.properties.kebutuhan_khusus.forEach(need => {
                needsStats[need] = (needsStats[need] || 0) + 1;
            });
            if (f.properties.aktivitas_komunitas) {
                f.properties.aktivitas_komunitas.forEach(activity => {
                    activityStats[activity] = (activityStats[activity] || 0) + 1;
                });
            }
        }
    });

    const healthTable = document.getElementById('health-table');
    if (healthTable) {
        healthTable.innerHTML = `
            <tr><td class="p-2">Diabetes</td><td class="p-2">${healthStats.diabetes}</td></tr>
            <tr><td class="p-2">Hipertensi</td><td class="p-2">${healthStats.hipertensi}</td></tr>
            <tr><td class="p-2">Penyakit Jantung</td><td class="p-2">${healthStats.jantung}</td></tr>
            <tr><td class="p-2">Gangguan Penglihatan</td><td class="p-2">${healthStats.penglihatan}</td></tr>
        `;
    }

    const needsTable = document.getElementById('needs-table');
    if (needsTable) {
        needsTable.innerHTML = Object.entries(needsStats).map(([need, count]) => 
            `<tr><td class="p-2">${need}</td><td class="p-2">${count}</td></tr>`
        ).join('');
    }

    const activityTable = document.getElementById('activity-table');
    if (activityTable) {
        activityTable.innerHTML = Object.entries(activityStats).map(([activity, count]) => 
            `<tr><td class="p-2">${activity}</td><td class="p-2">${count}</td></tr>`
        ).join('');
    }

    if (window.healthChart) window.healthChart.destroy();
    window.healthChart = new Chart(document.getElementById('health-chart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Diabetes', 'Hipertensi', 'Penyakit Jantung', 'Gangguan Penglihatan'],
            datasets: [{
                data: [healthStats.diabetes, healthStats.hipertensi, healthStats.jantung, healthStats.penglihatan],
                backgroundColor: ['#2b6cb0', '#63b3ed', '#f6ad55', '#f687b3'],
                borderColor: ['#1a202c', '#1a202c', '#1a202c', '#1a202c'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 12 }, color: '#1a202c' } },
                title: { display: true, text: 'Distribusi Kesehatan Lansia', color: '#1a202c', font: { size: 14 } }
            }
        }
    });

    const tableBody = document.getElementById('lansia-table');
    if (tableBody) {
        tableBody.innerHTML = '';
        const isAdmin = window.user_info && window.user_info.role === 'admin';
        window.lansiaData.features.forEach(f => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.dataset.id = f.properties.id;
            const editButton = isAdmin ? `<button class="edit-btn text-blue-600 hover:underline text-xs mr-2" data-id="${f.properties.id}"><i class="fas fa-edit"></i> Edit</button>` : '';
            const docLink = f.properties.dokumentasi ? `<span class="doc-link" data-id="${f.properties.id}">Ada dokumentasi</span>` : 'Tidak ada dokumentasi';
            row.innerHTML = `
                <td class="p-2"><span class="program-name" data-id="${f.properties.id}">${f.properties.nama_program}</span></td>
                <td class="p-2">${f.properties.jenis_program}</td>
                <td class="p-2">${f.properties.peserta}</td>
                <td class="p-2">${docLink}</td>
                <td class="p-2">${editButton}<button class="delete-btn text-red-600 hover:underline text-xs ${isAdmin ? '' : 'opacity-50 cursor-not-allowed'}" data-id="${f.properties.id}" ${isAdmin ? '' : 'disabled'}><i class="fas fa-trash"></i> Hapus</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    const provinsiSelect = document.getElementById('filter-provinsi');
    if (provinsiSelect) {
        provinsiSelect.innerHTML = '<option value="">Semua Provinsi</option>' + Array.from(provinsiSet).map(p => `<option value="${p}">${p}</option>`).join('');
    }

    updateScheduleAlerts();
    updateCommunityMap();
    attachButtonListeners();
}

// Pasang event listener
function attachButtonListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.removeEventListener('click', handleEdit);
        btn.addEventListener('click', handleEdit);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.removeEventListener('click', handleDelete);
        btn.addEventListener('click', handleDelete);
    });
    document.querySelectorAll('.program-name').forEach(name => {
        name.removeEventListener('click', handleProgramNameClick);
        name.addEventListener('click', handleProgramNameClick);
    });
    document.querySelectorAll('.doc-link').forEach(link => {
        link.removeEventListener('click', handleDocLinkClick);
        link.addEventListener('click', handleDocLinkClick);
    });
}

// Handle klik teks dokumentasi
function handleDocLinkClick(e) {
    const id = e.target.dataset.id;
    const feature = window.lansiaData.features.find(f => f.properties.id === id);
    if (feature && feature.properties.dokumentasi) {
        const modal = document.getElementById('dokumentasi-modal');
        const image = document.getElementById('dokumentasi-image');
        image.src = feature.properties.dokumentasi;
        modal.classList.remove('hidden');
        console.log('Opened dokumentasi modal for ID:', id);
    }
}

// Handle klik nama program
function handleProgramNameClick(e) {
    const id = e.target.dataset.id;
    const feature = window.lansiaData.features.find(f => f.properties.id === id);
    if (feature) {
        window.map.setView([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 12);
        const layer = window.lansiaLayer.getLayers().find(l => l.feature.properties.id === id);
        if (layer) {
            layer.openPopup();
        }
    }
}

// Handle klik baris
function handleRowClick(e) {
    if (e.target.tagName !== 'BUTTON' && !e.target.closest('button') && !e.target.classList.contains('program-name') && !e.target.classList.contains('doc-link')) {
        const id = this.dataset.id;
        const feature = window.lansiaData.features.find(f => f.properties.id === id);
        if (feature) {
            window.map.setView([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 12);
            const layer = window.lansiaLayer.getLayers().find(l => l.feature.properties.id === id);
            if (layer) {
                layer.openPopup();
            }
        }
    }
}

// Cari koordinat
async function cariKoordinat(alamat, button) {
    if (!alamat) {
        showNotification('Masukkan alamat terlebih dahulu!', 'error');
        console.log('Geocode failed: No address provided');
        return;
    }
    button.disabled = true;
    try {
        if (geocodeCache.has(alamat)) {
            const { lat, lon } = geocodeCache.get(alamat);
            document.getElementById('alamat').dataset.lat = lat;
            document.getElementById('alamat').dataset.lon = lon;
            if (window.previewMarker) window.previewMap.removeLayer(window.previewMarker);
            window.previewMarker = L.marker([lat, lon]).addTo(window.previewMap);
            window.previewMap.setView([lat, lon], 13);
            showNotification(`Koordinat ditemukan: Lat ${lat}, Lon ${lon}`);
            console.log('Geocode retrieved from cache: Lat', lat, 'Lon', lon);
            return;
        }
        const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ address: alamat }),
            credentials: 'include'
        });
        console.log('Geocode response status:', response.status);
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        if (isNaN(lat) || isNaN(lon)) throw new Error('Invalid coordinates');
        geocodeCache.set(alamat, { lat, lon });
        document.getElementById('alamat').dataset.lat = lat;
        document.getElementById('alamat').dataset.lon = lon;
        if (window.previewMarker) window.previewMap.removeLayer(window.previewMarker);
        window.previewMarker = L.marker([lat, lon]).addTo(window.previewMap);
        window.previewMap.setView([lat, lon], 13);
        showNotification(`Koordinat ditemukan: Lat ${lat}, Lon ${lon}`);
        console.log('Geocode successful: Lat', lat, 'Lon', lon);
    } catch (error) {
        showNotification(`Gagal menemukan koordinat: ${error.message}`, 'error');
        console.error('Geocode error:', error);
    } finally {
        button.disabled = false;
    }
}

// Handle upload gambar
function handleImageUpload(event) {
    const file = event.target.files[0];
    const previewImage = document.getElementById('preview-image');
    if (!file) {
        previewImage.style.display = 'none';
        console.log('No file selected for upload');
        return;
    }
    if (file.size > 1 * 1024 * 1024) {
        showNotification('Ukuran gambar melebihi 1MB!', 'error');
        event.target.value = '';
        previewImage.style.display = 'none';
        console.log('File size exceeds 1MB:', file.size);
        return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
        showNotification('Hanya file JPG atau PNG yang diizinkan!', 'error');
        event.target.value = '';
        previewImage.style.display = 'none';
        console.log('Invalid file type:', file.type);
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
        previewImage.style.display = 'block';
        document.getElementById('dokumentasi').dataset.base64 = e.target.result;
        console.log('Image preview loaded:', e.target.result.substring(0, 50) + '...');
    };
    reader.onerror = function(e) {
        console.error('Error reading file:', e);
        showNotification('Gagal memuat pratinjau gambar!', 'error');
    };
    reader.readAsDataURL(file);
}

// Form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    const simpanBtn = document.getElementById('simpan-btn');
    simpanBtn.disabled = true;
    simpanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    console.log('Form submission started');
    if (!window.user_info) await fetchUserInfo();
    const editId = document.getElementById('edit-id').value;
    const data = {
        id: editId || crypto.randomUUID(),
        nama_program: document.getElementById('nama_program').value.trim(),
        jenis_program: document.getElementById('jenis_program').value,
        alamat: document.getElementById('alamat').value.trim(),
        kebutuhan_khusus: Array.from(document.getElementById('kebutuhan_khusus').selectedOptions).map(opt => opt.value),
        aktivitas_komunitas: Array.from(document.getElementById('aktivitas_komunitas').selectedOptions).map(opt => opt.value),
        jadwal_mulai: document.getElementById('jadwal_mulai').value,
        jadwal_selesai: document.getElementById('jadwal_selesai').value,
        peserta: parseInt(document.getElementById('peserta').value) || 0,
        anggaran: parseInt(document.getElementById('anggaran').value) || 0,
        status: document.getElementById('status').value,
        kesehatan_lansia: { diabetes: 0, hipertensi: 0, jantung: 0, penglihatan: 0 },
        dokumentasi: document.getElementById('dokumentasi').dataset.base64 || null
    };
    console.log('Form data prepared:', data);

    if (!data.nama_program || !data.jenis_program || !data.alamat || !data.jadwal_mulai || !data.jadwal_selesai || !data.peserta || !data.anggaran || !data.status) {
        showNotification('Semua field wajib diisi!', 'error');
        console.log('Form validation failed: missing required fields');
        simpanBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
        simpanBtn.disabled = false;
        return;
    }

    try {
        const sessionCheck = await fetch('/api/user', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            credentials: 'include'
        });
        const sessionResult = await sessionCheck.json();
        if (!sessionCheck.ok || !sessionResult.is_authenticated) {
            showNotification('Sesi tidak valid, silakan login kembali.', 'error');
            console.log('Session check failed:', sessionResult);
            window.location.href = '/auth?tab=login';
            simpanBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
            simpanBtn.disabled = false;
            return;
        }

        let lat = document.getElementById('alamat').dataset.lat || 105.258;
        let lon = document.getElementById('alamat').dataset.lon || -5.425;
        if (!lat || !lon || editId === '' || data.alamat !== (window.lansiaData.features.find(f => f.properties.id === editId)?.properties.alamat || '')) {
            if (geocodeCache.has(data.alamat)) {
                const { lat: cachedLat, lon: cachedLon } = geocodeCache.get(data.alamat);
                lat = cachedLat;
                lon = cachedLon;
                console.log('Geocode retrieved from cache: Lat', lat, 'Lon', lon);
            } else {
                const response = await fetch('/api/geocode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
                    body: JSON.stringify({ address: data.alamat }),
                    credentials: 'include'
                });
                console.log('Geocode response status:', response.status);
                const result = await response.json();
                if (result.error) {
                    data.geocoding_failed = true;
                    console.log('Geocoding failed:', result.error);
                } else {
                    lat = parseFloat(result.lat);
                    lon = parseFloat(result.lon);
                    if (isNaN(lat) || isNaN(lon)) throw new Error('Invalid coordinates');
                    geocodeCache.set(data.alamat, { lat, lon });
                    console.log('Geocode successful: Lat', lat, 'Lon', lon);
                }
            }
        } else if (editId !== '') {
            const feature = window.lansiaData.features.find(f => f.properties.id === editId);
            lat = feature.geometry.coordinates[1];
            lon = feature.geometry.coordinates[0];
            data.dokumentasi = feature.properties.dokumentasi || null;
            console.log('Using existing coordinates for edit:', lat, lon);
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

        if (window.user_info && window.user_info.is_authenticated && window.user_info.role === 'admin') {
            const saveData = {
                type: "FeatureCollection",
                features: window.lansiaData.features ? [...window.lansiaData.features] : [],
            };
            if (editId === '') {
                saveData.features.push(feature);
                console.log('Adding new feature:', feature);
            } else {
                const index = saveData.features.findIndex(f => f.properties.id === editId);
                if (index === -1) throw new Error('Data not found');
                saveData.features[index] = feature;
                console.log('Updating feature:', feature);
            }
            const response = await fetch('/api/lansia/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
                body: JSON.stringify(saveData),
                credentials: 'include'
            });
            console.log('Save response status:', response.status);
            const result = await response.json();
            if (!response.ok) throw new Error(`Gagal menyimpan data: ${result.error || response.status}`);
            window.lansiaData = saveData;
            updateDataDisplay();
            updateMap(document.getElementById('filter-jenis').value, document.getElementById('filter-provinsi').value);
            updateCommunityMap();
            document.getElementById('input-form').reset();
            document.getElementById('preview-image').style.display = 'none';
            document.getElementById('input-modal').classList.add('hidden');
            showNotification(editId === '' ? 'Data berhasil ditambahkan!' : 'Data berhasil diperbarui!');
        } else {
            const submissionData = {
                feature_type: 'lansia',
                data: feature
            };
            const response = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
                body: JSON.stringify(submissionData),
                credentials: 'include'
            });
            console.log('Submission response status:', response.status);
            const result = await response.json();
            if (!response.ok) throw new Error(`Gagal mengajukan data: ${result.error || response.status}`);
            document.getElementById('input-form').reset();
            document.getElementById('preview-image').style.display = 'none';
            document.getElementById('input-modal').classList.add('hidden');
            showNotification('Data berhasil diajukan untuk ditinjau.');
        }
    } catch (error) {
        console.error('Form submission failed:', error);
        showNotification('Gagal menyimpan data: ' + error.message, 'error');
        if (error.message.includes('Silakan login terlebih dahulu') || error.message.includes('401') || error.message.includes('403')) {
            window.location.href = '/auth?tab=login';
        }
    } finally {
        simpanBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
        simpanBtn.disabled = false;
        console.log('Form submission completed');
    }
}

// Handle penghapusan
async function handleDelete(e) {
    const id = e.target.dataset.id || e.target.closest('button').dataset.id;
    if (!id) {
        showNotification('ID data tidak ditemukan.', 'error');
        console.log('Delete failed: No ID provided');
        return;
    }
    if (!window.user_info) await fetchUserInfo();
    if (window.user_info && window.user_info.role !== 'admin') {
        showNotification('Hanya admin yang dapat menghapus data.', 'error');
        console.log('Delete failed: User not admin');
        return;
    }
    const deleteBtn = e.target.closest('.delete-btn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghapus...';
    try {
        // Periksa apakah ID ada di client-side data
        const featureIndex = window.lansiaData.features.findIndex(f => f.properties.id === id);
        if (featureIndex === -1) {
            throw new Error('Feature not found in client-side data');
        }
        const response = await fetch(`/api/lansia/delete/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            credentials: 'include'
        });
        console.log('Delete response status:', response.status);
        const result = await response.json();
        if (!response.ok) throw new Error(`Gagal menghapus data: ${result.error || response.status}`);
        // Hapus dari client-side data
        window.lansiaData.features.splice(featureIndex, 1);
        updateDataDisplay();
        updateMap(document.getElementById('filter-jenis').value, document.getElementById('filter-provinsi').value);
        updateCommunityMap();
        showNotification('Data berhasil dihapus.');
        console.log('Data deleted successfully, ID:', id);
    } catch (error) {
        console.error('Delete error:', error);
        showNotification(`Gagal menghapus data: ${error.message}`, 'error');
        // Jika error 404, coba hapus dari client-side untuk sinkronisasi
        if (error.message.includes('404') || error.message.includes('not found')) {
            const featureIndex = window.lansiaData.features.findIndex(f => f.properties.id === id);
            if (featureIndex !== -1) {
                window.lansiaData.features.splice(featureIndex, 1);
                updateDataDisplay();
                updateMap(document.getElementById('filter-jenis').value, document.getElementById('filter-provinsi').value);
                updateCommunityMap();
                showNotification('Data dihapus dari client-side karena tidak ditemukan di server.');
                console.log('Client-side data removed, ID:', id);
            }
        }
    } finally {
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Hapus';
        deleteBtn.disabled = false;
    }
}

// Handle edit
function handleEdit(e) {
    if (!window.user_info) fetchUserInfo();
    if (window.user_info && window.user_info.role !== 'admin') {
        showNotification('Hanya admin yang dapat mengedit data.', 'error');
        console.log('Edit failed: User not admin');
        return;
    }
    const id = e.target.dataset.id || e.target.closest('button').dataset.id;
    const feature = window.lansiaData.features.find(f => f.properties.id === id);
    if (!feature?.properties?.lokasi) {
        console.log('Edit failed: Feature not found or invalid');
        return;
    }
    document.getElementById('edit-id').value = id;
    document.getElementById('nama_program').value = feature.properties.nama_program || '';
    document.getElementById('jenis_program').value = feature.properties.jenis_program || '';
    document.getElementById('alamat').value = feature.properties.alamat || '';
    document.getElementById('alamat').dataset.lat = feature.geometry.coordinates[1];
    document.getElementById('alamat').dataset.lon = feature.geometry.coordinates[0];
    const kebutuhanSelect = document.getElementById('kebutuhan_khusus');
    Array.from(kebutuhanSelect.options).forEach(opt => {
        opt.selected = feature.properties.kebutuhan_khusus?.includes(opt.value) || false;
    });
    const aktivitasSelect = document.getElementById('aktivitas_komunitas');
    Array.from(aktivitasSelect.options).forEach(opt => {
        opt.selected = feature.properties.aktivitas_komunitas?.includes(opt.value) || false;
    });
    const previewImage = document.getElementById('preview-image');
    if (feature.properties.dokumentasi) {
        previewImage.src = feature.properties.dokumentasi;
        previewImage.style.display = 'block';
        document.getElementById('dokumentasi').dataset.base64 = feature.properties.dokumentasi;
        console.log('Loaded existing image for edit:', feature.properties.dokumentasi);
    } else {
        previewImage.style.display = 'none';
        document.getElementById('dokumentasi').dataset.base64 = '';
    }
    document.getElementById('jadwal_mulai').value = feature.properties.jadwal_mulai || '';
    document.getElementById('jadwal_selesai').value = feature.properties.jadwal_selesai || '';
    document.getElementById('peserta').value = feature.properties.peserta || 0;
    document.getElementById('anggaran').value = feature.properties.anggaran || 0;
    document.getElementById('status').value = feature.properties.status || '';
    document.getElementById('input-modal').classList.remove('hidden');
    initPreviewMap();
    if (window.previewMarker) window.previewMap.removeLayer(window.previewMarker);
    window.previewMarker = L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]).addTo(window.previewMap);
    window.previewMap.setView([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 13);
    updateRekomendasiLayanan();
    console.log('Edit form populated for ID:', id);
}

// Switch tema peta
function switchMapTheme(theme) {
    if (window.currentLayer) window.map.removeLayer(window.currentLayer);
    window.currentLayer = L.tileLayer(window.themes[theme].url, { attribution: window.themes[theme].attribution }).addTo(window.map);
    localStorage.setItem('mapTheme', theme);
    console.log('Map theme switched to:', theme);
}

// Update rekomendasi layanan
function updateRekomendasiLayanan() {
    const jenis = document.getElementById('jenis_program').value;
    const alamat = document.getElementById('alamat').value;
    const rekomendasiSelect = document.getElementById('rekomendasi_layanan');
    if (!rekomendasiSelect) {
        console.error('Rekomendasi select element not found');
        return;
    }
    
    const recommendations = {
        'Posyandu Lansia': ['Pemeriksaan kesehatan rutin', 'Konsultasi gizi', 'Aktivitas sosial', 'Senam lansia'],
        'Rehabilitasi Sosial': ['Terapi fisik', 'Konseling psikologis', 'Pelatihan keterampilan', 'Rehabilitasi kognitif'],
        'Bantuan Sosial': ['Bantuan keuangan', 'Paket sembako', 'Transportasi gratis', 'Bantuan hukum']
    };
    
    const provinsi = parseAlamat(alamat).provinsi;
    let options = recommendations[jenis] || [];
    if (provinsi) {
        options = options.map(opt => `${opt} (${provinsi})`);
    }
    rekomendasiSelect.innerHTML = '<option value="">Pilih rekomendasi</option>' + 
        options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    console.log('Rekomendasi layanan updated for jenis:', jenis);
}

// Export ke CSV
function exportToCSV() {
    console.log('Export to CSV started');
    try {
        if (!window.lansiaData.features || window.lansiaData.features.length === 0) {
            throw new Error('Tidak ada data untuk diekspor');
        }
        const headers = ['Nama Program', 'Jenis', 'Peserta'];
        const data = window.lansiaData.features.map(f => [
            f.properties.nama_program || '',
            f.properties.jenis_program || '',
            f.properties.peserta || 0
        ]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data_lansia.csv';
        link.click();
        console.log('CSV file generated successfully with', data.length, 'rows');
    } catch (error) {
        console.error('Export to CSV failed:', error);
        showNotification('Gagal mengekspor ke CSV: ' + error.message, 'error');
    }
}

// Export ke Excel
function exportToExcel() {
    console.log('Export to Excel started');
    try {
        if (!window.lansiaData.features || window.lansiaData.features.length === 0) {
            throw new Error('Tidak ada data untuk diekspor');
        }
        const headers = ['Nama Program', 'Jenis', 'Peserta'];
        const data = window.lansiaData.features.map(f => [
            f.properties.nama_program || '',
            f.properties.jenis_program || '',
            f.properties.peserta || 0
        ]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data_lansia.csv';
        link.click();
        console.log('Excel file generated successfully with', data.length, 'rows');
    } catch (error) {
        console.error('Export to Excel failed:', error);
        showNotification('Gagal mengekspor ke Excel: ' + error.message, 'error');
    }
}

// Export ke PDF
function exportToPDF() {
    console.log('Export to PDF started');
    try {
        if (!window.lansiaData.features || window.lansiaData.features.length === 0) {
            throw new Error('Tidak ada data untuk diekspor');
        }
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF library not loaded');
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Judul
        doc.setFontSize(16);
        doc.text('Laporan Layanan Lanjut Usia', 20, 20);
        doc.setFontSize(12);
        doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 20, 30);
        
        // Tabel
        doc.autoTable({
            head: [['Nama Program', 'Jenis', 'Peserta']],
            body: window.lansiaData.features.map(f => [
                f.properties.nama_program || '',
                f.properties.jenis_program || '',
                f.properties.peserta || 0
            ]),
            startY: 40,
            styles: {
                fontSize: 10,
                cellPadding: 2,
                overflow: 'linebreak',
                halign: 'left',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [43, 108, 176], // Warna biru (#2b6cb0)
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 60 },
                2: { cellWidth: 30 }
            },
            margin: { top: 40, left: 20, right: 20 }
        });
        
        doc.save('data_lansia.pdf');
        console.log('PDF file generated successfully with', window.lansiaData.features.length, 'rows');
    } catch (error) {
        console.error('Export to PDF failed:', error);
        showNotification('Gagal mengekspor ke PDF: ' + error.message, 'error');
    }
}

// Event listener utama
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM content loaded, initializing map and listeners');
    window.map = L.map('map').setView([-6.2145, 106.8456], 5);
    window.themes = {
        dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '© OpenStreetMap, CartoDB' },
        light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attribution: '© OpenStreetMap, CartoDB' },
        satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, Maxar, Earthstar' },
        retro: { url: 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', attribution: '© Stamen Design, OpenStreetMap' }
    };
    window.currentLayer = L.tileLayer(window.themes.dark.url, { attribution: window.themes.dark.attribution }).addTo(window.map);
    window.heatmapLayer = null;
    window.healthHeatmapLayer = null;
    window.isHeatmapActive = false;
    window.isHealthHeatmapActive = false;
    window.lansiaMarkers = L.markerClusterGroup();
    window.lansiaLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: 'custom-pin',
                    html: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#2b6cb0" stroke="#1a202c" stroke-width="1"><path d="M12 2l-6 6 6 6 6-6-6-6zm0 4l4 4-4 4-4-4 4-4z"/></svg>`,
                    iconSize: [20, 20],
                    tooltipAnchor: [0, -10]
                })
            });
        },
        onEachFeature: (feature, layer) => {
            if (!layer) return;
            const p = feature.properties;
            layer.bindTooltip(`<div class="tooltip">${p.nama_program}</div>`, { persistent: false, sticky: true });
            layer.bindPopup(`
                <div class="bg-white p-2 rounded-lg border border-gray-300 text-xs">
                    <h3 class="font-bold text-blue-600 mb-1">${p.nama_program}</h3>
                    <p>Jenis: ${p.jenis_program}</p>
                    <p>Lokasi: ${p.alamat}</p>
                    <p>Kebutuhan Khusus: ${p.kebutuhan_khusus.join(', ') || 'Tidak ada'}</p>
                    <p>Jadwal: ${p.jadwal_mulai} s/d ${p.jadwal_selesai}</p>
                    <p>Peserta: ${p.peserta} orang</p>
                    <p>Anggaran: Rp${p.anggaran.toLocaleString()}</p>
                    <p>Status: ${p.status}</p>
                    <p>Kesehatan Lansia: Diabetes ${p.kesehatan_lansia.diabetes}, Hipertensi ${p.kesehatan_lansia.hipertensi}, Jantung ${p.kesehatan_lansia.jantung}, Penglihatan ${p.kesehatan_lansia.penglihatan}</p>
                    <p>Aktivitas Komunitas: ${p.aktivitas_komunitas.join(', ') || 'Tidak ada'}</p>
                    ${p.dokumentasi ? `<img src="${p.dokumentasi}" alt="Dokumentasi" class="w-full h-24 object-cover rounded mt-2">` : ''}
                    <p><a href="https://www.google.com/maps/dir/?api=1&destination=${p.koordinat[1]},${p.koordinat[0]}" target="_blank" class="text-blue-600 hover:underline">Navigasi</a></p>
                </div>
            `);
        }
    });

    await fetchUserInfo();
    const savedTheme = localStorage.getItem('mapTheme') || 'dark';
    switchMapTheme(savedTheme);
    await loadData();

    const buttons = {
        'input-btn': () => {
            document.getElementById('input-form').reset();
            document.getElementById('edit-id').value = '';
            document.getElementById('preview-image').style.display = 'none';
            document.getElementById('input-modal').classList.remove('hidden');
            initPreviewMap();
            updateRekomendasiLayanan();
            console.log('Input modal opened');
        },
        'batal-btn': () => {
            document.getElementById('input-modal').classList.add('hidden');
            document.getElementById('input-form').reset();
            document.getElementById('preview-image').style.display = 'none';
            if (window.previewMarker) window.previewMap.removeLayer(window.previewMarker);
            console.log('Input modal closed');
        },
        'simpan-btn': (e) => {
            e.preventDefault();
            document.getElementById('input-form').dispatchEvent(new Event('submit'));
            console.log('Simpan button clicked');
        },
        'cari-koordinat': (e) => cariKoordinat(document.getElementById('alamat').value.trim(), e.target),
        'tutup-dokumentasi-btn': () => {
            document.getElementById('dokumentasi-modal').classList.add('hidden');
            console.log('Dokumentasi modal closed');
        },
        'toggle-heatmap': () => {
            window.isHeatmapActive = !window.isHeatmapActive;
            window.isHealthHeatmapActive = false;
            document.getElementById('toggle-heatmap').textContent = window.isHeatmapActive ? 'Pin' : 'Heatmap Peserta';
            updateMap(document.getElementById('filter-jenis').value, document.getElementById('filter-provinsi').value);
            console.log('Toggled heatmap:', window.isHeatmapActive);
        },
        'toggle-health-heatmap': () => {
            window.isHealthHeatmapActive = !window.isHealthHeatmapActive;
            window.isHeatmapActive = false;
            document.getElementById('toggle-health-heatmap').textContent = window.isHealthHeatmapActive ? 'Pin' : 'Heatmap Kesehatan';
            updateMap(document.getElementById('filter-jenis').value, document.getElementById('filter-provinsi').value);
            console.log('Toggled health heatmap:', window.isHealthHeatmapActive);
        },
        'filter-jenis': (e) => {
            updateMap(e.target.value, document.getElementById('filter-provinsi').value);
            console.log('Filter jenis changed:', e.target.value);
        },
        'filter-provinsi': (e) => {
            updateMap(document.getElementById('filter-jenis').value, e.target.value);
            console.log('Filter provinsi changed:', e.target.value);
        },
        'export-csv-btn': exportToCSV,
        'export-excel-btn': exportToExcel,
        'export-pdf-btn': exportToPDF
    };

    Object.entries(buttons).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            element.removeEventListener(id.includes('filter') ? 'change' : 'click', handler);
            element.addEventListener(id.includes('filter') ? 'change' : 'click', handler);
            console.log(`Event listener attached for ${id}`);
        } else {
            console.error(`Element with ID ${id} not found`);
        }
    });

    document.getElementById('input-form')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('alamat')?.addEventListener('input', () => {
        const alamat = document.getElementById('alamat').value;
        const alamatLink = document.getElementById('alamat-link');
        alamatLink.href = alamat ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}` : '#';
        updateRekomendasiLayanan();
        console.log('Alamat input updated:', alamat);
    });
    document.getElementById('dokumentasi')?.addEventListener('change', handleImageUpload);
    document.getElementById('jenis_program')?.addEventListener('change', updateRekomendasiLayanan);
});