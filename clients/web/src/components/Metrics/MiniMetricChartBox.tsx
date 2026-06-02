import { formatHumanFriendlyScalar } from '@/utils/formatters'
import { schemas } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/atoms/Card'

export interface MiniMetricBoxProps {
  title?: string
  metric?: schemas['Metric'] | null
  value?: number | null
  /** Currency to format `currency`-typed metrics in. Defaults to KES (the
   *  Blyss platform default per backend `DEFAULT_CURRENCY`); pass the org's
   *  default_presentment_currency from the calling page. */
  currency?: string
}

export const MiniMetricChartBox = ({
  title,
  metric,
  value,
  currency = 'kes',
}: MiniMetricBoxProps) => {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <span className="dark:text-polar-500 text-gray-500">
          {title ?? metric?.display_name}
        </span>
      </CardHeader>
      <CardContent>
        <h3 className="text-2xl">
          {metric &&
            (metric.type === 'scalar'
              ? formatHumanFriendlyScalar(value ?? 0)
              : formatCurrency('statistics')(value ?? 0, currency))}
        </h3>
      </CardContent>
    </Card>
  )
}
