// ============================================
// KONFIGURASI & VARIABEL GLOBAL
// ============================================
const URL_GAS = 'https://script.google.com/macros/s/AKfycbySOy0DGZWfuTLBjPQlgau1VSgOlMf9fi9z_Sx1jJAQDbI_Uyu5WXDEhDHqYOVpZJSM/exec';
console.log('App.js loaded - v3 WITH LOKASI KERJA');

let user = JSON.parse(localStorage.getItem('user') || 'null');
let isDark = localStorage.getItem('dark') === 'true';
let currentType = '';
let currentCamMode = '';
let modalAsal = '';
let stream = null;
let animationFrame = null;
let currentLocation = { lat: 0, long: 0, alamat: 'Mencari sinyal GPS...' };
let currentPage = 'home';
let statusServer = {};
let dataRekap = [];
let dataPatroli = [];
let dataKejadian = [];
let dataPembinaan = [];
let selectedMonth = '';

// === VARIABEL LOKASI KERJA ===
let daftarLokasiKerja = [];
let lokasiKerjaDipilih = localStorage.getItem('lokasiKerjaDipilih') || '';
let tanggalLokasiKerja = localStorage.getItem('tanggalLokasiKerja') || '';
const todayString = new Date().toDateString();

// ============================================
// PWA INSTALL UNIVERSAL
// ============================================
let deferredPrompt;
const installPopup = document.getElementById('installPopup');
const btnAndroid = document.getElementById('btnInstallAndroid');
const btnIOS = document.getElementById('btnIOS');
const iosSteps = document.getElementById('iosSteps');

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isInStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isInStandalone()) {
    installPopup.classList.remove('hidden');
    installPopup.classList.add('flex');
    btnAndroid.classList.remove('hidden');
  }
});

btnAndroid?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installPopup.classList.add('hidden');
});

if (isIOS && !isInStandalone()) {
  installPopup.classList.remove('hidden');
  installPopup.classList.add('flex');
  if (btnIOS) btnIOS.classList.remove('hidden');
}

btnIOS?.addEventListener('click', () => {
  if (iosSteps) iosSteps.classList.toggle('hidden');
  if (btnIOS) {
    btnIOS.innerHTML = iosSteps.classList.contains('hidden')
      ? '<i class="fa-solid fa-share-from-square mr-2"></i>Lihat Cara Install'
      : '<i class="fa-solid fa-check mr-2"></i>Sudah Install? Buka dari Home';
  }
});

if (isInStandalone() && installPopup) installPopup.classList.add('hidden');

// ============================================
// INIT APP
// ============================================
const app = document.getElementById('app');
if (!app) console.error('❌ Div #app tidak ditemukan!');
if (isDark) document.documentElement.classList.add('dark');

function render() {
  if (!user) return renderLogin();
  renderDashboard();
}

