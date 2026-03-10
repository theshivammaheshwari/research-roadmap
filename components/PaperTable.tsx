'use client'

import { useState, useMemo } from 'react'
import { Paper } from '@/lib/types'

type SortKey = 'year' | 'citations' | 'title' | 'venue'
type SortDir = 'asc' | 'desc'

const CAT_COLORS: Record<string, string> = {
  'Survey / Review':
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Original Research':
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Benchmark:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Dataset:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Explainability:
    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

export default function PaperTable({ papers }: { papers: Paper[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('citations')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [catFilter, setCatFilter] = useState('all')
  const [oaFilter, setOaFilter] = useState('all')
  const [search, setSearch] = useState('')

  const categories = useMemo(
    () => ['all', ...new Set(papers.map((p) => p.category))],
    [papers],
  )

  const filtered = useMemo(() => {
    let list = papers

    if (catFilter !== 'all')
      list = list.filter((p) => p.category === catFilter)
    if (oaFilter === 'oa') list = list.filter((p) => p.openAccess)
    else if (oaFilter === 'paid') list = list.filter((p) => !p.openAccess)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.authors.toLowerCase().includes(q) ||
          p.venue.toLowerCase().includes(q),
      )
    }

    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'citations':
          cmp = a.citations - b.citations
          break
        case 'year':
          cmp = a.year - b.year
          break
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'venue':
          cmp = a.venue.localeCompare(b.venue)
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [papers, catFilter, oaFilter, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  /* ---- CSV Export ---- */
  const exportCSV = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    const hdr = [
      '#',
      'Title',
      'Authors',
      'Journal',
      'Year',
      'Citations',
      'Category',
      'Open Access',
      'DOI Link',
      'Sci-Hub Link',
      'Free PDF',
    ]
    const rows = filtered.map((p, i) =>
      [
        i + 1,
        esc(p.title),
        esc(p.authors),
        esc(p.venue),
        p.year,
        p.citations,
        p.category,
        p.openAccess ? 'Yes' : 'No',
        p.doiLink,
        p.sciHubLink,
        p.oaUrl,
      ].join(','),
    )
    const csv = [hdr.join(','), ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'research_papers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ---- Render ---- */
  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter papers…"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>
          <select
            value={oaFilter}
            onChange={(e) => setOaFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="all">All Access</option>
            <option value="oa">Open Access Only</option>
            <option value="paid">Paid Only</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} papers
          </span>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5"
          >
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-left">
              <th className="px-3 py-3 font-semibold w-10">#</th>
              <Th
                label="Title"
                k="title"
                cur={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-3 py-3 font-semibold whitespace-nowrap">
                Authors
              </th>
              <Th
                label="Journal"
                k="venue"
                cur={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <Th
                label="Year"
                k="year"
                cur={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <Th
                label="Cited"
                k="citations"
                cur={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-3 py-3 font-semibold">Category</th>
              <th className="px-3 py-3 font-semibold text-center">OA</th>
              <th className="px-3 py-3 font-semibold text-center">
                Links
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((p, i) => (
              <tr
                key={p.doi || p.id || i}
                className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition"
              >
                <td className="px-3 py-3 text-slate-400 text-xs">
                  {i + 1}
                </td>
                <td className="px-3 py-3 max-w-lg">
                  {p.doiLink ? (
                    <a
                      href={p.doiLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-slate-900 dark:text-slate-100 leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition"
                      title={p.title}
                    >
                      {p.title}
                    </a>
                  ) : (
                    <span
                      className="font-medium leading-snug"
                      title={p.title}
                    >
                      {p.title}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap max-w-[160px] truncate">
                  {p.authors}
                </td>
                <td
                  className="px-3 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate"
                  title={p.venue}
                >
                  {p.venue}
                </td>
                <td className="px-3 py-3 text-center whitespace-nowrap">
                  {p.year}
                </td>
                <td className="px-3 py-3 text-center font-semibold">
                  {p.citations}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${CAT_COLORS[p.category] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                  >
                    {p.category}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {p.openAccess ? (
                    <span
                      className="text-green-600 dark:text-green-400 font-bold"
                      title="Open Access"
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">
                      ✗
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 justify-center">
                    {p.doiLink && (
                      <a
                        href={p.doiLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800/50 transition"
                      >
                        DOI
                      </a>
                    )}
                    {p.sciHubLink && (
                      <a
                        href={p.sciHubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-800/50 transition"
                      >
                        PDF
                      </a>
                    )}
                    {p.oaUrl && (
                      <a
                        href={p.oaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium hover:bg-green-200 dark:hover:bg-green-800/50 transition"
                      >
                        Free
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            No papers match your filters.
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Sortable column header ---- */
function Th({
  label,
  k,
  cur,
  dir,
  onSort,
}: {
  label: string
  k: SortKey
  cur: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
}) {
  return (
    <th
      className="px-3 py-3 font-semibold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition select-none whitespace-nowrap"
      onClick={() => onSort(k)}
    >
      {label}
      {cur === k && (
        <span className="ml-1 text-blue-500">
          {dir === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </th>
  )
}
