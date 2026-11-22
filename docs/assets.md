# 素材与重建

源文件在 `assets/`，发布资源在 `public/`，生成工具在 `scripts/assets/`。源模型和贴图保留原始字节；运行时也使用的上游文件继续共用 `public/` 中的一份。

## 素材链路

首页加载头像由 `scripts/assets/build-loading-art.py` 从现有春季男孩正面头脸渲染为透明的 `public/images/loading-boy{,-smile}.webp`，保留原角色模型、图集和分层。脚本复用开场原有纸纹及实际背板色 `#173d55`、`#c18424` 生成 `loading-summer.webp`、`loading-autumn.webp`；冬季与春季分别沿用 `white.webp`、`green.webp`。旧女生头像保留在 `assets/source/images/`，不再发布。仅手动美术重建时通过 Blender 运行，依赖本机 Python 与 Pillow，不加入日常构建。

博客纸艺外观复用夏季场景的独立纸纤维贴图与 SlimeBox 英文字体，分别复制到 `blog/assets/images/paper.webp` 和 `blog/assets/fonts/slime-box.woff2`，由 Hugo 指纹管线发布；不从场景运行目录动态读取，不引入三维资源。栏目英文标题使用该字体，中文正文与代码继续使用现有字体。场景与博客的标签页图标统一使用回声 PNG，分别保存在 `public/images/echo-favicon.png` 与 `blog/assets/images/echo-favicon.png`，两份保持字节一致；无调用的旧 favicon 已退出发布目录。

春季男孩样段由 `scripts/assets/build-spring-boy.py` 从锁定的原角色 GLB 生成 `public/models/spring-boy.glb`，复用原角色图集；不覆盖原资产。模型的身体、左右眼和侧脸细节分别保留节点，角色运行组件放在 `src/scene/characters/`；构建脚本不参与日常网站启动。

春季左右介绍由 `scripts/assets/build-spring-introduction.py` 生成独立的 `public/models/spring-introduction.glb`、背板 `public/textures/spring-introduction.webp` 与透明字形图集 `public/textures/spring-introduction-text.webp`，复用原 SlimeBox 字体和背板几何，仅替换旧介绍字形并清理对应烘焙字痕；原模型、图集和字体不覆盖。运行组件 `src/scene/seasons/spring/introduction.jsx` 接入现有春季组件，人物、道具和路线沿用原实现。文案以 `docs/design.md` 为准。

春季回声的原轮廓与当前胶囊双眼保存在 `assets/source/images/spring-echo.svg`；`scripts/assets/build-spring-echo.py` 据此生成独立 `public/models/spring-echo.glb` 与 `public/textures/spring-echo.webp`，复用原春季干净纸纹。当前博客树木横幅不使用回声 SVG，不再保留博客中的无调用副本。运行组件 `src/scene/seasons/spring/echo.jsx` 替换原史莱姆挂载位；重建不依赖 `D:\Blog` 的绝对路径，不覆盖或修改旧博客、原 GLB 和图集。

Articles 第一页及 Tags、Categories、Archives 总览的导航下方使用既有 `echo-drift.html` 实现“一棵树的四季”，桌面 170px、600px 以下 130px。用户于 2026-11-18 认可树与长椅的静态构图，并要求树左移、长椅加长、落花落叶增多；当前树约位于 33%、长椅位于 55%，根和椅脚接同一连续地面，原回声和独立底座退出横幅。`blog/assets/images/season-{tree,bench}-atlas.png` 为独立生成的透明四季图集，提示词嵌入 PNG 并附同名 JSON；Hugo 输出指纹 WebP，文字、地景、控件和飘落物仍由网页渲染，不将整张样稿当作运行背景。每季停留 14 秒、叠换 1.5 秒，一轮 62 秒；花瓣/落叶/细雪及地面散落物较原版增加，手机减量。`echo-drift.js` 控制可见时播放、读者暂停和减少动态效果下的静态春景，不加载三维或视频；四个栏目通过同一页签 sessionStorage 延续换季、粒子进度与暂停状态，首次绘制前恢复季节，避免切页闪回春景。第 2 页、标签/分类的具体文章列表和正文不显示横幅，分页锚点直接定位到文章网格；春季三维回声继续保留。

