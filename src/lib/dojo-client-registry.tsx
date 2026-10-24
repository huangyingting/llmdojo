"use client";

import React, { useEffect, useState } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import Link from "next/link";
import * as nextNavigation from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import coreChunks from "@/data/dojo-core-chunks.json";

export interface BridgeUser {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  user_metadata: {
    full_name?: string;
    user_name?: string;
    avatar_url?: string;
  };
  app_metadata: {
    provider?: string;
  };
}

type AuthListener = (
  event: string,
  session: { user: BridgeUser } | null
) => void;

let currentBridgeSession: { user: BridgeUser } | null | undefined = undefined;
const authListeners = new Set<AuthListener>();

export function updateBridgeSession(
  user: {
    id: string;
    email: string;
    name?: string | null;
    role?: string;
    status?: string;
  } | null
) {
  if (!user) {
    currentBridgeSession = null;
  } else {
    currentBridgeSession = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role ?? "USER",
        status: user.status ?? "ACTIVE",
        created_at: new Date().toISOString(),
        user_metadata: {
          full_name: user.name ?? user.email.split("@")[0],
          user_name: user.name ?? user.email.split("@")[0],
        },
        app_metadata: {
          provider: "email",
        },
      },
    };
  }
  for (const listener of authListeners) {
    try {
      listener("AUTH_STATE_CHANGED", currentBridgeSession);
    } catch {}
  }
}

export function DojoSessionBridge() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    const rawUser = session?.user as
      | {
          id?: string;
          email?: string;
          name?: string | null;
          role?: string;
          status?: string;
        }
      | undefined;

    if (status === "authenticated" && rawUser?.id && rawUser?.email) {
      updateBridgeSession({
        id: rawUser.id,
        email: rawUser.email,
        name: rawUser.name,
        role: rawUser.role ?? "USER",
        status: rawUser.status ?? "ACTIVE",
      });
    } else {
      updateBridgeSession(null);
    }
  }, [session, status]);

  return null;
}

const bridgeClient = {
  auth: {
    onAuthStateChange(callback: AuthListener) {
      authListeners.add(callback);
      if (currentBridgeSession !== undefined) {
        queueMicrotask(() => {
          if (authListeners.has(callback) && currentBridgeSession !== undefined) {
            callback("INITIAL_SESSION", currentBridgeSession);
          }
        });
      }
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
    async signInWithPassword({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error || !res.ok) {
        return {
          data: { session: null },
          error: {
            code: "invalid_credentials",
            message:
              res?.error && res.error !== "CredentialsSignin"
                ? res.error
                : "That email and password don't match. Try again, or redeem an invitation code.",
          },
        };
      }
      return {
        data: { session: { user: { email } } },
        error: null,
      };
    },
    async signUp() {
      return {
        data: { session: null },
        error: {
          code: "invite_only",
          message:
            "Registration is invite-only. Enter your invitation code on /register to create an account.",
        },
      };
    },
    async signOut() {
      await signOut({ redirect: false });
      updateBridgeSession(null);
      return { error: null };
    },
    async signInWithOAuth() {
      return {
        data: null,
        error: {
          message: "Use email & password or an invitation code to sign in.",
        },
      };
    },
  },
  from(table: string) {
    if (table === "user_state") {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  try {
                    const res = await fetch("/api/user/state", {
                      credentials: "include",
                    });
                    if (!res.ok) return { data: null, error: null };
                    const json = await res.json();
                    return {
                      data: {
                        progress: json.progress ?? { visited: {}, last: null },
                        review: json.review ?? json.reviewCards ?? {},
                      },
                      error: null,
                    };
                  } catch (e) {
                    return {
                      data: null,
                      error: {
                        message: e instanceof Error ? e.message : "Sync failed",
                      },
                    };
                  }
                },
              };
            },
          };
        },
        async upsert(payload: {
          user_id: string;
          progress: unknown;
          review: unknown;
          updated_at?: string;
        }) {
          try {
            const res = await fetch("/api/user/state", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                progress: payload.progress,
                review: payload.review,
              }),
            });
            if (!res.ok) {
              return { error: { message: `HTTP ${res.status}` } };
            }
            return { error: null };
          } catch (e) {
            return {
              error: {
                message: e instanceof Error ? e.message : "Upsert failed",
              },
            };
          }
        },
      };
    }
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
      upsert: async () => ({ error: null }),
    };
  },
};

