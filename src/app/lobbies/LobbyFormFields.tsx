"use client";

import React from "react";
import { createPortal } from "react-dom";
import { CalendarIcon } from "lucide-react";
import { Calendar, FormField, Input, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { RIOT_SERVERS, regionForServer, type RiotServer } from "@/api/riot/account";

const SORTED_RIOT_SERVERS = [...RIOT_SERVERS].sort((a, b) => a.label.localeCompare(b.label));
export { SORTED_RIOT_SERVERS, regionForServer };

/** Sentinel "server" value meaning "no specific server — open to any region". */
export const GLOBAL_SERVER = "GLOBAL" as const;
export type ServerChoice = RiotServer | typeof GLOBAL_SERVER | "";

/** The single Server select's options: every real Riot server, plus "Global" pinned first. */
export const SERVER_CHOICES = [{ value: GLOBAL_SERVER, label: "Global — any server" }, ...SORTED_RIOT_SERVERS];

/** The region implied by a Server-select value — "Global" for the sentinel, "" when nothing's picked yet. */
export function regionForServerChoice(choice: ServerChoice): string {
  if (!choice) return "";
  if (choice === GLOBAL_SERVER) return "Global";
  return regionForServer(choice);
}

function parseLocalDateTime(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toLocalDateTimeValue(date: Date, timeHHmm: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T${timeHHmm || "00:00"}`;
}

export function DateTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = parseLocalDateTime(value);
  const timeValue = selectedDate
    ? `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`
    : "18:00";

  const displayLabel = selectedDate
    ? selectedDate.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "Pick a date & time";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-[42px] w-full items-center justify-between rounded-lg border border-white/15 bg-ink-900 px-3.5 text-[15px] text-white hover:border-white/25"
        >
          <span className={selectedDate ? "text-white" : "text-white/40"}>{displayLabel}</span>
          <CalendarIcon size={16} className="text-white/50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
          onSelect={(date) => {
            if (!date) return;
            onChange(toLocalDateTimeValue(date, timeValue));
          }}
        />
        <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-white/50">Time</span>
          <input
            type="time"
            value={timeValue}
            onChange={(e) => onChange(toLocalDateTimeValue(selectedDate ?? new Date(), e.target.value))}
            className="h-9 flex-1 rounded-lg border border-white/15 bg-ink-800 px-2.5 text-sm text-white outline-none focus:border-gold-500"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [menuPos, setMenuPos] = React.useState<{ left: number; width: number; top: number; openUp: boolean } | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = React.useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    setMenuPos({
      left: rect.left,
      width: rect.width,
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      openUp,
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-[42px] w-full items-center justify-between rounded-lg border border-white/15 bg-ink-900 px-3.5 text-[15px] text-white hover:border-white/25"
      >
        <span className="truncate">{selected?.label ?? placeholder ?? "Select…"}</span>
        <span className="text-white/40">▾</span>
      </button>
      {open && menuPos
        ? createPortal(
            // Rendered in a portal (not absolutely positioned in-place) so it
            // never gets clipped by an ancestor's overflow — e.g. the Dialog's
            // scrollable content area, which cut off the top of this list.
            <div
              ref={menuRef}
              className="fixed z-[200] overflow-hidden rounded-[10px] border border-white/10 bg-ink-900 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
              style={{
                left: menuPos.left,
                width: menuPos.width,
                top: menuPos.top,
                transform: menuPos.openUp ? "translateY(-100%)" : undefined,
              }}
            >
              <div className="border-b border-white/10 p-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="h-8 w-full rounded-[8px] border border-white/10 bg-ink-800 px-2.5 text-xs text-white placeholder:text-white/40 focus:border-gold-500/60 focus:outline-none"
                />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {filtered.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center px-3.5 py-2 text-left text-sm hover:bg-white/10 ${
                      o.value === value ? "text-gold-500" : "text-white/80"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
                {filtered.length === 0 ? <div className="px-3.5 py-2 text-sm text-white/40">No matches</div> : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/**
 * The lobby-essentials fields shared by the create-lobby dialog and the
 * Host settings edit dialog, so both stay visually and structurally
 * identical: name, game + capacity, server (region is derived from it, not
 * picked independently — that's what let "Region: Global" + "Server: LAN"
 * happen as two unrelated selects).
 */
export function LobbyEssentialsFields({
  name,
  onNameChange,
  limit,
  onLimitChange,
  server,
  onServerChange,
  game = "TFT",
}: {
  name: string;
  onNameChange: (value: string) => void;
  limit: string;
  onLimitChange: (value: string) => void;
  server: ServerChoice;
  onServerChange: (value: ServerChoice) => void;
  game?: string;
}) {
  const derivedRegion = regionForServerChoice(server);
  return (
    <>
      <FormField label="Lobby name" required>
        <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Sunday night 5-stack" maxLength={60} />
      </FormField>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
        <FormField label="Game" hint="More games coming soon." className="min-w-0 sm:flex-1">
          <div className="flex h-[42px] w-full items-center rounded-lg border border-white/15 bg-ink-900 px-3.5 text-[15px] text-white/70">
            {game}
          </div>
        </FormField>
        <FormField label="Limit" required className="min-w-0 sm:w-24 sm:shrink-0">
          <Input type="number" min={2} max={200} value={limit} onChange={(e) => onLimitChange(e.target.value)} />
        </FormField>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
        <FormField label="Server" required hint="Pick a server, or Global for no restriction." className="min-w-0 sm:flex-1">
          <SearchableSelect value={server} onChange={(v) => onServerChange(v as ServerChoice)} options={SERVER_CHOICES} placeholder="Select a server" />
        </FormField>
        <FormField label="Region" hint="Based on the server you picked." className="min-w-0 sm:flex-1">
          <div className="flex h-[42px] w-full items-center rounded-lg border border-white/15 bg-ink-900 px-3.5 text-[15px] text-white/70">
            {derivedRegion || "—"}
          </div>
        </FormField>
      </div>
    </>
  );
}

export type { RiotServer };
