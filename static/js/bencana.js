console.log('bencana.js loaded at ' + new Date().toLocaleString());

// Variabel global
window.map = null;
window.currentLayer = null;
window.markers = null;
window.bencanaData = { type: "FeatureCollection", features: [] };
window.mapInitialized = false;
window.tempMarker = null;
window.charts = {};

// Data dummy sebagai fallback
const dummyData = [
    {
        type: "Feature",
        geometry: { type: "Point", coordinates: [105.258, -5.425] },
        properties: {
            id: "1",
            jenis_bencana: "Gempa bumi",
            lokasi_nama: "Bandar Lampung",
            alamat: "Jl. Ikan Tenggiri No.72",
            waktu_kejadian: "2025-06-01T10:00:00",
            tingkat_keparahan: "Berat",
            luas_terdampak: 5.0,
            kebutuhan_mendesak: "Obat-obatan",
            korban: { meninggal: 5, luka_berat: 10, luka_ringan: 5, pengungsi: 50, rumah_rusak_berat: 20, rumah_rusak_sedang: 10, rumah_rusak_ringan: 5, fasilitas_umum: "Sekolah: 1" },
            bantuan: [{ jenis: "Logistik", instansi: "BNPB", jumlah: "100 paket", waktu: "2025-06-02" }],
            geocoding_failed: false,
            fotos: [],
            laporan: null
        }
    },
    {
        type: "Feature",
        geometry: { type: "Point", coordinates: [106.8456, -6.2145] },
        properties: {
            id: "2",
            jenis_bencana: "Banjir",
            lokasi_nama: "Jakarta Pusat",
            alamat: "Jl. Sudirman No.123",
            waktu_kejadian: "2025-06-05T14:00:00",
            tingkat_keparahan: "Sedang",
            luas_terdampak: 3.0,
            kebutuhan_mendesak: "Selimut",
            korban: { meninggal: 0, luka_berat: 5, luka_ringan: 10, pengungsi: 30, rumah_rusak_berat: 5, rumah_rusak_sedang: 10, rumah_rusak_ringan: 15, fasilitas_umum: "" },
            bantuan: [{ jenis: "Makanan", instansi: "PMI", jumlah: "50 paket", waktu: "2025-06-06" }],
            geocoding_failed: false,
            fotos: [],
            laporan: null
        }
    },
    {
        type: "Feature",
        geometry: { type: "Point", coordinates: [107.6191, -6.9175] },
        properties: {
            id: "3",
            jenis_bencana: "Kebakaran",
            lokasi_nama: "Bandung",
            alamat: "Jl. Asia Afrika No. 65",
            waktu_kejadian: "2025-06-10T08:00:00",
            tingkat_keparahan: "Ringan",
            luas_terdampak: 1.0,
            kebutuhan_mendesak: "Pakaian",
            korban: { meninggal: 0, luka_berat: 0, luka_ringan: 5, pengungsi: 10, rumah_rusak_berat: 2, rumah_rusak_sedang: 3, rumah_rusak_ringan: 5, fasilitas_umum: "" },
            bantuan: [],
            geocoding_failed: false,
            fotos: [],
            laporan: null
        }
    }
];

