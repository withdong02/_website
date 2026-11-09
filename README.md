# 四季纸艺个人网站

基于 Aimee Xu's Papercraft World 改造的个人网站，使用 React、React Three Fiber、Three.js 和 GSAP；计划接入 Hugo 博客、相册和音乐，最终输出静态 `dist/`，部署到自己的服务器。

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

# 本地开发预览，仅监听本机
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort

# 核对资源引用、文件名大小写与本站解码器
node tests/static-assets-check.mjs

# 核对春季起点、首次滚动衔接与循环进度
node tests/scene-start-check.mjs

# 核对春季男孩模型分层、原资产与眨眼周期
node tests/spring-boy-check.mjs

# 核对夏季男孩分层、已确认头脸来源、笑脸和手臂枢轴
node tests/summer-boy-check.mjs

# 核对秋冬分层、小眼比例、四肢枢轴及春夏资产不变
node tests/autumn-winter-boy-check.mjs

# 核对六版角色几何、表情遮挡及原女孩模型/贴图/引用保留
node tests/character-integrity-check.mjs

# 核对金秋小样、相册分层和可换照片 UV
node tests/autumn-album-check.mjs

# 核对春季左右介绍、曲面字形、原背板与字体保留
node tests/spring-introduction-check.mjs

# 核对春季回声原轮廓、双眼、纸片厚度与原素材保留
node tests/spring-echo-check.mjs

# 检查四季角色与秋季样片运行组件
npx eslint src/Experience/models/Moving_Characters.jsx src/Experience/models/spring-boy.jsx src/Experience/models/summer-boy.jsx src/Experience/models/autumn-winter-boys.jsx src/Experience/models/autumn-album-sample.jsx

# 检查春季场景与新介绍组件
npx eslint src/Experience/models/Scene_2_Spring.jsx src/Experience/models/spring-introduction.jsx src/Experience/models/spring-echo.jsx

# 生成静态文件
npm run build
```

重复验证构建时可用 `npm run build -- --emptyOutDir=false` 避免清空已有产物；发布前另用新的空输出目录构建并核对文件清单，避免夹带历史产物。

不要执行 `gen:models` 来启动网站；它是上游模型加工脚本，会改写生成模型，不属于日常预览步骤。

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

春季回声复用复制到 `public/images/spring-echo.svg` 的旧博客原轮廓与双眼，生成独立湖蓝纸片和纸纹图集；只在美术重建时运行，依赖同上，不需要访问旧博客目录：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-spring-echo.py
```

输出 `public/models/spring-echo.glb` 与 `public/textures/spring-echo.webp`，原史莱姆模型和共享贴图继续保留。

## 静态产物预览与部署

金秋最小样片使用单独模型和烘焙贴图，原秋季组件、模型和图集保留。重建需要本机 Blender、Python 3 与 Pillow；不会在网站启动时执行：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-autumn-album.py
```

生成 `public/models/autumn-album-sample.glb` 和 `public/textures/autumn-album-sample.webp`。运行组件 `autumn-album-sample.jsx` 的 `photoUrl` 可替换占位插页，使用单独整图 UV，不需要重烘焙底景。当前相册是入口造型样片，尚未连接独立相册页。

本地可用普通静态服务检查 `dist/`：

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

最终只托管 `dist/`，不把本地开发或预览服务用于生产。当前按域名根目录和 HTTPS 规划，需正确提供 JavaScript/WASM MIME 与完整资源目录。完整博客与相册的构建合并尚待迁移阶段实现；生产发布另行授权。

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

