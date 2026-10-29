# 养习主站源码（www.yanghat.cn / yanghat.cn）

- `www.yanghat.cn/`：静态落地页（index.html + styles.css + app.js + assets/ + _headers），不依赖构建工具和框架。
- 对外只使用 yanghat.cn / www.yanghat.cn。主页是门面；「开始练习」进入 `/?practice=1`。同一页用同域 iframe 内嵌 `/app/`，地址栏保持 `/?practice=1`（可带课程参数），不把 `/app/` 或 kaiqiao 子域当作入口。顶层打开 `/app/` 会回到 `/?practice=1`。
- 托管：Cloudflare Pages 项目 **yanghat-cn**（Direct Upload，绑定 www.yanghat.cn 和 yanghat.cn）。开窍资源放在同一项目的 `/app/`，只供内嵌和离线缓存；旧项目 kaiqiao-cn 仅用于迁移期。本目录的改动不包含 DNS 或部署。
- 来历：2026-10-21 从线上完整镜像作为基线（原部署 2026-10-15），同日改版：新增“互动课”区块和导航入口（直达 v0.12.0 新课）、主按钮更醒目、小字号与对比度、手机布局、FAQ 补充互动课。
- 部署：把 `site/www.yanghat.cn/` 目录用 Pages Direct Upload 上传到 yanghat-cn（与开窍 docs/ 的上传方式相同）。上传根目录必须同时有主页和 `app/`。
- `npm run build` / `npm run release` 自动同步完整应用到 `www.yanghat.cn/app/`；正式发布先运行 check 和 release，再上传整个 www.yanghat.cn 目录。

- 主站校验：`npm run test:site` 校验 FAQ JSON-LD 与可见问答一致、缓存规则及内嵌入口。若 Playwright 浏览器未安装，可用 `CHROMIUM_PATH` 指向系统 Chromium。
- FAQ 文案修改后运行 `node scripts/check-site-seo.mjs --write` 同步结构化数据，再运行默认校验（不带 `--write`）。
- 缓存：仅 `/app/assets/*` 的哈希资源和明确带版本的分享图使用 immutable；新增长缓存资源须使用新文件名，并为其增加精确路径规则。未版本化媒体使用一小时缓存；首页 CSS/JS 的 query 版本不用于匹配 `_headers`，保持 no-cache。同步或发布脚本不重写主站 `_headers`。

## 启用统计

当前提交默认开启。仓库根 `.env.production` 写着 `VITE_EVENT_ENDPOINT=/e`（无密钥，随仓库提交）。这是唯一客户端构建开关，同时用于应用 bundle 和首页 `metrics-config.js`；运行时不读取环境变量。普通 `npm run release` / `npm run build` 都会读到它：Vite 在 production 模式加载该文件，`scripts/build-grade-pages.mjs` 用同一套 `loadEnv('production')` 生成 `export default "/e"`。已经存在的 shell 变量优先于文件，所以 `VITE_EVENT_ENDPOINT=/e npm run release` 仍然显式打开。只统计六种事件的次数，不能推断独立人数。

上线前由管理员在 Pages 项目 yanghat-cn 的目标环境绑定 Analytics Engine：变量 `METRICS` → 数据集 `kaiqiao_metrics`，并确认配额与 Functions 的 fail_open 设置。不新增 wrangler 配置文件。只有从 `site/` 目录部署才编译 `site/functions/`；显式 `_routes.json` 只包含 `/e` 与 `/api/help`，其余静态资源继续使用原 `_headers` 和 `_redirects`。

在仓库根构建：

```sh
npm run release
```

然后在仓库根运行固定部署护栏（以下仅为操作文档，本任务未执行）：

```sh
npm run deploy:site
```

关闭：把 `.env.production` 里的 `VITE_EVENT_ENDPOINT` 留空后重新 `npm run release`。单次构建也可以用空的 shell 变量覆盖文件：`VITE_EVENT_ENDPOINT= npm run release`。再运行 `npm run deploy:site`。函数始终部署；未绑定或关闭时 `/e` 返回 503，`/api/help` 返回兜底。只 `unset VITE_EVENT_ENDPOINT` 时，文件里的 `/e` 仍会在下次普通 `npm run release` 生效。

