console.log('lansia_individu.js loaded at ' + new Date().toLocaleString());

// Cache untuk hasil geokoding
const geocodeCache = new Map();

// Fungsi debounce untuk mengurangi pemanggilan berulang
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Ambil user_info dari /api/user
async function fetchUserInfo() {
    console.log('Fetching user info...');
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
        console.log('Using default user info:', window.user_info);
        return window.user_info;
    }
}

// Inisialisasi peta utama
function initMainMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Main map element (#map) not found');
        return;
    }
    if (!window.L) {
        console.error('Leaflet library not loaded');
        return;
    }
    try {
        window.map = L.map('map').setView([-6.2145, 106.8456], 5);
        const baseLayers = {
            "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }),
            "MapTiler Satellite": L.tileLayer('https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=IK5jI16RtevcjqQqE5n9', {
                attribution: '© MapTiler'
            }),
            "Esri World Imagery": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri'
            })
        };
        baseLayers["OpenStreetMap"].addTo(window.map);
        L.control.layers(baseLayers).addTo(window.map);
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
                layer.bindTooltip(`<div class="tooltip">${p.nama}</div>`, { persistent: false, sticky: true });
                layer.bindPopup(`
                    <div class="bg-white p-2 rounded-lg border border-gray-300 text-xs">
                        <h3 class="font-bold text-blue-600 mb-1">${p.nama}</h3>
                        <p>NIK: ${p.nik}</p>
                        <p>Usia: ${p.usia}</p>
                        <p>Kondisi Kesehatan: ${p.kondisi_kesehatan.join(', ') || 'Tidak ada'}</p>
                        <p>Status Sosial: ${p.status_sosial}</p>
                        <p>Alamat: ${p.alamat}</p>
                        <p>Status DTKS: ${p.dtks_status || 'Belum Terdaftar'}</p>
                        <p>Status Monitoring: ${p.status_monitoring}</p>
                        <p>Evaluasi Layanan: ${p.evaluasi_layanan}</p>
                        <button class="view-atensi-btn btn-primary text-xs mt-2" data-nik="${p.nik}"><i class="fas fa-history"></i> Lihat Riwayat ATENSI</button>
                    </div>
                `);
            }
        });
        console.log('Main map initialized successfully');
    } catch (error) {
        console.error('Failed to initialize main map:', error);
    }
}

// Load data lansia individu dari server
async function loadData() {
    console.log('Loading lansia individu data...');
    try {
        const response = await fetch('/api/lansia_individu/load', {
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        window.lansiaIndividuData = data;
        console.log('Lansia individu data loaded from server:', window.lansiaIndividuData);
        updateDataDisplay();
        updateMap();
        updateStats();
        adjustMapHeight();
    } catch (e) {
        console.error('Load lansia individu error:', e);
        window.lansiaIndividuData = {
            type: "LansiaCollection",
            lansia: [
                {
                    nik: "1234567890123456",
                    nama: "Budi Santoso",
                    usia: 70,
                    kondisi_kesehatan: ["Diabetes", "Hipertensi"],
                    status_sosial: "Fakir Miskin",
                    alamat: "Jl. Sudirman, Semarang, Jawa Tengah",
                    koordinat: [110.411, -6.993],
                    riwayat_atensi: [
                        { program: "Bantuan Pangan", tanggal: "2025-06-01", status: "Selesai" },
                        { program: "Fisioterapi", tanggal: "2025-07-15", status: "Sedang Berjalan" }
                    ],
                    status_monitoring: "Aktif",
                    evaluasi_layanan: "Memuaskan",
                    dtks_status: "Belum Terdaftar"
                },
                {
                    nik: "9876543210987654",
                    nama: "Siti Aminah 1",
                    usia: 65,
                    kondisi_kesehatan: ["Hipertensi"],
                    status_sosial: "Rentan Miskin",
                    alamat: "Jl. Diponegoro, Surabaya, Jawa Timur",
                    koordinat: [112.742, -7.257],
                    riwayat_atensi: [
                        { program: "Bantuan Sosial", tanggal: "2025-07-01", status: "Selesai" }
                    ],
                    status_monitoring: "Aktif",
                    evaluasi_layanan: "Cukup",
                    dtks_status: "Terdaftar"
                },
                {
                    nik: "9876543210987655",
                    nama: "Siti Aminah 2",
                    usia: 67,
                    kondisi_kesehatan: ["Diabetes"],
                    status_sosial: "Mampu",
                    alamat: "Jl. Diponegoro, Surabaya, Jawa Timur",
                    koordinat: [112.742, -7.257],
                    riwayat_atensi: [
                        { program: "Bantuan Sosial", tanggal: "2025-07-01", status: "Selesai" }
                    ],
                    status_monitoring: "Aktif",
                    evaluasi_layanan: "Cukup",
                    dtks_status: "Pengusulan Sedang Diproses"
                }
            ]
        };
        console.log('Using dummy lansia individu data:', window.lansiaIndividuData);
        updateDataDisplay();
        updateMap();
        updateStats();
        adjustMapHeight();
    }
}

// Parse alamat
function parseAlamat(alamat) {
    console.log('Parsing alamat:', alamat);
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
    const result = { desa: desa || kecamatan, kecamatan, kab_kota, provinsi };
    console.log('Parsed alamat:', result);
    return result;
}

// Update peta dengan filter
function updateMap(filterStatusSosial = '', filterProvinsi = '', filterDtksStatus = '') {
    console.log('Updating map with filters:', { statusSosial: filterStatusSosial, provinsi: filterProvinsi, dtksStatus: filterDtksStatus });
    if (!window.lansiaLayer || !window.lansiaMarkers || !window.map) {
        console.error('Map layers or map not initialized');
        return;
    }
    try {
        window.lansiaMarkers.clearLayers();
        window.lansiaLayer.clearLayers();

        const filteredData = {
            type: 'LansiaCollection',
            lansia: window.lansiaIndividuData.lansia.filter(l => {
                const statusMatch = !filterStatusSosial || l.status_sosial === filterStatusSosial;
                const provinsiMatch = !filterProvinsi || parseAlamat(l.alamat).provinsi === filterProvinsi;
                const dtksStatusMatch = !filterDtksStatus || l.dtks_status === filterDtksStatus;
                return statusMatch && provinsiMatch && dtksStatusMatch;
            })
        };

        window.lansiaLayer.addData({
            type: 'FeatureCollection',
            features: filteredData.lansia.map(l => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: l.koordinat },
                properties: l
            }))
        });
        window.lansiaMarkers.addLayer(window.lansiaLayer);
        window.map.addLayer(window.lansiaMarkers);

        const validFeatures = filteredData.lansia.filter(l => l.koordinat[0] !== 0);
        if (validFeatures.length) {
            window.map.fitBounds(
                L.latLngBounds(validFeatures.map(l => [l.koordinat[1], l.koordinat[0]])),
                { padding: [50, 50] }
            );
            console.log('Map bounds set with', validFeatures.length, 'features');
        } else {
            console.warn('No valid data to display on map');
            window.map.setView([-6.2145, 106.8456], 5);
        }
    } catch (error) {
        console.error('Error updating map:', error);
    }
}

