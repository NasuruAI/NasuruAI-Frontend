import { JobsView } from "@/components/ai/jobs/JobsView";

export const metadata = { title: "Jobs · Nasuru AI" };

const SORTS = ["fit", "recent", "trust"] as const;

/** `?search=<id>` opens a saved search; `?sort=recent` comes from the alert digest. */
export default async function JobsPage({ searchParams }: PageProps<"/ai/jobs">) {
  const { search, sort } = await searchParams;
  const initialSort = SORTS.find((value) => value === sort);
  return (
    <JobsView
      searchId={typeof search === "string" ? search : undefined}
      initialSort={initialSort}
    />
  );
}
