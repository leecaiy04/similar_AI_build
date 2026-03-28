import SftpClient from 'ssh2-sftp-client';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getPassword = () => new Promise((resolve) => {
  if (process.env.SFTP_PASS) {
     resolve(process.env.SFTP_PASS);
  } else {
     // 如果在自动化流水线 (CI) 环境中缺少环境变量，不要尝试询问，直接报错中断，防止 Node.js 因 stdin EOF 导致 0s 静默退出并抛出成功的假象
     if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITEA_ACTIONS || !process.stdout.isTTY) {
       console.error('\n❌ [严重错误]: 在自动化部署流水线中未检测到可用密码！');
       console.error('👉 解决办法: 请前往 Gitea 项目设置 (Settings) -> 动作 (Actions) -> Secrets 中添加名为 `SFTP_PASS` 的变量，并填入您的 SFTP 密码。\n');
       process.exit(1);
     }
     rl.question('🔐 请输入 leecaiy@192.168.3.200 的 SFTP 密码 (通过环境变量 SET SFTP_PASS=xxx 可免输): ', (answer) => {
       resolve(answer);
     });
  }
});

const localDir = path.join(__dirname, 'dist');
const localTauriDir = path.join(__dirname, 'bin-tauri');
const remoteDir = '/vol1/1000/1panel/1panel/www/sites/similar.lee/index';
const remoteTauriDir = '/vol1/1000/1panel/1panel/www/sites/similar.lee/releases';

async function main() {
  const password = await getPassword();
  rl.close();

  const config = {
    host: process.env.SFTP_HOST || '192.168.3.200',
    port: process.env.SFTP_PORT ? parseInt(process.env.SFTP_PORT) : 22,
    username: process.env.SFTP_USER || 'leecaiy',
    password: password
  };

  const sftp = new SftpClient();
  try {
    console.log('Connecting to ' + config.host + ' via SFTP...');
    await sftp.connect(config);
    console.log('Connected successfully. Starting directory upload...');
    
    // Attempting to clear the directory, catching errors if it's empty or doesn't exist
    try {
      const exists = await sftp.exists(remoteDir);
      if (exists) {
        console.log(`Clearing target directory: ${remoteDir}`);
        await sftp.rmdir(remoteDir, true); // true for recursive removal
      }
      await sftp.mkdir(remoteDir, true);
    } catch(e) {
      console.log('Setup remote dir warning (can be safely ignored format limits):', e.message);
    }

    // Upload dist contents into remoteDir
    await sftp.uploadDir(localDir, remoteDir);
    console.log('Web files successfully uploaded to ' + remoteDir);

    // Upload Tauri binaries into remoteTauriDir
    if (fs.existsSync(localTauriDir)) {
      console.log(`Uploading Tauri binaries from ${localTauriDir}...`);
      // Optional: Clear old releases? Maybe keep them?
      // For now, just make sure directory exists and upload.
      await sftp.mkdir(remoteTauriDir, true);
      await sftp.uploadDir(localTauriDir, remoteTauriDir);
      console.log('All Tauri binaries successfully uploaded to ' + remoteTauriDir);
    } else {
      console.log('No Tauri binaries found in bin-tauri, skipping...');
    }
  } catch (err) {
    console.error('Error during SFTP deployment:', err);
    process.exit(1);
  } finally {
    sftp.end();
  }
}

main();
