import { DataTable, DataTableColumnDef, ReactQueryLoading } from './DataTable'
import { DataTableColumnHeader } from './DataTableColumnHeader'

export { DataTable, DataTableColumnHeader }
export type { DataTableColumnDef, ReactQueryLoading }

// Re-export types from @tanstack/react-table for convenience
export type {
  PaginationState as DataTablePaginationState,
  SortingState as DataTableSortingState,
  OnChangeFn as DataTableOnChangeFn,
} from '@tanstack/react-table'
