# 四季纸艺个人网站

基于 Aimee Xu's Papercraft World 改造的个人网站，使用 React、React Three Fiber、Three.js 和 GSAP；已接通 Hugo 博客，后续接入相册和音乐，最终输出静态 `dist/`，部署到自己的服务器。

## 文档分工

| 文档 | 用途 |
| --- | --- |
| [AGENTS.md](./AGENTS.md) | 开发约束、目录用途和操作边界 |
| [MIGRATION.md](./MIGRATION.md) | 阶段计划、当前进度和验收标准 |
| 本文件 | 安装、启动、检查和构建命令 |
| [UPSTREAM.md](./UPSTREAM.md) | 锁定的上游版本、素材来源与限制、验证记录和已知问题 |

阶段状态以 `MIGRATION.md` 为准，本文件不重复维护任务进度。

## 本地开发

在 `D:\_website` 中运行；已验证环境为 Node 24.15.0、npm 11.12.1。

```powershell
# 新检出的项目首次安装，沿用锁文件
npm ci

# 终端一：博客后台，供 Vite 代理
npm run blog:dev

# 终端二：统一预览，打开 http://127.0.0.1:5173/
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort

# 自动检查：场景资源、路线、角色与独立博客样文（需要 Hugo）
npm run check

# 检查现役源码、工具与检查脚本
npm run lint

# 生成静态文件
npm run build
```

## Notebook 博客预览

文章列表每页 10 篇，底部可按页码或 Previous / Next 换页；标签与分类内的文章列表使用同样规则，Archives 保持完整归档。分页大小由 `blog/hugo.yml` 的 `pagination.pagerSize` 控制。

Articles 第一页、Tags、Categories、Archives 总览上方展示“一棵树的四季”，桌面 170px、手机 130px；树在左、长椅在右，花瓣、纸浪、落叶与细雪每季停留 14 秒，再用 1.5 秒叠换，一轮 62 秒。四个栏目切换时延续横幅季节、局部动画和暂停状态，不重新从春季开始。右上角可暂停，离屏停止运动，减少动态效果时保留静态春景。透明树木/长椅图集在 `blog/assets/images/season-{tree,bench}-atlas.png`，Hugo 自动转为 WebP，文字和飘落物分开渲染。后续分页与正文不显示横幅，文章阅读不依赖三维资源。

在项目根目录运行，需要 Hugo extended；本轮验证版本为 `0.161.1`。主题已随项目固定保存，无需下载主题或访问旧博客目录：

```powershell
# 生成独立博客静态产物到 .tmp/notebook-preview/
npm run blog:build

# 普通静态服务，打开 http://127.0.0.1:1313/
python -m http.server 1313 --bind 127.0.0.1 --directory .tmp/notebook-preview
```

开发联调时关闭上述静态服务，在两个终端分别运行 `npm run blog:dev` 与 `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`。统一从 `http://127.0.0.1:5173/` 访问，1313 仅作为 Hugo 后台；Vite 将博客路由与 `/blog-assets/` 代理给 Hugo。服务仅绑定本机；停止服务使用 `Ctrl+C`。博客源码在 `blog/`，已导入旧站全部 21 篇文章、25 个标签和 4 个分类，提供 Articles、Tags、Categories、Archives 四个入口。新增或编辑文章直接修改 `blog/content/posts/`，不需要改三维源码；`blog/migration-manifest.json` 仅保留导入时的版本、哈希、日期与路径快照。

预览服务必须保持运行：已加载的首页可以留在浏览器里，但服务停止后新页面和刷新都会连接失败。Windows 中需要独立后台预览时，可在项目根目录运行以下命令；先确认 1313 没有被已有预览占用，日志写入 `.tmp/`：

```powershell
Start-Process -FilePath (Get-Command hugo).Source `
  -ArgumentList 'server --source blog --noBuildLock --bind 127.0.0.1 --port 1313 --disableFastRender --baseURL http://127.0.0.1:5173/ --appendPort=false' `
  -WorkingDirectory (Get-Location).Path -WindowStyle Hidden `
  -RedirectStandardOutput '.tmp/notebook-dev.stdout.log' `
  -RedirectStandardError '.tmp/notebook-dev.stderr.log'
```

原文与外部图片地址保留，图床不可达时可能影响图片加载，构建中的图片尺寸读取失败会告警并降级。`tests/blog-preview-check.mjs` 验证全量文章可发现性、历史路径、归档、本地链接、目录锚点及代码/折叠图片输出，产物为 `.tmp/notebook-test/`。

当前背景已按用户要求从点阵纸改为旧博客的鼠标排斥/回弹方格，脚本位于 `blog/assets/js/starfield.js`；触屏或减少动态效果下显示静态方格，主题与尺寸变化仍重绘，来源见 `UPSTREAM.md`。

