const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ensureElectron } = require('./ensure-electron');

async function startBackground() {
  const ready = await ensureElectron();
  if (!ready) {
    console.error('❌ Gagal menyiapkan biner Electron.');
    process.exit(1);
  }

  const electronPath = require('electron');
  const appRoot = path.resolve(__dirname, '..');
  const pidFile = path.join(appRoot, '.pecut.pid');

  // Periksa apakah sudah ada proses yang berjalan
  if (fs.existsSync(pidFile)) {
    try {
      const oldPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      if (oldPid && !isNaN(oldPid)) {
        // Cek apakah proses masih hidup
        process.kill(oldPid, 0);
        console.log(`⚠️ pecut-semua-ai sudah berjalan di latar belakang (PID: ${oldPid}).`);
        console.log('💡 Untuk menghentikan: npm run stop\n');
        process.exit(0);
      }
    } catch (e) {
      // Proses lama sudah mati, hapus file pid lama
      try { fs.unlinkSync(pidFile); } catch (err) {}
    }
  }

  // Spawn detached process
  const child = spawn(electronPath, [appRoot], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });

  // Simpan PID
  fs.writeFileSync(pidFile, String(child.pid), 'utf8');

  // Lepaskan dari terminal parent
  child.unref();

  console.log('\n======================================================');
  console.log('⚡ pecut-semua-ai aktif di latar belakang (Background)!');
  console.log(`📌 Process ID (PID): ${child.pid}`);
  console.log('🐴 Ikon cambuk sudah muncul di System Tray Anda.');
  console.log('======================================================');
  console.log('✅ Terminal ini sudah bebas ditutup tanpa mematikan aplikasi.');
  console.log('💡 Untuk menghentikan aplikasi:');
  console.log('   - Klik kanan ikon tray -> Keluar, ATAU');
  console.log('   - Jalankan perintah: npm run stop\n');

  process.exit(0);
}

startBackground().catch((err) => {
  console.error('Gagal menjalankan background:', err.message);
  process.exit(1);
});
