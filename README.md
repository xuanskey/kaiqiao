# 开窍

当前版本：**v0.16.0**。

适合家长陪练的小学数学网页工具。先选年级，再完成一组练习；答错时看解析、做同考点巩固，最后导出学情。

覆盖一至六年级的部分基础题型。现有 52 个出题模块、18 个三年级原创知识单元，以及“互动课堂”（55 个数学演示、11 个科学实验，数量按代码实际统计）；教材版本、学期与目录尚未逐项核对，不能当作完整教材同步。

正式入口：**https://www.yanghat.cn/?practice=1**（yanghat.cn 同路径）。主页是门面；点「开始练习」后地址栏仍是 `/?practice=1`，不显示 `/app/`。各版本变更见 [CHANGELOG.md](CHANGELOG.md)。

## 动画演示与宣传片

主页「动画演示」用代码（SVG + CSS + 少量 JS）绘制，约 36 秒循环：凑十法、分数乘法面积模型、小数除法、随堂练习，最后落到 www.yanghat.cn。进入视口才自动播放，可暂停、按章节跳转；系统开启「减弱动效」时不自动播放。[在线观看](https://www.yanghat.cn/#video)

原 45 秒竖屏宣传片（1080×1920）已不在网站上发布，源文件留在仓库 [media/kaiqiao-promo.mp4](media/kaiqiao-promo.mp4)（海报 `media/kaiqiao-promo-poster.jpg`），可用于视频号等站外渠道。

## 使用

正式入口：[开窍在线练习](https://www.yanghat.cn/?practice=1) · [养习主站](https://www.yanghat.cn)

第一次使用请看[使用指南](USAGE.md)：按年级选择题库或互动课，三年级可从理解实验室开始；包含操作、计分、备份迁移和问题反馈方法。

离线使用：直接打开单文件版 `site/www.yanghat.cn/app/offline.html`（也可在本地 `npm run release` 后取 `docs/offline.html`，两者相同）。也可以把 `docs/` 部署到静态网页服务，访问 `index.html`。旧版下载包不会自动升级。

导航共 5 个标签：首页、课堂、题库、错题本、学情。

1. 首页选择练习年级；切换年级不会删除其他年级进度。
2. “题库”支持按知识点直接练习，提供基础/进阶两组及本年级搜索；也可切换原有闯关路线。首页可选“开始每日练习”或“开始闯关”。普通练习看完解析后点“下一题”；答错的题会安排同考点巩固。
3. “90 秒小挑战”是限时练习，“和窍窍比一比”的对手是电脑。限时模式会自动换题，可在错题本慢慢复习。
4. 错题本只显示当前年级；原题答对后移出。每个年级的章节独立解锁。
5. “课堂”按年级、学期、学科和教材选互动课；三年级的原创知识单元（理解实验室）也在“课堂”里（选三年级数学），首页三年级也有“去理解”入口。单元先读情境和讲解，操作实验，再做 8 题练习或 12 题自测，均逐题反馈。
6. “学情”汇总当前浏览器所有年级的已答题，支持文字报告和 JSON 备份。备份同时带上课堂练习记录和最近 60 天的每日题数；旧备份没有这两项时，恢复后它们保持本机原样。完成单元后还可导出家长建议。

## 数据与计分

- 不需要账号。记录仅保存在当前浏览器，不自动同步，也没有服务器收集孩子信息。
- 同一设备不同浏览器、网址或离线文件，可能使用不同的存储空间。更换前先导出备份，在新环境恢复。
- 恢复备份会替换所有年级的本机记录，先预览，再确认；不合并记录。新备份还会替换课堂练习记录和最近 60 天每日题数；不含这两项的旧备份不会动它们。
- 每次提交即保存答题、错题和技能统计。退出未完成练习不计通关、经验或打卡。
- 通关/每日整组完成，或限时结束且至少答过一题，才计打卡。未作答不算完成。
- 学情包含复习作答和未完成练习中的已答题，不等同于考试成绩。
- 浏览器禁用存储或存档损坏时会明确提示，不静默覆盖损坏的原存档。建议定期备份。
- 一个浏览器存档适合一名孩子；暂不提供多孩子账号隔离。

## 本地开发

使用 Node.js 24 或更高版本。

```bash
npm ci
npm run dev
```

```bash
npm run check       # 类型检查 + 回归测试 + 生产构建
npm run release     # 生成 docs/ 网站目录（本地产物，不入库）与 offline.html 单文件版（单文件版另做一次构建，课堂静态内嵌；网站版课堂按需加载并进 SW 预缓存）
npm run test:smoke  # 原有冒烟 + 状态回归（先 npm run build；需要 Playwright Chromium）
npm run test:state  # 单独运行题目生命周期与 AI 竞态回归（同样先构建）
```

- `src/lib/math/`：题目、判分、存档校验和回归测试。
- `src/lib/lesson/`：互动课的计算、讲解脚本、随堂练习；`reference.ts` 是只给测试用的独立数学参考实现。
- `scripts/smoke.mjs`：浏览器冒烟测试，CI 每次运行；包含 `scripts/state-regression.mjs` 的状态回归。
- `src/store/math.ts`：练习状态、年级和结算。
- `src/components/math/`：首页、练习、错题、学情及电脑/手机自适应界面。
- `docs/`：`npm run release` 在本地生成的可部署产物，与已提交的 `site/www.yanghat.cn/app/` 完全相同，已加入 `.gitignore`，不再入库。
- `reports/`：验收报告。截图（`*.png`）不入库，作为 PR 附件上传。

## 发布

`npm run build` 将完整 dist 同步到 `site/www.yanghat.cn/app/`，这是内部资源目录，不是对外入口。相对 Vite base 支持内嵌 `/app/`、docs 与离线包。顶层打开 `/app/` 会回到 `/?practice=1` 并保留课程参数。`npm run release` 生成离线文件和 Service Worker 后再次同步。发布上传整个 `site/www.yanghat.cn/` 到 **yanghat-cn Direct Upload**，包含主页和 `/app/`；不要把 app 或 docs 当成主站根目录。

统计、AI 客服、充值开关、部署护栏和旧域名等管理员操作见 [site/README.md](site/README.md)。

### 上线步骤（PR 合并后）

合并到 main **不会**自动更新网站，需要有人手动上传一次。上传用 Cloudflare 的 Direct Upload，每次都整体替换线上文件。

准备（只需一次）：

- Node.js 24、git。
- wrangler 4：`npm i -g wrangler@4`，然后用 `WRANGLER=$(which wrangler)` 指定；脚本默认找 `/tmp/wrangler4/node_modules/.bin/wrangler`。
- Cloudflare API 令牌：控制台 → My Profile → API Tokens → Create Token，权限只给 **Account · Cloudflare Pages · Edit**，账号限定为 yanghat 所在账号。令牌只放在运行命令的环境变量 `CLOUDFLARE_API_TOKEN` 里，不要写进仓库、`.env` 文件或聊天。账号 ID 已在脚本里内置。

每次上线：

```bash
git checkout main && git pull
npm ci
npm run check                      # 全绿才继续
TOPUP_OPEN=false npm run release   # 开关读 .env.production；充值保持关闭
git status --short                 # 必须为空；有改动说明 main 上的产物过期，先修再发
npm run deploy:site -- --check     # 只检查，不上传
CLOUDFLARE_API_TOKEN=<令牌> WRANGLER=$(which wrangler) npm run deploy:site
```

上线后核对：

```bash
curl -sSI https://www.yanghat.cn/ | head -1                 # 200
curl -sSI https://yanghat.cn/ | grep -i '^location'          # 301 到 www
curl -s -o /dev/null -w '%{http_code}\n' https://www.yanghat.cn/e   # GET 返回 405，说明函数在
```

然后在手机上打开 https://www.yanghat.cn/?practice=1 做一题，并点页脚「帮助」问一句，确认能正常回答。

回滚：Cloudflare 控制台 → Workers & Pages → yanghat-cn → Deployments，在上一个正常的部署上点 Rollback。

验收：`npm run check` 验证类型、回归用例、页面服务端渲染与生产构建；
它不替代真实浏览器/手机验收。发布前建议在 320、390、768、1440 像素视口检查
首页、选年级、两种答题输入、错题解析、学情和备份恢复。

## 当前边界与试用方向

目前没有支付、会员、真人在线老师或多人实时对战功能。题目由规则生成，不调用付费 AI API；“AI 老师”是可选功能，只有家长填写自己的接口和密钥后才会联网。拍照识别（OCR）在浏览器本地运行，识别结果可能有错字，需要核对。朗读依赖浏览器支持。

先邀请少量家长试用，记录是否愿意连续使用、哪些解析看不懂，再验证“练习计划 + 人工解读报告”的付费服务。具体流程见 [PILOT.md](PILOT.md)。收入尚未验证，不承诺提分。

## 许可 / License

代码采用 [MIT License](LICENSE)。自2026-10-29起新发布、且作者有权授权的原创课程文字、讲解、题干模板、教学插图及宣传内容采用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans)，允许非商业分享和改编，须署名 yangge / 开窍、附许可链接并注明修改。收费培训、补习班、付费课程等商业使用内容需联系 hello@yanghat.cn 单独授权。具体路径、混合文件和第三方例外见 [CONTENT-LICENSE.md](CONTENT-LICENSE.md)。

「开窍」「养习」名称、logo 和 yanghat.cn 域名不在本次许可范围内。以 main@17a25022（17a25022bf02997f99564820c0b9f92a25bf8bca）为界，该提交及以前按 MIT 发布的内容继续适用 MIT；之后新发布的可授权原创内容适用 CC BY-NC 4.0，继承的历史 MIT 内容不撤销原许可；第三方作品保留原许可。宣传片照片段与音轨、宣传片海报图、OG 分享图为 AI 辅助生成或来源待核实，不纳入 CC BY-NC 授权；自录产品录屏段可归原创内容。logo、favicon、灯笼均为品牌标识，不授权品牌使用。

Code is MIT-licensed. New original educational and promotional content that the author may license is CC BY-NC 4.0 from 2026-10-29; noncommercial sharing and adaptation require attribution, a license link and notice of changes. Commercial content use, including paid tutoring and courses, requires permission: hello@yanghat.cn. See CONTENT-LICENSE.md for scope and exceptions. Names, logos and the yanghat.cn domain are reserved. The boundary is main@17a25022 (17a25022bf02997f99564820c0b9f92a25bf8bca): that commit and earlier MIT-licensed material retain MIT permissions; new licensable original content after it is CC BY-NC 4.0. Unchanged historical content retains MIT permissions. Third-party licenses remain applicable; AI-assisted or unverified video photographs/audio, promotional posters and OG imagery are excluded. Logos, favicons and the lantern mascot are reserved brand identifiers.
