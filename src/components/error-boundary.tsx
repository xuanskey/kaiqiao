import { Component, type ErrorInfo, type ReactNode } from "react";
import { shouldReset } from "@/lib/error-reset";


type Props = { children: ReactNode; resetKey?: unknown; scope: "app" | "page" };

/**
 * 渲染出错时显示可读的提示，而不是整页白屏。
 * 不上报错误内容（不采集任何信息），只在控制台留一条记录方便家长截图反馈。
 */
export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown, info: ErrorInfo) { console.error("[开窍] 页面渲染出错", error, info.componentStack); }
  componentDidUpdate(prev: Props) { if (shouldReset(prev.resetKey, this.props.resetKey, this.state.hasError)) this.setState({ hasError: false }); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return <div role="alert" className="error-fallback">
      <h2>{this.props.scope === "app" ? "页面出了点问题" : "这一页出了点问题"}</h2>
      <p>练习记录还保存在这台设备的浏览器里，没有丢失。{this.props.scope === "page" ? "可以先点上面的导航换个页面，或" : "可以"}重新加载试试；还不行请发邮件到 hello@yanghat.cn。</p>
      <button type="button" onClick={() => location.reload()}>重新加载</button>
    </div>;
  }
}
