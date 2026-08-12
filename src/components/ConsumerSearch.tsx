import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { searchConsumers } from "@/lib/reference.functions";

export type Consumer = {
  id: string;
  consumer_no: string;
  name: string;
  mobile_no: string | null;
  address: string | null;
  scheme: string;
};

/**
 * Reusable consumer lookup for register forms.
 * Type part of a consumer number or name, pick a match, and the
 * selected consumer is handed back so the form can auto-fill fields.
 */
export function ConsumerSearch({
  value,
  onSelect,
  label = "Consumer",
  placeholder = "Search consumer no. or name",
}: {
  value?: Consumer | null;
  onSelect: (consumer: Consumer | null) => void;
  label?: string;
  placeholder?: string;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useServerFn(searchConsumers);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["consumer-search", debounced],
    queryFn: () => runSearch({ data: { term: debounced } }),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const results = (data ?? []) as Consumer[];

  if (value) {
    return (
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-start justify-between gap-3 rounded-lg border border-input bg-muted/40 p-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{value.name}</p>
            <p className="text-sm text-muted-foreground">
              {value.consumer_no}
              {value.mobile_no ? ` · ${value.mobile_no}` : ""} · {value.scheme}
            </p>
            {value.address ? (
              <p className="truncate text-sm text-muted-foreground">{value.address}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setTerm("");
              setDebounced("");
            }}
            className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-background"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" ref={wrapRef}>
      <label htmlFor="consumer-search" className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id="consumer-search"
          type="text"
          autoComplete="off"
          value={term}
          placeholder={placeholder}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />

        {open && debounced.length >= 2 ? (
          <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
            {isFetching && results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">Searching…</li>
            ) : null}
            {!isFetching && results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">No matching consumer</li>
            ) : null}
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                  }}
                  className="w-full border-b border-border/60 px-3 py-3 text-left last:border-0 hover:bg-accent"
                >
                  <span className="block text-base font-medium text-foreground">{c.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {c.consumer_no}
                    {c.mobile_no ? ` · ${c.mobile_no}` : ""} · {c.scheme}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Type at least 2 characters of the number or name.
      </p>
    </div>
  );
}
