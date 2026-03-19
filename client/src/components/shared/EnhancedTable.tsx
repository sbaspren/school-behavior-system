import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';

/* ─── Types ─── */

export interface EnhancedTableColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  enableSorting?: boolean;
  size?: number;
}

export interface EnhancedTableProps<T> {
  data: T[];
  columns: EnhancedTableColumn<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  sectionColor?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

/* ─── Component ─── */

function EnhancedTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchPlaceholder = 'بحث...',
  emptyIcon = 'search_off',
  emptyTitle = 'لا توجد بيانات',
  emptyDescription,
  sectionColor = '#4f46e5',
  onRowClick,
  className,
}: EnhancedTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  /* Map our simple column defs to tanstack ColumnDefs */
  const tanstackColumns = useMemo<ColumnDef<T, any>[]>(
    () =>
      columns.map((col) => ({
        id: col.id,
        accessorKey: col.accessorKey as string | undefined,
        header: col.header,
        cell: col.cell
          ? (info: any) => col.cell!(info.row.original)
          : (info: any) => info.getValue?.() ?? '',
        enableSorting: col.enableSorting !== false,
        size: col.size,
      })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="spinner" />
        <p style={{ marginTop: '12px', color: '#666' }}>جاري التحميل...</p>
      </div>
    );
  }

  /* ─── Sort indicator ─── */
  const sortIcon = (columnId: string) => {
    const sortEntry = sorting.find((s) => s.id === columnId);
    if (!sortEntry) {
      return (
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 14, opacity: 0.3, verticalAlign: 'middle', marginRight: 2 }}
        >
          unfold_more
        </span>
      );
    }
    return (
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 2 }}
      >
        {sortEntry.desc ? 'expand_more' : 'expand_less'}
      </span>
    );
  };

  const visibleRows = table.getRowModel().rows;

  return (
    <div className={className} style={{ direction: 'rtl' }}>
      {/* Search bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 18,
              color: '#9ca3af',
              pointerEvents: 'none',
            }}
          >
            search
          </span>
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: '100%',
              height: 38,
              padding: '0 12px 0 12px',
              paddingRight: 38,
              border: '2px solid #d1d5db',
              borderRadius: 12,
              fontSize: 14,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = sectionColor;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          />
        </div>
      </div>

      {/* Table wrapper — matches DataTable outer container */}
      <div
        style={{
          overflowX: 'auto',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #f0f2f7',
          boxShadow: '0 1px 3px rgba(0,0,0,.05)',
        }}
      >
        {/* Empty state (after filtering or truly empty) */}
        {visibleRows.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 72, color: '#d1d5db' }}
              >
                {emptyIcon}
              </span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>
              {emptyTitle}
            </h3>
            {emptyDescription && (
              <p style={{ fontSize: 14, color: '#9ca3af' }}>{emptyDescription}</p>
            )}
          </div>
        ) : (
          <table
            className="data-table"
            style={
              {
                '--sec-clr': sectionColor,
              } as React.CSSProperties
            }
          >
            <thead>
              <tr>
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        style={{
                          cursor: canSort ? 'pointer' : 'default',
                          userSelect: 'none',
                          width: header.column.columnDef.size || undefined,
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && sortIcon(header.id)}
                        </span>
                      </th>
                    );
                  }),
                )}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  style={{
                    cursor: onRowClick ? 'pointer' : undefined,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Row count footer */}
      {visibleRows.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 4px',
            fontSize: 12,
            color: '#9ca3af',
            marginTop: 4,
          }}
        >
          <span>
            {globalFilter
              ? `${visibleRows.length} من ${data.length} نتيجة`
              : `${data.length} عنصر`}
          </span>
        </div>
      )}
    </div>
  );
}

export default EnhancedTable;