// ============================================
// LOGIN & AUTH
// ============================================
function renderLogin() {
  app.innerHTML = `
  <div class="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-800 to-red-900">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
      <div class="text-center mb-6">
        <div class="bg-red-800 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 shadow-lg">
          <i class="fa-solid fa-fingerprint text-white text-2xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-red-800 dark:text-white">Absensi Karyawan</h1>
        <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">Silakan login untuk absen</p>
      </div>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <input id="username" placeholder="Masukkan username" class="w-full p-3 border border-gray-300 rounded-lg mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-red-800 outline-none">
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <div class="relative mt-1">
            <input id="password" type="password" placeholder="Masukkan password" class="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-red-800 outline-none">
            <i id="eyeIcon" onclick="togglePass()" class="fa-solid fa-eye absolute right-3 top-4 cursor-pointer text-gray-400 hover:text-red-800"></i>
          </div>
        </div>
        <button onclick="login()" id="btnLogin" class="w-full bg-red-800 hover:bg-red-900 text-white p-3 rounded-lg font-bold transition shadow-lg">
          <i class="fa-solid fa-right-to-bracket mr-2"></i>Masuk
        </button>
      </div>
    </div>
  </div>`;
}

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) return toast('Username & password wajib diisi');
  
  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Memproses...';
  
  try {
    const res = await api('login', { username, password });
    if (res.status === 'success') {
      user = res;
      localStorage.setItem('user', JSON.stringify(user));
      render();
    } else {
      toast(res.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-2"></i>Masuk';
    }
  } catch (err) {
    toast('Koneksi gagal: ' + err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-2"></i>Masuk';
  }
}

function logout() {
  if (confirm('Yakin mau logout?')) {
    localStorage.removeItem('user');
    user = null;
    currentPage = 'home';
    render();
  }
}

function togglePass() {
  const p = document.getElementById('password');
  const icon = document.getElementById('eyeIcon');
  if (p.type === 'password') {
    p.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    p.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function toggleDark() {
  isDark = !isDark;
  localStorage.setItem('dark', isDark);
  document.documentElement.classList.toggle('dark');
  document.getElementById('darkIcon').className = `fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-xl`;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm z-[999]';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ============================================
// DASHBOARD & NAVIGATION
// ============================================
function renderDashboard() {
  app.innerHTML = `
  <nav class="bg-red-800 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-10">
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-user-shield text-xl"></i>
      <div>
        <h1 class="font-bold text-lg leading-tight">Hi, ${user.nama}</h1>
        <p class="text-xs opacity-80">${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
    <div class="flex gap-3 items-center">
      <button onclick="toggleDark()" class="hover:bg-red-900 p-2 rounded-lg transition">
        <i id="darkIcon" class="fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-xl"></i>
      </button>
      <button onclick="openProfil()" class="flex items-center gap-2 hover:bg-red-900 p-1 pr-3 rounded-full transition">
        <img id="avatarNav" src="${user.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.nama) + '&background=800000&color=fff'}"
             class="w-9 h-9 rounded-full object-cover border-2 border-white">
      </button>
    </div>
  </nav>

  <div id="contentArea" class="p-4 max-w-2xl mx-auto pb-32">
    ${renderPage()}
  </div>

  <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-lg z-20">
  <div class="grid grid-cols-5 gap-1 max-w-2xl mx-auto">
    <button onclick="switchPage('home')" class="flex flex-col items-center py-2 ${currentPage === 'home' ? 'text-red-800' : 'text-gray-500'}">
      <i class="fa-solid fa-house text-xl mb-1"></i>
      <span class="text-xs font-semibold">Home</span>
    </button>
    <button onclick="switchPage('rekap')" class="flex flex-col items-center py-2 ${currentPage === 'rekap' ? 'text-red-800' : 'text-gray-500'}">
      <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-rekap.png" class="w-6 h-6 mb-1 ${currentPage === 'rekap' ? '' : 'opacity-50'}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <i class="fa-solid fa-table text-xl mb-1 hidden"></i>
      <span class="text-xs font-semibold">Rekap</span>
    </button>
    <button onclick="switchPage('patroli')" class="flex flex-col items-center py-2 ${currentPage === 'patroli' ? 'text-red-800' : 'text-gray-500'}">
      <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-patroli.png" class="w-6 h-6 mb-1 ${currentPage === 'patroli' ? '' : 'opacity-50'}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <i class="fa-solid fa-route text-xl mb-1 hidden"></i>
      <span class="text-xs font-semibold">Patroli</span>
    </button>
    <button onclick="switchPage('kejadian')" class="flex flex-col items-center py-2 ${currentPage === 'kejadian' ? 'text-red-800' : 'text-gray-500'}">
      <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-kejadian.png" class="w-6 h-6 mb-1 ${currentPage === 'kejadian' ? '' : 'opacity-50'}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <i class="fa-solid fa-triangle-exclamation text-xl mb-1 hidden"></i>
      <span class="text-xs font-semibold">Kejadian</span>
    </button>
    <button onclick="switchPage('pembinaan')" class="flex flex-col items-center py-2 ${currentPage === 'pembinaan' ? 'text-red-800' : 'text-gray-500'}">
      <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-pembinaan.png" class="w-6 h-6 mb-1 ${currentPage === 'pembinaan' ? '' : 'opacity-50'}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <i class="fa-solid fa-user-graduate text-xl mb-1 hidden"></i>
      <span class="text-xs font-semibold">Pembinaan</span>
    </button>
  </div>
</div>
  ${renderModals()}
  `;

  if (currentPage === 'home') {
    cekStatus();
    dapatkanLokasiGPS();
    if (daftarLokasiKerja.length === 0) {
      api('getLokasiKerja', {}).then(res => {
        if (res.status === 'success') daftarLokasiKerja = res.data;
      });
    }
  }
  if (currentPage === 'rekap') loadRekap();
  if (currentPage === 'patroli') loadPatroli();
  if (currentPage === 'kejadian') loadKejadian();
  if (currentPage === 'pembinaan') loadPembinaan();
}

function renderModals() {
  return `
  <!-- MODAL KAMERA -->
  <div id="modalCam" class="fixed inset-0 bg-black/90 hidden items-center justify-center p-4 z-[70]">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-md">
      <h3 class="font-bold text-lg mb-3 text-red-800 dark:text-white text-center">
        <i class="fa-solid fa-camera mr-2"></i><span id="judulKamera">Ambil Foto</span>
      </h3>
      <div style="position:relative">
        <video id="video" class="w-full rounded-lg bg-black" autoplay playsinline></video>
        <canvas id="canvas" class="hidden w-full rounded-lg"></canvas>
        <div id="timemarkPreview" class="absolute bottom-2 left-2 bg-black/70 border-l-4 border-red-800 px-3 py-2 rounded text-white text-sm font-semibold z-10 space-y-0.5">
          <div id="previewHari"></div>
          <div id="previewJam" class="text-yellow-400 font-bold text-xs"></div>
          <div id="previewNama" class="text-white opacity-90"></div>
          <div id="previewGps" class="text-green-400 font-mono"></div>
        </div>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Pastikan objek terlihat jelas</p>
      <div class="flex gap-2 mt-4">
        <button onclick="capture()" id="btnCapture" class="flex-1 bg-red-800 hover:bg-red-900 text-white p-3 rounded-lg font-bold transition">
          <i class="fa-solid fa-camera mr-1"></i>Ambil Foto
        </button>
        <button onclick="closeCam()" class="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-lg transition">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL PROFIL -->
  <div id="modalProfil" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
      <div class="bg-red-800 px-5 pt-8 pb-6 relative">
        <button onclick="closeProfil()" class="absolute top-3 right-3 bg-white/95 hover:bg-white text-red-800 w-9 h-9 rounded-full transition flex items-center justify-center z-20">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="text-center">
          <div class="relative inline-block mb-3">
            <img id="fotoProfil" src="${user.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.nama) + '&background=fff&color=800000&size=256'}" class="w-24 h-24 rounded-2xl object-cover mx-auto border-4 border-white shadow-2xl">
            <button onclick="gantiFotoProfil()" class="absolute -bottom-1 -right-1 bg-white text-red-800 w-9 h-9 rounded-xl shadow-xl flex items-center justify-center"><i class="fa-solid fa-camera"></i></button>
          </div>
          <h3 class="font-extrabold text-xl text-white mb-1">${user.nama}</h3>
          <p class="text-sm text-white/90 font-medium">@${user.username}</p>
        </div>
      </div>
      <div class="p-4 space-y-2">
        <button onclick="openEditProfil()" class="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition">
          <div class="w-12 h-12 bg-red-800/10 text-red-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-user-pen"></i></div>
          <div class="text-left flex-1"><p class="font-bold text-sm text-gray-900 dark:text-white">Edit Profil</p></div>
          <i class="fa-solid fa-chevron-right text-gray-400"></i>
        </button>
        <button onclick="openGantiPassword()" class="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition">
          <div class="w-12 h-12 bg-red-800/10 text-red-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-key"></i></div>
          <div class="text-left flex-1"><p class="font-bold text-sm text-gray-900 dark:text-white">Ganti Password</p></div>
          <i class="fa-solid fa-chevron-right text-gray-400"></i>
        </button>
        <button onclick="logout()" class="w-full flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl transition">
          <div class="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center"><i class="fa-solid fa-right-from-bracket"></i></div>
          <div class="text-left flex-1"><p class="font-bold text-sm text-red-600">Logout</p></div>
          <i class="fa-solid fa-chevron-right text-gray-400"></i>
        </button>
      </div>
      <input type="file" id="inputFotoProfil" accept="image/*" class="hidden" onchange="uploadFotoProfil(event)">
    </div>
  </div>

  <!-- MODAL EDIT PROFIL -->
  <div id="modalEditProfil" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between">
        <h3 class="font-bold text-lg text-white">Edit Profil</h3>
        <button onclick="closeEditProfil()"><i class="fa-solid fa-xmark text-xl text-white"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Nama Lengkap</label><input id="editNama" value="${user.nama || ''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">No KTP</label><input id="editKtp" value="${user.ktp || ''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">No HP</label><input id="editHp" value="${user.hp || ''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Alamat</label><textarea id="editAlamat" rows="2" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white">${user.alamat || ''}</textarea></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Tempat, Tgl Lahir</label><input id="editTtl" value="${user.ttl || ''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs font-bold text-red-800 block mb-1">Bank</label><input id="editBank" value="${user.bank || ''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
          <div><label class="text-xs font-bold text-red-800 block mb-1">No Rekening</label><input id="editRek" value="${user.rekening || ''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        </div>
      </div>
      <div class="p-4"><button onclick="simpanProfil()" id="btnSimpanProfil" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Simpan</button></div>
    </div>
  </div>

  <!-- MODAL GANTI PASSWORD -->
  <div id="modalGantiPassword" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
      <div class="bg-red-800 px-5 py-4 flex items-center justify-between">
        <h3 class="font-bold text-lg text-white">Ganti Password</h3>
        <button onclick="closeGantiPassword()"><i class="fa-solid fa-xmark text-xl text-white"></i></button>
      </div>
      <div class="p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Password Lama</label><input id="passLama" type="password" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm outline-none focus:border-red-800 dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Password Baru</label><input id="passBaru" type="password" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm outline-none focus:border-red-800 dark:text-white"></div>
        <button onclick="gantiPassword()" id="btnGantiPass" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Update</button>
      </div>
    </div>
  </div>

  <!-- MODAL INPUT PATROLI -->
  <div id="modalPatroli" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between">
        <h3 class="font-bold text-lg text-white">Input Patroli</h3>
        <button onclick="closeFormPatroli()"><i class="fa-solid fa-xmark text-xl text-white"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Lokasi Patroli</label><input id="patroliLokasi" placeholder="Contoh: Pos 1, Lantai 2" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Keterangan</label><textarea id="patroliKet" rows="3" placeholder="Situasi aman, dll" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white"></textarea></div>
        <div>
          <label class="text-xs font-bold text-red-800 block mb-1">Foto Bukti Wajib</label>
          <div id="previewPatroli" class="w-full h-40 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
            <div class="text-center text-gray-400">
              <i class="fa-solid fa-camera text-3xl mb-1"></i>
              <p class="text-xs">Belum ada foto</p>
            </div>
          </div>
          <button onclick="bukaKameraPatroli()" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-sm">
            <i class="fa-solid fa-camera mr-2"></i>Ambil Foto Langsung
          </button>
          <input id="patroliFotoBase64" type="hidden">
        </div>
      </div>
      <div class="p-4"><button onclick="simpanPatroli()" id="btnSimpanPatroli" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Simpan Patroli</button></div>
    </div>
  </div>

  <!-- MODAL INPUT KEJADIAN -->
  <div id="modalKejadian" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between">
        <h3 class="font-bold text-lg text-white">Lapor Kejadian</h3>
        <button onclick="closeFormKejadian()"><i class="fa-solid fa-xmark text-xl text-white"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Jenis Kejadian</label>
          <select id="kejadianJenis" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white">
            <option value="">Pilih Jenis</option>
            <option value="Kehilangan">Kehilangan</option>
            <option value="Kerusakan">Kerusakan</option>
            <option value="Kecelakaan">Kecelakaan</option>
            <option value="Mencurigakan">Mencurigakan</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Lokasi</label><input id="kejadianLokasi" placeholder="Lokasi kejadian" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Kronologi</label><textarea id="kejadianKronologi" rows="4" placeholder="Jelaskan kejadian..." class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white"></textarea></div>
        <div>
          <label class="text-xs font-bold text-red-800 block mb-1">Foto Bukti Wajib</label>
          <div id="previewKejadian" class="w-full h-40 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
            <div class="text-center text-gray-400">
              <i class="fa-solid fa-camera text-3xl mb-1"></i>
              <p class="text-xs">Belum ada foto</p>
            </div>
          </div>
          <button onclick="bukaKameraKejadian()" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-sm">
            <i class="fa-solid fa-camera mr-2"></i>Ambil Foto Langsung
          </button>
          <input id="kejadianFotoBase64" type="hidden">
        </div>
      </div>
      <div class="p-4"><button onclick="simpanKejadian()" id="btnSimpanKejadian" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Kirim Laporan</button></div>
    </div>
  </div>

  <!-- MODAL INPUT PEMBINAAN -->
  <div id="modalPembinaan" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between">
        <h3 class="font-bold text-lg text-white">Input Pembinaan</h3>
        <button onclick="closeFormPembinaan()"><i class="fa-solid fa-xmark text-xl text-white"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Materi Pembinaan</label><input id="pembinaanMateri" placeholder="Contoh: SOP Keamanan" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Nama Pelatih</label><input id="pembinaanPelatih" placeholder="Nama pelatih/instruktur" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Nilai</label><input id="pembinaanNilai" type="number" min="0" max="100" placeholder="0-100" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Keterangan</label><textarea id="pembinaanKet" rows="3" placeholder="Catatan tambahan..." class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white"></textarea></div>
      </div>
      <div class="p-4"><button onclick="simpanPembinaan()" id="btnSimpanPembinaan" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Simpan</button></div>
    </div>
  </div>`;
}

function renderPage() {
  switch (currentPage) {
    case 'home': return renderHome();
    case 'rekap': return renderRekap();
    case 'patroli': return renderPatroli();
    case 'kejadian': return renderKejadian();
    case 'pembinaan': return renderPembinaan();
    default: return renderHome();
  }
}

function switchPage(page) {
  currentPage = page;
  renderDashboard();
  history.pushState({ page: page }, '', '');
}

// ============================================
// MODAL PILIH LOKASI KERJA
// ============================================
function tampilkanModalPilihLokasi() {
  const options = daftarLokasiKerja.map(l => `<option value="${l.nama}">${l.nama}</option>`).join('');
  
  const modalHTML = `
  <div id="modalLokasi" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
      <div class="text-center mb-4">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto flex items-center justify-center mb-3">
          <i class="fa-solid fa-map-location-dot text-red-800 dark:text-red-400 text-2xl"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Pilih Lokasi Kerja</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Pilih lokasi Anda bekerja hari ini. Koordinat GPS akan dikunci sesuai lokasi ini.</p>
      </div>
      
      <label class="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Lokasi Kerja</label>
      <select id="selectLokasiUser" class="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4 focus:ring-2 focus:ring-red-800 outline-none">
        <option value="">-- Pilih Lokasi --</option>
        ${options}
      </select>
      
      <button onclick="simpanPilihanLokasi()" class="w-full bg-red-800 hover:bg-red-900 text-white p-3 rounded-lg font-bold transition shadow-lg">
        <i class="fa-solid fa-check mr-2"></i>Konfirmasi & Lanjut
      </button>
    </div>
  </div>`;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function simpanPilihanLokasi() {
  const lokasi = document.getElementById('selectLokasiUser').value;
  if (!lokasi) return toast('Silakan pilih lokasi kerja terlebih dahulu');
  
  lokasiKerjaDipilih = lokasi;
  tanggalLokasiKerja = todayString;
  localStorage.setItem('lokasiKerjaDipilih', lokasiKerjaDipilih);
  localStorage.setItem('tanggalLokasiKerja', tanggalLokasiKerja);
  
  document.getElementById('modalLokasi').remove();
  toast('Lokasi kerja berhasil disimpan untuk hari ini');
  renderDashboard();
}

function gantiLokasiKerja() {
  tanggalLokasiKerja = '';
  tampilkanModalPilihLokasi();
}

// ============================================
// HOME PAGE
// ============================================
function renderHome() {
  // Cek apakah perlu memilih lokasi hari ini
  if (tanggalLokasiKerja !== todayString || !lokasiKerjaDipilih) {
    if (daftarLokasiKerja.length === 0) {
      api('getLokasiKerja', {}).then(res => {
        if (res.status === 'success') {
          daftarLokasiKerja = res.data;
          if (daftarLokasiKerja.length > 0) {
            tampilkanModalPilihLokasi();
          } else {
            toast('Belum ada lokasi kerja. Hubungi Admin.');
          }
        }
      });
    } else if (daftarLokasiKerja.length > 0) {
      tampilkanModalPilihLokasi();
    }
  }

  const { bisaIn = false, bisaOut = false, lock12Jam = false, sisaJam = 0, jamMasuk = '--:--', jamPulang = '--:--' } = statusServer;

  return `
  <div class="bg-gradient-to-br from-red-800 to-red-900 text-white p-5 rounded-3xl shadow-2xl mb-5 relative overflow-hidden">
    <div class="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
    <div class="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12"></div>
    <div class="relative z-10">
      <p class="text-sm opacity-90 mb-1" id="statusKerja">${getStatusText(jamMasuk, jamPulang)}</p>
      <p class="text-5xl font-black mb-2 tracking-tight" id="jamRealtime">00:00:00</p>
      <div class="flex items-center gap-2 text-xs bg-white/20 w-fit px-3 py-1 rounded-full">
        <i class="fa-solid fa-location-dot animate-pulse"></i>
        <span id="lokasiStatus">Mendeteksi lokasi...</span>
      </div>
    </div>
  </div>

  <div class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 p-4 rounded-2xl mb-5 flex items-center gap-3">
    <div class="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
      <i class="fa-solid fa-map-pin text-blue-600 dark:text-blue-300"></i>
    </div>
    <div class="flex-1">
      <p class="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Lokasi Kerja Aktif</p>
      <p class="text-sm font-bold text-gray-800 dark:text-white">${lokasiKerjaDipilih || 'Belum dipilih'}</p>
    </div>
    <button onclick="gantiLokasiKerja()" class="text-xs text-blue-600 dark:text-blue-400 font-semibold underline px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
      Ganti
    </button>
  </div>

  <div class="grid grid-cols-2 gap-4 mb-5">
    <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-4 rounded-3xl border-2 border-green-200 dark:border-green-800 text-center relative overflow-hidden">
      <div class="absolute top-2 right-2 w-8 h-8 bg-green-500/20 rounded-full"></div>
      <i class="fa-solid fa-right-to-bracket text-green-600 dark:text-green-400 text-xl mb-2"></i>
      <p class="text-xs text-green-700 dark:text-green-400 font-bold uppercase">Jam Masuk</p>
      <p class="text-3xl font-black text-green-800 dark:text-green-300 mt-1">${jamMasuk}</p>
    </div>
    <div class="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 p-4 rounded-3xl border-2 border-red-200 dark:border-red-800 text-center relative overflow-hidden">
      <div class="absolute top-2 right-2 w-8 h-8 bg-red-500/20 rounded-full"></div>
      <i class="fa-solid fa-right-from-bracket text-red-600 dark:text-red-400 text-xl mb-2"></i>
      <p class="text-xs text-red-700 dark:text-red-400 font-bold uppercase">Jam Pulang</p>
      <p class="text-3xl font-black text-red-800 dark:text-red-300 mt-1">${jamPulang}</p>
    </div>
  </div>

  <div class="grid grid-cols-3 gap-3 mb-5">
    <div class="bg-white dark:bg-gray-800 p-3 rounded-2xl text-center border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition">
      <i class="fa-solid fa-calendar-check text-red-800 text-lg mb-1"></i>
      <p class="text-2xl font-black text-gray-800 dark:text-white" id="statHadir">-</p>
      <p class="text-xs text-gray-500">Hadir</p>
    </div>
    <div class="bg-white dark:bg-gray-800 p-3 rounded-2xl text-center border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition">
      <i class="fa-solid fa-business-time text-amber-600 text-lg mb-1"></i>
      <p class="text-2xl font-black text-gray-800 dark:text-white" id="statTelat">-</p>
      <p class="text-xs text-gray-500">Telat</p>
    </div>
    <div class="bg-white dark:bg-gray-800 p-3 rounded-2xl text-center border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition">
      <i class="fa-solid fa-route text-blue-600 text-lg mb-1"></i>
      <p class="text-2xl font-black text-gray-800 dark:text-white" id="statPatroli">-</p>
      <p class="text-xs text-gray-500">Patroli</p>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4 mb-5">
    <button onclick="bukaKameraAbsen('Masuk')" ${!bisaIn || lock12Jam ? 'disabled' : ''} class="p-4 rounded-2xl font-bold text-lg transition shadow-lg flex flex-col items-center gap-2 ${bisaIn && !lock12Jam ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}">
      <i class="fa-solid fa-right-to-bracket text-2xl"></i>
      <span>Absen Masuk</span>
      ${lock12Jam ? `<span class="text-xs font-normal">Tunggu ${sisaJam} jam</span>` : ''}
    </button>
    <button onclick="bukaKameraAbsen('Pulang')" ${!bisaOut ? 'disabled' : ''} class="p-4 rounded-2xl font-bold text-lg transition shadow-lg flex flex-col items-center gap-2 ${bisaOut ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}">
      <i class="fa-solid fa-right-from-bracket text-2xl"></i>
      <span>Absen Pulang</span>
    </button>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow border border-gray-100 dark:border-gray-700">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
        <i class="fa-solid fa-map-location-dot text-red-800 dark:text-red-400"></i>
      </div>
      <div>
        <p class="text-xs text-gray-500 dark:text-gray-400">Status GPS</p>
        <p class="text-sm font-bold text-gray-800 dark:text-white" id="lokasiStatusDetail">${currentLocation.alamat}</p>
      </div>
    </div>
    <div id="gpsCard" class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 p-3 rounded-xl text-center">
      <p class="text-xs text-blue-600 dark:text-blue-400">Jarak ke Kantor</p>
      <p class="text-2xl font-black text-blue-800 dark:text-blue-300" id="jarakKantor">-</p>
    </div>
  </div>
  `;
}

function getStatusText(jamMasuk, jamPulang) {
  if (jamMasuk !== '--:--' && jamPulang === '--:--') return ' Sedang Bekerja';
  if (jamMasuk !== '--:--' && jamPulang !== '--:--') return '✅ Selesai Bekerja';
  return '⏳ Belum Absen Masuk';
}

function loadHomeStats() {
  // ... (fungsi statistik jika ada)
}

function updateGpsCard(jarak, radius) {
  const el = document.getElementById('jarakKantor');
  if (el) {
    el.textContent = Math.round(jarak) + 'm';
    if (jarak <= radius) {
      el.className = 'text-2xl font-black text-green-600 dark:text-green-400';
    } else {
      el.className = 'text-2xl font-black text-red-600 dark:text-red-400';
    }
  }
}

// ============================================
// REKAP PAGE
// ============================================
function renderRekap() {
  return `
  <div class="space-y-4">
    <h2 class="text-xl font-bold text-gray-800 dark:text-white"><i class="fa-solid fa-table-list text-red-800 mr-2"></i>Riwayat Absensi</h2>
    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div class="flex gap-2 mb-4">
        <select id="monthSelector" onchange="changeMonth(this.value)" class="flex-1 p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"></select>
      </div>
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
          <p class="text-xs text-green-600 dark:text-green-400">Hadir</p>
          <p class="text-2xl font-black text-green-800 dark:text-green-300" id="totalHadir">0</p>
        </div>
        <div class="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-center">
          <p class="text-xs text-amber-600 dark:text-amber-400">Izin</p>
          <p class="text-2xl font-black text-amber-800 dark:text-amber-300" id="totalIzin">0</p>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
          <p class="text-xs text-red-600 dark:text-red-400">Alpha</p>
          <p class="text-2xl font-black text-red-800 dark:text-red-300" id="totalAlpha">0</p>
        </div>
      </div>
      <div id="listRekap"></div>
    </div>
  </div>`;
}

function getCurrentMonthKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${month}_${year}`;
}

function getMonthName(key) {
  const [month, year] = key.split('_');
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function changeMonth(monthKey) {
  selectedMonth = monthKey;
  const labelEl = document.getElementById('rekapHeaderLabel');
  if (labelEl) {
    labelEl.innerHTML = `<i class="fa-solid fa-table-list text-red-800"></i> Riwayat Bulan ${getMonthName(monthKey)}`;
  }
  const selectEl = document.getElementById('monthSelector');
  if (selectEl) selectEl.value = monthKey;
  loadRekap(monthKey);
}

async function loadRekap(bulanKey = null) {
  const listEl = document.getElementById('listRekap');
  const countEl = document.getElementById('rekapCount');
  
  if (!user) {
    listEl.innerHTML = `<div class="text-center py-8"><i class="fa-solid fa-circle-exclamation text-5xl text-red-500 mb-3"></i><h3 class="font-bold text-gray-800 dark:text-white mb-1">Session Expired</h3><p class="text-sm text-gray-500 dark:text-gray-400">Silakan login ulang</p></div>`;
    return;
  }
  
  const bulan = bulanKey || document.getElementById('monthSelector')?.value || getCurrentMonthKey();
  const [month, year] = bulan.split('_');
  const bulanParam = `${month}/${year}`;

  listEl.innerHTML = `<div class="text-center py-8"><div class="inline-block w-10 h-10 border-4 border-red-200 border-t-red-800 rounded-full animate-spin mb-3"></div><p class="text-sm text-gray-500 dark:text-gray-400">Memuat data absensi ${getMonthName(bulan)}...</p></div>`;
  if (countEl) countEl.textContent = '';

  try {
    const res = await api('getRekapFromSheetBulanan', {
      username: user.username,
      nama: user.nama,
      bulan: bulanParam
    });

    if (res.status === 'error') {
      listEl.innerHTML = `<div class="text-center py-8"><i class="fa-solid fa-triangle-exclamation text-5xl text-amber-500 mb-3"></i><h3 class="font-bold text-gray-800 dark:text-white mb-1">Error</h3><p class="text-sm text-gray-500 dark:text-gray-400 mb-3">${res.message}</p><button onclick="loadRekap('${bulan}')" class="bg-red-800 text-white px-4 py-2 rounded-lg text-sm"><i class="fa-solid fa-rotate-right mr-2"></i>Coba Lagi</button></div>`;
      document.getElementById('totalHadir').textContent = '0';
      document.getElementById('totalIzin').textContent = '0';
      document.getElementById('totalAlpha').textContent = '0';
      return;
    }

    if (!res.data || res.data.length === 0) {
      listEl.innerHTML = `<div class="text-center py-8"><i class="fa-regular fa-calendar-xmark text-6xl text-gray-300 dark:text-gray-600 mb-3"></i><h3 class="font-bold text-gray-700 dark:text-gray-300 mb-1">Belum Ada Data</h3><p class="text-sm text-gray-500 dark:text-gray-400">Belum ada riwayat absensi untuk bulan ${getMonthName(bulan)}</p></div>`;
      document.getElementById('totalHadir').textContent = '0';
      document.getElementById('totalIzin').textContent = '0';
      document.getElementById('totalAlpha').textContent = '0';
      if (countEl) countEl.textContent = '0 hari';
      return;
    }

    const grouped = {};
    let totalHadir = 0, totalIzin = 0, totalAlpha = 0;

    res.data.forEach(item => {
      const tgl = item.tanggal;
      if (!tgl) return;
      if (!grouped[tgl]) grouped[tgl] = { in: null, out: null, status: 'Alpha' };
      const ket = String(item.keterangan || '').toUpperCase();
      const jam = item.jam ? String(item.jam).substring(0, 5) : null;
      if (ket === 'IN' || ket === 'MASUK') {
        grouped[tgl].in = jam;
        if (grouped[tgl].status === 'Alpha') grouped[tgl].status = 'Hadir';
      } else if (ket === 'OUT' || ket === 'PULANG') {
        grouped[tgl].out = jam;
      } else if (ket === 'IZIN') {
        grouped[tgl].status = 'Izin';
        if (jam) grouped[tgl].in = jam;
      } else if (ket === 'ALPHA') {
        grouped[tgl].status = 'Alpha';
      }
    });

    Object.keys(grouped).forEach(tgl => {
      const d = grouped[tgl];
      if (d.status === 'Hadir') totalHadir++;
      else if (d.status === 'Izin') totalIzin++;
      else if (d.status === 'Alpha') totalAlpha++;
    });

    animateValue('totalHadir', 0, totalHadir, 500);
    animateValue('totalIzin', 0, totalIzin, 500);
    animateValue('totalAlpha', 0, totalAlpha, 500);

    if (countEl) countEl.textContent = `${Object.keys(grouped).length} hari`;

    const sortedDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    let html = `<div class="overflow-x-auto -mx-4 px-4"><table class="w-full text-sm min-w-[500px]"><thead><tr class="bg-gradient-to-r from-red-800 to-red-900 text-white"><th class="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider rounded-l-lg"><i class="fa-regular fa-calendar mr-1"></i>Tanggal</th><th class="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wider"><i class="fa-solid fa-arrow-right-to-bracket mr-1"></i>Jam Masuk</th><th class="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wider"><i class="fa-solid fa-arrow-right-from-bracket mr-1"></i>Jam Pulang</th><th class="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wider rounded-r-lg"><i class="fa-solid fa-circle-info mr-1"></i>Status</th></tr></thead><tbody class="divide-y divide-gray-100 dark:divide-gray-700">`;

    sortedDates.forEach((tgl, idx) => {
      const d = grouped[tgl];
      let tglFmt = tgl, dayName = '';
      try {
        const [y, m, dd] = tgl.split('-').map(Number);
        const dateObj = new Date(y, m - 1, dd);
        tglFmt = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
      } catch (e) { tglFmt = tgl; }

      let statusBadge = '', rowBg = '';
      if (d.status === 'Hadir') {
        if (d.in && !d.out) {
          statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><i class="fa-solid fa-clock text-[8px]"></i> Belum Pulang</span>`;
          rowBg = 'bg-blue-50/40 dark:bg-blue-900/10';
        } else {
          statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"><i class="fa-solid fa-check text-[8px]"></i> Hadir</span>`;
          rowBg = idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20';
        }
      } else if (d.status === 'Izin') {
        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><i class="fa-solid fa-file text-[8px]"></i> Izin</span>`;
        rowBg = 'bg-amber-50/40 dark:bg-amber-900/10';
      } else if (d.status === 'Alpha') {
        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"><i class="fa-solid fa-xmark text-[8px]"></i> Alpha</span>`;
        rowBg = 'bg-red-50/40 dark:bg-red-900/10';
      } else {
        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">${d.status}</span>`;
      }

      const jamMasukHtml = d.in ? `<span class="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md font-bold text-xs border border-green-200 dark:border-green-800"><i class="fa-solid fa-right-to-bracket text-[10px]"></i>${d.in}</span>` : '<span class="text-gray-300 dark:text-gray-600 text-xs">—</span>';
      const jamPulangHtml = d.out ? `<span class="inline-flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md font-bold text-xs border border-red-200 dark:border-red-800"><i class="fa-solid fa-right-from-bracket text-[10px]"></i>${d.out}</span>` : '<span class="text-gray-300 dark:text-gray-600 text-xs">—</span>';

      html += `<tr class="${rowBg} hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"><td class="px-3 py-3"><div class="flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 flex flex-col items-center justify-center flex-shrink-0"><span class="text-[8px] font-bold uppercase leading-none">${dayName}</span><span class="text-sm font-black leading-none mt-0.5">${tglFmt.split(' ')[0]}</span></div><div class="leading-tight"><p class="font-bold text-gray-800 dark:text-white text-xs">${tglFmt}</p><p class="text-[10px] text-gray-500 dark:text-gray-400">${dayName}</p></div></div></td><td class="px-3 py-3 text-center">${jamMasukHtml}</td><td class="px-3 py-3 text-center">${jamPulangHtml}</td><td class="px-3 py-3 text-center">${statusBadge}</td></tr>`;
    });

    html += `</tbody></table></div><div class="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700"><div class="flex items-center justify-between text-xs"><span class="text-gray-500 dark:text-gray-400"><i class="fa-solid fa-info-circle mr-1"></i>Total ${Object.keys(grouped).length} hari tercatat</span><div class="flex items-center gap-3"><span class="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold"><span class="w-2 h-2 bg-green-500 rounded-full"></span>${totalHadir}</span><span class="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold"><span class="w-2 h-2 bg-amber-500 rounded-full"></span>${totalIzin}</span><span class="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold"><span class="w-2 h-2 bg-red-500 rounded-full"></span>${totalAlpha}</span></div></div></div>`;

    listEl.innerHTML = html;
  } catch (error) {
    listEl.innerHTML = `<div class="text-center py-8"><i class="fa-solid fa-circle-exclamation text-5xl text-red-500 mb-3"></i><h3 class="font-bold text-gray-800 dark:text-white mb-1">Gagal Memuat Data</h3><p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${error.message}</p><button onclick="loadRekap('${bulan}')" class="bg-red-800 hover:bg-red-900 text-white px-5 py-2 rounded-lg text-sm font-semibold transition shadow-sm"><i class="fa-solid fa-rotate-right mr-2"></i>Coba Lagi</button></div>`;
  }
}

