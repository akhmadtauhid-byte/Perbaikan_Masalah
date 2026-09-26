// Peta Masalah Unit — SIMUTU-RS
// PENTING: ganti API_URL di bawah dengan Web App URL hasil deploy Apps Script.
const API_URL = 'GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT'; // <-- PLACEHOLDER: restore setiap update

let currentUser = null;
let masterUnit = [];
let masterKategori = [];

// ---------- Utilitas ----------

function apiGet(action, params) {
  const qs = new URLSearchParams(Object.assign({ action }, params || {})).toString();
  return fetch(`${API_URL}?${qs}`).then(r => r.json());
}

function apiPost(action, payload) {
  return fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(Object.assign({ action }, payload))
  }).then(r => r.json());
}

function badgeKelas(prioritas) {
  if (prioritas === 'Tinggi') return 'badge-tinggi';
  if (prioritas === 'Sedang') return 'badge-sedang';
  return 'badge-rendah';
}

function fmtTanggal(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function namaUnit(id) {
  const u = masterUnit.find(x => x.id_unit === id);
  return u ? u.nama_unit : id;
}

function namaKategori(id) {
  const k = masterKategori.find(x => x.id_kategori === id);
  return k ? `${k.kategori} — ${k.sub_kategori}` : id;
}

// ---------- Login ----------

document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('pin-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogin() {
  const pin = document.getElementById('pin-input').value.trim();
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  if (!pin) { errEl.textContent = 'Masukkan PIN'; return; }

  apiGet('login', { pin }).then(res => {
    if (!res.ok) {
      errEl.textContent = res.error || 'Login gagal';
      return;
    }
    currentUser = res.user;
    sessionStorage.setItem('pm_user', JSON.stringify(currentUser));
    masukKeApp();
  }).catch(() => { errEl.textContent = 'Gagal menghubungi server'; });
}

document.getElementById('btn-logout').addEventListener('click', () => {
  sessionStorage.removeItem('pm_user');
  currentUser = null;
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('pin-input').value = '';
});

function masukKeApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('user-info').textContent = `${currentUser.nama} — ${currentUser.role}`;
  loadMasterData().then(() => {
    loadDashboard();
    loadDaftarMasalah();
  });
}

// Auto-login jika ada sesi
(function initSession() {
  const saved = sessionStorage.getItem('pm_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    masukKeApp();
  }
})();

// ---------- Tabs ----------

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'dashboard') loadDashboard();
    if (btn.dataset.tab === 'daftar') loadDaftarMasalah();
  });
});

// ---------- Master Data ----------

function loadMasterData() {
  return apiGet('masterData').then(res => {
    if (!res.ok) return;
    masterUnit = res.unit;
    masterKategori = res.kategori;

    const isiSelect = (el, items, valKey, labelFn) => {
      el.innerHTML = el.querySelector('option') && el.querySelector('option').value === ''
        ? el.innerHTML // keep first "semua" option if exists
        : '';
      items.forEach(it => {
        const opt = document.createElement('option');
        opt.value = it[valKey];
        opt.textContent = labelFn(it);
        el.appendChild(opt);
      });
    };

    // filter selects (punya opsi "Semua ..." di awal, jangan dihapus)
    ['filter-unit'].forEach(id => {
      const el = document.getElementById(id);
      masterUnit.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id_unit;
        opt.textContent = u.nama_unit;
        el.appendChild(opt);
      });
    });
    const filterKat = document.getElementById('filter-kategori');
    masterKategori.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k.id_kategori;
      opt.textContent = `${k.kategori} — ${k.sub_kategori}`;
      filterKat.appendChild(opt);
    });

    // form lapor selects (tanpa opsi "Semua")
    const fUnit = document.getElementById('f-unit');
    fUnit.innerHTML = '';
    masterUnit.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id_unit;
      opt.textContent = u.nama_unit;
      fUnit.appendChild(opt);
    });
    const fKat = document.getElementById('f-kategori');
    fKat.innerHTML = '';
    masterKategori.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k.id_kategori;
      opt.textContent = `${k.kategori} — ${k.sub_kategori}`;
      fKat.appendChild(opt);
    });
  });
}

// ---------- Lapor Masalah ----------

