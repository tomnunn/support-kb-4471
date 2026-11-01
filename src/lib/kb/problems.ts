// What each report in a merged ticket shows, so one ticket can be split into one per problem.
// causes.ts places a report by its tenant; the desk's notes (desk-notes.json) catch the reports
// that show something else.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

// `one-day`: the booking moved by a single day, no day/month flip. Neither parser nor hint.
export type Problem = Cause | 'one-day' | 'unplaced';

// A note is a person who read the body; the tenant rule never does. The note wins.
export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
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
    const p = problemOf(r, tenantOf(r), oneDayMove);
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
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
