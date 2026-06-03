import { formatHumanFriendlyScalar, formatPercentage } from '@/utils/formatters'
import { schemas } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { PropsWithChildren, useMemo } from 'react'
import { CustomerStatBox, CustomerStatBoxProps } from './CustomerStatBox'

export interface CustomerTrendStatBoxProps extends CustomerStatBoxProps {
  trend?: {
    value: number
    direction: 'up' | 'down' | 'none'
    previousValue: number
    metric: schemas['Metric']
  }
  period?: string
  trendUpIsBad?: boolean
  /** Currency for the previous-period tooltip's currency-typed metrics.
   *  Defaults to KES (Blyss platform default); pass the org's currency. */
  currency?: string
}

export const CustomerTrendStatBox = ({
  title,
  children,
  className,
  valueClassName,
  size = 'sm',
  trend,
  trendUpIsBad = false,
  currency = 'kes',
}: PropsWithChildren<CustomerTrendStatBoxProps>) => {
  const formatter = useMemo(() => {
    switch (trend?.metric.type) {
      case 'currency':
        return formatCurrency('compact')
      case 'scalar':
        return formatHumanFriendlyScalar
      case 'percentage':
        return formatPercentage
      case 'currency_sub_cent':
        return formatCurrency('subcent')
    }
  }, [trend])

  return (
    <CustomerStatBox
      title={title}
      className={className}
      valueClassName={valueClassName}
      size={size}
    >
      <div className="flex flex-col gap-2">
        <span>{children}</span>
        {trend ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1 text-sm ${
                    trend.direction === 'up'
                      ? trendUpIsBad
                        ? 'text-red-500'
                        : 'text-emerald-500'
                      : trend.direction === 'down'
                        ? trendUpIsBad
                          ? 'text-emerald-500'
                          : 'text-red-500'
                        : 'dark:text-polar-500 text-[var(--text-muted)]'
                  }`}
                >
                  {trend.direction === 'up' ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : trend.direction === 'down' ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : null}
                  <span>{Math.abs(trend.value).toFixed(1)}%</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col gap-1">
              <span className="dark:text-polar-500 font-sans text-sm text-[var(--text-muted)]">
                Previous Period
              </span>
              <span>{formatter?.(trend.previousValue, currency)}</span>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="h-5" />
        )}
      </div>
    </CustomerStatBox>
  )
}
