# FNOS 部署说明

## 当前部署参数

- 项目目录：`/vol1/1000/code/deplay/similar_AI_build`
- 服务名：`similar-ai-build`
- 访问端口：`53120`
- 类型：Vue/Vite 静态站点
- 服务方式：`python3 -m http.server`

## 当前工作方式

- `push main`：继续走仓库原有的 GitHub Pages / Release 工作流
- 部署到飞牛：手动运行 `.github/workflows/deploy-fnos.yml`
- 飞牛部署不会自动执行，仍然需要你在 GitHub Actions 页面手动点击

## 飞牛上的 systemd 服务

当前服务等价于：

```ini
[Unit]
Description=Similar AI Build Static Site
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=leecaiy
WorkingDirectory=/vol1/1000/code/deplay/similar_AI_build
ExecStart=/usr/bin/python3 -m http.server 53120 --bind 0.0.0.0 --directory /vol1/1000/code/deplay/similar_AI_build/dist
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 手动部署流程

1. 本地修改代码
2. 提交并推送到 `main`
3. 打开仓库 `Actions`
4. 选择 `Deploy to FNOS`
5. 点击 `Run workflow`

工作流会自动执行：

1. 更新飞牛本地仓库到最新 `main`
2. 执行 `npm ci`
3. 执行 `npm test`
4. 执行 `npm run build`
5. 重启 `similar-ai-build`
6. 验证 `http://127.0.0.1:53120/`

## 飞牛手动维护命令

```bash
sudo systemctl status similar-ai-build
sudo systemctl restart similar-ai-build
sudo journalctl -u similar-ai-build -f
curl http://127.0.0.1:53120/
```

## 下次复用模板

适合这类项目：

- 前端静态项目
- `npm test` + `npm run build` 可完成产物构建
- 最终只需要托管 `dist/`

复用时只要替换这 4 个值：

- 部署目录
- 服务名
- 端口
- 验证 URL

推荐步骤：

1. `git clone --branch main --single-branch <repo> <deploy_dir>`
2. `npm ci`
3. `npm test`
4. `npm run build`
5. 用 `systemd` 托管静态目录
6. 增加一个手动触发的 `deploy-fnos.yml`

