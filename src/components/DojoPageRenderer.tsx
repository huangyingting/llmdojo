"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { resolveClientComponent } from "@/lib/dojo-client-registry";

function renderAstNode(node: unknown, fallbackKey?: string | number): React.ReactNode {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }
  if (typeof node === "string" || typeof node === "number") {
    return node;
  }
  if (Array.isArray(node)) {
    if (node[0] === "$el") {
      const rawType = node[1] as string | null;
      const explicitKey = node[2] as string | number | null;
      const rawProps = (node[3] ?? {}) as Record<string, unknown>;
      const key =
        explicitKey !== null && explicitKey !== undefined
          ? explicitKey
          : fallbackKey;

      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawProps)) {
        if (k === "children") continue;
        // Skip external Next.js chunk script tags from original SSR capture
        if (rawType === "script" && k === "src") {
          return null;
        }
        props[k] = renderPropValue(v);
      }
      if (key !== undefined && key !== null) {
        props.key = key;
      }

      const renderedChildren =
        "children" in rawProps
          ? renderAstNode(rawProps.children)
          : undefined;

      if (!rawType || rawType === "@fragment") {
        return <React.Fragment key={key}>{renderedChildren}</React.Fragment>;
      }
      if (rawType === "@suspense") {
        return <Suspense key={key}>{renderedChildren}</Suspense>;
      }
      if (typeof rawType === "string" && rawType.startsWith("@client:")) {
        const parts = rawType.split(":");
        const modId = Number(parts[1]);
        const exportName = parts.slice(2).join(":");
        if (modId === 77046) {
          return React.createElement(
            Link as unknown as React.ComponentType<Record<string, unknown>>,
            props,
            renderedChildren
          );
        }
        const Comp = resolveClientComponent(modId, exportName);
        return React.createElement(Comp, props, renderedChildren);
      }
      if (typeof rawType === "string") {
        if (renderedChildren === undefined) {
          return React.createElement(rawType, props);
        }
        return React.createElement(rawType, props, renderedChildren);
      }
      return null;
    }

    return node.map((child, idx) => renderAstNode(child, idx));
  }

  return null;
}

function renderPropValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return val;
  }
  if (Array.isArray(val)) {
    if (val[0] === "$el") {
      return renderAstNode(val);
    }
    const hasElements = val.some(
      (item) => Array.isArray(item) && item[0] === "$el"
    );
    if (hasElements) {
      return val.map((item, idx) => renderAstNode(item, idx));
    }
    return val.map((item) => renderPropValue(item));
  }
  if (typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = renderPropValue(v);
    }
    return out;
  }
  return val;
}

export function DojoPageRenderer({ tree }: { tree: unknown }) {
  return <>{renderAstNode(tree)}</>;
}
