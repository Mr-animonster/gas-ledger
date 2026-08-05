import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import {
  chooseStaffRole,
  confirmDistributorOtp,
  getSessionState,
  logoutAgency,
  requestDistributorOtp,
} from "@/lib/agency.functions";

export const Route = createFileRoute("/role")({
  head: () => ({
    meta: [
      { title: "Select Role — LPG Register Book" },
      {
        name: "description",
        content:
          "Choose Distributor, Godown Staff or Computer Staff to open the relevant registers.",
      },
      { property: "og:title", content: "Select Role — LPG Register Book" },
      {
        property: "og:description",
        content: "Role selection screen for the LPG distributorship register app.",
      },
    ],
  }),
  loader: async () => {
    const session = await getSessionState();
    if (!session.authed) throw redirect({ to: "/" });
    return session;
  },
  component: RolePage,
});

const staffRoles = [
  {
    key: "godown" as const,
    title: "Godown Staff",
    subtitle: "Stock movement, SQC, defective cylinders",
  },
  {
    key: "computer_staff" as const,
    title: "Computer Staff",
    subtitle: "Sales, connections, complaints entry",
  },
];

function RolePage() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();
  const pickRole = useServerFn(chooseStaffRole);
  const requestOtp = useServerFn(requestDistributorOtp);
  const confirmOtp = useServerFn(confirmDistributorOtp);
  const logout = useServerFn(logoutAgency);

  const [busy, setBusy] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [devCode, setDevCode] = useState("");
  const [code, setCode] = useState("");

  async function selectStaff(role: "godown" | "computer_staff") {
    setBusy(true);
    try {
      await pickRole({ data: { role } });
      await navigate({ to: "/dashboard" });
    } catch {
      toast.error("Could not open that role. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function startDistributor() {
    setBusy(true);
    try {
      const result = await requestOtp({});
      setMaskedPhone(result.maskedPhone);
      setDevCode(result.devCode);
      setOtpStage(true);
      toast.success(`OTP sent to ${result.maskedPhone}`, {
        description: `Test mode — your code is ${result.devCode}`,
        duration: 20000,
      });
    } catch {
      toast.error("Could not generate an OTP right now.");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await confirmOtp({ data: { code } });
      if (!result.ok) {
        toast.error("Invalid or expired OTP");
        return;
      }
      await navigate({ to: "/dashboard" });
    } catch {
      toast.error("Verification failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await logout({});
    await navigate({ to: "/" });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {session.agencyName}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {otpStage ? "Distributor verification" : "Who is using the app?"}
          </h1>
        </header>

        {otpStage ? (
          <form
            onSubmit={submitOtp}
            className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">
              A 6-digit code was sent to the registered number {maskedPhone}. It expires in 5
              minutes.
            </p>
            {devCode ? (
              <div className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-2 text-sm font-medium text-accent-foreground">
                Test mode — SMS not connected yet. Code: <strong>{devCode}</strong>
              </div>
            ) : null}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="000000"
              className="h-14 w-full rounded-lg border border-input bg-background text-center text-2xl tracking-[0.5em] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="h-12 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              Verify &amp; continue
            </button>
            <button
              type="button"
              onClick={() => setOtpStage(false)}
              className="h-11 w-full rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-secondary"
            >
              Back to roles
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={startDistributor}
              disabled={busy}
              className="flex w-full items-center justify-between rounded-xl border-2 border-primary bg-card p-5 text-left shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
            >
              <span>
                <span className="block text-lg font-semibold text-foreground">Distributor</span>
                <span className="block text-sm text-muted-foreground">
                  Full access — OTP verification required
                </span>
              </span>
              <span className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
                OTP
              </span>
            </button>

            {staffRoles.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => selectStaff(role.key)}
                disabled={busy}
                className="block w-full rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
              >
                <span className="block text-lg font-semibold text-foreground">{role.title}</span>
                <span className="block text-sm text-muted-foreground">{role.subtitle}</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={signOut}
          className="mt-6 w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Sign out of agency
        </button>
      </div>
    </main>
  );
}
