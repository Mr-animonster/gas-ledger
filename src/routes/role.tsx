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
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");

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
      setDevCode(result.code);
      setOtpStage(true);
      toast.success(`OTP for ${result.maskedPhone}: ${result.code}`, {
        description: "SMS is not connected yet — the code is shown here for now.",
        duration: 30000,
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
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {session.agencyName}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
            {otpStage ? "Distributor verification" : "Who is using the app?"}
          </h1>
        </header>

        {otpStage ? (
          <form onSubmit={submitOtp} className="surface space-y-4 rounded-2xl p-6">
            <p className="text-sm text-muted-foreground">
              A 6-digit code was generated for the registered number {maskedPhone}. It expires in 5
              minutes.
            </p>
            {devCode ? (
              <div className="rounded-xl border border-dashed border-primary/50 bg-secondary/70 p-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  SMS not connected — code shown here
                </p>
                <p className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                  {devCode}
                </p>
              </div>
            ) : null}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="000000"
              className="h-14 w-full rounded-xl border border-input bg-background/70 text-center text-2xl tracking-[0.5em] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="brand-gradient h-12 w-full rounded-xl text-base font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            >
              Verify &amp; continue
            </button>
            <button
              type="button"
              onClick={() => setOtpStage(false)}
              className="h-11 w-full rounded-xl border border-input bg-background/70 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
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
              className="surface lift flex w-full items-center justify-between rounded-2xl border-2 border-primary/60 p-5 text-left disabled:opacity-60"
            >
              <span>
                <span className="block text-lg font-semibold text-foreground">Distributor</span>
                <span className="block text-sm text-muted-foreground">
                  Full access — OTP verification required
                </span>
              </span>
              <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
                OTP
              </span>
            </button>

            {staffRoles.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => selectStaff(role.key)}
                disabled={busy}
                className="surface lift block w-full rounded-2xl p-5 text-left disabled:opacity-60"
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