夏季四张纸卡分别进入 `/posts/`、`/tags/`、`/categories/`、`/archives/`，支持纸卡点击和原生链接键盘操作。博客右上角的返回箭头与浏览器后退恢复路线位置和缩放；新访问根路径仍从春季开始。状态仅存当前标签页的 sessionStorage，存储被禁用时仍可跳转，但不恢复位置。

`npm run build` 先将 Vite 与 Hugo 构建到新的 `.tmp/site-build-*/`，校验冲突后合并成 `dist/`。场景占 `/index.html`，Hugo 保留文章与分类等历史路径、RSS 和 sitemap，资源集中于 `/blog-assets/`；旧首页 `/page/N/` 转到 `/posts/page/N/`。旧 `dist/` 留存在对应暂存目录的 `previous-dist/`，不批量删除。用 `python -m http.server 4173 --bind 127.0.0.1 --directory dist` 验证独立静态包；静态托管应按真实文件返回，不能用场景首页兜底博客深链接。生产构建使用 `https://blog.withdong02.top/`，仅非 production 环境保留 `noindex`；开发命令仍覆盖为本机地址。搜索、评论尚未接入。

## 场景资源重建与检查说明

统一构建每次使用新的暂存目录，保留之前的输出备份；无需传 `--emptyOutDir=false`。`.tmp/` 中的历史构建与检查产物可在验收后由用户清理。

角色各阶段检查已合并到 `tests/character-integrity-check.mjs`，统一验证四季六版角色的几何、面部遮挡、动作枢轴、眨眼和原素材保留。其余检查各自保护独立的资源或场景约束，不参与网页打包。保留的上游原秋季 JSX、第三方静态文件和本地临时目录不纳入 ESLint；新源码和检查脚本仍完整检查。

Vite 的主包体积提醒针对单个精简后的 JavaScript 文件，按 gzip 前大小计算，默认阈值为 500 kB。当前主包约 1.90 MB，构建估算 gzip 后约 553 kB，主要包含 Three.js 核心、WebGPU/WebGL 支持和 React 等运行依赖；GLB、贴图和检查脚本不计入这个 JS 大小。清理整模块注册后已减少约 103 kB，阈值保留默认值；构建可以成功，首屏下载与解析成本仍需在性能验收时核查。

素材生成脚本只在美术重建时手动运行，不属于日常预览步骤。已移除会覆盖运行组件、且与当前导出接口不一致的旧 `gen:models` 批处理入口。

春季男孩由 `scripts/build-spring-boy.py` 基于原模型重建，复用原图集。只有修改美术生成逻辑时才需要 Blender；日常启动不需要运行它。本机已验证 Blender 5.2.3 LTS：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-spring-boy.py
```

夏季男孩由 `scripts/build-summer-boy.py` 复用已确认的春季头脸和原夏季分件生成，不重写春季资产；两季共用 `scripts/paper_parts.py` 的几何工具。夏季生成器校验输入的春季模型哈希，春季外观有意修改后须先核对夏季头脸再更新锁定值。本机已验证：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-summer-boy.py
```

秋季乘鹤与冬季正面/步行由同一脚本生成；需先保留上述已确认春季模型及夏季模型，生成器会核对输入资产并保留原白鹤和步行枢轴。本机已验证：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-autumn-winter-boys.py
```

春季介绍使用独立背板和透明字形图集，原模型、图集与 SlimeBox 字体保留。仅在文案/排字素材改变后重建；需要 Blender、Python 3 和 Pillow（本机已验证 12.3.0）：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-spring-introduction.py
```

输出 `public/models/spring-introduction.glb`、`public/textures/spring-introduction.webp` 和 `public/textures/spring-introduction-text.webp`。修改文案时同步核对 `DESIGN.md`、生成脚本和介绍检查；原介绍同时包含字形和烘焙字痕，不能只改字形后保留旧字痕。

春季回声复用 `public/images/spring-echo.svg` 的原轮廓及当前胶囊双眼，生成独立湖蓝纸片和纸纹图集，并同步博客横幅的 `blog/assets/images/echo.svg`；只在美术重建时运行，依赖同上，不需要访问旧博客目录：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-spring-echo.py
```

输出 `public/models/spring-echo.glb` 与 `public/textures/spring-echo.webp`，原史莱姆模型和共享贴图继续保留。

春季蝴蝶生成器抬高原主蝶、缩短原吊线，新增三只较小纸蝶；独立输出中保留同一合并网格里的其余配景。仅在美术重建时运行，依赖同上并使用 Blender 自带 Draco 编码器，运行时沿用本站现有解码器：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-spring-butterflies.py
```