document.getElementById('form-lapor').addEventListener('submit', e => {
  e.preventDefault();
  const msgEl = document.getElementById('lapor-msg');
  msgEl.textContent = 'Mengirim...';
  msgEl.style.color = '';

  const payload = {
    id_unit: document.getElementById('f-unit').value,
    id_pelapor: currentUser.id_user,
    id_kategori: document.getElementById('f-kategori').value,
    judul: document.getElementById('f-judul').value,
    deskripsi: document.getElementById('f-deskripsi').value,
    dampak: document.getElementById('f-dampak').value,
    frekuensi: document.getElementById('f-frekuensi').value,
    lampiran_url: document.getElementById('f-lampiran').value
  };

  apiPost('lapor', payload).then(res => {
    if (res.ok) {
      msgEl.style.color = '#1e8449';
      msgEl.textContent = `Laporan terkirim dengan ID ${res.id_masalah} (prioritas: ${res.prioritas}).`;
      document.getElementById('form-lapor').reset();
    } else {
      msgEl.style.color = '#c0392b';
      msgEl.textContent = res.error || 'Gagal mengirim laporan';
    }
  }).catch(() => {
    msgEl.style.color = '#c0392b';
    msgEl.textContent = 'Gagal menghubungi server';
  });
});

// ---------- Daftar Masalah ----------

document.getElementById('btn-refresh-daftar').addEventListener('click', loadDaftarMasalah);

