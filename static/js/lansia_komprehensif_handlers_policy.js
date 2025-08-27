console.log('lansia_komprehensif_handlers_policy.js loaded at ' + new Date().toLocaleString());

// Fungsi untuk menghasilkan ID unik
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Fungsi untuk mencari koordinat
function cariKoordinat(address, button, latFieldId = 'latitude', lonFieldId = 'longitude') {
    if (!address) {
        showNotification('Masukkan alamat terlebih dahulu', 'error');
        return;
    }
    showLoading(true);
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Mencari...';
    fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
        body: JSON.stringify({ address })
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-map-marker-alt mr-2"></i> Cari Koordinat';
        if (data.error) {
            showNotification(data.message, 'error');
        } else {
            document.getElementById(latFieldId).value = data.lat;
            document.getElementById(lonFieldId).value = data.lon;
            showNotification(data.message, 'success');
        }
    })
    .catch(error => {
        showLoading(false);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-map-marker-alt mr-2"></i> Cari Koordinat';
        console.error('Error geocoding:', error);
        showNotification('Gagal melakukan geocoding: ' + error.message, 'error');
    });
}

// Fungsi untuk mengatur autocomplete alamat
function setupAutocomplete(fieldId, itemsId) {
    const input = document.getElementById(fieldId);
    const itemsContainer = document.getElementById(itemsId);
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
                headers: { 'X-Bypass-RBAC': 'true' }
            })
            .then(response => response.json())
            .then(data => {
                itemsContainer.innerHTML = '';
                if (data.features && data.features.length > 0) {
                    data.features.forEach(feature => {
                        const div = document.createElement('div');
                        div.textContent = feature.place_name;
                        div.addEventListener('click', () => {
                            input.value = feature.place_name;
                            itemsContainer.innerHTML = '';
                            itemsContainer.classList.add('hidden');
                            cariKoordinat(input.value, document.querySelector(`#${fieldId} ~ button`), fieldId === 'lokasi_sentra' ? 'latitude_sentra' : 'latitude_bencana', fieldId === 'lokasi_sentra' ? 'longitude_sentra' : 'longitude_bencana');
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

// Handler untuk form Kebijakan
function handlePolicyFormSubmit(event) {
    event.preventDefault();
    console.log('Handling policy form submit...');
    try {
        const editId = document.getElementById('policy-edit-id').value;
        const policyData = {
            id: editId || generateId(),
            judul_kebijakan: document.getElementById('judul_kebijakan').value,
            deskripsi_kebijakan: document.getElementById('deskripsi_kebijakan').value
        };

        if (!policyData.judul_kebijakan || !policyData.deskripsi_kebijakan) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.policies = window.lansiaKomprehensifData.policies.map(p => p.id === editId ? policyData : p);
        } else {
            window.lansiaKomprehensifData.policies.push(policyData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { policies: window.lansiaKomprehensifData.policies } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetPolicyForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving policy data:', error);
            showNotification('Gagal menyimpan data kebijakan: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling policy form submit:', error);
        showNotification('Gagal menyimpan data kebijakan: ' + error.message, 'error');
    }
}

// Handler untuk edit kebijakan
function handleEditPolicy(id) {
    console.log('Editing policy with ID:', id);
    try {
        const policy = window.lansiaKomprehensifData.policies.find(p => p.id === id);
        if (!policy) {
            throw new Error('Kebijakan tidak ditemukan');
        }
        document.getElementById('policy-edit-id').value = id;
        document.getElementById('judul_kebijakan').value = policy.judul_kebijakan;
        document.getElementById('deskripsi_kebijakan').value = policy.deskripsi_kebijakan;
        document.getElementById('simpan-policy-btn').textContent = 'Perbarui';
        document.getElementById('cancel-policy-edit-btn').classList.remove('hidden');
        updateTabContent('policy');
    } catch (error) {
        console.error('Error editing policy:', error);
        showNotification('Gagal mengedit data kebijakan: ' + error.message, 'error');
    }
}

// Handler untuk hapus kebijakan
function handleDeletePolicy(id) {
    console.log('Deleting policy with ID:', id);
    confirmDelete(id, 'policy');
}

// Handler untuk form Rehabilitasi
function handleRehabilitationFormSubmit(event) {
    event.preventDefault();
    console.log('Handling rehabilitation form submit...');
    try {
        const editId = document.getElementById('rehabilitation-edit-id').value;
        const rehabilitationData = {
            id: editId || generateId(),
            nama_balai: document.getElementById('nama_balai').value,
            layanan_balai: document.getElementById('layanan_balai').value
        };

        if (!rehabilitationData.nama_balai || !rehabilitationData.layanan_balai) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.rehabilitations = window.lansiaKomprehensifData.rehabilitations.map(r => r.id === editId ? rehabilitationData : r);
        } else {
            window.lansiaKomprehensifData.rehabilitations.push(rehabilitationData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { rehabilitations: window.lansiaKomprehensifData.rehabilitations } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetRehabilitationForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving rehabilitation data:', error);
            showNotification('Gagal menyimpan data rehabilitasi: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling rehabilitation form submit:', error);
        showNotification('Gagal menyimpan data rehabilitasi: ' + error.message, 'error');
    }
}

// Handler untuk edit rehabilitasi
function handleEditRehabilitation(id) {
    console.log('Editing rehabilitation with ID:', id);
    try {
        const rehabilitation = window.lansiaKomprehensifData.rehabilitations.find(r => r.id === id);
        if (!rehabilitation) {
            throw new Error('Rehabilitasi tidak ditemukan');
        }
        document.getElementById('rehabilitation-edit-id').value = id;
        document.getElementById('nama_balai').value = rehabilitation.nama_balai;
        document.getElementById('layanan_balai').value = rehabilitation.layanan_balai;
        document.getElementById('simpan-rehabilitation-btn').textContent = 'Perbarui';
        document.getElementById('cancel-rehabilitation-edit-btn').classList.remove('hidden');
        updateTabContent('rehabilitation');
    } catch (error) {
        console.error('Error editing rehabilitation:', error);
        showNotification('Gagal mengedit data rehabilitasi: ' + error.message, 'error');
    }
}

// Handler untuk hapus rehabilitasi
function handleDeleteRehabilitation(id) {
    console.log('Deleting rehabilitation with ID:', id);
    confirmDelete(id, 'rehabilitation');
}

// Handler untuk form Pemantauan
function handleMonitoringFormSubmit(event) {
    event.preventDefault();
    console.log('Handling monitoring form submit...');
    try {
        const editId = document.getElementById('monitoring-edit-id').value;
        const monitoringData = {
            id: editId || generateId(),
            nama_program: document.getElementById('nama_program').value,
            progres_program: document.getElementById('progres_program').value
        };

        if (!monitoringData.nama_program || !monitoringData.progres_program) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.monitorings = window.lansiaKomprehensifData.monitorings.map(m => m.id === editId ? monitoringData : m);
        } else {
            window.lansiaKomprehensifData.monitorings.push(monitoringData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { monitorings: window.lansiaKomprehensifData.monitorings } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetMonitoringForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving monitoring data:', error);
            showNotification('Gagal menyimpan data pemantauan: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling monitoring form submit:', error);
        showNotification('Gagal menyimpan data pemantauan: ' + error.message, 'error');
    }
}

// Handler untuk edit pemantauan
function handleEditMonitoring(id) {
    console.log('Editing monitoring with ID:', id);
    try {
        const monitoring = window.lansiaKomprehensifData.monitorings.find(m => m.id === id);
        if (!monitoring) {
            throw new Error('Pemantauan tidak ditemukan');
        }
        document.getElementById('monitoring-edit-id').value = id;
        document.getElementById('nama_program').value = monitoring.nama_program;
        document.getElementById('progres_program').value = monitoring.progres_program;
        document.getElementById('simpan-monitoring-btn').textContent = 'Perbarui';
        document.getElementById('cancel-monitoring-edit-btn').classList.remove('hidden');
        updateTabContent('monitoring');
    } catch (error) {
        console.error('Error editing monitoring:', error);
        showNotification('Gagal mengedit data pemantauan: ' + error.message, 'error');
    }
}

// Handler untuk hapus pemantauan
function handleDeleteMonitoring(id) {
    console.log('Deleting monitoring with ID:', id);
    confirmDelete(id, 'monitoring');
}

// Handler untuk form Kemitraan
function handlePartnershipFormSubmit(event) {
    event.preventDefault();
    console.log('Handling partnership form submit...');
    try {
        const editId = document.getElementById('partnership-edit-id').value;
        const partnershipData = {
            id: editId || generateId(),
            nama_mitra: document.getElementById('nama_mitra').value,
            kontak_mitra: document.getElementById('kontak_mitra').value
        };

        if (!partnershipData.nama_mitra || !partnershipData.kontak_mitra) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.partnerships = window.lansiaKomprehensifData.partnerships.map(p => p.id === editId ? partnershipData : p);
        } else {
            window.lansiaKomprehensifData.partnerships.push(partnershipData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { partnerships: window.lansiaKomprehensifData.partnerships } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetPartnershipForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving partnership data:', error);
            showNotification('Gagal menyimpan data kemitraan: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling partnership form submit:', error);
        showNotification('Gagal menyimpan data kemitraan: ' + error.message, 'error');
    }
}

// Handler untuk edit kemitraan
function handleEditPartnership(id) {
    console.log('Editing partnership with ID:', id);
    try {
        const partnership = window.lansiaKomprehensifData.partnerships.find(p => p.id === id);
        if (!partnership) {
            throw new Error('Kemitraan tidak ditemukan');
        }
        document.getElementById('partnership-edit-id').value = id;
        document.getElementById('nama_mitra').value = partnership.nama_mitra;
        document.getElementById('kontak_mitra').value = partnership.kontak_mitra;
        document.getElementById('simpan-partnership-btn').textContent = 'Perbarui';
        document.getElementById('cancel-partnership-edit-btn').classList.remove('hidden');
        updateTabContent('partnership');
    } catch (error) {
        console.error('Error editing partnership:', error);
        showNotification('Gagal mengedit data kemitraan: ' + error.message, 'error');
    }
}

// Handler untuk hapus kemitraan
function handleDeletePartnership(id) {
    console.log('Deleting partnership with ID:', id);
    confirmDelete(id, 'partnership');
}

// Handler untuk form Sentra (Balai)
function handleSentraFormSubmit(event) {
    event.preventDefault();
    console.log('Handling sentra form submit...');
    try {
        const editId = document.getElementById('balai-edit-id').value;
        const sentraData = {
            id: editId || generateId(),
            nama_sentra: document.getElementById('nama_sentra').value,
            lokasi_sentra: document.getElementById('lokasi_sentra').value,
            koordinat: [
                parseFloat(document.getElementById('longitude_sentra').value) || 0,
                parseFloat(document.getElementById('latitude_sentra').value) || 0
            ],
            layanan_sentra: document.getElementById('layanan_sentra').value
        };

        if (!sentraData.nama_sentra || !sentraData.lokasi_sentra || !sentraData.layanan_sentra) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.balai = window.lansiaKomprehensifData.balai.map(b => b.id === editId ? sentraData : b);
        } else {
            window.lansiaKomprehensifData.balai.push(sentraData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { balai: window.lansiaKomprehensifData.balai } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetSentraForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving sentra data:', error);
            showNotification('Gagal menyimpan data sentra: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling sentra form submit:', error);
        showNotification('Gagal menyimpan data sentra: ' + error.message, 'error');
    }
}

// Handler untuk edit sentra
function handleEditSentra(id) {
    console.log('Editing sentra with ID:', id);
    try {
        const sentra = window.lansiaKomprehensifData.balai.find(b => b.id === id);
        if (!sentra) {
            throw new Error('Sentra tidak ditemukan');
        }
        document.getElementById('balai-edit-id').value = id;
        document.getElementById('nama_sentra').value = sentra.nama_sentra;
        document.getElementById('lokasi_sentra').value = sentra.lokasi_sentra;
        document.getElementById('latitude_sentra').value = sentra.koordinat[1];
        document.getElementById('longitude_sentra').value = sentra.koordinat[0];
        document.getElementById('layanan_sentra').value = sentra.layanan_sentra;
        document.getElementById('simpan-balai-btn').textContent = 'Perbarui';
        document.getElementById('cancel-balai-edit-btn').classList.remove('hidden');
        updateTabContent('balai');
    } catch (error) {
        console.error('Error editing sentra:', error);
        showNotification('Gagal mengedit data sentra: ' + error.message, 'error');
    }
}

// Handler untuk hapus sentra
function handleDeleteSentra(id) {
    console.log('Deleting sentra with ID:', id);
    confirmDelete(id, 'balai');
}

// Handler untuk form Bencana
function handleDisasterFormSubmit(event) {
    event.preventDefault();
    console.log('Handling disaster form submit...');
    try {
        const editId = document.getElementById('disaster-edit-id').value;
        const disasterData = {
            id: editId || generateId(),
            kejadian_bencana: document.getElementById('kejadian_bencana').value,
            lokasi_bencana: document.getElementById('lokasi_bencana').value,
            koordinat: [
                parseFloat(document.getElementById('longitude_bencana').value) || 0,
                parseFloat(document.getElementById('latitude_bencana').value) || 0
            ],
            kebutuhan_bencana: document.getElementById('kebutuhan_bencana').value
        };

        if (!disasterData.kejadian_bencana || !disasterData.lokasi_bencana || !disasterData.kebutuhan_bencana) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.disasters = window.lansiaKomprehensifData.disasters.map(d => d.id === editId ? disasterData : d);
        } else {
            window.lansiaKomprehensifData.disasters.push(disasterData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { disasters: window.lansiaKomprehensifData.disasters } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetDisasterForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving disaster data:', error);
            showNotification('Gagal menyimpan data bencana: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling disaster form submit:', error);
        showNotification('Gagal menyimpan data bencana: ' + error.message, 'error');
    }
}

// Handler untuk edit bencana
function handleEditDisaster(id) {
    console.log('Editing disaster with ID:', id);
    try {
        const disaster = window.lansiaKomprehensifData.disasters.find(d => d.id === id);
        if (!disaster) {
            throw new Error('Bencana tidak ditemukan');
        }
        document.getElementById('disaster-edit-id').value = id;
        document.getElementById('kejadian_bencana').value = disaster.kejadian_bencana;
        document.getElementById('lokasi_bencana').value = disaster.lokasi_bencana;
        document.getElementById('latitude_bencana').value = disaster.koordinat[1];
        document.getElementById('longitude_bencana').value = disaster.koordinat[0];
        document.getElementById('kebutuhan_bencana').value = disaster.kebutuhan_bencana;
        document.getElementById('simpan-disaster-btn').textContent = 'Perbarui';
        document.getElementById('cancel-disaster-edit-btn').classList.remove('hidden');
        updateTabContent('disaster');
    } catch (error) {
        console.error('Error editing disaster:', error);
        showNotification('Gagal mengedit data bencana: ' + error.message, 'error');
    }
}

// Handler untuk hapus bencana
function handleDeleteDisaster(id) {
    console.log('Deleting disaster with ID:', id);
    confirmDelete(id, 'disaster');
}

// Handler untuk form Lansia Produktif
function handleProductiveFormSubmit(event) {
    event.preventDefault();
    console.log('Handling productive form submit...');
    try {
        const editId = document.getElementById('productive-edit-id').value;
        const productiveData = {
            id: editId || generateId(),
            nama_pelatihan: document.getElementById('nama_pelatihan').value,
            tanggal_pelatihan: document.getElementById('tanggal_pelatihan').value
        };

        if (!productiveData.nama_pelatihan || !productiveData.tanggal_pelatihan) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.productives = window.lansiaKomprehensifData.productives.map(p => p.id === editId ? productiveData : p);
        } else {
            window.lansiaKomprehensifData.productives.push(productiveData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { productives: window.lansiaKomprehensifData.productives } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetProductiveForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving productive data:', error);
            showNotification('Gagal menyimpan data lansia produktif: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling productive form submit:', error);
        showNotification('Gagal menyimpan data lansia produktif: ' + error.message, 'error');
    }
}

// Handler untuk edit lansia produktif
function handleEditProductive(id) {
    console.log('Editing productive with ID:', id);
    try {
        const productive = window.lansiaKomprehensifData.productives.find(p => p.id === id);
        if (!productive) {
            throw new Error('Lansia produktif tidak ditemukan');
        }
        document.getElementById('productive-edit-id').value = id;
        document.getElementById('nama_pelatihan').value = productive.nama_pelatihan;
        document.getElementById('tanggal_pelatihan').value = productive.tanggal_pelatihan;
        document.getElementById('simpan-productive-btn').textContent = 'Perbarui';
        document.getElementById('cancel-productive-edit-btn').classList.remove('hidden');
        updateTabContent('productive');
    } catch (error) {
        console.error('Error editing productive:', error);
        showNotification('Gagal mengedit data lansia produktif: ' + error.message, 'error');
    }
}

// Handler untuk hapus lansia produktif
function handleDeleteProductive(id) {
    console.log('Deleting productive with ID:', id);
    confirmDelete(id, 'productive');
}

// Handler untuk form Advokasi
function handleAdvocacyFormSubmit(event) {
    event.preventDefault();
    console.log('Handling advocacy form submit...');
    try {
        const editId = document.getElementById('advocacy-edit-id').value;
        const advocacyData = {
            id: editId || generateId(),
            nama_kampanye: document.getElementById('nama_kampanye').value,
            jadwal_kampanye: document.getElementById('jadwal_kampanye').value
        };

        if (!advocacyData.nama_kampanye || !advocacyData.jadwal_kampanye) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.advocacies = window.lansiaKomprehensifData.advocacies.map(a => a.id === editId ? advocacyData : a);
        } else {
            window.lansiaKomprehensifData.advocacies.push(advocacyData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { advocacies: window.lansiaKomprehensifData.advocacies } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetAdvocacyForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving advocacy data:', error);
            showNotification('Gagal menyimpan data advokasi: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling advocacy form submit:', error);
        showNotification('Gagal menyimpan data advokasi: ' + error.message, 'error');
    }
}

// Handler untuk edit advokasi
function handleEditAdvocacy(id) {
    console.log('Editing advocacy with ID:', id);
    try {
        const advocacy = window.lansiaKomprehensifData.advocacies.find(a => a.id === id);
        if (!advocacy) {
            throw new Error('Advokasi tidak ditemukan');
        }
        document.getElementById('advocacy-edit-id').value = id;
        document.getElementById('nama_kampanye').value = advocacy.nama_kampanye;
        document.getElementById('jadwal_kampanye').value = advocacy.jadwal_kampanye;
        document.getElementById('simpan-advocacy-btn').textContent = 'Perbarui';
        document.getElementById('cancel-advocacy-edit-btn').classList.remove('hidden');
        updateTabContent('advocacy');
    } catch (error) {
        console.error('Error editing advocacy:', error);
        showNotification('Gagal mengedit data advokasi: ' + error.message, 'error');
    }
}

// Handler untuk hapus advokasi
function handleDeleteAdvocacy(id) {
    console.log('Deleting advocacy with ID:', id);
    confirmDelete(id, 'advocacy');
}

// Handler untuk form HLUN
function handleHlunFormSubmit(event) {
    event.preventDefault();
    console.log('Handling HLUN form submit...');
    try {
        const editId = document.getElementById('hlun-edit-id').value;
        const hlunData = {
            id: editId || generateId(),
            nama_hlun: document.getElementById('nama_hlun').value,
            tanggal_hlun: document.getElementById('tanggal_hlun').value
        };

        if (!hlunData.nama_hlun || !hlunData.tanggal_hlun) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.hluns = window.lansiaKomprehensifData.hluns.map(h => h.id === editId ? hlunData : h);
        } else {
            window.lansiaKomprehensifData.hluns.push(hlunData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { hluns: window.lansiaKomprehensifData.hluns } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetHlunForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving hlun data:', error);
            showNotification('Gagal menyimpan data HLUN: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling HLUN form submit:', error);
        showNotification('Gagal menyimpan data HLUN: ' + error.message, 'error');
    }
}

// Handler untuk edit HLUN
function handleEditHlun(id) {
    console.log('Editing HLUN with ID:', id);
    try {
        const hlun = window.lansiaKomprehensifData.hluns.find(h => h.id === id);
        if (!hlun) {
            throw new Error('HLUN tidak ditemukan');
        }
        document.getElementById('hlun-edit-id').value = id;
        document.getElementById('nama_hlun').value = hlun.nama_hlun;
        document.getElementById('tanggal_hlun').value = hlun.tanggal_hlun;
        document.getElementById('simpan-hlun-btn').textContent = 'Perbarui';
        document.getElementById('cancel-hlun-edit-btn').classList.remove('hidden');
        updateTabContent('hlun');
    } catch (error) {
        console.error('Error editing HLUN:', error);
        showNotification('Gagal mengedit data HLUN: ' + error.message, 'error');
    }
}

// Handler untuk hapus HLUN
function handleDeleteHlun(id) {
    console.log('Deleting HLUN with ID:', id);
    confirmDelete(id, 'hlun');
}

// Handler untuk form Pelatihan
function handleTrainingFormSubmit(event) {
    event.preventDefault();
    console.log('Handling training form submit...');
    try {
        const editId = document.getElementById('training-edit-id').value;
        const trainingData = {
            id: editId || generateId(),
            nama_training: document.getElementById('nama_training').value,
            tanggal_training: document.getElementById('tanggal_training').value
        };

        if (!trainingData.nama_training || !trainingData.tanggal_training) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.trainings = window.lansiaKomprehensifData.trainings.map(t => t.id === editId ? trainingData : t);
        } else {
            window.lansiaKomprehensifData.trainings.push(trainingData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { trainings: window.lansiaKomprehensifData.trainings } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetTrainingForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving training data:', error);
            showNotification('Gagal menyimpan data pelatihan: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling training form submit:', error);
        showNotification('Gagal menyimpan data pelatihan: ' + error.message, 'error');
    }
}

// Handler untuk edit pelatihan
function handleEditTraining(id) {
    console.log('Editing training with ID:', id);
    try {
        const training = window.lansiaKomprehensifData.trainings.find(t => t.id === id);
        if (!training) {
            throw new Error('Pelatihan tidak ditemukan');
        }
        document.getElementById('training-edit-id').value = id;
        document.getElementById('nama_training').value = training.nama_training;
        document.getElementById('tanggal_training').value = training.tanggal_training;
        document.getElementById('simpan-training-btn').textContent = 'Perbarui';
        document.getElementById('cancel-training-edit-btn').classList.remove('hidden');
        updateTabContent('training');
    } catch (error) {
        console.error('Error editing training:', error);
        showNotification('Gagal mengedit data pelatihan: ' + error.message, 'error');
    }
}

// Handler untuk hapus pelatihan
function handleDeleteTraining(id) {
    console.log('Deleting training with ID:', id);
    confirmDelete(id, 'training');
}

// Handler untuk form Penelitian
function handleResearchFormSubmit(event) {
    event.preventDefault();
    console.log('Handling research form submit...');
    try {
        const editId = document.getElementById('research-edit-id').value;
        const researchData = {
            id: editId || generateId(),
            judul_penelitian: document.getElementById('judul_penelitian').value,
            ringkasan_penelitian: document.getElementById('ringkasan_penelitian').value
        };

        if (!researchData.judul_penelitian || !researchData.ringkasan_penelitian) {
            throw new Error('Semua kolom wajib diisi');
        }

        if (editId) {
            window.lansiaKomprehensifData.researches = window.lansiaKomprehensifData.researches.map(r => r.id === editId ? researchData : r);
        } else {
            window.lansiaKomprehensifData.researches.push(researchData);
        }
        showLoading(true);
        fetch('/api/lansia_komprehensif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bypass-RBAC': 'true' },
            body: JSON.stringify({ data: { researches: window.lansiaKomprehensifData.researches } }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(data.message, 'success');
                resetResearchForm();
                loadData();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error saving research data:', error);
            showNotification('Gagal menyimpan data penelitian: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error handling research form submit:', error);
        showNotification('Gagal menyimpan data penelitian: ' + error.message, 'error');
    }
}

// Handler untuk edit penelitian
function handleEditResearch(id) {
    console.log('Editing research with ID:', id);
    try {
        const research = window.lansiaKomprehensifData.researches.find(r => r.id === id);
        if (!research) {
            throw new Error('Penelitian tidak ditemukan');
        }
        document.getElementById('research-edit-id').value = id;
        document.getElementById('judul_penelitian').value = research.judul_penelitian;
        document.getElementById('ringkasan_penelitian').value = research.ringkasan_penelitian;
        document.getElementById('simpan-research-btn').textContent = 'Perbarui';
        document.getElementById('cancel-research-edit-btn').classList.remove('hidden');
        updateTabContent('research');
    } catch (error) {
        console.error('Error editing research:', error);
        showNotification('Gagal mengedit data penelitian: ' + error.message, 'error');
    }
}

// Handler untuk hapus penelitian
function handleDeleteResearch(id) {
    console.log('Deleting research with ID:', id);
    confirmDelete(id, 'research');
}

// Fungsi untuk mereset form
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

function resetSentraForm() {
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

// Inisialisasi saat dokumen dimuat
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded, setting up autocomplete for sentra and bencana...');
    setupAutocomplete('lokasi_sentra', 'autocomplete-items-sentra');
    setupAutocomplete('lokasi_bencana', 'autocomplete-items-bencana');
});