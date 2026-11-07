const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function stopApp() {
  const appRoot = path.resolve(__dirname, '..');
  const pidFile = path.join(appRoot, '.pecut.pid');
  let killed = false;

  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      if (pid && !isNaN(pid)) {
        process.kill(pid, 'SIGTERM');
        console.log(`✅ Berhasil menghentikan proses pecut-semua-ai (PID: ${pid}).`);
        killed = true;
      }
    } catch (e) {
      // ignore
    }
    try {
      fs.unlinkSync(pidFile);
    } catch (e) {}
  }

  // Backup kill jika proses masih ada
  if (process.platform === 'linux' || process.platform === 'darwin') {
    try {
      execSync('pkill -f "electron.*pecut-semua-ai"', { stdio: 'ignore' });
      killed = true;
    } catch (e) {}
  }

  if (killed) {
    console.log('⚡ pecut-semua-ai telah dinonaktifkan.');
  } else {
    console.log('ℹ️ Tidak ada proses pecut-semua-ai yang sedang aktif.');
  }
}

stopApp();
