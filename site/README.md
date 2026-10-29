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

上线前由管理员在 Pages 项目 yanghat-cn 的目标环境绑定 Analytics Engine：变量 `METRICS` → 数据集 `kaiqiao_metrics`，并确认配额与 Functions 的 fail_open 设置。不新增 wrangler 配置文件。只有从 `site/` 目录部署才编译 `site/functions/`；显式 `_routes.json` 只包含 `/e`，其余静态资源继续使用原 `_headers` 和 `_redirects`。

在仓库根构建：

```sh
npm run release
```

然后从 `site/` 部署（以下仅为操作文档，本任务未执行）：

```sh
cd site
wrangler pages deploy www.yanghat.cn --project-name yanghat-cn
```

关闭：把 `.env.production` 里的 `VITE_EVENT_ENDPOINT` 留空后重新 `npm run release`。单次构建也可以用空的 shell 变量覆盖文件：`VITE_EVENT_ENDPOINT= npm run release`。再从仓库根执行 `wrangler pages deploy site/www.yanghat.cn --project-name yanghat-cn`。根目录没有 `functions/`，因此普通静态部署撤去函数，客户端也恢复关闭。未绑定时合法 `/e` 返回 503，不影响练习。只 `unset VITE_EVENT_ENDPOINT` 时，文件里的 `/e` 仍会在下次普通 `npm run release` 生效。

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