同源判断：`Origin` 存在且不是字面量 `null` 时必须等于请求源。现行 Fetch 里 `fetch()` 默认 mode 为 `cors`，即使 `referrerPolicy` 为 `no-referrer` 也发送真实 Origin（`public/metrics.js` 就是这种调用；Chromium 实测 Origin 为页面源，且不带 Referer）。字面量 `Origin: null` 只用于非 cors 的非 GET/HEAD，例如表单提交。服务端仍接受它，但必须同时有 `Sec-Fetch-Site: same-origin`；任何其他 `Sec-Fetch-Site` 一律 403。部署命令需带 `CLOUDFLARE_ACCOUNT_ID` 环境变量（与现有静态部署相同）。

本地验证：`node scripts/check-metrics-backend.mjs` 检查打包与路由；`node scripts/check-metrics-pagesdev.mjs` 单独启动端口 8788 并在结束时清理进程，无 AE 本地绑定时验证 503、405、静态头、404 页和旧入口重定向，并用 Chromium 验证首页只向同源 `/e` 发送、载荷只有 `{v,event,grade,count}`、不带 Cookie/Referer，且真实客户端请求通过全部校验（503）。`npm run test:site` 另外断言没有任何非同源请求。全局 wrangler 缺失时，前者仅跳过打包子项。

### 查询统计

仅管理员使用 [AE SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)：`POST https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql`，请求 body 为 SQL，认证头为 `Authorization: Bearer <API_TOKEN>`。令牌需要 **Account | Account Analytics | Read**，限定目标账号；不要把真实令牌写入仓库、客户端或日志。本任务未调用此 API。

最近七天生产事件与年级次数：

```sql
SELECT blob1 AS event, blob2 AS grade,
       SUM(_sample_interval * double1) AS n
FROM kaiqiao_metrics
WHERE blob3 = 'prod' AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY event, grade
ORDER BY n DESC
```

按天聚合（使用 AE timestamp 的默认 UTC 日界，不是北京时间自然日）：

```sql
SELECT toStartOfDay(timestamp) AS day, blob1 AS event, blob2 AS grade,
       SUM(_sample_interval * double1) AS n
FROM kaiqiao_metrics
WHERE blob3 = 'prod' AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY day, event, grade
ORDER BY day, n DESC
```

