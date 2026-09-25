"use client";

import { Bell, CircleCheck, FileSearch, Plus, Search } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Banner,
  Button,
  Checkbox,
  Chip,
  Combobox,
  type ComboboxOption,
  ConfirmDialog,
  CountBadge,
  EmptyState,
  IconButton,
  InlineAlert,
  OTPInput,
  PhoneField,
  type PhoneValue,
  Pill,
  Popover,
  ProgressBar,
  RadioGroup,
  SegmentedControl,
  Select,
  Sheet,
  Skeleton,
  SkeletonText,
  Stepper,
  Switch,
  Tabs,
  TextArea,
  TextField,
  TextLink,
  ToastProvider,
  Tooltip,
  Uploader,
  useToast,
} from "@/components/ai";
import { EvidenceGallery } from "./EvidenceGallery";

const OCCUPATIONS: ComboboxOption[] = [
  { value: "2425", label: "Data analyst", code: "SOC 2425" },
  { value: "2136", label: "Programmers and software developers", code: "SOC 2136" },
  { value: "2423", label: "Management consultants and business analysts", code: "SOC 2423" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line py-8">
      <h2 className="font-display text-h2">{title}</h2>
      {children}
    </section>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() =>
        toast({ message: "To-do ticked", action: { label: "Undo", onClick: () => {} } })
      }
    >
      Show a toast
    </Button>
  );
}

