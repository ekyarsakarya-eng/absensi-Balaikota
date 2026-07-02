// ============================================
// KONFIGURASI & VARIABEL GLOBAL
// ============================================
const URL_GAS = 'https://script.google.com/macros/s/AKfycbySOy0DGZWfuTLBjPQlgau1VSgOlMf9fi9z_Sx1jJAQDbI_Uyu5WXDEhDHqYOVpZJSM/exec';
console.log('App.js loaded - v2 CLEAN');

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

// ============================================
// PWA INSTALL UNIVERSAL
// ============================================
let deferredPrompt;
const installPopup = document.getElementById('installPopup');
const btnAndroid = document.getElementById('btnInstallAndroid');
const btnIOS = document.getElementById('btnInstallIOS');
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
    document.getElementById('installTitle').textContent = 'Install Aplikasi Dulu';
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
  btnIOS.classList.remove('hidden');
  document.getElementById('installTitle').textContent = 'Wajib Install di iPhone';
  document.getElementById('installDesc').textContent = 'Safari tidak bisa absen normal kalau belum di Add to Home Screen';
}

btnIOS?.addEventListener('click', () => {
  iosSteps.classList.toggle('hidden');
  btnIOS.innerHTML = iosSteps.classList.contains('hidden')
    ? '<i class="fa-solid fa-share-from-square mr-2"></i>Lihat Cara Install'
    : '<i class="fa-solid fa-check mr-2"></i>Sudah Install? Buka dari Home';
});

if (isInStandalone()) installPopup?.classList.add('hidden');

// ============================================
// INIT APP
// ============================================
const app = document.getElementById('app');
if (!app) console.error('Div #app tidak ditemukan!');
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
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-rekap.png" class="w-6 h-6 mb-1 ${currentPage === 'rekap' ? '' : 'opacity-50'}">
        <span class="text-xs font-semibold">Rekap</span>
      </button>
      <button onclick="switchPage('patroli')" class="flex flex-col items-center py-2 ${currentPage === 'patroli' ? 'text-red-800' : 'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-patroli.png" class="w-6 h-6 mb-1 ${currentPage === 'patroli' ? '' : 'opacity-50'}">
        <span class="text-xs font-semibold">Patroli</span>
      </button>
      <button onclick="switchPage('kejadian')" class="flex flex-col items-center py-2 ${currentPage === 'kejadian' ? 'text-red-800' : 'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-kejadian.png" class="w-6 h-6 mb-1 ${currentPage === 'kejadian' ? '' : 'opacity-50'}">
        <span class="text-xs font-semibold">Kejadian</span>
      </button>
      <button onclick="switchPage('pembinaan')" class="flex flex-col items-center py-2 ${currentPage === 'pembinaan' ? 'text-red-800' : 'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-pembinaan.png" class="w-6 h-6 mb-1 ${currentPage === 'pembinaan' ? '' : 'opacity-50'}">
        <span class="text-xs font-semibold">Pembinaan</span>
      </button>
    </div>
  </div>

  ${renderModals()}
  `;

  if (currentPage === 'home') {
    cekStatus();
    dapatkanLokasiGPS();
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
// HOME PAGE
// ============================================
function renderHome() {
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

  <div id="gpsCard" class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 p-4 rounded-2xl mb-5 flex items-center gap-3 transition-all">
    <div class="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-2xl flex items-center justify-center">
      <i class="fa-solid fa-satellite-dish text-blue-600 dark:text-blue-300 text-xl"></i>
    </div>
    <div class="flex-1">
      <p class="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Status Lokasi</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 font-semibold" id="gpsText">Mengunci GPS...</p>
    </div>
  </div>

  <div class="space-y-3 mb-5">
    <button onclick="bukaKameraAbsen('Masuk')" ${!bisaIn ? 'disabled' : ''}
      class="w-full py-5 rounded-3xl font-bold text-white transition-all duration-300 flex items-center gap-4 shadow-xl
      ${!bisaIn ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none text-gray-500' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-[1.02] active:scale-[0.98] hover:shadow-green-500/50'}">
      <div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center ml-1">
        <i class="fa-solid fa-fingerprint text-3xl"></i>
      </div>
      <div class="text-left flex-1">
        <p class="text-xl">Absen Masuk</p>
        <p class="text-xs opacity-80">Tap untuk scan wajah & GPS</p>
      </div>
      ${bisaIn ? '<div class="w-3 h-3 bg-white rounded-full animate-ping mr-4"></div>' : ''}
    </button>

    <button onclick="bukaKameraAbsen('Pulang')" ${!bisaOut ? 'disabled' : ''}
      class="w-full py-5 rounded-3xl font-bold text-white transition-all duration-300 flex items-center gap-4 shadow-xl
      ${!bisaOut ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none text-gray-500' : 'bg-gradient-to-r from-red-800 to-red-900 hover:scale-[1.02] active:scale-[0.98] hover:shadow-red-800/50'}">
      <div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center ml-1">
        <i class="fa-solid fa-door-open text-3xl"></i>
      </div>
      <div class="text-left flex-1">
        <p class="text-xl">Absen Pulang</p>
        <p class="text-xs opacity-80">Selesaikan shift hari ini</p>
      </div>
      ${bisaOut ? '<div class="w-3 h-3 bg-white rounded-full animate-ping mr-4"></div>' : ''}
    </button>
  </div>

  <div class="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
    <p class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
      <i class="fa-solid fa-clock-rotate-left text-red-800"></i> Aktivitas Terakhir
    </p>
    <div id="aktivitasTerakhir">
      <div class="text-center text-gray-400 py-4">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
    </div>
  </div>
  `;
}

