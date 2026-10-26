# 养习主站源码（www.yanghat.cn / yanghat.cn）

- `www.yanghat.cn/`：静态落地页（index.html + styles.css + app.js + assets/ + _headers），不依赖构建工具和框架。另有草稿页 `privacy.html`（隐私政策）和 `support.html`（支持与联系），公开路径是 `/privacy.html`、`/support.html`。这一轮只把文件放进目录，不上传、不改 DNS。
- 对外只使用 yanghat.cn / www.yanghat.cn。主页是门面；「开始练习」进入 `/?practice=1`。同一页用同域 iframe 内嵌 `/app/`，地址栏保持 `/?practice=1`（可带课程参数），不把 `/app/` 或 kaiqiao 子域当作入口。顶层打开 `/app/` 会回到 `/?practice=1`。
- 托管：Cloudflare Pages 项目 **yanghat-cn**（Direct Upload，绑定 www.yanghat.cn 和 yanghat.cn）。开窍资源放在同一项目的 `/app/`，只供内嵌和离线缓存；旧项目 kaiqiao-cn 仅用于迁移期。本目录的改动不包含 DNS 或部署。
- 来历：2026-10-21 从线上完整镜像作为基线（原部署 2026-10-15），同日改版：新增“互动课”区块和导航入口（直达 v0.12.0 新课）、主按钮更醒目、小字号与对比度、手机布局、FAQ 补充互动课。
- 部署：把 `site/www.yanghat.cn/` 目录用 Pages Direct Upload 上传到 yanghat-cn（与开窍 docs/ 的上传方式相同）。上传根目录必须同时有主页和 `app/`。
- `npm run build` / `npm run release` 自动同步完整应用到 `www.yanghat.cn/app/`；正式发布先运行 check 和 release，再上传整个 www.yanghat.cn 目录。
