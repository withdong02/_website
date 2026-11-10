# 项目约定

## 目标与边界

- 本目录是个人纸艺场景网站的新项目，基于 `andrewwoan/aimee-xus-papercraft-world` 改造；沿用其 React、React Three Fiber、Three.js、GSAP 技术体系，实际版本在引入上游时锁定。
- 原博客在 `D:\Blog`。迁移使用复制和核对，不移动、删除或修改原文件，不覆盖原仓库未提交内容。
- 先保留 Hugo 渲染文章，避免同时重写 Markdown、短代码、代码高亮和评论系统。新站最终应可独立构建，不长期依赖 `D:\Blog` 的绝对路径。
- 最终部署到用户自己的服务器：优先输出可由 Nginx 等静态服务器托管的 `dist/`，不绑定第三方托管平台，不要求生产机运行 Vite 开发服务。生产配置和发布需另行授权。
- 首页优先场景探索，正文优先阅读。保留真实文章地址、浏览器历史和返回场景的位置；不将正文绘制到三维贴图里。
- 春季是默认入口，承载自我介绍与音乐；夏季进入独立博客页面，秋季进入独立相册页面，冬季用途暂定。保持现有路线、滚动节奏与区域间探索距离，不在三维场景内展开完整博客或相册界面。
- 当前推进顺序为先准备四季场景素材、确认入口造型与摆位，再接通博客和相册页面。春季素材已获用户确认，当前实装夏季；随后处理冬季及四季连接。夏季保留原完整虚线路线、红叉与问号装饰，以原四个照片点位承载 Articles、Tags、Categories、Archives 英文模块入口及短说明；深蓝背板/地面、较浅分层海浪，摄影内容移出，墙面只加少量云，不新增大笔记本。简介为 `I'm a student focused on backend development. Here I share my notes, experiments, and projects.`，不再使用 AI 工程师介绍。入口素材与真实跳转分阶段验收；细节以 `DESIGN.md` 和 `MIGRATION.md` 3.3 为准。
- 四季各自的地面与背板使用一致主色，保留纸艺纹理与空间层次；秋季以金黄色为方向。具体构图与色值在素材验证后确定。
- 本阶段用同样纸艺风格的小男孩替换原小女孩；参考原女生的四季穿搭，逐一覆盖 4 套季节服装、6 个主要角色视角/动作（冬 2、春 2、夏 1、秋 1）及原表情切换，不只替换一套。`summerWaveRef` 是海浪环境物件，不计为男孩版本。具体样稿待视觉确认，不默认制作用户本人的肖像。
- 角色外观以原项目偏二维的薄纸片为准，避免立体玩偶式脸部、厚衣服、圆鼓体积和光晕。换装须保留可动分层与枢轴，眨眼、表情、骑行车轮、步行手脚、动静姿态切换均列入验收；不得用一整张静态人物图替换可动角色。尚未证实的原有眨眼实现需单独核对，不能将设计稿当作动画已完成。
- 男孩五官以自然、清淡为准，不刻意做浓眉大眼；原女性部件不能直接压缩后视为已对齐概念稿。实装需对照已确认的轮廓、衣着与比例检查，几何与动作检查通过不等于美术验收通过。
- 回声（Echo）按用户最新确认，作为湖蓝色纸艺摆件替换春季蓝色史莱姆，保留轻微呼吸起伏；沿用旧博客原始不规则轮廓和两只圆眼，无手脚、嘴或额外动物特征，不作为新增导览角色。分离体叫墨团（blot），本轮不接入分离或旧博客交互。保留旧素材，不因角色方向变化自行删除；旧博客的首页编排与样式不自动成为新站约束。

## 目录约定

目录按阶段需要创建，不预建空目录；改变结构前先更新本文件。

| 位置 | 用途与规则 |
| --- | --- |
| 根目录 | 项目约定、迁移计划、上游许可证及构建配置；不复制旧站整套规则来覆盖新项目 |
| `src/` | 沿用上游的场景与界面源码，优先局部改造，避免同时重构上游架构 |
| `public/` | 新站前端的静态源资源；这里不是旧博客的 Hugo 构建产物目录 |
| `public/draco/` | 从锁定版本的 Three.js 复制的 glTF Draco 解码器及许可证，由本站托管；更新依赖时核对版本与文件哈希 |
| `Blender Files and Addon/`、`raw_assets/` | 沿用上游名称的美术源文件、插件及模型加工输入；先保留，不直接作为发布目录 |
| `blog/` | 内容迁移阶段引入的 Hugo 源码：内容、配置、必要主题和模板、资源及相关检查；排除旧缓存、Git 数据、部署配置和旧构建产物 |
| `scripts/`、`tests/` | 必要的构建衔接与有意义的自动检查，不预设框架 |
| `.tmp/` | 可重建的上游暂存、截图、检查报告；不提交，阶段结束列明可清理项，删除仍须用户授权 |
| `.sites-runtime/` | 本机安装工具产生的运行记录，不提交、不部署 |
| `.workbuddy/` | 本机会话的工作日志与工具记录，不提交、不部署；只作为本地过程记录，不作为项目交付物或状态来源 |
| `dist/` | 新站最终构建产物，不手工编辑、不提交 |

上游 Blender 源文件先保留原目录与名称，核查后再决定是否调整。新写源码优先小写 kebab-case；迁入的文章和上游文件先保留名称与路径。

春季男孩样段由 `scripts/build-spring-boy.py` 从锁定的原角色 GLB 生成 `public/models/spring-boy.glb`，复用原角色图集；不覆盖原资产。模型的身体、左右眼和侧脸细节分别保留节点，角色运行组件放在现有模型目录；构建脚本不参与日常网站启动。