function InviteAwareSignInButtons({
  titles = {},
}: {
  titles?: Record<string, string>;
}) {
  const searchParams = nextNavigation.useSearchParams();
  const nextParam = searchParams?.get("next") ?? null;
  const inviteParam = searchParams?.get("invite") ?? "";
  const modeParam = searchParams?.get("mode") ?? "";

  const [mode, setMode] = useState<"sign-in" | "sign-up">(
    modeParam === "register" || inviteParam ? "sign-up" : "sign-in"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteToken, setInviteToken] = useState(inviteParam);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const destinationTitle = nextParam
    ? titles[nextParam.split(/[?#]/)[0]]
    : undefined;

  const resolveNextUrl = () => {
    if (
      !nextParam ||
      !nextParam.startsWith("/") ||
      nextParam.startsWith("//")
    ) {
      return "/curriculum";
    }
    return nextParam;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (mode === "sign-up") {
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: inviteToken.trim(),
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        });
        const regData = await regRes.json().catch(() => ({}));
        if (!regRes.ok) {
          setErrorMsg(
            regData.error ??
              "Could not redeem invitation code. Check your code and try again."
          );
          setSubmitting(false);
          return;
        }
      }

      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!res || res.error || !res.ok) {
        setErrorMsg(
          res?.error && res.error !== "CredentialsSignin"
            ? res.error
            : "That email and password don't match. Try again, or redeem an invitation code."
        );
        setSubmitting(false);
        return;
      }

      window.location.assign(resolveNextUrl());
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Authentication failed."
      );
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 text-base outline-none transition duration-200 placeholder:text-muted focus:border-accent";

  return (
    <div>
      {errorMsg && (
        <p
          role="alert"
          className="mb-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {errorMsg}
        </p>
      )}
      {destinationTitle && !errorMsg && (
        <p className="mb-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          You&apos;ll go straight back to{" "}
          <span className="font-semibold">{destinationTitle}</span>.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "sign-up" && (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Invitation code
              </span>
              <input
                name="token"
                type="text"
                required
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="DOJO-XXXX-XXXX-XXXX"
                className={`${inputClass} font-mono uppercase`}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Full name
              </span>
              <input
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className={inputClass}
              />
            </label>
          </>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "sign-up" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            placeholder={
              mode === "sign-in" ? "Your password" : "At least 8 characters"
            }
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="!mt-6 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-base font-medium text-background transition duration-200 hover:opacity-90 disabled:opacity-60"
        >
          {submitting
            ? "One moment…"
            : mode === "sign-in"
            ? "Sign in"
            : "Redeem invite & create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        {mode === "sign-in" ? "Have an invitation code? " : "Have an account? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setErrorMsg(null);
          }}
          className="font-medium text-foreground underline underline-offset-4 transition duration-200 hover:text-accent"
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

// Global chunk registry
const globalChunksHolder = globalThis as unknown as {
  __LLMDOJO_CHUNKS__?: unknown[][];
};

const factories = new Map<
  number,
  (ctx: unknown, cjsMod?: { exports: unknown }, exportsObj?: unknown) => void
>();
const moduleCache = new Map<number, Record<string, unknown>>();
const loadedChunkNames = new Set<string>();
let registryInitialized = false;

function registerChunkList(list: unknown[]) {
  const pendingIds: number[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (typeof item === "number") {
      pendingIds.push(item);
    } else if (typeof item === "function") {
      for (const id of pendingIds) {
        factories.set(
          id,
          item as (
            ctx: unknown,
            cjsMod?: { exports: unknown },
            exportsObj?: unknown
          ) => void
        );
      }
      pendingIds.length = 0;
    } else if (Array.isArray(item)) {
      registerChunkList(item);
    }
  }
}

function ingestChunkCode(code: string, name?: string) {
  if (name && loadedChunkNames.has(name)) return;
  if (name) loadedChunkNames.add(name);

  if (!globalChunksHolder.__LLMDOJO_CHUNKS__) {
    globalChunksHolder.__LLMDOJO_CHUNKS__ = [];
  }
  const prevLen = globalChunksHolder.__LLMDOJO_CHUNKS__.length;
  const runner = new Function(code);
  runner();
  const arr = globalChunksHolder.__LLMDOJO_CHUNKS__;
  for (let idx = prevLen; idx < arr.length; idx++) {
    const entry = arr[idx];
    if (Array.isArray(entry)) {
      registerChunkList(entry);
    }
  }
}

async function fetchAndIngestChunk(chunkPath: string): Promise<void> {
  const fname = chunkPath.split("/").pop();
  if (!fname || loadedChunkNames.has(fname)) return;

  if (typeof window !== "undefined") {
    const res = await fetch(`/dojo-chunks/${fname}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch chunk ${fname}: ${res.status}`);
    }
    const code = await res.text();
    ingestChunkCode(code, fname);
  }
}

export function initDojoRegistry() {
  if (registryInitialized) return;
  registryInitialized = true;

  const safeNavigation = {
    ...nextNavigation,
    useRouter: () => {
      try {
        return nextNavigation.useRouter();
      } catch {
        return {
          push: () => undefined,
          replace: () => undefined,
          prefetch: () => undefined,
          back: () => undefined,
          forward: () => undefined,
          refresh: () => undefined,
        };
      }
    },
    usePathname: () => {
      try {
        return nextNavigation.usePathname() ?? "/";
      } catch {
        return "/";
      }
    },
    useSearchParams: () => {
      try {
        return nextNavigation.useSearchParams();
      } catch {
        return new URLSearchParams();
      }
    },
  };

  moduleCache.set(17165, { default: React, ...React });
  moduleCache.set(76309, { default: jsxRuntime, ...jsxRuntime });
  moduleCache.set(77046, { default: Link, Link });
  moduleCache.set(74760, { default: safeNavigation, ...safeNavigation });
  moduleCache.set(21905, { default: safeNavigation, ...safeNavigation });
  moduleCache.set(87166, {
    default: { env: { NEXT_PUBLIC_AUTH_GATE: "on" } },
    env: { NEXT_PUBLIC_AUTH_GATE: "on" },
  });
  moduleCache.set(20755, {
    h: true,
    $: () => bridgeClient,
  });
  moduleCache.set(58249, {
    H: (event: string, payload?: Record<string, unknown>) => {
      if (event === "feedback_sent" && typeof window !== "undefined") {
        fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            topicPath: String(payload?.page ?? window.location.pathname),
            helpful: payload?.kind === "idea",
            message: `[${String(payload?.kind ?? "note")}] ${String(
              payload?.message ?? ""
            )}`,
          }),
        }).catch(() => undefined);
      }
      return true;
    },
    L: () => undefined,
    b: () => undefined,
    m: () => undefined,
    o: () => undefined,
    r: () => undefined,
  });

  for (const item of coreChunks) {
    ingestChunkCode(item.code, item.name);
  }

  // Enhance module 75935 with our InviteAwareSignInButtons and RBAC Admin badge in AccountButton
  const mod75935 = loadDojoModule(75935);
  const OriginalAccountButton = mod75935.AccountButton as React.ComponentType;
  const useUserHook = mod75935.useUser as () => BridgeUser | null | undefined;

  function EnhancedAccountButton() {
    const user = useUserHook();
    const isStaff =
      user && (user.role === "ADMIN" || user.role === "INSTRUCTOR");
    return (
      <span className="inline-flex items-center gap-1.5">
        {isStaff && (
          <Link
            href="/admin"
            className="flex h-8 items-center rounded-full border border-accent/40 bg-accent-soft px-3 text-xs font-semibold text-accent transition duration-200 hover:bg-accent/20"
          >
            Admin
          </Link>
        )}
        <OriginalAccountButton />
      </span>
    );
  }

  Object.defineProperty(mod75935, "AccountButton", {
    enumerable: true,
    configurable: true,
    value: EnhancedAccountButton,
  });

  Object.defineProperty(mod75935, "SignInButtons", {
    enumerable: true,
    configurable: true,
    value: InviteAwareSignInButtons,
  });
}

