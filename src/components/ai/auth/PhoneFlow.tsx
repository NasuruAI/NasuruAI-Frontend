"use client";

/**
 * Phone sign-up and sign-in (US-001): number, then code, then, only for a
 * number with no account yet, a name and the terms.
 *
 * The API decides new-or-returning after a correct code (`terms_required`),
 * so the same flow serves /ai/login and /ai/signup and neither page can tell
 * a stranger whether a number is registered.
 */

import { MessageCircle, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import { ApiError } from "@/lib/api";
import {
  type Channel,
  type CodeSent,
  displayPhone,
  formatWait,
  requestPhoneCode,
  retryAt,
  type SignedIn,
  verifyPhoneCode,
} from "@/lib/ai/auth";
import { Button } from "../Button";
import { Checkbox } from "../choice";
import { InlineAlert } from "../feedback";
import { PhoneField, type PhoneValue, phoneToE164Input, TextField } from "../fields";
import { OTPInput } from "../OTPInput";
import { TextLink } from "../TextLink";
import { useNow } from "./useNow";

type Step =
  | { kind: "phone" }
  | { kind: "code"; phone: string; sent: CodeSent }
  | { kind: "details"; phone: string; sent: CodeSent; code: string };

const OFFLINE = "We couldn't reach Nasuru AI. Check your connection and try again.";

const CHANNEL_NAME: Record<Channel, string> = { sms: "SMS", whatsapp: "WhatsApp" };

export function PhoneFlow({ onSignedIn }: { onSignedIn: (result: SignedIn) => void }) {
  const { announce } = useAnnouncer();
  const [step, setStep] = useState<Step>({ kind: "phone" });
  const [phone, setPhone] = useState<PhoneValue>({ dialCode: "+234", number: "" });
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    code?: string;
    firstName?: string;
    terms?: string;
    alert?: string;
  }>({});
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  const waitUntil =
    step.kind === "code" ? new Date(step.sent.whatsapp_available_at).getTime() : null;
  const now = useNow(blockedUntil !== null || waitUntil !== null);
  const blocked = blockedUntil !== null && now < blockedUntil;
  const canResend = waitUntil !== null && now >= waitUntil;

  // Each step moves focus to its heading, so a screen reader hears where it is.
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step.kind]);

  async function send(channel: Channel) {
    const number = step.kind === "phone" ? phoneToE164Input(phone) : step.phone;
    if (step.kind === "phone" && !phone.number.trim()) {
      setErrors({ phone: "Enter your mobile number." });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const sent = await requestPhoneCode(number, channel);
      setCode("");
      setStep({ kind: "code", phone: number, sent });
      announce(`Code sent by ${CHANNEL_NAME[channel]}`);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setErrors({ alert: OFFLINE });
      } else if (error.code === "invalid_phone") {
        setErrors({ phone: error.message });
      } else if (error.code === "whatsapp_not_yet" && step.kind === "code") {
        const at = retryAt(error);
        if (at)
          setStep({ ...step, sent: { ...step.sent, whatsapp_available_at: at.toISOString() } });
        setErrors({ alert: error.message });
      } else {
        const at = retryAt(error);
        if (error.code === "too_many_codes" && at) setBlockedUntil(at.getTime());
        setErrors({ alert: error.message });
      }
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string, details?: { firstName: string; lastName: string }) {
    if (step.kind === "phone") return;
    if (value.length < 6) {
      setErrors({ code: "Enter all 6 digits." });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const result = await verifyPhoneCode({
        phone: step.phone,
        code: value,
        ...(details && {
          accept_terms: true,
          first_name: details.firstName.trim(),
          last_name: details.lastName.trim(),
        }),
      });
      onSignedIn(result);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setErrors({ alert: OFFLINE });
      } else if (error.code === "terms_required") {
        setStep({ kind: "details", phone: step.phone, sent: step.sent, code: value });
      } else if (error.code === "invalid_code") {
        setCode("");
        setStep({ kind: "code", phone: step.phone, sent: step.sent });
        setErrors({ code: error.message });
      } else {
        setErrors({ alert: error.message });
      }
    } finally {
      setBusy(false);
    }
  }

  function createAccount(event: React.FormEvent) {
    event.preventDefault();
    if (step.kind !== "details") return;
    const problems: typeof errors = {};
    if (!firstName.trim()) problems.firstName = "Enter your first name.";
    if (!terms) problems.terms = "Tick the box to agree before we create your account.";
    if (Object.keys(problems).length) {
      setErrors(problems);
      return;
    }
    void verify(step.code, { firstName, lastName });
  }

  const alert = errors.alert && (
    <InlineAlert
      tone="danger"
      title={
        blocked
          ? `Too many codes. Try again in ${formatWait((blockedUntil ?? now) - now)}.`
          : errors.alert
      }
    >
      {blocked ? errors.alert : undefined}
    </InlineAlert>
  );

  if (step.kind === "phone") {
    return (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void send("sms");
        }}
        className="space-y-5"
      >
        <h2 ref={heading} tabIndex={-1} className="sr-only">
          Your phone number
        </h2>
        {alert}
        <PhoneField
          label="Mobile number"
          helper="We'll text you a 6-digit code. Standard SMS rates may apply."
          error={errors.phone}
          value={phone}
          onChange={setPhone}
          disabled={busy}
        />
        <Button type="submit" className="w-full" loading={busy} disabled={blocked}>
          Send code
        </Button>
      </form>
    );
  }

  if (step.kind === "details") {
    return (
      <form noValidate onSubmit={createAccount} className="space-y-5">
        <div>
          <h2 ref={heading} tabIndex={-1} className="text-h3 text-ink outline-none">
            You&apos;re new here
          </h2>
          <p className="mt-1 text-body text-muted">
            {displayPhone(step.phone)} is confirmed. Tell us your name to create your account.
          </p>
        </div>
        {alert}
        <TextField
          label="First name"
          autoComplete="given-name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          error={errors.firstName}
        />
        <TextField
          label="Last name"
          optional
          autoComplete="family-name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
        <div>
          <Checkbox
            checked={terms}
            onChange={setTerms}
            label={
              <>
                I agree to the <TextLink href="/terms">terms</TextLink> and the{" "}
                <TextLink href="/privacy">privacy policy</TextLink>
              </>
            }
          />
          {errors.terms && (
            <p role="alert" className="mt-1 text-body-s text-danger">
              {errors.terms}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>
    );
  }

  const via = step.sent.channel === "whatsapp" ? "on WhatsApp" : "by SMS";
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void verify(code);
      }}
      className="space-y-5"
    >
      <div>
        <h2 ref={heading} tabIndex={-1} className="text-h3 text-ink outline-none">
          Enter your code
        </h2>
        <p className="mt-1 text-body text-muted">
          We sent a 6-digit code {via} to{" "}
          <span className="font-semibold whitespace-nowrap text-ink">
            {displayPhone(step.phone)}
          </span>
          .{" "}
          <button
            type="button"
            onClick={() => {
              setErrors({});
              setStep({ kind: "phone" });
            }}
            className="font-semibold text-accent underline underline-offset-3"
          >
            Change number
          </button>
        </p>
      </div>
      {alert}
      <OTPInput
        value={code}
        onChange={setCode}
        onComplete={(value) => void verify(value)}
        error={errors.code}
        disabled={busy}
      />
      <Button type="submit" className="w-full" loading={busy}>
        Continue
      </Button>
      <div className="rounded-r-md bg-sunken p-4 text-body-s text-muted">
        {canResend ? (
          <>
            <p className="font-semibold text-ink">Didn&apos;t get it?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<MessageCircle aria-hidden className="size-4" />}
                onClick={() => void send("whatsapp")}
                disabled={busy || blocked}
              >
                Send on WhatsApp
              </Button>
              <Button
                type="button"
                size="sm"
                variant="tertiary"
                icon={<Smartphone aria-hidden className="size-4" />}
                onClick={() => void send("sms")}
                disabled={busy || blocked}
              >
                Send a new SMS
              </Button>
            </div>
          </>
        ) : (
          <p>
            Didn&apos;t get it? You can ask for it again, or on WhatsApp, in{" "}
            <span className="tabular-nums">{formatWait((waitUntil ?? now) - now)}</span>.
          </p>
        )}
        <p className="mt-3 text-caption">
          The code works for 10 minutes. We will never call or message you to ask for it.
        </p>
      </div>
    </form>
  );
}