春季左右介绍由 `scripts/build-spring-introduction.py` 生成独立的 `public/models/spring-introduction.glb`、背板 `public/textures/spring-introduction.webp` 与透明字形图集 `public/textures/spring-introduction-text.webp`，复用原 SlimeBox 字体和背板几何，仅替换旧介绍字形并清理对应烘焙字痕；原模型、图集和字体不覆盖。运行组件 `src/Experience/models/spring-introduction.jsx` 接入现有春季组件，人物、道具和路线沿用原实现。文案以 `DESIGN.md` 为准。

春季回声的原轮廓与双眼复制为 `public/images/spring-echo.svg`；`scripts/build-spring-echo.py` 据此生成独立 `public/models/spring-echo.glb` 与 `public/textures/spring-echo.webp`，复用原春季干净纸纹。运行组件 `src/Experience/models/spring-echo.jsx` 替换原史莱姆挂载位；重建不依赖 `D:\Blog` 的绝对路径，不覆盖或修改旧博客、原 GLB 和图集。

春季蝴蝶由 `scripts/build-spring-butterflies.py` 生成独立 `public/models/spring-butterflies.glb` 与 `public/textures/spring-butterfly-paper.webp`。主蝶抬高并缩短吊线，顶部固定点保持原位；复用原蝶的纸片轮廓，另添三只较小的浅杏、淡紫和湖蓝纸蝶。原合并配景只拆出吊线，其余部件保留几何与原 UV；运行组件 `src/Experience/models/spring-butterflies.jsx` 替换原蝶和该合并网格，不覆盖原资产。

夏季男孩由 `scripts/build-summer-boy.py` 生成 `public/models/summer-boy.glb`，复用已确认春季男孩的头脸纸片及原夏季角色的表情、手臂、冲浪板和图集。两季模型加工共用 `scripts/paper_parts.py` 的分件与纸片几何函数；夏季身体、笑脸、左右手臂保持独立节点。仅美术重建时运行生成脚本，不加入网站启动流程，不覆盖原模型、春季资产或共享贴图。

夏季博客场景由 `scripts/build-summer-blog.py` 生成独立 `public/models/summer-blog.glb`、`public/textures/summer-blog-{1,2,3,paper,text}.webp`，第四张图集沿用原文件。原背板与五十片虚线路线保留几何和 UV，仅在新图集中局部修补旧字、照片与相机残影，并统一深蓝底景；四个原照片点位替换为独立纸艺模块及说明。运行组件 `src/Experience/models/summer-blog.jsx` 挂到现有 `Scene.jsx`，原 `Scene_3_Summer.jsx`、GLB、图集与 Blender 源文件保留。海草、螃蟹、遮阳伞沿用原动画参数和枢轴；未接入页面前，模块不设置假链接、点击手形或旧浮动牌交互。

夏季天花板的贝壳纸风铃由同一生成器和图集生成，原天花板射线确定吊点，三片暖白/淡珊瑚/浅蓝扇贝、横杆与细吊线共用一个枢轴轻摆。保持薄纸片和小尺度，避开墙面介绍与四模块，不加入音效或新交互。

秋冬男孩由 `scripts/build-autumn-winter-boys.py` 生成 `public/models/autumn-boy.glb`、`public/models/winter-boy.glb`，复用已确认春季的正侧面头脸及原角色图集。秋季保留白鹤及独立手臂；冬季正面/步行侧面分别保留身体、眼部、表情与手脚节点，步行四肢继续使用原枢轴。生成器共用 `scripts/paper_parts.py`，不改变春夏资产或路线，不加入日常启动流程。

金秋相册小样由 `scripts/build-autumn-album.py` 生成独立的 `public/models/autumn-album-sample.glb` 与 `public/textures/autumn-album-sample.webp`。仅在这些新资产中提取原秋季底景与部分装饰，重铺纸纹、烘焙阴影并新增分层相册、独立照片插页、成片黄叶与低矮纸艺配景；原 `Scene_4_Fall.jsx`、原 GLB、图集和 Blender 源文件完整保留。深秋采用暖金底景和鲜明黄色树冠，落叶按树下聚集、前景散落分布。新运行组件为 `src/Experience/models/autumn-album-sample.jsx`；照片内容不与底景合并，尚未实现的相册页面不得显示为可用入口。

## 推进与验收

- 阶段、状态、交付物和已知缺口以 `MIGRATION.md` 为准；一次只推进当前阶段，完成后汇报并停在阶段边界。
- 第一次引入上游时记录仓库地址、提交 SHA、许可证和原版运行结果，保留版权声明。第三方材质、字体、照片、音乐和角色单独核对。
- 上游来源、基线检查和服务器托管边界记录在 `UPSTREAM.md`；本地运行命令记录在根目录 `README.md`。上游原始说明保留在暂存检出中并由锁定的提交链接追溯。
- 检查命令在实际引入源码和核对版本后记录，不能把计划中的命令记成已验证；区分构建、自动检查、浏览器、真实手机和线上验收。
- 常规检查统一使用 `npm run check` 和 `npm run lint`；角色阶段检查集中在 `tests/character-integrity-check.mjs`，不再按实现阶段重复建脚本。`tests/` 保留实际几何、动画与资源契约的检查，不为可逆视觉微调新增机械复述实现的断言。上游不再使用的实验组件、失效的 `gen:models` 批处理和 Vite 模板图标已清理，保留的原秋季组件及原素材仍按既有约定留存。
- 冷启动、加载失败、低性能设备、触屏及键盘操作属于实际验收内容；正文阅读期间停止不必要的场景运动。
- 不自行复制或修改旧站 CI/CD、`.env`、密钥或部署配置；推送、公开发布、删除、系统变更等继续遵守用户授权边界。
