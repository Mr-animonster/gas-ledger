import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { getSessionState, loginAgency } from "@/lib/agency.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agency Login — LPG Register Book" },
      {
        name: "description",
        content:
          "Shared agency login for the LPG distributorship digital statutory register system.",
      },
      { property: "og:title", content: "Agency Login — LPG Register Book" },
      {
        property: "og:description",
        content: "Shared agency login for the LPG distributorship digital statutory register system.",
      },
    ],
  }),
  loader: async () => {
    const session = await getSessionState();
    if (session.authed && session.role) throw redirect({ to: "/dashboard" });
    if (session.authed) throw redirect({ to: "/role" });
    return null;
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useServerFn(loginAgency);
  const [agencyId, setAgencyId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await login({ data: { agencyId, password } });
      if (!result.ok) {
        toast.error("Incorrect agency ID or password");
        return;
      }
      await navigate({ to: "/role" });
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
            LPG
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Register Book</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Statutory registers for your distributorship
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="space-y-1.5">
            <label htmlFor="agencyId" className="text-sm font-medium text-foreground">
              Agency ID
            </label>
            <input
              id="agencyId"
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              required
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Shared agency login. Individual staff are recorded per entry.
        </p>
      </div>
    </main>
  );
}