export function loadDojoModule(id: number): Record<string, unknown> {
  initDojoRegistry();
  const cached = moduleCache.get(id);
  if (cached) return cached;

  const exportsObj: Record<string, unknown> = {};
  const cjsMod: { exports: unknown } = { exports: exportsObj };
  moduleCache.set(id, exportsObj);

  const factory = factories.get(id);
  if (!factory) {
    return exportsObj;
  }

  const ctx = {
    i: (depId: number) => loadDojoModule(depId),
    r: (depId: number) => loadDojoModule(depId),
    s: (defs: unknown[], targetModId?: number) => {
      let target = exportsObj;
      if (typeof targetModId === "number" && targetModId !== id) {
        let other = moduleCache.get(targetModId);
        if (!other) {
          other = {};
          moduleCache.set(targetModId, other);
        }
        target = other;
      }
      let i = 0;
      while (i < defs.length) {
        const name = defs[i];
        const second = defs[i + 1];
        if (typeof name === "string" && second === 0) {
          Object.defineProperty(target, name, {
            enumerable: true,
            configurable: true,
            writable: true,
            value: defs[i + 2],
          });
          i += 3;
        } else if (typeof name === "string" && typeof second === "function") {
          Object.defineProperty(target, name, {
            enumerable: true,
            configurable: true,
            get: second as () => unknown,
          });
          i += 2;
        } else {
          i += 2;
        }
      }
    },
    v: (val: unknown) => {
      exportsObj.default = val;
    },
    q: (val: unknown) => {
      exportsObj.default = val;
    },
    F: () =>
      typeof window !== "undefined"
        ? window.location.href
        : "http://localhost:3000/",
    l: (chunkPath: string) => fetchAndIngestChunk(chunkPath),
    A: (depId: number) => {
      const mod = loadDojoModule(depId);
      if (typeof mod.default === "function") {
        return Promise.resolve(
          (mod.default as (loader: (innerId: number) => unknown) => unknown)(
            (innerId: number) => loadDojoModule(innerId)
          )
        );
      }
      return Promise.resolve(mod);
    },
  };

  factory(ctx, cjsMod, exportsObj);

  if (cjsMod.exports !== exportsObj) {
    exportsObj.default = cjsMod.exports;
    if (cjsMod.exports && typeof cjsMod.exports === "object") {
      Object.assign(exportsObj, cjsMod.exports);
    }
  } else if (factory.length >= 2 && !("default" in exportsObj)) {
    exportsObj.default = exportsObj;
  }

  return exportsObj;
}

export function resolveClientComponent(
  modId: number,
  exportName: string
): React.ComponentType<Record<string, unknown>> {
  const mod = loadDojoModule(modId);
  const comp =
    exportName === "" || exportName === "default"
      ? mod.default ?? mod
      : mod[exportName] ?? mod.default;

  if (typeof comp === "function") {
    return comp as React.ComponentType<Record<string, unknown>>;
  }
  return () => null;
}
