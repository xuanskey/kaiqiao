# 开窍 iOS 壳（Capacitor）脚手架

日期：2026-10-26。这一轮只加本地壳和草稿页，不开支、不改 DNS、不上传站点、不合并。

销售范围：**仅中国大陆 App Store（Mainland China）**。不要上其他国家或地区的店面，也不要勾选「全部国家或地区」。香港、澳门、台湾和其他所有店面都不选。

## 打进 App 的是哪一份资源

练习源码用 Vite 构建，`base` 为 `./`，资源用相对路径。

| 步骤 | 产物 | 用途 |
| --- | --- | --- |
| `npm run build` | `dist/` | iOS 壳的 `webDir`。含 `index.html`、`assets/`、`ocr/`（本机文字识别模型） |
| 同一次 build | `site/www.yanghat.cn/app/` | 网站内嵌目录，和 `dist/` 同一份文件。对外入口仍是 `/?practice=1`，不是这个目录 |
| `npm run release` | `docs/` 和带预缓存的 `sw.js` | 网站发布用。打 iOS 包不要依赖这次覆盖后的 Service Worker |

壳的启动页是 `dist/index.html` 里的练习（页面上有「练习年级」），不是养习主页，也不是一个只打开 `https://www.yanghat.cn` 的 WebView。

网站上顶层访问 `/app/` 会回到 `/?practice=1`。这个跳转只在路径正好是 `/app`、且不在 iframe、也不是 `file:` / `capacitor:` / Capacitor 原生壳时发生。App 把练习放在包内根路径 `/`，不会走出这个跳转。原生壳也不注册 Service Worker，避免缓存层把本地文件换成线上请求。

`capacitor.config.ts` 的 `webDir` 是 `dist`。没有 `server.url`。不要加上它。

## 本地构建

需要 Node.js 24 或更高，以及一台 Mac 上的 Xcode。本仓库的 Linux 环境没有 Xcode，不能签名，也不能跑模拟器。

```bash
npm ci
npm run check
npm run build:ios
```

`build:ios` 等于 `npm run build` 再 `npx cap sync ios`。sync 把 `dist/` 复制到 `ios/App/App/public/`。`public/` 是生成目录，不提交；克隆之后必须先跑 `build:ios`，再打开 Xcode。

只改了网页、还要刷新壳里的练习时，再跑一次 `npm run build:ios`。

## 在 Mac 上打开 Xcode

1. 安装与 Capacitor 8.5 匹配的 Xcode（8.5 起工程使用 UIScene；Xcode 27 需要这套生命周期）。
2. 在仓库根目录执行上面的 `npm ci` 和 `npm run build:ios`。
3. 用 Xcode 打开 `ios/App/App.xcodeproj`。如果以后装了 CocoaPods 并生成了 `App.xcworkspace`，就打开 workspace。
4. 目标选 App，签名团队选杨哥自己的 Apple Developer 团队。Bundle ID 使用 `cn.yanghat.kaiqiao`，要先在开发者后台登记这个 ID。
5. 选模拟器或真机，Run。断网后再打开：应直接进入练习，能选年级、做题、看解析。地址不应变成 `https://www.yanghat.cn`。
6. 真机归档用 Product → Archive，再从 Organizer 上传到 App Store Connect。上传不等于提审，更不等于通过。

`npx cap open ios` 只在装了 Xcode 的 Mac 上有用。

## 版本

Capacitor 依赖版本以 `package.json` / `package-lock.json` 为准。这一轮加入的是 `@capacitor/core`、`@capacitor/ios` 和开发依赖 `@capacitor/cli`，主版本 8.5。网页练习没有把 Capacitor 打进浏览器包，只在原生壳里使用。

## 杨哥还要自己做的事

下面几项本仓库做不了，也不能用虚构信息代替。

1. **Apple Developer Program 年费。** 用运营主体注册开发者账号并缴纳苹果当年的年费（金额以苹果注册页为准）。没有这个账号就不能建 Bundle ID、证书和上架记录。本次不代注册、不代付。
2. **证书和描述文件。** 在这台开发者账号里创建 Apple Distribution 证书、App Store 描述文件，并在 Xcode 里选中团队。本环境没有证书。
3. **ICP 备案号，写入 App Store Connect。** 中国大陆店面要求填写工信部 ICP 备案号（以 App Store Connect 里「中国大陆可用性 / ICP Filing Number」当时的字段为准）。简体中文的 App 名称、副标题和主体信息要和备案凭证一致。备案号还没有，隐私页和支持页故意不写号码。不要填别人的号，也不要先提审再补。
4. **教育移动应用备案（若适用）。** 开窍是给小学生用的数学练习，按教育部《教育移动互联网应用程序备案管理办法》，教育类移动应用的提供者通常要在提供前完成教育移动应用备案。是否必须、向哪一级教育行政部门提交，由运营主体对照现行办法确认。未确认适用、或适用但还没备案，就不要提审。本脚手架不能代替这项备案。
5. **支持邮箱。** `support.html` 里现在是「待运营者填写」。换成可收信邮箱之后，才能把 `https://www.yanghat.cn/support.html` 填进 App Store Connect 的支持网址。
6. **把两个草稿页真正公开。** 文件在 `site/www.yanghat.cn/privacy.html` 和 `support.html`。下一次上传整个 `site/www.yanghat.cn/` 时会一起公开为：
   - 隐私政策：`https://www.yanghat.cn/privacy.html`
   - 支持：`https://www.yanghat.cn/support.html`
   这一轮不上传。网址还打不开时，不要提审。法定主体名称确定后补进隐私页，再上传。
