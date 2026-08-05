import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { getPackageCodes } from "@/lib/reference.functions";

/** Reusable package-code dropdown (14 Kg, 19 Kg, DPR, …). */
export function PackageCodeSelect({
  value,
  onChange,
  label = "Package Code",
  id = "package-code",
}: {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  id?: string;
}) {
  const fetchCodes = useServerFn(getPackageCodes);
  const { data, isLoading } = useQuery({
    queryKey: ["package-codes"],
    queryFn: () => fetchCodes({ data: undefined }),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      >
        <option value="">{isLoading ? "Loading…" : "Select package"}</option>
        {(data ?? []).map((pkg) => (
          <option key={pkg.id} value={pkg.code}>
            {pkg.code}
          </option>
        ))}
      </select>
    </div>
  );
}