function loadDaftarMasalah() {
  const params = {
    id_unit: document.getElementById('filter-unit').value,
    id_kategori: document.getElementById('filter-kategori').value,
    status: document.getElementById('filter-status').value,
    prioritas: document.getElementById('filter-prioritas').value
  };
  apiGet('listMasalah', params).then(res => {
    const wrap = document.getElementById('daftar-wrap');
    if (!res.ok || res.data.length === 0) {
      wrap.innerHTML = '<p>Tidak ada data.</p>';
      return;
    }
    let html = '<table><thead><tr><th>ID</th><th>Tanggal</th><th>Unit</th><th>Judul</th><th>Prioritas</th><th>Status</th></tr></thead><tbody>';
    res.data.forEach(m => {
      html += `<tr class="row-clickable" data-id="${m.id_masalah}">
        <td>${m.id_masalah}</td>
        <td>${fmtTanggal(m.tanggal_lapor)}</td>
        <td>${namaUnit(m.id_unit)}</td>
        <td>${m.judul}</td>
        <td><span class="badge ${badgeKelas(m.prioritas)}">${m.prioritas}</span></td>
        <td><span class="badge badge-status">${m.status}</span></td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
    wrap.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => bukaDetail(tr.dataset.id));
    });
  });
}

// ---------- Detail Masalah (Modal) ----------

function bukaDetail(idMasalah) {
  apiGet('detailMasalah', { id_masalah: idMasalah }).then(res => {
    if (!res.ok) { alert(res.error || 'Gagal memuat detail'); return; }
    renderDetail(res.masalah, res.rencana);
    document.getElementById('modal-detail').classList.remove('hidden');
  });
}

document.getElementById('btn-close-modal').addEventListener('click', () => {
  document.getElementById('modal-detail').classList.add('hidden');
});
document.getElementById('modal-detail').addEventListener('click', e => {
  if (e.target.id === 'modal-detail') e.currentTarget.classList.add('hidden');
});

function renderDetail(m, rencanaList) {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'pic_unit';
  let html = `
    <h2>${m.id_masalah}: ${m.judul}</h2>
    <div class="detail-row"><span class="detail-label">Unit</span><div class="detail-value">${namaUnit(m.id_unit)}</div></div>
    <div class="detail-row"><span class="detail-label">Kategori</span><div class="detail-value">${namaKategori(m.id_kategori)}</div></div>
    <div class="detail-row"><span class="detail-label">Deskripsi</span><div class="detail-value">${m.deskripsi}</div></div>
    <div class="detail-row"><span class="detail-label">Dampak / Frekuensi</span><div class="detail-value">${m.dampak} / ${m.frekuensi}</div></div>
    <div class="detail-row"><span class="detail-label">Prioritas</span><div class="detail-value"><span class="badge ${badgeKelas(m.prioritas)}">${m.prioritas}</span></div></div>
    <div class="detail-row"><span class="detail-label">Status</span><div class="detail-value"><span class="badge badge-status">${m.status}</span></div></div>
    ${m.lampiran_url ? `<div class="detail-row"><span class="detail-label">Lampiran</span><div class="detail-value"><a href="${m.lampiran_url}" target="_blank">Buka lampiran</a></div></div>` : ''}
    <div class="detail-row"><span class="detail-label">Akar Masalah (RCA)</span><div class="detail-value">${m.akar_masalah || '<em>Belum dianalisis</em>'}</div></div>
  `;

  if (isAdmin && m.status === 'Baru') {
    html += `<div class="mini-form"><button id="btn-verifikasi">Verifikasi Masalah Ini</button></div>`;
  }

  if (isAdmin && (m.status === 'Diverifikasi' || m.status === 'Dianalisis')) {
    html += `
      <div class="mini-form">
        <label class="detail-label">Isi Analisis Akar Masalah (RCA ringkas)</label>
        <textarea id="input-akar" rows="3" placeholder="Mis. 5 Why / fishbone ringkas">${m.akar_masalah || ''}</textarea>
        <button id="btn-simpan-akar">Simpan Analisis</button>
      </div>`;
  }

  html += `<h3>Rencana Perbaikan</h3>`;
  if (rencanaList.length === 0) {
    html += '<p><em>Belum ada rencana perbaikan.</em></p>';
  } else {
    rencanaList.forEach(r => {
      html += `
        <div class="rencana-item">
          <strong>${r.id_rencana}</strong> — ${r.aksi} <span class="badge badge-status">${r.jenis}</span><br>
          PIC: ${r.pic_aksi} · Target: ${fmtTanggal(r.target_selesai)} · Status: <strong>${r.status}</strong>
          ${isAdmin ? `
          <div>
            <select data-rencana-id="${r.id_rencana}" class="select-status-rencana">
              <option ${r.status === 'Direncanakan' ? 'selected' : ''}>Direncanakan</option>
              <option ${r.status === 'Berjalan' ? 'selected' : ''}>Berjalan</option>
              <option ${r.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
              <option ${r.status === 'Terlambat' ? 'selected' : ''}>Terlambat</option>
              <option ${r.status === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
            </select>
          </div>` : ''}
        </div>`;
    });
  }

  if (isAdmin && (m.status === 'Dianalisis' || m.status === 'Rencana Dibuat' || m.status === 'Dalam Perbaikan')) {
    html += `
      <div class="mini-form">
        <h4>Tambah Rencana Perbaikan</h4>
        <label class="detail-label">Aksi</label>
        <input type="text" id="input-aksi" placeholder="Deskripsi tindakan perbaikan">
        <label class="detail-label">Jenis</label>
        <select id="input-jenis">
          <option>Cepat (Quick Win)</option>
          <option>Korektif</option>
          <option>Preventif/Sistemik</option>
        </select>
        <label class="detail-label">PIC Pelaksana</label>
        <input type="text" id="input-pic">
        <label class="detail-label">Target Selesai</label>
        <input type="date" id="input-target">
        <button id="btn-tambah-rencana">Tambah Rencana</button>
      </div>`;
  }

  document.getElementById('modal-body').innerHTML = html;
  pasangEventDetail(m.id_masalah);
}

function pasangEventDetail(idMasalah) {
  const btnVerif = document.getElementById('btn-verifikasi');
  if (btnVerif) btnVerif.addEventListener('click', () => {
    apiPost('verifikasi', { id_masalah: idMasalah, id_verifikator: currentUser.id_user }).then(res => {
      if (res.ok) { bukaDetail(idMasalah); loadDaftarMasalah(); }
    });
  });

  const btnAkar = document.getElementById('btn-simpan-akar');
  if (btnAkar) btnAkar.addEventListener('click', () => {
    const akar = document.getElementById('input-akar').value.trim();
    if (!akar) return alert('Isi analisis dulu');
    apiPost('analisis', { id_masalah: idMasalah, akar_masalah: akar, id_user: currentUser.id_user }).then(res => {
      if (res.ok) { bukaDetail(idMasalah); loadDaftarMasalah(); }
    });
  });

  const btnTambahRencana = document.getElementById('btn-tambah-rencana');
  if (btnTambahRencana) btnTambahRencana.addEventListener('click', () => {
    const aksi = document.getElementById('input-aksi').value.trim();
    const target = document.getElementById('input-target').value;
    const pic = document.getElementById('input-pic').value.trim();
    if (!aksi || !target || !pic) return alert('Lengkapi aksi, PIC, dan target selesai');
    apiPost('buatRencana', {
      id_masalah: idMasalah,
      aksi, pic_aksi: pic, target_selesai: target,
      jenis: document.getElementById('input-jenis').value,
      dibuat_oleh: currentUser.id_user
    }).then(res => {
      if (res.ok) { bukaDetail(idMasalah); loadDaftarMasalah(); }
    });
  });

  document.querySelectorAll('.select-status-rencana').forEach(sel => {
    sel.addEventListener('change', () => {
      apiPost('updateStatusRencana', {
        id_rencana: sel.dataset.rencanaId,
        status: sel.value,
        id_user: currentUser.id_user
      }).then(res => {
        if (res.ok) { bukaDetail(idMasalah); loadDaftarMasalah(); loadDashboard(); }
      });
    });
  });
}

// ---------- Dashboard ----------

function loadDashboard() {
  apiGet('dashboard').then(res => {
    if (!res.ok) return;

    document.getElementById('stat-total-aktif').textContent = res.total_aktif;
    document.getElementById('stat-total-semua').textContent = res.total_masalah;
    document.getElementById('stat-terlambat').textContent = res.total_rencana_terlambat;
    const totalTinggi = Object.values(res.prioritas_tinggi_per_unit).reduce((a, b) => a + b, 0);
    document.getElementById('stat-prioritas-tinggi').textContent = totalTinggi;

    renderHeatmap(res.heatmap, res.kategori_kolom);
    renderStatusChart(res.ringkasan_status);
    renderTerlambat(res.rencana_terlambat);
  });
}

function warnaHeat(val, max) {
  if (val === 0) return 'background:#f4f6f8; color:#aab4bd;';
  const intensitas = Math.min(1, val / (max || 1));
  const alpha = 0.15 + intensitas * 0.65;
  return `background: rgba(192,57,43,${alpha.toFixed(2)}); color:${intensitas > 0.5 ? '#fff' : '#7a2418'};`;
}

function renderHeatmap(heatmap, kolom) {
  const wrap = document.getElementById('heatmap-wrap');
  if (!heatmap || heatmap.length === 0) { wrap.innerHTML = '<p>Belum ada data.</p>'; return; }
  const max = Math.max(1, ...heatmap.flatMap(r => kolom.map(k => r[k] || 0)));
  let html = '<table><thead><tr><th>Unit</th>';
  kolom.forEach(k => html += `<th>${k}</th>`);
  html += '<th>Total</th></tr></thead><tbody>';
  heatmap.forEach(r => {
    html += `<tr><td>${r.nama_unit}</td>`;
    kolom.forEach(k => {
      const v = r[k] || 0;
      html += `<td class="heat-cell" style="${warnaHeat(v, max)}">${v}</td>`;
    });
    html += `<td><strong>${r._total}</strong></td></tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function renderStatusChart(ringkasan) {
  const wrap = document.getElementById('status-chart');
  const entries = Object.entries(ringkasan);
  if (entries.length === 0) { wrap.innerHTML = '<p>Belum ada data.</p>'; return; }
  const max = Math.max(...entries.map(([, v]) => v));
  let html = '<table><tbody>';
  entries.forEach(([status, jumlah]) => {
    const widthPct = Math.round((jumlah / max) * 100);
    html += `<tr>
      <td style="width:160px">${status}</td>
      <td style="width:100%"><div style="background:#0b5cab; height:16px; border-radius:4px; width:${widthPct}%; min-width:4px;"></div></td>
      <td style="width:40px; text-align:right"><strong>${jumlah}</strong></td>
    </tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function renderTerlambat(list) {
  const wrap = document.getElementById('terlambat-wrap');
  if (!list || list.length === 0) { wrap.innerHTML = '<p>Tidak ada rencana yang terlambat. Baik!</p>'; return; }
  let html = '<table><thead><tr><th>ID Rencana</th><th>ID Masalah</th><th>Aksi</th><th>PIC</th><th>Target</th></tr></thead><tbody>';
  list.forEach(r => {
    html += `<tr><td>${r.id_rencana}</td><td>${r.id_masalah}</td><td>${r.aksi}</td><td>${r.pic_aksi}</td><td>${fmtTanggal(r.target_selesai)}</td></tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}
