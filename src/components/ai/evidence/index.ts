/**
 * Nasuru AI evidence components and cards (design-system §8.2-8.3).
 *
 *     import { SourceLine, TrustMeter, RouteCard } from "@/components/ai/evidence";
 */
export * from "./format";
export { SourceLine, DiffView, PartnerLabel, isStale, type Source } from "./Source";
export {
  StatusPill,
  CountdownChip,
  QuotaMeter,
  UpgradeCard,
  countdownTone,
  type StatusKind,
} from "./Status";
export {
  TrustMeter,
  CheckList,
  FitScore,
  WhyRankPanel,
  ScamVerdict,
  trustBand,
  type Check,
  type RankFactor,
  type HardFilter,
  type Verdict,
  type ReportRoute,
  type TrustBand,
} from "./Trust";
export {
  MoneyText,
  CostBreakdown,
  PointsBreakdown,
  costTotals,
  type CostLine,
  type CostKind,
  type Foreign,
  type PointsFactor,
  type WhatIf,
} from "./Money";
export {
  Timeline,
  GapItem,
  TaskProgress,
  type TimelineStep,
  type Gap,
  type ProgressStep,
} from "./Progress";
export { AnswerRow, COPIED_MS, type Answer, type AnswerKind } from "./AnswerRow";
export {
  RouteCard,
  PathwayCard,
  JobCard,
  ProgrammeCard,
  ScholarshipCard,
  FactCard,
  DocumentCard,
  ApplicationCard,
} from "./cards";
