const GAS_URL = 'https://script.google.com/macros/s/AKfycbySOy0DGZWfuTLBjPQlgau1VSgOlMf9fi9z_Sx1jJAQDbI_Uyu5WXDEhDHqYOVpZJSM/exec'; // Wajib ganti ini
let currentUser = null;
let jenisAbsen = '';
let lokasi = '';
let stream = null;

// PWA Force Install
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Paksa install kalau belum standalone
  if(!window.matchMedia('(display-mode: standalone)').matches) {
    setTimeout(() => {
      if(confirm('Aplikasi Absensi harus diinstall ke Home Screen untuk digunakan. Install sekarang?')) {
        deferredPrompt.prompt();
      }
    }, 1000);
  }
});

// Block akses kalau tidak PWA
window.addEventListener('load', () => {
  if(!window.matchMedia('(display-mode: standalone)').matches && !location.hostname.includes('localhost')) {
    document.body.innerHTML = '<div class="min-h-screen flex items-center justify-center p-4 bg-merah text-white text-center"><div><h1 class="text-2xl font-bold mb-4">Install Aplikasi Dulu</h1><p>Aplikasi ini hanya bisa digunakan setelah diinstall ke Home Screen</p></div></div>';
  }
});

// Jam & Tanggal Realtime
setInterval(() => {
  const now = new Date();
  document.getElementById('jamDigital').textContent = now.toLocaleTimeString('id-ID');
  document.getElementById('tanggal').textContent = now.toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  if(document.getElementById('kameraJam')) {
    document.getElementById('kameraJam').textContent = now.toLocaleString('id-ID');
  }
}, 1000);

// Ambil GPS
function getLokasi() {
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      lokasi = `${pos.coords.latitude}, ${pos.coords.longitude}`;
      document.getElementById('statusLokasi').textContent = '📍 Lokasi terkunci';
    }, err => {
      document.getElementById('statusLokasi').textContent = '📍 Gagal ambil lokasi';
    });
  }
}

async function login() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  const errEl = document.getElementById('loginError');
  
  if(!user || !pass) {
    errEl.textContent = 'Username dan password harus diisi';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(GAS_URL + '?action=login', {
      method: 'POST',
      body: JSON.stringify({username: user, password: pass})
    });
    const data = await res.json();
    
    if(data.status == 'success') {
      currentUser = data.data;
      localStorage.setItem('user', JSON.stringify(currentUser));
      document.getElementById('namaUser').textContent = currentUser.nama;
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('appPage').classList.remove('hidden');
      getLokasi();
      cekStatus();
    } else {
      throw new Error(data.message);
    }
  } catch(err) {
    errEl.textContent = err.message || 'Login gagal';
    errEl.classList.remove('hidden');
  }
}

async function cekStatus() {
  try {
    const res = await fetch(GAS_URL + '?action=cekStatus', {
      method: 'POST',
      body: JSON.stringify({username: currentUser.username})
    });
    const data = await res.json();
    
    if(data.status == 'success') {
      const s = data.data;
      if(s.sudahMasuk) {
        document.getElementById('btnMasuk').disabled = true;
        document.getElementById('btnMasuk').classList.remove('btn-hijau');
        document.getElementById('btnMasuk').classList.add('btn-disabled');
        document.getElementById('btnPulang').disabled = false;
        document.getElementById('btnPulang').classList.remove('btn-disabled');
        document.getElementById('btnPulang').classList.add('btn-hijau');
        document.getElementById('statusAbsen').textContent = 'Sudah Absen Masuk';
        document.getElementById('jamMasukText').textContent = s.jamMasuk;
      }
      if(s.sudahPulang) {
        document.getElementById('btnPulang').disabled = true;
        document.getElementById('btnPulang').classList.remove('btn-hijau');
        document.getElementById('btnPulang').classList.add('btn-disabled');
        document.getElementById('statusAbsen').textContent = 'Absen Hari Ini Selesai';
        document.getElementById('jamPulangText').textContent = s.jamPulang;
      }
    }
  } catch(err) {
    console.error('Cek status gagal:', err);
  }
}

async function openKamera(jenis) {
  jenisAbsen = jenis;
  document.getElementById('kameraInfo').textContent = jenis == 'masuk'? 'Absen Masuk' : 'Absen Pulang';
  document.getElementById('kameraModal').classList.remove('hidden');
  
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: 'user', width: {ideal: 1280}, height: {ideal: 720}}
    });
    document.getElementById('video').srcObject = stream;
  } catch(err) {
    alert('Tidak bisa akses kamera: ' + err.message);
    closeKamera();
  }
}

function closeKamera() {
  if(stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  document.getElementById('kameraModal').classList.add('hidden');
}

function takeSelfie() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  
  // Mirror effect untuk kamera depan
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
  
  // Watermark TimeMark style
  const now = new Date();
  const boxHeight = 100;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(currentUser.nama, 20, canvas.height - 65);
  ctx.font = '18px Arial';
  ctx.fillText(now.toLocaleDateString('id-ID', {weekday:'long', day:'2-digit', month:'long', year:'numeric'}), 20, canvas.height - 40);
  ctx.fillText(now.toLocaleTimeString('id-ID') + ' WIB', 20, canvas.height - 15);
  ctx.font = '14px Arial';
  ctx.fillText('📍 ' + lokasi, 20, canvas.height - 80);
  
  const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
  closeKamera();
  kirimAbsen(fotoBase64);
}

async function kirimAbsen(foto) {
  document.getElementById('loading').classList.remove('hidden');
  const action = jenisAbsen == 'masuk'? 'absenMasuk' : 'absenPulang';
  
  try {
    const res = await fetch(GAS_URL + '?action=' + action, {
      method: 'POST',
      body: JSON.stringify({
        username: currentUser.username,
        foto: foto,
        lokasi: lokasi
      })
    });
    const data = await res.json();
    
    if(data.status == 'success') {
      alert('Absen ' + jenisAbsen + ' berhasil jam ' + data.data.jam);
      cekStatus();
      setTimeout(() => showRekap(), 500);
    } else {
      throw new Error(data.message);
    }
  } catch(err) {
    alert('Gagal absen: ' + err.message);
  } finally {
    document.getElementById('loading').classList.add('hidden');
  }
}

function showRekap() {
  window.location.href = 'rekap.html';
}

function logout() {
  localStorage.removeItem('user');
  location.reload();
}

// Auto login kalau sudah ada session
window.addEventListener('DOMContentLoaded', () => {
  if(localStorage.getItem('user')) {
    currentUser = JSON.parse(localStorage.getItem('user'));
    document.getElementById('namaUser').textContent = currentUser.nama;
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appPage').classList.remove('hidden');
    getLokasi();
    cekStatus();
  }
});

// Register Service Worker
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
