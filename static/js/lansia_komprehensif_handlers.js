console.log('lansia_komprehensif_handlers.js loaded at ' + new Date().toLocaleString());

// Fungsi untuk mengisi dropdown NIK di semua form yang memerlukan NIK
function populateNikDropdown() {
    console.log('Populating NIK dropdowns...');
    try {
        const nikSelects = [
            'health-nik', 'finance-nik', 'activity-nik'
        ];
        const lansia = window.lansiaKomprehensifData.lansia || [];
        console.log('NIK dropdown data:', lansia);
        nikSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Pilih NIK Lansia</option>';
                lansia.forEach(l => {
                    const option = document.createElement('option');
                    option.value = l.nik;
                    option.textContent = `${l.nik} - ${l.nama}`;
                    select.appendChild(option);
                });
            } else {
                console.warn(`Select element with ID ${selectId} not found`);
            }
        });
        console.log('NIK dropdowns populated');
    } catch (error) {
        console.error('Error populating NIK dropdowns:', error);
        showNotification('Gagal mengisi dropdown NIK: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani tombol
function attachButtonListeners() {
    console.log('Attaching button listeners...');
    try {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => updateTabContent(btn.dataset.tab));
        });

        document.getElementById('input-btn')?.addEventListener('click', () => updateTabContent('personal'));
        document.getElementById('summary-btn')?.addEventListener('click', showSummary);
        document.getElementById('export-btn')?.addEventListener('click', exportToPDF);
        document.getElementById('help-btn')?.addEventListener('click', () => {
            document.getElementById('help-modal')?.classList.remove('hidden');
        });
        document.getElementById('close-help-btn')?.addEventListener('click', () => {
            document.getElementById('help-modal')?.classList.add('hidden');
        });
        document.getElementById('close-summary-btn')?.addEventListener('click', () => {
            document.getElementById('summary-modal')?.classList.add('hidden');
        });
        document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
            document.getElementById('delete-confirm-modal')?.classList.add('hidden');
        });

        document.getElementById('cari-koordinat')?.addEventListener('click', () => cariKoordinat('alamat', 'latitude', 'longitude'));
        document.getElementById('cari-koordinat-sentra')?.addEventListener('click', () => cariKoordinat('lokasi_sentra', 'latitude_sentra', 'longitude_sentra'));
        document.getElementById('cari-koordinat-bencana')?.addEventListener('click', () => cariKoordinat('lokasi_bencana', 'latitude_bencana', 'longitude_bencana'));

        document.getElementById('personal-form')?.addEventListener('submit', handlePersonalFormSubmit);
        document.getElementById('health-form')?.addEventListener('submit', handleHealthFormSubmit);
        document.getElementById('finance-form')?.addEventListener('submit', handleFinanceFormSubmit);
        document.getElementById('activity-form')?.addEventListener('submit', handleActivityFormSubmit);
        document.getElementById('policy-form')?.addEventListener('submit', handlePolicyFormSubmit);
        document.getElementById('rehabilitation-form')?.addEventListener('submit', handleRehabilitationFormSubmit);
        document.getElementById('monitoring-form')?.addEventListener('submit', handleMonitoringFormSubmit);
        document.getElementById('partnership-form')?.addEventListener('submit', handlePartnershipFormSubmit);
        document.getElementById('balai-form')?.addEventListener('submit', handleBalaiFormSubmit);
        document.getElementById('disaster-form')?.addEventListener('submit', handleDisasterFormSubmit);
        document.getElementById('productive-form')?.addEventListener('submit', handleProductiveFormSubmit);
        document.getElementById('advocacy-form')?.addEventListener('submit', handleAdvocacyFormSubmit);
        document.getElementById('hlun-form')?.addEventListener('submit', handleHlunFormSubmit);
        document.getElementById('training-form')?.addEventListener('submit', handleTrainingFormSubmit);
        document.getElementById('research-form')?.addEventListener('submit', handleResearchFormSubmit);
        document.getElementById('filter-health-btn')?.addEventListener('click', handleHealthFilter);

        document.getElementById('cancel-edit-btn')?.addEventListener('click', resetPersonalForm);
        document.getElementById('cancel-health-edit-btn')?.addEventListener('click', resetHealthForm);
        document.getElementById('cancel-finance-edit-btn')?.addEventListener('click', resetFinanceForm);
        document.getElementById('cancel-activity-edit-btn')?.addEventListener('click', resetActivityForm);
        document.getElementById('cancel-policy-edit-btn')?.addEventListener('click', resetPolicyForm);
        document.getElementById('cancel-rehabilitation-edit-btn')?.addEventListener('click', resetRehabilitationForm);
        document.getElementById('cancel-monitoring-edit-btn')?.addEventListener('click', resetMonitoringForm);
        document.getElementById('cancel-partnership-edit-btn')?.addEventListener('click', resetPartnershipForm);
        document.getElementById('cancel-balai-edit-btn')?.addEventListener('click', resetBalaiForm);
        document.getElementById('cancel-disaster-edit-btn')?.addEventListener('click', resetDisasterForm);
        document.getElementById('cancel-productive-edit-btn')?.addEventListener('click', resetProductiveForm);
        document.getElementById('cancel-advocacy-edit-btn')?.addEventListener('click', resetAdvocacyForm);
        document.getElementById('cancel-hlun-edit-btn')?.addEventListener('click', resetHlunForm);
        document.getElementById('cancel-training-edit-btn')?.addEventListener('click', resetTrainingForm);
        document.getElementById('cancel-research-edit-btn')?.addEventListener('click', resetResearchForm);

        setupAutocomplete('alamat', 'autocomplete-items');
        setupAutocomplete('lokasi_sentra', 'autocomplete-items-sentra');
        setupAutocomplete('lokasi_bencana', 'autocomplete-items-bencana');
        console.log('Button listeners attached successfully');
    } catch (error) {
        console.error('Error attaching button listeners:', error);
        showNotification('Gagal mengatur listener tombol: ' + error.message, 'error');
    }
}

