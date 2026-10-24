"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import {
  DojoSessionBridge,
  resolveClientComponent,
} from "@/lib/dojo-client-registry";

const STANDALONE_PATHS = new Set(["/sign-in"]);

export function DojoAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isStandalone = STANDALONE_PATHS.has(pathname);

  const SearchButton = resolveClientComponent(32099, "SearchButton");
  const SearchDialog = resolveClientComponent(32099, "SearchDialog");
  const AccountButton = resolveClientComponent(75935, "AccountButton");
  const ThemeToggle = resolveClientComponent(49845, "ThemeToggle");
  const Rail = resolveClientComponent(90307, "Rail");
  const BottomNav = resolveClientComponent(57006, "BottomNav");
  const ProgressSync = resolveClientComponent(78194, "ProgressSync");

  return (
    <SessionProvider>
      <DojoSessionBridge />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:text-accent-contrast"
      >
        Skip to content
      </a>
      {isStandalone ? (
        <main
          id="main"
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10"
        >
          {children}
        </main>
      ) : (
        <div className="min-h-dvh bg-background lg:p-6">
          <div className="grid min-h-dvh content-start gap-x-6 gap-y-4 bg-surface-2 p-4 sm:p-6 grid-cols-[auto_minmax(0,1fr)] lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[3.5rem_minmax(0,1fr)] lg:rounded-[2.5rem] lg:transition-[grid-template-columns] lg:duration-200 lg:ease-out lg:has-[[data-rail]:not([data-closed]):hover]:grid-cols-[13rem_minmax(0,1fr)] lg:has-[[data-rail]:not([data-closed]):hover]:delay-150 lg:has-[[data-rail]_:focus-visible]:grid-cols-[13rem_minmax(0,1fr)]">
            <Link
              href="/"
              className="group col-span-1 flex h-11 items-center gap-2.5 self-center justify-self-start whitespace-nowrap rounded-xl px-2 text-lg font-semibold tracking-tight transition duration-200 hover:bg-surface lg:sticky lg:top-6 lg:z-20"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-6 shrink-0 text-accent transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 9.5 Q12 6 21.5 9.5" />
                <path d="M5 13.5 H19" />
                <path d="M8.5 9.5 V20" />
                <path d="M15.5 9.5 V20" />
              </svg>
              <span>LLM Dojo</span>
            </Link>
            <header className="col-start-2 flex items-center justify-end gap-3 self-center lg:sticky lg:top-6 lg:z-20">
              <SearchButton />
              <span className="flex items-center gap-0.5 rounded-full bg-surface p-1">
                <AccountButton />
                <ThemeToggle />
              </span>
            </header>
            <Rail className="max-lg:hidden lg:sticky lg:top-[5.25rem] lg:col-span-1 lg:self-start" />
            <main
              id="main"
              className="col-span-2 min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:col-span-1 lg:col-start-2 lg:pb-0"
            >
              {children}
            </main>
          </div>
          <BottomNav />
          <SearchDialog />
          <ProgressSync />
        </div>
      )}
    </SessionProvider>
  );
}
