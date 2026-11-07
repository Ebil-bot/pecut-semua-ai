const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Globals ─────────────────────────────────────────────────────────────────
let tray = null;
let overlay = null;
let overlayReady = false;
let spawnQueued = false;
let crackCounter = 0;

// ── Persistent Configuration ────────────────────────────────────────────────
const configDir = path.join(os.homedir(), '.config', 'pecut-semua-ai');
const configFile = path.join(configDir, 'config.json');

const defaultConfig = {
  crackSpeed: 340,       // 240 = Ringan, 340 = Normal, 460 = Butuh Tenaga
  soundEnabled: true,
  segments: 28,          // 20 = Pendek, 28 = Standar, 38 = Panjang
  sparksEnabled: true,
};

let currentConfig = { ...defaultConfig };

function loadConfig() {
  try {
    if (fs.existsSync(configFile)) {
      const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      currentConfig = { ...defaultConfig, ...data };
    }
  } catch (e) {
    // Gunakan defaultConfig jika error membaca
  }
}

function saveConfig() {
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configFile, JSON.stringify(currentConfig, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

function applyConfigToOverlay() {
  if (overlay && overlay.webContents && overlayReady) {
    overlay.webContents.send('config-changed', currentConfig);
  }
}

// ── Tray Icon ───────────────────────────────────────────────────────────────
function createTrayIconFallback() {
  const p = path.join(__dirname, 'icon', 'Template.png');
  if (fs.existsSync(p)) {
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) {
      if (process.platform === 'darwin') img.setTemplateImage(true);
      return img;
    }
  }
  return nativeImage.createEmpty();
}

async function tryIcnsTrayImage(icnsPath) {
  const size = { width: 64, height: 64 };
  try {
    const thumb = await nativeImage.createThumbnailFromPath(icnsPath, size);
    if (!thumb.isEmpty()) return thumb;
  } catch (e) {
    // ignore
  }
  return null;
}

async function getTrayIcon() {
  const iconDir = path.join(__dirname, 'icon');
  if (process.platform === 'win32') {
    const file = path.join(iconDir, 'icon.ico');
    if (fs.existsSync(file)) {
      const img = nativeImage.createFromPath(file);
      if (!img.isEmpty()) return img;
    }
    return createTrayIconFallback();
  }
  if (process.platform === 'darwin') {
    const file = path.join(iconDir, 'AppIcon.icns');
    if (fs.existsSync(file)) {
      const thumb = await tryIcnsTrayImage(file);
      if (thumb) return thumb;
    }
    return createTrayIconFallback();
  }
  // Linux & default
  return createTrayIconFallback();
}

// ── Overlay Window ──────────────────────────────────────────────────────────
function createOverlay() {
  const { bounds } = screen.getPrimaryDisplay();
  overlay = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlayReady = false;
  overlay.loadFile('overlay.html');

  overlay.webContents.on('did-finish-load', () => {
    overlayReady = true;
    applyConfigToOverlay();
    if (spawnQueued && overlay && overlay.isVisible()) {
      spawnQueued = false;
      overlay.webContents.send('spawn-whip');
    }
  });

  overlay.on('closed', () => {
    overlay = null;
    overlayReady = false;
    spawnQueued = false;
  });
}

function toggleOverlay() {
  if (overlay && overlay.isVisible()) {
    overlay.webContents.send('drop-whip');
    return;
  }
  if (!overlay) createOverlay();
  overlay.show();
  if (overlayReady) {
    overlay.webContents.send('spawn-whip');
  } else {
    spawnQueued = true;
  }
}

// ── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('whip-crack', () => {
  crackCounter++;
  if (tray) updateMenu();
});

ipcMain.on('hide-overlay', () => {
  if (overlay) overlay.hide();
});

// ── Menu Context Tray ───────────────────────────────────────────────────────
function updateMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    { label: '⚡ pecut-semua-ai', enabled: false },
    { label: `💥 Total Pecutan: ${crackCounter}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Tampilkan / Lepas Pecutan',
      click: () => toggleOverlay(),
    },
    {
      label: 'Sembunyikan Overlay',
      click: () => {
        if (overlay) overlay.hide();
      },
    },
    { type: 'separator' },
    {
      label: '🎚️ Sensitivitas Lecutan',
      submenu: [
        {
          label: 'Ringan (Sensitif - 240px)',
          type: 'radio',
          checked: currentConfig.crackSpeed === 240,
          click: () => {
            currentConfig.crackSpeed = 240;
            saveConfig();
            applyConfigToOverlay();
          },
        },
        {
          label: 'Normal (Standar - 340px)',
          type: 'radio',
          checked: currentConfig.crackSpeed === 340,
          click: () => {
            currentConfig.crackSpeed = 340;
            saveConfig();
            applyConfigToOverlay();
          },
        },
        {
          label: 'Butuh Tenaga (Keras - 460px)',
          type: 'radio',
          checked: currentConfig.crackSpeed === 460,
          click: () => {
            currentConfig.crackSpeed = 460;
            saveConfig();
            applyConfigToOverlay();
          },
        },
      ],
    },
    {
      label: '🔊 Suara Lecutan',
      submenu: [
        {
          label: 'Suara Aktif',
          type: 'checkbox',
          checked: currentConfig.soundEnabled,
          click: (item) => {
            currentConfig.soundEnabled = item.checked;
            saveConfig();
            applyConfigToOverlay();
          },
        },
      ],
    },
    {
      label: '📏 Panjang Cambuk',
      submenu: [
        {
          label: 'Pendek (20 ruas)',
          type: 'radio',
          checked: currentConfig.segments === 20,
          click: () => {
            currentConfig.segments = 20;
            saveConfig();
            applyConfigToOverlay();
          },
        },
        {
          label: 'Standar (28 ruas)',
          type: 'radio',
          checked: currentConfig.segments === 28,
          click: () => {
            currentConfig.segments = 28;
            saveConfig();
            applyConfigToOverlay();
          },
        },
        {
          label: 'Panjang (38 ruas)',
          type: 'radio',
          checked: currentConfig.segments === 38,
          click: () => {
            currentConfig.segments = 38;
            saveConfig();
            applyConfigToOverlay();
          },
        },
      ],
    },
    {
      label: '✨ Percikan Api (Sparks)',
      submenu: [
        {
          label: 'Efek Percikan Aktif',
          type: 'checkbox',
          checked: currentConfig.sparksEnabled,
          click: (item) => {
            currentConfig.sparksEnabled = item.checked;
            saveConfig();
            applyConfigToOverlay();
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: '🌐 Buka Web Simulator di Browser',
      click: () => {
        shell.openExternal('http://localhost:3300');
      },
    },
    { type: 'separator' },
    {
      label: 'Keluar (Quit)',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// ── App Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  loadConfig();
  const icon = await getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('pecut-semua-ai (Klik kiri: Pecut | Klik kanan: Parameter)');

  updateMenu();
  tray.on('click', () => {
    toggleOverlay();
    updateMenu();
  });

  console.log('[pecut-semua-ai] Berjalan di system tray! Klik kiri untuk mecut, klik kanan untuk parameter.');
});

app.on('before-quit', () => {
  const pidFile = path.join(__dirname, '.pecut.pid');
  try {
    if (fs.existsSync(pidFile)) {
      const savedPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      if (savedPid === process.pid) fs.unlinkSync(pidFile);
    }
  } catch (e) {}
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
