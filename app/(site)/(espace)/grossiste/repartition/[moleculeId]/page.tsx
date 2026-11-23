import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GOVERNORATE_SHAPES } from "@/components/GovernorateMap";
import { LevelBadge } from "@/components/LevelBadge";
import { OriginBadge } from "@/components/OriginBadge";
import { PageHeader } from "@/components/PageHeader";
import { CoverChart } from "@/components/wholesaler/CoverChart";
import { DecisionForm } from "@/components/wholesaler/DecisionForm";
import {
  DEMO_NEEDS,
  DEMO_ORIGIN,
  demoSplit,
  listDecisions,
  parseStock,
} from "@/lib/allocation/decisions";
import { ALLOCATION_PARAMS } from "@/lib/allocation/params";
import { getCurrentSession } from "@/lib/auth/session";
import { HOME_BY_TYPE } from "@/lib/demo/roles";
import { createUserClient } from "@/lib/db/server";
import { formatDate, formatTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { listSignals } from "@/lib/signals/views";

// Track D: the fair split for one molecule at "probable" or "confirmée". The wholesaler types its
// stock (a GET form: the page works before JavaScript loads); the split is computed on the server
// from simulated figures, shown with their badge; the decision is recorded with its reason.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));
const nf = new Intl.NumberFormat("fr-FR");
const days = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

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
  const stockParam = Array.isArray(sp.stock) ? sp.stock[0] : sp.stock;
  const saved = Array.isArray(sp.enregistre) ? sp.enregistre[0] : sp.enregistre;

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

  const stock = stockParam === undefined ? null : parseStock(stockParam);
  const split = stock === null ? null : demoSplit(stock);
  const use = new Map(DEMO_NEEDS.map((g) => [g.code, g.monthlyUse]));
  const rows = split
    ? split.rows
        .map((r) => ({
          ...r,
          name: GOV_NAME.get(r.code) ?? r.code,
          use: use.get(r.code) ?? 0,
        }))
        .sort(
          (a, b) =>
            b.boxes - a.boxes ||
            (a.coverBefore ?? 0) - (b.coverBefore ?? 0) ||
            a.name.localeCompare(b.name, "fr"),
        )
    : [];
  const stockId = "stock-disponible";

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

      <div className="grid gap-5 lg:grid-cols-2">
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

        <form method="get" className="panel flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={stockId} className="text-sm font-medium text-ink">
              {t("wholesaler.split.stockLabel")}
            </label>
            <input
              id={stockId}
              name="stock"
              inputMode="numeric"
              pattern="[0-9 ]*"
              required
              defaultValue={stock ?? stockParam ?? ""}
              aria-describedby={`${stockId}-hint`}
              className="min-h-12 w-full rounded-md border border-ink-muted bg-surface px-3.5 text-base text-ink focus:border-brand"
            />
            <p id={`${stockId}-hint`} className="text-sm text-ink-muted">
              {stockParam !== undefined && stock === null
                ? t("wholesaler.split.stockInvalid")
                : t("wholesaler.split.stockHint")}
            </p>
          </div>
          <button
            type="submit"
            className="min-h-12 w-fit rounded-md border border-brand px-5 font-medium text-brand hover:bg-surface-subtle"
          >
            {t("wholesaler.split.compute")}
          </button>
        </form>
      </div>

      {split && stock !== null ? (
        <>
          <section
            aria-labelledby="repartition"
            className="panel flex flex-col gap-4 p-5"
          >
            <div className="flex flex-col gap-2 border-s-2 border-line ps-3">
              <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                {t("wholesaler.split.simulatedTitle")}{" "}
                <OriginBadge origin={DEMO_ORIGIN} />
              </p>
              <p className="text-sm text-ink-muted">
                {t("wholesaler.split.simulatedBody")}
              </p>
            </div>
            <h2 id="repartition" className="text-lg font-semibold text-ink">
              {t("wholesaler.split.tableTitle")}
            </h2>
            <p className="text-ink">
              {t("wholesaler.split.summary", {
                stock: nf.format(split.stock),
                reserve: nf.format(split.reserve),
                allocated: nf.format(split.allocated),
                unallocated: nf.format(split.unallocated),
              })}
            </p>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <div className="overflow-x-auto">
                <table className="hairline-table w-full text-sm">
                  <caption className="sr-only">
                    {t("wholesaler.split.tableTitle")}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        {t("wholesaler.split.colGovernorate")}
                      </th>
                      <th scope="col" className="text-end">
                        {t("wholesaler.split.colUse")}
                      </th>
                      <th scope="col" className="text-end">
                        {t("wholesaler.split.colBefore")}
                      </th>
                      <th scope="col" className="text-end">
                        {t("wholesaler.split.colBoxes")}
                      </th>
                      <th scope="col" className="text-end">
                        {t("wholesaler.split.colAfter")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.code}>
                        <th scope="row" className="font-normal">
                          {r.name}
                        </th>
                        <td className="text-end font-mono">
                          {nf.format(r.use)}
                        </td>
                        <td className="text-end font-mono">
                          {r.coverBefore === null
                            ? t("wholesaler.split.noUse")
                            : days.format(r.coverBefore)}
                        </td>
                        <td className="text-end font-mono font-medium">
                          {nf.format(r.boxes)}
                        </td>
                        <td className="text-end font-mono">
                          {r.coverAfter === null
                            ? t("wholesaler.split.noUse")
                            : days.format(r.coverAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <CoverChart
                rows={rows.map((r) => ({
                  code: r.code,
                  name: r.name,
                  before: r.coverBefore,
                  after: r.coverAfter,
                }))}
                maxDays={ALLOCATION_PARAMS.periodDays}
              />
            </div>
          </section>

          <section
            id="decision"
            aria-labelledby="decision-titre"
            className="panel flex scroll-mt-4 flex-col gap-4 p-5"
          >
            <h2 id="decision-titre" className="text-lg font-semibold text-ink">
              {t("wholesaler.split.decideTitle")}
            </h2>
            {saved === "applique" || saved === "ecart" ? (
              <p
                role="status"
                className="border-s-2 border-brand ps-3 font-medium text-ink"
              >
                {saved === "applique"
                  ? t("wholesaler.split.savedApplied")
                  : t("wholesaler.split.savedRejected")}
              </p>
            ) : null}
            <DecisionForm moleculeId={moleculeId} stock={stock} />
          </section>
        </>
      ) : null}

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