function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;
  const range = end - start;
  if (range === 0) { obj.textContent = end; return; }
  const minTimer = 50;
  let stepTime = Math.abs(Math.floor(duration / range));
  stepTime = Math.max(stepTime, minTimer);
  let startTime = new Date().getTime();
  let endTime = startTime + duration;
  let timer;
  function run() {
    let now = new Date().getTime();
    let remaining = Math.max((endTime - now) / duration, 0);
    let value = Math.round(end - (remaining * range));
    obj.textContent = value;
    if (value == end) clearInterval(timer);
  }
  timer = setInterval(run, stepTime);
  run();
}

// ============================================
// PATROLI PAGE
// ============================================
function renderPatroli() {
  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Patroli</h2>
      <button onclick="openFormPatroli()" class="bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-900 transition">
        <i class="fa-solid fa-plus mr-1"></i>Tambah
      </button>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div id="listPatroli" class="space-y-2">
        <div class="text-center text-gray-400 py-8"><i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i><p class="text-sm">Loading data...</p></div>
      </div>
    </div>
  </div>`;
}

async function loadPatroli() {
  const res = await api('getPatroli', { username: user.username });
  const listEl = document.getElementById('listPatroli');
  if (res.status === 'success' && res.data.length > 0) {
    dataPatroli = res.data;
    listEl.innerHTML = dataPatroli.map(p => {
      const tgl = new Date(p.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `<div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><div class="flex justify-between items-start mb-2"><div class="flex-1"><p class="text-sm font-bold text-gray-800 dark:text-white">${p.lokasi}</p><p class="text-xs text-red-600 dark:text-red-400 font-semibold">Petugas: ${p.nama}</p><p class="text-xs text-gray-500 dark:text-gray-400">${tgl}</p></div>${p.foto ? `<img src="${p.foto}" onclick="bukaZoom('${p.foto}')" class="w-12 h-12 rounded-lg object-cover ml-2 cursor-pointer">` : ''}</div><p class="text-xs text-gray-600 dark:text-gray-300">${p.keterangan || '-'}</p></div>`;
    }).join('');
  } else {
    listEl.innerHTML = `<div class="text-center text-gray-400 py-8"><i class="fa-solid fa-route text-3xl mb-2"></i><p class="text-sm">Belum ada data patroli</p></div>`;
  }
}

function openFormPatroli() { document.getElementById('modalPatroli').classList.replace('hidden', 'flex'); }
function closeFormPatroli() {
  document.getElementById('modalPatroli').classList.replace('flex', 'hidden');
  document.getElementById('patroliLokasi').value = '';
  document.getElementById('patroliKet').value = '';
  document.getElementById('patroliFotoBase64').value = '';
  document.getElementById('previewPatroli').innerHTML = `<div class="text-center text-gray-400"><i class="fa-solid fa-camera text-3xl mb-1"></i><p class="text-xs">Belum ada foto</p></div>`;
}

async function simpanPatroli() {
  const btn = document.getElementById('btnSimpanPatroli');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Menyimpan...';
  const lokasi = document.getElementById('patroliLokasi').value.trim();
  const ket = document.getElementById('patroliKet').value.trim();
  const fotoBase64 = document.getElementById('patroliFotoBase64').value;
  if (!lokasi) { toast('Lokasi wajib diisi'); btn.disabled = false; btn.innerHTML = 'Simpan Patroli'; return; }
  if (!fotoBase64) { toast('Foto bukti wajib diambil'); btn.disabled = false; btn.innerHTML = 'Simpan Patroli'; return; }
  const res = await api('tambahPatroli', { username: user.username, lokasi: lokasi, keterangan: ket, foto: fotoBase64, lat: currentLocation.lat, long: currentLocation.long });
  if (res.status === 'success') { toast(res.message); closeFormPatroli(); loadPatroli(); } else { toast(res.message); }
  btn.disabled = false;
  btn.innerHTML = 'Simpan Patroli';
}

// ============================================
// KEJADIAN PAGE
// ============================================
function renderKejadian() {
  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Laporan Kejadian</h2>
      <button onclick="openFormKejadian()" class="bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-900 transition">
        <i class="fa-solid fa-plus mr-1"></i>Lapor
      </button>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div id="listKejadian" class="space-y-2">
        <div class="text-center text-gray-400 py-8"><i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i><p class="text-sm">Loading data...</p></div>
      </div>
    </div>
  </div>`;
}