7. **App Store Connect 销售范围只选 Mainland China。** Pricing and Availability → 特定国家或地区 → 只选 China mainland。不要选全部地区，这样以后新增的店面也不会自动打开。
8. **简体中文元数据。** 主语言用简体中文。名称用「开窍」。分类建议教育。年龄分级按问卷填写。不要勾选 Made for Kids，除非先处理可选的 AI 老师：该功能默认关闭，家长打开后会把提问发到家长自己填写的第三方接口，和儿童分类的额外限制容易冲突。
9. **隐私问卷。** 练习数据不出设备。问卷里要单独说明可选 AI 老师：默认不发送；家长开启后，文本发到家长填写的地址，开窍运营者不接收。不要在开启了这个功能的版本里勾「完全不收集」而不提这一句。
10. **出口合规。** 工程里把非豁免加密标成否。App 只使用系统 HTTPS，没有自研加密。上传时按这个回答。

## 自测清单

网页（本仓库可以跑）：

- [ ] `npm run check` 通过（含类型检查、测试、渲染、生产构建、壳配置检查）
- [ ] `capacitor.config.ts` 没有 `server.url`
- [ ] `dist/index.html` 用相对路径加载 `./assets/`，正文脚本里有「练习年级」
- [ ] `dist/ocr/` 里有本地识别模型
- [ ] 打开 `site/www.yanghat.cn/privacy.html` 和 `support.html`，能看懂「数据在本机、不需要登录」
- [ ] 主页页脚有这两个链接，练习入口仍是 `/?practice=1`

Mac 上的 App（本环境没有 Xcode，下面留给杨哥）：

- [ ] `npm run build:ios` 成功
- [ ] Xcode 能打开工程并在模拟器启动
- [ ] 飞行模式下能选年级、做一题、看解析、打开错题本和学情
- [ ] 启动后不是空白页，也没有跳进养习主页
- [ ] 桌面名称显示「开窍」

提审前：

- [ ] 开发者年费已付，Bundle ID `cn.yanghat.kaiqiao` 已登记
- [ ] 证书能 Archive
- [ ] 销售范围只有 Mainland China
- [ ] ICP 备案号已填，且与简体中文名称、主体一致
- [ ] 教育移动应用备案已按适用情况完成或书面确认不适用
- [ ] 隐私政策网址和支持网址在公网返回这两页，支持邮箱已是真实地址

## 本环境已经验证的部分

环境：Linux，Node.js 24.22.1，没有 Xcode，也没有 iOS 模拟器。Capacitor 8.5.3（`@capacitor/core`、`@capacitor/ios`、`@capacitor/cli`）。

- `npx cap add ios` 和 `npx cap sync ios` 都成功。sync 把 `dist/` 复制到 `ios/App/App/public/`（该目录不提交）。
- 复制进去的 `index.html` 用 `./assets/` 加载练习脚本，页面标题是「开窍 · 每天练一组」，没有 `https://www.yanghat.cn`。
- `npm run check` 通过：类型检查、233 项测试、渲染检查、生产构建、壳配置检查。
- 之后跑了 `npm run release`。网站离线缓存要以这次 release 的 `sw.js` 为准；只跑 build 会暂时写成空的 worker。CI 会在 check 之后再跑 release，并核对 `docs/`。
- `npm run test:site` 通过：主页入口仍是 `/?practice=1`，顶层 `/app/` 会回到练习，离线刷新仍然能看到「练习年级」。
- 用 Playwright 打开打包后的 `dist/`：能看到「练习年级」，点「完成每日练习」进入准备页。随后关掉静态服务器，只从 `dist/` 磁盘文件响应，刷新后仍能打开错题本和学情，没有向 `yanghat.cn` 发请求。注入 `Capacitor.isNativePlatform()` 后没有注册 Service Worker。
- 同一浏览器打开了 `privacy.html` 和 `support.html`，手机宽度 390 和桌面宽度 1280 都没有横向溢出。主页页脚可以进这两页。支持页上仍是「待运营者填写」，没有邮箱地址。

没有做的验证：没有用 Xcode 编译，没有装到模拟器或真机，没有签名，没有打开 App Store Connect。

## 明确不做

- 不把壳设成打开 `https://www.yanghat.cn`
- 不改 Cloudflare、DNS 或线上站点
- 不购买开发者账号，不申请证书，不填写假备案号
- 不合并这个 PR