春季蝴蝶由 `scripts/assets/build-spring-butterflies.py` 生成独立 `public/models/spring-butterflies.glb` 与 `public/textures/spring-butterfly-paper.webp`。主蝶抬高并缩短吊线，顶部固定点保持原位；复用原蝶的纸片轮廓，另添三只较小的浅杏、淡紫和湖蓝纸蝶。原合并配景只拆出吊线，其余部件保留几何与原 UV；运行组件 `src/scene/seasons/spring/butterflies.jsx` 替换原蝶和该合并网格，不覆盖原资产。

夏季男孩由 `scripts/assets/build-summer-boy.py` 生成 `public/models/summer-boy.glb`，复用已确认春季男孩的头脸纸片及原夏季角色的表情、手臂、冲浪板和图集。两季模型加工共用 `scripts/assets/paper_parts.py` 的分件与纸片几何函数；夏季身体、笑脸、左右手臂保持独立节点。仅美术重建时运行生成脚本，不加入网站启动流程，不覆盖原模型、春季资产或共享贴图。

夏季博客场景由 `scripts/assets/build-summer-blog.py` 生成独立 `public/models/summer-blog.glb`、`public/textures/summer-blog-{1,2,3,paper,text}.webp`，第四张图集沿用原文件。原背板与五十片虚线路线保留几何和 UV，仅在新图集中局部修补旧字、照片与相机残影，并统一深蓝底景；四个原照片点位替换为独立纸艺模块及说明。运行组件 `src/scene/seasons/summer/scene.jsx` 挂到现有 `src/scene/world.jsx`，原 GLB、图集与 Blender 源文件作为重建输入保留。海草、螃蟹、遮阳伞沿用原动画参数和枢轴；四个模块现通过 `src/scene/seasons/summer/scene.jsx` 接入 Articles `/posts/`、Tags `/tags/`、Categories `/categories/`、Archives `/archives/`，纸卡点击与原生键盘链接共用真实地址；不恢复旧浮动牌交互。

夏季天花板的贝壳纸风铃由同一生成器和图集生成，原天花板射线确定吊点，三片暖白/淡珊瑚/浅蓝扇贝、横杆与细吊线共用一个枢轴轻摆。保持薄纸片和小尺度，避开墙面介绍与四模块，不加入音效或新交互。

秋冬男孩由 `scripts/assets/build-autumn-winter-boys.py` 生成 `public/models/autumn-boy.glb`、`public/models/winter-boy.glb`，复用已确认春季的正侧面头脸及原角色图集。秋季保留白鹤及独立手臂；冬季正面/步行侧面分别保留身体、眼部、表情与手脚节点，步行四肢继续使用原枢轴。生成器共用 `scripts/assets/paper_parts.py`，不改变春夏资产或路线，不加入日常启动流程。

冬季来信素材由 `scripts/assets/build-winter-letters.py` 生成独立的 `public/models/winter-letters.glb`、`public/textures/winter-contact-label.webp` 与 `public/textures/winter-snow-wall.webp`，运行组件 `src/scene/seasons/winter/scene.jsx` 替换原冬季挂载位。复用原四张图集中的纸纹、积雪及配景，背板以连续世界空间纸纹和实际灰度遮挡重新烘焙为雪白，地面通过线性材质增益提亮，暖木墙与门保留原 UV 和烘焙层次，窗格与门灯为暖黄色薄纸件；邮筒立在最低台阶地面，已按用户反馈绕底部放大 40%，标牌严格为 `contact me`，字号由 136 增至 174，尚未接页面前不设假链接。早期中间图集 `winter-letters-wall.webp` 已退出发布目录，运行背板使用生成器烘焙的 `winter-snow-wall.webp`；生成时检查 UV 接缝两侧颜色，避免提亮蓝色图集造成竖向色差。原图集、模型作为重建输入保留，男孩动作保持现有实现，鹿头、三层火苗、音符和雪人手臂沿用原九个动画枢轴及参数。轻雪由 `src/scene/seasons/winter/snowfall.jsx` 的 56 个薄纸实例绘制，落点与循环由 `src/scene/seasons/winter/snowflake.js` 计算，限定在冬季区域；离开该区域、打开信息面板或页面隐藏时停止更新，系统减少动态效果开启时隐藏。模型采用现有本地 Draco 解码链路。

