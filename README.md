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

# 生成静态文件
npm run build
```

重复验证构建时可用 `npm run build -- --emptyOutDir=false` 避免清空已有产物；发布前另用新的空输出目录构建并核对文件清单，避免夹带历史产物。

不要执行 `gen:models` 来启动网站；它是上游模型加工脚本，会改写生成模型，不属于日常预览步骤。

春季男孩由 `scripts/build-spring-boy.py` 基于原模型重建，复用原图集。只有修改美术生成逻辑时才需要 Blender；日常启动不需要运行它。本机已验证 Blender 5.2.3 LTS：

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-spring-boy.py
```

## 静态产物预览与部署

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

