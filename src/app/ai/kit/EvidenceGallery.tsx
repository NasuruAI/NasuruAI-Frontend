"use client";

import { useState } from "react";
import { Button } from "@/components/ai";
import {
  AnswerRow,
  ApplicationCard,
  CheckList,
  CostBreakdown,
  CountdownChip,
  DiffView,
  DocumentCard,
  FactCard,
  FitScore,
  GapItem,
  JobCard,
  MoneyText,
  PartnerLabel,
  PathwayCard,
  PointsBreakdown,
  ProgrammeCard,
  QuotaMeter,
  RouteCard,
  ScamVerdict,
  ScholarshipCard,
  SourceLine,
  StatusPill,
  TaskProgress,
  Timeline,
  TrustMeter,
  UpgradeCard,
  WhyRankPanel,
  type Check,
  type Source,
  type TimelineStep,
} from "@/components/ai/evidence";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line py-8">
      <h2 className="font-display text-h2">{title}</h2>
      {children}
    </section>
  );
}

/** ISO dates relative to today, fixed for the life of the page. */
function useDates() {
  const [dates] = useState(() => {
    const at = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
    return { in2: at(2), in9: at(9), in40: at(40), ago3: at(-3), ago20: at(-20), in200: at(200) };
  });
  return dates;
}

const UKVI: Source = {
  name: "GOV.UK Skilled Worker visa",
  url: "https://www.gov.uk/skilled-worker-visa",
  checkedOn: "2026-09-02",
};

const CHECKS: Check[] = [
  {
    name: "Company is registered",
    outcome: "pass",
    evidence: "Active on Companies House since 2014",
  },
  { name: "Licensed to sponsor visas", outcome: "pass", evidence: "On the Home Office register" },
  {
    name: "Asks you to pay a fee",
    outcome: "fail",
    evidence: "£450 'visa processing fee' in the email",
  },
  {
    name: "Recruiter's email domain",
    outcome: "unknown",
    evidence: "Gmail address, can't match it to the company",
  },
];

const STEPS: TimelineStep[] = [
  { title: "IELTS 7.0", when: "Nov 2026", naira: 320_000, status: "done" },
  { title: "Master's in Data Science", when: "Sep 2027", naira: 38_000_000, status: "current" },
  { title: "Graduate visa", when: "2 years", naira: 1_900_000, status: "future" },
  { title: "Skilled Worker visa", when: "5 years", status: "future", leadsToPr: true },
];

