import type { CapacitorConfig } from "@capacitor/cli";

/**
 * 开窍 iOS 壳。只准备中国大陆 App Store，不准备其他店面。
 * 店面勾选在 App Store Connect，不在这里做地区锁。
 *
 * webDir 是 `npm run build` 产出的 dist/。
 * 构建结束时，同一份文件会同步到 site/www.yanghat.cn/app/。
 * 壳加载的是这份本地练习，不是养习主页，也不是远程网页。
 *
 * 禁止添加 server.url。指向 https://www.yanghat.cn 会变成远程 WebView，
 * 离线打不开练习，也更容易被 App Store 指南 4.2 拒绝。
 */
const config: CapacitorConfig = {
  appId: "cn.yanghat.kaiqiao",
  appName: "开窍",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
  },
  server: {
    iosScheme: "capacitor",
    androidScheme: "https",
  },
};

export default config;
