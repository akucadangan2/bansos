console.log('lansia_komprehensif_tables.js loaded at ' + new Date().toLocaleString());

// Fungsi untuk menghasilkan ID unik
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Inisialisasi DataTables untuk semua tabel
$(document).ready(() => {
    const tables = [
        {
            id: 'main-table',
            data: () => {
                console.log('Main table data source:', window.lansiaKomprehensifData.lansia);
                return window.lansiaKomprehensifData.lansia || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'nik' },
                { data: 'nama' },
                { data: 'usia' },
                { data: 'status_sosial' },
                { data: 'alamat' },
                { data: 'keluarga', render: data => Array.isArray(data) ? data.join(', ') : '' },
                { data: 'tempat_tinggal' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-lansia-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-nik="${row.nik}"><i class="fas fa-edit"></i></button>
                        <button class="delete-lansia-btn bg-red-500 text-white px-2 py-1 rounded" data-nik="${row.nik}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'health-table',
            data: () => {
                const nik = document.getElementById('health-nik')?.value;
                const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
                console.log('Health table data source:', lansia?.kondisi_kesehatan || []);
                return lansia?.kondisi_kesehatan?.map(h => ({ ...h, id: h.id || generateId() })) || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'penyakit' },
                { data: 'tanggal_diagnosis' },
                { data: 'jadwal_periksa' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-health-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-health-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'finance-table',
            data: () => {
                const nik = document.getElementById('finance-nik')?.value;
                const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
                console.log('Finance table data source:', lansia?.keuangan || []);
                return lansia?.keuangan?.map(f => ({ ...f, id: f.id || generateId() })) || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'jenis_bantuan' },
                { data: 'jumlah_bantuan', render: data => data?.toLocaleString('id-ID') || 0 },
                { data: 'tanggal_bantuan' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-finance-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-finance-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'policy-table',
            data: () => {
                console.log('Policy table data source:', window.lansiaKomprehensifData.policies);
                return window.lansiaKomprehensifData.policies || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'judul_kebijakan' },
                { data: 'deskripsi_kebijakan' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-policy-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-policy-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'rehabilitation-table',
            data: () => {
                console.log('Rehabilitation table data source:', window.lansiaKomprehensifData.rehabilitations);
                return window.lansiaKomprehensifData.rehabilitations || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'nama_balai' },
                { data: 'layanan_balai' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-rehabilitation-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-rehabilitation-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'monitoring-table',
            data: () => {
                console.log('Monitoring table data source:', window.lansiaKomprehensifData.monitorings);
                return window.lansiaKomprehensifData.monitorings || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'nama_program' },
                { data: 'progres_program' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-monitoring-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-monitoring-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'partnership-table',
            data: () => {
                console.log('Partnership table data source:', window.lansiaKomprehensifData.partnerships);
                return window.lansiaKomprehensifData.partnerships || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'nama_mitra' },
                { data: 'kontak_mitra' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-partnership-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-partnership-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'balai-table',
            data: () => {
                console.log('Balai table data source:', window.lansiaKomprehensifData.balai);
                return window.lansiaKomprehensifData.balai || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'nama_sentra' },
                { data: 'lokasi_sentra' },
                { data: 'layanan_sentra' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-sentra-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-sentra-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'disaster-table',
            data: () => {
                console.log('Disaster table data source:', window.lansiaKomprehensifData.disasters);
                return window.lansiaKomprehensifData.disasters || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'kejadian_bencana' },
                { data: 'lokasi_bencana' },
                { data: 'kebutuhan_bencana' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-disaster-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-disaster-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'productive-table',
            data: () => {
                console.log('Productive table data source:', window.lansiaKomprehensifData.productives);
                return window.lansiaKomprehensifData.productives || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'nama_pelatihan' },
                { data: 'tanggal_pelatihan' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-productive-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-productive-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'advocacy-table',
            data: () => {
                console.log('Advocacy table data source:', window.lansiaKomprehensifData.advocacies);
                return window.lansiaKomprehensifData.advocacies || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'nama_kampanye' },
                { data: 'jadwal_kampanye' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-advocacy-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-advocacy-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'hlun-table',
            data: () => {
                console.log('Hlun table data source:', window.lansiaKomprehensifData.hluns);
                return window.lansiaKomprehensifData.hluns || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'nama_hlun' },
                { data: 'tanggal_hlun' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-hlun-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-hlun-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'training-table',
            data: () => {
                console.log('Training table data source:', window.lansiaKomprehensifData.trainings);
                return window.lansiaKomprehensifData.trainings || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'nama_training' },
                { data: 'tanggal_training' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-training-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-training-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        },
        {
            id: 'research-table',
            data: () => {
                console.log('Research table data source:', window.lansiaKomprehensifData.researches);
                return window.lansiaKomprehensifData.researches || [];
            },
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'judul_penelitian' },
                { data: 'ringkasan_penelitian' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="edit-research-btn bg-blue-500 text-white px-2 py-1 rounded mr-2" data-id="${row.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-research-btn bg-red-500 text-white px-2 py-1 rounded" data-id="${row.id}"><i class="fas fa-trash"></i></button>
                    `
                }
            ]
        }
    ];

    tables.forEach(table => {
        const tableInstance = $(`#${table.id}`).DataTable({
            data: table.data(),
            columns: table.columns,
            pageLength: 10,
            searching: true,
            ordering: true,
            language: {
                search: "Cari:",
                lengthMenu: "Tampilkan _MENU_ entri",
                info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ entri",
                paginate: {
                    first: "Pertama",
                    last: "Terakhir",
                    next: "Berikutnya",
                    previous: "Sebelumnya"
                },
                emptyTable: "Tidak ada data yang tersedia di tabel"
            }
        });

        // Re-attach event listeners after table update
        tableInstance.on('draw', () => {
            console.log(`Re-attaching event listeners for ${table.id} after draw`);
            document.querySelectorAll(`#${table.id} .edit-lansia-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditLansia(btn.dataset.nik));
            });
            document.querySelectorAll(`#${table.id} .delete-lansia-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.nik, 'lansia'));
            });
            document.querySelectorAll(`#${table.id} .edit-health-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditHealth(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-health-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'health'));
            });
            document.querySelectorAll(`#${table.id} .edit-finance-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditFinance(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-finance-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'finance'));
            });
            document.querySelectorAll(`#${table.id} .edit-policy-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditPolicy(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-policy-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'policy'));
            });
            document.querySelectorAll(`#${table.id} .edit-rehabilitation-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditRehabilitation(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-rehabilitation-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'rehabilitation'));
            });
            document.querySelectorAll(`#${table.id} .edit-monitoring-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditMonitoring(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-monitoring-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'monitoring'));
            });
            document.querySelectorAll(`#${table.id} .edit-partnership-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditPartnership(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-partnership-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'partnership'));
            });
            document.querySelectorAll(`#${table.id} .edit-sentra-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditSentra(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-sentra-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'balai'));
            });
            document.querySelectorAll(`#${table.id} .edit-disaster-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditDisaster(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-disaster-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'disaster'));
            });
            document.querySelectorAll(`#${table.id} .edit-productive-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditProductive(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-productive-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'productive'));
            });
            document.querySelectorAll(`#${table.id} .edit-advocacy-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditAdvocacy(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-advocacy-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'advocacy'));
            });
            document.querySelectorAll(`#${table.id} .edit-hlun-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditHlun(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-hlun-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'hlun'));
            });
            document.querySelectorAll(`#${table.id} .edit-training-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditTraining(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-training-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'training'));
            });
            document.querySelectorAll(`#${table.id} .edit-research-btn`).forEach(btn => {
                btn.addEventListener('click', () => handleEditResearch(btn.dataset.id));
            });
            document.querySelectorAll(`#${table.id} .delete-research-btn`).forEach(btn => {
                btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'research'));
            });
        });
    });
});

// Fungsi untuk memperbarui tabel kesehatan
function updateHealthTable() {
    console.log('Updating health table...');
    try {
        const table = $('#health-table').DataTable();
        table.clear();
        const nik = document.getElementById('health-nik')?.value;
        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        const data = lansia?.kondisi_kesehatan?.map(h => ({
            id: h.id || generateId(),
            penyakit: h.penyakit || '',
            tanggal_diagnosis: h.tanggal_diagnosis || '',
            jadwal_periksa: h.jadwal_periksa || ''
        })) || [];
        console.log('Health table data:', data);
        table.rows.add(data).draw();
        console.log('Health table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating health table:', error);
        showNotification('Gagal memperbarui tabel kesehatan: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel keuangan
function updateFinanceTable() {
    console.log('Updating finance table...');
    try {
        const table = $('#finance-table').DataTable();
        table.clear();
        const nik = document.getElementById('finance-nik')?.value;
        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        const data = lansia?.keuangan?.map(f => ({
            id: f.id || generateId(),
            jenis_bantuan: f.jenis_bantuan || '',
            jumlah_bantuan: f.jumlah_bantuan?.toLocaleString('id-ID') || 0,
            tanggal_bantuan: f.tanggal_bantuan || ''
        })) || [];
        console.log('Finance table data:', data);
        table.rows.add(data).draw();
        console.log('Finance table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating finance table:', error);
        showNotification('Gagal memperbarui tabel keuangan: ' + error.message, 'error');
    }
}

// Fungsi placeholder untuk inisialisasi kalender
function initCalendar() {
    console.log('Initializing calendar...');
    try {
        const calendarDiv = document.getElementById('calendar');
        if (!calendarDiv) throw new Error('Calendar element not found');
        const nik = document.getElementById('activity-nik')?.value;
        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        const activities = lansia?.kegiatan || [];
        console.log('Calendar data:', activities);
        if (activities.length === 0) {
            calendarDiv.innerHTML = '<p class="text-gray-700">Tidak ada kegiatan terjadwal untuk lansia ini.</p>';
        } else {
            let html = '<ul class="space-y-2">';
            activities.forEach(a => {
                html += `<li>${a.nama_kegiatan || ''} - ${a.tanggal_kegiatan || ''} (${a.status_kegiatan || ''})</li>`;
            });
            html += '</ul>';
            calendarDiv.innerHTML = html;
        }
        console.log('Calendar initialized with', activities.length, 'activities');
    } catch (error) {
        console.error('Error initializing calendar:', error);
        showNotification('Gagal menginisialisasi kalender: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel kebijakan
function updatePolicyTable() {
    console.log('Updating policy table...');
    try {
        const table = $('#policy-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.policies.map(p => ({
            id: p.id || generateId(),
            judul_kebijakan: p.judul_kebijakan || '',
            deskripsi_kebijakan: p.deskripsi_kebijakan || ''
        }));
        console.log('Policy table data:', data);
        table.rows.add(data).draw();
        console.log('Policy table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating policy table:', error);
        showNotification('Gagal memperbarui tabel kebijakan: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel rehabilitasi
function updateRehabilitationTable() {
    console.log('Updating rehabilitation table...');
    try {
        const table = $('#rehabilitation-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.rehabilitations.map(r => ({
            id: r.id || generateId(),
            nama_balai: r.nama_balai || '',
            layanan_balai: r.layanan_balai || ''
        }));
        console.log('Rehabilitation table data:', data);
        table.rows.add(data).draw();
        console.log('Rehabilitation table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating rehabilitation table:', error);
        showNotification('Gagal memperbarui tabel rehabilitasi: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel pemantauan
function updateMonitoringTable() {
    console.log('Updating monitoring table...');
    try {
        const table = $('#monitoring-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.monitorings.map(m => ({
            id: m.id || generateId(),
            nama_program: m.nama_program || '',
            progres_program: m.progres_program || ''
        }));
        console.log('Monitoring table data:', data);
        table.rows.add(data).draw();
        console.log('Monitoring table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating monitoring table:', error);
        showNotification('Gagal memperbarui tabel pemantauan: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel kemitraan
function updatePartnershipTable() {
    console.log('Updating partnership table...');
    try {
        const table = $('#partnership-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.partnerships.map(p => ({
            id: p.id || generateId(),
            nama_mitra: p.nama_mitra || '',
            kontak_mitra: p.kontak_mitra || ''
        }));
        console.log('Partnership table data:', data);
        table.rows.add(data).draw();
        console.log('Partnership table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating partnership table:', error);
        showNotification('Gagal memperbarui tabel kemitraan: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel balai
function updateSentraTable() {
    console.log('Updating sentra table...');
    try {
        const table = $('#balai-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.balai.map(b => ({
            id: b.id || generateId(),
            nama_sentra: b.nama_sentra || '',
            lokasi_sentra: b.lokasi_sentra || '',
            layanan_sentra: b.layanan_sentra || ''
        }));
        console.log('Sentra table data:', data);
        table.rows.add(data).draw();
        console.log('Sentra table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating sentra table:', error);
        showNotification('Gagal memperbarui tabel balai: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel bencana
function updateDisasterTable() {
    console.log('Updating disaster table...');
    try {
        const table = $('#disaster-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.disasters.map(d => ({
            id: d.id || generateId(),
            kejadian_bencana: d.kejadian_bencana || '',
            lokasi_bencana: d.lokasi_bencana || '',
            kebutuhan_bencana: d.kebutuhan_bencana || ''
        }));
        console.log('Disaster table data:', data);
        table.rows.add(data).draw();
        console.log('Disaster table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating disaster table:', error);
        showNotification('Gagal memperbarui tabel bencana: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel lansia produktif
function updateProductiveTable() {
    console.log('Updating productive table...');
    try {
        const table = $('#productive-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.productives.map(p => ({
            id: p.id || generateId(),
            nama_pelatihan: p.nama_pelatihan || '',
            tanggal_pelatihan: p.tanggal_pelatihan || ''
        }));
        console.log('Productive table data:', data);
        table.rows.add(data).draw();
        console.log('Productive table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating productive table:', error);
        showNotification('Gagal memperbarui tabel lansia produktif: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel advokasi
function updateAdvocacyTable() {
    console.log('Updating advocacy table...');
    try {
        const table = $('#advocacy-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.advocacies.map(a => ({
            id: a.id || generateId(),
            nama_kampanye: a.nama_kampanye || '',
            jadwal_kampanye: a.jadwal_kampanye || ''
        }));
        console.log('Advocacy table data:', data);
        table.rows.add(data).draw();
        console.log('Advocacy table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating advocacy table:', error);
        showNotification('Gagal memperbarui tabel advokasi: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel HLUN
function updateHlunTable() {
    console.log('Updating hlun table...');
    try {
        const table = $('#hlun-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.hluns.map(h => ({
            id: h.id || generateId(),
            nama_hlun: h.nama_hlun || '',
            tanggal_hlun: h.tanggal_hlun || ''
        }));
        console.log('Hlun table data:', data);
        table.rows.add(data).draw();
        console.log('Hlun table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating hlun table:', error);
        showNotification('Gagal memperbarui tabel HLUN: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel pelatihan
function updateTrainingTable() {
    console.log('Updating training table...');
    try {
        const table = $('#training-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.trainings.map(t => ({
            id: t.id || generateId(),
            nama_training: t.nama_training || '',
            tanggal_training: t.tanggal_training || ''
        }));
        console.log('Training table data:', data);
        table.rows.add(data).draw();
        console.log('Training table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating training table:', error);
        showNotification('Gagal memperbarui tabel pelatihan: ' + error.message, 'error');
    }
}

// Fungsi untuk memperbarui tabel pen evoke
function updateResearchTable() {
    console.log('Updating research table...');
    try {
        const table = $('#research-table').DataTable();
        table.clear();
        const data = window.lansiaKomprehensifData.researches.map(r => ({
            id: r.id || generateId(),
            judul_penelitian: r.judul_penelitian || '',
            ringkasan_penelitian: r.ringkasan_penelitian || ''
        }));
        console.log('Research table data:', data);
        table.rows.add(data).draw();
        console.log('Research table updated with', data.length, 'records');
    } catch (error) {
        console.error('Error updating research table:', error);
        showNotification('Gagal memperbarui tabel penelitian: ' + error.message, 'error');
    }
}