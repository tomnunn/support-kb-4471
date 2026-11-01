<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, mistagged, type Problem } from '#lib/kb/problems';

  // `tickets`: the ticket each problem is filed as, by problem. A problem without one says so.
  let { ticket, tickets = {} }: { ticket: number; tickets?: Partial<Record<Problem, { label: string; href: string }>> } = $props();

  const rows = $derived((reports as Report[]).filter((r) => r.mergedInto === ticket));
  const merged = $derived(uniqueById(rows));
  const groups = $derived(groupByProblem(merged, tenantOf, notes.oneDayMove));
  const tags = (g: { taggedAs: Record<string, number> }) =>
    Object.entries(g.taggedAs)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, n]) => `${tag} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'} ·
  {rows.length - merged.length} duplicate rows in the export, counted once
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tagged as by intake</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      {@const t = tickets[g.problem]}
      <tr class:open={!t}>
        <td><code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td class="tags">{tags(g)}{#if mistagged(g)}<br />{mistagged(g)} tagged as another cause{/if}</td>
        <td class="tenants">{g.tenants.length === 1 ? g.tenants[0] : `${g.tenants.length}: ${g.tenants.join(', ')}`}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if t}<a href={t.href}>{t.label}</a>{:else}no ticket yet{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .tags, .tenants { color: var(--muted); font-size: 0.85em; }
  .open td { background: var(--warn-bg); }
  .open td:last-child { color: var(--warn); font-weight: 600; }
</style>