// Update statistik lansia
function updateStats() {
    console.log('Updating lansia stats...');
    try {
        const statsGrid = document.getElementById('stats-grid');
        const statusSosialChartCanvas = document.getElementById('status-sosial-chart');
        const dtksStatusChartCanvas = document.getElementById('dtks-status-chart');
        if (!statsGrid || !statusSosialChartCanvas || !dtksStatusChartCanvas) {
            console.error('Stats elements not found');
            return;
        }
        const lansia = window.lansiaIndividuData.lansia || [];
        const total = lansia.length;
        const statusSosialCount = {
            'Fakir Miskin': 0,
            'Rentan Miskin': 0,
            'Mampu': 0
        };
        const dtksStatusCount = {
            'Terdaftar': 0,
            'Belum Terdaftar': 0,
            'Pengusulan Sedang Diproses': 0
        };
        lansia.forEach(l => {
            statusSosialCount[l.status_sosial] = (statusSosialCount[l.status_sosial] || 0) + 1;
            dtksStatusCount[l.dtks_status || 'Belum Terdaftar'] = (dtksStatusCount[l.dtks_status || 'Belum Terdaftar'] || 0) + 1;
        });
        statsGrid.innerHTML = `
            <div class="stats-item">
                <h4>Total Lansia</h4>
                <p>${total}</p>
            </div>
            <div class="stats-item">
                <h4>Fakir Miskin</h4>
                <p>${statusSosialCount['Fakir Miskin']}</p>
            </div>
            <div class="stats-item">
                <h4>Rentan Miskin</h4>
                <p>${statusSosialCount['Rentan Miskin']}</p>
            </div>
            <div class="stats-item">
                <h4>Mampu</h4>
                <p>${statusSosialCount['Mampu']}</p>
            </div>
            <div class="stats-item">
                <h4>Terdaftar DTKS</h4>
                <p>${dtksStatusCount['Terdaftar']}</p>
            </div>
            <div class="stats-item">
                <h4>Belum Terdaftar</h4>
                <p>${dtksStatusCount['Belum Terdaftar']}</p>
            </div>
            <div class="stats-item">
                <h4>Pengusulan DTKS</h4>
                <p>${dtksStatusCount['Pengusulan Sedang Diproses']}</p>
            </div>
        `;
        console.log('Stats updated:', { total, statusSosialCount, dtksStatusCount });

        // Update bar chart Status Sosial
        if (window.statusSosialChart) window.statusSosialChart.destroy();
        window.statusSosialChart = new Chart(statusSosialChartCanvas, {
            type: 'bar',
            data: {
                labels: ['Fakir Miskin', 'Rentan Miskin', 'Mampu'],
                datasets: [{
                    label: 'Jumlah Lansia',
                    data: [
                        statusSosialCount['Fakir Miskin'],
                        statusSosialCount['Rentan Miskin'],
                        statusSosialCount['Mampu']
                    ],
                    backgroundColor: ['#2b6cb0', '#68d391', '#f6ad55'],
                    borderColor: ['#1a4971', '#4ade80', '#f59e0b'],
                    borderWidth: 1,
                    hoverBackgroundColor: ['#1a4971', '#4ade80', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Distribusi Status Sosial',
                        font: { size: 14, weight: 'bold' },
                        padding: { top: 10, bottom: 10 }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: { size: 12 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: { size: 12 },
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: 'Jumlah Lansia',
                            font: { size: 12 }
                        },
                        grid: {
                            display: true,
                            color: '#e2e8f0'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuad'
                }
            }
        });

        // Update bar chart Status DTKS
        if (window.dtksStatusChart) window.dtksStatusChart.destroy();
        window.dtksStatusChart = new Chart(dtksStatusChartCanvas, {
            type: 'bar',
            data: {
                labels: ['Terdaftar', 'Belum Terdaftar', 'Pengusulan'],
                datasets: [{
                    label: 'Jumlah Lansia',
                    data: [
                        dtksStatusCount['Terdaftar'],
                        dtksStatusCount['Belum Terdaftar'],
                        dtksStatusCount['Pengusulan Sedang Diproses']
                    ],
                    backgroundColor: ['#2b6cb0', '#f56565', '#ecc94b'],
                    borderColor: ['#1a4971', '#e53e3e', '#d69e2e'],
                    borderWidth: 1,
                    hoverBackgroundColor: ['#1a4971', '#e53e3e', '#d69e2e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Distribusi Status DTKS',
                        font: { size: 14, weight: 'bold' },
                        padding: { top: 10, bottom: 10 }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: { size: 12 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: { size: 12 },
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: 'Jumlah Lansia',
                            font: { size: 12 }
                        },
                        grid: {
                            display: true,
                            color: '#e2e8f0'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuad'
                }
            }
        });
        console.log('Bar charts updated');
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Update tabel data lansia individu
async function updateDataDisplay() {
    console.log('Updating lansia individu display...');
    const tableBody = document.getElementById('lansia-individu-table');
    if (!tableBody) {
        console.error('Lansia individu table element (lansia-individu-table) not found');
        return;
    }
    if (!window.lansiaIndividuData || !window.lansiaIndividuData.lansia) {
        console.error('lansiaIndividuData not initialized');
        return;
    }
    try {
        tableBody.innerHTML = '';
        const isAdmin = window.user_info && window.user_info.role === 'admin';
        const provinsiSet = new Set();
        window.lansiaIndividuData.lansia.forEach(l => {
            provinsiSet.add(parseAlamat(l.alamat).provinsi);
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.dataset.nik = l.nik;
            const editButton = isAdmin ? `<button class="edit-lansia-btn text-blue-600 hover:underline text-xs mr-2" data-nik="${l.nik}"><i class="fas fa-edit"></i> Edit</button>` : '';
            row.innerHTML = `
                <td class="p-2">${l.nik}</td>
                <td class="p-2"><span class="lansia-name" data-nik="${l.nik}">${l.nama}</span></td>
                <td class="p-2">${l.usia}</td>
                <td class="p-2">${l.kondisi_kesehatan.join(', ') || 'Tidak ada'}</td>
                <td class="p-2">${l.status_sosial}</td>
                <td class="p-2">${l.alamat}</td>
                <td class="p-2">${l.dtks_status || 'Belum Terdaftar'}</td>
                <td class="p-2">${editButton}<button class="delete-lansia-btn text-red-600 hover:underline text-xs ${isAdmin ? '' : 'opacity-50 cursor-not-allowed'}" data-nik="${l.nik}" ${isAdmin ? '' : 'disabled'}><i class="fas fa-trash"></i> Hapus</button></td>
            `;
            tableBody.appendChild(row);
        });
        console.log('Lansia individu table updated with', window.lansiaIndividuData.lansia.length, 'rows');

        const provinsiSelect = document.getElementById('filter-provinsi');
        if (provinsiSelect) {
            provinsiSelect.innerHTML = '<option value="">Semua Provinsi</option>' + Array.from(provinsiSet).map(p => `<option value="${p}">${p}</option>`).join('');
            console.log('Provinsi filter updated:', Array.from(provinsiSet));
        } else {
            console.error('Provinsi select element not found');
        }

        // Pasang event listener untuk filter
        const filterStatusSosial = document.getElementById('filter-status-sosial');
        const filterProvinsi = document.getElementById('filter-provinsi');
        const filterDtksStatus = document.getElementById('filter-dtks-status');
        if (filterStatusSosial && filterProvinsi && filterDtksStatus) {
            filterStatusSosial.addEventListener('change', () => {
                updateMap(filterStatusSosial.value, filterProvinsi.value, filterDtksStatus.value);
                console.log('Filter status sosial changed:', filterStatusSosial.value);
            });
            filterProvinsi.addEventListener('change', () => {
                updateMap(filterStatusSosial.value, filterProvinsi.value, filterDtksStatus.value);
                console.log('Filter provinsi changed:', filterProvinsi.value);
            });
            filterDtksStatus.addEventListener('change', () => {
                updateMap(filterStatusSosial.value, filterProvinsi.value, filterDtksStatus.value);
                console.log('Filter DTKS status changed:', filterDtksStatus.value);
            });
        } else {
            console.error('Filter elements not found');
        }

        attachButtonListeners();
    } catch (error) {
        console.error('Error updating lansia individu display:', error);
    }
}

// Update tabel riwayat ATENSI
async function updateAtensiTable(nik) {
    console.log('Updating atensi table for NIK:', nik);
    const tableBody = document.getElementById('atensi-table-body');
    if (!tableBody) {
        console.error('Atensi table body element not found');
        return;
    }
    try {
        const lansia = window.lansiaIndividuData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            console.error('Lansia not found for NIK:', nik);
            return;
        }
        tableBody.innerHTML = '';
        const isAdmin = window.user_info && window.user_info.role === 'admin';
        (lansia.riwayat_atensi || []).forEach((atensi, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.dataset.index = index;
            const editButton = isAdmin ? `<button class="edit-atensi-btn text-blue-600 hover:underline text-xs mr-2" data-nik="${nik}" data-index="${index}"><i class="fas fa-edit"></i> Edit</button>` : '';
            row.innerHTML = `
                <td class="p-2">${atensi.program}</td>
                <td class="p-2">${atensi.tanggal}</td>
                <td class="p-2">${atensi.status}</td>
                <td class="p-2">${editButton}<button class="delete-atensi-btn text-red-600 hover:underline text-xs ${isAdmin ? '' : 'opacity-50 cursor-not-allowed'}" data-nik="${nik}" data-index="${index}" ${isAdmin ? '' : 'disabled'}><i class="fas fa-trash"></i> Hapus</button></td>
            `;
            tableBody.appendChild(row);
        });
        console.log('Atensi table updated with', (lansia.riwayat_atensi || []).length, 'rows');
        if (isAdmin) {
            document.querySelectorAll('.edit-atensi-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const nik = e.target.dataset.nik;
                    const index = parseInt(e.target.dataset.index);
                    const lansia = window.lansiaIndividuData.lansia.find(l => l.nik === nik);
                    if (lansia && lansia.riwayat_atensi[index]) {
                        document.getElementById('atensi-nik').value = nik;
                        document.getElementById('atensi-program').value = lansia.riwayat_atensi[index].program;
                        document.getElementById('atensi-tanggal').value = lansia.riwayat_atensi[index].tanggal;
                        document.getElementById('atensi-status').value = lansia.riwayat_atensi[index].status;
                        document.getElementById('atensi-form').dataset.editIndex = index;
                    }
                });
            });
            document.querySelectorAll('.delete-atensi-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const nik = e.target.dataset.nik;
                    const index = parseInt(e.target.dataset.index);
                    handleDeleteAtensi(nik, index);
                });
            });
        }
    } catch (error) {
        console.error('Error updating atensi table:', error);
    }
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
    console.log('Notification shown:', message, type);
}

// Cari koordinat
async function cariKoordinat(alamat, button) {
    console.log('Searching coordinates for alamat:', alamat);
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

// Cek status DTKS
async function checkDTKS(nik, button) {
    console.log('Checking DTKS for NIK:', nik);
    if (!nik || nik.length !== 16 || !/^\d{16}$/.test(nik)) {
        showNotification('NIK harus 16 digit angka!', 'error');
        console.log('DTKS check failed: Invalid NIK', nik);
        return;
    }
    button.disabled = true;
    try {
        const response = await fetch('/api/dtks/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ nik }),
            credentials: 'include'
        });
        console.log('DTKS check response status:', response.status);
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        const dtksStatus = document.getElementById('dtks-status');
        const dtksStatusSelect = document.getElementById('dtks-status-select');
        if (dtksStatus && dtksStatusSelect) {
            dtksStatus.textContent = result.status || 'Belum Terdaftar';
            dtksStatus.dataset.status = result.status || 'Belum Terdaftar';
            dtksStatusSelect.value = result.status || 'Belum Terdaftar';
            if (result.status === 'Belum Terdaftar') {
                dtksStatus.innerHTML += ' <button id="propose-dtks-btn" class="text-blue-600 hover:underline text-xs"><i class="fas fa-upload"></i> Usulkan ke DTKS</button>';
                const proposeBtn = document.getElementById('propose-dtks-btn');
                if (proposeBtn) proposeBtn.addEventListener('click', () => proposeDTKS(nik));
            }
            showNotification(`Status DTKS: ${result.status || 'Belum Terdaftar'}`);
            console.log('DTKS check successful:', result);
        } else {
            console.error('DTKS status elements not found');
        }
    } catch (error) {
        showNotification(`Gagal memeriksa DTKS: ${error.message}`, 'error');
        console.error('DTKS check error:', error);
    } finally {
        button.disabled = false;
    }
}

// Usulkan ke DTKS
async function proposeDTKS(nik) {
    console.log('Proposing DTKS for NIK:', nik);
    const lansia = window.lansiaIndividuData.lansia.find(l => l.nik === nik);
    if (!lansia) {
        showNotification('Data lansia tidak ditemukan!', 'error');
        console.log('DTKS propose failed: Lansia not found', nik);
        return;
    }
    try {
        const response = await fetch('/api/dtks/propose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({
                nik: lansia.nik,
                nama: lansia.nama,
                alamat: lansia.alamat,
                status_sosial: lansia.status_sosial
            }),
            credentials: 'include'
        });
        console.log('DTKS propose response status:', response.status);
        const result = await response.json();
        if (!response.ok) throw new Error(`Gagal mengusulkan ke DTKS: ${result.error || response.status}`);
        showNotification('Data berhasil diusulkan ke DTKS.');
        console.log('DTKS propose successful:', nik);
        const dtksStatus = document.getElementById('dtks-status');
        const dtksStatusSelect = document.getElementById('dtks-status-select');
        if (dtksStatus && dtksStatusSelect) {
            dtksStatus.textContent = 'Pengusulan Sedang Diproses';
            dtksStatus.dataset.status = 'Pengusulan Sedang Diproses';
            dtksStatusSelect.value = 'Pengusulan Sedang Diproses';
        }
    } catch (error) {
        showNotification(`Gagal mengusulkan ke DTKS: ${error.message}`, 'error');
        console.error('DTKS propose error:', error);
    }
}