// Fungsi untuk mencari koordinat
function cariKoordinat(addressFieldId, latFieldId, lonFieldId) {
    console.log(`Cari Koordinat button clicked for address field: ${addressFieldId}`);
    const address = document.getElementById(addressFieldId)?.value;
    const button = document.querySelector(`#${addressFieldId} ~ button`) || document.getElementById(`cari-koordinat${addressFieldId.includes('sentra') ? '-sentra' : addressFieldId.includes('bencana') ? '-bencana' : ''}`);
    if (!address) {
        showNotification('Masukkan alamat terlebih dahulu', 'error');
        return;
    }
    showLoading(true);
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Mencari...';
    }
    fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
        body: JSON.stringify({ address }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-map-marker-alt mr-2"></i> Cari Koordinat';
        }
        if (data.error) {
            showNotification(data.message, 'error');
        } else {
            document.getElementById(latFieldId).value = data.lat;
            document.getElementById(lonFieldId).value = data.lon;
            showNotification('Geocoding berhasil', 'success');
        }
    })
    .catch(error => {
        showLoading(false);
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-map-marker-alt mr-2"></i> Cari Koordinat';
        }
        console.error('Error geocoding:', error);
        showNotification('Gagal melakukan geocoding: ' + error.message, 'error');
    });
}

