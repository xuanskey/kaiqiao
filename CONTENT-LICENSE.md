# 内容许可

版权人：yangge  
生效日期：2026-10-29  
联系：hello@yanghat.cn

## 1. 适用范围

本声明适用于生效之日起新发布、且版权人有权授权的原创课程文字、讲解、题干模板、教学插图及宣传内容。代码仍按根目录 LICENSE 中的 MIT License 发布。具体路径及混合规则如下（路径相对仓库根；第三方、品牌与历史许可例外优先）：

| 路径 / glob | 归类与规则 |
|---|---|
| `src/lib/lesson/curriculum.ts` | 混合：目录标题、来源说明等内容 CC BY-NC；类型与目录映射代码 MIT；第三方目录不宣称独占版权 |
| `src/lib/lesson/{demos,practice,reference,tutor,scene,today}.ts` | 混合：教学文字、题干模板、讲解与生活例子 CC BY-NC；运算、参数、状态与生成算法 MIT |
| `src/lib/math/{generate,grades,expanded-bank,learning-bank,chapters,skills,explain,speak}.ts` | 混合：固定题干、解释、提示、章节说明 CC BY-NC；随机算法、答案计算、接口与调度 MIT |
| `src/components/lesson/**/*.tsx`（包括 `stages-*.tsx`） | 混合：教学文字及具有独创性的教学插图表达 CC BY-NC；组件逻辑、交互、渲染实现 MIT |
| `src/components/**/*.tsx`、`src/lib/**/*.ts` 其他文件 | 代码 MIT；若含独立教学题干、讲解、静态素材，按元素归 CC BY-NC，不能把变量名/普通 UI 按钮文案都算作内容 |
| `site/www.yanghat.cn/index.html`、`open.svg`、`public/使用说明.txt`、`README.md`、`CHANGELOG.md`（由 README 拆出的版本记录）、`CONTENT_ROADMAP.md` | 原创教学/宣传叙述与非品牌插图 CC BY-NC；HTML/SVG 实现、技术使用说明与接口示例代码 MIT；品牌元素除外 |
| `media/kaiqiao-promo.mp4`、`media/kaiqiao-promo-poster.jpg`、`site/www.yanghat.cn/assets/og-cover-20261029.jpg` | 宣传片中自录的产品录屏段可归原创内容（CC BY-NC）；照片段与音轨、宣传片海报图、OG 分享图为 AI 辅助生成或来源待核实，不纳入 CC BY-NC 授权；历史 MIT 许可不撤销 |
| `site/www.yanghat.cn/assets/lantern.svg` | 品牌标识，与 logo、favicon、「开窍」「养习」名称及 yanghat.cn 域名一并保留，不授予品牌使用权；历史有效版权许可不撤销 |
| `site/www.yanghat.cn/assets/{brand,favicon}.svg`、其他路径中嵌入的「开窍」「养习」名称/logo | 品牌保留：不在本次 MIT / CC 授权范围；历史已有效授出的版权许可不追溯撤销；不限制法律允许的合理指称 |
| `src/**/*.{ts,tsx}` 中非内容部分、`workers/**`、`scripts/**`、`*.{json,ts,mjs}`、`vite.config.*`、`site/**/_*`、`**/*.css`、`**/sw*.js` | 原创程序逻辑、worker、脚本、配置、样式 MIT；第三方代码例外 |
| `site/www.yanghat.cn/app/**`、`docs/assets/**`、`docs/offline.html`、`public/ocr/**`、其他构建拷贝 | 按来源继承：构建不会把混合内容变为单一 MIT；第三方 PDF/OCR/模型/依赖保留上游许可 |
| `reports/**`、`docs/**`、其他 `*.md` | 技术记录、开发文档与示例代码沿用 MIT；引用的教学文字、宣传素材按内容规则，第三方引用按原许可 |

混合文件按元素划分：文件中的原创教学文字、题干、讲解、插图表达归内容，程序代码归 MIT。随机生成算法、答案计算、参数约束、组件交互与 worker 属代码；数学事实、公式和不受版权保护的元素不因本声明受限。构建输出继承各组成部分的许可。

## 2. 内容的非商业许可与署名

