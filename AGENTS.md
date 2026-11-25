# 项目约定

## 目标与边界

- 个人四季纸艺网站，基于 `andrewwoan/aimee-xus-papercraft-world`；React、React Three Fiber、Three.js、GSAP 版本以锁文件为准，上游来源与许可证见 `docs/upstream.md`。
- 原博客 `D:\Blog` 只读。迁移只复制和核对，不移动、删除、修改原文件，不复制旧站密钥或部署配置。新站须能独立构建，正文继续由本仓库 Hugo 渲染。
- 首页重场景探索，正文重阅读；保留真实地址、历史、返回位置与缩放，不将完整内容画到三维贴图。用户已确认首页和博客按当前范围基本完成；阶段、下一步与未验收项以 `docs/migration.md` 为准。
- 春季默认进入，夏季四入口已接通；秋季照片墙与 `/albums/` 共用用户照片，插页直达对应大图、标牌进入总览；8 张照片已通过 COS JPG 接入，本地验证通过、尚未发布。春季音乐、冬季留言联系尚待接入，未实现入口不得伪装为可用。四季路线、人物比例与纸片风格以 `docs/design.md` 为准，修改美术前读取相关段落。
- 四季小男孩保留六版姿态、表情、分层、眨眼、步行与车轮枢轴；不得用整张静态人物替代。回声为湖蓝纸艺摆件、原不规则轮廓与胶囊双眼，不增加嘴、手脚或分离交互。几何检查通过不等于美术或真机验收通过。
- 由自有 Nginx 托管静态 `dist/`，生产机不运行 Vite。用户已持续授权每次推送 main 自动检查、构建、上线，无需重复确认；超出现役发布流程的生产配置修改另行授权。入口与回滚见 `docs/deployment.md`。

## 目录约定

目录按用途划分，不预建空目录。改变结构前先更新本文件，并同步调用方、生成器、检查、CI 和文档。

| 位置 | 用途与规则 |
| --- | --- |
| 根目录 | README、AGENTS、许可证与构建配置；专题文档放入 docs |
| `src/ui/` | 场景外的加载、介绍、按钮与缩放等界面，组件与样式就近存放 |
| `src/scene/` | 三维运行代码；camera、animation、characters、materials、loaders 分工明确，四季各在 seasons 下独立目录 |
| `src/stores/` | 共享运行状态；不放模型、页面或生成工具 |
| `public/` | 仅保留实际发布的场景资源和站点元数据；不得放只供生成器读取的源文件或历史副本 |
| `public/draco/` | 与锁定 Three.js 一致的 Draco 解码器及许可证；更新依赖时核对版本与哈希 |
| `assets/blender/` | 上游 Blender 文件和插件，保留文件名与来源，不发布 |
| `assets/source/` | 仅供美术重建使用的模型、贴图及图形源文件；仍被运行时共用的原模型和图集只在 public 保留一份 |
| `assets/photos/` | 用户照片或明确授权的网络示例接入时创建；来源记录在 docs，页头不显示示例标记；原图只读保留，子目录仅组织源文件，前台不分类；仅 JPG、PNG、WebP、AVIF，按目录及文件名排序，不推断日期地点。当前按用户要求直接使用 COS 中已有 JPG，不强制转换 WebP；本机预览示例不提交、不随 main 发布 |
| `assets/photos/personal/`、`assets/photos/catalog.json` | personal 为用户原件的本机目录，原件不修改且由 Git 忽略；catalog 为可提交的远程照片清单，存在时优先使用，CI 无需原件，不运行时列举存储桶。当前 thumb/view 均指向 COS 根目录已有 JPG，文件名编码后访问；只有照片放 COS，其他资源沿用静态构建。相册展示全部照片，秋季五张插页使用同一清单前五张，墙面 UV 等比裁切；点击插页直达对应大图，标牌进入总览，不改变场景几何或路线 |
| `albums/`、`src/ui/albums/` | 独立相册入口、浏览脚本和样式；点击照片按需打开 PhotoSwipe 大图，支持缩放、切图和关闭恢复；不保留摄影书、翻页引擎或 iframe 阅读页，不加载三维场景；照片处理在 `scripts/build/`，沿用 `tests/build/` 检查 |
| `blog/` | 独立 Hugo 源码与文章；主题在 themes/notebook 锁定，站点覆盖放 layouts 和 assets，不直接改主题副本。博客和相册共用 assets/css/paper-theme.css 配色纸纹与格子层、assets/js/theme.js 主题切换及 starfield.js 格子背景；相册不加载微型四季场景 |
| `scripts/assets/` | 美术生成器与共用几何工具，仅手动重建时运行 |
| `scripts/build/`、`scripts/deploy/` | 统一静态构建与部署工具；服务器安装入口保持既有绝对路径 |
| `tests/scene/`、`tests/blog/`、`tests/build/`、`tests/deploy/` | 按场景、博客、集成构建、部署职责组织已有检查 |
| `docs/` | design 维护设计契约，migration 维护当前阶段，assets 维护素材链路，deployment 维护发布回滚，upstream 维护来源和历史证据 |
| `.github/workflows/` | main 推送自动检查、构建与发布，使用专用受限 SSH 密钥，只发布 dist |
| `.tmp/` | 不提交、不发布；新构建放 builds，测试放 checks，预览放 preview，缓存放 cache，美术中间产物放 assets，部署包放 deploy，整理核查记录放 maintenance |
| `.sites-runtime/`、`.workbuddy/` | 本机工具与会话记录，不是项目交付物或状态来源 |
| `dist/`、`node_modules/` | 可重建的产物与依赖，不手工编辑、不提交 |