`blob1` 是事件，`blob2` 为 `none` 或 `1`–`6`，`blob3` 为 `prod` / `preview` / `dev`；`index1` 为事件，`double1` 固定 1。时间戳由 AE 生成，客户端不提交时间或标识。只查询聚合，不导出逐条事件。[默认保留三个月](https://developers.cloudflare.com/analytics/analytics-engine/limits/)；AE 可在写入和查询时采样，必须用 `_sample_interval` 加权，结果不能作为精确人数或审计账本。

## 启用 AI 帮助

当前默认开启；留空即关闭。唯一客户端构建开关为 `VITE_HELP_ENDPOINT`，仅允许空字符串或 `/api/help`，其他值构建报错。关闭后首页 `help-config.js` 为 `export default ""`，应用与首页都不显示帮助按钮、不发送帮助请求。帮助是单轮网站使用问答，不存聊天，不要求注册登录；发送前会用正则替换常见个人信息，请仍不要输入姓名、电话、学校、住址等信息。

系统提示覆盖开始练习、练习年级、学情、备份与恢复、反馈邮箱与充值说明。充值说明是 `workers/help/prompt.js` 的 `TOPUP_GUIDANCE` 常量；手动充值页上线前只回答「充值功能即将上线，请家长操作；有问题发邮件 hello@yanghat.cn」，不出现任何价格。上线充值页的 PR 只改该常量及 `prompt.test.ts`。

上线前由管理员创建 D1 数据库 `kaiqiao_help`（确认免费额度），在 Pages 项目 **yanghat-cn 的生产环境**绑定 `HELP_DB` 到该库。只保存北京时间日期与当日累计微元花费、北京时间分钟桶与调用次数，无请求内容或用户标识；表在首次配置完整的合法请求中自动创建。不新增 wrangler 配置文件。

管理员交互式输入密钥（不要写文件、不要把密钥放在命令行参数中）：

```sh
wrangler pages secret put DEEPSEEK_API_KEY --project-name yanghat-cn
```

获准启用后，与统计同一机制：在仓库根 `.env.production` 追加一行 `VITE_HELP_ENDPOINT=/api/help`（保留现有 `VITE_EVENT_ENDPOINT=/e`，统计保持开启），再运行：

```sh
npm run release
```

Vite 与 `scripts/build-grade-pages.mjs` 都用 `loadEnv('production')` 读取，shell 变量优先，所以单次构建也可 `VITE_HELP_ENDPOINT=/api/help npm run release`（统计仍由文件打开）。当前 `.env.production` 已含 `VITE_HELP_ENDPOINT=/api/help`，默认开启；留空即关闭。然后运行部署护栏，确保编译 `site/functions/`：

```sh
npm run deploy:site
```

显式函数路由仅含 `/e` 与 `/api/help`；其余资源沿用 `_headers` 与 `_redirects`。本节命令仅为管理员操作文档，本任务不创建数据库、secret 或部署。

每日上限固定 **1 元（1,000,000 微元）**，不能通过环境变量调大，按北京时间自然日重置。每次先由 D1 原子预留最坏花费，再按 usage 结算。保守使用输入未命中 2 微元/token、缓存命中 0.04 微元/token、输出 8 微元/token 的固定高峰价；超时、网络错误或缺少有效 usage 不退预留，非 2xx 全退。结算失败保留预留，因此查询数字可能高于实际账单，不作为账单凭证。D1 出错或配置缺失均关闭上游调用；达到上限只返回友好兜底，不影响练习。全站上限 **20 次/分钟**，使用北京时间分钟桶，原子计数并删除旧桶，不存用户数据；超限返回 busy 兜底，不预留日额度、不调用上游。分钟名额在日额度拒绝时也会消耗。settle 将花费夹紧到 0 至日上限。

模型固定为 `deepseek-flash`，显式 `thinking: {type: 'disabled'}`，非思考模式，最多 300 token、temperature 0.3、不流式；只读取 content，绝不将 reasoning_content 用作答案。模型与思考参数见 https://api-docs.deepseek.com/api/create-chat-completion ，高峰定价见 https://api-docs.deepseek.com/zh-cn/quick_start/pricing 。

答案清理后按 Unicode 码点截断到 600 字，避免截断 emoji 代理对。PII 保留邮箱、手机、座机脱敏，证件号限制为日期结构有效的 15/18 位；账号要求标记与至少三位标识，号码仅匹配银行卡式 16–19 位；地址要求门牌、楼栋组合或居住语境，姓名与学校结合边界和停用词，避免误伤数学题与年级。

查询最近七个日期的累计花费（微元除以 1,000,000 为元）：

```sh
wrangler d1 execute kaiqiao_help --remote --command "SELECT * FROM help_spend ORDER BY day DESC LIMIT 7"
```

回滚：删掉 `.env.production` 里的 `VITE_HELP_ENDPOINT` 行（或单次 `VITE_HELP_ENDPOINT= npm run release`），保留 `VITE_EVENT_ENDPOINT=/e`，重新 release 并**仍从 `site/` 部署**（否则会撤掉 `/e` 统计函数），前端即隐藏。管理员删除 `DEEPSEEK_API_KEY` secret 后，服务端合法请求返回 unconfigured 兜底且不写 D1、不调用上游。

本地验证：`node scripts/check-help-client.mjs` 自动切换默认/启用构建，用 Playwright 拦截假回答，全程不调用外部 API，结束恢复默认产物。`node scripts/check-help-pagesdev.mjs` 使用 wrangler 4 和临时本地 D1，默认不传密钥，验证兜底、错误状态、静态头与旧重定向，结束清理进程与临时目录。`WRANGLER` 可指定二进制，默认 `/tmp/wrangler4/node_modules/.bin/wrangler`。仅管理员明确授权后才可运行 `HELP_REAL_ONCE=1` 模式：要求父进程已有密钥，仅经子进程环境传递（`CLOUDFLARE_INCLUDE_PROCESS_ENV=true`，wrangler 绑定表显示 `(hidden)`），一次真实提问后直接读取临时本地 D1 文件打印当日花费，不写密钥文件。

部署护栏固定项目 yanghat-cn、main 分支和 site/ 工作目录，检查函数、路由、生成配置和静态入口，并拒绝 site/ 或 .env.production 未提交改动。`npm run deploy:site -- --check` 仅检查；`DEPLOY_ALLOW_DIRTY=1` 可带警告跳过已提交检查。部署子进程不继承 DEEPSEEK_API_KEY。