function getStatusText(jamMasuk, jamPulang) {
  if (jamMasuk === '--:--') return 'Belum Absen Masuk';
  if (jamMasuk !== '--:--' && jamPulang === '--:--') return 'Sedang Bekerja';
  return 'Shift Selesai 👍';
}

function updateJamRealtime() {
  const el = document.getElementById('jamRealtime');
  const statusEl = document.getElementById('statusKerja');
  if (!el || !statusServer) return;

  const now = new Date();
  el.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (statusServer.jamMasuk !== '--:--' && statusServer.jamPulang === '--:--') {
    const [jam, menit] = statusServer.jamMasuk.split(':');
    const masuk = new Date();
    masuk.setHours(parseInt(jam), parseInt(menit), 0);
    const durasi = Math.floor((now - masuk) / 60000);
    const jamKerja = Math.floor(durasi / 60);
    const menitKerja = durasi % 60;
    if (statusEl) statusEl.textContent = `Sudah kerja ${jamKerja}j ${menitKerja}m`;
  }
}
setInterval(updateJamRealtime, 1000);

async function loadHomeStats() {
  try {
    const [rekap, patroli] = await Promise.all([
      api('getRekap', { username: user.username }),
      api('getPatroli', { username: user.username })
    ]);

    const statHadir = document.getElementById('statHadir');
    const statTelat = document.getElementById('statTelat');
    const statPatroli = document.getElementById('statPatroli');

    if (rekap.status === 'success' && statHadir) {
      const hadir = rekap.data.filter(r => r.keterangan === 'IN' && r.jam && r.jam !== '--:--').length;
      statHadir.textContent = hadir;
      if (statTelat) statTelat.textContent = 0;
    }

    if (patroli.status === 'success' && statPatroli) {
      statPatroli.textContent = patroli.data.length;

      const aktivitasEl = document.getElementById('aktivitasTerakhir');
      if (aktivitasEl && patroli.data.length > 0) {
        const last = patroli.data[0];
        const waktu = new Date(last.timestamp);
        const selisih = Math.floor((new Date() - waktu) / 60000);
        const waktuText = selisih < 60 ? `${selisih} menit lalu` : `${Math.floor(selisih / 60)} jam lalu`;

        aktivitasEl.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
              <i class="fa-solid fa-route"></i>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-800 dark:text-white">Patroli ${last.lokasi}</p>
              <p class="text-xs text-gray-500">${waktuText}</p>
            </div>
          </div>
        `;
      }
    }
  } catch (e) {
    console.error('Load stats error:', e);
  }
}

function updateGpsCard(jarak, radius) {
  const gpsText = document.getElementById('gpsText');
  const gpsCard = document.getElementById('gpsCard');
  if (!gpsText || !gpsCard) return;

  if (jarak <= radius) {
    gpsText.innerHTML = `<span class="text-green-600 dark:text-green-400 font-bold">Dalam radius ${Math.round(jarak)}m ✓</span>`;
    gpsCard.className = 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 p-4 rounded-2xl mb-5 flex items-center gap-3 transition-all';
  } else {
    gpsText.innerHTML = `<span class="text-red-600 dark:text-red-400 font-bold">Diluar radius ${Math.round(jarak)}m</span>`;
    gpsCard.className = 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-4 rounded-2xl mb-5 flex items-center gap-3 transition-all';
  }
}

// ============================================
// KAMERA & CAPTURE
// ============================================
function bukaKameraAbsen(type) {
  currentCamMode = 'absen';
  currentType = type;
  modalAsal = '';
  document.getElementById('judulKamera').textContent = 'Ambil Foto Selfie';
  document.getElementById('btnCapture').innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Kirim Absen';
  currentLocation.alamat = 'Mengunci Posisi Satelit...';
  dapatkanLokasiGPS();
  openCam();
}

function bukaKameraPatroli() {
  currentCamMode = 'patroli';
  modalAsal = 'patroli';
  document.getElementById('judulKamera').textContent = 'Foto Lokasi Patroli';
  document.getElementById('btnCapture').innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Ambil Foto';
  currentLocation.alamat = 'Mengunci Posisi Satelit...';
  dapatkanLokasiGPS();
  openCam();
}

function bukaKameraKejadian() {
  currentCamMode = 'kejadian';
  modalAsal = 'kejadian';
  document.getElementById('judulKamera').textContent = 'Foto Bukti Kejadian';
  document.getElementById('btnCapture').innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Ambil Foto';
  currentLocation.alamat = 'Mengunci Posisi Satelit...';
  dapatkanLokasiGPS();
  openCam();
}

function openCam() {
  const modal = document.getElementById('modalCam');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  startTimemark();

  const video = document.getElementById('video');
  const isSelfie = (currentCamMode === 'absen');

  video.style.transform = isSelfie ? 'scaleX(-1)' : 'none';
  document.getElementById('canvas').style.transform = isSelfie ? 'scaleX(-1)' : 'none';

  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: isSelfie ? 'user' : 'environment' },
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 }
    }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(s => {
      stream = s;
      video.srcObject = s;
      video.setAttribute('playsinline', true);
      video.muted = true;
      video.onloadedmetadata = () => {
        video.play().catch(e => console.log('play error', e));
      };
    })
    .catch(err => {
      toast('Kamera error: ' + err.message + ' - pakai Safari ya');
      closeCam();
    });
}

function closeCam() {
  const modal = document.getElementById('modalCam');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (animationFrame) cancelAnimationFrame(animationFrame);
  
  if (modalAsal === 'patroli') {
    document.getElementById('modalPatroli').classList.replace('hidden', 'flex');
  } else if (modalAsal === 'kejadian') {
    document.getElementById('modalKejadian').classList.replace('hidden', 'flex');
  }
  modalAsal = '';
}

async function capture() {
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

  const scale = Math.max(width / 640, 1); // Minimal scale 1 agar tidak kekecilan

// === WATERMARK BOX (DIPERBESAR) ===
const wmPadding = 14 * scale;
const wmBoxWidth = 340 * scale;
const wmBoxHeight = 120 * scale;
const wmX = 12 * scale;
const wmY = height - wmBoxHeight - 12 * scale;

// Background hitam transparan
ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
ctx.fillRect(wmX, wmY, wmBoxWidth, wmBoxHeight);

// Border merah di kiri (aksen)
ctx.fillStyle = "#dc2626";
ctx.fillRect(wmX, wmY, 6 * scale, wmBoxHeight);

// Border atas tipis
ctx.fillStyle = "rgba(255,255,255,0.15)";
ctx.fillRect(wmX, wmY, wmBoxWidth, 2 * scale);

// Posisi teks
const textX = wmX + wmPadding + 6 * scale;
let textY = wmY + 26 * scale;

// Baris 1: Tanggal
ctx.fillStyle = "#ffffff";
ctx.font = `bold ${15 * scale}px Arial`;
ctx.fillText(
  new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
  textX, textY
);

// Baris 2: Jam (lebih besar & kuning)
textY += 26 * scale;
ctx.fillStyle = "#facc15";
ctx.font = `bold ${22 * scale}px Arial`;
ctx.fillText(new Date().toLocaleTimeString('id-ID'), textX, textY);

// Baris 3: Nama
textY += 24 * scale;
ctx.fillStyle = "#ffffff";
ctx.font = `bold ${13 * scale}px Arial`;
ctx.fillText(`Nama: ${user.nama}`, textX, textY);

// Baris 4: GPS
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
      long: currentLocation.long
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

function startTimemark() {
  if (animationFrame) cancelAnimationFrame(animationFrame);

  function update() {
    const hariEl = document.getElementById('previewHari');
    const jamEl = document.getElementById('previewJam');
    const namaEl = document.getElementById('previewNama');
    const gpsEl = document.getElementById('previewGps');

    if (hariEl && jamEl && namaEl) {
      const now = new Date();
      hariEl.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      jamEl.innerText = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      namaEl.innerText = user ? `👤 ${user.nama}` : '';
      if (gpsEl) gpsEl.innerText = `📍 ${currentLocation.alamat}`;
    }

    const modalCam = document.getElementById('modalCam');
    if (modalCam && !modalCam.classList.contains('hidden')) {
      animationFrame = requestAnimationFrame(update);
    }
  }
  update();
}

// ============================================
// REKAP PAGE
// ============================================
function renderRekap() {
  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Rekap Absensi</h2>
      <button onclick="loadRekap()" class="bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-900 transition">
        <i class="fa-solid fa-refresh mr-1"></i>Refresh
      </button>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Bulan: ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <p class="text-2xl font-bold text-green-600" id="totalHadir">-</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Hadir</p>
        </div>
        <div class="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
          <p class="text-2xl font-bold text-yellow-600" id="totalIzin">-</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Izin</p>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          <p class="text-2xl font-bold text-red-600" id="totalAlpha">-</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Alpha</p>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <p class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Riwayat Absensi Anda</p>
      <div class="space-y-2" id="listRekap">
        <div class="text-center text-gray-400 py-8">
          <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p class="text-sm">Loading data...</p>
        </div>
      </div>
    </div>
  </div>`;
}

async function loadRekap() {
  const listEl = document.getElementById('listRekap');
  if (listEl) listEl.innerHTML = '<div class="text-center text-gray-400 py-8"><i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i><p class="text-sm">Loading...</p></div>';

  try {
    const res = await api('getRekap', { username: user.username });

    if (res.status === 'success') {
      dataRekap = res.data || [];

      let hadir = 0;
      dataRekap.forEach(r => {
        if (r.keterangan === 'IN' && r.jam && r.jam !== '--:--') hadir++;
      });

      document.getElementById('totalHadir').textContent = hadir;
      document.getElementById('totalIzin').textContent = 0;
      document.getElementById('totalAlpha').textContent = 0;

      if (dataRekap.length > 0) {
        const grouped = {};
        dataRekap.forEach(r => {
          const d = new Date(r.tanggal + 'T00:00:00');
          const tglKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          if (!grouped[tglKey]) grouped[tglKey] = [];
          grouped[tglKey].push(r);
        });

        const last7Keys = Object.keys(grouped).sort().slice(-7).reverse();

        listEl.innerHTML = last7Keys.map(key => {
          const records = grouped[key];
          const masuk = records.find(r => r.keterangan === 'IN');
          const pulang = records.find(r => r.keterangan === 'OUT');

          const tglObj = new Date(records[0].tanggal + 'T00:00:00');
          const tglFormat = tglObj.toLocaleDateString('id-ID', {
            weekday: 'short', day: '2-digit', month: 'short'
          });

          return `
            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">${tglFormat}</p>
              <div class="flex justify-between items-center mb-1">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                    <i class="fa-solid fa-sign-in-alt text-xs"></i>
                  </div>
                  <span class="text-sm text-gray-700 dark:text-gray-300">Masuk</span>
                </div>
                <p class="text-sm font-bold text-gray-800 dark:text-white">${masuk?.jam || '--:--'}</p>
              </div>
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                    <i class="fa-solid fa-sign-out-alt text-xs"></i>
                  </div>
                  <span class="text-sm text-gray-700 dark:text-gray-300">Pulang</span>
                </div>
                <p class="text-sm font-bold text-gray-800 dark:text-white">${pulang?.jam || '--:--'}</p>
              </div>
            </div>
          `;
        }).join('');
      } else {
        listEl.innerHTML = `
          <div class="text-center text-gray-400 py-8">
            <i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i>
            <p class="text-sm">Belum ada data absensi</p>
          </div>
        `;
      }
    } else {
      throw new Error(res.message || 'Unknown error');
    }
  } catch (err) {
    console.error('Load rekap error:', err);
    listEl.innerHTML = `
      <div class="text-center text-red-400 py-8">
        <i class="fa-solid fa-circle-exclamation text-3xl mb-2"></i>
        <p class="text-sm">Gagal memuat data</p>
        <p class="text-xs mt-1">${err.message}</p>
      </div>
    `;
  }
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
        <div class="text-center text-gray-400 py-8">
          <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p class="text-sm">Loading data...</p>
        </div>
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
      return `
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <p class="text-sm font-bold text-gray-800 dark:text-white">${p.lokasi}</p>
              <p class="text-xs text-red-600 dark:text-red-400 font-semibold">Petugas: ${p.nama}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${tgl}</p>
            </div>
            ${p.foto ? `<img src="${p.foto}" onclick="bukaZoom('${p.foto}')" class="w-12 h-12 rounded-lg object-cover ml-2 cursor-pointer">` : ''}
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300">${p.keterangan || '-'}</p>
        </div>
      `;
    }).join('');
  } else {
    listEl.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <i class="fa-solid fa-route text-3xl mb-2"></i>
        <p class="text-sm">Belum ada data patroli</p>
      </div>
    `;
  }
}

function openFormPatroli() {
  document.getElementById('modalPatroli').classList.replace('hidden', 'flex');
}

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

  if (!lokasi) {
    toast('Lokasi wajib diisi');
    btn.disabled = false;
    btn.innerHTML = 'Simpan Patroli';
    return;
  }
  if (!fotoBase64) {
    toast('Foto bukti wajib diambil');
    btn.disabled = false;
    btn.innerHTML = 'Simpan Patroli';
    return;
  }

  const res = await api('tambahPatroli', {
    username: user.username,
    lokasi: lokasi,
    keterangan: ket,
    foto: fotoBase64,
    lat: currentLocation.lat,
    long: currentLocation.long
  });

  if (res.status === 'success') {
    toast(res.message);
    closeFormPatroli();
    loadPatroli();
  } else {
    toast(res.message);
  }

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
        <div class="text-center text-gray-400 py-8">
          <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p class="text-sm">Loading data...</p>
        </div>
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
      return `
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <p class="text-sm font-bold text-red-600">${k.jenis}</p>
              <p class="text-xs text-red-600 dark:text-red-400 font-semibold">Pelapor: ${k.nama}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${tgl} - ${k.lokasi}</p>
            </div>
            ${k.foto ? `<img src="${k.foto}" onclick="bukaZoom('${k.foto}')" class="w-12 h-12 rounded-lg object-cover ml-2 cursor-pointer">` : ''}
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300">${k.kronologi}</p>
        </div>
      `;
    }).join('');
  } else {
    listEl.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
        <p class="text-sm">Belum ada laporan kejadian</p>
      </div>
    `;
  }
}

