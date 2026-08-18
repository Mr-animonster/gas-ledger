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
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="brand-gradient mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold tracking-tight text-primary-foreground shadow-lg shadow-primary/25">
            LPG
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Register Book</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Statutory registers for your distributorship
          </p>
        </div>

        <form onSubmit={onSubmit} className="surface space-y-4 rounded-2xl p-6">
          <div className="space-y-1.5">
            <label
              htmlFor="agencyId"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Agency ID
            </label>
            <input
              id="agencyId"
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              required
              className="h-12 w-full rounded-xl border border-input bg-background/70 px-3.5 text-base text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-12 w-full rounded-xl border border-input bg-background/70 px-3.5 text-base text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="brand-gradient h-12 w-full rounded-xl text-base font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
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