// Fungsi untuk mengatur autocomplete alamat
function setupAutocomplete(fieldId, itemsId) {
    console.log(`Setting up autocomplete for ${fieldId}...`);
    const input = document.getElementById(fieldId);
    const itemsContainer = document.getElementById(itemsId);
    if (!input || !itemsContainer) {
        console.warn(`Input or items container not found for ${fieldId}`);
        return;
    }
    let timeout;
    input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const query = input.value;
            if (query.length < 3) {
                itemsContainer.innerHTML = '';
                itemsContainer.classList.add('hidden');
                return;
            }
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=pk.eyJ1IjoicmVoYWdlbCIsImEiOiJjbWRoMHA3NTAwMDBhMnFzZjgyeTRoODN5In0.Ajck_EAohATqw0_b7XV5MQ&country=ID&limit=5`, {
                headers: { 'X-Bypass-RBAC': 'true' },
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                itemsContainer.innerHTML = '';
                if (data.features && data.features.length > 0) {
                    data.features.forEach(feature => {
                        const div = document.createElement('div');
                        div.textContent = feature.place_name;
                        div.classList.add('autocomplete-item');
                        div.addEventListener('click', () => {
                            input.value = feature.place_name;
                            itemsContainer.innerHTML = '';
                            itemsContainer.classList.add('hidden');
                            cariKoordinat(fieldId, input.dataset.latField || 'latitude', input.dataset.lonField || 'longitude');
                        });
                        itemsContainer.appendChild(div);
                    });
                    itemsContainer.classList.remove('hidden');
                } else {
                    itemsContainer.classList.add('hidden');
                }
            })
            .catch(error => {
                console.error('Error fetching autocomplete:', error);
                showNotification('Gagal memuat saran alamat: ' + error.message, 'error');
            });
        }, 500);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !itemsContainer.contains(e.target)) {
            itemsContainer.classList.add('hidden');
        }
    });
}

// Fungsi untuk mengisi tab content
function updateTabContent(tab) {
    console.log('Updating tab content:', tab);
    try {
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        const tabContent = document.getElementById(`${tab}-tab`);
        if (!tabContent) throw new Error(`Tab content ${tab}-tab not found`);
        tabContent.classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const tabButton = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (tabButton) tabButton.classList.add('active');
        window.scrollTo({ top: tabContent.offsetTop, behavior: 'smooth' });
        const firstInput = tabContent.querySelector('input, select');
        if (firstInput) firstInput.focus();
        if (tab === 'health') {
            updateHealthTable();
        } else if (tab === 'finance') {
            updateFinanceTable();
        } else if (tab === 'activity') {
            initCalendar();
        }
        populateNikDropdown();
    } catch (error) {
        console.error('Error updating tab content:', error);
        showNotification('Gagal memperbarui tab: ' + error.message, 'error');
    }
}

// Fungsi untuk konfirmasi penghapusan
function confirmDelete(id, type) {
    console.log(`Confirming delete for ${type} with ID: ${id}`);
    try {
        const modal = document.getElementById('delete-confirm-modal');
        if (!modal) throw new Error('Delete confirm modal not found');
        modal.classList.remove('hidden');
        document.getElementById('confirm-delete-btn').onclick = async () => {
            showLoading(true);
            try {
                const response = await fetch(`/api/lansia_komprehensif/delete/${id}?type=${type}`, {
                    method: 'DELETE',
                    headers: { 'X-Bypass-RBAC': 'true' },
                    credentials: 'include'
                });
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                showNotification(data.message, 'success');
                modal.classList.add('hidden');
                await loadData();
                populateNikDropdown();
            } catch (error) {
                console.error(`Error deleting ${type}:`, error);
                showNotification(`Gagal menghapus ${type}: ${error.message}`, 'error');
            } finally {
                showLoading(false);
            }
        };
    } catch (error) {
        console.error('Error setting up delete confirmation:', error);
        showNotification('Gagal mengatur konfirmasi penghapusan: ' + error.message, 'error');
    }
}

// Fungsi untuk menampilkan ringkasan
function showSummary() {
    console.log('Showing summary...');
    try {
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

        const content = `
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
        `;
        const summaryContent = document.getElementById('summary-content');
        if (!summaryContent) throw new Error('Summary content element not found');
        summaryContent.innerHTML = content;
        document.getElementById('summary-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error showing summary:', error);
        showNotification('Gagal menampilkan ringkasan: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani submit form Data Pribadi
async function handlePersonalFormSubmit(e) {
    e.preventDefault();
    console.log('Handling personal form submit...');
    try {
        const form = document.getElementById('personal-form');
        const nik = form.querySelector('#nik')?.value;
        const editNik = form.querySelector('#edit-nik')?.value;
        const data = {
            nik: nik || '',
            nama: form.querySelector('#nama')?.value || '',
            usia: parseInt(form.querySelector('#usia')?.value) || 0,
            status_sosial: form.querySelector('#status_sosial')?.value || '',
            alamat: form.querySelector('#alamat')?.value || '',
            koordinat: [
                parseFloat(form.querySelector('#longitude')?.value) || 0,
                parseFloat(form.querySelector('#latitude')?.value) || 0
            ],
            keluarga: form.querySelector('#keluarga')?.value ? form.querySelector('#keluarga').value.split(',').map(s => s.trim()) : [],
            tempat_tinggal: form.querySelector('#tempat_tinggal')?.value || '',
            kondisi_kesehatan: window.lansiaKomprehensifData.lansia.find(l => l.nik === (editNik || nik))?.kondisi_kesehatan || [],
            keuangan: window.lansiaKomprehensifData.lansia.find(l => l.nik === (editNik || nik))?.keuangan || [],
            kegiatan: window.lansiaKomprehensifData.lansia.find(l => l.nik === (editNik || nik))?.kegiatan || []
        };

        if (!nik.match(/^\d{16}$/)) {
            showNotification('NIK harus 16 digit angka', 'error');
            return;
        }
        if (!data.nama || data.usia < 60 || !data.status_sosial || !data.alamat || !data.tempat_tinggal) {
            showNotification('Semua kolom wajib diisi dan usia harus minimal 60 tahun', 'error');
            return;
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { lansia: [data] } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Personal form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#edit-nik').value = '';
        form.querySelector('#simpan-personal-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving personal data:', error);
        showNotification('Gagal menyimpan data pribadi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Kesehatan
async function handleHealthFormSubmit(e) {
    e.preventDefault();
    console.log('Handling health form submit...');
    try {
        const form = document.getElementById('health-form');
        const nik = form.querySelector('#health-nik')?.value;
        const editId = form.querySelector('#health-edit-id')?.value;
        if (!nik) {
            showNotification('Pilih NIK lansia terlebih dahulu', 'error');
            return;
        }
        const data = {
            id: editId || generateId(),
            penyakit: form.querySelector('#penyakit')?.value || '',
            tanggal_diagnosis: form.querySelector('#tanggal_diagnosis')?.value || '',
            jadwal_periksa: form.querySelector('#jadwal_periksa')?.value || ''
        };

        if (!data.penyakit || !data.tanggal_diagnosis || !data.jadwal_periksa) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            showNotification('Lansia dengan NIK tersebut tidak ditemukan', 'error');
            return;
        }
        lansia.kondisi_kesehatan = lansia.kondisi_kesehatan || [];
        if (editId) {
            lansia.kondisi_kesehatan = lansia.kondisi_kesehatan.map(h => h.id === editId ? data : h);
        } else {
            lansia.kondisi_kesehatan.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { lansia: window.lansiaKomprehensifData.lansia } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Health form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#health-edit-id').value = '';
        form.querySelector('#simpan-health-btn').textContent = 'Tambah';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving health data:', error);
        showNotification('Gagal menyimpan data kesehatan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Keuangan
async function handleFinanceFormSubmit(e) {
    e.preventDefault();
    console.log('Handling finance form submit...');
    try {
        const form = document.getElementById('finance-form');
        const nik = form.querySelector('#finance-nik')?.value;
        const editId = form.querySelector('#finance-edit-id')?.value;
        if (!nik) {
            showNotification('Pilih NIK lansia terlebih dahulu', 'error');
            return;
        }
        const data = {
            id: editId || generateId(),
            jenis_bantuan: form.querySelector('#jenis_bantuan')?.value || '',
            jumlah_bantuan: parseInt(form.querySelector('#jumlah_bantuan')?.value) || 0,
            tanggal_bantuan: form.querySelector('#tanggal_bantuan')?.value || ''
        };

        if (!data.jenis_bantuan || !data.jumlah_bantuan || !data.tanggal_bantuan) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            showNotification('Lansia dengan NIK tersebut tidak ditemukan', 'error');
            return;
        }
        lansia.keuangan = lansia.keuangan || [];
        if (editId) {
            lansia.keuangan = lansia.keuangan.map(f => f.id === editId ? data : f);
        } else {
            lansia.keuangan.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { lansia: window.lansiaKomprehensifData.lansia } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Finance form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#finance-edit-id').value = '';
        form.querySelector('#simpan-finance-btn').textContent = 'Tambah';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving finance data:', error);
        showNotification('Gagal menyimpan data keuangan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Kegiatan
async function handleActivityFormSubmit(e) {
    e.preventDefault();
    console.log('Handling activity form submit...');
    try {
        const form = document.getElementById('activity-form');
        const nik = form.querySelector('#activity-nik')?.value;
        const editId = form.querySelector('#activity-edit-id')?.value;
        if (!nik) {
            showNotification('Pilih NIK lansia terlebih dahulu', 'error');
            return;
        }
        const data = {
            id: editId || generateId(),
            nama_kegiatan: form.querySelector('#nama_kegiatan')?.value || '',
            tanggal_kegiatan: form.querySelector('#tanggal_kegiatan')?.value || '',
            status_kegiatan: form.querySelector('#status_kegiatan')?.value || ''
        };

        if (!data.nama_kegiatan || !data.tanggal_kegiatan || !data.status_kegiatan) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            showNotification('Lansia dengan NIK tersebut tidak ditemukan', 'error');
            return;
        }
        lansia.kegiatan = lansia.kegiatan || [];
        if (editId) {
            lansia.kegiatan = lansia.kegiatan.map(a => a.id === editId ? data : a);
        } else {
            lansia.kegiatan.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { lansia: window.lansiaKomprehensifData.lansia } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Activity form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#activity-edit-id').value = '';
        form.querySelector('#simpan-activity-btn').textContent = 'Tambah';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving activity data:', error);
        showNotification('Gagal menyimpan data kegiatan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Kebijakan
async function handlePolicyFormSubmit(e) {
    e.preventDefault();
    console.log('Handling policy form submit...');
    try {
        const form = document.getElementById('policy-form');
        const editId = form.querySelector('#policy-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            judul_kebijakan: form.querySelector('#judul_kebijakan')?.value || '',
            deskripsi_kebijakan: form.querySelector('#deskripsi_kebijakan')?.value || ''
        };

        if (!data.judul_kebijakan || !data.deskripsi_kebijakan) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.policies = window.lansiaKomprehensifData.policies || [];
        if (editId) {
            window.lansiaKomprehensifData.policies = window.lansiaKomprehensifData.policies.map(p => p.id === editId ? data : p);
        } else {
            window.lansiaKomprehensifData.policies.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { policies: window.lansiaKomprehensifData.policies } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Policy form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#policy-edit-id').value = '';
        form.querySelector('#simpan-policy-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving policy data:', error);
        showNotification('Gagal menyimpan data kebijakan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Rehabilitasi
async function handleRehabilitationFormSubmit(e) {
    e.preventDefault();
    console.log('Handling rehabilitation form submit...');
    try {
        const form = document.getElementById('rehabilitation-form');
        const editId = form.querySelector('#rehabilitation-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            nama_balai: form.querySelector('#nama_balai')?.value || '',
            layanan_balai: form.querySelector('#layanan_balai')?.value || ''
        };

        if (!data.nama_balai || !data.layanan_balai) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.rehabilitations = window.lansiaKomprehensifData.rehabilitations || [];
        if (editId) {
            window.lansiaKomprehensifData.rehabilitations = window.lansiaKomprehensifData.rehabilitations.map(r => r.id === editId ? data : r);
        } else {
            window.lansiaKomprehensifData.rehabilitations.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { rehabilitations: window.lansiaKomprehensifData.rehabilitations } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Rehabilitation form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#rehabilitation-edit-id').value = '';
        form.querySelector('#simpan-rehabilitation-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving rehabilitation data:', error);
        showNotification('Gagal menyimpan data rehabilitasi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Pemantauan
async function handleMonitoringFormSubmit(e) {
    e.preventDefault();
    console.log('Handling monitoring form submit...');
    try {
        const form = document.getElementById('monitoring-form');
        const editId = form.querySelector('#monitoring-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            nama_program: form.querySelector('#nama_program')?.value || '',
            progres_program: form.querySelector('#progres_program')?.value || ''
        };

        if (!data.nama_program || !data.progres_program) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.monitorings = window.lansiaKomprehensifData.monitorings || [];
        if (editId) {
            window.lansiaKomprehensifData.monitorings = window.lansiaKomprehensifData.monitorings.map(m => m.id === editId ? data : m);
        } else {
            window.lansiaKomprehensifData.monitorings.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { monitorings: window.lansiaKomprehensifData.monitorings } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Monitoring form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#monitoring-edit-id').value = '';
        form.querySelector('#simpan-monitoring-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving monitoring data:', error);
        showNotification('Gagal menyimpan data pemantauan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Kemitraan
async function handlePartnershipFormSubmit(e) {
    e.preventDefault();
    console.log('Handling partnership form submit...');
    try {
        const form = document.getElementById('partnership-form');
        const editId = form.querySelector('#partnership-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            nama_mitra: form.querySelector('#nama_mitra')?.value || '',
            kontak_mitra: form.querySelector('#kontak_mitra')?.value || ''
        };

        if (!data.nama_mitra || !data.kontak_mitra) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.partnerships = window.lansiaKomprehensifData.partnerships || [];
        if (editId) {
            window.lansiaKomprehensifData.partnerships = window.lansiaKomprehensifData.partnerships.map(p => p.id === editId ? data : p);
        } else {
            window.lansiaKomprehensifData.partnerships.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { partnerships: window.lansiaKomprehensifData.partnerships } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Partnership form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#partnership-edit-id').value = '';
        form.querySelector('#simpan-partnership-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving partnership data:', error);
        showNotification('Gagal menyimpan data kemitraan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Balai
async function handleBalaiFormSubmit(e) {
    e.preventDefault();
    console.log('Handling balai form submit...');
    try {
        const form = document.getElementById('balai-form');
        const editId = form.querySelector('#balai-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            nama_sentra: form.querySelector('#nama_sentra')?.value || '',
            lokasi_sentra: form.querySelector('#lokasi_sentra')?.value || '',
            koordinat: [
                parseFloat(form.querySelector('#longitude_sentra')?.value) || 0,
                parseFloat(form.querySelector('#latitude_sentra')?.value) || 0
            ],
            layanan_sentra: form.querySelector('#layanan_sentra')?.value || ''
        };

        if (!data.nama_sentra || !data.lokasi_sentra || !data.layanan_sentra) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.balai = window.lansiaKomprehensifData.balai || [];
        if (editId) {
            window.lansiaKomprehensifData.balai = window.lansiaKomprehensifData.balai.map(b => b.id === editId ? data : b);
        } else {
            window.lansiaKomprehensifData.balai.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { balai: window.lansiaKomprehensifData.balai } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Balai form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#balai-edit-id').value = '';
        form.querySelector('#simpan-balai-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving balai data:', error);
        showNotification('Gagal menyimpan data balai: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Bencana
async function handleDisasterFormSubmit(e) {
    e.preventDefault();
    console.log('Handling disaster form submit...');
    try {
        const form = document.getElementById('disaster-form');
        const editId = form.querySelector('#disaster-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            kejadian_bencana: form.querySelector('#kejadian_bencana')?.value || '',
            lokasi_bencana: form.querySelector('#lokasi_bencana')?.value || '',
            koordinat: [
                parseFloat(form.querySelector('#longitude_bencana')?.value) || 0,
                parseFloat(form.querySelector('#latitude_bencana')?.value) || 0
            ],
            kebutuhan_bencana: form.querySelector('#kebutuhan_bencana')?.value || ''
        };

        if (!data.kejadian_bencana || !data.lokasi_bencana || !data.kebutuhan_bencana) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.disasters = window.lansiaKomprehensifData.disasters || [];
        if (editId) {
            window.lansiaKomprehensifData.disasters = window.lansiaKomprehensifData.disasters.map(d => d.id === editId ? data : d);
        } else {
            window.lansiaKomprehensifData.disasters.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { disasters: window.lansiaKomprehensifData.disasters } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Disaster form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#disaster-edit-id').value = '';
        form.querySelector('#simpan-disaster-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving disaster data:', error);
        showNotification('Gagal menyimpan data bencana: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Lansia Produktif
async function handleProductiveFormSubmit(e) {
    e.preventDefault();
    console.log('Handling productive form submit...');
    try {
        const form = document.getElementById('productive-form');
        const editId = form.querySelector('#productive-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            nama_pelatihan: form.querySelector('#nama_pelatihan')?.value || '',
            tanggal_pelatihan: form.querySelector('#tanggal_pelatihan')?.value || ''
        };

        if (!data.nama_pelatihan || !data.tanggal_pelatihan) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.productives = window.lansiaKomprehensifData.productives || [];
        if (editId) {
            window.lansiaKomprehensifData.productives = window.lansiaKomprehensifData.productives.map(p => p.id === editId ? data : p);
        } else {
            window.lansiaKomprehensifData.productives.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { productives: window.lansiaKomprehensifData.productives } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Productive form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#productive-edit-id').value = '';
        form.querySelector('#simpan-productive-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving productive data:', error);
        showNotification('Gagal menyimpan data lansia produktif: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Advokasi
async function handleAdvocacyFormSubmit(e) {
    e.preventDefault();
    console.log('Handling advocacy form submit...');
    try {
        const form = document.getElementById('advocacy-form');
        const editId = form.querySelector('#advocacy-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            nama_kampanye: form.querySelector('#nama_kampanye')?.value || '',
            jadwal_kampanye: form.querySelector('#jadwal_kampanye')?.value || ''
        };

        if (!data.nama_kampanye || !data.jadwal_kampanye) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.advocacies = window.lansiaKomprehensifData.advocacies || [];
        if (editId) {
            window.lansiaKomprehensifData.advocacies = window.lansiaKomprehensifData.advocacies.map(a => a.id === editId ? data : a);
        } else {
            window.lansiaKomprehensifData.advocacies.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { advocacies: window.lansiaKomprehensifData.advocacies } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Advocacy form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#advocacy-edit-id').value = '';
        form.querySelector('#simpan-advocacy-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving advocacy data:', error);
        showNotification('Gagal menyimpan data advokasi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form HLUN
async function handleHlunFormSubmit(e) {
    e.preventDefault();
    console.log('Handling hlun form submit...');
    try {
        const form = document.getElementById('hlun-form');
        const editId = form.querySelector('#hlun-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            nama_hlun: form.querySelector('#nama_hlun')?.value || '',
            tanggal_hlun: form.querySelector('#tanggal_hlun')?.value || ''
        };

        if (!data.nama_hlun || !data.tanggal_hlun) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.hluns = window.lansiaKomprehensifData.hluns || [];
        if (editId) {
            window.lansiaKomprehensifData.hluns = window.lansiaKomprehensifData.hluns.map(h => h.id === editId ? data : h);
        } else {
            window.lansiaKomprehensifData.hluns.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { hluns: window.lansiaKomprehensifData.hluns } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Hlun form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#hlun-edit-id').value = '';
        form.querySelector('#simpan-hlun-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving hlun data:', error);
        showNotification('Gagal menyimpan data HLUN: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Pelatihan
async function handleTrainingFormSubmit(e) {
    e.preventDefault();
    console.log('Handling training form submit...');
    try {
        const form = document.getElementById('training-form');
        const editId = form.querySelector('#training-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            nama_training: form.querySelector('#nama_training')?.value || '',
            tanggal_training: form.querySelector('#tanggal_training')?.value || ''
        };

        if (!data.nama_training || !data.tanggal_training) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.trainings = window.lansiaKomprehensifData.trainings || [];
        if (editId) {
            window.lansiaKomprehensifData.trainings = window.lansiaKomprehensifData.trainings.map(t => t.id === editId ? data : t);
        } else {
            window.lansiaKomprehensifData.trainings.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { trainings: window.lansiaKomprehensifData.trainings } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Training form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#training-edit-id').value = '';
        form.querySelector('#simpan-training-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving training data:', error);
        showNotification('Gagal menyimpan data pelatihan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani submit form Penelitian
async function handleResearchFormSubmit(e) {
    e.preventDefault();
    console.log('Handling research form submit...');
    try {
        const form = document.getElementById('research-form');
        const editId = form.querySelector('#research-edit-id')?.value;
        const data = {
            id: editId || generateId(),
            judul_penelitian: form.querySelector('#judul_penelitian')?.value || '',
            ringkasan_penelitian: form.querySelector('#ringkasan_penelitian')?.value || ''
        };

        if (!data.judul_penelitian || !data.ringkasan_penelitian) {
            showNotification('Semua kolom wajib diisi', 'error');
            return;
        }

        window.lansiaKomprehensifData.researches = window.lansiaKomprehensifData.researches || [];
        if (editId) {
            window.lansiaKomprehensifData.researches = window.lansiaKomprehensifData.researches.map(r => r.id === editId ? data : r);
        } else {
            window.lansiaKomprehensifData.researches.push(data);
        }

        showLoading(true);
        const response = await fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bypass-RBAC': 'true'
            },
            body: JSON.stringify({ data: { researches: window.lansiaKomprehensifData.researches } }),
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Research form save response:', result);
        showNotification(result.message, 'success');
        form.reset();
        form.querySelector('#research-edit-id').value = '';
        form.querySelector('#simpan-research-btn').textContent = 'Simpan';
        await loadData();
        populateNikDropdown();
    } catch (error) {
        console.error('Error saving research data:', error);
        showNotification('Gagal menyimpan data penelitian: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menangani filter kesehatan
function handleHealthFilter() {
    console.log('Handling health filter...');
    try {
        const startDate = document.getElementById('health-start-date')?.value;
        const endDate = document.getElementById('health-end-date')?.value;
        const nik = document.getElementById('health-nik')?.value;

        if (!nik) {
            showNotification('Pilih NIK lansia terlebih dahulu', 'error');
            return;
        }

        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            showNotification('Lansia dengan NIK tersebut tidak ditemukan', 'error');
            return;
        }

        const filteredHealth = lansia.kondisi_kesehatan.filter(h => {
            const diagnosisDate = new Date(h.tanggal_diagnosis);
            return (!startDate || new Date(startDate) <= diagnosisDate) && (!endDate || diagnosisDate <= new Date(endDate));
        });

        const table = $('#health-table').DataTable();
        table.clear();
        table.rows.add(filteredHealth.map(h => ({
            id: h.id,
            penyakit: h.penyakit,
            tanggal_diagnosis: h.tanggal_diagnosis,
            jadwal_periksa: h.jadwal_periksa
        }))).draw();
        console.log('Health filter applied with', filteredHealth.length, 'records');
        showNotification('Filter kesehatan diterapkan', 'success');
    } catch (error) {
        console.error('Error applying health filter:', error);
        showNotification('Gagal menerapkan filter kesehatan: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit lansia
function handleEditLansia(nik) {
    console.log('Editing lansia with NIK:', nik);
    try {
        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            throw new Error('Lansia tidak ditemukan');
        }
        const form = document.getElementById('personal-form');
        form.querySelector('#edit-nik').value = nik;
        form.querySelector('#nik').value = lansia.nik;
        form.querySelector('#nama').value = lansia.nama;
        form.querySelector('#usia').value = lansia.usia;
        form.querySelector('#status_sosial').value = lansia.status_sosial;
        form.querySelector('#alamat').value = lansia.alamat;
        form.querySelector('#keluarga').value = lansia.keluarga?.join(', ') || '';
        form.querySelector('#tempat_tinggal').value = lansia.tempat_tinggal;
        form.querySelector('#latitude').value = lansia.koordinat[1] || '';
        form.querySelector('#longitude').value = lansia.koordinat[0] || '';
        form.querySelector('#simpan-personal-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-edit-btn').classList.remove('hidden');
        updateTabContent('personal');
    } catch (error) {
        console.error('Error editing lansia:', error);
        showNotification('Gagal mengedit lansia: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data kesehatan
function handleEditHealth(id) {
    console.log('Editing health data with ID:', id);
    try {
        const nik = document.getElementById('health-nik')?.value;
        if (!nik) {
            throw new Error('Pilih NIK lansia terlebih dahulu');
        }
        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            throw new Error('Lansia tidak ditemukan');
        }
        const health = lansia.kondisi_kesehatan.find(h => h.id === id);
        if (!health) {
            throw new Error('Data kesehatan tidak ditemukan');
        }
        const form = document.getElementById('health-form');
        form.querySelector('#health-edit-id').value = id;
        form.querySelector('#penyakit').value = health.penyakit;
        form.querySelector('#tanggal_diagnosis').value = health.tanggal_diagnosis;
        form.querySelector('#jadwal_periksa').value = health.jadwal_periksa;
        form.querySelector('#simpan-health-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-health-edit-btn').classList.remove('hidden');
        updateTabContent('health');
    } catch (error) {
        console.error('Error editing health data:', error);
        showNotification('Gagal mengedit data kesehatan: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data keuangan
function handleEditFinance(id) {
    console.log('Editing finance data with ID:', id);
    try {
        const nik = document.getElementById('finance-nik')?.value;
        if (!nik) {
            throw new Error('Pilih NIK lansia terlebih dahulu');
        }
        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            throw new Error('Lansia tidak ditemukan');
        }
        const finance = lansia.keuangan.find(f => f.id === id);
        if (!finance) {
            throw new Error('Data keuangan tidak ditemukan');
        }
        const form = document.getElementById('finance-form');
        form.querySelector('#finance-edit-id').value = id;
        form.querySelector('#jenis_bantuan').value = finance.jenis_bantuan;
        form.querySelector('#jumlah_bantuan').value = finance.jumlah_bantuan;
        form.querySelector('#tanggal_bantuan').value = finance.tanggal_bantuan;
        form.querySelector('#simpan-finance-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-finance-edit-btn').classList.remove('hidden');
        updateTabContent('finance');
    } catch (error) {
        console.error('Error editing finance data:', error);
        showNotification('Gagal mengedit data keuangan: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data kegiatan
function handleEditActivity(id) {
    console.log('Editing activity data with ID:', id);
    try {
        const nik = document.getElementById('activity-nik')?.value;
        if (!nik) {
            throw new Error('Pilih NIK lansia terlebih dahulu');
        }
        const lansia = window.lansiaKomprehensifData.lansia.find(l => l.nik === nik);
        if (!lansia) {
            throw new Error('Lansia tidak ditemukan');
        }
        const activity = lansia.kegiatan.find(a => a.id === id);
        if (!activity) {
            throw new Error('Data kegiatan tidak ditemukan');
        }
        const form = document.getElementById('activity-form');
        form.querySelector('#activity-edit-id').value = id;
        form.querySelector('#nama_kegiatan').value = activity.nama_kegiatan;
        form.querySelector('#tanggal_kegiatan').value = activity.tanggal_kegiatan;
        form.querySelector('#status_kegiatan').value = activity.status_kegiatan;
        form.querySelector('#simpan-activity-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-activity-edit-btn').classList.remove('hidden');
        updateTabContent('activity');
    } catch (error) {
        console.error('Error editing activity data:', error);
        showNotification('Gagal mengedit data kegiatan: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data kebijakan
function handleEditPolicy(id) {
    console.log('Editing policy data with ID:', id);
    try {
        const policy = window.lansiaKomprehensifData.policies.find(p => p.id === id);
        if (!policy) {
            throw new Error('Data kebijakan tidak ditemukan');
        }
        const form = document.getElementById('policy-form');
        form.querySelector('#policy-edit-id').value = id;
        form.querySelector('#judul_kebijakan').value = policy.judul_kebijakan;
        form.querySelector('#deskripsi_kebijakan').value = policy.deskripsi_kebijakan;
        form.querySelector('#simpan-policy-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-policy-edit-btn').classList.remove('hidden');
        updateTabContent('policy');
    } catch (error) {
        console.error('Error editing policy data:', error);
        showNotification('Gagal mengedit data kebijakan: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data rehabilitasi
function handleEditRehabilitation(id) {
    console.log('Editing rehabilitation data with ID:', id);
    try {
        const rehabilitation = window.lansiaKomprehensifData.rehabilitations.find(r => r.id === id);
        if (!rehabilitation) {
            throw new Error('Data rehabilitasi tidak ditemukan');
        }
        const form = document.getElementById('rehabilitation-form');
        form.querySelector('#rehabilitation-edit-id').value = id;
        form.querySelector('#nama_balai').value = rehabilitation.nama_balai;
        form.querySelector('#layanan_balai').value = rehabilitation.layanan_balai;
        form.querySelector('#simpan-rehabilitation-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-rehabilitation-edit-btn').classList.remove('hidden');
        updateTabContent('rehabilitation');
    } catch (error) {
        console.error('Error editing rehabilitation data:', error);
        showNotification('Gagal mengedit data rehabilitasi: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data pemantauan
function handleEditMonitoring(id) {
    console.log('Editing monitoring data with ID:', id);
    try {
        const monitoring = window.lansiaKomprehensifData.monitorings.find(m => m.id === id);
        if (!monitoring) {
            throw new Error('Data pemantauan tidak ditemukan');
        }
        const form = document.getElementById('monitoring-form');
        form.querySelector('#monitoring-edit-id').value = id;
        form.querySelector('#nama_program').value = monitoring.nama_program;
        form.querySelector('#progres_program').value = monitoring.progres_program;
        form.querySelector('#simpan-monitoring-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-monitoring-edit-btn').classList.remove('hidden');
        updateTabContent('monitoring');
    } catch (error) {
        console.error('Error editing monitoring data:', error);
        showNotification('Gagal mengedit data pemantauan: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data kemitraan
function handleEditPartnership(id) {
    console.log('Editing partnership data with ID:', id);
    try {
        const partnership = window.lansiaKomprehensifData.partnerships.find(p => p.id === id);
        if (!partnership) {
            throw new Error('Data kemitraan tidak ditemukan');
        }
        const form = document.getElementById('partnership-form');
        form.querySelector('#partnership-edit-id').value = id;
        form.querySelector('#nama_mitra').value = partnership.nama_mitra;
        form.querySelector('#kontak_mitra').value = partnership.kontak_mitra;
        form.querySelector('#simpan-partnership-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-partnership-edit-btn').classList.remove('hidden');
        updateTabContent('partnership');
    } catch (error) {
        console.error('Error editing partnership data:', error);
        showNotification('Gagal mengedit data kemitraan: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data balai
function handleEditBalai(id) {
    console.log('Editing balai data with ID:', id);
    try {
        const balai = window.lansiaKomprehensifData.balai.find(b => b.id === id);
        if (!balai) {
            throw new Error('Data balai tidak ditemukan');
        }
        const form = document.getElementById('balai-form');
        form.querySelector('#balai-edit-id').value = id;
        form.querySelector('#nama_sentra').value = balai.nama_sentra;
        form.querySelector('#lokasi_sentra').value = balai.lokasi_sentra;
        form.querySelector('#latitude_sentra').value = balai.koordinat[1] || '';
        form.querySelector('#longitude_sentra').value = balai.koordinat[0] || '';
        form.querySelector('#layanan_sentra').value = balai.layanan_sentra;
        form.querySelector('#simpan-balai-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-balai-edit-btn').classList.remove('hidden');
        updateTabContent('balai');
    } catch (error) {
        console.error('Error editing balai data:', error);
        showNotification('Gagal mengedit data balai: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data bencana
function handleEditDisaster(id) {
    console.log('Editing disaster data with ID:', id);
    try {
        const disaster = window.lansiaKomprehensifData.disasters.find(d => d.id === id);
        if (!disaster) {
            throw new Error('Data bencana tidak ditemukan');
        }
        const form = document.getElementById('disaster-form');
        form.querySelector('#disaster-edit-id').value = id;
        form.querySelector('#kejadian_bencana').value = disaster.kejadian_bencana;
        form.querySelector('#lokasi_bencana').value = disaster.lokasi_bencana;
        form.querySelector('#latitude_bencana').value = disaster.koordinat[1] || '';
        form.querySelector('#longitude_bencana').value = disaster.koordinat[0] || '';
        form.querySelector('#kebutuhan_bencana').value = disaster.kebutuhan_bencana;
        form.querySelector('#simpan-disaster-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-disaster-edit-btn').classList.remove('hidden');
        updateTabContent('disaster');
    } catch (error) {
        console.error('Error editing disaster data:', error);
        showNotification('Gagal mengedit data bencana: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data lansia produktif
function handleEditProductive(id) {
    console.log('Editing productive data with ID:', id);
    try {
        const productive = window.lansiaKomprehensifData.productives.find(p => p.id === id);
        if (!productive) {
            throw new Error('Data lansia produktif tidak ditemukan');
        }
        const form = document.getElementById('productive-form');
        form.querySelector('#productive-edit-id').value = id;
        form.querySelector('#nama_pelatihan').value = productive.nama_pelatihan;
        form.querySelector('#tanggal_pelatihan').value = productive.tanggal_pelatihan;
        form.querySelector('#simpan-productive-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-productive-edit-btn').classList.remove('hidden');
        updateTabContent('productive');
    } catch (error) {
        console.error('Error editing productive data:', error);
        showNotification('Gagal mengedit data lansia produktif: ' + error.message, 'error');
    }
}

// Fungsi untuk menangani edit data advokasi
function handleEditAdvocacy(id) {
    console.log('Editing advocacy data with ID:', id);
    try {
        const advocacy = window.lansiaKomprehensifData.advocacies.find(a => a.id === id);
        if (!advocacy) {
            throw new Error('Data advokasi tidak ditemukan');
        }
        const form = document.getElementById('advocacy-form');
        form.querySelector('#advocacy-edit-id').value = id;
        form.querySelector('#nama_kampanye').value = advocacy.nama_kampanye;
        form.querySelector('#jadwal_kampanye').value = advocacy.jadwal_kampanye;
        form.querySelector('#simpan-advocacy-btn').textContent = 'Perbarui';
        form.querySelector('#cancel-advocacy-edit-btn').classList.remove('hidden');
        updateTabContent('advocacy');
    } catch (error) {
        console.error('Error editing advocacy data:', error);
        showNotification('Gagal mengedit data advokasi: ' + error.message, 'error');
    }
}

function handleEditHlun(id) {
    console.log('Editing hlun data with ID:', id);
    try {
        const hlun = window.lansiaKomprehensifData.hluns.find(h => h.id === id);
        if (!hlun) {
            throw new Error('Data HLUN tidak ditemukan');
        }
        document.getElementById('hlun-edit-id').value = id;
        document.getElementById('nama_hlun').value = hlun.nama_hlun;
        document.getElementById('tanggal_hlun').value = hlun.tanggal_hlun;
        document.getElementById('simpan-hlun-btn').textContent = 'Perbarui';
        document.getElementById('cancel-hlun-edit-btn').classList.remove('hidden');
        updateTabContent('hlun');
    } catch (error) {
        console.error('Error editing hlun data:', error);
        showNotification('Gagal mengedit data HLUN: ' + error.message, 'error');
    }
}

function handleEditTraining(id) {
    console.log('Editing training data with ID:', id);
    try {
        const training = window.lansiaKomprehensifData.trainings.find(t => t.id === id);
        if (!training) {
            throw new Error('Data pelatihan tidak ditemukan');
        }
        document.getElementById('training-edit-id').value = id;
        document.getElementById('nama_training').value = training.nama_training;
        document.getElementById('tanggal_training').value = training.tanggal_training;
        document.getElementById('simpan-training-btn').textContent = 'Perbarui';
        document.getElementById('cancel-training-edit-btn').classList.remove('hidden');
        updateTabContent('training');
    } catch (error) {
        console.error('Error editing training data:', error);
        showNotification('Gagal mengedit data pelatihan: ' + error.message, 'error');
    }
}

function handleEditResearch(id) {
    console.log('Editing research data with ID:', id);
    try {
        const research = window.lansiaKomprehensifData.researches.find(r => r.id === id);
        if (!research) {
            throw new Error('Data penelitian tidak ditemukan');
        }
        document.getElementById('research-edit-id').value = id;
        document.getElementById('judul_penelitian').value = research.judul_penelitian;
        document.getElementById('ringkasan_penelitian').value = research.ringkasan_penelitian;
        document.getElementById('simpan-research-btn').textContent = 'Perbarui';
        document.getElementById('cancel-research-edit-btn').classList.remove('hidden');
        updateTabContent('research');
    } catch (error) {
        console.error('Error editing research data:', error);
        showNotification('Gagal mengedit data penelitian: ' + error.message, 'error');
    }
}

function resetPersonalForm() {
    document.getElementById('personal-form').reset();
    document.getElementById('edit-nik').value = '';
    document.getElementById('simpan-personal-btn').textContent = 'Simpan';
    document.getElementById('cancel-edit-btn').classList.add('hidden');
}

function resetHealthForm() {
    document.getElementById('health-form').reset();
    document.getElementById('health-edit-id').value = '';
    document.getElementById('simpan-health-btn').textContent = 'Tambah';
    document.getElementById('cancel-health-edit-btn').classList.add('hidden');
}

function resetFinanceForm() {
    document.getElementById('finance-form').reset();
    document.getElementById('finance-edit-id').value = '';
    document.getElementById('simpan-finance-btn').textContent = 'Tambah';
    document.getElementById('cancel-finance-edit-btn').classList.add('hidden');
}

function resetActivityForm() {
    document.getElementById('activity-form').reset();
    document.getElementById('activity-edit-id').value = '';
    document.getElementById('simpan-activity-btn').textContent = 'Tambah';
    document.getElementById('cancel-activity-edit-btn').classList.add('hidden');
}

function resetPolicyForm() {
    document.getElementById('policy-form').reset();
    document.getElementById('policy-edit-id').value = '';
    document.getElementById('simpan-policy-btn').textContent = 'Simpan';
    document.getElementById('cancel-policy-edit-btn').classList.add('hidden');
}

function resetRehabilitationForm() {
    document.getElementById('rehabilitation-form').reset();
    document.getElementById('rehabilitation-edit-id').value = '';
    document.getElementById('simpan-rehabilitation-btn').textContent = 'Simpan';
    document.getElementById('cancel-rehabilitation-edit-btn').classList.add('hidden');
}

function resetMonitoringForm() {
    document.getElementById('monitoring-form').reset();
    document.getElementById('monitoring-edit-id').value = '';
    document.getElementById('simpan-monitoring-btn').textContent = 'Simpan';
    document.getElementById('cancel-monitoring-edit-btn').classList.add('hidden');
}

function resetPartnershipForm() {
    document.getElementById('partnership-form').reset();
    document.getElementById('partnership-edit-id').value = '';
    document.getElementById('simpan-partnership-btn').textContent = 'Simpan';
    document.getElementById('cancel-partnership-edit-btn').classList.add('hidden');
}

function resetBalaiForm() {
    document.getElementById('balai-form').reset();
    document.getElementById('balai-edit-id').value = '';
    document.getElementById('simpan-balai-btn').textContent = 'Simpan';
    document.getElementById('cancel-balai-edit-btn').classList.add('hidden');
}

function resetDisasterForm() {
    document.getElementById('disaster-form').reset();
    document.getElementById('disaster-edit-id').value = '';
    document.getElementById('simpan-disaster-btn').textContent = 'Simpan';
    document.getElementById('cancel-disaster-edit-btn').classList.add('hidden');
}

function resetProductiveForm() {
    document.getElementById('productive-form').reset();
    document.getElementById('productive-edit-id').value = '';
    document.getElementById('simpan-productive-btn').textContent = 'Simpan';
    document.getElementById('cancel-productive-edit-btn').classList.add('hidden');
}

function resetAdvocacyForm() {
    document.getElementById('advocacy-form').reset();
    document.getElementById('advocacy-edit-id').value = '';
    document.getElementById('simpan-advocacy-btn').textContent = 'Simpan';
    document.getElementById('cancel-advocacy-edit-btn').classList.add('hidden');
}

function resetHlunForm() {
    document.getElementById('hlun-form').reset();
    document.getElementById('hlun-edit-id').value = '';
    document.getElementById('simpan-hlun-btn').textContent = 'Simpan';
    document.getElementById('cancel-hlun-edit-btn').classList.add('hidden');
}

function resetTrainingForm() {
    document.getElementById('training-form').reset();
    document.getElementById('training-edit-id').value = '';
    document.getElementById('simpan-training-btn').textContent = 'Simpan';
    document.getElementById('cancel-training-edit-btn').classList.add('hidden');
}

function resetResearchForm() {
    document.getElementById('research-form').reset();
    document.getElementById('research-edit-id').value = '';
    document.getElementById('simpan-research-btn').textContent = 'Simpan';
    document.getElementById('cancel-research-edit-btn').classList.add('hidden');
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}