// Mapping ikon menggunakan FontAwesome
window.iconMap = {
    'Gempa bumi': L.divIcon({
        className: 'custom-icon',
        html: '<i class="fas fa-wave-square fa-2x" style="color: #ff4500;"></i>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    'Banjir': L.divIcon({
        className: 'custom-icon',
        html: '<i class="fas fa-tint fa-2x" style="color: #0095ff;"></i>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    'Longsor': L.divIcon({
        className: 'custom-icon',
        html: '<i class="fas fa-mountain fa-2x" style="color: #8b4513;"></i>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    'Kebakaran': L.divIcon({
        className: 'custom-icon',
        html: '<i class="fas fa-fire fa-2x" style="color: #ff0000;"></i>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    'default': L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })
};

// Inisialisasi peta
async function initMap(attempts = 5, delay = 1000) {
    console.log('Attempting to initialize map, attempts left:', attempts);
    if (typeof L !== 'undefined') {
        try {
            if (!document.getElementById('map')) throw new Error('Map container not found in DOM');
            window.map = L.map('map').setView([-2.5489, 118.0149], 5);
            window.currentLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(window.map);
            window.markers = L.markerClusterGroup();
            window.mapInitialized = true;
            console.log('Map initialized successfully');
            window.map.invalidateSize();
            await loadBencanaData();
        } catch (error) {
            console.error('Map initialization error:', error);
            showMapError(error);
        }
    } else if (attempts > 0) {
        console.warn('Leaflet not loaded, retrying after', delay, 'ms');
        setTimeout(() => initMap(attempts - 1, delay), delay);
    } else {
        console.error('Leaflet library not loaded after retries');
        showMapError(new Error('Leaflet library not loaded'));
    }
}

function showMapError(error) {
    const mapError = document.getElementById('map-error');
    if (mapError) mapError.style.display = 'block';
    console.error('Map error displayed:', error.message);
}

// Inisialisasi grafik
function initCharts() {
    try {
        console.log('Initializing charts');
        if (typeof Chart === 'undefined' || typeof ChartDataLabels === 'undefined') throw new Error('Chart.js atau Datalabels plugin tidak dimuat');

        // Hancurkan grafik lama
        Object.keys(window.charts).forEach(id => {
            if (window.charts[id]) {
                window.charts[id].destroy();
                console.log(`Destroyed chart: ${id}`);
            }
        });
        window.charts = {};

        const jenisCounts = {};
        const keparahanCounts = { Ringan: 0, Sedang: 0, Berat: 0 };
        let korbanMeninggal = 0, korbanLukaBerat = 0, korbanLukaRingan = 0;

        console.log('Processing chart data from', window.bencanaData.features.length, 'features');
        (window.bencanaData.features || []).forEach(feature => {
            if (!feature || !feature.properties || !feature.properties.jenis_bencana || !feature.properties.tingkat_keparahan) {
                console.warn('Skipping invalid feature for charts:', feature);
                return;
            }
            const props = feature.properties;
            jenisCounts[props.jenis_bencana] = (jenisCounts[props.jenis_bencana] || 0) + 1;
            keparahanCounts[props.tingkat_keparahan] = (keparahanCounts[props.tingkat_keparahan] || 0) + 1;
            korbanMeninggal += props.korban?.meninggal || 0;
            korbanLukaBerat += props.korban?.luka_berat || 0;
            korbanLukaRingan += props.korban?.luka_ringan || 0;
            console.log('Chart data for feature:', props.id, { jenis: props.jenis_bencana, keparahan: props.tingkat_keparahan, korban: props.korban });
        });

        const createGradient = (ctx, colors) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
            colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
            return gradient;
        };

        const chartConfigs = [
            { id: 'miniJenisChart', type: 'doughnut', labels: Object.keys(jenisCounts), data: Object.values(jenisCounts), legend: false, colors: ctx => [createGradient(ctx, ['#ff4500', '#ff8c00']), createGradient(ctx, ['#0095ff', '#00b7eb']), createGradient(ctx, ['#00ff00', '#32cd32'])] },
            { id: 'miniKorbanChart', type: 'bar', labels: ['Meninggal', 'Luka Berat', 'Luka Ringan'], data: [korbanMeninggal, korbanLukaBerat, korbanLukaRingan], legend: false, scales: { y: { beginAtZero: true } }, colors: ctx => createGradient(ctx, ['#ff4500', '#ff6347']) },
            { id: 'miniKeparahanChart', type: 'pie', labels: Object.keys(keparahanCounts), data: Object.values(keparahanCounts), legend: false, colors: ctx => [createGradient(ctx, ['#48bb78', '#66ff99']), createGradient(ctx, ['#ecc94b', '#ffeb3b']), createGradient(ctx, ['#f56565', '#ff8787'])] },
            { id: 'jenisChart', type: 'doughnut', labels: Object.keys(jenisCounts), data: Object.values(jenisCounts), legend: true, colors: ctx => [createGradient(ctx, ['#ff4500', '#ff8c00']), createGradient(ctx, ['#0095ff', '#00b7eb']), createGradient(ctx, ['#00ff00', '#32cd32'])] },
            { id: 'korbanChart', type: 'bar', labels: ['Meninggal', 'Luka Berat', 'Luka Ringan'], data: [korbanMeninggal, korbanLukaBerat, korbanLukaRingan], legend: false, scales: { y: { beginAtZero: true } }, colors: ctx => createGradient(ctx, ['#ff4500', '#ff6347']) },
            { id: 'keparahanChart', type: 'pie', labels: Object.keys(keparahanCounts), data: Object.values(keparahanCounts), legend: true, colors: ctx => [createGradient(ctx, ['#48bb78', '#66ff99']), createGradient(ctx, ['#ecc94b', '#ffeb3b']), createGradient(ctx, ['#f56565', '#ff8787'])] }
        ];

        chartConfigs.forEach(config => {
            const canvas = document.getElementById(config.id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                window.charts[config.id] = new Chart(ctx, {
                    type: config.type,
                    data: { labels: config.labels, datasets: [{ data: config.data, backgroundColor: config.colors(ctx), borderWidth: 1, borderColor: '#ffffff' }] },
                    options: {
                        plugins: {
                            legend: { display: config.legend, position: 'bottom', labels: { color: '#ffffff', font: { size: 10 } } },
                            datalabels: { color: '#ffffff', font: { weight: 'bold', size: 10 }, formatter: value => value || '' },
                            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#ffffff', bodyColor: '#ffffff', borderColor: '#ff4500', borderWidth: 1, cornerRadius: 8 }
                        },
                        scales: config.scales || {},
                        animation: { duration: 1000, easing: 'easeOutQuart' },
                        responsive: true,
                        maintainAspectRatio: false
                    },
                    plugins: [ChartDataLabels]
                });
                console.log(`Chart ${config.id} initialized with data:`, config.data);
            } else {
                console.error(`Canvas ${config.id} not found`);
            }
        });
    } catch (error) {
        console.error('Chart initialization error:', error);
    }
}

// Manajemen data
async function loadBencanaData() {
    try {
        console.log('Loading bencana data from /api/bencana/load');
        const response = await fetch('/api/bencana/load', {
            method: 'GET',
            credentials: 'include'
        });
        console.log('Load response status:', response.status);
        if (!response.ok) throw new Error(`Gagal memuat data: ${response.status}`);
        const data = await response.json();
        console.log('Raw bencana data:', JSON.stringify(data, null, 2));
        // Validasi respons GeoJSON
        if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
            console.warn('Invalid GeoJSON response, using dummy data');
            window.bencanaData = { type: "FeatureCollection", features: dummyData };
            await saveBencanaData();
        } else {
            // Validasi fitur
            const validFeatures = data.features.filter(feature =>
                feature &&
                feature.type === 'Feature' &&
                feature.geometry &&
                feature.geometry.type === 'Point' &&
                Array.isArray(feature.geometry.coordinates) &&
                feature.geometry.coordinates.length === 2 &&
                feature.properties &&
                feature.properties.id &&
                typeof feature.properties.id === 'string'
            );
            if (validFeatures.length < data.features.length) {
                console.warn(`Filtered ${data.features.length - validFeatures.length} invalid features`);
                window.bencanaData = { type: "FeatureCollection", features: validFeatures };
                await saveBencanaData();
            } else {
                window.bencanaData = { type: "FeatureCollection", features: validFeatures };
            }
        }
        console.log('Bencana data loaded:', window.bencanaData.features.length, 'valid features');
        await window.updateMap();
        await window.updateDataTable();
        window.initCharts();
    } catch (error) {
        console.error('Error loading bencana data:', error);
        window.bencanaData = { type: "FeatureCollection", features: dummyData };
        await saveBencanaData();
        await window.updateMap();
        await window.updateDataTable();
        window.initCharts();
    }
}