// Pencarian berdasarkan NIK
function searchByNIK(nik) {
    console.log('Searching for NIK:', nik);
    if (!nik || nik.length !== 16 || !/^\d{16}$/.test(nik)) {
        showNotification('NIK harus 16 digit angka!', 'error');
        console.log('Search failed: Invalid NIK', nik);
        return;
    }
    try {
        const lansia = window.lansiaIndividuData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            showNotification('Data lansia tidak ditemukan untuk NIK: ' + nik, 'error');
            console.log('Search failed: Lansia not found for NIK', nik);
            return;
        }
        const searchResult = document.getElementById('search-result');
        const editFromSearchBtn = document.getElementById('edit-from-search-btn');
        const atensiFromSearchBtn = document.getElementById('atensi-from-search-btn');
        if (!searchResult || !atensiFromSearchBtn) {
            console.error('Search result or button elements not found');
            return;
        }
        searchResult.innerHTML = `
            <div class="detail-item"><i class="fas fa-id-card"></i><span><strong>NIK:</strong> ${lansia.nik}</span></div>
            <div class="detail-item"><i class="fas fa-user"></i><span><strong>Nama:</strong> ${lansia.nama}</span></div>
            <div class="detail-item"><i class="fas fa-birthday-cake"></i><span><strong>Usia:</strong> ${lansia.usia}</span></div>
            <div class="detail-item"><i class="fas fa-heartbeat"></i><span><strong>Kondisi Kesehatan:</strong> ${lansia.kondisi_kesehatan.join(', ') || 'Tidak ada'}</span></div>
            <div class="detail-item"><i class="fas fa-users"></i><span><strong>Status Sosial:</strong> ${lansia.status_sosial}</span></div>
            <div class="detail-item"><i class="fas fa-map-marker-alt"></i><span><strong>Alamat:</strong> ${lansia.alamat}</span></div>
            <div class="detail-item"><i class="fas fa-database"></i><span><strong>Status DTKS:</strong> ${lansia.dtks_status || 'Belum Terdaftar'}</span></div>
            <div class="detail-item"><i class="fas fa-eye"></i><span><strong>Status Monitoring:</strong> ${lansia.status_monitoring}</span></div>
            <div class="detail-item"><i class="fas fa-star"></i><span><strong>Evaluasi Layanan:</strong> ${lansia.evaluasi_layanan}</span></div>
            <div class="detail-item"><i class="fas fa-history"></i><span><strong>Riwayat ATENSI:</strong><ul class="list-disc pl-5 mt-1">${(lansia.riwayat_atensi || []).map(a => `<li>${a.program} (${a.tanggal}, ${a.status})</li>`).join('') || 'Tidak ada'}</ul></span></div>
        `;
        if (editFromSearchBtn) {
            editFromSearchBtn.dataset.nik = nik;
            editFromSearchBtn.classList.remove('hidden');
        }
        atensiFromSearchBtn.dataset.nik = nik;
        initSearchMap(lansia);
        document.getElementById('search-modal').classList.remove('hidden');
        console.log('Search successful, displaying data for NIK:', nik);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Gagal mencari data lansia: ' + error.message, 'error');
    }
}

