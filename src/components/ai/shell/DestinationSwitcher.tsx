"use client";

/**
 * Destination switcher (web.md §1.1, US-002/US-003): the flag and country;
 * a popover with "Compare all 7" (free, never a switch) and "Switch
 * destination…", which opens the consequence dialog with the date the next
 * switch is allowed.
 */

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { DESTINATIONS, useChooseDestination, useDestination } from "@/lib/ai/shell";
import { Button, ButtonLink } from "../Button";
import { Dialog } from "../Dialog";
import { COUNTRY_NAMES, Flag } from "../Flag";
import { InlineAlert } from "../feedback";
import { Popover } from "../Popover";
import { RadioGroup } from "../choice";
import { cx } from "../cx";

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DestinationSwitcher({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useDestination();
  const [switching, setSwitching] = useState(false);
  const active = data?.active?.country;

  if (isLoading)
    return <span className="h-9 w-32 animate-pulse rounded-r-md bg-sunken" aria-hidden />;
  if (!active) {
    return (
      <ButtonLink href="/ai/start/destination" size="sm" variant="secondary">
        Choose a destination
      </ButtonLink>
    );
  }

  return (
    <>
      <Popover
        label="Destination"
        trigger={(props) => (
          <button
            type="button"
            {...props}
            className="inline-flex h-10 items-center gap-2 rounded-r-md px-2 text-body font-semibold text-ink hover:bg-sunken"
          >
            <Flag country={active} />
            <span className={cx(compact && "sr-only")}>{COUNTRY_NAMES[active] ?? active}</span>
            <span className="sr-only">: change destination</span>
            <ChevronDown aria-hidden className="size-4 text-muted" />
          </button>
        )}
      >
        {(close) => (
          <div className="w-64">
            <p className="px-2 pt-1 pb-2 text-caption text-muted">
              Your destination is <strong className="text-ink">{COUNTRY_NAMES[active]}</strong>.
              Everything you see is about it.
            </p>
            <Link
              href="/ai/compare"
              onClick={close}
              className="block rounded-r-sm px-2 py-2 text-body font-semibold text-ink hover:bg-sunken"
            >
              Compare all 7
              <span className="block text-caption font-normal text-muted">
                Free. Doesn&apos;t switch anything.
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                close();
                setSwitching(true);
              }}
              className="block w-full rounded-r-sm px-2 py-2 text-left text-body font-semibold text-ink hover:bg-sunken"
            >
              Switch destination…
            </button>
          </div>
        )}
      </Popover>
      <SwitchDialog
        open={switching}
        onClose={() => setSwitching(false)}
        current={active}
        nextAllowedAt={data?.next_switch_allowed_at ?? null}
        inGrace={data?.in_first_choice_grace ?? false}
      />
    </>
  );
}

export function SwitchDialog({
  open,
  onClose,
  current,
  nextAllowedAt,
  inGrace,
}: {
  open: boolean;
  onClose: () => void;
  current: string;
  nextAllowedAt: string | null;
  inGrace: boolean;
}) {
  const choose = useChooseDestination();
  const [target, setTarget] = useState<string | null>(null);
  const locked = nextAllowedAt !== null && new Date(nextAllowedAt) > new Date();
  const conflict = choose.error instanceof ApiError && choose.error.status === 409;

  function close() {
    setTarget(null);
    choose.reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Switch destination?"
      description={
        inGrace
          ? "You chose this destination less than a day ago, so you can change it freely."
          : `Your ${COUNTRY_NAMES[current]} pipeline is archived, read-only. You can switch back after 30 days and restore it.`
      }
      footer={
        locked ? (
          <Button variant="secondary" onClick={close}>
            Got it
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={choose.isPending}>
              Cancel
            </Button>
            <Button
              disabled={!target}
              loading={choose.isPending}
              onClick={() => target && choose.mutate(target, { onSuccess: close })}
            >
              {target ? `Switch to ${COUNTRY_NAMES[target]}` : "Switch"}
            </Button>
          </>
        )
      }
    >
      {locked ? (
        <InlineAlert
          tone="info"
          title={`You can switch again on ${formatDate(nextAllowedAt as string)}`}
        >
          One switch every 30 days keeps your plan and applications consistent. Compare all 7 is
          free in the meantime.
        </InlineAlert>
      ) : (
        <>
          <RadioGroup
            legend="New destination"
            value={target}
            onChange={setTarget}
            options={DESTINATIONS.filter((code) => code !== current).map((code) => ({
              value: code,
              label: (
                <span className="inline-flex items-center gap-2">
                  <Flag country={code} />
                  {COUNTRY_NAMES[code]}
                </span>
              ),
            }))}
          />
          {choose.error && (
            <InlineAlert
              tone="danger"
              title={conflict ? "Not yet" : "The switch didn't go through"}
              code={choose.error instanceof ApiError ? choose.error.code : undefined}
              className="mt-3"
            >
              {choose.error.message}
            </InlineAlert>
          )}
        </>
      )}
    </Dialog>
  );
}
