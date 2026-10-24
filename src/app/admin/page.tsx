"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface InvitationRecord {
  id: string;
  codePrefix: string;
  email: string | null;
  assignedRole: string;
  status: string;
  maxUses: number;
  useCount: number;
  note: string | null;
  expiresAt: string;
  redeemedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy?: { email: string; name: string | null } | null;
  redeemedBy?: { email: string; name: string | null } | null;
}

interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  revokedAt: string | null;
  revokedReason: string | null;
  sessionVersion: number;
  createdAt: string;
  learningState?: {
    progressJson: string;
    reviewCardsJson: string;
  } | null;
}

interface AuditLogRecord {
  id: string;
  action: string;
  actorEmail: string | null;
  targetId: string | null;
  metadataJson: string;
  createdAt: string;
  actor?: { email: string; name: string | null } | null;
  targetUser?: { email: string; name: string | null } | null;
}

interface FeedbackRecord {
  id: string;
  topicPath: string;
  helpful: boolean;
  message: string | null;
  createdAt: string;
  user?: { email: string; name: string | null } | null;
}

export default function AdminGovernancePage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user as
    | { id: string; email: string; name?: string | null; role: string }
    | undefined;

  const [activeTab, setActiveTab] = useState<
    "invitations" | "users" | "audit" | "feedback"
  >("invitations");

  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>("");

  // Create invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("USER");
  const [inviteHours, setInviteHours] = useState(168);
  const [inviteMaxUses, setInviteMaxUses] = useState(1);
  const [inviteNote, setInviteNote] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newlyCreatedInvite, setNewlyCreatedInvite] = useState<{
    rawToken: string;
    inviteUrl: string;
    assignedRole: string;
    email: string | null;
  } | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "ADMIN";
  const isStaff =
    currentUser?.role === "ADMIN" || currentUser?.role === "INSTRUCTOR";

  const refreshData = useCallback(async () => {
    if (!isStaff) return;
    try {
      const invRes = await fetch("/api/admin/invitations");
      if (invRes.ok) {
        const d = await invRes.json();
        setInvitations(d.invitations ?? []);
      }

      const fbRes = await fetch("/api/admin/feedback");
      if (fbRes.ok) {
        const d = await fbRes.json();
        setFeedbackList(d.feedback ?? []);
      }

      if (isAdmin) {
        const [uRes, aRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch(
            `/api/admin/audit-logs${
              auditFilter ? `?action=${encodeURIComponent(auditFilter)}` : ""
            }`
          ),
        ]);
        if (uRes.ok) {
          const d = await uRes.json();
          setUsers(d.users ?? []);
        }
        if (aRes.ok) {
          const d = await aRes.json();
          setAuditLogs(d.auditLogs ?? []);
        }
      }
    } catch {}
  }, [isStaff, isAdmin, auditFilter]);

  useEffect(() => {
    if (status === "authenticated" && isStaff) {
      refreshData();
    }
  }, [status, isStaff, refreshData]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-5xl py-12">
        <div className="h-32 animate-pulse rounded-3xl bg-surface" />
      </div>
    );
  }

  if (status === "unauthenticated" || !currentUser) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-3xl bg-surface p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in required
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign in with an Administrator or Instructor account to access the
            LLM Dojo governance console.
          </p>
          <Link
            href="/sign-in?next=/admin"
            className="mt-6 inline-flex h-10 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition duration-200 hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div
          role="alert"
          data-testid="admin-forbidden"
          className="rounded-3xl bg-surface p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-danger">
            403 · Forbidden
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Administrator or Instructor access required
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your account ({currentUser.email}) has the{" "}
            <span className="font-mono font-semibold">{currentUser.role}</span>{" "}
            role and cannot access governance controls.
          </p>
          <Link
            href="/curriculum"
            className="mt-6 inline-flex h-10 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition duration-200 hover:opacity-90"
          >
            Back to curriculum
          </Link>
        </div>
      </div>
    );
  }

  async function handleCreateInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingInvite(true);
    setErrorBanner(null);

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim() || null,
          assignedRole: inviteRole,
          expiresInHours: Number(inviteHours),
          maxUses: Number(inviteMaxUses),
          note: inviteNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error ?? "Failed to create invitation.");
      } else {
        setNewlyCreatedInvite({
          rawToken: data.rawToken,
          inviteUrl: data.inviteUrl,
          assignedRole: data.invitation.assignedRole,
          email: data.invitation.email,
        });
        setInviteEmail("");
        setInviteNote("");
        await refreshData();
      }
    } catch {
      setErrorBanner("Failed to create invitation.");
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleRevokeInvite(id: string) {
    setErrorBanner(null);
    const res = await fetch(`/api/admin/invitations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REVOKE" }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErrorBanner(d.error ?? "Could not revoke invitation.");
      return;
    }
    await refreshData();
  }

  async function handleUpdateUser(
    id: string,
    payload: { role?: string; status?: string; revokedReason?: string }
  ) {
    setErrorBanner(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrorBanner(d.error ?? "Could not update user.");
      return;
    }
    await refreshData();
  }

  function copyText(text: string, label: string) {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  }

  const pendingInvitesCount = invitations.filter(
    (i) => i.status === "PENDING"
  ).length;
  const redeemedInvitesCount = invitations.filter(
    (i) => i.status === "REDEEMED"
  ).length;
  const revokedUsersCount = users.filter((u) => u.status === "REVOKED").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Governance & Access Control
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            LLM Dojo Admin Console
          </h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as <span className="font-medium">{currentUser.email}</span>{" "}
            · Role:{" "}
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs font-semibold">
              {currentUser.role}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/account"
            className="flex h-9 items-center rounded-full bg-surface-2 px-4 text-sm font-medium transition duration-200 hover:bg-foreground/10"
          >
            Account Profile
          </Link>
          <button
            type="button"
            onClick={() => refreshData()}
            className="flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition duration-200 hover:opacity-90"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs text-muted">Pending Invitations</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {pendingInvitesCount}
          </p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs text-muted">Redeemed Invitations</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {redeemedInvitesCount}
          </p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs text-muted">Total Users</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {isAdmin ? users.length : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs text-muted">Revoked Accounts</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {isAdmin ? revokedUsersCount : "—"}
          </p>
        </div>
      </div>

      {errorBanner && (
        <div
          role="alert"
          className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {errorBanner}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("invitations");
            void refreshData();
          }}
          className={`h-9 rounded-full px-4 text-sm font-medium transition duration-200 ${
            activeTab === "invitations"
              ? "bg-foreground text-background"
              : "bg-surface text-muted hover:text-foreground"
          }`}
        >
          Invitations ({invitations.length})
        </button>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveTab("users");
                void refreshData();
              }}
              className={`h-9 rounded-full px-4 text-sm font-medium transition duration-200 ${
                activeTab === "users"
                  ? "bg-foreground text-background"
                  : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              Users & Roles ({users.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("audit");
                void refreshData();
              }}
              className={`h-9 rounded-full px-4 text-sm font-medium transition duration-200 ${
                activeTab === "audit"
                  ? "bg-foreground text-background"
                  : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              Audit Logs ({auditLogs.length})
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setActiveTab("feedback");
            void refreshData();
          }}
          className={`h-9 rounded-full px-4 text-sm font-medium transition duration-200 ${
            activeTab === "feedback"
              ? "bg-foreground text-background"
              : "bg-surface text-muted hover:text-foreground"
          }`}
        >
          Topic Feedback ({feedbackList.length})
        </button>
      </div>

      {/* Tab 1: Invitations */}
      {activeTab === "invitations" && (
        <div className="space-y-6">
          <section className="rounded-3xl bg-surface p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Issue Single-Use or Expiring Invitation Code
            </h2>
            <p className="mt-1 text-sm text-muted">
              Raw invitation codes are shown once upon creation; only their
              SHA-256 hash is stored in the database.
            </p>

            {newlyCreatedInvite && (
              <div
                data-testid="created-invite-banner"
                className="mt-4 rounded-2xl border border-accent/40 bg-accent-soft p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  New Invitation Code Generated (Save Now — Shown Once)
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <code
                    data-testid="generated-invite-token"
                    className="rounded-xl bg-surface px-3 py-1.5 font-mono text-base font-bold tracking-wider"
                  >
                    {newlyCreatedInvite.rawToken}
                  </code>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(newlyCreatedInvite.rawToken, "token")
                    }
                    className="h-8 rounded-full bg-foreground px-3.5 text-xs font-medium text-background"
                  >
                    {copiedLabel === "token" ? "Copied!" : "Copy Code"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        `${window.location.origin}${newlyCreatedInvite.inviteUrl}`,
                        "link"
                      )
                    }
                    className="h-8 rounded-full bg-surface px-3.5 text-xs font-medium"
                  >
                    {copiedLabel === "link" ? "Copied Link!" : "Copy Invite Link"}
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={handleCreateInvite}
              className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <label className="block lg:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Restrict to Email (optional)
                </span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="learner@company.com"
                  className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Assigned Role
                </span>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
                >
                  <option value="USER">USER</option>
                  <option value="INSTRUCTOR">INSTRUCTOR</option>
                  {isAdmin && <option value="ADMIN">ADMIN</option>}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Expires In (Hours)
                </span>
                <input
                  type="number"
                  min={1}
                  max={8760}
                  value={inviteHours}
                  onChange={(e) => setInviteHours(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Max Uses
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={inviteMaxUses}
                  onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
                />
              </label>

              <label className="block sm:col-span-2 lg:col-span-4">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Internal Note (optional)
                </span>
                <input
                  type="text"
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="Cohort 4 ML Systems Engineer"
                  className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={creatingInvite}
                  className="h-10 w-full rounded-full bg-foreground px-4 text-sm font-medium text-background transition duration-200 hover:opacity-90 disabled:opacity-60"
                >
                  {creatingInvite ? "Generating…" : "Generate Invite"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl bg-surface p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Issued Invitations
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                    <th className="pb-3 pr-4">Prefix</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Uses</th>
                    <th className="pb-3 pr-4">Expires</th>
                    <th className="pb-3 pr-4">Note</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invitations.map((inv) => (
                    <tr key={inv.id} data-testid={`invite-row-${inv.codePrefix}`}>
                      <td className="py-3 pr-4 font-mono font-semibold">
                        {inv.codePrefix}…
                      </td>
                      <td className="py-3 pr-4 text-muted">
                        {inv.email ?? "Any email"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs">
                          {inv.assignedRole}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            inv.status === "PENDING"
                              ? "bg-accent-soft text-accent"
                              : inv.status === "REDEEMED"
                              ? "bg-surface-2 text-foreground"
                              : "bg-danger-soft text-danger"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {inv.useCount} / {inv.maxUses}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted">
                        {inv.note ?? "—"}
                      </td>
                      <td className="py-3 text-right">
                        {inv.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger transition duration-200 hover:opacity-80"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invitations.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-6 text-center text-sm text-muted"
                      >
                        No invitation codes issued yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Tab 2: Users & RBAC */}
      {activeTab === "users" && isAdmin && (
        <section className="rounded-3xl bg-surface p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            User Accounts, Roles & Revocation
          </h2>
          <p className="mt-1 text-sm text-muted">
            Revoking a user increments their sessionVersion and immediately
            invalidates active JWT sessions.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Session v#</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} data-testid={`user-row-${u.email}`}>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{u.name ?? u.email}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          aria-label={`Role for ${u.email}`}
                          disabled={isSelf}
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateUser(u.id, { role: e.target.value })
                          }
                          className="h-8 rounded-lg border border-border bg-surface-2 px-2 font-mono text-xs outline-none disabled:opacity-50"
                        >
                          <option value="USER">USER</option>
                          <option value="INSTRUCTOR">INSTRUCTOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.status === "ACTIVE"
                              ? "bg-accent-soft text-accent"
                              : "bg-danger-soft text-danger"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs tabular-nums">
                        v{u.sessionVersion}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        {!isSelf &&
                          (u.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateUser(u.id, {
                                  status: "REVOKED",
                                  revokedReason: "Revoked via Admin Console",
                                })
                              }
                              className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger transition duration-200 hover:opacity-80"
                            >
                              Revoke Access
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateUser(u.id, { status: "ACTIVE" })
                              }
                              className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent transition duration-200 hover:opacity-80"
                            >
                              Restore Access
                            </button>
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === "audit" && isAdmin && (
        <section className="rounded-3xl bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Immutable Security & Governance Audit Log
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                Every bootstrap, invitation, authentication, role change, and
                revocation event is recorded.
              </p>
            </div>
            <select
              aria-label="Filter audit logs by action"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-surface-2 px-3 text-xs font-medium"
            >
              <option value="">All Actions</option>
              <option value="BOOTSTRAP_ADMIN_CREATED">
                BOOTSTRAP_ADMIN_CREATED
              </option>
              <option value="INVITE_CREATED">INVITE_CREATED</option>
              <option value="INVITE_REDEEMED">INVITE_REDEEMED</option>
              <option value="INVITE_REDEEM_REJECTED">
                INVITE_REDEEM_REJECTED
              </option>
              <option value="INVITE_REVOKED">INVITE_REVOKED</option>
              <option value="AUTH_LOGIN_SUCCESS">AUTH_LOGIN_SUCCESS</option>
              <option value="AUTH_LOGIN_FAILURE">AUTH_LOGIN_FAILURE</option>
              <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
              <option value="USER_REVOKED">USER_REVOKED</option>
              <option value="USER_RESTORED">USER_RESTORED</option>
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3 pr-4">Actor</th>
                  <th className="pb-3 pr-4">Target</th>
                  <th className="pb-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} data-testid={`audit-row-${log.action}`}>
                    <td className="py-3 pr-4 text-xs text-muted tabular-nums">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {log.actor?.email ?? log.actorEmail ?? "system"}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted">
                      {log.targetUser?.email ?? log.targetId ?? "—"}
                    </td>
                    <td className="py-3 font-mono text-xs text-muted">
                      {log.metadataJson}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 4: Topic Feedback */}
      {activeTab === "feedback" && (
        <section className="rounded-3xl bg-surface p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Learner Topic Feedback
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Topic Path</th>
                  <th className="pb-3 pr-4">Learner</th>
                  <th className="pb-3">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {feedbackList.map((fb) => (
                  <tr key={fb.id}>
                    <td className="py-3 pr-4 text-xs text-muted">
                      {new Date(fb.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      <Link
                        href={fb.topicPath}
                        className="underline underline-offset-4 hover:text-accent"
                      >
                        {fb.topicPath}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted">
                      {fb.user?.email ?? "Anonymous"}
                    </td>
                    <td className="py-3 text-sm">{fb.message ?? "—"}</td>
                  </tr>
                ))}
                {feedbackList.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-sm text-muted"
                    >
                      No topic feedback submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