// Form submission untuk data lansia
async function handleFormSubmit(e) {
    console.log('Submitting lansia form...');
    e.preventDefault();
    const simpanBtn = document.getElementById('simpan-btn');
    if (!simpanBtn) {
        console.error('Simpan button not found');
        return;
    }
    simpanBtn.disabled = true;
    simpanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    if (!window.user_info) await fetchUserInfo();
    const editNik = document.getElementById('edit-nik').value;
    const data = {
        nik: document.getElementById('nik').value.trim(),
        nama: document.getElementById('nama').value.trim(),
        usia: parseInt(document.getElementById('usia').value) || 0,
        kondisi_kesehatan: Array.from(document.getElementById('kondisi_kesehatan').selectedOptions).map(opt => opt.value),
        status_sosial: document.getElementById('status_sosial').value,
        alamat: document.getElementById('alamat').value.trim(),
        status_monitoring: document.getElementById('status_monitoring').value,
        evaluasi_layanan: document.getElementById('evaluasi_layanan').value,
        dtks_status: document.getElementById('dtks-status-select').value || 'Belum Terdaftar',
        riwayat_atensi: editNik ? (window.lansiaIndividuData.lansia.find(l => l.nik === editNik)?.riwayat_atensi || []) : []
    };
    console.log('Lansia form data prepared:', data);

    if (!data.nik || !data.nama || !data.usia || !data.status_sosial || !data.alamat || !data.status_monitoring || !data.evaluasi_layanan) {
        showNotification('Semua field wajib diisi!', 'error');
        console.log('Lansia form validation failed: missing required fields');
        simpanBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
        simpanBtn.disabled = false;
        return;
    }
    if (data.nik.length !== 16 || !/^\d{16}$/.test(data.nik)) {
        showNotification('NIK harus 16 digit angka!', 'error');
        console.log('Lansia form validation failed: invalid NIK', data.nik);
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
            console.log('Lansia session check failed:', sessionResult);
            window.location.href = '/auth?tab=login';
            simpanBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
            simpanBtn.disabled = false;
            return;
        }

        let lat = document.getElementById('alamat').dataset.lat || 105.258;
        let lon = document.getElementById('alamat').dataset.lon || -5.425;
        if (!lat || !lon || editNik === '' || data.alamat !== (window.lansiaIndividuData.lansia.find(l => l.nik === editNik)?.alamat || '')) {
            if (geocodeCache.has(data.alamat)) {
                const { lat: cachedLat, lon: cachedLon } = geocodeCache.get(data.alamat);
                lat = cachedLat;
                lon = cachedLon;
                console.log('Lansia geocode retrieved from cache: Lat', lat, 'Lon', lon);
            } else {
                const response = await fetch('/api/geocode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
                    body: JSON.stringify({ address: data.alamat }),
                    credentials: 'include'
                });
                console.log('Lansia geocode response status:', response.status);
                const result = await response.json();
                if (result.error) {
                    data.geocoding_failed = true;
                    console.log('Lansia geocoding failed:', result.error);
                } else {
                    lat = parseFloat(result.lat);
                    lon = parseFloat(result.lon);
                    if (isNaN(lat) || isNaN(lon)) throw new Error('Invalid coordinates');
                    geocodeCache.set(data.alamat, { lat, lon });
                    console.log('Lansia geocode successful: Lat', lat, 'Lon', lon);
                }
            }
        } else if (editNik !== '') {
            const lansia = window.lansiaIndividuData.lansia.find(l => l.nik === editNik);
            lat = lansia.koordinat[1];
            lon = lansia.koordinat[0];
            console.log('Using existing lansia coordinates for edit:', lat, lon);
        }

        data.koordinat = [lon, lat];

        const saveData = {
            type: "LansiaCollection",
            lansia: window.lansiaIndividuData.lansia ? [...window.lansiaIndividuData.lansia] : []
        };
        if (editNik === '') {
            saveData.lansia.push(data);
            console.log('Adding new lansia:', data);
        } else {
            const index = saveData.lansia.findIndex(l => l.nik === editNik);
            if (index === -1) throw new Error('Lansia not found');
            saveData.lansia[index] = data;
            console.log('Updating lansia:', data);
        }
        const response = await fetch('/api/lansia_individu/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify(saveData),
            credentials: 'include'
        });
        console.log('Lansia save response status:', response.status);
        const result = await response.json();
        if (!response.ok) throw new Error(`Gagal menyimpan data lansia: ${result.error || response.status}`);
        window.lansiaIndividuData = saveData;
        updateDataDisplay();
        updateMap(
            document.getElementById('filter-status-sosial').value,
            document.getElementById('filter-provinsi').value,
            document.getElementById('filter-dtks-status').value
        );
        updateStats();
        document.getElementById('input-form').reset();
        document.getElementById('input-modal').classList.add('hidden');
        document.getElementById('dtks-status').textContent = '';
        document.getElementById('dtks-status').dataset.status = '';
        document.getElementById('dtks-status-select').value = 'Belum Terdaftar';
        showNotification(editNik === '' ? 'Data lansia berhasil ditambahkan!' : 'Data lansia berhasil diperbarui!');
    } catch (error) {
        console.error('Lansia form submission failed:', error);
        showNotification('Gagal menyimpan data lansia: ' + error.message, 'error');
        if (error.message.includes('Silakan login terlebih dahulu') || error.message.includes('401') || error.message.includes('403')) {
            window.location.href = '/auth?tab=login';
        }
    } finally {
        simpanBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
        simpanBtn.disabled = false;
        console.log('Lansia form submission completed');
    }
}

