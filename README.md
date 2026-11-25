# 四季纸艺个人网站

基于 Aimee Xu's Papercraft World 改造的个人网站，使用 React、React Three Fiber、Three.js 和 GSAP；首页场景与 Hugo 博客已上线，统一输出静态 `dist/`，由自有服务器托管，推送 `main` 自动构建发布。用户已确认这两个页面按当前范围基本完成，下一步与未完成事项见 [docs/migration.md](./docs/migration.md#当前下一步)。

## 文档分工

| 文档 | 用途 |
| --- | --- |
| [AGENTS.md](./AGENTS.md) | 开发约束、目录用途和操作边界 |
| [docs/migration.md](./docs/migration.md) | 阶段计划、当前进度和验收标准 |
| [docs/design.md](./docs/design.md) | 已确认的外观、交互与页面边界 |
| 本文件 | 安装、启动、检查和构建命令 |
| [docs/upstream.md](./docs/upstream.md) | 锁定的上游版本、素材来源与限制、验证记录和已知问题 |
| [素材与重建](./docs/assets.md) | 素材来源位置、生成器与运行资源的对应关系 |
| [发布与回滚](./docs/deployment.md) | main 自动发布、服务器入口与回滚 |
| [待清理清单](./docs/cleanup.md) | 已移出源码的多余文件及手动清理范围 |

阶段状态以 `docs/migration.md` 为准，本文件不重复维护任务进度。

## 目录结构

```text
src/                 # 网站运行代码
  ui/                # HTML 界面与样式
  scene/             # 相机、动画、角色、材质与四季场景
  stores/            # 共享状态
blog/                # Hugo 文章、模板与博客资源
public/              # 实际随站发布的静态资源
assets/              # 不发布的 Blender 与美术加工输入
scripts/             # assets / build / deploy 工具
tests/               # scene / blog / build / deploy 检查
docs/                # 设计、进度、素材、发布与来源说明
.tmp/                # 本机产物与缓存，不提交
dist/                # 最终静态发布包，不提交
```

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

# 部署工具检查：Python 3.12+，Linux 执行完整硬链接与回滚测试
python tests/deploy/deploy-site-check.py

# 生成静态文件
npm run build
```

## Notebook 博客预览

文章列表每页 10 篇，底部可按页码或 Previous / Next 换页；标签与分类内的文章列表使用同样规则，Archives 保持完整归档。分页大小由 `blog/hugo.yml` 的 `pagination.pagerSize` 控制。

Articles 第一页、Tags、Categories、Archives 总览上方展示“一棵树的四季”，桌面 170px、手机 130px；树在左、长椅在右，花瓣、纸浪、落叶与细雪每季停留 14 秒，再用 1.5 秒叠换，一轮 62 秒。四个栏目切换时延续横幅季节、局部动画和暂停状态，不重新从春季开始。右上角可暂停，离屏停止运动，减少动态效果时保留静态春景。透明树木/长椅图集在 `blog/assets/images/season-{tree,bench}-atlas.png`，Hugo 自动转为 WebP，文字和飘落物分开渲染。后续分页与正文不显示横幅，文章阅读不依赖三维资源。

在项目根目录运行，需要 Hugo extended；本轮验证版本为 `0.161.1`。主题已随项目固定保存，无需下载主题或访问旧博客目录：

```powershell
# 生成独立博客静态产物到 .tmp/preview/blog/
npm run blog:build

# 普通静态服务，打开 http://127.0.0.1:1313/
python -m http.server 1313 --bind 127.0.0.1 --directory .tmp/preview/blog
```

开发联调时关闭上述静态服务，在两个终端分别运行 `npm run blog:dev` 与 `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`。统一从 `http://127.0.0.1:5173/` 访问，1313 仅作为 Hugo 后台；Vite 将博客路由与 `/blog-assets/` 代理给 Hugo。服务仅绑定本机；停止服务使用 `Ctrl+C`。博客源码在 `blog/`，已导入旧站全部 21 篇文章、25 个标签和 4 个分类，提供 Articles、Tags、Categories、Archives 四个入口。新增或编辑文章直接修改 `blog/content/posts/`，不需要改三维源码；`blog/migration-manifest.json` 仅保留导入时的版本、哈希、日期与路径快照。

