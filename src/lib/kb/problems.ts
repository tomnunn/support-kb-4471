// What each report in a merged ticket shows, so one ticket can be split into one per problem.
// causes.ts places a report by its tenant; the desk's notes (desk-notes.json) catch the reports
// that show something else.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

// `one-day`: the booking moved by a single day, no day/month flip. Neither parser nor hint.
export type Problem = Cause | 'one-day' | 'unplaced';

// Where a report is filed: by its tenant (causes.ts), as the desk counts it.
export function filedAs(r: Report, t: Tenant | undefined): Problem {
  return causeOf(r, t) ?? 'unplaced';
}

// Every problem a report shows. A report the desk read as a one-day move stays counted where it is
// filed (the desk's rule, CauseTable) and also counts as its own problem.
export function problemsOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem[] {
  return oneDayMove.includes(r.id) ? [filedAs(r, t), 'one-day'] : [filedAs(r, t)];
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: string[];
  firstSeen: string;
  lastSeen: string;
};

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  for (const r of uniqueById(reports)) {
    for (const p of problemsOf(r, tenantOf(r), oneDayMove)) byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
        tenants: [...new Set(rs.map((r) => tenantOf(r)?.name ?? r.tenant))].sort(),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}

// Reports whose intake tag names a different cause than the one they were placed under.
export function mistagged(g: ProblemGroup): number {
  return g.reports.filter((r) => r.meta.intakeTag !== g.problem).length;
}

// Reports in a filed group that also count under one-day: footnoted, as CauseTable does.
export function alsoOneDay(g: ProblemGroup, oneDayMove: readonly string[]): number {
  return g.problem === 'one-day' ? 0 : g.reports.filter((r) => oneDayMove.includes(r.id)).length;
}
