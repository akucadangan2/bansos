console.log('lansia_komprehensif.js loaded at ' + new Date().toLocaleString());

// Inisialisasi WebSocket
const socket = io();
socket.on('connect', () => {
    console.log('WebSocket connected successfully');
    showNotification('Terhubung ke server', 'success');
});
socket.on('update_notification', (data) => {
    console.log('Received WebSocket notification:', data);
    showNotification(data.message, 'success');
    loadData(); // Reload data setelah notifikasi update
});
socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
    showNotification('Gagal terhubung ke server: ' + error.message, 'error');
});

// Inisialisasi peta
let map, markers = [];
let usiaChart;

function initMap() {
    console.log('Initializing map...');
    try {
        map = L.map('map').setView([-6.2088, 106.8456], 10);
        L.tileLayer('https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=IK5jI16RtevcjqQqE5n9', {
            attribution: '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            tileSize: 512,
            zoomOffset: -1
        }).addTo(map);
        console.log('Map initialized successfully');
        updateMap();
    } catch (error) {
        console.error('Error initializing map:', error);
        showNotification('Gagal menginisialisasi peta: ' + error.message, 'error');
    }
}

// Inisialisasi data global
window.lansiaKomprehensifData = {
    lansia: [],
    policies: [],
    rehabilitations: [],
    monitorings: [],
    partnerships: [],
    balai: [],
    disasters: [],
    productives: [],
    advocacies: [],
    hluns: [],
    trainings: [],
    researches: []
};

// Fungsi untuk memuat data dari server
async function loadData() {
    console.log('Loading data from /api/lansia_komprehensif/load...');
    try {
        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/load', {
            headers: { 'X-Bypass-RBAC': 'true' },
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Raw data from server:', data);
        window.lansiaKomprehensifData = {
            lansia: (data.lansia || []).map(l => ({
                nik: String(l.nik || ''),
                nama: String(l.nama || ''),
                usia: parseInt(l.usia) || 0,
                status_sosial: String(l.status_sosial || ''),
                alamat: String(l.alamat || ''),
                koordinat: Array.isArray(l.koordinat) && l.koordinat.length === 2 ? l.koordinat.map(Number) : [0, 0],
                keluarga: Array.isArray(l.keluarga) ? l.keluarga.map(String) : [],
                tempat_tinggal: String(l.tempat_tinggal || ''),
                kondisi_kesehatan: Array.isArray(l.kondisi_kesehatan) ? l.kondisi_kesehatan.map(h => ({
                    id: String(h.id || generateId()),
                    penyakit: String(h.penyakit || ''),
                    tanggal_diagnosis: String(h.tanggal_diagnosis || ''),
                    jadwal_periksa: String(h.jadwal_periksa || '')
                })) : [],
                keuangan: Array.isArray(l.keuangan) ? l.keuangan.map(f => ({
                    id: String(f.id || generateId()),
                    jenis_bantuan: String(f.jenis_bantuan || ''),
                    jumlah_bantuan: parseInt(f.jumlah_bantuan) || 0,
                    tanggal_bantuan: String(f.tanggal_bantuan || '')
                })) : [],
                kegiatan: Array.isArray(l.kegiatan) ? l.kegiatan.map(a => ({
                    id: String(a.id || generateId()),
                    nama_kegiatan: String(a.nama_kegiatan || ''),
                    tanggal_kegiatan: String(a.tanggal_kegiatan || ''),
                    status_kegiatan: String(a.status_kegiatan || '')
                })) : []
            })),
            policies: (data.policies || []).map(p => ({
                id: String(p.id || generateId()),
                judul_kebijakan: String(p.judul_kebijakan || ''),
                deskripsi_kebijakan: String(p.deskripsi_kebijakan || '')
            })),
            rehabilitations: (data.rehabilitations || []).map(r => ({
                id: String(r.id || generateId()),
                nama_balai: String(r.nama_balai || ''),
                layanan_balai: String(r.layanan_balai || '')
            })),
            monitorings: (data.monitorings || []).map(m => ({
                id: String(m.id || generateId()),
                nama_program: String(m.nama_program || ''),
                progres_program: String(m.progres_program || '')
            })),
            partnerships: (data.partnerships || []).map(p => ({
                id: String(p.id || generateId()),
                nama_mitra: String(p.nama_mitra || ''),
                kontak_mitra: String(p.kontak_mitra || '')
            })),
            balai: (data.balai || []).map(b => ({
                id: String(b.id || generateId()),
                nama_sentra: String(b.nama_sentra || ''),
                lokasi_sentra: String(b.lokasi_sentra || ''),
                koordinat: Array.isArray(b.koordinat) && b.koordinat.length === 2 ? b.koordinat.map(Number) : [0, 0],
                layanan_sentra: String(b.layanan_sentra || '')
            })),
            disasters: (data.disasters || []).map(d => ({
                id: String(d.id || generateId()),
                kejadian_bencana: String(d.kejadian_bencana || ''),
                lokasi_bencana: String(d.lokasi_bencana || ''),
                koordinat: Array.isArray(d.koordinat) && d.koordinat.length === 2 ? d.koordinat.map(Number) : [0, 0],
                kebutuhan_bencana: String(d.kebutuhan_bencana || '')
            })),
            productives: (data.productives || []).map(p => ({
                id: String(p.id || generateId()),
                nama_pelatihan: String(p.nama_pelatihan || ''),
                tanggal_pelatihan: String(p.tanggal_pelatihan || '')
            })),
            advocacies: (data.advocacies || []).map(a => ({
                id: String(a.id || generateId()),
                nama_kampanye: String(a.nama_kampanye || ''),
                jadwal_kampanye: String(a.jadwal_kampanye || '')
            })),
            hluns: (data.hluns || []).map(h => ({
                id: String(h.id || generateId()),
                nama_hlun: String(h.nama_hlun || ''),
                tanggal_hlun: String(h.tanggal_hlun || '')
            })),
            trainings: (data.trainings || []).map(t => ({
                id: String(t.id || generateId()),
                nama_training: String(t.nama_training || ''),
                tanggal_training: String(t.tanggal_training || '')
            })),
            researches: (data.researches || []).map(r => ({
                id: String(r.id || generateId()),
                judul_penelitian: String(r.judul_penelitian || ''),
                ringkasan_penelitian: String(r.ringkasan_penelitian || '')
            }))
        };
        console.log('Processed lansiaKomprehensifData:', window.lansiaKomprehensifData);
        updateMainTable();
        updateMap();
        updateStats();
        updateHealthTable();
        updateFinanceTable();
        initCalendar();
        updatePolicyTable();
        updateRehabilitationTable();
        updateMonitoringTable();
        updatePartnershipTable();
        updateSentraTable();
        updateDisasterTable();
        updateProductiveTable();
        updateAdvocacyTable();
        updateHlunTable();
        updateTrainingTable();
        updateResearchTable();
        showNotification('Data berhasil dimuat', 'success');
        showLoading(false);
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Gagal memuat data: ' + error.message, 'error');
        showLoading(false);
    }
}

