import { TrackBoard } from "@/components/ai/track/TrackBoard";

export const metadata = { title: "Your applications · Nasuru AI" };

export default function TrackPage() {
  return (
    <div>
      <h1 className="font-display text-h2 text-ink">Your applications</h1>
      <p className="mt-1 text-body text-muted">Every job and programme application, one board.</p>
      <div className="mt-6">
        <TrackBoard />
      </div>
    </div>
  );
}
