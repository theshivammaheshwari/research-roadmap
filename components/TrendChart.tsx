'use client'

import { useMemo } from 'react'
import { Paper } from '@/lib/types'

export default function TrendChart({ papers }: { papers: Paper[] }) {
  const data = useMemo(() => {
    const counts: Record<number, { total: number; oa: number }> = {}
    for (const p of papers) {
      if (!p.year) continue
      if (!counts[p.year]) counts[p.year] = { total: 0, oa: 0 }
      counts[p.year].total++
      if (p.openAccess) counts[p.year].oa++
    }
    const years = Object.keys(counts)
      .map(Number)
      .sort((a, b) => a - b)
    const max = Math.max(...years.map((y) => counts[y].total), 1)
    return { years, counts, max }
  }, [papers])

  if (data.years.length < 2) return null

  return (
    <div className="max-w-6xl mx-auto px-4 mb-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
          <span>📊</span> Publication Trend
          <span className="ml-auto flex items-center gap-3 text-xs font-normal text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
              Total
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              Open Access
            </span>
          </span>
        </h3>

        <div className="flex items-end gap-1.5 h-32">
          {data.years.map((year) => {
            const d = data.counts[year]
            const height = (d.total / data.max) * 100
            const oaHeight = (d.oa / data.max) * 100
            return (
              <div
                key={year}
                className="flex-1 flex flex-col items-center gap-1 group"
              >
                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition font-medium">
                  {d.total}
                </span>
                <div className="w-full flex flex-col items-center relative">
                  <div
                    className="w-full bg-blue-500/20 dark:bg-blue-500/30 rounded-t relative overflow-hidden transition-all duration-500"
                    style={{ height: `${height}px` }}
                  >
                    <div
                      className="absolute bottom-0 w-full bg-blue-500 rounded-t"
                      style={{ height: `${oaHeight}px` }}
                    />
                    <div
                      className="absolute bottom-0 w-full bg-emerald-500 rounded-t opacity-70"
                      style={{ height: `${oaHeight}px` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {year}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