// Fungsi untuk memperbarui tabel utama
function updateMainTable() {
    console.log('Updating main table...');
    try {
        const table = $('#main-table').DataTable();
        table.clear();
        const lansia = window.lansiaKomprehensifData.lansia || [];
        console.log('Lansia data for table:', lansia);
        const tableData = lansia.map(l => ({
            nik: l.nik || '',
            nama: l.nama || '',
            usia: l.usia || 0,
            status_sosial: l.status_sosial || '',
            alamat: l.alamat || '',
            keluarga: Array.isArray(l.keluarga) ? l.keluarga.join(', ') : '',
            tempat_tinggal: l.tempat_tinggal || ''
        }));
        table.rows.add(tableData).draw();
        console.log('Main table updated with', tableData.length, 'records');
    } catch (error) {
        console.error('Error updating main table:', error);
        showNotification('Gagal memperbarui tabel utama: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui peta
function updateMap() {
    console.log('Updating map markers...');
    try {
        if (!map) throw new Error('Map not initialized');
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        const lansia = window.lansiaKomprehensifData.lansia || [];
        lansia.forEach(l => {
            if (l.koordinat && Array.isArray(l.koordinat) && l.koordinat.length === 2 && !isNaN(l.koordinat[0]) && !isNaN(l.koordinat[1])) {
                const marker = L.marker([l.koordinat[1], l.koordinat[0]])
                    .bindPopup(`<b>${l.nama || 'Unknown'}</b><br>NIK: ${l.nik || ''}<br>Alamat: ${l.alamat || ''}`)
                    .addTo(map);
                markers.push(marker);
            }
        });
        if (markers.length > 0) {
            map.fitBounds(markers.map(m => m.getLatLng()));
        }
        console.log('Map updated with', markers.length, 'markers');
    } catch (error) {
        console.error('Error updating map:', error);
        showNotification('Gagal memperbarui peta: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui statistik
function updateStats() {
    console.log('Updating stats...');
    try {
        const lansia = window.lansiaKomprehensifData.lansia || [];
        const totalLansia = lansia.length;
        const lansiaDTKS = lansia.filter(l => l.status_sosial === 'DTKS').length;
        const bantuanTerkini = lansia.reduce((acc, l) => {
            const latest = l.keuangan?.slice(-1)[0]?.jenis_bantuan || '-';
            return latest !== '-' ? latest : acc;
        }, '-');
        const kegiatanTerjadwal = lansia.reduce((count, l) => {
            return count + (l.kegiatan?.filter(a => a.status_kegiatan === 'Terjadwal').length || 0);
        }, 0);

        document.getElementById('total-lansia').textContent = totalLansia;
        document.getElementById('lansia-dtks').textContent = lansiaDTKS;
        document.getElementById('bantuan-terkini').textContent = bantuanTerkini;
        document.getElementById('kegiatan-terjadwal').textContent = kegiatanTerjadwal;

        if (usiaChart) usiaChart.destroy();
        const ctx = document.getElementById('usia-chart').getContext('2d');
        usiaChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['60-70', '71-80', '>80'],
                datasets: [{
                    label: 'Distribusi Usia Lansia',
                    data: [
                        lansia.filter(l => l.usia >= 60 && l.usia <= 70).length,
                        lansia.filter(l => l.usia > 70 && l.usia <= 80).length,
                        lansia.filter(l => l.usia > 80).length
                    ],
                    backgroundColor: ['#007bff', '#28a745', '#dc3545']
                }]
            },
            options: { scales: { y: { beginAtZero: true } } }
        });
        console.log('Stats updated');
    } catch (error) {
        console.error('Error updating stats:', error);
        showNotification('Gagal memperbarui statistik: ' + error.message, 'error');
    }
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'success') {
    console.log('Showing notification:', message, type);
    const notification = document.getElementById('notification');
    if (!notification) {
        console.error('Notification element not found');
        return;
    }
    notification.textContent = message;
    notification.className = `notification ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`;
    notification.classList.remove('hidden');
    setTimeout(() => notification.classList.add('hidden'), 3000);
}

// Fungsi untuk menampilkan loading indicator
function showLoading(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    } else {
        console.warn('Loading indicator element not found');
    }
}

// Fungsi untuk memverifikasi autentikasi pengguna
async function fetchUserInfo() {
    console.log('Fetching user info...');
    try {
        const response = await fetch('/api/user', {
            headers: { 'X-Bypass-RBAC': 'true' },
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('User info fetched:', data);
        if (!data.is_authenticated || data.role !== 'admin') {
            showNotification('Silakan login sebagai admin untuk mengakses fitur', 'error');
            setTimeout(() => window.location.href = '/auth?tab=login', 3000);
        }
        return data;
    } catch (error) {
        console.error('Error fetching user info:', error);
        showNotification('Gagal memverifikasi pengguna: ' + error.message, 'error');
    }
}

// Fungsi untuk menghasilkan ID unik
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Fungsi untuk ekspor ke PDF
function exportToPDF() {
    console.log('Exporting to PDF...');
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const lansia = window.lansiaKomprehensifData.lansia || [];
        const policies = window.lansiaKomprehensifData.policies || [];
        const rehabilitations = window.lansiaKomprehensifData.rehabilitations || [];
        const monitorings = window.lansiaKomprehensifData.monitorings || [];
        const partnerships = window.lansiaKomprehensifData.partnerships || [];
        const balai = window.lansiaKomprehensifData.balai || [];
        const disasters = window.lansiaKomprehensifData.disasters || [];
        const productives = window.lansiaKomprehensifData.productives || [];
        const advocacies = window.lansiaKomprehensifData.advocacies || [];
        const hluns = window.lansiaKomprehensifData.hluns || [];
        const trainings = window.lansiaKomprehensifData.trainings || [];
        const researches = window.lansiaKomprehensifData.researches || [];

        // Tambahkan header
        doc.setFontSize(18);
        doc.text('Laporan Pengelolaan Komprehensif Lansia', 20, 20);
        doc.setFontSize(12);
        doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 20, 30);
        doc.text('WebGIS Bansos', 20, 40);

        // Ringkasan
        doc.setFontSize(14);
        doc.text('Ringkasan', 20, 50);
        doc.setFontSize(12);
        doc.text(`Total Lansia: ${lansia.length}`, 20, 60);
        doc.text(`Lansia DTKS: ${lansia.filter(l => l.status_sosial === 'DTKS').length}`, 20, 70);
        doc.text(`Total Kebijakan: ${policies.length}`, 20, 80);
        doc.text(`Total Rehabilitasi: ${rehabilitations.length}`, 20, 90);
        doc.text(`Total Pemantauan: ${monitorings.length}`, 20, 100);
        doc.text(`Total Kemitraan: ${partnerships.length}`, 20, 110);
        doc.text(`Total Balai: ${balai.length}`, 20, 120);
        doc.text(`Total Bencana: ${disasters.length}`, 20, 130);
        doc.text(`Total Lansia Produktif: ${productives.length}`, 20, 140);
        doc.text(`Total Advokasi: ${advocacies.length}`, 20, 150);
        doc.text(`Total HLUN: ${hluns.length}`, 20, 160);
        doc.text(`Total Pelatihan: ${trainings.length}`, 20, 170);
        doc.text(`Total Penelitian: ${researches.length}`, 20, 180);

        // Tabel Lansia
        doc.setFontSize(14);
        doc.text('Data Lansia', 20, 190);
        doc.autoTable({
            startY: 200,
            head: [['No', 'NIK', 'Nama', 'Usia', 'Status Sosial', 'Alamat', 'Keluarga', 'Tempat Tinggal']],
            body: lansia.map((l, i) => [
                i + 1,
                l.nik || '',
                l.nama || '',
                l.usia || 0,
                l.status_sosial || '',
                l.alamat || '',
                Array.isArray(l.keluarga) ? l.keluarga.join(', ') : '',
                l.tempat_tinggal || ''
            ]),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 },
            margin: { top: 20 }
        });

        // Tabel Kebijakan
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Kebijakan', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Judul', 'Deskripsi']],
            body: policies.map((p, i) => [i + 1, p.judul_kebijakan || '', p.deskripsi_kebijakan || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel Rehabilitasi
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Rehabilitasi', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Nama Balai', 'Layanan']],
            body: rehabilitations.map((r, i) => [i + 1, r.nama_balai || '', r.layanan_balai || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel Pemantauan
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Pemantauan', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Program', 'Progres']],
            body: monitorings.map((m, i) => [i + 1, m.nama_program || '', m.progres_program || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel Kemitraan
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Kemitraan', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Nama Mitra', 'Kontak']],
            body: partnerships.map((p, i) => [i + 1, p.nama_mitra || '', p.kontak_mitra || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel Balai
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Balai', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Nama Sentra', 'Lokasi', 'Layanan']],
            body: balai.map((b, i) => [i + 1, b.nama_sentra || '', b.lokasi_sentra || '', b.layanan_sentra || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel Bencana
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Bencana', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Kejadian', 'Lokasi', 'Kebutuhan']],
            body: disasters.map((d, i) => [i + 1, d.kejadian_bencana || '', d.lokasi_bencana || '', d.kebutuhan_bencana || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel Lansia Produktif
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Lansia Produktif', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Nama Pelatihan', 'Tanggal']],
            body: productives.map((p, i) => [i + 1, p.nama_pelatihan || '', p.tanggal_pelatihan || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel Advokasi
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Advokasi', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Nama Kampanye', 'Jadwal']],
            body: advocacies.map((a, i) => [i + 1, a.nama_kampanye || '', a.jadwal_kampanye || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel HLUN
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data HLUN', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Nama Kegiatan', 'Tanggal']],
            body: hluns.map((h, i) => [i + 1, h.nama_hlun || '', h.tanggal_hlun || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel Pelatihan
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Pelatihan', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Nama Pelatihan', 'Tanggal']],
            body: trainings.map((t, i) => [i + 1, t.nama_training || '', t.tanggal_training || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Tabel Penelitian
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Data Penelitian', 20, 20);
        doc.autoTable({
            startY: 30,
            head: [['No', 'Judul', 'Ringkasan']],
            body: researches.map((r, i) => [i + 1, r.judul_penelitian || '', r.ringkasan_penelitian || '']),
            theme: 'grid',
            headStyles: { fillColor: [0, 123, 255], textColor: [255, 255, 255] },
            styles: { fontSize: 10 }
        });

        // Atribusi
        doc.setFontSize(10);
        doc.text('Map data © OpenStreetMap contributors, Imagery © MapTiler', 20, doc.lastAutoTable.finalY + 10);

        // Simpan PDF
        doc.save('laporan_lansia_komprehensif.pdf');
        showNotification('Laporan PDF berhasil diunduh', 'success');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showNotification('Gagal mengekspor PDF: ' + error.message, 'error');
    }
}

// Inisialisasi saat dokumen dimuat
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    fetchUserInfo();
    initMap();
    loadData();
});