import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

/** 把指针位置换算成 SVG 坐标。 */
export function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: pt.x, y: pt.y };
}

/**
 * 简单的 SVG 拖动：按下时捕获指针，移动时回调 SVG 坐标，松开时结束。
 * 指针捕获保证手指移出元素也能继续拖，结束时自动释放，不会留下监听器。
 */
export function useSvgDrag(onMove: (p: { x: number; y: number }) => void, onEnd?: (p: { x: number; y: number }) => void) {
  const active = useRef(false);
  const handlers = {
    onPointerDown: useCallback((e: ReactPointerEvent<SVGElement>) => {
      active.current = true;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement);
      onMove(svgPoint(svg, e.clientX, e.clientY));
      e.preventDefault();
    }, [onMove]),
    onPointerMove: useCallback((e: ReactPointerEvent<SVGElement>) => {
      if (!active.current) return;
      const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement);
      onMove(svgPoint(svg, e.clientX, e.clientY));
    }, [onMove]),
    onPointerUp: useCallback((e: ReactPointerEvent<SVGElement>) => {
      if (!active.current) return;
      active.current = false;
      const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement);
      onEnd?.(svgPoint(svg, e.clientX, e.clientY));
    }, [onEnd]),
    onPointerCancel: useCallback(() => { active.current = false; }, []),
  };
  return handlers;
}