async function saveBencanaData() {
    try {
        console.log('Saving bencana data to /api/bencana/save', JSON.stringify(window.bencanaData, null, 2));
        console.log('Request headers:', { 'Content-Type': 'application/json', 'Cookie': document.cookie });
        const response = await fetch('/api/bencana/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.bencanaData),
            credentials: 'include'
        });
        console.log('Save response status:', response.status);
        const result = await response.json();
        console.log('Save response:', result);
        if (!response.ok) {
            console.error('Save failed:', result.error);
            throw new Error(result.error || `Gagal menyimpan data: ${response.status}`);
        }
        console.log('Data saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving bencana data:', error);
        throw error; // Biarkan error ditangani di handleFormSubmit
    }
}

// Update peta dengan ikon kustom dan efek gelombang
async function updateMap() {
    if (!window.mapInitialized || !window.markers) {
        console.warn('Map not initialized, skipping updateMap');
        return;
    }
    try {
        console.log('Updating map with features:', window.bencanaData.features ? window.bencanaData.features.length : 'undefined');
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('Map container not found in DOM');
            return;
        }
        window.markers.clearLayers();
        if (!window.bencanaData.features || !Array.isArray(window.bencanaData.features)) {
            console.warn('bencanaData.features is not an array or undefined, initializing empty array');
            window.bencanaData.features = [];
            return;
        }
        window.bencanaData.features.forEach(feature => {
            if (!feature || !feature.geometry || !feature.geometry.coordinates || !feature.properties) {
                console.warn('Skipping invalid feature for map:', feature);
                return;
            }
            const lat = feature.geometry.coordinates[1];
            const lon = feature.geometry.coordinates[0];
            const props = feature.properties;
            const marker = L.marker([lat, lon], { icon: window.iconMap[props.jenis_bencana] || window.iconMap['default'] });
            marker.bindPopup(`
                <div class="popup-content">
                    <h3 class="text-orange-500 font-bold">${props.lokasi_nama || 'Unknown'}</h3>
                    <p><strong>Jenis Bencana:</strong> ${props.jenis_bencana || 'Unknown'}</p>
                    <p><strong>Waktu:</strong> ${props.waktu_kejadian ? new Date(props.waktu_kejadian).toLocaleString() : 'Unknown'}</p>
                    <p><strong>Keparahan:</strong> ${props.tingkat_keparahan || 'Ringan'}</p>
                    <p><strong>Koordinat:</strong> ${lat}, ${lon}</p>
                    ${props.fotos?.length > 0 ? `<button class="view-gallery-btn bg-orange-500 hover:bg-orange-600 text-white p-1 rounded text-xs mt-2" data-id="${props.id}">Lihat Galeri</button>` : ''}
                    <button class="edit-btn bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-xs mt-2" data-id="${props.id}">Edit</button>
                    ${window.user_info && window.user_info.role === 'admin' ? `<button class="delete-btn bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs mt-2" data-id="${props.id}">Hapus</button>` : ''}
                </div>
            `);
            window.markers.addLayer(marker);
            console.log('Marker added for feature:', props.id, 'at:', { lat, lon });
        });
        window.map.addLayer(window.markers);
        window.map.invalidateSize();
        console.log('Map updated successfully with', window.bencanaData.features.length, 'markers');
    } catch (error) {
        console.error('Error updating map:', error);
    }
}

// Fungsi refresh peta dan tabel
window.refreshMapAndTable = async function() {
    console.log('Refreshing map and table');
    await window.updateMap();
    await window.updateDataTable();
    window.initCharts();
};

// Inisialisasi saat DOM dimuat
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded in bencana.js');
    initMap();
});