# 发布与回滚

仅发布统一静态 `dist/`。本地预览命令见 [README](../README.md)。

## main 自动发布

博客的返回箭头优先回到浏览器历史里离开时的场景页面，命中 BFCache 时直接恢复原位置与缩放，不重新请求模型。浏览器不支持或历史条目已丢失时，仍通过 `/?resume=blog` 恢复保存的位置，只显示简短等待提示；首次访问保留原开场。该逻辑位于 `blog/assets/js/scene-return.js` 与场景的 `src/scene/navigation.js`，博客正文仍不加载三维资源。

用户于 2026-11-19 明确授权每次推送 `main` 自动构建并上线。[Deploy website](https://github.com/withdong02/_website/actions/workflows/deploy.yml) 没有手动审批，也没有路径过滤；后续正常 `git push origin main` 即会触发。

首次完整自动发布 [44489597191](https://github.com/withdong02/_website/actions/runs/44489597191) 已成功上线源码 `f59dedc`：13 项站点检查、4 项 Linux 部署测试、lint、构建、增量上传和公网探针全部通过，226 个文件在服务器逐项核对。线上 21 篇文章已移除阅读时间，所有有目录的文章默认展开。真机与低性能设备验收仍待进行。

部署测试要求 Python 3.12+；Windows 会跳过 Linux 专用的硬链接和回滚测试，本机旧 Python 3.8 不支持归档安全过滤，不用于发布验收。

1. GitHub 托管 Ubuntu 使用 Node.js 24、Hugo extended 0.161.1，依次执行 `npm ci`、`npm run check`、`python3 tests/deploy/deploy-site-check.py`、`npm run lint`、`npm run build`。
2. 获取现役版本的文件清单，`scripts/deploy/deploy-site.py pack` 只打包有变化的文件，并附上完整 SHA-256 清单。检查或构建失败不会接触线上版本。
3. 确认提交仍是最新 `main` 后，经专用 SSH 密钥发送产物；首次连接失败最多尝试三次，清单查询和上传复用连接。连续推送保留正在运行的发布及最新待运行版本，过期提交不会覆盖最新源码。部署任务串行，服务器另有文件锁。
4. 服务器接收脚本验证归档路径、文件类型、体积、清单及哈希，将新版本存入 `/var/www/papercraft/releases/<commit>-<run-id>-<attempt>/site`。未变化的文件优先通过硬链接复用；首次人工版本文件属于 root，无法硬链接时复制。只复用新清单中的文件，不累积已移除文件，也不改写旧版本；将原版本记入 `previous`，原子切换 `current`。
5. 服务器通过本机 HTTPS 核对首页、四栏目、文章样本和 Draco 文件；失败自动恢复旧链接。最后 Actions 检查公网首页与四栏目。公网网络异常会令运行显示失败，但不撤回已经通过服务器核验的版本。

GitHub Secrets 为 `DEPLOY_SSH_KEY` 与固定主机身份的 `DEPLOY_KNOWN_HOSTS`。新密钥在 `ubuntu` 上被强制限制为 `/usr/bin/python3 /usr/local/libexec/papercraft-deploy.py receive`，仅支持读取现役 `manifest` 与接收发布；不能执行任意 shell、申请 PTY 或转发端口。发布不需要 root、重载 Nginx或启动常驻应用。服务器脚本由 root 管理，工作区源码为 `scripts/deploy/deploy-site.py`；修改接收协议或脚本时须先通过运维入口同步安装，普通静态发布不会自动改写它。

`current` 与 `previous` 位于 `/var/www/papercraft/`，该目录和 `releases` 由 `ubuntu` 管理，既有版本保留，不自动清理。需要紧急退回上一版本时，通过运维入口执行：

```sh
target="$(readlink -f /var/www/papercraft/previous)"
test -d "$target"
ln -s "$target" /var/www/papercraft/current.rollback
mv -Tf /var/www/papercraft/current.rollback /var/www/papercraft/current
```

随后核对 HTTPS 页面；还需撤销错误源码并提交到 `main`，避免后续推送再次发布错误内容。以下是首次手工上线的历史记录，旧 Blog 仍停用，回到原博客的方法也保留。

## 2026-11-19 授权发布（历史）

用户授权当前版本替换线上博客。线上地址为 [blog.withdong02.top](https://blog.withdong02.top/)，根域名与 www 继续保留路径跳转。发布源码为 `df66add903e1e12ec2f2a28c147c5a7bd679a85d`；新仓库为 [withdong02/_website](https://github.com/withdong02/_website)。本次为人工静态发布，没有新增自动部署工作流。

- Nginx 配置：`/etc/nginx/sites-available/blog-subdomain`；根目录为 `/var/www/papercraft/current`，指向 `/var/www/papercraft/releases/20261119-df66add/site`。保留真实文件 404，提供 `application/wasm`，启用 JS/CSS/WASM gzip；未指纹化的场景字体缓存改为 1 小时。
- 旧站 `/var/www/blog` 原样保留。旧仓库 `withdong02/Blog` 的 Deploy blog 工作流（ID `277254653`）已通过 GitHub API 停用，状态 `disabled_manually`，没有改动 `D:\Blog` 源码、密钥或 SSH 授权。旧受限发布密钥仍只写旧目录，不能覆盖新目录。
- 回滚备份：`/var/backups/website-20261119/`（root，0700），含 `old-blog.tar.gz`、原 `blog-subdomain.conf`、域名跳转配置、切换前 Nginx 展开配置、哈希及文件清单。备份校验、226 个发布文件逐项 SHA-256 核对均通过。
- 发布包已从上传临时位置移入 `/var/backups/website-20261119/website-df66add.tar.gz`（root:root 0600），SHA-256 `1c09a88e665a6621e4777216ce8ca49f75f3f046a6db0d73238be12bb427b0a1`。版本目录的 `manifest.json` 留存全部文件哈希，它位于站点根目录之外。
- 本地 13 项检查、lint、统一构建通过。公网 226 个文件哈希、28 条路由（含全部 21 篇历史文章、四栏目及两页分页）通过；缺页 404，RSS/sitemap 使用生产域名。浏览器已验证春季冷启动、夏季四纸卡分别进入对应栏目并返回同一位置、10/10/1 分页、中文深链接刷新；正文不请求三维模型。390px 博客无横向溢出，横幅 130px。真机、低性能设备未验收。

需要回滚时，使用服务器运维目录的 `srv.py` 执行以下明确命令；不用删除或覆盖旧站文件：

```sh
cp -a /var/backups/website-20261119/blog-subdomain.conf /etc/nginx/sites-available/blog-subdomain
nginx -t && systemctl reload nginx
```

回滚后用 HTTPS 核对首页 SHA-256 为 `e2c78533649600f4b328d8d7be851bcaf7a01e7845380d8133f2b9ed58f7cb11`，再检查历史文章。新版本目录和 `current` 链接可保留，不影响回滚到旧目录。不能再向旧 `/var/www/blog` 上传来发布新站。后续 `main` 自动发布按上节的持续授权执行。