输出 `public/models/spring-butterflies.glb` 与 `public/textures/spring-butterfly-paper.webp`，不覆盖原 GLB 和图集。

夏季博客场景保留原完整虚线路线与海滨配景，替换四个照片点位，局部修补原烘焙残影并生成深蓝图集；同一模型包含天花板上的贝壳纸风铃，复用现有纸纹并绕固定吊点轻摆。生成脚本只用于美术重建，日常启动不运行它；依赖本机 Blender、Python 3 与 Pillow，无需访问旧博客目录：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-summer-blog.py
```

输出 `public/models/summer-blog.glb`、`public/textures/summer-blog-1.webp`、`summer-blog-2.webp`、`summer-blog-3.webp`、`summer-blog-paper.webp` 和 `summer-blog-text.webp`；第四张夏季图集、角色资产、原场景组件及全部上游源文件保留。修改简介或模块文案时同步 `DESIGN.md`、生成脚本与 `tests/summer-blog-check.mjs`。当前四个模块已分别接通四个博客页面，交互挂载在 `summer-blog.jsx`，不重新生成模型。

## 静态产物预览与部署

金秋最小样片使用单独模型和烘焙贴图，原秋季组件、模型和图集保留。重建需要本机 Blender、Python 3 与 Pillow；不会在网站启动时执行：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-autumn-album.py
```

生成 `public/models/autumn-album-sample.glb`、`public/textures/autumn-album-sample.webp`、标牌 `autumn-gallery-label.webp` 与书页文字 `autumn-book-text.webp`。当前为树间照片绳庭院，配地面展开书、落叶、纸松鼠及天花纸鹤；五张插页各有独立整图 UV，书页文字也独立于纸纹。运行组件 `autumn-album-sample.jsx` 的 `photoUrls` 按顺序替换，原 `photoUrl` 仍可统一替换，不需要重烘焙底景。默认使用固定保存的 `public/textures/autumn-photo-previews.webp` 风景示意图集（内置 imagegen 生成，非用户真实照片；重建脚本不重新生成该图集）。入口造型尚未连接独立相册页。

