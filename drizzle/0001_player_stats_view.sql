-- Per-player, per-year aggregation. UI consumes this read-only.
--
-- Anwesenheit divides by all distinct dates in the *year*, not just the dates
-- the player attended — i.e. the view's denominator must reach across players.
-- Implemented by joining a per-year totals subselect.

create view player_stats_by_year as
with yearly_totals as (
  select extract(year from datum)::int as year,
         count(*)                       as spieltage_in_year
  from spieltage
  group by 1
)
select
  extract(year from e.datum)::int                                    as year,
  p.id                                                               as player_id,
  p.kuerzel,
  p.name,
  count(distinct e.datum)::int                                       as spieltage,
  sum(e.runden)::int                                                 as runden,
  sum(e.bommel)::int                                                 as bommel,
  sum(e.bommel)::numeric / nullif(sum(e.runden), 0)                  as bommel_per_runde,
  (sum(e.runden) - sum(e.bommel))::numeric
    / nullif(sum(e.runden), 0)                                       as gewinnrate,
  count(distinct e.datum)::numeric / nullif(yt.spieltage_in_year, 0) as anwesenheit
from ergebnisse e
join players p          on p.id   = e.player_id
join yearly_totals yt   on yt.year = extract(year from e.datum)::int
group by 1, 2, 3, 4, yt.spieltage_in_year;
