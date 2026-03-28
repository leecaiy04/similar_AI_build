import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('--- SSH Connected ---');
  // 检查 docker 容器挂载和 Nginx 配置
  const cmd = `
    echo "[Docker Inspect]"
    echo 'Li62301014@' | sudo -S docker inspect 1Panel-openresty-gfRy --format='{{json .Mounts}}' 2>/dev/null
    echo ""
    echo "[Nginx Configs]"
    echo 'Li62301014@' | sudo -S docker exec 1Panel-openresty-gfRy nginx -T | grep -A 20 -B 5 "similar"
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) {
       console.error(err);
       conn.end();
       return;
    }
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '192.168.3.200',
  port: 22,
  username: 'leecaiy',
  password: 'Li62301014@'
});
