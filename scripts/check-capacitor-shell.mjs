// 确认 iOS 壳打包的是本地练习，而不是跳到线上网站的空壳。
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const read = (file) => readFileSync(file, "utf8");
const config = read("capacitor.config.ts");
const configCode = config.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
assert.match(config, /appId:\s*"cn\.yanghat\.kaiqiao"/);
assert.match(config, /appName:\s*"开窍"/);
assert.match(config, /webDir:\s*"dist"/);
assert.match(config, /中国大陆/);
assert.equal(/^\s*url\s*:/m.test(configCode), false, "capacitor.config.ts 不能设置 server.url");
assert.equal(configCode.includes("https://www.yanghat.cn"), false, "配置里不能写入线上地址");

for (const file of ["index.html", "src/main.tsx"]) {
  const source = read(file);
  assert.match(source, /capacitor:/, file);
  assert.match(source, /isNativePlatform/, file);
}

const home = read("site/www.yanghat.cn/index.html");
assert.match(home, /href="\/privacy\.html"/);
assert.match(home, /href="\/support\.html"/);

const privacy = read("site/www.yanghat.cn/privacy.html");
const support = read("site/www.yanghat.cn/support.html");
for (const [name, html] of [["privacy", privacy], ["support", support]]) {
  assert.match(html, /本机/, name);
  assert.match(html, /不强制登录|不需要登录|不需要注册|无需注册/, name);
  assert.match(html, /中国大陆/, name);
  assert.equal(/ICP备\d/.test(html), false, `${name} 不能写虚构备案号`);
  assert.equal(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(html), false, `${name} 不能写未公开的邮箱`);
}
assert.match(privacy, /隐私政策/);
assert.match(privacy, /kaiqiao\.save\.v1/);
assert.match(support, /待运营者填写/);
assert.match(support, /Mainland China/);

const report = read("reports/开窍-App-Capacitor脚手架-20261026.md");
for (const phrase of ["Mainland China", "中国大陆", "ICP", "教育移动", "Apple Developer", "server.url", "dist/"]) {
  assert.ok(report.includes(phrase), `交付文档缺少：${phrase}`);
}

assert.ok(existsSync("ios/App/App.xcodeproj/project.pbxproj"), "缺少 Xcode 工程");
const plist = read("ios/App/App/Info.plist");
assert.match(plist, /开窍/);
assert.match(plist, /CAPBridgeViewController|UISceneDelegateClassName|UIApplicationSceneManifest/);
const nativeFiles = [
  "ios/App/App/AppDelegate.swift",
  "ios/App/App/SceneDelegate.swift",
  "ios/App/App/Base.lproj/Main.storyboard",
].filter((file) => existsSync(file));
const native = nativeFiles.map((file) => read(file)).join("\n");
assert.match(native, /CAPBridgeViewController/);
assert.equal(native.includes("yanghat.cn"), false);

if (existsSync("ios/App/App/capacitor.config.json")) {
  const iosConfig = read("ios/App/App/capacitor.config.json");
  assert.equal(/"url"\s*:/.test(iosConfig), false, "iOS 配置不能带远程 url");
  assert.equal(iosConfig.includes("yanghat.cn"), false);
}

const distIndex = read("dist/index.html");
assert.match(distIndex, /id="root"/);
assert.match(distIndex, /capacitor:/);
const script = distIndex.match(/src="(\.\/assets\/[^"]+\.js)"/)?.[1];
assert.ok(script, "dist/index.html 没有本地练习脚本");
assert.equal(distIndex.includes("https://www.yanghat.cn"), false);
const bundle = read(path.join("dist", script));
assert.match(bundle, /练习年级/);
assert.ok(statSync("dist/ocr/lang/chi_sim.traineddata.gz").size > 1_000_000, "OCR 模型应随本地资源打包");
assert.match(read("site/www.yanghat.cn/app/index.html"), /src="\.\/assets\//);

console.log("PASS: iOS 壳使用本地 dist 练习，未配置远程 WebView");
