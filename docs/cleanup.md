# 待手动清理

项目规则禁止批量删除，因此本次没有执行批量删除。以下文件已退出源码与发布目录，原字节暂存在 `.tmp/cleanup-2026-11-21/`，供复核后手动删除。

| 原位置 | 原因 |
| --- | --- |
| `src/Experience/models/Scene_1_Winter.jsx` | 无现役调用的旧场景组件，可从锁定上游或 Git 历史追溯 |
| `src/Experience/models/Scene_3_Summer.jsx` | 无现役调用的旧场景组件，可从锁定上游或 Git 历史追溯 |
| `src/Experience/models/Scene_4_Fall.jsx` | 无现役调用的旧场景组件，可从锁定上游或 Git 历史追溯 |
| `public/models/moveee-transformed.glb` | 旧实验模型，无运行或生成器调用 |
| `raw_assets/moveee.glb` | 旧实验模型，无运行或生成器调用 |
| `public/textures/winter-letters-wall.webp` | 已被现用素材替代的中间贴图 |
| `blog/assets/images/echo.svg` | 当前树木横幅不再使用的重复 SVG |
| `public/media/favicon-96x96.png` | 已被回声 favicon 替代的旧图标 |
| `public/media/favicon.ico` | 已被回声 favicon 替代的旧图标 |
| `public/media/favicon.svg` | 已被回声 favicon 替代的旧图标 |
| `public/images/Moving_Characters_1.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_1_Winter_1.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_1_Winter_2.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_1_Winter_3.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_1_Winter_4.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_2_Spring_1.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_2_Spring_2.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_2_Spring_3.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_2_Spring_4.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_3_Summer_1.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_3_Summer_2.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_3_Summer_3.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_3_Summer_4.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_4_Fall_1.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_4_Fall_2.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/images/Scene_4_Fall_3.ktx2` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/basis/basis_transcoder.js` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/basis/basis_transcoder.wasm` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |
| `public/basis/README.md` | 无调用的 KTX2 素材与解码器，当前场景统一读取 WebP |

另外，整理前 `.tmp/` 已有约 2.5 GB 历史构建、预览与检查产物。这些均不进入 Git 和发布包。确认不再需要本机上游暂存、截图和 actionlint 工具后，可手动清理 `.tmp/`；需要复核此次整理时保留 `maintenance/reorganization.json`。新任务不再向 `.tmp/` 根部散写产物。

旧空目录树与 Python 字节缓存也已归入同一待清理目录，不留在现役目录中。本次整理的脚本、迁移哈希清单和浏览器截图位于 `.tmp/maintenance/`，复核结束后也可手动清理。

不要删除 `assets/`：其中是可重建现役素材所需的 Blender 文件、原始模型、贴图与 SVG。
