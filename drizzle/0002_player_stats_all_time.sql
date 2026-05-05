-- All-time per-player aggregation. Same shape as player_stats_by_year but
-- without the year grouping; consumed by the "Gesamt" tab on the Statistik page.
-- Anwesenheit divides by ALL distinct dates in the spieltage table.

create view player_stats_all_time as
select
  p.id                                                              as player_id,
  p.kuerzel,
  p.name,
  count(distinct e.datum)::int                                      as spieltage,
  sum(e.runden)::int                                                as runden,
  sum(e.bommel)::int                                                as bommel,
  sum(e.bommel)::numeric / nullif(sum(e.runden), 0)                 as bommel_per_runde,
  (sum(e.runden) - sum(e.bommel))::numeric
    / nullif(sum(e.runden), 0)                                      as gewinnrate,
  count(distinct e.datum)::numeric
    / nullif((select count(*)::numeric from spieltage), 0)          as anwesenheit
from ergebnisse e
join players p on p.id = e.player_id
group by p.id, p.kuerzel, p.name;