源码目录和新文件使用小写 kebab-case，Python 可导入模块使用 snake_case；迁入文章、第三方素材及 Blender 文件保留原名。素材输入、生成输出和运行组件的对应关系见 `docs/assets.md`。旧上游组件和失效中间素材不再作为现役源码保留，上游锁定版本可从 `docs/upstream.md` 追溯。

本次整理确认多余的文件移入 `.tmp/cleanup-2026-11-21/` 待用户手动删除，不作为长期归档；遵守禁止批量删除的规则。现有 `.tmp/` 历史产物也由用户按清单清理，不能自动清空。

## 推进与验收

- 常规检查使用 `npm run check`、`npm run lint`、`npm run build`；部署检查为 `python tests/deploy/deploy-site-check.py`，完整硬链接/回滚验收在 Python 3.12+ 的 Linux 上执行。CI 工作流与命令同步维护。
- 角色检查统一在 `tests/scene/character-integrity-check.mjs`；保留实际几何、动画、资源、导航和输出契约，不为低影响视觉改动编写复述实现的测试。
- 源素材、生成输出、共享原图集和重建命令统一见 `docs/assets.md`；仅美术重建才需要 Blender，不把生成器加入网站启动。原始输入不得覆盖，迁移时核对哈希。
- `src/scene/navigation.js` 保存路线、缩放和历史条目；博客优先通过 Navigation/BFCache 返回原文档，失败才走 `/?resume=blog`，有效返回不重播开场。首次访问仍从春季开始，正文不常驻三维场景。
- 固定全屏 Canvas 使用 `eventPrefix="client"`，保证 HTML 入口与画布使用相同坐标。正文期间停止不必要的场景运动。
- 构建在 `.tmp/builds/` 分别暂存 Vite/Hugo，检查冲突后输出统一 dist，保留上次输出。根首页归场景，博客保留 `/posts/`、`/tags/`、`/categories/`、`/archives/` 和 `/blog-assets/`，不得以场景首页兜底博客深链接。
- 区分本地构建、自动检查、浏览器、真实设备和线上结果。冷启动、失败恢复、低性能、触屏与键盘均列入真实验收，不将待办记为完成。
- README 只维护入门与命令；设计、进度、素材、发布与来源分别维护于 docs 对应文件，避免重复状态。只推进当前授权阶段，不自动实现后续页面。