export function KitGallery() {
  const [phone, setPhone] = useState<PhoneValue>({ dialCode: "+234", number: "" });
  const [answer, setAnswer] = useState("I built the reconciliation dashboard used by 40 analysts.");
  const [code, setCode] = useState("");
  const [agree, setAgree] = useState(true);
  const [alerts, setAlerts] = useState(false);
  const [plan, setPlan] = useState<"free" | "plus" | "pro">("plus");
  const [currency, setCurrency] = useState<"ngn" | "eur">("ngn");
  const [tab, setTab] = useState<"requirements" | "gaps" | "guide">("requirements");
  const [occupation, setOccupation] = useState<ComboboxOption | null>(null);
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const search = useCallback(
    async (query: string) =>
      OCCUPATIONS.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
    [],
  );

  return (
    <ToastProvider>
      <Banner
        tone="warning"
        action={
          <Button size="sm" variant="secondary">
            See what changed
          </Button>
        }
      >
        You&apos;re offline. Showing what you saw at 14:02.
      </Banner>
      <main className="mx-auto max-w-[1080px] px-4 py-10 md:px-8">
        <p className="text-overline text-muted uppercase">Nasuru AI</p>
        <h1 className="font-display text-h1">Component kit</h1>
        <p className="mt-2 max-w-[68ch] text-body-l text-muted">
          Every foundation component from design-system §8.1, in its states.
        </p>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<Plus aria-hidden className="size-5" />}>Prepare answers</Button>
            <Button variant="secondary">Save</Button>
            <Button variant="tertiary">See details</Button>
            <Button variant="danger">Delete account</Button>
            <Button loading>Checking</Button>
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <IconButton label="Notifications">
              <Bell aria-hidden className="size-5" />
            </IconButton>
            <IconButton label="Search" variant="outlined" selected>
              <Search aria-hidden className="size-5" />
            </IconButton>
            <TextLink href="#" standalone>
              How ranking works
            </TextLink>
            <TextLink href="https://www.gov.uk" external>
              gov.uk
            </TextLink>
          </div>
        </Section>

        <Section title="Text fields">
          <div className="grid gap-6 md:grid-cols-2">
            <TextField label="Full name" placeholder="Chidinma Okafor" />
            <TextField label="Email" type="email" error="Enter an email like name@example.com." />
            <PhoneField
              label="Phone number"
              value={phone}
              onChange={setPhone}
              helper="We'll text you a code."
            />
            <TextField
              label="Search jobs"
              hideLabel
              leading={<Search aria-hidden className="size-5" />}
              placeholder="Search jobs"
            />
            <TextArea
              label="Why Zalando?"
              maxChars={60}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <Select
              label="Marital status"
              placeholder="Choose one"
              defaultValue=""
              options={[
                { value: "single", label: "Single" },
                { value: "married", label: "Married" },
              ]}
            />
            <Combobox
              label="Your occupation"
              value={occupation}
              onChange={setOccupation}
              search={search}
              placeholder="Type your job title"
            />
            <OTPInput value={code} onChange={setCode} label="Enter the 6-digit code" />
          </div>
        </Section>

        <Section title="Choices">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Checkbox
                label="I agree to the terms"
                description="Read them first."
                checked={agree}
                onChange={setAgree}
              />
              <Checkbox label="Select all" checked={false} indeterminate onChange={() => {}} />
              <Switch
                label="Job alerts"
                description="One digest a day at most."
                checked={alerts}
                onChange={setAlerts}
              />
            </div>
            <div className="space-y-4">
              <RadioGroup
                legend="Plan"
                value={plan}
                onChange={setPlan}
                options={[
                  { value: "free", label: "Free" },
                  { value: "plus", label: "Plus", description: "Unlimited answer packs" },
                  { value: "pro", label: "Pro" },
                ]}
              />
              <SegmentedControl
                label="Currency"
                value={currency}
                onChange={setCurrency}
                options={[
                  { value: "ngn", label: "₦ Naira" },
                  { value: "eur", label: "€ Euro" },
                ]}
              />
            </div>
          </div>
        </Section>

        <Section title="Tabs, chips and pills">
          <Tabs
            label="Route detail"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "requirements", label: "Requirements" },
              { value: "gaps", label: "Gaps", count: 3 },
              { value: "guide", label: "Guide" },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Chip selected>Berlin</Chip>
            <Chip>Munich</Chip>
            <Chip onRemove={() => {}}>Salary ≥ threshold</Chip>
            <Pill tone="success" icon={<CircleCheck aria-hidden className="size-3.5" />}>
              Eligible
            </Pill>
            <Pill tone="info">Eligible if…</Pill>
            <Pill tone="warning">Awaiting re-check</Pill>
            <Pill tone="danger" solid>
              Blocked for your nationality
            </Pill>
            <CountBadge count={3} label="unread notifications" />
          </div>
        </Section>

        <Section title="Overlays">
          <div className="flex flex-wrap items-center gap-3">
            <Tooltip content="Trust 92 out of 100, high trust">
              <Button variant="secondary">Hover or focus me</Button>
            </Tooltip>
            <Popover
              label="Destination"
              trigger={(props) => (
                <Button variant="secondary" {...props}>
                  Germany ▾
                </Button>
              )}
            >
              {(close) => (
                <div className="flex flex-col">
                  <Button variant="tertiary" onClick={close}>
                    Compare all 7
                  </Button>
                  <Button variant="tertiary" onClick={close}>
                    Switch destination…
                  </Button>
                </div>
              )}
            </Popover>
            <Button variant="secondary" onClick={() => setDialog(true)}>
              Open dialog
            </Button>
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Open sheet
            </Button>
            <ToastDemo />
          </div>
          <ConfirmDialog
            open={dialog}
            onClose={() => setDialog(false)}
            onConfirm={() => setDialog(false)}
            title="Archive your Canada pipeline?"
            description="You can switch back after 30 days and restore it."
            confirmLabel="Archive and switch"
            destructive
          />
          <Sheet
            open={sheet}
            onClose={() => setSheet(false)}
            title="Filters"
            footer={<Button onClick={() => setSheet(false)}>Show 1,284 jobs</Button>}
          >
            <Switch label="Salary meets the visa threshold" checked onChange={() => {}} />
            <Switch label="Show caution jobs (trust 40–59)" checked={false} onChange={() => {}} />
          </Sheet>
        </Section>

        <Section title="Feedback">
          <div className="space-y-3">
            <InlineAlert tone="info" title="Checked against rules as of 21 Sep 2026" />
            <InlineAlert tone="success" title="Answers ready">
              Copy them into the form, then mark it applied.
            </InlineAlert>
            <InlineAlert
              tone="warning"
              title="3 figures are awaiting re-check"
              onDismiss={() => {}}
            />
            <InlineAlert
              tone="danger"
              title="We couldn't reach the Greenhouse form"
              code="ats_unreachable"
              action={
                <Button size="sm" variant="secondary">
                  Try again
                </Button>
              }
            >
              Try again, or use the extension on your laptop.
            </InlineAlert>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-r-md border border-line p-5">
              <Skeleton className="h-6 w-1/2" />
              <SkeletonText lines={3} />
            </div>
            <div className="space-y-5">
              <ProgressBar label="Profile completeness" value={64} />
              <Stepper
                steps={[
                  "Welcome",
                  "Upload",
                  "Questions",
                  "Confirm",
                  "Occupation",
                  "Destination",
                  "Results",
                ]}
                current={2}
                minutesLeft={6}
              />
            </div>
          </div>
          <EmptyState
            icon={<FileSearch />}
            title="No saved jobs yet"
            action={<Button variant="secondary">Search jobs</Button>}
          >
            Save a job to keep it here, even after the posting closes.
          </EmptyState>
        </Section>

        <Section title="Uploader">
          <Uploader
            label="Upload your CV"
            hint="PDF or Word, up to 20 MB"
            accept=".pdf,.doc,.docx"
            maxBytes={20 * 1024 * 1024}
            onFiles={() => {}}
            onRetry={() => {}}
            onRemove={() => {}}
            items={[
              {
                id: "1",
                name: "Chidinma-Okafor-CV.pdf",
                size: 4_200_000,
                type: "application/pdf",
                status: "uploading",
                progress: 62,
              },
              {
                id: "2",
                name: "WAEC-certificate.jpg",
                size: 1_300_000,
                type: "image/jpeg",
                status: "paused",
              },
              {
                id: "3",
                name: "Transcript.pdf",
                size: 900_000,
                type: "application/pdf",
                status: "done",
                note: "We'll read this in the background.",
              },
              {
                id: "4",
                name: "Passport.jpg",
                size: 700_000,
                type: "image/jpeg",
                status: "failed",
                note: "The connection dropped.",
              },
            ]}
          />
        </Section>
        <EvidenceGallery />
      </main>
    </ToastProvider>
  );
}