async function loadKejadian() {
  const res = await api('getKejadian', { username: user.username });
  const listEl = document.getElementById('listKejadian');
  if (res.status === 'success' && res.data.length > 0) {
    dataKejadian = res.data;
    listEl.innerHTML = dataKejadian.map(k => {
      const tgl = new Date(k.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `<div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><div class="flex justify-between items-start mb-2"><div class="flex-1"><p class="text-sm font-bold text-red-600">${k.jenis}</p><p class="text-xs text-red-600 dark:text-red-400 font-semibold">Pelapor: ${k.nama}</p><p class="text-xs text-gray-500 dark:text-gray-400">${tgl} - ${k.lokasi}</p></div>${k.foto ? `<img src="${k.foto}" onclick="bukaZoom('${k.foto}')" class="w-12 h-12 rounded-lg object-cover ml-2 cursor-pointer">` : ''}</div><p class="text-xs text-gray-600 dark:text-gray-300">${k.kronologi}</p></div>`;
    }).join('');
  } else {
    listEl.innerHTML = `<div class="text-center text-gray-400 py-8"><i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i><p class="text-sm">Belum ada laporan kejadian</p></div>`;
  }
}

function openFormKejadian() { document.getElementById('modalKejadian').classList.replace('hidden', 'flex'); }
function closeFormKejadian() {
  document.getElementById('modalKejadian').classList.replace('flex', 'hidden');
  document.getElementById('kejadianJenis').value = '';
  document.getElementById('kejadianLokasi').value = '';
  document.getElementById('kejadianKronologi').value = '';
  document.getElementById('kejadianFotoBase64').value = '';
  document.getElementById('previewKejadian').innerHTML = `<div class="text-center text-gray-400"><i class="fa-solid fa-camera text-3xl mb-1"></i><p class="text-xs">Belum ada foto</p></div>`;
}

async function simpanKejadian() {
  const btn = document.getElementById('btnSimpanKejadian');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Mengirim...';
  const jenis = document.getElementById('kejadianJenis').value;
  const lokasi = document.getElementById('kejadianLokasi').value.trim();
  const kronologi = document.getElementById('kejadianKronologi').value.trim();
  const fotoBase64 = document.getElementById('kejadianFotoBase64').value;
  if (!jenis || !lokasi || !kronologi) { toast('Jenis, Lokasi, dan Kronologi wajib diisi'); btn.disabled = false; btn.innerHTML = 'Kirim Laporan'; return; }
  if (!fotoBase64) { toast('Foto bukti wajib diambil'); btn.disabled = false; btn.innerHTML = 'Kirim Laporan'; return; }
  const res = await api('tambahKejadian', { username: user.username, jenis: jenis, lokasi: lokasi, kronologi: kronologi, foto: fotoBase64, lat: currentLocation.lat, long: currentLocation.long });
  if (res.status === 'success') { toast(res.message); closeFormKejadian(); loadKejadian(); } else { toast(res.message); }
  btn.disabled = false;
  btn.innerHTML = 'Kirim Laporan';
}

// ============================================
// PEMBINAAN PAGE
// ============================================
function renderPembinaan() {
  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Pembinaan</h2>
      <button onclick="openFormPembinaan()" class="bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-900 transition">
        <i class="fa-solid fa-plus mr-1"></i>Tambah
      </button>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div id="listPembinaan" class="space-y-2">
        <div class="text-center text-gray-400 py-8"><i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i><p class="text-sm">Loading data...</p></div>
      </div>
    </div>
  </div>`;
}

async function loadPembinaan() {
  const res = await api('getPembinaan', { username: user.username });
  const listEl = document.getElementById('listPembinaan');
  if (res.status === 'success' && res.data.length > 0) {
    dataPembinaan = res.data;
    listEl.innerHTML = dataPembinaan.map(p => {
      const tgl = new Date(p.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      return `<div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><div class="flex justify-between items-start mb-2"><div class="flex-1"><p class="text-sm font-bold text-gray-800 dark:text-white">${p.materi}</p><p class="text-xs text-gray-500 dark:text-gray-400">${tgl} - ${p.pelatih}</p></div><div class="bg-red-800 text-white px-3 py-1 rounded-full"><p class="text-sm font-bold">${p.nilai}</p></div></div><p class="text-xs text-gray-600 dark:text-gray-300">${p.keterangan || '-'}</p></div>`;
    }).join('');
  } else {
    listEl.innerHTML = `<div class="text-center text-gray-400 py-8"><i class="fa-solid fa-user-graduate text-3xl mb-2"></i><p class="text-sm">Belum ada data pembinaan</p></div>`;
  }
}

function openFormPembinaan() { document.getElementById('modalPembinaan').classList.replace('hidden', 'flex'); }
function closeFormPembinaan() {
  document.getElementById('modalPembinaan').classList.replace('flex', 'hidden');
  document.getElementById('pembinaanMateri').value = '';
  document.getElementById('pembinaanPelatih').value = '';
  document.getElementById('pembinaanNilai').value = '';
  document.getElementById('pembinaanKet').value = '';
}

async function simpanPembinaan() {
  const btn = document.getElementById('btnSimpanPembinaan');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Menyimpan...';
  const materi = document.getElementById('pembinaanMateri').value.trim();
  const pelatih = document.getElementById('pembinaanPelatih').value.trim();
  const nilai = document.getElementById('pembinaanNilai').value;
  const ket = document.getElementById('pembinaanKet').value.trim();
  if (!materi || !pelatih || !nilai) { toast('Materi, Pelatih, dan Nilai wajib diisi'); btn.disabled = false; btn.innerHTML = 'Simpan'; return; }
  const res = await api('tambahPembinaan', { username: user.username, materi: materi, pelatih: pelatih, nilai: nilai, keterangan: ket });
  if (res.status === 'success') { toast(res.message); closeFormPembinaan(); loadPembinaan(); } else { toast(res.message); }
  btn.disabled = false;
  btn.innerHTML = 'Simpan';
}

// ============================================
// KAMERA & ABSEN
// ============================================
function bukaKameraAbsen(type) {
  if (!lokasiKerjaDipilih) {
    toast('Pilih lokasi kerja terlebih dahulu!');
    return;
  }
  currentCamMode = 'absen';
  currentType = type;
  modalAsal = '';
  document.getElementById('judulKamera').textContent = 'Ambil Foto Selfie';
  document.getElementById('btnCapture').innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Kirim Absen';
  currentLocation.alamat = 'Mengunci Posisi Satelit...';
  dapatkanLokasiGPS();
  openCam();
}

function openCam() {
  document.getElementById('modalCam').classList.replace('hidden', 'flex');
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  if (video) video.classList.remove('hidden');
  if (canvas) canvas.classList.add('hidden');
  
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(s => {
      stream = s;
      video.srcObject = s;
      video.play();
      updateTimemark();
    })
    .catch(e => toast('Kamera gagal diakses: ' + e.message));
}

function closeCam() {
  document.getElementById('modalCam').classList.replace('flex', 'hidden');
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}

function updateTimemark() {
  const hari = document.getElementById('previewHari');
  const jam = document.getElementById('previewJam');
  const nama = document.getElementById('previewNama');
  const gps = document.getElementById('previewGps');
  if (hari) hari.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  if (jam) jam.textContent = new Date().toLocaleTimeString('id-ID');
  if (nama) nama.textContent = `Nama: ${user.nama}`;
  if (gps) gps.textContent = `GPS: ${currentLocation.lat}, ${currentLocation.long}`;
  animationFrame = requestAnimationFrame(updateTimemark);
}

function capture() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const btn = document.getElementById('btnCapture');
  if (!video || !canvas) return;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Proses...';
  const ctx = canvas.getContext('2d');
  const MAX_WIDTH = 800;
  let width = video.videoWidth;
  let height = video.videoHeight;
  if (width > MAX_WIDTH) {
    height = Math.round(height * (MAX_WIDTH / width));
    width = MAX_WIDTH;
  }
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(video, 0, 0, width, height);
  const scale = Math.max(width / 640, 1);
  const wmPadding = 14 * scale;
  const wmBoxWidth = 340 * scale;
  const wmBoxHeight = 120 * scale;
  const wmX = 12 * scale;
  const wmY = height - wmBoxHeight - 12 * scale;
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(wmX, wmY, wmBoxWidth, wmBoxHeight);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(wmX, wmY, 6 * scale, wmBoxHeight);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(wmX, wmY, wmBoxWidth, 2 * scale);
  const textX = wmX + wmPadding + 6 * scale;
  let textY = wmY + 26 * scale;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${15 * scale}px Arial`;
  ctx.fillText(new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }), textX, textY);
  textY += 26 * scale;
  ctx.fillStyle = "#facc15";
  ctx.font = `bold ${22 * scale}px Arial`;
  ctx.fillText(new Date().toLocaleTimeString('id-ID'), textX, textY);
  textY += 24 * scale;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${13 * scale}px Arial`;
  ctx.fillText(`Nama: ${user.nama}`, textX, textY);
  textY += 20 * scale;
  ctx.fillStyle = "#4ade80";
  ctx.font = `${12 * scale}px Courier New`;
  ctx.fillText(`GPS: ${currentLocation.lat}, ${currentLocation.long}`, textX, textY);
  const fotoBase64 = canvas.toDataURL('image/jpeg', 0.75);
  closeCam();

  if (currentCamMode === 'absen') {
    const res = await api('absen', {
      username: user.username,
      tipeAbsen: currentType,
      foto: fotoBase64,
      lat: currentLocation.lat,
      long: currentLocation.long,
      lokasiKerja: lokasiKerjaDipilih
    });
    toast(res.message);
    if (res.status === 'success') cekStatus();
  } else if (currentCamMode === 'patroli') {
    document.getElementById('patroliFotoBase64').value = fotoBase64;
    document.getElementById('previewPatroli').innerHTML = `<img src="${fotoBase64}" class="w-full h-full object-cover">`;
    toast('Foto patroli berhasil');
  } else if (currentCamMode === 'kejadian') {
    document.getElementById('kejadianFotoBase64').value = fotoBase64;
    document.getElementById('previewKejadian').innerHTML = `<img src="${fotoBase64}" class="w-full h-full object-cover">`;
    toast('Foto kejadian berhasil');
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Ambil Foto';
}

function bukaKameraPatroli() {
  currentCamMode = 'patroli';
  document.getElementById('judulKamera').textContent = 'Foto Patroli';
  document.getElementById('btnCapture').innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Ambil Foto';
  openCam();
}

function bukaKameraKejadian() {
  currentCamMode = 'kejadian';
  document.getElementById('judulKamera').textContent = 'Foto Kejadian';
  document.getElementById('btnCapture').innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Ambil Foto';
  openCam();
}

// ============================================
// GPS & LOCATION
// ============================================
function dapatkanLokasiGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        currentLocation.lat = position.coords.latitude.toFixed(6);
        currentLocation.long = position.coords.longitude.toFixed(6);
        currentLocation.alamat = `Lat: ${currentLocation.lat}, Long: ${currentLocation.long}`;
        const lokasiEl = document.getElementById('lokasiStatus');
        if (lokasiEl) lokasiEl.textContent = 'Lokasi terkunci';
        localStorage.setItem('gps', JSON.stringify(currentLocation));
        const setting = await api('getSetting', {});
        if (setting.lat) {
          const jarak = hitungJarak(currentLocation.lat, currentLocation.long, setting.lat, setting.long);
          updateGpsCard(jarak, setting.radius);
        }
        const gpsEl = document.getElementById('previewGps');
        if (gpsEl) gpsEl.innerText = ` ${currentLocation.alamat}`;
      },
      (error) => {
        currentLocation.alamat = "GPS terkunci / tidak aktif";
        const lokasiEl = document.getElementById('lokasiStatus');
        if (lokasiEl) lokasiEl.textContent = 'GPS off';
        const gpsEl = document.getElementById('previewGps');
        if (gpsEl) gpsEl.innerText = `⚠ ${currentLocation.alamat}`;
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  } else {
    currentLocation.alamat = "Browser tidak mendukung GPS";
  }
}

function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================
// PROFIL & SETTINGS
// ============================================
function openProfil() { document.getElementById('modalProfil').classList.replace('hidden', 'flex'); }
function closeProfil() { document.getElementById('modalProfil').classList.replace('flex', 'hidden'); }
function openEditProfil() { closeProfil(); document.getElementById('modalEditProfil').classList.replace('hidden', 'flex'); }
function closeEditProfil() { document.getElementById('modalEditProfil').classList.replace('flex', 'hidden'); }
function openGantiPassword() { closeProfil(); document.getElementById('modalGantiPassword').classList.replace('hidden', 'flex'); }
function closeGantiPassword() { document.getElementById('modalGantiPassword').classList.replace('flex', 'hidden'); }
function gantiFotoProfil() { document.getElementById('inputFotoProfil').click(); }

async function uploadFotoProfil(event) {
  const file = event.target.files[0];
  if (!file) return;
  const img = await createImageBitmap(file);
  const max = 600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const base64 = canvas.toDataURL('image/jpeg', 0.8);
  document.getElementById('fotoProfil').src = base64;
  const res = await api('uploadFoto', { username: user.username, fotoBase64: base64 });
  if (res.status === 'success') {
    user.foto = res.urlFoto;
    localStorage.setItem('user', JSON.stringify(user));
    document.getElementById('avatarNav').src = res.urlFoto;
    toast('Foto profil berhasil');
  } else {
    toast(res.message);
  }
}

async function simpanProfil() {
  const btn = document.getElementById('btnSimpanProfil');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Menyimpan...';
  const d = {
    username: user.username,
    nama: document.getElementById('editNama').value,
    ktp: document.getElementById('editKtp').value,
    hp: document.getElementById('editHp').value,
    alamat: document.getElementById('editAlamat').value,
    ttl: document.getElementById('editTtl').value,
    bank: document.getElementById('editBank').value,
    rekening: document.getElementById('editRek').value
  };
  const res = await api('updateProfil', d);
  if (res.status === 'success') {
    user = { ...user, ...d };
    localStorage.setItem('user', JSON.stringify(user));
    closeEditProfil();
    renderDashboard();
    toast(res.message);
  } else {
    toast(res.message);
  }
  btn.disabled = false;
  btn.innerHTML = 'Simpan';
}

async function gantiPassword() {
  const btn = document.getElementById('btnGantiPass');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Update...';
  const res = await api('gantiPassword', {
    username: user.username,
    passLama: document.getElementById('passLama').value,
    passBaru: document.getElementById('passBaru').value
  });
  toast(res.message);
  if (res.status === 'success') {
    document.getElementById('passLama').value = '';
    document.getElementById('passBaru').value = '';
    closeGantiPassword();
  }
  btn.disabled = false;
  btn.innerHTML = 'Update';
}

// ============================================
// API & STATUS
// ============================================
async function cekStatus() {
  try {
    const res = await api('cekStatus', { username: user.username });
    if (res.status === 'success') {
      statusServer = res;
      const contentArea = document.getElementById('contentArea');
      if (contentArea && currentPage === 'home') {
        contentArea.innerHTML = renderPage();
        loadHomeStats();
      }
    } else {
      toast(res.message);
    }
  } catch (e) {
    console.error('Cek status error:', e);
  }
}

async function api(action, data = {}) {
  try {
    const url = URL_GAS + '?t=' + Date.now();
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action, ...data })
    });
    if (!res.ok) throw new Error('HTTP error! status: ' + res.status);
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    toast('Koneksi gagal: ' + e.message);
    return { status: 'error', message: e.message };
  }
}

// ============================================
// NAVIGATION & BACK BUTTON
// ============================================
window.addEventListener('popstate', function(event) {
  if (currentPage !== 'home') {
    currentPage = 'home';
    renderDashboard();
  }
  history.pushState({ page: 'home' }, '', '');
});

// ============================================
// INIT
// ============================================
console.log(' Starting app...');
history.pushState({ page: currentPage }, '', '');
render();