金秋庭院由 `scripts/assets/build-autumn-album.py` 生成独立的 `public/models/autumn-album-sample.glb` 与 `public/textures/autumn-album-sample.webp`，运行组件仍为 `src/scene/seasons/autumn/scene.jsx`。用户于 2026-11-11 确认重新构图：树间两道照片绳、五张独立插页作为统一照片墙入口造型；移除圆窗、圆月、相册台和悬空单张照片，改用侧后方小方窗。同日预览后要求增加落叶、降低树高、恢复地面展开大书，在左右页分别写简短场景文案，并补少量动物；天花板用少量纸鹤替换旧灯笼空线。当前选用两只薄纸松鼠、两簇蘑菇与三只折纸鹤，长椅和低矮植物继续作配景。保留琥珀金纸纹、台阶及原角色动作；允许男孩在画面中自然遮挡照片和树，其他季节也按此前后层次原则处理，只避免实际三维穿插，不强制将所有物件抬到男孩上方。`public/textures/autumn-photo-previews.webp` 是内置 imagegen 生成并固定保存的风景示意图集，不代表用户真实照片；`photoUrls` 可逐张替换，兼容原 `photoUrl`。五图与书页文字保留独立 UV，文案为 `Golden leaves, quiet days.` 和 `Little moments, kept here.`，字形图集由生成器输出到 `public/textures/autumn-book-text.webp`；竖屏不得单独搬走插页使其脱离绳和树。原 GLB、图集和 Blender 源文件完整保留为重建输入；独立相册与真实照片后续接入，当前照片墙不设可用入口。

## 场景资源重建与检查说明

统一构建每次使用新的暂存目录，保留之前的输出备份；无需传 `--emptyOutDir=false`。`.tmp/` 中的历史构建与检查产物可在验收后由用户清理。

角色各阶段检查已合并到 `tests/scene/character-integrity-check.mjs`，统一验证四季六版角色的几何、面部遮挡、动作枢轴、眨眼和原素材保留。其余检查各自保护独立的资源或场景约束，不参与网页打包。第三方静态文件、美术源文件和本地临时目录不纳入 ESLint；新源码和检查脚本仍完整检查。

Vite 的主包体积提醒针对单个精简后的 JavaScript 文件，按 gzip 前大小计算，默认阈值为 500 kB。本次构建主包约 1.85 MB，构建估算 gzip 后约 533 kB，主要包含 Three.js 核心、WebGPU/WebGL 支持和 React 等运行依赖；GLB、贴图和检查脚本不计入这个 JS 大小。清理整模块注册后已减少约 103 kB，阈值保留默认值；构建可以成功，首屏下载与解析成本仍需在性能验收时核查。

素材生成脚本只在美术重建时手动运行，不属于日常预览步骤。已移除会覆盖运行组件、且与当前导出接口不一致的旧 `gen:models` 批处理入口。

春季男孩由 `scripts/assets/build-spring-boy.py` 基于原模型重建，复用原图集。只有修改美术生成逻辑时才需要 Blender；日常启动不需要运行它。本机已验证 Blender 5.2.3 LTS：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/assets/build-spring-boy.py
```

夏季男孩由 `scripts/assets/build-summer-boy.py` 复用已确认的春季头脸和原夏季分件生成，不重写春季资产；两季共用 `scripts/assets/paper_parts.py` 的几何工具。夏季生成器校验输入的春季模型哈希，春季外观有意修改后须先核对夏季头脸再更新锁定值。本机已验证：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/assets/build-summer-boy.py
```

秋季乘鹤与冬季正面/步行由同一脚本生成；需先保留上述已确认春季模型及夏季模型，生成器会核对输入资产并保留原白鹤和步行枢轴。本机已验证：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/assets/build-autumn-winter-boys.py
```

春季介绍使用独立背板和透明字形图集，原模型、图集与 SlimeBox 字体保留。仅在文案/排字素材改变后重建；需要 Blender、Python 3 和 Pillow（本机已验证 12.3.0）：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/assets/build-spring-introduction.py
```

