import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { getActiveStaff } from "@/lib/agency.functions";

type Role = "distributor" | "godown" | "computer_staff";

/**
 * Reusable "Filled By" picker for data-entry screens.
 * Lists active staff limited to the roles relevant for that register.
 */
export function FilledBySelect({
  roles,
  value,
  onChange,
  label = "Filled By",
}: {
  roles: Role[];
  value: string;
  onChange: (staffId: string) => void;
  label?: string;
}) {
  const fetchStaff = useServerFn(getActiveStaff);
  const { data, isLoading } = useQuery({
    queryKey: ["active-staff", roles],
    queryFn: () => fetchStaff({ data: { roles } }),
  });

  return (
    <div className="space-y-1.5">
      <label htmlFor="filled-by" className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id="filled-by"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      >
        <option value="">{isLoading ? "Loading staff…" : "Select staff member"}</option>
        {(data ?? []).map((staff) => (
          <option key={staff.id} value={staff.id}>
            {staff.name}
          </option>
        ))}
      </select>
    </div>
  );
}