上述可授权原创内容采用 [知识共享 署名—非商业性使用 4.0 国际（CC BY-NC 4.0）](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans)；以[完整法律条款](https://creativecommons.org/licenses/by-nc/4.0/legalcode.zh-hans)为准。

允许为非商业目的复制、分享与改编。使用时应合理注明“yangge / 开窍”，提供来源及许可链接，并注明是否作过修改；不得暗示作者认可或背书。法律允许的引用、合理使用及其他例外不受本声明限制。本许可不要求改编作品采用相同许可，也不得添加妨碍许可权利的技术或法律限制。

培训机构、补习班、付费课程等将本内容用于收费教学、收费资料、付费服务，或其他主要为商业优势/金钱报酬的使用，视为商业使用，不在本 CC BY-NC 授权内，请联系 hello@yanghat.cn 获取单独授权。是否非商业以实际使用目的及 CC 标准条款判断，非仅按组织名称判断。MIT 代码本身仍允许商业使用；商业使用本内容需另行授权。

## 3. 名称、logo 与域名保留

「开窍」「养习」名称、相关 logo、品牌吉祥物及 yanghat.cn 域名不在本次 MIT 或 CC BY-NC 授权范围内。本声明不授予商标、品牌经营、域名所有权或官方身份使用权；法律允许的合理指称及必要署名不受影响。含品牌标识的宣传素材不因此授权将该标识用作自己的品牌。历史已经有效授出的版权许可见第4节，不追溯撤销。

## 4. 历史版本与生效边界

本声明不追溯适用。以 **main@17a25022（完整提交 `17a25022bf02997f99564820c0b9f92a25bf8bca`）** 为界：该提交及以前按 MIT 发布的内容继续适用 MIT；之后新发布且 yangge 有权授权的原创内容适用 CC BY-NC 4.0，代码仍适用 MIT。生效日期为 2026-10-29，提交边界优先；已获得的有效 MIT 权利不因本声明被撤回。未经修改而继承的历史 MIT 内容仍保留原有许可，不能通过构建或复制撤销许可。第三方作品按其原有许可。

## 5. 第三方素材及其许可

经核对未发现仓库分发的第三方字体文件、Google Fonts 下载引用或明确标注的教材扫描插图；这不代表所有素材来源已经确认。第三方权利不由本声明重授：

| 项目 | 许可 / 状态 |
|---|---|
| Lucide React 图标 | ISC；上游含部分 Feather/MIT 来源声明，保留完整上游 LICENSE，https://lucide.dev/license |
| React、React DOM、Radix Slot、Zustand 等生产库 | 依各上游 MIT/ISC/BSD/Apache 声明；完整锁定清单见核对报告，发布时保留许可与适用 NOTICE |
| JSZip | MIT OR GPL-3.0-or-later，项目选择 MIT 路径 |
| pako | MIT AND Zlib，保留两者适用声明；原文随分发保存在 `public/licenses/pako-MIT.txt` 与 `public/licenses/pako-Zlib.txt`，release 复制到 `docs/licenses/` 和 `site/www.yanghat.cn/app/licenses/` |
| PDF.js | Apache-2.0 |
| Tesseract.js、tesseract.js-core、tessdata_fast 中英文模型 | Apache-2.0；不纳入本项目 CC 内容许可 |
| 宣传片片头/片尾照片式画面、音轨、栅格化字体；宣传 JPG 的对应素材 | AI 辅助生成或来源待核实，不纳入 CC BY-NC 授权；发布前补充来源或替换 |
| 灯笼 SVG、品牌 SVG 与宣传 SVG | logo、favicon、灯笼均按品牌标识保留，不纳入内容授权；其他未核实素材不授予许可 |

第三方库、模型、字体与素材始终按其自己的条款使用。未经权利确认的部分不能依本声明主张取得使用权。

## English summary

Code remains under the MIT License. Original educational text, explanations, question templates, illustrations and promotional content that yangge has the right to license are offered under CC BY-NC 4.0, effective 2026-10-29. Noncommercial sharing and adaptation are allowed with attribution, a license link and a change notice. Paid tutoring, paid courses and other commercial uses of the content require separate permission: hello@yanghat.cn.

Mixed files are licensed by element: code under MIT; original educational expression under CC BY-NC 4.0. Third-party works retain their own licenses; unresolved promotional imagery/audio are excluded pending clearance. The names 开窍 and 养习, logos and the yanghat.cn domain are reserved and are not licensed by this notice. The boundary is main@17a25022 (17a25022bf02997f99564820c0b9f92a25bf8bca): that commit and earlier MIT-licensed material retain MIT permissions. New licensable original content published after that boundary is CC BY-NC 4.0 from 2026-10-29; unchanged historical material keeps its MIT license. Video photographic segments and soundtrack, the promotional poster and OG image are AI-assisted or of unverified origin and excluded from CC BY-NC. Product screen recordings may qualify as original content. Logos, favicons and the lantern mascot are reserved brand identifiers. Statutory exceptions and previously granted rights remain unaffected.
