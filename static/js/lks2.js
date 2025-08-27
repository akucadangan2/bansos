(function() {
    // Fallback notification function
    const showNotification = window.lks_lansia?.showNotification ||
        function(message, type) {
            alert(`[${type.toUpperCase()}] ${message}`);
            console.log(`[${type.toUpperCase()}] ${message}`);
        };

    // Check dependencies
    if (!window.jQuery) {
        console.error('jQuery tidak dimuat.');
        showNotification('jQuery tidak dimuat. Periksa konsol untuk detail.', 'error');
        return;
    }
    if (!window.XLSX) {
        console.error('SheetJS tidak dimuat.');
        showNotification('Library SheetJS tidak dimuat.', 'error');
        return;
    }
    if (!window.Chart) {
        console.error('Chart.js tidak dimuat.');
        showNotification('Chart.js tidak dimuat. Grafik tidak akan ditampilkan.', 'error');
        return;
    }

    $(document).ready(function() {
        console.log('lks2.js: Inisialisasi dimulai');
        let akreditasiChart, provinsiChart, layananChart, tahunChart, pengajuanChart, debugLayananChart;
        let skippedRows = [];
        let totalRows = 0;
        let processedRows = 0;
        let filterCache = new Map();

        // Web Worker code for Excel processing
        const workerCode = `
            self.onmessage = async function(e) {
                importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
                const { fileData, requiredHeaders, provinsiList, provinsiCoordinates } = e.data;
                let newData = [], skippedRows = [], processedRows = 0, totalRows = 0;
                try {
                    const startTime = performance.now();
                    const workbook = XLSX.read(fileData, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    if (!sheetName) throw new Error('File Excel tidak memiliki sheet');
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    if (jsonData.length < 1) throw new Error('File Excel kosong');

                    const headers = jsonData[0].map(h => h ? h.toString().trim().toLowerCase().replace(/[\s_]/g, '') : '');
                    self.postMessage({ type: 'headers', headers });
                    const headerMap = {};
                    requiredHeaders.forEach(reqHeader => {
                        const foundHeader = headers.find(h => h === reqHeader.key || reqHeader.aliases.includes(h));
                        if (foundHeader) headerMap[reqHeader.key] = headers.indexOf(foundHeader);
                    });
                    const mandatoryHeaders = ['id_lembaga', 'provinsi', 'tahun_pengajuan'];
                    const missingMandatoryHeaders = mandatoryHeaders.filter(h => !(h in headerMap));
                    if (missingMandatoryHeaders.length > 0) {
                        throw new Error('Kolom wajib tidak lengkap: ' + missingMandatoryHeaders.join(', '));
                    }

                    totalRows = jsonData.length - 1;
                    const existingKeys = new Set();
                    const validJenisLayanan = ['LKS LANJUT USIA DALAM PANTI', 'LKS LANJUT USIA LUAR PANTI'];
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        const rowData = {};
                        headers.forEach((header, index) => rowData[header] = row[index] !== undefined && row[index] !== null ? row[index] : '');
                        if (!rowData[headers[headerMap.id_lembaga]] || !rowData[headers[headerMap.provinsi]] || !rowData[headers[headerMap.tahun_pengajuan]]) {
                            skippedRows.push({ row: i + 1, reason: 'Missing id_lembaga, provinsi, or tahun_pengajuan' });
                            continue;
                        }
                        const provinsi = rowData[headers[headerMap.provinsi]] ? rowData[headers[headerMap.provinsi]].toString().toUpperCase().trim() : '';
                        if (!provinsiList.includes(provinsi)) {
                            skippedRows.push({ row: i + 1, reason: 'Invalid provinsi: ' + provinsi });
                            continue;
                        }
                        const tahun = parseInt(rowData[headers[headerMap.tahun_pengajuan]]);
                        if (isNaN(tahun) || tahun < 2017 || tahun > 2025) {
                            skippedRows.push({ row: i + 1, reason: 'Invalid tahun_pengajuan: ' + tahun });
                            continue;
                        }
                        const key = \`\${rowData[headers[headerMap.id_lembaga]]}-\${tahun}\`;
                        if (existingKeys.has(key)) {
                            skippedRows.push({ row: i + 1, reason: 'Duplicate key: ' + key });
                            continue;
                        }
                        // Improved mapping for nama_layanan to jenis_layanan
                        let jenisLayanan = null;
                        if (headerMap.jenis_layanan && rowData[headers[headerMap.jenis_layanan]]) {
                            jenisLayanan = rowData[headers[headerMap.jenis_layanan]].toString().trim().toUpperCase().replace(/\s+/g, ' ');
                            console.log('Raw jenis_layanan baris ' + (i + 1) + ': ' + jenisLayanan);
                            if (!validJenisLayanan.includes(jenisLayanan)) {
                                jenisLayanan = 'TIDAK DIKETAHUI';
                                skippedRows.push({ row: i + 1, reason: 'Invalid jenis_layanan: ' + jenisLayanan });
                            }
                        } else if (headerMap.nama_layanan && rowData[headers[headerMap.nama_layanan]]) {
                            const namaLayanan = rowData[headers[headerMap.nama_layanan]].toString().trim().toUpperCase().replace(/\s+/g, ' ');
                            console.log('Nama layanan baris ' + (i + 1) + ': ' + namaLayanan);
                            if (namaLayanan.match(/LKS\s*LANJUT\s*USIA\s*.*PANTI/i) || namaLayanan.includes('DALAM PANTI') || namaLayanan.includes('PANTI') || namaLayanan.includes('DALAM')) {
                                jenisLayanan = 'LKS LANJUT USIA DALAM PANTI';
                            } else if (namaLayanan.match(/LKS\s*LANJUT\s*USIA\s*.*LUAR/i) || namaLayanan.includes('LUAR PANTI') || namaLayanan.includes('LUAR')) {
                                jenisLayanan = 'LKS LANJUT USIA LUAR PANTI';
                            } else {
                                jenisLayanan = 'TIDAK DIKETAHUI';
                                console.log('Baris ' + (i + 1) + ': nama_layanan tidak dikenali sebagai jenis_layanan: ' + namaLayanan);
                                skippedRows.push({ row: i + 1, reason: 'Invalid nama_layanan: ' + namaLayanan });
                            }
                        } else {
                            jenisLayanan = 'TIDAK DIKETAHUI';
                            console.log('Baris ' + (i + 1) + ': Kolom jenis_layanan atau nama_layanan tidak ditemukan');
                            skippedRows.push({ row: i + 1, reason: 'Missing jenis_layanan or nama_layanan' });
                        }
                        const coordinates = provinsiCoordinates?.[provinsi] || { latitude: null, longitude: null };
                        const validPeringkat = ['A', 'B', 'C', 'TTA'];
                        newData.push({
                            id_lembaga: rowData[headers[headerMap.id_lembaga]].toString(),
                            no_lembaga: rowData[headers[headerMap.no_lembaga]] || 'Tidak Diketahui',
                            nama_lembaga: rowData[headers[headerMap.nama_lembaga]] || 'Tidak Diketahui',
                            nama_ketua: rowData[headers[headerMap.nama_ketua]] || 'Tidak Diketahui',
                            alamat_lembaga: rowData[headers[headerMap.alamat_lembaga]] || 'Tidak Diketahui',
                            id_provinsi: rowData[headers[headerMap.id_provinsi]] || null,
                            id_kabupaten: rowData[headers[headerMap.id_kabupaten]] || null,
                            id_kecamatan: rowData[headers[headerMap.id_kecamatan]] || null,
                            id_kelurahan: rowData[headers[headerMap.id_kelurahan]] || null,
                            id_akreditasi: rowData[headers[headerMap.id_akreditasi]] || null,
                            nama_lembaga_akreditasi: rowData[headers[headerMap.nama_lembaga_akreditasi]] || 'Tidak Diketahui',
                            nama_layanan: rowData[headers[headerMap.nama_layanan]] || 'Tidak Diketahui',
                            cluster: rowData[headers[headerMap.cluster]] || 'Tidak Diketahui',
                            provinsi,
                            kabupaten: rowData[headers[headerMap.kabupaten]] ? rowData[headers[headerMap.kabupaten]].toString().trim() : 'Tidak Diketahui',
                            peringkat: validPeringkat.includes(rowData[headers[headerMap.peringkat]]?.toString().toUpperCase()) ? rowData[headers[headerMap.peringkat]].toString().toUpperCase() : 'TTA',
                            jenis_layanan: jenisLayanan,
                            tahun_pengajuan: tahun,
                            latitude: rowData[headers[headerMap.latitude]] ? parseFloat(rowData[headers[headerMap.latitude]]) : coordinates.latitude,
                            longitude: rowData[headers[headerMap.longitude]] ? parseFloat(rowData[headers[headerMap.longitude]]) : coordinates.longitude,
                            uploaded: true,
                            upload_timestamp: Date.now(),
                            dummy: false,
                            status: 'Original'
                        });
                        existingKeys.add(key);
                        processedRows++;
                        if (i % 1000 === 0 || i === jsonData.length - 1) {
                            self.postMessage({ type: 'progress', progress: Math.round((processedRows / totalRows) * 100) });
                        }
                    }
                    self.postMessage({ type: 'complete', newData, skippedRows, totalRows, duration: performance.now() - startTime });
                } catch (error) {
                    self.postMessage({ type: 'error', message: error.message });
                }
            };
        `;

        // Required headers for Excel
        const requiredHeaders = [
            { key: 'id_lembaga', aliases: ['idlembaga', 'id lembaga', 'id', 'lembagaid', 'kode_lembaga', 'id_lks'] },
            { key: 'provinsi', aliases: ['provinsi', 'nama provinsi', 'province', 'nama_provinsi', 'provini'] },
            { key: 'tahun_pengajuan', aliases: ['tahunpengajuan', 'tahun pengajuan', 'tahun', 'pengajuan', 'tahun_akreditasi'] },
            { key: 'no_lembaga', aliases: ['nolembaga', 'no lembaga', 'nomor lembaga', 'no_lembaga'] },
            { key: 'nama_lembaga', aliases: ['namalembaga', 'nama lembaga', 'lembaga', 'nama', 'nama_lks'] },
            { key: 'nama_ketua', aliases: ['namaketua', 'nama ketua', 'ketua', 'nama_pimpinan'] },
            { key: 'alamat_lembaga', aliases: ['alamatlembaga', 'alamat lembaga', 'alamat', 'alamat_lks'] },
            { key: 'id_provinsi', aliases: ['idprovinsi', 'id provinsi', 'kode_provinsi', 'id provini'] },
            { key: 'id_kabupaten', aliases: ['idkabupaten', 'id kabupaten', 'kode_kabupaten'] },
            { key: 'id_kecamatan', aliases: ['idkecamatan', 'id kecamatan', 'kode_kecamatan'] },
            { key: 'id_kelurahan', aliases: ['idkelurahan', 'id kelurahan', 'kode_kelurahan'] },
            { key: 'id_akreditasi', aliases: ['idakreditasi', 'id akreditasi', 'kode_akreditasi', 'id akreditai'] },
            { key: 'nama_lembaga_akreditasi', aliases: ['namalembagaakreditasi', 'nama lembaga akreditasi', 'lembaga_akreditasi', 'nama lembaga akreditai'] },
            { key: 'nama_layanan', aliases: ['namalayanan', 'nama layanan', 'layanan', 'nama_pelayanan'] },
            { key: 'cluster', aliases: ['cluster', 'klaster', 'cluter'] },
            { key: 'kabupaten', aliases: ['kabupaten', 'nama kabupaten', 'kab', 'nama_kabupaten'] },
            { key: 'peringkat', aliases: ['peringkat', 'akreditasi', 'nilai_akreditasi', 'peringkat_akreditasi'] },
            { key: 'jenis_layanan', aliases: ['jenislavanan', 'jenis layanan', 'layanan jenis', 'tipe_layanan', 'kategori_layanan'] },
            { key: 'latitude', aliases: ['latitude', 'lat', 'lintang'] },
            { key: 'longitude', aliases: ['longitude', 'long', 'lng', 'bujur'] }
        ];

        // Process Excel file
        function processExcelFile(file) {
            const startTime = performance.now();
            console.log('Memproses file:', file.name);
            if (!file.name.match(/\.(xlsx|xls)$/)) {
                showNotification('File harus berformat .xlsx atau .xls', 'error');
                return;
            }
            if (window.Worker) {
                window.lks_lansia?.showLoading?.(true, 0, 'Memproses file Excel...');
                const worker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' })));
                const reader = new FileReader();
                reader.onload = function(e) {
                    worker.postMessage({
                        fileData: new Uint8Array(e.target.result),
                        requiredHeaders,
                        provinsiList: window.lks_lansia?.provinsiList || [],
                        provinsiCoordinates: window.lks_lansia?.provinsiCoordinates || {}
                    });
                };
                reader.onerror = () => {
                    showNotification('Gagal membaca file Excel', 'error');
                    window.lks_lansia?.showLoading?.(false);
                    worker.terminate();
                };
                worker.onmessage = function(e) {
                    if (e.data.type === 'headers') {
                        console.log('Header ditemukan:', e.data.headers);
                    } else if (e.data.type === 'warning') {
                        showNotification(e.data.message, 'warning');
                    } else if (e.data.type === 'progress') {
                        window.lks_lansia?.showLoading?.(true, e.data.progress, 'Memproses file Excel...');
                    } else if (e.data.type === 'complete') {
                        window.lksData = window.lks_lansia?.getData?.() || [];
                        window.lksData.push(...e.data.newData);
                        window.lks_lansia?.saveData?.();
                        window.lks_lansia?.updateTable?.();
                        window.lks_lansia?.updateStats?.();
                        window.lks_lansia?.updateMap?.();
                        updateCharts();
                        updateFilterOptions();
                        let message = `Upload selesai. ${e.data.newData.length} data baru ditambahkan.`;
                        if (e.data.skippedRows.length) {
                            message += ` ${e.data.skippedRows.length} baris dilewati (lihat konsol untuk detail).`;
                            console.log('Skipped rows:', e.data.skippedRows);
                        }
                        showNotification(message, e.data.newData.length ? 'success' : 'warning');
                        window.lks_lansia?.showLoading?.(false);
                        worker.terminate();
                        console.log(`processExcelFile (Worker) selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
                    } else if (e.data.type === 'error') {
                        showNotification('Gagal memproses file Excel: ' + e.data.message, 'error');
                        window.lks_lansia?.showLoading?.(false);
                        worker.terminate();
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                showNotification('Browser tidak mendukung Web Worker. Menggunakan fallback processing.', 'warning');
                window.lks_lansia?.showLoading?.(true, 0, 'Memproses file Excel...');
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        if (!sheetName) throw new Error('File Excel tidak memiliki sheet');
                        const sheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        if (jsonData.length < 1) throw new Error('File Excel kosong');
                        
                        const headers = jsonData[0].map(h => h ? h.toString().trim().toLowerCase().replace(/[\s_]/g, '') : '');
                        console.log('Header ditemukan:', headers);
                        const headerMap = {};
                        requiredHeaders.forEach(reqHeader => {
                            const foundHeader = headers.find(h => h === reqHeader.key || reqHeader.aliases.includes(h));
                            if (foundHeader) headerMap[reqHeader.key] = headers.indexOf(foundHeader);
                        });
                        const mandatoryHeaders = ['id_lembaga', 'provinsi', 'tahun_pengajuan'];
                        const missingMandatoryHeaders = mandatoryHeaders.filter(h => !(h in headerMap));
                        if (missingMandatoryHeaders.length > 0) {
                            throw new Error(`Kolom wajib tidak lengkap: ${missingMandatoryHeaders.join(', ')}`);
                        }
                        
                        totalRows = jsonData.length - 1;
                        processedRows = 0;
                        skippedRows = [];
                        const newData = [];
                        const existingKeys = new Set((window.lks_lansia?.getData?.() || []).map(lks => `${lks.id_lembaga}-${lks.tahun_pengajuan}`));
                        const validJenisLayanan = ['LKS LANJUT USIA DALAM PANTI', 'LKS LANJUT USIA LUAR PANTI'];
                        const batchSize = 1000;

                        function processBatch(startRow) {
                            const endRow = Math.min(startRow + batchSize, jsonData.length);
                            for (let i = startRow; i < endRow; i++) {
                                const row = jsonData[i];
                                const rowData = {};
                                headers.forEach((header, index) => rowData[header] = row[index] !== undefined && row[index] !== null ? row[index] : '');
                                if (!rowData[headers[headerMap.id_lembaga]] || !rowData[headers[headerMap.provinsi]] || !rowData[headers[headerMap.tahun_pengajuan]]) {
                                    skippedRows.push({ row: i + 1, reason: 'Missing id_lembaga, provinsi, or tahun_pengajuan' });
                                    continue;
                                }
                                const provinsi = rowData[headers[headerMap.provinsi]] ? rowData[headers[headerMap.provinsi]].toString().toUpperCase().trim() : '';
                                if (!(window.lks_lansia?.provinsiList?.includes(provinsi))) {
                                    skippedRows.push({ row: i + 1, reason: `Invalid provinsi: ${provinsi}` });
                                    continue;
                                }
                                const tahun = parseInt(rowData[headers[headerMap.tahun_pengajuan]]);
                                if (isNaN(tahun) || tahun < 2017 || tahun > 2025) {
                                    skippedRows.push({ row: i + 1, reason: `Invalid tahun_pengajuan: ${tahun}` });
                                    continue;
                                }
                                const key = `${rowData[headers[headerMap.id_lembaga]]}-${tahun}`;
                                if (existingKeys.has(key)) {
                                    skippedRows.push({ row: i + 1, reason: `Duplicate key: ${key}` });
                                    continue;
                                }
                                // Improved mapping for nama_layanan to jenis_layanan
                                let jenisLayanan = null;
                                if (headerMap.jenis_layanan && rowData[headers[headerMap.jenis_layanan]]) {
                                    jenisLayanan = rowData[headers[headerMap.jenis_layanan]].toString().trim().toUpperCase().replace(/\s+/g, ' ');
                                    console.log(`Raw jenis_layanan baris ${i + 1}: ${jenisLayanan}`);
                                    if (!validJenisLayanan.includes(jenisLayanan)) {
                                        jenisLayanan = 'TIDAK DIKETAHUI';
                                        skippedRows.push({ row: i + 1, reason: `Invalid jenis_layanan: ${jenisLayanan}` });
                                    }
                                } else if (headerMap.nama_layanan && rowData[headers[headerMap.nama_layanan]]) {
                                    const namaLayanan = rowData[headers[headerMap.nama_layanan]].toString().trim().toUpperCase().replace(/\s+/g, ' ');
                                    console.log(`Nama layanan baris ${i + 1}: ${namaLayanan}`);
                                    if (namaLayanan.match(/LKS\s*LANJUT\s*USIA\s*.*PANTI/i) || namaLayanan.includes('DALAM PANTI') || namaLayanan.includes('PANTI') || namaLayanan.includes('DALAM')) {
                                        jenisLayanan = 'LKS LANJUT USIA DALAM PANTI';
                                    } else if (namaLayanan.match(/LKS\s*LANJUT\s*USIA\s*.*LUAR/i) || namaLayanan.includes('LUAR PANTI') || namaLayanan.includes('LUAR')) {
                                        jenisLayanan = 'LKS LANJUT USIA LUAR PANTI';
                                    } else {
                                        jenisLayanan = 'TIDAK DIKETAHUI';
                                        console.log(`Baris ${i + 1}: nama_layanan tidak dikenali sebagai jenis_layanan: ${namaLayanan}`);
                                        skippedRows.push({ row: i + 1, reason: `Invalid nama_layanan: ${namaLayanan}` });
                                    }
                                } else {
                                    jenisLayanan = 'TIDAK DIKETAHUI';
                                    console.log(`Baris ${i + 1}: Kolom jenis_layanan atau nama_layanan tidak ditemukan`);
                                    skippedRows.push({ row: i + 1, reason: 'Missing jenis_layanan or nama_layanan' });
                                }
                                const coordinates = window.lks_lansia?.provinsiCoordinates?.[provinsi] || { latitude: null, longitude: null };
                                const validPeringkat = ['A', 'B', 'C', 'TTA'];
                                newData.push({
                                    id_lembaga: rowData[headers[headerMap.id_lembaga]].toString(),
                                    no_lembaga: rowData[headers[headerMap.no_lembaga]] || 'Tidak Diketahui',
                                    nama_lembaga: rowData[headers[headerMap.nama_lembaga]] || 'Tidak Diketahui',
                                    nama_ketua: rowData[headers[headerMap.nama_ketua]] || 'Tidak Diketahui',
                                    alamat_lembaga: rowData[headers[headerMap.alamat_lembaga]] || 'Tidak Diketahui',
                                    id_provinsi: rowData[headers[headerMap.id_provinsi]] || null,
                                    id_kabupaten: rowData[headers[headerMap.id_kabupaten]] || null,
                                    id_kecamatan: rowData[headers[headerMap.id_kecamatan]] || null,
                                    id_kelurahan: rowData[headers[headerMap.id_kelurahan]] || null,
                                    id_akreditasi: rowData[headers[headerMap.id_akreditasi]] || null,
                                    nama_lembaga_akreditasi: rowData[headers[headerMap.nama_lembaga_akreditasi]] || 'Tidak Diketahui',
                                    nama_layanan: rowData[headers[headerMap.nama_layanan]] || 'Tidak Diketahui',
                                    cluster: rowData[headers[headerMap.cluster]] || 'Tidak Diketahui',
                                    provinsi,
                                    kabupaten: rowData[headers[headerMap.kabupaten]] ? rowData[headers[headerMap.kabupaten]].toString().trim() : 'Tidak Diketahui',
                                    peringkat: validPeringkat.includes(rowData[headers[headerMap.peringkat]]?.toString().toUpperCase()) ? rowData[headers[headerMap.peringkat]].toString().toUpperCase() : 'TTA',
                                    jenis_layanan: jenisLayanan,
                                    tahun_pengajuan: tahun,
                                    latitude: rowData[headers[headerMap.latitude]] ? parseFloat(rowData[headers[headerMap.latitude]]) : coordinates.latitude,
                                    longitude: rowData[headers[headerMap.longitude]] ? parseFloat(rowData[headers[headerMap.longitude]]) : coordinates.longitude,
                                    uploaded: true,
                                    upload_timestamp: Date.now(),
                                    dummy: false,
                                    status: 'Original'
                                });
                                existingKeys.add(key);
                                processedRows++;
                            }
                            window.lks_lansia?.showLoading?.(true, Math.round((processedRows / totalRows) * 100), 'Memproses file Excel...');
                            if (endRow < jsonData.length) {
                                setTimeout(() => processBatch(endRow), 100);
                            } else {
                                window.lksData = window.lks_lansia?.getData?.() || [];
                                window.lksData.push(...newData);
                                window.lks_lansia?.saveData?.();
                                window.lks_lansia?.updateTable?.();
                                window.lks_lansia?.updateStats?.();
                                window.lks_lansia?.updateMap?.();
                                updateCharts();
                                updateFilterOptions();
                                let message = `Upload selesai. ${newData.length} data baru ditambahkan.`;
                                if (skippedRows.length) {
                                    message += ` ${skippedRows.length} baris dilewati (lihat konsol untuk detail).`;
                                    console.log('Skipped rows:', skippedRows);
                                }
                                showNotification(message, newData.length ? 'success' : 'warning');
                                window.lks_lansia?.showLoading?.(false);
                                console.log(`processExcelFile (Fallback) selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
                            }
                        }
                        processBatch(1);
                    } catch (error) {
                        showNotification('Gagal memproses file Excel: ' + error.message, 'error');
                        window.lks_lansia?.showLoading?.(false);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        }

        // Update charts
        function updateCharts(filterProvinsi = '', filterKabupaten = '', filterPeringkat = '', filterTahun = '') {
            const startTime = performance.now();
            console.log('Memulai updateCharts dengan filter:', { filterProvinsi, filterKabupaten, filterPeringkat, filterTahun });
            window.lks_lansia?.showLoading?.(true, 0, 'Memperbarui grafik...');

            if (!window.Chart) {
                console.error('Chart.js tidak dimuat.');
                showNotification('Chart.js tidak dimuat. Grafik tidak akan ditampilkan.', 'error');
                window.lks_lansia?.showLoading?.(false);
                return;
            }

            const cacheKey = `${filterProvinsi}-${filterKabupaten}-${filterPeringkat}-${filterTahun}`;
            let filteredData = filterCache.get(cacheKey);
            if (!filteredData) {
                filteredData = (window.lksData || []).filter(lks => {
                    if (!lks.tahun_pengajuan) return false;
                    const provinsiMatch = !filterProvinsi || filterProvinsi === 'Semua Provinsi' || lks.provinsi.toUpperCase().trim() === filterProvinsi.toUpperCase().trim();
                    const kabupatenMatch = !filterKabupaten || filterKabupaten === 'Semua Kabupaten' || lks.kabupaten.toUpperCase().trim() === filterKabupaten.toUpperCase().trim();
                    const peringkatMatch = !filterPeringkat || filterPeringkat === 'Semua Peringkat' || lks.peringkat.toUpperCase().trim() === filterPeringkat.toUpperCase().trim();
                    const tahunMatch = !filterTahun || filterTahun === 'Semua Tahun' || lks.tahun_pengajuan.toString() === filterTahun;
                    return provinsiMatch && kabupatenMatch && peringkatMatch && tahunMatch;
                });
                filterCache.set(cacheKey, filteredData);
            }

            console.log('Data setelah filter:', filteredData.length, 'baris', filteredData.slice(0, 5));

            if (filteredData.length === 0) {
                showNotification('Tidak ada data yang cocok dengan filter yang dipilih.', 'warning');
            }

            // Akreditasi Chart
            const akreditasiCounts = {};
            filteredData.forEach(lks => { akreditasiCounts[lks.peringkat] = (akreditasiCounts[lks.peringkat] || 0) + 1; });
            if (akreditasiChart) akreditasiChart.destroy();
            const akreditasiCanvas = document.getElementById('akreditasi-chart');
            if (akreditasiCanvas) {
                akreditasiChart = new Chart(akreditasiCanvas, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(akreditasiCounts).length ? Object.keys(akreditasiCounts) : ['Tidak Ada Data'],
                        datasets: [{
                            label: 'Peringkat Akreditasi',
                            data: Object.keys(akreditasiCounts).length ? Object.values(akreditasiCounts) : [1],
                            backgroundColor: Object.keys(akreditasiCounts).length ? ['#2563eb', '#10b981', '#f59e0b', '#ef4444'] : ['#d1d5db'],
                            borderColor: ['#ffffff'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top', labels: { color: '#1f2937' } },
                            title: { display: true, text: 'Distribusi Peringkat Akreditasi', color: '#1f2937' }
                        }
                    }
                });
                akreditasiCanvas.dataset.loaded = 'true';
                akreditasiCanvas.classList.remove('lazy-load-placeholder');
                console.log('Akreditasi chart diperbarui:', akreditasiCounts);
            }

            // Provinsi Chart
            const provinsiCounts = {};
            filteredData.forEach(lks => { provinsiCounts[lks.provinsi] = (provinsiCounts[lks.provinsi] || 0) + 1; });
            if (provinsiChart) provinsiChart.destroy();
            const provinsiCanvas = document.getElementById('provinsi-chart');
            if (provinsiCanvas) {
                provinsiChart = new Chart(provinsiCanvas, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(provinsiCounts).length ? Object.keys(provinsiCounts).sort() : ['Tidak Ada Data'],
                        datasets: [{
                            label: 'Jumlah LKS Lansia',
                            data: Object.keys(provinsiCounts).length ? Object.values(provinsiCounts) : [0],
                            backgroundColor: '#2563eb',
                            borderColor: '#2563eb',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Jumlah Lembaga', color: '#1f2937' } },
                            x: { title: { display: true, text: 'Provinsi', color: '#1f2937' } }
                        },
                        plugins: {
                            legend: { display: false },
                            title: { display: true, text: 'Jumlah LKS per Provinsi', color: '#1f2937' }
                        }
                    }
                });
                provinsiCanvas.dataset.loaded = 'true';
                provinsiCanvas.classList.remove('lazy-load-placeholder');
                console.log('Provinsi chart diperbarui:', provinsiCounts);
            }

            // Layanan Chart
            const layananCounts = {
                'LKS LANJUT USIA DALAM PANTI': 0,
                'LKS LANJUT USIA LUAR PANTI': 0,
                'TIDAK DIKETAHUI': 0
            };
            filteredData.forEach(lks => { layananCounts[lks.jenis_layanan] = (layananCounts[lks.jenis_layanan] || 0) + 1; });
            if (layananChart) layananChart.destroy();
            const layananCanvas = document.getElementById('layanan-chart');
            if (layananCanvas) {
                layananChart = new Chart(layananCanvas, {
                    type: 'pie',
                    data: {
                        labels: ['LKS Dalam Panti', 'LKS Luar Panti', 'Tidak Diketahui'],
                        datasets: [{
                            label: 'Jenis Layanan',
                            data: [
                                layananCounts['LKS LANJUT USIA DALAM PANTI'],
                                layananCounts['LKS LANJUT USIA LUAR PANTI'],
                                layananCounts['TIDAK DIKETAHUI']
                            ],
                            backgroundColor: ['#10b981', '#f59e0b', '#d1d5db'],
                            borderColor: ['#ffffff'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top', labels: { color: '#1f2937' } },
                            title: { display: true, text: 'Distribusi Jenis Layanan', color: '#1f2937' }
                        }
                    }
                });
                layananCanvas.dataset.loaded = 'true';
                layananCanvas.classList.remove('lazy-load-placeholder');
                console.log('Layanan chart diperbarui:', layananCounts);
            }

            // Debug Layanan Chart
            if (debugLayananChart) debugLayananChart.destroy();
            const debugLayananCanvas = document.getElementById('debug-layanan-chart');
            if (debugLayananCanvas) {
                debugLayananChart = new Chart(debugLayananCanvas, {
                    type: 'bar',
                    data: {
                        labels: ['LKS Dalam Panti', 'LKS Luar Panti', 'Tidak Diketahui'],
                        datasets: [{
                            label: 'Jumlah LKS Berdasarkan Jenis Layanan',
                            data: [
                                filteredData.filter(lks => lks.jenis_layanan === 'LKS LANJUT USIA DALAM PANTI').length,
                                filteredData.filter(lks => lks.jenis_layanan === 'LKS LANJUT USIA LUAR PANTI').length,
                                filteredData.filter(lks => lks.jenis_layanan === 'TIDAK DIKETAHUI').length
                            ],
                            backgroundColor: ['#2563eb', '#10b981', '#f59e0b'],
                            borderColor: ['#2563eb', '#10b981', '#f59e0b'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Jumlah Lembaga', color: '#1f2937' } },
                            x: { title: { display: true, text: 'Jenis Layanan', color: '#1f2937' } }
                        },
                        plugins: {
                            legend: { display: false },
                            title: { display: true, text: 'Distribusi Jenis Layanan (Debug)', color: '#1f2937' }
                        }
                    }
                });
                debugLayananCanvas.dataset.loaded = 'true';
                debugLayananCanvas.classList.remove('lazy-load-placeholder');
                console.log('Debug layanan chart diperbarui:', {
                    dalamPanti: filteredData.filter(lks => lks.jenis_layanan === 'LKS LANJUT USIA DALAM PANTI').length,
                    luarPanti: filteredData.filter(lks => lks.jenis_layanan === 'LKS LANJUT USIA LUAR PANTI').length,
                    tidakDiketahui: filteredData.filter(lks => lks.jenis_layanan === 'TIDAK DIKETAHUI').length
                });
            }

            // Tahun Chart
            const tahunCounts = {};
            filteredData.forEach(lks => { tahunCounts[lks.tahun_pengajuan] = (tahunCounts[lks.tahun_pengajuan] || 0) + 1; });
            if (tahunChart) tahunChart.destroy();
            const tahunCanvas = document.getElementById('tahun-chart');
            if (tahunCanvas) {
                tahunChart = new Chart(tahunCanvas, {
                    type: 'line',
                    data: {
                        labels: Object.keys(tahunCounts).length ? Object.keys(tahunCounts).sort() : ['Tidak Ada Data'],
                        datasets: [{
                            label: 'Jumlah Pengajuan',
                            data: Object.keys(tahunCounts).length ? Object.values(tahunCounts) : [0],
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            borderColor: '#ef4444',
                            borderWidth: 2,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Jumlah', color: '#1f2937' } },
                            x: { title: { display: true, text: 'Tahun', color: '#1f2937' } }
                        },
                        plugins: {
                            legend: { display: true, labels: { color: '#1f2937' } },
                            title: { display: true, text: 'Tren Tahun Pengajuan', color: '#1f2937' }
                        }
                    }
                });
                tahunCanvas.dataset.loaded = 'true';
                tahunCanvas.classList.remove('lazy-load-placeholder');
                console.log('Tahun chart diperbarui:', tahunCounts);
            }

            // Pengajuan Chart
            const pengajuanCounts = {};
            const tahunList = [...new Set(filteredData.map(lks => lks.tahun_pengajuan))].sort();
            tahunList.forEach(tahun => {
                pengajuanCounts[tahun] = [...new Set(filteredData.filter(lks => lks.tahun_pengajuan == tahun).map(lks => lks.id_lembaga))].length;
            });
            if (pengajuanChart) pengajuanChart.destroy();
            const pengajuanCanvas = document.getElementById('pengajuan-chart');
            if (pengajuanCanvas) {
                pengajuanChart = new Chart(pengajuanCanvas, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(pengajuanCounts).length ? Object.keys(pengajuanCounts).sort() : ['Tidak Ada Data'],
                        datasets: [{
                            label: 'Jumlah LKS Mengajukan Akreditasi',
                            data: Object.keys(pengajuanCounts).length ? Object.values(pengajuanCounts) : [0],
                            backgroundColor: '#10b981',
                            borderColor: '#10b981',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Jumlah LKS Unik', color: '#1f2937' } },
                            x: { title: { display: true, text: 'Tahun', color: '#1f2937' } }
                        },
                        plugins: {
                            legend: { display: true, labels: { color: '#1f2937' } },
                            title: { display: true, text: 'Jumlah LKS Unik Mengajukan Akreditasi per Tahun', color: '#1f2937' }
                        }
                    }
                });
                pengajuanCanvas.dataset.loaded = 'true';
                pengajuanCanvas.classList.remove('lazy-load-placeholder');
                console.log('Pengajuan chart diperbarui:', pengajuanCounts);
            }

            window.lks_lansia?.showLoading?.(false);
            console.log(`updateCharts selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        }

        // Update filter options
        function updateFilterOptions() {
            const startTime = performance.now();
            console.log('Memperbarui opsi filter');
            const provinsiFilter = $('#filter-provinsi');
            const chartProvinsiFilter = $('#chart-provinsi');
            const exportProvinsiFilter = $('#export-provinsi');
            const provinsiList = window.lks_lansia?.provinsiList || [];
            provinsiFilter.empty().append('<option value="Semua Provinsi">Semua Provinsi</option>');
            chartProvinsiFilter.empty().append('<option value="Semua Provinsi">Semua Provinsi</option>');
            exportProvinsiFilter.empty().append('<option value="Semua Provinsi">Semua Provinsi</option>');
            provinsiList.forEach(provinsi => {
                if (provinsi !== 'Semua Provinsi') {
                    provinsiFilter.append(`<option value="${provinsi}">${provinsi}</option>`);
                    chartProvinsiFilter.append(`<option value="${provinsi}">${provinsi}</option>`);
                    exportProvinsiFilter.append(`<option value="${provinsi}">${provinsi}</option>`);
                }
            });

            const kabupatenFilter = $('#filter-kabupaten');
            const chartKabupatenFilter = $('#chart-kabupaten');
            const exportKabupatenFilter = $('#export-kabupaten');
            kabupatenFilter.empty().append('<option value="Semua Kabupaten">Semua Kabupaten</option>');
            chartKabupatenFilter.empty().append('<option value="Semua Kabupaten">Semua Kabupaten</option>');
            exportKabupatenFilter.empty().append('<option value="Semua Kabupaten">Semua Kabupaten</option>');

            const kabupatenByProvinsi = {};
            (window.lksData || []).forEach(lks => {
                if (lks.provinsi && lks.kabupaten && lks.kabupaten !== 'Tidak Diketahui') {
                    if (!kabupatenByProvinsi[lks.provinsi]) {
                        kabupatenByProvinsi[lks.provinsi] = new Set();
                    }
                    kabupatenByProvinsi[lks.provinsi].add(lks.kabupaten);
                }
            });

            updateKabupatenOptions(provinsiFilter.val() || 'Semua Provinsi', kabupatenFilter);
            updateKabupatenOptions(chartProvinsiFilter.val() || 'Semua Provinsi', chartKabupatenFilter);
            updateKabupatenOptions(exportProvinsiFilter.val() || 'Semua Provinsi', exportKabupatenFilter);

            const tahunFilter = $('#filter-tahun');
            const chartTahunFilter = $('#chart-tahun');
            const exportTahunFilter = $('#export-tahun');
            const tahunList = [...new Set((window.lksData || []).map(lks => lks.tahun_pengajuan).filter(t => t))].sort();
            tahunFilter.empty().append('<option value="Semua Tahun">Semua Tahun</option>');
            chartTahunFilter.empty().append('<option value="Semua Tahun">Semua Tahun</option>');
            exportTahunFilter.empty().append('<option value="Semua Tahun">Semua Tahun</option>');
            tahunList.forEach(tahun => {
                tahunFilter.append(`<option value="${tahun}">${tahun}</option>`);
                chartTahunFilter.append(`<option value="${tahun}">${tahun}</option>`);
                exportTahunFilter.append(`<option value="${tahun}">${tahun}</option>`);
            });

            const peringkatFilter = $('#filter-peringkat');
            const chartPeringkatFilter = $('#chart-peringkat');
            const exportPeringkatFilter = $('#export-peringkat');
            const peringkatList = ['A', 'B', 'C', 'TTA'];
            peringkatFilter.empty().append('<option value="Semua Peringkat">Semua Peringkat</option>');
            chartPeringkatFilter.empty().append('<option value="Semua Peringkat">Semua Peringkat</option>');
            exportPeringkatFilter.empty().append('<option value="Semua Peringkat">Semua Peringkat</option>');
            peringkatList.forEach(peringkat => {
                peringkatFilter.append(`<option value="${peringkat}">${peringkat}</option>`);
                chartPeringkatFilter.append(`<option value="${peringkat}">${peringkat}</option>`);
                exportPeringkatFilter.append(`<option value="${peringkat}">${peringkat}</option>`);
            });

            console.log('Opsi filter diperbarui:', { kabupatenByProvinsi, provinsiList, tahunList, peringkatList });
            console.log(`updateFilterOptions selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        }

        // Update kabupaten options
        function updateKabupatenOptions(provinsi, kabupatenFilter) {
            const startTime = performance.now();
            kabupatenFilter.empty().append('<option value="Semua Kabupaten">Semua Kabupaten</option>');
            if (provinsi && provinsi !== 'Semua Provinsi') {
                const kabupatenList = [...new Set((window.lksData || [])
                    .filter(lks => lks.provinsi.toUpperCase().trim() === provinsi.toUpperCase().trim() && lks.kabupaten && lks.kabupaten !== 'Tidak Diketahui')
                    .map(lks => lks.kabupaten))].sort();
                kabupatenList.forEach(kab => {
                    kabupatenFilter.append(`<option value="${kab}">${kab}</option>`);
                });
                console.log(`Opsi kabupaten untuk ${provinsi}:`, kabupatenList);
            }
            console.log(`updateKabupatenOptions selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        }

        // Upload button handler
        $('#upload-excel-btn').on('click', function() {
            const startTime = performance.now();
            console.log('Tombol Unggah Excel diklik');
            const $input = $('<input type="file" accept=".xlsx,.xls">');
            $input.on('change', function(e) {
                const file = e.target.files[0];
                if (!file) {
                    showNotification('Tidak ada file yang dipilih', 'error');
                    return;
                }
                processExcelFile(file);
            });
            $input.click();
            console.log(`Upload button click selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        });

        // Filter change handlers (main table)
        let filterTimeout;
        $(document).on('change', '#filter-provinsi, #filter-kabupaten, #filter-peringkat, #filter-tahun, #filter-status', function() {
            const startTime = performance.now();
            console.log('Filter utama berubah:', {
                provinsi: $('#filter-provinsi').val(),
                kabupaten: $('#filter-kabupaten').val(),
                peringkat: $('#filter-peringkat').val(),
                tahun: $('#filter-tahun').val(),
                status: $('#filter-status').val()
            });
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => {
                const filterProvinsi = $('#filter-provinsi').val() || 'Semua Provinsi';
                const filterKabupaten = $('#filter-kabupaten').val() || 'Semua Kabupaten';
                const filterPeringkat = $('#filter-peringkat').val() === 'Semua Peringkat' ? '' : $('#filter-peringkat').val();
                const filterTahun = $('#filter-tahun').val() === 'Semua Tahun' ? '' : $('#filter-tahun').val();
                const filterStatus = $('#filter-status').val() || 'all';
                window.lks_lansia?.updateTable?.(filterProvinsi, filterKabupaten, filterPeringkat, filterTahun, filterStatus);
                console.log(`Filter tabel utama selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
            }, 300);
        });

        // Filter change handlers (charts)
        $(document).on('change', '#chart-provinsi, #chart-kabupaten, #chart-peringkat, #chart-tahun', function() {
            const startTime = performance.now();
            console.log('Filter grafik berubah:', {
                provinsi: $('#chart-provinsi').val(),
                kabupaten: $('#chart-kabupaten').val(),
                peringkat: $('#chart-peringkat').val(),
                tahun: $('#chart-tahun').val()
            });
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => {
                const filterProvinsi = $('#chart-provinsi').val() || 'Semua Provinsi';
                const filterKabupaten = $('#chart-kabupaten').val() || 'Semua Kabupaten';
                const filterPeringkat = $('#chart-peringkat').val() === 'Semua Peringkat' ? '' : $('#chart-peringkat').val();
                const filterTahun = $('#chart-tahun').val() === 'Semua Tahun' ? '' : $('#chart-tahun').val();
                updateCharts(filterProvinsi, filterKabupaten, filterPeringkat, filterTahun);
                console.log(`Filter grafik selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
            }, 300);
        });

        // Update chart button handler
        $(document).on('click', '#update-chart-btn, #perbarui-grafik', function() {
            const startTime = performance.now();
            console.log('Tombol Perbarui Grafik diklik');
            const filterProvinsi = $('#chart-provinsi').val() || 'Semua Provinsi';
            const filterKabupaten = $('#chart-kabupaten').val() || 'Semua Kabupaten';
            const filterPeringkat = $('#chart-peringkat').val() === 'Semua Peringkat' ? '' : $('#chart-peringkat').val();
            const filterTahun = $('#chart-tahun').val() === 'Semua Tahun' ? '' : $('#chart-tahun').val();
            updateCharts(filterProvinsi, filterKabupaten, filterPeringkat, filterTahun);
            console.log(`Update chart button selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        });

        // Province filter change handler for kabupaten
        $(document).on('change', '#filter-provinsi', function() {
            const startTime = performance.now();
            console.log('Filter provinsi utama berubah:', $(this).val());
            updateKabupatenOptions($(this).val(), $('#filter-kabupaten'));
            console.log(`Filter provinsi utama selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        });
        $(document).on('change', '#chart-provinsi', function() {
            const startTime = performance.now();
            console.log('Filter provinsi grafik berubah:', $(this).val());
            updateKabupatenOptions($(this).val(), $('#chart-kabupaten'));
            console.log(`Filter provinsi grafik selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        });
        $(document).on('change', '#export-provinsi', function() {
            const startTime = performance.now();
            console.log('Filter provinsi ekspor berubah:', $(this).val());
            updateKabupatenOptions($(this).val(), $('#export-kabupaten'));
            console.log(`Filter provinsi ekspor selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        });

        // Export handler
        $(document).on('submit', '#export-form', async function(e) {
            const startTime = performance.now();
            e.preventDefault();
            if (!window.XLSX || !window.jspdf || !window.jspdf.jsPDF) {
                showNotification('Library SheetJS atau jsPDF tidak dimuat.', 'error');
                return;
            }
            window.lks_lansia?.showLoading?.(true, 0, 'Mengekspor data...');
            const provinsi = $('#export-provinsi').val();
            const kabupaten = $('#export-kabupaten').val();
            const peringkat = $('#export-peringkat').val() === 'Semua Peringkat' ? '' : $('#export-peringkat').val();
            const tahun = $('#export-tahun').val() === 'Semua Tahun' ? '' : $('#export-tahun').val();
            const format = $('#export-format').val();
            const includeCharts = $('#export-charts').is(':checked');
            const batchSize = $('#export-batch-size').val() === 'all' ? -1 : parseInt($('#export-batch-size').val());

            const filteredData = (window.lksData || []).filter(lks =>
                lks.tahun_pengajuan &&
                (!provinsi || provinsi === 'Semua Provinsi' || lks.provinsi.toUpperCase().trim() === provinsi.toUpperCase().trim()) &&
                (!kabupaten || kabupaten === 'Semua Kabupaten' || lks.kabupaten.toUpperCase().trim() === kabupaten.toUpperCase().trim()) &&
                (!peringkat || lks.peringkat.toUpperCase().trim() === peringkat.toUpperCase().trim()) &&
                (!tahun || lks.tahun_pengajuan.toString() === tahun)
            );

            const exportData = filteredData.map(lks => ({
                id_lembaga: lks.id_lembaga,
                no_lembaga: lks.no_lembaga,
                nama_lembaga: lks.nama_lembaga,
                nama_ketua: lks.nama_ketua,
                alamat_lembaga: lks.alamat_lembaga,
                provinsi: lks.provinsi,
                kabupaten: lks.kabupaten,
                id_provinsi: lks.id_provinsi,
                id_kabupaten: lks.id_kabupaten,
                id_kecamatan: lks.id_kecamatan,
                id_kelurahan: lks.id_kelurahan,
                id_akreditasi: lks.id_akreditasi,
                nama_lembaga_akreditasi: lks.nama_lembaga_akreditasi,
                nama_layanan: lks.nama_layanan,
                cluster: lks.cluster,
                peringkat: lks.peringkat,
                jenis_layanan: lks.jenis_layanan,
                tahun_pengajuan: lks.tahun_pengajuan,
                latitude: lks.latitude,
                longitude: lks.longitude,
                status: lks.status
            }));

            async function exportBatch(batch, batchIndex, totalBatches) {
                try {
                    const start = batchIndex * batchSize;
                    const end = batchSize === -1 ? exportData.length : Math.min(start + batchSize, exportData.length);
                    const batchData = exportData.slice(start, end);

                    if (format === 'csv') {
                        const csv = XLSX.utils.json_to_sheet(batchData);
                        const csvString = XLSX.utils.sheet_to_csv(csv);
                        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `lks_lansia_batch_${batchIndex + 1}.csv`;
                        link.click();
                        URL.revokeObjectURL(link.href);
                    } else if (format === 'excel') {
                        const ws = XLSX.utils.json_to_sheet(batchData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'LKS Lansia');
                        XLSX.writeFile(wb, `lks_lansia_batch_${batchIndex + 1}.xlsx`);
                    } else if (format === 'pdf') {
                        const { jsPDF } = window.jspdf;
                        const doc = new jsPDF();
                        doc.setFontSize(16);
                        doc.text('Laporan Data LKS Lansia', 20, 20);
                        doc.autoTable({
                            head: [Object.keys(batchData[0])],
                            body: batchData.map(row => Object.values(row)),
                            startY: 30,
                            theme: 'grid',
                            headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
                            styles: { fontSize: 8, cellPadding: 2 }
                        });
                        if (includeCharts && batchIndex === 0) {
                            const charts = ['akreditasi-chart', 'provinsi-chart', 'layanan-chart', 'tahun-chart', 'pengajuan-chart', 'debug-layanan-chart'];
                            let yPosition = doc.lastAutoTable.finalY + 10;
                            for (let i = 0; i < charts.length; i++) {
                                const canvas = document.getElementById(charts[i]);
                                if (canvas && canvas.dataset.loaded === 'true') {
                                    const imgData = canvas.toDataURL('image/png');
                                    doc.addPage();
                                    doc.setFontSize(12);
                                    doc.text(charts[i].replace('-chart', '').toUpperCase(), 20, 20);
                                    doc.addImage(imgData, 'PNG', 20, 30, 170, 100);
                                    yPosition = 140;
                                }
                            }
                        }
                        doc.save(`lks_lansia_batch_${batchIndex + 1}.pdf`);
                    }

                    window.lks_lansia?.showLoading?.(true, Math.round(((batchIndex + 1) / totalBatches) * 100), 'Mengekspor data...');
                    if (end < exportData.length) {
                        setTimeout(() => exportBatch(exportData, batchIndex + 1, totalBatches), 100);
                    } else {
                        showNotification('Data berhasil diekspor', 'success');
                        $('#export-modal').addClass('hidden');
                        window.lks_lansia?.showLoading?.(false);
                    }
                } catch (error) {
                    showNotification('Gagal mengekspor data: ' + error.message, 'error');
                    window.lks_lansia?.showLoading?.(false);
                }
            }

            const totalBatches = batchSize === -1 ? 1 : Math.ceil(exportData.length / batchSize);
            exportBatch(exportData, 0, totalBatches);
            console.log(`Ekspor selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        });

        // Clear uploaded data
        $(document).on('click', '#clear-uploaded-data-btn', function() {
            const startTime = performance.now();
            $('#delete-confirm-modal').removeClass('hidden');
            $(document).off('click', '#confirm-delete-btn').on('click', '#confirm-delete-btn', function() {
                window.lks_lansia?.showLoading?.(true, 0, 'Menghapus data yang diunggah...');
                window.lksData = window.lksData?.filter(lks => lks.dummy) || [];
                window.lks_lansia?.saveData?.();
                window.lks_lansia?.updateTable?.();
                window.lks_lansia?.updateStats?.();
                window.lks_lansia?.updateMap?.();
                updateCharts();
                updateFilterOptions();
                showNotification('Semua data upload berhasil dihapus', 'success');
                $('#delete-confirm-modal').addClass('hidden');
                window.lks_lansia?.showLoading?.(false);
                console.log(`Clear uploaded data selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
            });
        });

        // Handle help modal
        $(document).on('click', '#help-btn', function() {
            const startTime = performance.now();
            $('#help-modal').removeClass('hidden');
            console.log(`Help button click selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        });

        $(document).on('click', '#close-help-btn', function() {
            const startTime = performance.now();
            $('#help-modal').addClass('hidden');
            console.log(`Close help button click selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        });

        // Handle search coordinates
        $(document).on('click', '#cari-koordinat-lembaga', function() {
            const startTime = performance.now();
            const alamat = $('#alamat_lembaga').val();
            const provinsi = $('#provinsi').val();
            if (window.lks_lansia?.getCoordinates) {
                const coordinates = window.lks_lansia.getCoordinates(alamat, provinsi);
                if (coordinates) {
                    showNotification(`Koordinat ditemukan: Lat ${coordinates.latitude}, Lon ${coordinates.longitude}`, 'success');
                } else {
                    showNotification('Koordinat tidak ditemukan.', 'error');
                }
            } else {
                showNotification('Fungsi getCoordinates tidak tersedia.', 'error');
            }
            console.log(`Search coordinates selesai dalam ${(performance.now() - startTime).toFixed(2)} ms`);
        });

        // Initialize
        console.log('Data awal window.lksData:', window.lksData || 'Tidak ada data');
        updateFilterOptions();
        updateCharts();
    });
})();