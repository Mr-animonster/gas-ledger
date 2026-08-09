import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

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
    roles: ["distributor", "godown", "computer_staff"],
  },
  {
    name: "Staff Wage Register",
    hint: "Wages, attendance and payments",
    roles: ["distributor"],
  },
  {
    name: "Inspection Log",
    hint: "Oil company and statutory inspection visits",
    roles: ["distributor"],
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
    <main className="min-h-screen bg-background pb-14">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {session.agencyName}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {roleLabels[role]}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/role" })}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Switch role
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout({});
                await navigate({ to: "/" });
              }}
              className="h-10 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
              className="min-h-24 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-secondary"
            >
              <span className="block text-base font-semibold text-foreground">
                {register.name}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">{register.hint}</span>
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          More register entry screens are coming next.
        </p>
      </div>
    </main>
  );
}