// Form submission untuk riwayat ATENSI
async function handleAtensiFormSubmit(e) {
    console.log('Submitting atensi form...');
    e.preventDefault();
    const simpanBtn = document.getElementById('simpan-atensi-btn');
    if (!simpanBtn) {
        console.error('Simpan atensi button not found');
        return;
    }
    simpanBtn.disabled = true;
    simpanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    try {
        const nik = document.getElementById('atensi-nik').value;
        const editIndex = document.getElementById('atensi-form').dataset.editIndex;
        const atensiData = {
            program: document.getElementById('atensi-program').value.trim(),
            tanggal: document.getElementById('atensi-tanggal').value,
            status: document.getElementById('atensi-status').value
        };
        if (!atensiData.program || !atensiData.tanggal || !atensiData.status) {
            showNotification('Semua field riwayat ATENSI wajib diisi!', 'error');
            console.log('Atensi form validation failed: missing required fields');
            simpanBtn.innerHTML = '<i class="fas fa-save"></i> Tambah';
            simpanBtn.disabled = false;
            return;
        }
        const saveData = {
            type: "LansiaCollection",
            lansia: [...window.lansiaIndividuData.lansia]
        };
        const lansiaIndex = saveData.lansia.findIndex(l => l.nik === nik);
        if (lansiaIndex === -1) {
            throw new Error('Lansia not found');
        }
        if (!saveData.lansia[lansiaIndex].riwayat_atensi) {
            saveData.lansia[lansiaIndex].riwayat_atensi = [];
        }
        if (editIndex !== undefined && editIndex !== '') {
            saveData.lansia[lansiaIndex].riwayat_atensi[parseInt(editIndex)] = atensiData;
            console.log('Updating atensi entry:', atensiData);
        } else {
            saveData.lansia[lansiaIndex].riwayat_atensi.push(atensiData);
            console.log('Adding new atensi entry:', atensiData);
        }
        const response = await fetch('/api/lansia_individu/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify(saveData),
            credentials: 'include'
        });
        console.log('Atensi save response status:', response.status);
        const result = await response.json();
        if (!response.ok) throw new Error(`Gagal menyimpan riwayat ATENSI: ${result.error || response.status}`);
        window.lansiaIndividuData = saveData;
        updateAtensiTable(nik);
        document.getElementById('atensi-form').reset();
        document.getElementById('atensi-form').dataset.editIndex = '';
        showNotification(editIndex !== '' ? 'Riwayat ATENSI berhasil diperbarui!' : 'Riwayat ATENSI berhasil ditambahkan!');
    } catch (error) {
        console.error('Atensi form submission failed:', error);
        showNotification('Gagal menyimpan riwayat ATENSI: ' + error.message, 'error');
    } finally {
        simpanBtn.innerHTML = '<i class="fas fa-save"></i> Tambah';
        simpanBtn.disabled = false;
        console.log('Atensi form submission completed');
    }
}

