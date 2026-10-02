"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { checkReferralCode, signup } from "@/lib/auth/client";
import { useSession } from "@/lib/auth/SessionProvider";
import { ACCREDITATION, REFUND, isPending } from "@/lib/company";
import { isPriceKnown } from "@/lib/pricing";
import { usePricing } from "@/lib/usePricing";
import { Alert, Button, Field, inputClass } from "@/components/ui";
import { SiteHeader } from "@/components/marketing/SiteChrome";
import type { FieldErrors } from "@/types";

/** The case for signing up, reusing the same facts as the landing page — no
 * claim lives twice with a chance to disagree with itself. */
function Pitch({ fee, priceKnown }: { fee: string; priceKnown: boolean }) {
  const accreditationPending = isPending(ACCREDITATION.body);
  return (
    <div
      className="hidden flex-col justify-between rounded-2xl p-10 lg:flex"
      style={{ backgroundColor: "var(--ink)", color: "var(--canvas)" }}
    >
      <div>
        <p className="text-xs font-bold tracking-[0.14em] uppercase opacity-70">
          What you get for this
        </p>
        <p className="font-display mt-3 text-5xl font-extrabold tracking-tight">
          {priceKnown ? fee : "—"}
        </p>
        <p className="mt-1 opacity-80">Once. Not a deposit, not a subscription.</p>

        <ul className="mt-10 space-y-6">
          <li>
            <p className="font-display font-bold">Your matched schools</p>
            <p className="mt-1 leading-relaxed opacity-80">
              Tuition-free universities that take your qualifications, and exactly what each one
              requires.
            </p>
          </li>
          <li>
            <p className="font-display font-bold">Refundable for {REFUND.coolingOffDays} days</p>
            <p className="mt-1 leading-relaxed opacity-80">
              No reason needed. The only condition is that we have not already reviewed one of your
              documents.
            </p>
          </li>
          <li>
            <p className="font-display font-bold">{ACCREDITATION.credential}</p>
            <p className="mt-1 leading-relaxed opacity-80">
              {accreditationPending
                ? "Our certificate and its reference number will be published here — ask us for it in the meantime."
                : `Certified by ${ACCREDITATION.body} since ${ACCREDITATION.since}.`}
            </p>
          </li>
        </ul>
      </div>

      <p className="mt-10 text-sm opacity-60">
        No commission from any university. The shortlist you get is the one that suits you.
      </p>
    </div>
  );
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    referral_code: params.get("ref") ?? "",
    accept_terms: false,
    marketing_opt_in: false,
  });
  const { pricing, ready: priceReady } = usePricing();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [referrer, setReferrer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const code = form.referral_code.trim();

  // A referral code is optional and never blocks signup — a wrong one is
  // simply ignored server-side (plan §6.3). Debounced so typing a code does
  // not fire a request per keystroke.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = code.length < 4 ? null : await checkReferralCode(code).catch(() => null);
      if (cancelled) return;
      setReferrer(result?.valid ? (result.referrer_first_name ?? "") : null);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      await signup({ ...form, referral_code: code || undefined });
      await refresh();
      router.push("/checkout");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setMessage(Object.keys(err.fieldErrors).length ? "" : err.message);
      } else {
        setMessage("Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const firstError = (key: string) => errors[key]?.[0];
  const priceKnown = priceReady && isPriceKnown(pricing);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_1fr] lg:py-20">
        <div className="mx-auto w-full max-w-md">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Create your account
          </h1>
          <p className="mt-2 text-muted">
            Takes a minute.{" "}
            {priceKnown
              ? `The ${pricing.access_fee.formatted} access fee comes after this step, and you'll see exactly what it covers before you pay.`
              : "The access fee comes after this step, and you'll see exactly what it covers before you pay."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {message && <Alert>{message}</Alert>}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" htmlFor="first_name" error={firstError("first_name")}>
                <input
                  id="first_name"
                  required
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Last name" htmlFor="last_name" error={firstError("last_name")}>
                <input
                  id="last_name"
                  required
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Email address" htmlFor="email" error={firstError("email")}>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field
              label="Phone number"
              htmlFor="phone"
              error={firstError("phone")}
              hint="So your counsellor can reach you."
            >
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+234…"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              error={firstError("password")}
              hint="At least 10 characters."
            >
              <input
                id="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field
              label="Referral code (optional)"
              htmlFor="referral_code"
              hint={
                referrer === null
                  ? "If someone shared a code with you, enter it here."
                  : referrer
                    ? `Referred by ${referrer}.`
                    : "Code recognised."
              }
            >
              <input
                id="referral_code"
                value={form.referral_code}
                onChange={(e) => update("referral_code", e.target.value.toUpperCase())}
                className={inputClass}
              />
            </Field>

            <div className="space-y-3 border-t border-line pt-5">
              <label className="flex items-start gap-2.5 text-sm text-muted">
                <input
                  type="checkbox"
                  required
                  checked={form.accept_terms}
                  onChange={(e) => update("accept_terms", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-field-line"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="underline underline-offset-2">
                    terms of service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline underline-offset-2">
                    privacy policy
                  </Link>
                  , including how my documents are stored and processed.
                </span>
              </label>
              {firstError("accept_terms") && (
                <p role="alert" className="text-xs text-danger">
                  {firstError("accept_terms")}
                </p>
              )}

              <label className="flex items-start gap-2.5 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.marketing_opt_in}
                  onChange={(e) => update("marketing_opt_in", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-field-line"
                />
                <span>Send me occasional updates about scholarships and intakes. Optional.</span>
              </label>
            </div>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Creating your account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        <Pitch fee={priceKnown ? pricing.access_fee.formatted : ""} priceKnown={priceKnown} />
      </main>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <>
          <SiteHeader />
          <main className="mx-auto max-w-md px-6 py-12">Loading…</main>
        </>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
