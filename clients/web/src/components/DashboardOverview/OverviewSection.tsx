"use client";

import { MetricGroup } from "@/app/(main)/dashboard/[organization]/(header)/analytics/metrics/components/MetricGroup";
import { Modal } from "@/components/Modal";
import { useMetrics } from "@/hooks/queries";
import { useChartRange } from "@/hooks/useChartRange";
import {
  ALL_METRICS,
  CHART_RANGES,
  ChartRange,
  DEFAULT_OVERVIEW_METRICS,
  getChartRangeParams,
} from "@/utils/metrics";
import { schemas } from "@/lib/api";
import { SegmentedControl } from "@/lib/orbit";
import Button from "@/components/atoms/Button";
import { Settings2 } from "lucide-react";
import React from "react";
import {
  MetricSelectorModalContent,
  useMetricSelectorModal,
} from "./MetricSelectorModal";

export { DEFAULT_OVERVIEW_METRICS };

interface OverviewSectionProps {
  organization: schemas["Organization"];
}

export function OverviewSection({ organization }: OverviewSectionProps) {
  const { range, setRange } = useChartRange(organization.id);
  const { isShown, show, hide } = useMetricSelectorModal();

  const initialMetrics = React.useMemo<(keyof schemas["Metrics"])[]>(() => {
    const stored = organization.feature_settings?.overview_metrics;
    if (stored?.length === 5) {
      return stored.filter((slug) =>
        ALL_METRICS.some((m) => m.slug === slug),
      ) as (keyof schemas["Metrics"])[];
    }
    return DEFAULT_OVERVIEW_METRICS;
  }, [organization.feature_settings?.overview_metrics]);

  const [activeMetrics, setActiveMetrics] =
    React.useState<(keyof schemas["Metrics"])[]>(initialMetrics);

  const [startDate, endDate, interval] = React.useMemo(
    () => getChartRangeParams(range, organization.created_at),
    [range, organization.created_at],
  );

  const { data, isLoading } = useMetrics({
    organization_id: organization.id,
    startDate,
    endDate,
    interval,
    metrics: activeMetrics,
  });

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-2xl font-medium text-[var(--text-primary)]">
          Overview
        </h2>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <label htmlFor="overview-range" className="sr-only">
            Overview date range
          </label>
          <select
            id="overview-range"
            value={range}
            onChange={(event) => setRange(event.target.value as ChartRange)}
            className="h-9 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-3 font-sans text-sm text-[var(--text-primary)] shadow-none focus:border-[var(--border-strong)] focus:ring-0 sm:hidden"
          >
            {(Object.entries(CHART_RANGES) as [ChartRange, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
          <SegmentedControl
            className="hidden min-w-0 sm:flex"
            options={(
              Object.entries(CHART_RANGES) as [ChartRange, string][]
            ).map(([value, label]) => ({ value, label }))}
            value={range}
            onChange={setRange}
          />
          <Button
            type="button"
            onClick={show}
            variant="secondary"
            size="sm"
            className="shrink-0"
            aria-label="Customize overview metrics"
            wrapperClassNames="gap-x-2"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Customize</span>
          </Button>
        </div>
      </div>
      <MetricGroup
        data={data}
        metricKeys={activeMetrics}
        interval={interval}
        loading={isLoading}
      />
      <Modal
        title="Customize Overview Metrics"
        isShown={isShown}
        hide={hide}
        modalContent={
          <MetricSelectorModalContent
            organization={organization}
            activeMetrics={activeMetrics}
            onSave={(slugs) => {
              setActiveMetrics(slugs);
              hide();
            }}
          />
        }
      />
    </div>
  );
}
