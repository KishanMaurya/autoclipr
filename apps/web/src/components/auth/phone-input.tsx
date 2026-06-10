"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PHONE_DIAL,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from "@/lib/phone-countries";

type PhoneInputProps = {
  countryDial: string;
  localNumber: string;
  onCountryDialChange: (dial: string) => void;
  onLocalNumberChange: (local: string) => void;
  disabled?: boolean;
  id?: string;
};

function findCountry(dial: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.dial === dial) ?? PHONE_COUNTRIES[0];
}

const triggerClassName = cn(
  "inline-flex h-11 w-[132px] shrink-0 items-center justify-between gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-foreground transition-all",
  "hover:bg-white/[0.06] focus-visible:border-emerald-500/40 focus-visible:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/25",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export function PhoneInput({
  countryDial,
  localNumber,
  onCountryDialChange,
  onLocalNumberChange,
  disabled,
  id = "phone",
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(() => findCountry(countryDial).code);

  useEffect(() => {
    setSelectedCode(findCountry(countryDial).code);
  }, [countryDial]);

  const selected = useMemo(
    () => PHONE_COUNTRIES.find((country) => country.code === selectedCode) ?? findCountry(countryDial),
    [countryDial, selectedCode],
  );

  return (
    <div className="flex gap-2">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            id={`${id}-country`}
            className={triggerClassName}
            aria-label="Country code"
          >
            <span className="truncate">
              {selected.flag} {selected.dial}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          className="w-64 p-0"
        >
          <div className="scrollbar-subtle max-h-64 overflow-y-auto p-1.5">
            {PHONE_COUNTRIES.map((country) => {
              const isSelected = selected.code === country.code;

              return (
                <DropdownMenuItem
                  key={`${country.code}-${country.dial}`}
                  className={cn("gap-2", isSelected && "bg-emerald-500/10 text-emerald-300")}
                  onSelect={() => {
                    setSelectedCode(country.code);
                    onCountryDialChange(country.dial);
                    setOpen(false);
                  }}
                >
                  <span aria-hidden>{country.flag}</span>
                  <span className="font-medium tabular-nums">{country.dial}</span>
                  <span className="truncate text-muted-foreground">{country.name}</span>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        value={localNumber}
        onChange={(e) => onLocalNumberChange(e.target.value.replace(/\D/g, ""))}
        disabled={disabled}
        required
        placeholder={countryDial === DEFAULT_PHONE_DIAL ? "9876543210" : "Mobile number"}
        className="min-w-0 flex-1"
      />
    </div>
  );
}
