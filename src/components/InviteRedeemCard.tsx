"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

interface ValidatedInviteInfo {
  id: string;
  codePrefix: string;
  email: string | null;
  assignedRole: string;
  status: string;
  maxUses: number;
  useCount: number;
  expiresAt: string;
  note: string | null;
}

export function InviteRedeemCard({
  initialToken = "",
}: {
  initialToken?: string;
}) {
  const [token, setToken] = useState(initialToken);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteInfo, setInviteInfo] = useState<ValidatedInviteInfo | null>(
    null
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = token.trim();
    if (trimmed.length < 8) {
      setInviteInfo(null);
      setValidationError(null);
      return;
    }

    let cancelled = false;
    setValidating(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/invitations/validate?token=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.valid && data.invitation) {
          setInviteInfo(data.invitation);
          setValidationError(null);
          if (data.invitation.email && !email) {
            setEmail(data.invitation.email);
          }
        } else {
          setInviteInfo(null);
          setValidationError(data.reason ?? "Invalid invitation code.");
        }
      } catch {
        if (!cancelled) {
          setInviteInfo(null);
          setValidationError("Could not validate invitation code.");
        }
      } finally {
        if (!cancelled) setValidating(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error ?? "Registration failed.");
        setSubmitting(false);
        return;
      }

      const authRes = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (authRes?.ok) {
        window.location.assign("/curriculum");
      } else {
        window.location.assign("/sign-in");
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Registration failed."
      );
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 text-base outline-none transition duration-200 placeholder:text-muted focus:border-accent";

  return (
    <div className="mx-auto w-full max-w-md py-8">
      <div className="rounded-3xl bg-surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Invite-Only Admission
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Redeem your invitation
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          Enter your single-use LLM Dojo invitation code to create your account
          and sync progress across devices.
        </p>

        {inviteInfo && (
          <div
            data-testid="invite-valid-banner"
            className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-accent">
                Valid invitation ({inviteInfo.codePrefix}…)
              </span>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold">
                Role: {inviteInfo.assignedRole}
              </span>
            </div>
            {inviteInfo.email && (
              <p className="mt-1 text-xs text-muted">
                Reserved for <span className="font-medium">{inviteInfo.email}</span>
              </p>
            )}
            {inviteInfo.note && (
              <p className="mt-1 text-xs text-muted">{inviteInfo.note}</p>
            )}
          </div>
        )}

        {validationError && !validating && (
          <p
            role="alert"
            data-testid="invite-error-banner"
            className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {validationError}
          </p>
        )}

        {submitError && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Invitation code
            </span>
            <input
              name="token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="DOJO-XXXX-XXXX-XXXX"
              className={`${inputClass} font-mono uppercase`}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Full name</span>
            <input
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              className={inputClass}
            />
          </label>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={inputClass}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="!mt-6 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-base font-medium text-background transition duration-200 hover:opacity-90 disabled:opacity-60"
          >
            {submitting
              ? "Creating account…"
              : "Redeem invitation & create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline underline-offset-4 transition duration-200 hover:text-accent"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