冬季来信素材重建：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-winter-letters.py
```

生成独立 `public/models/winter-letters.glb`、`public/textures/winter-contact-label.webp` 与 `public/textures/winter-snow-wall.webp`，保留原冬季模型、图集及组件。新组件 `winter-letters.jsx` 复用原纸纹并保留环境动画枢轴，暖化小屋，邮筒放到最低台阶，标牌为 `contact me`。雪白背板由脚本按连续世界空间纸纹与实际遮挡重新烘焙，并检查接缝两侧颜色；旧清理图集保留，验证记录见 `DESIGN.md`。尚未接通独立留言与联系页面。

本地可用普通静态服务检查 `dist/`：

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

最终只托管 `dist/`，不把本地开发或预览服务用于生产。场景与博客已统一构建；独立相册、联系和音乐页面仍未接入。

### main 自动发布

博客的返回箭头优先回到浏览器历史里离开时的场景页面，命中 BFCache 时直接恢复原位置与缩放，不重新请求模型。浏览器不支持或历史条目已丢失时，仍通过 `/?resume=blog` 恢复保存的位置，只显示简短等待提示；首次访问保留原开场。该逻辑位于 `blog/assets/js/scene-return.js` 与场景的 `blog-navigation.js`，博客正文仍不加载三维资源。

用户于 2026-11-19 明确授权每次推送 `main` 自动构建并上线。[Deploy website](https://github.com/withdong02/_website/actions/workflows/deploy.yml) 没有手动审批，也没有路径过滤；后续正常 `git push origin main` 即会触发。

首次完整自动发布 [44489597191](https://github.com/withdong02/_website/actions/runs/44489597191) 已成功上线源码 `f59dedc`：13 项站点检查、4 项 Linux 部署测试、lint、构建、增量上传和公网探针全部通过，226 个文件在服务器逐项核对。线上 21 篇文章已移除阅读时间，所有有目录的文章默认展开。真机与低性能设备验收仍待进行。

1. GitHub 托管 Ubuntu 使用 Node.js 24、Hugo extended 0.161.1，依次执行 `npm ci`、`npm run check`、`python3 tests/deploy-site-check.py`、`npm run lint`、`npm run build`。
2. 获取现役版本的文件清单，`scripts/deploy-site.py pack` 只打包有变化的文件，并附上完整 SHA-256 清单。检查或构建失败不会接触线上版本。
3. 确认提交仍是最新 `main` 后，经专用 SSH 密钥发送产物；连续推送保留正在运行的发布及最新待运行版本，过期提交不会覆盖最新源码。部署任务串行，服务器另有文件锁。
4. 服务器接收脚本验证归档路径、文件类型、体积、清单及哈希，将新版本存入 `/var/www/papercraft/releases/<commit>-<run-id>-<attempt>/site`。未变化的文件优先通过硬链接复用；首次人工版本文件属于 root，无法硬链接时复制。只复用新清单中的文件，不累积已移除文件，也不改写旧版本；将原版本记入 `previous`，原子切换 `current`。
5. 服务器通过本机 HTTPS 核对首页、四栏目、文章样本和 Draco 文件；失败自动恢复旧链接。最后 Actions 检查公网首页与四栏目。公网网络异常会令运行显示失败，但不撤回已经通过服务器核验的版本。

GitHub Secrets 为 `DEPLOY_SSH_KEY` 与固定主机身份的 `DEPLOY_KNOWN_HOSTS`。新密钥在 `ubuntu` 上被强制限制为 `/usr/bin/python3 /usr/local/libexec/papercraft-deploy.py receive`，仅支持读取现役 `manifest` 与接收发布；不能执行任意 shell、申请 PTY 或转发端口。发布不需要 root、重载 Nginx或启动常驻应用。服务器脚本由 root 管理，工作区源码为 `scripts/deploy-site.py`；修改接收协议或脚本时须先通过运维入口同步安装，普通静态发布不会自动改写它。

`current` 与 `previous` 位于 `/var/www/papercraft/`，该目录和 `releases` 由 `ubuntu` 管理，既有版本保留，不自动清理。需要紧急退回上一版本时，通过运维入口执行：

```sh
target="$(readlink -f /var/www/papercraft/previous)"
test -d "$target"
ln -s "$target" /var/www/papercraft/current.rollback
mv -Tf /var/www/papercraft/current.rollback /var/www/papercraft/current
```

随后核对 HTTPS 页面；还需撤销错误源码并提交到 `main`，避免后续推送再次发布错误内容。以下是首次手工上线的历史记录，旧 Blog 仍停用，回到原博客的方法也保留。

### 2026-11-19 授权发布

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

## 上游与署名

上游：[andrewwoan/aimee-xus-papercraft-world](https://github.com/andrewwoan/aimee-xus-papercraft-world)，代码许可证见 [LICENSE.md](./LICENSE.md)。原始说明可从 [锁定提交的 README](https://github.com/andrewwoan/aimee-xus-papercraft-world/blob/794d011da7c7b05d5abee09f06097581794d5b3e/README.md) 追溯，版本与素材限制见 `UPSTREAM.md`。

以下保留上游列出的素材来源；来源列明不等于已经获得全部第三方素材的再分发许可。

- [Paper Material](https://superhivemarket.com/products/crafty-asset-pack)
- [Slime Box Font](https://www.fontspace.com/slime-box-font-f29820)
- [Chibi Anime Facial Expression References](https://www.animeoutline.com/chibi-anime-facial-expressions-drawing-tutorial/)
- [Deer reference image](https://feelincrafty.wordpress.com/wp-content/uploads/2011/11/winterpapercut-finished3.jpg)
- [Winter Inspiration](https://www.amazon.com/Laeacco-Christmas-Grassland-Paper-Cut-Background/dp/B07J57237R?th=1)
- [Joshua's World Inspiration](https://www.awwwards.com/sites/joshuas-world)
- [Bilal Show Inspiration](https://bilal.show/)
- [Stick idea](https://x.com/mesqme)
- [Cabin smoke Inspiration](https://www.pinterest.com/pin/521502831860325373/)
- [Dragon is dragonair From Pokemon](https://www.pokemon.com/us/pokedex/dragonair)
- [Slime is from Genshin Impact](https://genshin-impact.fandom.com/wiki/Hydro_Slime)
- [Guoba is from Genshin Impact](https://wiki.hoyolab.com/pc/genshin/entry/2552?lang=en-us)
- [Austin, Texas Image is from MJ Tangonan](https://unsplash.com/photos/river-near-buildings-during-daytime-wKfTNWaDYgs)
- [San Fransico, California Image is from Maarten van den Heuvel](https://unsplash.com/photos/golden-gate-bridge-during-daytime-gZXx8lKAb7Y)
- [Boston, Massachusetts Image is from Jimmy Woo](https://unsplash.com/photos/a-view-of-a-city-from-across-the-water-SUMtPksZXBE)
- [Shanghai, China Image is from evening_tao](https://www.freepik.com/free-photo/shanghai-skyline-sunny-day-china_1175772.htm#fromView=keyword&page=1&position=2&uuid=ca27e057-0f78-4ebf-a82c-8ecec217205d&query=Shanghai+china)
- [Sentrie for the Blender Tip](https://github.com/sen-trie)
- [Kqnzy for the Blender Tip](https://github.com/Kqnzy)

