# Zep Floor Plan Walkthrough

把住宅平面图做成可以从入户门走进去的三维网页。用户想“试试这张图”时，先交付能走的 HTML，让人尽早判断户型与风格。需要完整版时，再沿用同一模型补齐家装、滚动导览和四季氛围。

## 先试一下

下载仓库，双击 `assets/preview.html`。点「走进去」，从门外走到起居间。电脑用 W A S D 移动、拖动环顾。手机用左下摇杆移动、拖动画面环顾。示例户型完全虚构，可以离线运行。[示例文件](assets/preview.html)

## 给普通 Agent 或聊天模型

- **支持 Skills 的 Agent**　把解压后的目录命名为 `zep-floorplan-walkthrough`，放入该 Agent 支持的技能目录。让它读取入口并附上自己的户型图。[Skill 入口](SKILL.md)
- **能读写文件的通用 Agent**　给它整个目录，让它复制示例 HTML，把内嵌 JSON 换成新户型，然后打开文件从门口试走。能编辑文本和运行浏览器就能做首版。[数据格式](references/quick-preview.md)
- **只通过对话使用模型**　给模型 `SKILL.md` 和示例 HTML 的文本，再附能读的户型图或尺寸、房间关系与门窗位置。可以让它返回完整 HTML。若只输出 JSON，把它粘回模板里的 `id="layout"` 脚本块即可。实际能否读图和运行验证取决于所用模型和工具。

也可以从这条请求开始。

> 用这张户型图做一版能走进去的网页。先按标注还原外墙、门洞和主要家具，把可打开、能从入口走进客厅的 HTML 先发给我。图上缺少的尺寸请标出来。之后继续做我指定的四季和滚动效果。

## 完整版与验收

[户型与陈设](references/space-and-style.md)说明怎样按尺寸定墙、留门洞并安排不同风格的家装。[漫游与实测](references/interaction-and-checks.md)覆盖可逆滚动、四季切换、楼梯、键盘与触屏行走和离线验证。

- [房间可达性检查](scripts/check_rooms.js)可在浏览器或 Node.js 中使用，把项目的实际行走判定传给它。
- [打包工具](scripts/package_walkthrough.py)只用 Python 3 标准库，可验证解压后的 HTML，支持从包内源码重新构建比对。

示例和指引不依赖模型 API、云服务或专属插件。`agents/openai.yaml` 供识别该文件的客户端显示名称和示例提示。项目采用 [MIT 许可证](LICENSE)。
