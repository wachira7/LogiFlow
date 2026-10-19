// src/components/shared/ExportButton.tsx
// Downloads rows as a CSV file (opens cleanly in Excel and Google Sheets).
'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type CsvColumn<T> = { header: string; value: (row: T) => string | number | null | undefined }

const cell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v)
  // Quote anything with commas, quotes or line breaks; neutralise spreadsheet formulas
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  return [columns.map((c) => cell(c.header)).join(','), ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(','))].join('\r\n')
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  // BOM so Excel reads UTF-8 names correctly
  const blob = new Blob(['﻿' + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton<T>({
  filename,
  rows,
  columns,
  label = 'Export CSV',
}: {
  filename: string
  rows: T[]
  columns: CsvColumn<T>[]
  label?: string
}) {
  return (
    <Button variant="outline" disabled={rows.length === 0} onClick={() => downloadCsv(filename, rows, columns)}>
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}
