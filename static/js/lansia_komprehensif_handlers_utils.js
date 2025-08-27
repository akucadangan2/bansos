console.log('lansia_komprehensif_handlers_utils.js loaded at ' + new Date().toLocaleString());

// Fungsi untuk memperbarui konten tab dan menggulir ke form
function updateTabContent(tab) {
    console.log('Updating tab content:', tab);
    try {
        const tabs = document.querySelectorAll('.tab-content');
        const buttons = document.querySelectorAll('.tab-btn');
        tabs.forEach(t => t.classList.add('hidden'));
        buttons.forEach(b => b.classList.remove('active'));
        const activeTab = document.getElementById(`${tab}-tab`);
        const activeButton = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (!activeTab || !activeButton) {
            throw new Error(`Tab ${tab} or button not found`);
        }
        activeTab.classList.remove('hidden');
        activeButton.classList.add('active');

        // Gulir ke tab yang aktif dengan animasi halus
        setTimeout(() => {
            activeTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log(`Scrolled to tab: ${tab}`);
            // Fokus pada kolom input pertama jika ada
            const firstInput = activeTab.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
                console.log(`Focused on first input in tab: ${tab}`);
            }
        }, 100);

        // Perbarui tabel berdasarkan tab
        if (tab === 'personal') updateMainTable();
        else if (tab === 'health') updateHealthTable();
        else if (tab === 'finance') updateFinanceTable();
        else if (tab === 'activity') initCalendar();
        else if (tab === 'policy') updatePolicyTable();
        else if (tab === 'rehabilitation') updateRehabilitationTable();
        else if (tab === 'monitoring') updateMonitoringTable();
        else if (tab === 'partnership') updatePartnershipTable();
        else if (tab === 'balai') updateSentraTable();
        else if (tab === 'disaster') updateDisasterTable();
        else if (tab === 'productive') updateProductiveTable();
        else if (tab === 'advocacy') updateAdvocacyTable();
        else if (tab === 'hlun') updateHlunTable();
        else if (tab === 'training') updateTrainingTable();
        else if (tab === 'research') updateResearchTable();
    } catch (error) {
        console.error('Error updating tab content:', error);
        showNotification('Gagal memperbarui konten tab: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani klik tombol Input Data
function handleInputData() {
    console.log('Handling input data button click...');
    try {
        updateTabContent('personal');
        const form = document.getElementById('personal-form');
        if (!form) throw new Error('Personal form not found');
        form.reset();
        document.getElementById('edit-nik').value = '';
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
        document.getElementById('simpan-personal-btn').textContent = 'Simpan';
        document.getElementById('cancel-edit-btn').classList.add('hidden');
        setTimeout(() => {
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log('Scrolled to personal form');
            const firstInput = form.querySelector('input');
            if (firstInput) {
                firstInput.focus();
                console.log('Focused on first input in personal form');
            }
        }, 100);
    } catch (error) {
        console.error('Error handling input data:', error);
        showNotification('Gagal membuka form input data: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani klik tombol Ringkasan
function showSummary() {
    console.log('Showing summary...');
    try {
        const modal = document.getElementById('summary-modal');
        const content = document.getElementById('summary-content');
        if (!modal || !content) throw new Error('Summary modal or content not found');
        const lansia = window.lansiaKomprehensifData?.lansia || [];
        const policies = window.lansiaKomprehensifData?.policies || [];
        const rehabilitations = window.lansiaKomprehensifData?.rehabilitations || [];
        const monitorings = window.lansiaKomprehensifData?.monitorings || [];
        const partnerships = window.lansiaKomprehensifData?.partnerships || [];
        const balai = window.lansiaKomprehensifData?.balai || [];
        const disasters = window.lansiaKomprehensifData?.disasters || [];
        const productives = window.lansiaKomprehensifData?.productives || [];
        const advocacies = window.lansiaKomprehensifData?.advocacies || [];
        const hluns = window.lansiaKomprehensifData?.hluns || [];
        const trainings = window.lansiaKomprehensifData?.trainings || [];
        const researches = window.lansiaKomprehensifData?.researches || [];

        content.innerHTML = `
            <p>Total Lansia: ${lansia.length}</p>
            <p>Lansia DTKS: ${lansia.filter(l => l.status_sosial === 'DTKS').length}</p>
            <p>Total Kebijakan: ${policies.length}</p>
            <p>Total Rehabilitasi: ${rehabilitations.length}</p>
            <p>Total Pemantauan: ${monitorings.length}</p>
            <p>Total Kemitraan: ${partnerships.length}</p>
            <p>Total Balai: ${balai.length}</p>
            <p>Total Bencana: ${disasters.length}</p>
            <p>Total Lansia Produktif: ${productives.length}</p>
            <p>Total Advokasi: ${advocacies.length}</p>
            <p>Total HLUN: ${hluns.length}</p>
            <p>Total Pelatihan: ${trainings.length}</p>
            <p>Total Penelitian: ${researches.length}</p>
            <p>Total Kegiatan Terjadwal: ${lansia.reduce((count, l) => count + (l.kegiatan?.filter(k => k.status_kegiatan === 'Terjadwal').length || 0), 0)}</p>
        `;
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error showing summary:', error);
        showNotification('Gagal menampilkan ringkasan: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani klik tombol Ekspor
function exportToCSV() {
    console.log('Exporting to CSV...');
    try {
        const lansia = window.lansiaKomprehensifData?.lansia || [];
        let csv = 'NIK,Nama,Usia,Status Sosial,Alamat,Keluarga,Tempat Tinggal,Latitude,Longitude\n';
        lansia.forEach(l => {
            csv += `${l.nik || ''},${l.nama || ''},${l.usia || 0},${l.status_sosial || ''},${l.alamat || ''},${l.keluarga?.join(';') || ''},${l.tempat_tinggal || ''},${l.koordinat[1] || 0},${l.koordinat[0] || 0}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'lansia_komprehensif.csv';
        link.click();
        showNotification('Data berhasil diekspor ke CSV', 'success');
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        showNotification('Gagal mengekspor ke CSV: ' + error.message, 'error');
    }
}

function exportToExcel() {
    console.log('Exporting to Excel...');
    try {
        const lansia = window.lansiaKomprehensifData?.lansia || [];
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(lansia.map(l => ({
            NIK: l.nik || '',
            Nama: l.nama || '',
            Usia: l.usia || 0,
            Status_Sosial: l.status_sosial || '',
            Alamat: l.alamat || '',
            Keluarga: l.keluarga?.join(';') || '',
            Tempat_Tinggal: l.tempat_tinggal || '',
            Latitude: l.koordinat[1] || 0,
            Longitude: l.koordinat[0] || 0
        })));
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Lansia');
        XLSX.write_file(workbook, 'lansia_komprehensif.xlsx');
        showNotification('Data berhasil diekspor ke Excel', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Gagal mengekspor ke Excel: ' + error.message, 'error');
    }
}

function exportToPDF() {
    console.log('Exporting to PDF...');
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const lansia = window.lansiaKomprehensifData?.lansia || [];
        const policies = window.lansiaKomprehensifData?.policies || [];
        const rehabilitations = window.lansiaKomprehensifData?.rehabilitations || [];
        const monitorings = window.lansiaKomprehensifData?.monitorings || [];
        const partnerships = window.lansiaKomprehensifData?.partnerships || [];
        const balai = window.lansiaKomprehensifData?.balai || [];
        const disasters = window.lansiaKomprehensifData?.disasters || [];
        const productives = window.lansiaKomprehensifData?.productives || [];
        const advocacies = window.lansiaKomprehensifData?.advocacies || [];
        const hluns = window.lansiaKomprehensifData?.hluns || [];
        const trainings = window.lansiaKomprehensifData?.trainings || [];
        const researches = window.lansiaKomprehensifData?.researches || [];

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
                l.keluarga?.join(';') || '',
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
        showNotification('Gagal mengekspor ke PDF: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani klik tombol Bantuan
function showHelp() {
    console.log('Showing help modal...');
    try {
        const modal = document.getElementById('help-modal');
        if (!modal) throw new Error('Help modal not found');
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error showing help modal:', error);
        showNotification('Gagal menampilkan bantuan: ' + error.message, 'error');
    }
}

// Fungsi untuk menutup modal
function closeModal(event) {
    console.log('Closing modal...');
    try {
        const modal = event.target.closest('.modal');
        if (!modal) throw new Error('Modal not found');
        modal.classList.add('hidden');
    } catch (error) {
        console.error('Error closing modal:', error);
        showNotification('Gagal menutup modal: ' + error.message, 'error');
    }
}

// Fungsi untuk mengatur NIK pada form berdasarkan klik tabel utama
function setNikFromTable(event) {
    console.log('Setting NIK from table click...');
    try {
        const nik = event.target.closest('tr')?.querySelector('td:nth-child(2)')?.textContent;
        if (!nik) throw new Error('NIK tidak ditemukan di tabel');
        document.getElementById('health-nik').value = nik;
        document.getElementById('finance-nik').value = nik;
        document.getElementById('activity-nik').value = nik;
        updateHealthTable();
        updateFinanceTable();
        initCalendar();
        showNotification(`NIK ${nik} dipilih`, 'success');
    } catch (error) {
        console.error('Error setting NIK:', error);
        showNotification('Gagal memilih NIK: ' + error.message, 'error');
    }
}

// Fungsi untuk memasang event listener
function attachButtonListeners() {
    console.log('Attaching button listeners...');
    try {
        document.getElementById('input-btn')?.addEventListener('click', handleInputData);
        document.getElementById('summary-btn')?.addEventListener('click', showSummary);
        document.getElementById('export-btn')?.addEventListener('click', exportToPDF); // Ubah ke PDF
        document.getElementById('help-btn')?.addEventListener('click', showHelp);
        document.getElementById('close-help-btn')?.addEventListener('click', closeModal);
        document.getElementById('close-summary-btn')?.addEventListener('click', closeModal);
        document.getElementById('cari-koordinat')?.addEventListener('click', () => {
            const address = document.getElementById('alamat')?.value;
            console.log('Cari Koordinat button clicked for address:', address);
            if (address) {
                cariKoordinat(address, document.getElementById('cari-koordinat'));
            } else {
                showNotification('Masukkan alamat terlebih dahulu', 'error');
            }
        });
        document.getElementById('cari-koordinat-sentra')?.addEventListener('click', () => {
            const lokasi = document.getElementById('lokasi_sentra')?.value;
            console.log('Cari Koordinat Sentra button clicked for location:', lokasi);
            if (lokasi) {
                cariKoordinat(lokasi, document.getElementById('cari-koordinat-sentra'), 'latitude_sentra', 'longitude_sentra');
            } else {
                showNotification('Masukkan lokasi sentra terlebih dahulu', 'error');
            }
        });
        document.getElementById('cari-koordinat-bencana')?.addEventListener('click', () => {
            const lokasi = document.getElementById('lokasi_bencana')?.value;
            console.log('Cari Koordinat Bencana button clicked for location:', lokasi);
            if (lokasi) {
                cariKoordinat(lokasi, document.getElementById('cari-koordinat-bencana'), 'latitude_bencana', 'longitude_bencana');
            } else {
                showNotification('Masukkan lokasi bencana terlebih dahulu', 'error');
            }
        });
        document.getElementById('personal-form')?.addEventListener('submit', handlePersonalFormSubmit);
        document.getElementById('health-form')?.addEventListener('submit', handleHealthFormSubmit);
        document.getElementById('finance-form')?.addEventListener('submit', handleFinanceFormSubmit);
        document.getElementById('activity-form')?.addEventListener('submit', handleActivityFormSubmit);
        document.getElementById('policy-form')?.addEventListener('submit', handlePolicyFormSubmit);
        document.getElementById('rehabilitation-form')?.addEventListener('submit', handleRehabilitationFormSubmit);
        document.getElementById('monitoring-form')?.addEventListener('submit', handleMonitoringFormSubmit);
        document.getElementById('partnership-form')?.addEventListener('submit', handlePartnershipFormSubmit);
        document.getElementById('balai-form')?.addEventListener('submit', handleSentraFormSubmit);
        document.getElementById('disaster-form')?.addEventListener('submit', handleDisasterFormSubmit);
        document.getElementById('productive-form')?.addEventListener('submit', handleProductiveFormSubmit);
        document.getElementById('advocacy-form')?.addEventListener('submit', handleAdvocacyFormSubmit);
        document.getElementById('hlun-form')?.addEventListener('submit', handleHlunFormSubmit);
        document.getElementById('training-form')?.addEventListener('submit', handleTrainingFormSubmit);
        document.getElementById('research-form')?.addEventListener('submit', handleResearchFormSubmit);
        document.getElementById('filter-health-btn')?.addEventListener('click', handleHealthFilter);
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => updateTabContent(btn.dataset.tab));
        });
        document.querySelectorAll('#main-table tbody').forEach(tbody => {
            tbody.addEventListener('click', setNikFromTable);
        });
        console.log('Button listeners attached successfully');
    } catch (error) {
        console.error('Error attaching button listeners:', error);
        showNotification('Gagal memasang event listener: ' + error.message, 'error');
    }
}

// Inisialisasi saat dokumen dimuat
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded, initializing listeners...');
    attachButtonListeners();
});