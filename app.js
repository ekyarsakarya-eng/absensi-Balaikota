const URL_GAS = 'https://script.google.com/macros/s/AKfycbySOy0DGZWfuTLBjPQlgau1VSgOlMf9fi9z_Sx1jJAQDbI_Uyu5WXDEhDHqYOVpZJSM/exec';
console.log('App.js loaded - v1 FIXED');

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

// === PWA INSTALL === 
let deferredPrompt;
const installPopup = document.getElementById('installPopup');
const btnInstall = document.getElementById('btnInstall');

const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone ||
  document.referrer.includes('android-app://');

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt fired'); // Buat debug
  e.preventDefault();
  deferredPrompt = e;
  if (!isInStandaloneMode()) {
    installPopup.classList.remove('hidden');
    installPopup.classList.add('flex');
  }
});

btnInstall?.addEventListener('click', async () => {
  installPopup.classList.add('hidden');
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User: ${outcome}`);
  deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // INI YANG BENER: pake path absolut
    navigator.serviceWorker.register('/absensi-Balaikota/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(e => console.log('SW failed:', e));
  });
}

if (isInStandaloneMode()) installPopup?.classList.add('hidden');

const app = document.getElementById('app');
if(!app) console.error('Div #app tidak ditemukan!');

if (isDark) document.documentElement.classList.add('dark');

function render() {
  if (!user) return renderLogin();
  renderDashboard();
}

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
  if (!username ||!password) return toast('Username & password wajib diisi');
  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Memproses...';
  const res = await api('login', {username, password});
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
  isDark =!isDark;
  localStorage.setItem('dark', isDark);
  document.documentElement.classList.toggle('dark');
  document.getElementById('darkIcon').className = `fa-solid ${isDark? 'fa-sun' : 'fa-moon'} text-xl`;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm z-[999]';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

function renderDashboard() {
  app.innerHTML = `
  <nav class="bg-red-800 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-10">
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-user-shield text-xl"></i>
      <div>
        <h1 class="font-bold text-lg leading-tight">Hi, ${user.nama}</h1>
        <p class="text-xs opacity-80">${new Date().toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
      </div>
    </div>
    <div class="flex gap-3 items-center">
      <button onclick="toggleDark()" class="hover:bg-red-900 p-2 rounded-lg transition">
        <i id="darkIcon" class="fa-solid ${isDark? 'fa-sun' : 'fa-moon'} text-xl"></i>
      </button>
      <button onclick="openProfil()" class="flex items-center gap-2 hover:bg-red-900 p-1 pr-3 rounded-full transition">
        <img id="avatarNav" src="${user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=800000&color=fff'}"
             class="w-9 h-9 rounded-full object-cover border-2 border-white">
      </button>
    </div>
  </nav>

  <div id="contentArea" class="p-4 max-w-2xl mx-auto pb-32">
    ${renderPage()}
  </div>

  <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-lg z-20">
    <div class="grid grid-cols-5 gap-1 max-w-2xl mx-auto">
      <button onclick="switchPage('home')" class="flex flex-col items-center py-2 ${currentPage==='home'?'text-red-800':'text-gray-500'}">
        <i class="fa-solid fa-house text-xl mb-1"></i>
        <span class="text-xs font-semibold">Home</span>
      </button>
      <button onclick="switchPage('rekap')" class="flex flex-col items-center py-2 ${currentPage==='rekap'?'text-red-800':'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-rekap.png" class="w-6 h-6 mb-1 ${currentPage==='rekap'?'':'opacity-50'}">
        <span class="text-xs font-semibold">Rekap</span>
      </button>
      <button onclick="switchPage('patroli')" class="flex flex-col items-center py-2 ${currentPage==='patroli'?'text-red-800':'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-patroli.png" class="w-6 h-6 mb-1 ${currentPage==='patroli'?'':'opacity-50'}">
        <span class="text-xs font-semibold">Patroli</span>
      </button>
      <button onclick="switchPage('kejadian')" class="flex flex-col items-center py-2 ${currentPage==='kejadian'?'text-red-800':'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-kejadian.png" class="w-6 h-6 mb-1 ${currentPage==='kejadian'?'':'opacity-50'}">
        <span class="text-xs font-semibold">Kejadian</span>
      </button>
      <button onclick="switchPage('pembinaan')" class="flex flex-col items-center py-2 ${currentPage==='pembinaan'?'text-red-800':'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-Balaikota/main/icon-pembinaan.png" class="w-6 h-6 mb-1 ${currentPage==='pembinaan'?'':'opacity-50'}">
        <span class="text-xs font-semibold">Pembinaan</span>
      </button>
    </div>
  </div>

  <!-- MODAL KAMERA -->
  <div id="modalCam" class="fixed inset-0 bg-black/90 hidden items-center justify-center p-4 z-[70]">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-md">
      <h3 class="font-bold text-lg mb-3 text-red-800 dark:text-white text-center">
        <i class="fa-solid fa-camera mr-2"></i><span id="judulKamera">Ambil Foto</span>
      </h3>
      <div style="position:relative">
        <video id="video" class="w-full rounded-lg bg-black" autoplay playsinline></video>
        <canvas id="canvas" class="hidden w-full rounded-lg"></canvas>
        <div id="timemarkPreview" class="absolute bottom-2 left-2 bg-black/70 border-l-4 border-red-800 px-3 py-2 rounded text-white text- font-semibold z-10 space-y-0.5">
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
            <img id="fotoProfil" src="${user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=fff&color=800000&size=256'}" class="w-24 h-24 rounded-2xl object-cover mx-auto border-4 border-white shadow-2xl">
            <button onclick="gantiFotoProfil()" class="absolute -bottom-1 -right-1 bg-white text-red-800 w-9 h-9 rounded-xl shadow-xl flex items-center justify-center"><i class="fa-solid fa-camera"></i></button>
          </div>
          <h3 class="font-extrabold text-xl text-white mb-1">${user.nama}</h3>
          <p class="text-sm text-white/90 font-medium">@${user.username}</p>
        </div>
      </div>
      <div class="p-4 space-y-2">
        <button onclick="openEditProfil()" class="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition"><div class="w-12 h-12 bg-red-800/10 text-red-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-user-pen"></i></div><div class="text-left flex-1"><p class="font-bold text-sm text-gray-900 dark:text-white">Edit Profil</p></div><i class="fa-solid fa-chevron-right text-gray-400"></i></button>
        <button onclick="openGantiPassword()" class="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition"><div class="w-12 h-12 bg-red-800/10 text-red-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-key"></i></div><div class="text-left flex-1"><p class="font-bold text-sm text-gray-900 dark:text-white">Ganti Password</p></div><i class="fa-solid fa-chevron-right text-gray-400"></i></button>
        <button onclick="logout()" class="w-full flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl transition"><div class="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center"><i class="fa-solid fa-right-from-bracket"></i></div><div class="text-left flex-1"><p class="font-bold text-sm text-red-600">Logout</p></div><i class="fa-solid fa-chevron-right text-gray-400"></i></button>
      </div>
      <input type="file" id="inputFotoProfil" accept="image/*" class="hidden" onchange="uploadFotoProfil(event)">
    </div>
  </div>

  <!-- MODAL EDIT PROFIL -->
  <div id="modalEditProfil" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h- flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between"><h3 class="font-bold text-lg text-white">Edit Profil</h3><button onclick="closeEditProfil()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Nama Lengkap</label><input id="editNama" value="${user.nama||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">No KTP</label><input id="editKtp" value="${user.ktp||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">No HP</label><input id="editHp" value="${user.hp||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Alamat</label><textarea id="editAlamat" rows="2" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white">${user.alamat||''}</textarea></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Tempat, Tgl Lahir</label><input id="editTtl" value="${user.ttl||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs font-bold text-red-800 block mb-1">Bank</label><input id="editBank" value="${user.bank||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
          <div><label class="text-xs font-bold text-red-800 block mb-1">No Rekening</label><input id="editRek" value="${user.rekening||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        </div>
      </div>
      <div class="p-4"><button onclick="simpanProfil()" id="btnSimpanProfil" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Simpan</button></div>
    </div>
  </div>

  <!-- MODAL GANTI PASSWORD -->
  <div id="modalGantiPassword" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
      <div class="bg-red-800 px-5 py-4 flex items-center justify-between"><h3 class="font-bold text-lg text-white">Ganti Password</h3><button onclick="closeGantiPassword()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
      <div class="p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Password Lama</label><input id="passLama" type="password" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm outline-none focus:border-red-800 dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Password Baru</label><input id="passBaru" type="password" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm outline-none focus:border-red-800 dark:text-white"></div>
        <button onclick="gantiPassword()" id="btnGantiPass" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Update</button>
      </div>
    </div>
  </div>

  <!-- MODAL INPUT PATROLI -->
  <div id="modalPatroli" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h- flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between"><h3 class="font-bold text-lg text-white">Input Patroli</h3><button onclick="closeFormPatroli()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
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
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h- flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between"><h3 class="font-bold text-lg text-white">Lapor Kejadian</h3><button onclick="closeFormKejadian()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
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
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h- flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between"><h3 class="font-bold text-lg text-white">Input Pembinaan</h3><button onclick="closeFormPembinaan()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Materi Pembinaan</label><input id="pembinaanMateri" placeholder="Contoh: SOP Keamanan" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Nama Pelatih</label><input id="pembinaanPelatih" placeholder="Nama pelatih/instruktur" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Nilai</label><input id="pembinaanNilai" type="number" min="0" max="100" placeholder="0-100" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Keterangan</label><textarea id="pembinaanKet" rows="3" placeholder="Catatan tambahan..." class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white"></textarea></div>
      </div>
      <div class="p-4"><button onclick="simpanPembinaan()" id="btnSimpanPembinaan" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Simpan</button></div>
    </div>
  </div>`;

  if (currentPage === 'home') {
    cekStatus();
    dapatkanLokasiGPS();
  }
  if (currentPage === 'rekap') loadRekap();
  if (currentPage === 'patroli') loadPatroli();
  if (currentPage === 'kejadian') loadKejadian();
  if (currentPage === 'pembinaan') loadPembinaan();
}

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

  let facingMode = 'user';
  if (currentCamMode === 'patroli' || currentCamMode === 'kejadian') {
    facingMode = 'environment';
  }

  navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: facingMode }, 
    audio: false 
  })
.then(s => {
      stream = s;
      document.getElementById('video').srcObject = s;
    })
.catch(err => {
      console.log('getUserMedia gagal:', err);
      toast('Izin kamera diblokir, pakai kamera HP...');
      closeCam();
      // === FALLBACK UNTUK VIVO Y19 ===
      let fallback = document.getElementById('fallbackCamera');
      if (!fallback) {
        fallback = document.createElement('input');
        fallback.type = 'file';
        fallback.id = 'fallbackCamera';
        fallback.accept = 'image/*';
        fallback.capture = 'environment';
        fallback.style.display = 'none';
        document.body.appendChild(fallback);
      }
      fallback.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const img = await createImageBitmap(file);
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 800;
        let w = img.width, h = img.height;
        if (w > MAX_WIDTH) { h = Math.round(h * MAX_WIDTH / w); w = MAX_WIDTH; }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        // timemark sederhana
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(8, h-70, 260, 60);
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.fillText(new Date().toLocaleString('id-ID'), 15, h-45);
        ctx.fillText(user.nama, 15, h-25);
        const fotoBase64 = canvas.toDataURL('image/jpeg', 0.75);
        if (currentCamMode === 'absen') {
          const res = await api('absen', { username: user.username, tipeAbsen: currentType, foto: fotoBase64, lat: currentLocation.lat, long: currentLocation.long });
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
      };
      fallback.click();
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

  if (!video ||!canvas) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Proses...';

  const ctx = canvas.getContext('2d');
  // === FIX VIVO Y19: max 800px ===
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

  // TIMEMARK diperkecil
  const scale = width / 640;
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(8 * scale, height - 85 * scale, 280 * scale, 75 * scale);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${11 * scale}px Arial`;
  ctx.fillText(new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }), 18 * scale, height - 62 * scale);
  ctx.fillStyle = "#facc15";
  ctx.font = `bold ${13 * scale}px Arial`;
  ctx.fillText(new Date().toLocaleTimeString('id-ID'), 18 * scale, height - 44 * scale);
  ctx.fillStyle = "#ffffff";
  ctx.font = `${10 * scale}px Arial`;
  ctx.fillText(`Nama: ${user.nama}`, 18 * scale, height - 28 * scale);
  ctx.fillStyle = "#4ade80";
  ctx.font = `9px Courier New`;
  ctx.fillText(`GPS: ${currentLocation.lat},${currentLocation.long}`, 18 * scale, height - 13 * scale);

  // === KOMPRES JADI 75% ===
  const fotoBase64 = canvas.toDataURL('image/jpeg', 0.75);
  closeCam();

  if (currentCamMode === 'absen') {
    const kirimData = {
      username: user.username,
      tipeAbsen: currentType,
      foto: fotoBase64,
      lat: currentLocation.lat,
      long: currentLocation.long
    };
    const res = await api('absen', kirimData);
    toast(res.message);
    if (res.status === 'success') cekStatus();
  } else if (currentCamMode === 'patroli') {
    document.getElementById('patroliFotoBase64').value = fotoBase64;
    document.getElementById('previewPatroli').innerHTML = `<img src="${fotoBase64}" class="w-full h-full object-cover">`;
    toast('Foto patroli berhasil diambil');
  } else if (currentCamMode === 'kejadian') {
    document.getElementById('kejadianFotoBase64').value = fotoBase64;
    document.getElementById('previewKejadian').innerHTML = `<img src="${fotoBase64}" class="w-full h-full object-cover">`;
    toast('Foto kejadian berhasil diambil');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Ambil Foto';
}
