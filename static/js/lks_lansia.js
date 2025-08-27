$(document).ready(function() {
    let map;
    let markers = L.layerGroup();
    window.lksData = [];
    let dataTable, fixedHeader;
    let existingIds = [];
    const provinsiList = [
        "Semua Provinsi", "ACEH", "BALI", "BANTEN", "BENGKULU", "GORONTALO", "JAKARTA", 
        "JAMBI", "JAWA BARAT", "JAWA TENGAH", "JAWA TIMUR", "KALIMANTAN BARAT", 
        "KALIMANTAN SELATAN", "KALIMANTAN TENGAH", "KALIMANTAN TIMUR", 
        "KALIMANTAN UTARA", "KEPULAUAN BANGKA BELITUNG", "KEPULAUAN RIAU", 
        "LAMPUNG", "MALUKU", "MALUKU UTARA", "NUSA TENGGARA BARAT", 
        "NUSA TENGGARA TIMUR", "PAPUA", "PAPUA BARAT", "RIAU", 
        "SULAWESI BARAT", "SULAWESI SELATAN", "SULAWESI TENGAH", 
        "SULAWESI TENGGARA", "SULAWESI UTARA", "SUMATERA BARAT", 
        "SUMATERA SELATAN", "SUMATERA UTARA", "DAERAH ISTIMEWA YOGYAKARTA"
    ];
    const kabupatenList = {
        "ACEH": ["KOTA BANDA ACEH", "ACEH BESAR", "ACEH UTARA"],
        "JAKARTA": ["JAKARTA BARAT", "JAKARTA TIMUR", "JAKARTA SELATAN", "JAKARTA UTARA", "JAKARTA PUSAT"],
        "BALI": ["DENPASAR", "BADUNG", "GIANYAR"],
        "DAERAH ISTIMEWA YOGYAKARTA": ["BANTUL", "SLEMAN", "YOGYAKARTA"]
    };
    const provinsiCoordinates = {
        "ACEH": { latitude: 5.5483, longitude: 95.3238 },
        "BALI": { latitude: -8.6705, longitude: 115.2126 },
        "BANTEN": { latitude: -6.4058, longitude: 106.0640 },
        "BENGKULU": { latitude: -3.8004, longitude: 102.2560 },
        "GORONTALO": { latitude: 0.5587, longitude: 123.0595 },
        "JAKARTA": { latitude: -6.2088, longitude: 106.8456 },
        "JAMBI": { latitude: -1.6101, longitude: 103.6131 },
        "JAWA BARAT": { latitude: -6.9148, longitude: 107.6098 },
        "JAWA TENGAH": { latitude: -7.1507, longitude: 110.1403 },
        "JAWA TIMUR": { latitude: -7.5361, longitude: 112.2384 },
        "KALIMANTAN BARAT": { latitude: -0.0263, longitude: 109.3425 },
        "KALIMANTAN SELATAN": { latitude: -3.3199, longitude: 114.5907 },
        "KALIMANTAN TENGAH": { latitude: -2.2136, longitude: 113.9136 },
        "KALIMANTAN TIMUR": { latitude: 0.5387, longitude: 116.4194 },
        "KALIMANTAN UTARA": { latitude: 3.2000, longitude: 117.6000 },
        "KEPULAUAN BANGKA BELITUNG": { latitude: -2.1333, longitude: 106.1167 },
        "KEPULAUAN RIAU": { latitude: 1.0833, longitude: 104.4833 },
        "LAMPUNG": { latitude: -5.4292, longitude: 105.2623 },
        "MALUKU": { latitude: -3.2385, longitude: 130.1453 },
        "MALUKU UTARA": { latitude: 0.7912, longitude: 127.3660 },
        "NUSA TENGGARA BARAT": { latitude: -8.6529, longitude: 117.3616 },
        "NUSA TENGGARA TIMUR": { latitude: -10.1770, longitude: 123.6070 },
        "PAPUA": { latitude: -4.0457, longitude: 136.1912 },
        "PAPUA BARAT": { latitude: -1.3361, longitude: 133.1747 },
        "RIAU": { latitude: 0.5097, longitude: 101.4383 },
        "SULAWESI BARAT": { latitude: -2.8441, longitude: 119.2321 },
        "SULAWESI SELATAN": { latitude: -5.1477, longitude: 119.4327 },
        "SULAWESI TENGAH": { latitude: -0.8918, longitude: 119.8707 },
        "SULAWESI TENGGARA": { latitude: -4.1449, longitude: 122.1746 },
        "SULAWESI UTARA": { latitude: 1.4748, longitude: 124.8421 },
        "SUMATERA BARAT": { latitude: -0.7399, longitude: 100.8000 },
        "SUMATERA SELATAN": { latitude: -3.3199, longitude: 103.9144 },
        "SUMATERA UTARA": { latitude: 3.5852, longitude: 98.6756 },
        "DAERAH ISTIMEWA YOGYAKARTA": { latitude: -7.7956, longitude: 110.3695 }
    };

    // Show loading indicator
    function showLoading(show, progress = 0) {
        const loadingIndicator = $('#loading-indicator');
        const progressFill = $('#progress-fill');
        if (show) {
            loadingIndicator.removeClass('hidden').show();
            loadingIndicator.find('span').text(`Memproses... ${progress}%`);
            progressFill.css('width', `${progress}%`);
        } else {
            setTimeout(() => {
                loadingIndicator.addClass('hidden').hide();
                progressFill.css('width', '0%');
            }, 300);
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = $('#notification');
        notification.text(message);
        notification.removeClass().addClass(`notification ${type === 'error' ? 'bg-red-100 text-red-700' : type === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`);
        notification.removeClass('hidden');
        setTimeout(() => notification.addClass('hidden'), 5000);
    }

    // Generate unique ID
    function generateUniqueId(existingId) {
        return `${existingId}_dup${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    // Load data from localStorage
    function loadDataFromStorage() {
        showLoading(true, 10);
        const savedData = localStorage.getItem('lksData');
        if (savedData) {
            window.lksData = JSON.parse(savedData);
        } else {
            window.lksData = [
                { id_lembaga: "11620", no_lembaga: "7989214350", nama_lembaga: "UPTD. RUMOH SEUJAHTERA GEUNASEH SAYANG (RSGS)", nama_ketua: "INTAN MELYA, A.KS, M.SI", alamat_lembaga: "DESA LAMGLUMPANG, KECAMATAN ULEE KARENG, KOTA BANDA ACEH", id_provinsi: "11", id_kabupaten: "1171", id_kecamatan: "1171041", id_kelurahan: "1171041005", id_akreditasi: "22835", nama_lembaga_akreditasi: "UPTD. RUMOH SEUJAHTERA GEUNASEH SAYANG (RSGS)", nama_layanan: "LKS LANJUT USIA DALAM PANTI", cluster: "Cluster Lanjut Usia", provinsi: "ACEH", kabupaten: "KOTA BANDA ACEH", peringkat: "A", jenis_layanan: "LKS LANJUT USIA DALAM PANTI", tahun_pengajuan: 2024, latitude: 5.5577, longitude: 95.3220, dummy: true, uploaded: false, upload_timestamp: null, status: "Original" },
                { id_lembaga: "LKS001", no_lembaga: "001", nama_lembaga: "LKS Sejahtera", nama_ketua: "Budi Santoso", alamat_lembaga: "Jl. Sudirman No. 10", id_provinsi: "ID-JK", id_kabupaten: "ID-JK-JB", id_kecamatan: "ID-JK-JB-KC", id_kelurahan: "ID-JK-JB-KC-KL", id_akreditasi: "AKR001", nama_lembaga_akreditasi: "Lembaga Akreditasi A", nama_layanan: "Layanan Lansia", cluster: "Cluster 1", provinsi: "JAKARTA", kabupaten: "JAKARTA BARAT", peringkat: "A", jenis_layanan: "LKS LANJUT USIA DALAM PANTI", tahun_pengajuan: 2023, latitude: -6.2146, longitude: 106.8451, dummy: true, uploaded: false, upload_timestamp: null, status: "Original" },
                { id_lembaga: "LKS002", no_lembaga: "002", nama_lembaga: "LKS Harmoni", nama_ketua: "Siti Aminah", alamat_lembaga: "Jl. Gatot Subroto", id_provinsi: "ID-BA", id_kabupaten: "ID-BA-DP", id_kecamatan: "ID-BA-DP-KC", id_kelurahan: "ID-BA-DP-KC-KL", id_akreditasi: "AKR002", nama_lembaga_akreditasi: "Lembaga Akreditasi B", nama_layanan: "Layanan Lansia Luar", cluster: "Cluster 2", provinsi: "BALI", kabupaten: "DENPASAR", peringkat: "B", jenis_layanan: "LKS LANJUT USIA LUAR PANTI", tahun_pengajuan: 2022, latitude: -8.6705, longitude: 115.2126, dummy: true, uploaded: false, upload_timestamp: null, status: "Original" },
                { id_lembaga: "LKS003", no_lembaga: "003", nama_lembaga: "LKS Makmur", nama_ketua: "Ahmad Yani", alamat_lembaga: "", id_provinsi: "ID-YO", id_kabupaten: "ID-YO-BY", id_kecamatan: "ID-YO-BY-KC", id_kelurahan: "ID-YO-BY-KC-KL", id_akreditasi: "AKR003", nama_lembaga_akreditasi: "Lembaga Akreditasi C", nama_layanan: "Layanan Lansia Dalam", cluster: "Cluster 3", provinsi: "DAERAH ISTIMEWA YOGYAKARTA", kabupaten: "BANTUL", peringkat: "C", jenis_layanan: "LKS LANJUT USIA DALAM PANTI", tahun_pengajuan: 2024, latitude: -7.7956, longitude: 110.3695, dummy: true, uploaded: false, upload_timestamp: null, status: "Original" },
                { id_lembaga: "LKS004", no_lembaga: "004", nama_lembaga: "LKS Sejahtera", nama_ketua: "Budi Santoso", alamat_lembaga: "Jl. Sudirman No. 10", id_provinsi: "ID-JK", id_kabupaten: "ID-JK-JB", id_kecamatan: "ID-JK-JB-KC", id_kelurahan: "ID-JK-JB-KC-KL", id_akreditasi: "AKR004", nama_lembaga_akreditasi: "Lembaga Akreditasi A", nama_layanan: "Layanan Lansia", cluster: "Cluster 1", provinsi: "JAKARTA", kabupaten: "JAKARTA BARAT", peringkat: "TTA", jenis_layanan: "LKS LANJUT USIA DALAM PANTI", tahun_pengajuan: 2024, latitude: -6.2146, longitude: 106.8451, dummy: true, uploaded: false, upload_timestamp: null, status: "Duplicate" }
            ];
        }
        existingIds = window.lksData.map(lks => lks.id_lembaga);
        saveDataToStorage();
        updateTable();
        updateStats();
        const mapElement = document.getElementById('map');
        if (isElementInViewport(mapElement)) {
            initMap();
            mapElement.dataset.loaded = 'true';
            mapElement.classList.remove('lazy-load-placeholder');
        }
        window.addEventListener('loadMap', initMap);
        showLoading(false);
    }

    // Check if element is in viewport
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // Save data to localStorage
    function saveDataToStorage() {
        try {
            localStorage.setItem('lksData', JSON.stringify(window.lksData));
        } catch (e) {
            showNotification('Kapasitas localStorage penuh. Gunakan backend untuk data besar.', 'error');
        }
    }

    // Initialize map
    function initMap() {
        if (map) return;
        showLoading(true, 50);
        map = L.map('map').setView([-2.5489, 118.0149], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        markers.addTo(map);
        updateMap();
        showLoading(false);
    }

    // Update map
    function updateMap() {
        showLoading(true, 60);
        if (!map) {
            initMap();
            return;
        }
        markers.clearLayers();
        const filteredData = window.lksData.filter(lks => lks.tahun_pengajuan);
        filteredData.forEach(lks => {
            if (lks.latitude && lks.longitude) {
                const marker = L.marker([lks.latitude, lks.longitude]).bindPopup(`
                    <b>${lks.nama_lembaga}</b><br>
                    Alamat: ${lks.alamat_lembaga || 'Tidak ada alamat'}<br>
                    Provinsi: ${lks.provinsi}<br>
                    Kabupaten: ${lks.kabupaten}<br>
                    Peringkat: ${lks.peringkat}<br>
                    Layanan: ${lks.jenis_layanan}<br>
                    Tahun Pengajuan: ${lks.tahun_pengajuan || 'N/A'}<br>
                    Status: ${lks.status}
                `);
                markers.addLayer(marker);
            }
        });
        showLoading(false);
    }

    // Update table
    function updateTable(filterProvinsi = '', filterKabupaten = '', filterPeringkat = '', filterTahun = '', filterStatus = 'all') {
        showLoading(true, 30);
        if (dataTable) {
            dataTable.destroy();
            if (fixedHeader) {
                fixedHeader.disable();
                fixedHeader = null;
            }
        }
        let filteredData = window.lksData.filter(lks => lks.tahun_pengajuan);
        if (filterProvinsi && filterProvinsi !== 'Semua Provinsi') {
            filteredData = filteredData.filter(lks => lks.provinsi === filterProvinsi);
        }
        if (filterKabupaten && filterKabupaten !== 'Semua Kabupaten') {
            filteredData = filteredData.filter(lks => lks.kabupaten === filterKabupaten);
        }
        if (filterPeringkat) {
            filteredData = filteredData.filter(lks => lks.peringkat === filterPeringkat);
        }
        if (filterTahun) {
            filteredData = filteredData.filter(lks => lks.tahun_pengajuan && lks.tahun_pengajuan.toString() === filterTahun);
        }
        if (filterStatus === 'uploaded') {
            filteredData = filteredData.filter(lks => lks.uploaded && !lks.dummy);
        } else if (filterStatus === 'latest') {
            filteredData = filteredData.filter(lks => lks.uploaded && !lks.dummy).sort((a, b) => b.upload_timestamp - a.upload_timestamp);
        } else if (filterStatus === 'dummy') {
            filteredData = filteredData.filter(lks => lks.dummy);
        } else if (filterStatus === 'duplicate') {
            filteredData = filteredData.filter(lks => lks.status === 'Duplicate');
        }
        const rowsPerPage = $('#rows-per-page').val() === 'all' ? -1 : parseInt($('#rows-per-page').val());
        dataTable = $('#lks-table').DataTable({
            data: filteredData,
            pageLength: rowsPerPage,
            columns: [
                { data: null, render: (data, type, row, meta) => meta.row + 1 },
                { data: 'id_lembaga' },
                { data: 'no_lembaga' },
                { data: 'nama_lembaga' },
                { data: 'nama_ketua' },
                { data: 'alamat_lembaga' },
                { data: 'provinsi' },
                { data: 'kabupaten' },
                { data: 'peringkat' },
                { data: 'jenis_layanan' },
                { data: 'tahun_pengajuan' },
                { data: 'status', render: data => `<span class="${data === 'Duplicate' ? 'bg-red-100 p-1 rounded' : ''}">${data}</span>` },
                {
                    data: null,
                    render: (data) => `
                        <button class="edit-btn action-btn" data-id="${data.id_lembaga}"><i class="fas fa-edit mr-2"></i> Edit</button>
                        <button class="delete-btn action-btn bg-red-500 text-white" data-id="${data.id_lembaga}"><i class="fas fa-trash mr-2"></i> Hapus</button>
                        ${data.uploaded ? '<button class="remove-upload-btn action-btn bg-yellow-500 text-white" data-id="${data.id_lembaga}"><i class="fas fa-times mr-2"></i> Hapus Upload</button>' : ''}
                    `
                }
            ],
            language: {
                search: "Cari:",
                lengthMenu: "Tampilkan _MENU_ entri",
                info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ entri",
                paginate: {
                    first: "Pertama",
                    last: "Terakhir",
                    next: "Selanjutnya",
                    previous: "Sebelumnya"
                }
            },
            deferRender: true,
            scrollY: 400,
            scrollCollapse: true,
            scroller: true,
            columnDefs: [
                { width: '5%', targets: 0 },
                { width: '10%', targets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
                { width: '15%', targets: 12 }
            ],
            createdRow: function(row, data) {
                if (data.status === 'Duplicate') {
                    $(row).addClass('bg-red-100');
                    $(row).attr('title', 'Data duplikat: LKS ini memiliki entri ganda dalam satu tahun.');
                }
            },
            initComplete: function() {
                $('#total-displayed').text(`Total Data: ${filteredData.length}`);
                try {
                    if (!fixedHeader && $.fn.dataTable.FixedHeader) {
                        fixedHeader = new $.fn.dataTable.FixedHeader(dataTable, {
                            header: true,
                            headerOffset: 0
                        });
                    }
                } catch (e) {
                    console.warn('Failed to initialize FixedHeader:', e);
                }
                showLoading(false);
            }
        });
    }

    // Update dashboard stats
    function updateStats() {
        showLoading(true, 90);
        const totalLks = window.lksData.length;
        const lksA = window.lksData.filter(lks => lks.peringkat === 'A').length;
        const lksDalamPanti = window.lksData.filter(lks => lks.jenis_layanan === 'LKS LANJUT USIA DALAM PANTI').length;
        const lksLuarPanti = window.lksData.filter(lks => lks.jenis_layanan === 'LKS LANJUT USIA LUAR PANTI').length;
        const totalPengajuan = [...new Set(window.lksData.filter(lks => lks.tahun_pengajuan).map(lks => lks.id_lembaga))].length;

        $('#total-lks').text(totalLks);
        $('#lks-a').text(lksA);
        $('#lks-dalam-panti').text(lksDalamPanti);
        $('#lks-luar-panti').text(lksLuarPanti);
        $('#total-pengajuan').text(totalPengajuan);
        showLoading(false);
    }

    // Tab navigation
    $('.tab-btn').click(function() {
        const tabId = $(this).data('tab');
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.tab-content').addClass('hidden');
        $(`#${tabId}-tab`).removeClass('hidden');
        scrollToElement(`${tabId}-tab`);
    });

    // Scroll to element
    function scrollToElement(elementId) {
        $('html, body').animate({
            scrollTop: $(`#${elementId}`).offset().top - 100
        }, 500);
    }

    // Navigation buttons
    $('#management-lansia-btn').click(function() {
        window.location.href = 'lansia_individu.html';
    });
    $('#lansia-50-btn').click(function() {
        window.location.href = 'lansia_komprehensif.html';
    });
    $('#layanan-lansia-btn').click(function() {
        window.location.href = 'lansia.html';
    });

    // Input button
    $('#input-btn').click(function() {
        $('.tab-btn[data-tab="input-data"]').click();
    });

    // Get coordinates
    function getCoordinates(alamat, provinsi) {
        if (provinsi && provinsiCoordinates[provinsi]) {
            return provinsiCoordinates[provinsi];
        }
        showNotification('Koordinat tidak ditemukan untuk provinsi ini.', 'error');
        return null;
    }

    // Input form submission
    $('#lks-form').submit(function(e) {
        e.preventDefault();
        showLoading(true, 50);
        const provinsi = $('#provinsi').val().toUpperCase();
        if (!provinsi || !provinsiList.includes(provinsi, 1)) {
            showNotification('Provinsi harus diisi dengan nilai yang valid', 'error');
            showLoading(false);
            return;
        }
        const alamat = $('#alamat_lembaga').val() || '';
        const coordinates = getCoordinates(alamat, provinsi);
        const tahun = parseInt($('#tahun_pengajuan').val()) || null;
        if (!tahun) {
            showNotification('Tahun pengajuan harus diisi untuk data akreditasi', 'error');
            showLoading(false);
            return;
        }
        const data = {
            id_lembaga: $('#id_lembaga').val() || generateUniqueId('LKS'),
            no_lembaga: $('#no_lembaga').val() || 'Tidak Diketahui',
            nama_lembaga: $('#nama_lembaga').val() || 'Tidak Diketahui',
            nama_ketua: $('#nama_ketua').val() || 'Tidak Diketahui',
            alamat_lembaga: alamat || 'Tidak Diketahui',
            id_provinsi: $('#id_provinsi').val() || null,
            id_kabupaten: $('#id_kabupaten').val() || null,
            id_kecamatan: $('#id_kecamatan').val() || null,
            id_kelurahan: $('#id_kelurahan').val() || null,
            id_akreditasi: $('#id_akreditasi').val() || null,
            nama_lembaga_akreditasi: $('#nama_lembaga_akreditasi').val() || 'Tidak Diketahui',
            nama_layanan: $('#nama_layanan').val() || 'Tidak Diketahui',
            cluster: $('#cluster').val() || 'Tidak Diketahui',
            provinsi: provinsi,
            kabupaten: $('#kabupaten').val() || 'Tidak Diketahui',
            peringkat: $('#peringkat').val() || 'TTA',
            jenis_layanan: $('#jenis_layanan').val() || 'LKS LANJUT USIA DALAM PANTI',
            tahun_pengajuan: tahun,
            latitude: coordinates ? coordinates.latitude : null,
            longitude: coordinates ? coordinates.longitude : null,
            uploaded: false,
            upload_timestamp: null,
            dummy: false,
            status: 'Original'
        };
        const editId = $('#edit-id-lembaga').val();
        if (editId) {
            const index = window.lksData.findIndex(lks => lks.id_lembaga === editId);
            window.lksData[index] = data;
            showNotification('Data berhasil diperbarui', 'success');
        } else {
            const key = `${data.id_lembaga}-${data.tahun_pengajuan}`;
            const sameYearDuplicate = window.lksData.some(lks => 
                `${lks.id_lembaga}-${lks.tahun_pengajuan}` === key
            );
            if (sameYearDuplicate) {
                showNotification('Data duplikat dalam satu tahun terdeteksi! Tidak dapat menambahkan data.', 'error');
                showLoading(false);
                return;
            }
            window.lksData.push(data);
            showNotification('Data berhasil disimpan', 'success');
        }
        saveDataToStorage();
        $('#lks-form')[0].reset();
        $('#edit-id-lembaga').val('');
        $('#cancel-lks-edit-btn').addClass('hidden');
        updateTable();
        updateStats();
        updateMap();
        $('.tab-btn[data-tab="lks"]').click();
        showLoading(false);
    });

    // Edit button
    $(document).on('click', '.edit-btn', function() {
        showLoading(true, 30);
        const id = $(this).data('id');
        const lks = window.lksData.find(l => l.id_lembaga === id);
        $('#edit-id-lembaga').val(lks.id_lembaga);
        $('#id_lembaga').val(lks.id_lembaga);
        $('#no_lembaga').val(lks.no_lembaga);
        $('#nama_lembaga').val(lks.nama_lembaga);
        $('#nama_ketua').val(lks.nama_ketua);
        $('#alamat_lembaga').val(lks.alamat_lembaga);
        $('#id_provinsi').val(lks.id_provinsi);
        $('#id_kabupaten').val(lks.id_kabupaten);
        $('#id_kecamatan').val(lks.id_kecamatan);
        $('#id_kelurahan').val(lks.id_kelurahan);
        $('#provinsi').val(lks.provinsi);
        $('#kabupaten').val(lks.kabupaten);
        $('#id_akreditasi').val(lks.id_akreditasi);
        $('#nama_lembaga_akreditasi').val(lks.nama_lembaga_akreditasi);
        $('#nama_layanan').val(lks.nama_layanan);
        $('#cluster').val(lks.cluster);
        $('#peringkat').val(lks.peringkat);
        $('#jenis_layanan').val(lks.jenis_layanan);
        $('#tahun_pengajuan').val(lks.tahun_pengajuan);
        $('#cancel-lks-edit-btn').removeClass('hidden');
        $('.tab-btn[data-tab="input-data"]').click();
        showLoading(false);
    });

    // Cancel edit
    $('#cancel-lks-edit-btn').click(function() {
        $('#lks-form')[0].reset();
        $('#edit-id-lembaga').val('');
        $(this).addClass('hidden');
        $('.tab-btn[data-tab="lks"]').click();
    });

    // Delete button
    $(document).on('click', '.delete-btn', function() {
        const id = $(this).data('id');
        $('#delete-confirm-modal').removeClass('hidden');
        scrollToElement('delete-confirm-modal');
        $('#confirm-delete-btn').off('click').click(function() {
            showLoading(true, 40);
            const index = window.lksData.findIndex(lks => lks.id_lembaga === id && !lks.dummy);
            if (index !== -1) {
                window.lksData.splice(index, 1);
                saveDataToStorage();
                showNotification('Data berhasil dihapus', 'success');
                $('#delete-confirm-modal').addClass('hidden');
                updateTable();
                updateStats();
                updateMap();
            } else {
                showNotification('Data tidak ditemukan atau tidak dapat dihapus (data dummy)', 'error');
            }
            showLoading(false);
        });
    });

    // Cancel delete
    $('#cancel-delete-btn').click(function() {
        $('#delete-confirm-modal').addClass('hidden');
    });

    // Clear duplicate data
    $('#clear-duplicate-data-btn').click(function() {
        $('#delete-confirm-modal').removeClass('hidden');
        scrollToElement('delete-confirm-modal');
        $('#confirm-delete-btn').off('click').click(function() {
            showLoading(true, 30);
            window.lksData = window.lksData.filter(lks => lks.status !== 'Duplicate');
            saveDataToStorage();
            showNotification('Semua data duplikat berhasil dihapus', 'success');
            $('#delete-confirm-modal').addClass('hidden');
            updateTable();
            updateStats();
            updateMap();
            showLoading(false);
        });
    });

    // Expose functions to lks2.js
    window.lks_lansia = {
        getData: () => window.lksData,
        saveData: saveDataToStorage,
        updateTable: updateTable,
        updateStats: updateStats,
        updateMap: updateMap,
        getCoordinates: getCoordinates,
        generateUniqueId: generateUniqueId,
        showNotification: showNotification,
        showLoading: showLoading,
        provinsiList: provinsiList,
        kabupatenList: kabupatenList,
        provinsiCoordinates: provinsiCoordinates
    };

    // Initialize
    loadDataFromStorage();

    // Initialize filters
    $('#filter-provinsi').html(provinsiList.map(p => `<option value="${p}">${p}</option>`).join(''));
    $('#filter-provinsi').change(function() {
        const provinsi = $(this).val();
        const kabupatenSelect = $('#filter-kabupaten');
        kabupatenSelect.html('<option value="Semua Kabupaten">Semua Kabupaten</option>');
        if (provinsi !== 'Semua Provinsi' && kabupatenList[provinsi]) {
            kabupatenSelect.append(kabupatenList[provinsi].map(k => `<option value="${k}">${k}</option>`).join(''));
        }
        updateTable(provinsi, $('#filter-kabupaten').val(), $('#filter-peringkat').val(), $('#filter-tahun').val(), $('#filter-status').val());
    });
    $('#filter-kabupaten, #filter-peringkat, #filter-tahun, #filter-status').change(function() {
        updateTable($('#filter-provinsi').val(), $('#filter-kabupaten').val(), $('#filter-peringkat').val(), $('#filter-tahun').val(), $('#filter-status').val());
    });
    $('#rows-per-page').change(function() {
        updateTable($('#filter-provinsi').val(), $('#filter-kabupaten').val(), $('#filter-peringkat').val(), $('#filter-tahun').val(), $('#filter-status').val());
    });
});