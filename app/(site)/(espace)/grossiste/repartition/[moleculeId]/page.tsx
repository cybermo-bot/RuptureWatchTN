import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GOVERNORATE_SHAPES } from "@/components/GovernorateMap";
import { LevelBadge } from "@/components/LevelBadge";
import { OriginBadge } from "@/components/OriginBadge";
import { PlaybookLink } from "@/components/PlaybookLink";
import { PageHeader } from "@/components/PageHeader";
import { SplitComparison } from "@/components/wholesaler/SplitComparison";
import { DEMO_NEEDS, listDecisions, parseStock } from "@/lib/allocation/decisions";
import { ALLOCATION_PARAMS } from "@/lib/allocation/params";
import { EXAMPLE_STOCK } from "@/lib/allocation/stock";
import { getCurrentSession } from "@/lib/auth/session";
import { HOME_BY_TYPE } from "@/lib/demo/roles";
import { createUserClient } from "@/lib/db/server";
import { formatDate, formatTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { listSignals } from "@/lib/signals/views";

// Track D: the fair split for one molecule at "probable" or "confirmée". The wholesaler types its
// stock and sees two splits of it side by side (components/wholesaler/SplitComparison.tsx): the
// proportional reference model and the proposed split by days of cover, from simulated figures
// shown with their badge. The decision is recorded on the proposed split, with its reason.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));
const nf = new Intl.NumberFormat("fr-FR");
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SplitPage({
  params,
  searchParams,
}: PageProps<"/grossiste/repartition/[moleculeId]">) {
  const session = await getCurrentSession();
  if (!session) redirect("/#roles");
  if (session.organisation.type !== "wholesaler")
    redirect(HOME_BY_TYPE[session.organisation.type]);

  const { moleculeId } = await params;
  if (!UUID.test(moleculeId)) notFound();
  const sp = await searchParams;
  const stockParam = first(sp.stock);
  const saved = first(sp.enregistre);

  const supabase = await createUserClient();
  const [[signal], decisions] = await Promise.all([
    listSignals(supabase, [moleculeId]),
    listDecisions(supabase, moleculeId, 10),
  ]);
  if (!signal) notFound();
  const eligible = signal.level === "likely" || signal.level === "confirmed";
  const levelWord = t(`core.levels.${signal.level}`);

  const back = (
    <Link
      href={`/grossiste?m=${moleculeId}`}
      className="inline-flex min-h-12 w-fit items-center font-medium"
    >
      {t("wholesaler.split.back")}
    </Link>
  );

  if (!eligible) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          meta={t("wholesaler.split.title")}
          title={signal.molecule_name}
        />
        <p className="font-medium text-ink">
          {t("wholesaler.split.notAvailable")}
        </p>
        <p className="text-ink-muted">
          {t("wholesaler.split.notAvailableBody", {
            molecule: signal.molecule_name,
            level: levelWord,
          })}
        </p>
        {back}
      </div>
    );
  }

  const stock = stockParam === undefined ? EXAMPLE_STOCK : parseStock(stockParam);
  const names = Object.fromEntries(
    DEMO_NEEDS.map((g) => [g.code, GOV_NAME.get(g.code) ?? g.code]),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        meta={t("wholesaler.split.title")}
        title={signal.molecule_name}
        description={
          <span className="flex flex-col gap-3">
            <span className="flex flex-wrap items-center gap-x-3">
              <LevelBadge level={signal.level} />
            </span>
            <span>{t("wholesaler.split.intro")}</span>
          </span>
        }
      />

      {saved === "applique" || saved === "ecart" ? (
        <p
          role="status"
          className="panel border-s-4 border-s-brand p-4 font-medium text-ink"
        >
          {saved === "applique"
            ? t("wholesaler.split.savedApplied")
            : t("wholesaler.split.savedRejected")}
        </p>
      ) : null}

      <SplitComparison
        moleculeId={moleculeId}
        needs={DEMO_NEEDS}
        names={names}
        params={ALLOCATION_PARAMS}
        initialStock={stock === null ? (stockParam ?? "") : String(stock)}
        initialShowAll={first(sp.gouvernorats) === "tous"}
        initialTarget={first(sp.cible) ?? "14"}
        protocolLink={
          <PlaybookLink molecule={signal.molecule_name} context="repartition" />
        }
      />

      <section
        aria-labelledby="parametres"
        className="panel flex flex-col gap-2 p-5"
      >
        <h2 id="parametres" className="font-semibold text-ink">
          {t("wholesaler.split.paramsTitle")}
        </h2>
        <ul className="flex flex-col gap-1 text-ink">
          <li>
            {t("wholesaler.split.paramReserve", {
              pct: Math.round(ALLOCATION_PARAMS.hospitalReserveShare * 100),
            })}
          </li>
          <li>
            {t("wholesaler.split.paramPeriod", {
              days: ALLOCATION_PARAMS.periodDays,
            })}
          </li>
          <li>{t("wholesaler.split.cap")}</li>
        </ul>
        <p className="text-sm text-ink-muted">
          {t("wholesaler.split.paramsNote")}
        </p>
      </section>

      <section
        aria-labelledby="historique-decisions"
        className="panel flex flex-col gap-3 p-5"
      >
        <h2 id="historique-decisions" className="font-semibold text-ink">
          {t("wholesaler.split.historyTitle")}
        </h2>
        {decisions === null ? (
          <p className="text-sm text-ink-muted">
            {t("wholesaler.home.decisionsUnavailable")}
          </p>
        ) : decisions.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {t("wholesaler.split.historyEmpty")}
          </p>
        ) : (
          <ol className="hairline-list text-sm">
            {decisions.map((d) => (
              <li key={d.id} className="flex flex-col gap-1 py-3">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <time
                    dateTime={d.decided_at}
                    className="text-ink-muted tabular-nums"
                  >
                    {t("core.common.dateAt", {
                      date: formatDate(d.decided_at),
                      time: formatTime(d.decided_at),
                    })}
                  </time>
                  <span className="font-medium text-ink">
                    {d.applied
                      ? t("wholesaler.split.historyApplied")
                      : t("wholesaler.split.historyRejected")}
                  </span>
                  <span className="text-ink">
                    {t("wholesaler.split.historyStock", {
                      stock: nf.format(d.stock),
                    })}
                  </span>
                  <OriginBadge origin={d.origin} />
                </span>
                {d.deviation_reason ? (
                  <span className="text-ink">
                    {t("wholesaler.split.historyReason", {
                      reason: d.deviation_reason,
                    })}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {back}
    </div>
  );
}