export function EvidenceGallery() {
  const dates = useDates();
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [chosen, setChosen] = useState(false);

  return (
    <>
      <Section title="Status">
        <div className="flex flex-wrap gap-2">
          <StatusPill status="eligible" />
          <StatusPill status="eligible_if" />
          <StatusPill status="not_eligible" />
          <StatusPill status="blocked" />
          <StatusPill status="stale" />
          <StatusPill status="you_answer" />
        </div>
        <div className="flex flex-wrap gap-3">
          <CountdownChip date={dates.in40} label="Closes" />
          <CountdownChip date={dates.in9} label="Closes" />
          <CountdownChip date={dates.in2} label="Closes" />
          <CountdownChip date={dates.ago3} label="Deadline" />
        </div>
        <div className="grid max-w-md gap-4">
          <QuotaMeter used={2} limit={3} noun="free answer packs" />
          <QuotaMeter used={3} limit={3} noun="free answer packs" />
          <QuotaMeter used={14} limit={null} noun="answer packs" />
        </div>
        <div className="max-w-md">
          <UpgradeCard
            title="Get unlimited answer packs"
            benefits={["Answer every form, every month", "Tailored CV per job", "Deadline alerts"]}
            action={<Button>See Plus</Button>}
          />
        </div>
      </Section>

      <Section title="Provenance">
        <SourceLine source={UKVI} />
        <SourceLine source={{ ...UKVI, recheckAfter: "2026-09-10" }} />
        <DiffView label="Salary floor" before="£38,700" after="£41,700" />
        <div className="max-w-md">
          <PartnerLabel />
        </div>
      </Section>

      <Section title="Trust and fit">
        <div className="flex flex-wrap gap-8">
          <TrustMeter score={92} />
          <TrustMeter score={68} />
          <TrustMeter score={45} />
          <TrustMeter score={20} />
        </div>
        <div className="max-w-xl">
          <CheckList checks={CHECKS} />
        </div>
        <FitScore
          score={84}
          reasons={["Your 4 years in payments", "Python and SQL", "Sponsor licence"]}
          onWhy={() => {}}
        />
        <div className="max-w-xl">
          <WhyRankPanel
            factors={[
              {
                label: "Your skills",
                points: 32,
                max: 40,
                detail: "6 of 8 listed skills are on your CV",
              },
              { label: "Experience", points: 20, max: 25, detail: "4 years; they ask for 3 to 5" },
              {
                label: "Visa route",
                points: 15,
                max: 20,
                detail: "Salary clears the Skilled Worker floor",
              },
            ]}
            filters={[
              { label: "Sponsors visas", passed: true, detail: "On the Home Office register" },
              { label: "Open to Nigerians", passed: true, detail: "No nationality restriction" },
            ]}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ScamVerdict
            verdict="scam"
            summary="The offer asks you to pay before you start. Genuine employers don't."
            checks={CHECKS}
            reportRoutes={[
              {
                label: "Report to the EFCC",
                href: "https://www.efcc.gov.ng/efcc/contact-us",
                detail: "for money taken or asked for",
              },
            ]}
          />
          <ScamVerdict
            verdict="genuine"
            summary="Everything we could check matches the company's own records."
            checks={CHECKS.filter((check) => check.outcome === "pass")}
          />
        </div>
      </Section>

      <Section title="Money">
        <p className="text-body">
          <MoneyText
            naira={1_450_000}
            foreign={{ amount: 750, currency: "GBP" }}
            rate={{ perUnit: 1_933, currency: "GBP", on: "2026-09-24" }}
          />
        </p>
        <div className="max-w-xl">
          <CostBreakdown
            lines={[
              {
                kind: "tuition",
                label: "Tuition",
                naira: 28_000_000,
                foreign: { amount: 14_500, currency: "GBP" },
                source: UKVI,
              },
              { kind: "living", label: "Living costs, 12 months", naira: 22_000_000 },
              { kind: "visa", label: "Visa and health surcharge", naira: 4_200_000 },
              { kind: "tests", label: "IELTS", naira: 320_000 },
              { kind: "travel", label: "Flight", naira: 1_500_000 },
              { kind: "proof_of_funds", label: "Proof of funds", naira: 17_500_000 },
            ]}
          />
        </div>
        <div className="max-w-xl">
          <PointsBreakdown
            scheme="Express Entry CRS"
            factors={[
              { label: "Age (29)", points: 110, max: 110 },
              { label: "Master's degree", points: 135, max: 150, from: "Your transcript" },
              { label: "English: CLB 9", points: 124, max: 136, from: "IELTS, Nov 2026" },
              { label: "Skill transferability", points: 50, max: 100 },
            ]}
            threshold={{ points: 470, label: "the last draw" }}
            whatIfs={[
              { label: "you reach CLB 7 in French", delta: 50 },
              { label: "you get a year of Canadian work", delta: 40 },
            ]}
            source={{ name: "IRCC: CRS criteria", checkedOn: "2026-09-12" }}
          />
        </div>
      </Section>

      <Section title="Journey">
        <div className="grid gap-8 lg:grid-cols-2">
          <Timeline steps={STEPS} />
          <Timeline steps={STEPS} orientation="horizontal" />
        </div>
        <div className="grid max-w-xl gap-3">
          <GapItem
            gap={{
              what: "IELTS 6.5 in every band",
              why: "The university's minimum for this course",
              how: "Book the Academic test in Lagos or Abuja",
              time: "about 6 weeks",
              naira: 320_000,
            }}
            onAdd={() => {}}
          />
          <TaskProgress
            title="Writing your answers"
            steps={[
              { label: "Reading the form", state: "done" },
              { label: "Matching your profile", state: "done" },
              { label: "Writing 3 answers", state: "active" },
              { label: "Checking the limits", state: "pending" },
            ]}
          />
        </div>
      </Section>

      <Section title="Answers">
        <div className="grid max-w-2xl gap-3">
          <AnswerRow
            answer={{
              id: "1",
              label: "Why do you want this role?",
              fieldType: "Long text",
              kind: "written",
              answer:
                "I've spent four years building payment reconciliation at Paystack, and this role is the same problem at a larger scale.",
              maxChars: 500,
            }}
            selected={selected === "1"}
            onSelect={(answer) => setSelected(answer.id)}
            onEdit={() => {}}
            onFeedback={() => {}}
          />
          <AnswerRow
            answer={{
              id: "2",
              label: "Current salary",
              fieldType: "Number",
              kind: "filled",
              answer: "₦9,600,000",
              source: { name: "Your payslip, Aug 2026" },
            }}
          />
          <AnswerRow
            answer={{
              id: "3",
              label: "Summary",
              fieldType: "Short text",
              kind: "written",
              answer: "Data analyst with four years in fintech, Python, SQL and dbt.",
              maxChars: 50,
            }}
          />
          <AnswerRow
            answer={{
              id: "4",
              label: "Do you have any unspent convictions?",
              fieldType: "Yes / no",
              kind: "you_answer",
              answer: "",
              guidance: "Answer this yourself. We never fill in questions about criminal records.",
            }}
          />
          <AnswerRow
            answer={{
              id: "5",
              label: "CV",
              fieldType: "File",
              kind: "file",
              answer: "",
              guidance: "Upload “CV – Monzo data analyst.pdf”, tailored for this job.",
            }}
          />
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-2">
          <RouteCard
            name="UK Skilled Worker visa"
            status="eligible_if"
            topLine="Needs a job offer paying at least £41,700"
            months={4}
            naira={5_800_000}
            source={UKVI}
            href="/ai/routes"
            onAddToPlan={() => {}}
          />
          <RouteCard
            name="Canada Express Entry"
            status="not_eligible"
            topLine="430 points; the last draw needed 470"
            months={14}
            naira={9_200_000}
            source={{ name: "IRCC", recheckAfter: "2026-09-10" }}
            href="/ai/routes"
          />
          <JobCard
            title="Data analyst"
            employer="Monzo"
            location="London"
            salary={{ naira: 92_000_000, foreign: { amount: 47_500, currency: "GBP" } }}
            trust={92}
            fit={{ score: 84, reasons: ["Payments experience", "Python and SQL"] }}
            postedAt={dates.ago3}
            sponsorLicensed
            saved={saved}
            href="/ai/jobs"
            onSave={() => setSaved((value) => !value)}
            onPrepare={() => {}}
          />
          <ProgrammeCard
            name="MSc Data Science"
            institution="University of Glasgow"
            city="Glasgow"
            totalNaira={38_000_000}
            admissible="if"
            deadline={dates.in9}
            postStudyWork
            href="/ai/study"
            onSave={() => {}}
          />
          <ScholarshipCard
            name="Chevening Scholarship"
            sponsor="UK Foreign Office"
            value="Full tuition, flights and £1,400 a month"
            awards={1_500}
            deadline={dates.in40}
            returnHome
            href="/ai/study"
          />
          <FactCard
            kindLabel="Work"
            title="Data analyst, Paystack"
            subtitle="Mar 2022 – now"
            detail="Built the reconciliation dashboards used by finance."
            source={{ document: "CV.pdf", page: 1 }}
            confirmed={false}
            onConfirm={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
          <DocumentCard
            kindLabel="Passport"
            name="Nigerian passport"
            expiresOn={dates.in200}
            warnDays={365}
            usedIn={3}
            onView={() => {}}
            onReplace={() => {}}
          />
          <DocumentCard
            kindLabel="Test result"
            name="IELTS Academic"
            expiresOn={dates.ago20}
            onView={() => {}}
          />
        </div>
        <div className="max-w-2xl">
          <PathwayCard
            rank={1}
            title="Study, then work in the UK"
            steps={STEPS}
            naira={42_000_000}
            months={30}
            leadsToPr
            probability="high"
            chosen={chosen}
            onChoose={() => setChosen(true)}
          />
        </div>
        <div className="grid max-w-md gap-3">
          <ApplicationCard
            organisation="Monzo"
            title="Data analyst"
            stageLabel="Interview"
            lastEvent="Phone screen passed, 3 days ago"
            nextAction="Prepare for the case study"
            followUpOn={dates.in9}
            href="/ai/track"
          />
        </div>
      </Section>
    </>
  );
}