// Handle penghapusan lansia
async function handleDeleteLansia(e) {
    console.log('Deleting lansia data...');
    const nik = e.target.dataset.nik || e.target.closest('button').dataset.nik;
    if (!nik) {
        showNotification('NIK lansia tidak ditemukan.', 'error');
        console.log('Delete lansia failed: No NIK provided');
        return;
    }
    if (!window.user_info) await fetchUserInfo();
    if (window.user_info && window.user_info.role !== 'admin') {
        showNotification('Hanya admin yang dapat menghapus data lansia.', 'error');
        console.log('Delete lansia failed: User not admin');
        return;
    }
    const deleteBtn = e.target.closest('.delete-lansia-btn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghapus...';
    try {
        const index = window.lansiaIndividuData.lansia.findIndex(l => l.nik === nik);
        if (index === -1) {
            throw new Error('Lansia not found in client-side data');
        }
        const response = await fetch(`/api/lansia_individu/delete/${nik}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            credentials: 'include'
        });
        console.log('Delete lansia response status:', response.status);
        const result = await response.json();
        if (!response.ok) throw new Error(`Gagal menghapus data lansia: ${result.error || response.status}`);
        window.lansiaIndividuData.lansia.splice(index, 1);
        updateDataDisplay();
        updateMap(
            document.getElementById('filter-status-sosial').value,
            document.getElementById('filter-provinsi').value,
            document.getElementById('filter-dtks-status').value
        );
        updateStats();
        showNotification('Data lansia berhasil dihapus.');
        console.log('Lansia deleted successfully, NIK:', nik);
    } catch (error) {
        console.error('Delete lansia error:', error);
        showNotification(`Gagal menghapus data lansia: ${error.message}`, 'error');
        if (error.message.includes('404') || error.message.includes('not found')) {
            const index = window.lansiaIndividuData.lansia.findIndex(l => l.nik === nik);
            if (index !== -1) {
                window.lansiaIndividuData.lansia.splice(index, 1);
                updateDataDisplay();
                updateMap(
                    document.getElementById('filter-status-sosial').value,
                    document.getElementById('filter-provinsi').value,
                    document.getElementById('filter-dtks-status').value
                );
                updateStats();
                showNotification('Data lansia dihapus dari client-side karena tidak ditemukan di server.');
                console.log('Client-side lansia data removed, NIK:', nik);
            }
        }
    } finally {
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Hapus';
        deleteBtn.disabled = false;
    }
}

// Handle penghapusan riwayat ATENSI
async function handleDeleteAtensi(nik, index) {
    console.log('Deleting atensi entry for NIK:', nik, 'Index:', index);
    if (!window.user_info) await fetchUserInfo();
    if (window.user_info && window.user_info.role !== 'admin') {
        showNotification('Hanya admin yang dapat menghapus riwayat ATENSI.', 'error');
        console.log('Delete atensi failed: User not admin');
        return;
    }
    try {
        const saveData = {
            type: "LansiaCollection",
            lansia: [...window.lansiaIndividuData.lansia]
        };
        const lansiaIndex = saveData.lansia.findIndex(l => l.nik === nik);
        if (lansiaIndex === -1) {
            throw new Error('Lansia not found');
        }
        saveData.lansia[lansiaIndex].riwayat_atensi.splice(index, 1);
        const response = await fetch('/api/lansia_individu/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify(saveData),
            credentials: 'include'
        });
        console.log('Atensi delete response status:', response.status);
        const result = await response.json();
        if (!response.ok) throw new Error(`Gagal menghapus riwayat ATENSI: ${result.error || response.status}`);
        window.lansiaIndividuData = saveData;
        updateAtensiTable(nik);
        showNotification('Riwayat ATENSI berhasil dihapus.');
        console.log('Atensi deleted successfully for NIK:', nik, 'Index:', index);
    } catch (error) {
        console.error('Delete atensi error:', error);
        showNotification(`Gagal menghapus riwayat ATENSI: ${error.message}`, 'error');
    }
}

// Handle edit lansia
async function handleEditLansia(e) {
    console.log('Editing lansia data...');
    if (!window.user_info) await fetchUserInfo();
    if (window.user_info && window.user_info.role !== 'admin') {
        showNotification('Hanya admin yang dapat mengedit data lansia.', 'error');
        console.log('Edit lansia failed: User not admin');
        return;
    }
    const nik = e.target.dataset.nik || e.target.closest('button').dataset.nik;
    if (!nik) {
        console.error('Edit lansia failed: No NIK provided');
        return;
    }
    const lansia = window.lansiaIndividuData.lansia.find(l => l.nik === nik);
    if (!lansia) {
        console.log('Edit lansia failed: Lansia not found');
        return;
    }
    const editNikInput = document.getElementById('edit-nik');
    const nikInput = document.getElementById('nik');
    const namaInput = document.getElementById('nama');
    const usiaInput = document.getElementById('usia');
    const kondisiSelect = document.getElementById('kondisi_kesehatan');
    const statusSosialSelect = document.getElementById('status_sosial');
    const alamatInput = document.getElementById('alamat');
    const statusMonitoringSelect = document.getElementById('status_monitoring');
    const evaluasiSelect = document.getElementById('evaluasi_layanan');
    const dtksStatus = document.getElementById('dtks-status');
    const dtksStatusSelect = document.getElementById('dtks-status-select');
    const inputModal = document.getElementById('input-modal');
    if (!editNikInput || !nikInput || !namaInput || !usiaInput || !kondisiSelect || !statusSosialSelect || !alamatInput || !statusMonitoringSelect || !evaluasiSelect || !dtksStatus || !dtksStatusSelect || !inputModal) {
        console.error('Edit lansia form elements not found');
        return;
    }
    editNikInput.value = nik;
    nikInput.value = lansia.nik || '';
    namaInput.value = lansia.nama || '';
    usiaInput.value = lansia.usia || 0;
    Array.from(kondisiSelect.options).forEach(opt => {
        opt.selected = lansia.kondisi_kesehatan?.includes(opt.value) || false;
    });
    statusSosialSelect.value = lansia.status_sosial || '';
    alamatInput.value = lansia.alamat || '';
    alamatInput.dataset.lat = lansia.koordinat ? lansia.koordinat[1] : '';
    alamatInput.dataset.lon = lansia.koordinat ? lansia.koordinat[0] : '';
    statusMonitoringSelect.value = lansia.status_monitoring || '';
    evaluasiSelect.value = lansia.evaluasi_layanan || '';
    dtksStatus.textContent = lansia.dtks_status || 'Belum Terdaftar';
    dtksStatus.dataset.status = lansia.dtks_status || 'Belum Terdaftar';
    dtksStatusSelect.value = lansia.dtks_status || 'Belum Terdaftar';
    inputModal.classList.remove('hidden');
    initPreviewMap();
    if (lansia.koordinat) {
        if (window.previewMarker) window.previewMap.removeLayer(window.previewMarker);
        window.previewMarker = L.marker([lansia.koordinat[1], lansia.koordinat[0]]).addTo(window.previewMap);
        window.previewMap.setView([lansia.koordinat[1], lansia.koordinat[0]], 13);
    }
    console.log('Edit lansia form populated for NIK:', nik);
}

// Export ke CSV
function exportToCSV() {
    console.log('Export to CSV started');
    try {
        if (!window.lansiaIndividuData.lansia || window.lansiaIndividuData.lansia.length === 0) {
            throw new Error('Tidak ada data untuk diekspor');
        }
        const headers = ['NIK', 'Nama', 'Usia', 'Kondisi Kesehatan', 'Status Sosial', 'Alamat', 'Status DTKS'];
        const data = window.lansiaIndividuData.lansia.map(l => [
            l.nik || '',
            l.nama || '',
            l.usia || 0,
            l.kondisi_kesehatan.join(', ') || 'Tidak ada',
            l.status_sosial || '',
            l.alamat || '',
            l.dtks_status || 'Belum Terdaftar'
        ]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data_lansia_individu.csv';
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
        if (!window.lansiaIndividuData.lansia || window.lansiaIndividuData.lansia.length === 0) {
            throw new Error('Tidak ada data untuk diekspor');
        }
        const headers = ['NIK', 'Nama', 'Usia', 'Kondisi Kesehatan', 'Status Sosial', 'Alamat', 'Status DTKS'];
        const data = window.lansiaIndividuData.lansia.map(l => [
            l.nik || '',
            l.nama || '',
            l.usia || 0,
            l.kondisi_kesehatan.join(', ') || 'Tidak ada',
            l.status_sosial || '',
            l.alamat || '',
            l.dtks_status || 'Belum Terdaftar'
        ]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data_lansia_individu.csv';
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
        if (!window.lansiaIndividuData.lansia || window.lansiaIndividuData.lansia.length === 0) {
            throw new Error('Tidak ada data untuk diekspor');
        }
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF library not loaded');
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Judul
        doc.setFontSize(16);
        doc.text('Laporan Data Lansia Individu', 15, 15);
        doc.setFontSize(12);
        doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 15, 25);
        
        // Tabel
        doc.autoTable({
            head: [['NIK', 'Nama', 'Usia', 'Kondisi Kesehatan', 'Status Sosial', 'Alamat', 'Status DTKS']],
            body: window.lansiaIndividuData.lansia.map(l => [
                l.nik || '',
                l.nama || '',
                l.usia || 0,
                l.kondisi_kesehatan.join(', ') || 'Tidak ada',
                l.status_sosial || '',
                l.alamat || '',
                l.dtks_status || 'Belum Terdaftar'
            ]),
            startY: 35,
            styles: {
                fontSize: 9,
                cellPadding: 3,
                overflow: 'linebreak',
                halign: 'left',
                valign: 'middle',
                cellWidth: 'wrap'
            },
            headStyles: {
                fillColor: [43, 108, 176], // Warna biru (#2b6cb0)
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 25 }, // NIK
                1: { cellWidth: 25 }, // Nama
                2: { cellWidth: 10 }, // Usia
                3: { cellWidth: 30 }, // Kondisi Kesehatan
                4: { cellWidth: 20 }, // Status Sosial
                5: { cellWidth: 35 }, // Alamat
                6: { cellWidth: 25 }  // Status DTKS
            },
            margin: { top: 35, left: 15, right: 15 }
        });
        
        doc.save('data_lansia_individu.pdf');
        console.log('PDF file generated successfully with', window.lansiaIndividuData.lansia.length, 'rows');
    } catch (error) {
        console.error('Export to PDF failed:', error);
        showNotification('Gagal mengekspor ke PDF: ' + error.message, 'error');
    }
}

// Menyesuaikan tinggi peta
let lastMapHeight = 0;
const adjustMapHeight = debounce(() => {
    const mapContainer = document.getElementById('map-container');
    const statsContainer = document.getElementById('stats-container');
    if (!mapContainer || !statsContainer) {
        console.error('Map or stats container not found');
        return;
    }
    const statsHeight = statsContainer.offsetHeight;
    if (Math.abs(statsHeight - lastMapHeight) > 5) { // Hanya update jika perubahan signifikan
        mapContainer.style.height = `${statsHeight}px`;
        if (window.map) window.map.invalidateSize();
        lastMapHeight = statsHeight;
        console.log('Map height adjusted to:', statsHeight);
    }
}, 200);

// Tambahkan event listener untuk zoom dinamis dengan Ctrl + gulir mouse
document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const mapContainer = document.getElementById('map-container');
        let zoomLevel = parseFloat(getComputedStyle(document.body).zoom) || 1.0;
        zoomLevel += e.deltaY < 0 ? 0.1 : -0.1; // Tingkatkan atau kurangi zoom
        zoomLevel = Math.max(0.5, Math.min(1.5, zoomLevel)); // Batasi zoom antara 50% dan 150%
        document.body.style.zoom = zoomLevel;
        document.body.style.transform = `scale(${zoomLevel})`;
        document.body.style.transformOrigin = '0 0';
        if (mapContainer) {
            mapContainer.style.transform = `scale(${1 / zoomLevel})`; // Kompensasi zoom pada container peta
            mapContainer.style.transformOrigin = '0 0';
        }
        if (window.map) window.map.invalidateSize(); // Perbarui ukuran peta Leaflet
        console.log('Zoom level adjusted to:', zoomLevel);
    }
}, { passive: false });

// Pasang event listener untuk tombol
function attachButtonListeners() {
    console.log('Attaching button listeners...');
    const buttons = [
        { id: 'edit-lansia-btn', handler: handleEditLansia, event: 'click' },
        { id: 'delete-lansia-btn', handler: handleDeleteLansia, event: 'click' },
        { id: 'lansia-name', handler: handleLansiaNameClick, event: 'click' },
        { id: 'view-atensi-btn', handler: (e) => {
            const nik = e.target.dataset.nik;
            document.getElementById('atensi-nik').value = nik;
            updateAtensiTable(nik);
            document.getElementById('atensi-modal').classList.remove('hidden');
        }, event: 'click' }
    ];
    buttons.forEach(({ id, handler, event }) => {
        document.querySelectorAll(`.${id}`).forEach(elem => {
            elem.removeEventListener(event, handler);
            elem.addEventListener(event, handler);
        });
    });
    console.log('Button listeners attached');
}

// Inisialisasi peta pencarian
function initSearchMap(lansia) {
    const mapElement = document.getElementById('search-map');
    if (!mapElement) {
        console.error('Search map element not found');
        return;
    }
    if (window.searchMap) window.searchMap.remove();
    try {
        window.searchMap = L.map('search-map').setView(lansia.koordinat ? [lansia.koordinat[1], lansia.koordinat[0]] : [-6.2145, 106.8456], lansia.koordinat ? 13 : 5);
        const baseLayers = {
            "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }),
            "MapTiler Satellite": L.tileLayer('https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=IK5jI16RtevcjqQqE5n9', {
                attribution: '© MapTiler'
            }),
            "Esri World Imagery": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri'
            })
        };
        baseLayers["OpenStreetMap"].addTo(window.searchMap);
        L.control.layers(baseLayers).addTo(window.searchMap);
        if (lansia.koordinat) {
            L.marker([lansia.koordinat[1], lansia.koordinat[0]]).addTo(window.searchMap)
                .bindPopup(`<b>${lansia.nama}</b><br>${lansia.alamat}`);
        }
        console.log('Search map initialized for NIK:', lansia.nik);
    } catch (error) {
        console.error('Failed to initialize search map:', error);
    }
}

// Handle klik nama lansia
function handleLansiaNameClick(e) {
    const nik = e.target.dataset.nik;
    if (!nik || !window.lansiaIndividuData || !window.map) {
        console.error('Lansia name click failed: NIK, lansiaIndividuData, or map not found', nik);
        return;
    }
    const lansia = window.lansiaIndividuData.lansia.find(l => l.nik === nik);
    if (lansia && lansia.koordinat) {
        window.map.setView([lansia.koordinat[1], lansia.koordinat[0]], 12);
        if (window.lansiaIndividuMarker) window.map.removeLayer(window.lansiaIndividuMarker);
        window.lansiaIndividuMarker = L.marker([lansia.koordinat[1], lansia.koordinat[0]]).addTo(window.map);
        window.lansiaIndividuMarker.bindPopup(`
            <div class="bg-white p-2 rounded-lg border border-gray-300 text-xs">
                <h3 class="font-bold text-blue-600 mb-1">${lansia.nama}</h3>
                <p>NIK: ${lansia.nik}</p>
                <p>Usia: ${lansia.usia}</p>
                <p>Kondisi Kesehatan: ${lansia.kondisi_kesehatan.join(', ') || 'Tidak ada'}</p>
                <p>Status Sosial: ${lansia.status_sosial}</p>
                <p>Alamat: ${lansia.alamat}</p>
                <p>Status DTKS: ${lansia.dtks_status || 'Belum Terdaftar'}</p>
                <p>Status Monitoring: ${lansia.status_monitoring}</p>
                <p>Evaluasi Layanan: ${lansia.evaluasi_layanan}</p>
                <button class="view-atensi-btn btn-primary text-xs mt-2" data-nik="${lansia.nik}"><i class="fas fa-history"></i> Lihat Riwayat ATENSI</button>
            </div>
        `).openPopup();
        console.log('Lansia name clicked, map focused on NIK:', nik);
    }
}