预览服务必须保持运行：已加载的首页可以留在浏览器里，但服务停止后新页面和刷新都会连接失败。Windows 中需要独立后台预览时，可在项目根目录运行以下命令；先确认 1313 没有被已有预览占用，日志写入 `.tmp/`：

```powershell
New-Item -ItemType Directory -Path .tmp/preview -Force | Out-Null
Start-Process -FilePath (Get-Command hugo).Source `
  -ArgumentList 'server --source blog --noBuildLock --bind 127.0.0.1 --port 1313 --disableFastRender --baseURL http://127.0.0.1:5173/ --appendPort=false' `
  -WorkingDirectory (Get-Location).Path -WindowStyle Hidden `
  -RedirectStandardOutput '.tmp/preview/blog.stdout.log' `
  -RedirectStandardError '.tmp/preview/blog.stderr.log'
```

原文与外部图片地址保留，图床不可达时可能影响图片加载，构建中的图片尺寸读取失败会告警并降级。`tests/blog/blog-preview-check.mjs` 验证全量文章可发现性、历史路径、归档、本地链接、目录锚点及代码/折叠图片输出，产物为 `.tmp/checks/blog/`。

当前背景已按用户要求从点阵纸改为旧博客的鼠标排斥/回弹方格，脚本位于 `blog/assets/js/starfield.js`；触屏或减少动态效果下显示静态方格，主题与尺寸变化仍重绘，来源见 `docs/upstream.md`。

夏季四张纸卡分别进入 `/posts/`、`/tags/`、`/categories/`、`/archives/`，支持纸卡点击和原生链接键盘操作。博客右上角的返回箭头与浏览器后退恢复路线位置和缩放；新访问根路径仍从春季开始。状态仅存当前标签页的 sessionStorage，存储被禁用时仍可跳转，但不恢复位置。

`npm run build` 先将 Vite 与 Hugo 构建到新的 `.tmp/builds/site-*/`，校验冲突后合并成 `dist/`。场景占 `/index.html`，Hugo 保留文章与分类等历史路径、RSS 和 sitemap，资源集中于 `/blog-assets/`；旧首页 `/page/N/` 转到 `/posts/page/N/`。旧 `dist/` 留存在对应暂存目录的 `previous-dist/`，不批量删除。用 `python -m http.server 4173 --bind 127.0.0.1 --directory dist` 验证独立静态包；静态托管应按真实文件返回，不能用场景首页兜底博客深链接。生产构建使用 `https://blog.withdong02.top/`，仅非 production 环境保留 `noindex`；开发命令仍覆盖为本机地址。搜索、评论尚未接入。

## 相册维护

独立相册位于 `/albums/`，秋季照片墙与标牌进入同一页面。等高照片墙提供总览，点击照片直接预览大图，支持切图、缩放和返回原位置。没有照片时显示空状态；本机网络样片统一标注“示例”。来源、存储与图片链接见 [素材与重建](docs/assets.md#相册照片)。

当前直接使用 COS 中的 JPG，照片地址、尺寸及稳定 ID 维护在 `assets/photos/catalog.json`；新增照片上传 COS 后更新清单，再执行 `npm run build`。原件在 `assets/photos/personal/` 只读保留且由 Git 忽略，CI 无需原件。秋季墙使用清单前五张，照片直达对应大图，标牌进入总览，无需 Blender。只有照片放 COS，其他资源照旧构建；格式及 CORS 约定见 `docs/assets.md`。

## 静态预览与部署

```powershell
npm run build
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

推送 main 后自动检查、构建和上线。发布权限、服务器接收入口、版本保留与回滚见 [发布与回滚](docs/deployment.md)；美术加工命令和输入输出见 [素材与重建](docs/assets.md)。

## 上游与署名

上游：[andrewwoan/aimee-xus-papercraft-world](https://github.com/andrewwoan/aimee-xus-papercraft-world)，代码许可证见 [LICENSE.md](./LICENSE.md)。原始说明可从 [锁定提交的 README](https://github.com/andrewwoan/aimee-xus-papercraft-world/blob/794d011da7c7b05d5abee09f06097581794d5b3e/README.md) 追溯，版本与素材限制见 `docs/upstream.md`。

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

