import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { ComplianceBoard } from "@/components/ComplianceBoard";
import { PendingEditRequests } from "@/components/PendingEditRequests";
import { getSessionState, logoutAgency } from "@/lib/agency.functions";

type Role = "distributor" | "godown" | "computer_staff";

const registers: { name: string; hint: string; roles: Role[]; to?: string }[] = [
  {
    name: "Daily Stock Register",
    hint: "Opening, receipts, sales & closing cylinder stock",
    roles: ["distributor", "godown"],
    to: "/registers/stock",
  },
  {
    name: "SQC Register",
    hint: "Statutory quality checks on refill cylinders",
    roles: ["distributor", "godown"],
    to: "/registers/sqc",
  },
  {
    name: "Sales Register",
    hint: "Daily cash memo and refill sales record",
    roles: ["distributor", "computer_staff"],
    to: "/registers/sales",
  },
  {
    name: "Installation & ARB Register",
    hint: "New installations and allied retail (ARB) item sales",
    roles: ["distributor", "computer_staff"],
    to: "/registers/installation",
  },
  {
    name: "Connection/SV Register",
    hint: "New connections, reconnections, DBC and TV terminations",
    roles: ["distributor", "computer_staff"],
    to: "/registers/connection",
  },
  {
    name: "Defective Cylinder/DPR Register",
    hint: "Defective cylinders and DPR reporting",
    roles: ["distributor", "godown"],
    to: "/registers/defective",
  },
  {
    name: "Complaint Register",
    hint: "Customer complaints and resolution status",
    roles: ["distributor", "computer_staff"],
    to: "/registers/complaint",
  },
  {
    name: "Staff Wage Register",
    hint: "Monthly wages, PF/ESI and payments",
    roles: ["distributor"],
    to: "/registers/wages",
  },
  {
    name: "Inspection Report Log",
    hint: "Oil company and statutory inspection visits",
    roles: ["distributor"],
    to: "/registers/inspection",
  },
];

const roleLabels: Record<Role, string> = {
  distributor: "Distributor",
  godown: "Godown Staff",
  computer_staff: "Computer Staff",
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Registers Dashboard — LPG Register Book" },
      {
        name: "description",
        content:
          "Open the daily stock, SQC, sales, connection, complaint and inspection registers for your LPG agency.",
      },
      { property: "og:title", content: "Registers Dashboard — LPG Register Book" },
      {
        property: "og:description",
        content: "All statutory LPG distributorship registers in one place.",
      },
    ],
  }),
  loader: async () => {
    const session = await getSessionState();
    if (!session.authed) throw redirect({ to: "/" });
    if (!session.role) throw redirect({ to: "/role" });
    return session;
  },
  component: DashboardPage,
});

function DashboardPage() {
  const session = Route.useLoaderData();
  const role = session.role as Role;
  const navigate = useNavigate();
  const logout = useServerFn(logoutAgency);

  const visible = registers.filter((r) => r.roles.includes(role));

  return (
    <main className="min-h-dvh pb-14">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="brand-gradient grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold text-primary-foreground shadow-md shadow-primary/25">
              LPG
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {session.agencyName}
              </p>
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
                {roleLabels[role]}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/role" })}
              className="h-10 rounded-xl border border-input bg-background/70 px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Switch role
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout({});
                await navigate({ to: "/" });
              }}
              className="h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {role === "distributor" ? (
          <div className="mb-8 space-y-8">
            <ComplianceBoard />
            <PendingEditRequests />
          </div>
        ) : null}
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Registers
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((register) => (
            <button
              key={register.name}
              type="button"
              onClick={() => {
                if (register.to) void navigate({ to: register.to });
              }}
              className="surface lift group relative min-h-24 overflow-hidden rounded-2xl p-4 text-left hover:border-primary/50"
            >
              <span className="brand-gradient absolute inset-y-0 left-0 w-1 opacity-70" />
              <span className="block pl-2 text-base font-semibold text-foreground">
                {register.name}
              </span>
              <span className="mt-1 block pl-2 text-sm text-muted-foreground">{register.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