输出 `public/models/spring-introduction.glb`、`public/textures/spring-introduction.webp` 和 `public/textures/spring-introduction-text.webp`。修改文案时同步核对 `docs/design.md`、生成脚本和介绍检查；原介绍同时包含字形和烘焙字痕，不能只改字形后保留旧字痕。

春季回声复用 `assets/source/images/spring-echo.svg` 的原轮廓及当前胶囊双眼，生成独立湖蓝纸片和纸纹图集；只在美术重建时运行，依赖同上，不需要访问旧博客目录：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/assets/build-spring-echo.py
```

输出 `public/models/spring-echo.glb` 与 `public/textures/spring-echo.webp`，原史莱姆模型和共享贴图继续保留。

春季蝴蝶生成器抬高原主蝶、缩短原吊线，新增三只较小纸蝶；独立输出中保留同一合并网格里的其余配景。仅在美术重建时运行，依赖同上并使用 Blender 自带 Draco 编码器，运行时沿用本站现有解码器：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/assets/build-spring-butterflies.py
```

输出 `public/models/spring-butterflies.glb` 与 `public/textures/spring-butterfly-paper.webp`，不覆盖原 GLB 和图集。

夏季博客场景保留原完整虚线路线与海滨配景，替换四个照片点位，局部修补原烘焙残影并生成深蓝图集；同一模型包含天花板上的贝壳纸风铃，复用现有纸纹并绕固定吊点轻摆。生成脚本只用于美术重建，日常启动不运行它；依赖本机 Blender、Python 3 与 Pillow，无需访问旧博客目录：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/assets/build-summer-blog.py
```

输出 `public/models/summer-blog.glb`、`public/textures/summer-blog-1.webp`、`summer-blog-2.webp`、`summer-blog-3.webp`、`summer-blog-paper.webp` 和 `summer-blog-text.webp`；第四张夏季图集、角色资产、原场景组件及全部上游源文件保留。修改简介或模块文案时同步 `docs/design.md`、生成脚本与 `tests/scene/summer-blog-check.mjs`。当前四个模块已分别接通四个博客页面，交互挂载在 `src/scene/seasons/summer/scene.jsx`，不重新生成模型。

## 秋冬场景重建

金秋最小样片使用单独模型和烘焙贴图，原秋季模型和图集作为重建输入保留。重建需要本机 Blender、Python 3 与 Pillow；不会在网站启动时执行：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/assets/build-autumn-album.py
```

生成 `public/models/autumn-album-sample.glb`、`public/textures/autumn-album-sample.webp`、标牌 `autumn-gallery-label.webp` 与书页文字 `autumn-book-text.webp`。当前为树间照片绳庭院，配地面展开书、落叶、纸松鼠及天花纸鹤；五张插页各有独立整图 UV，书页文字也独立于纸纹。运行组件 `src/scene/seasons/autumn/scene.jsx` 的 `photoUrls` 按顺序替换，原 `photoUrl` 仍可统一替换，不需要重烘焙底景。默认使用固定保存的 `public/textures/autumn-photo-previews.webp` 风景示意图集（内置 imagegen 生成，非用户真实照片；重建脚本不重新生成该图集）。入口造型尚未连接独立相册页，真实照片仍待接入。

冬季来信素材重建：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/assets/build-winter-letters.py
```

生成独立 `public/models/winter-letters.glb`、`public/textures/winter-contact-label.webp` 与 `public/textures/winter-snow-wall.webp`，保留原冬季模型和图集作为重建输入。新组件 `src/scene/seasons/winter/scene.jsx` 复用原纸纹并保留环境动画枢轴，暖化小屋，邮筒放到最低台阶，标牌为 `contact me`。雪白背板由脚本按连续世界空间纸纹与实际遮挡重新烘焙，并检查接缝两侧颜色；过时中间图集已退出发布目录，验证记录见 `docs/design.md`。尚未接通独立留言与联系页面。