function openFormKejadian() {
  document.getElementById('modalKejadian').classList.replace('hidden', 'flex');
}

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

  if (!jenis || !lokasi || !kronologi) {
    toast('Jenis, Lokasi, dan Kronologi wajib diisi');
    btn.disabled = false;
    btn.innerHTML = 'Kirim Laporan';
    return;
  }
  if (!fotoBase64) {
    toast('Foto bukti wajib diambil');
    btn.disabled = false;
    btn.innerHTML = 'Kirim Laporan';
    return;
  }

  const res = await api('tambahKejadian', {
    username: user.username,
    jenis: jenis,
    lokasi: lokasi,
    kronologi: kronologi,
    foto: fotoBase64,
    lat: currentLocation.lat,
    long: currentLocation.long
  });

  if (res.status === 'success') {
    toast(res.message);
    closeFormKejadian();
    loadKejadian();
  } else {
    toast(res.message);
  }

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
        <div class="text-center text-gray-400 py-8">
          <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p class="text-sm">Loading data...</p>
        </div>
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
      return `
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <p class="text-sm font-bold text-gray-800 dark:text-white">${p.materi}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${tgl} - ${p.pelatih}</p>
            </div>
            <div class="bg-red-800 text-white px-3 py-1 rounded-full">
              <p class="text-sm font-bold">${p.nilai}</p>
            </div>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300">${p.keterangan || '-'}</p>
        </div>
      `;
    }).join('');
  } else {
    listEl.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <i class="fa-solid fa-user-graduate text-3xl mb-2"></i>
        <p class="text-sm">Belum ada data pembinaan</p>
      </div>
    `;
  }
}

function openFormPembinaan() {
  document.getElementById('modalPembinaan').classList.replace('hidden', 'flex');
}

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

  if (!materi || !pelatih || !nilai) {
    toast('Materi, Pelatih, dan Nilai wajib diisi');
    btn.disabled = false;
    btn.innerHTML = 'Simpan';
    return;
  }

  const res = await api('tambahPembinaan', {
    username: user.username,
    materi: materi,
    pelatih: pelatih,
    nilai: nilai,
    keterangan: ket
  });

  if (res.status === 'success') {
    toast(res.message);
    closeFormPembinaan();
    loadPembinaan();
  } else {
    toast(res.message);
  }

  btn.disabled = false;
  btn.innerHTML = 'Simpan';
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
        if (gpsEl) gpsEl.innerText = `📍 ${currentLocation.alamat}`;
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
    const res = await fetch(URL_GAS, {
      method: 'POST',
      body: JSON.stringify({ action, ...data })
    });
    return await res.json();
  } catch (e) {
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
console.log('Starting app...');
history.pushState({ page: currentPage }, '', '');
render();
