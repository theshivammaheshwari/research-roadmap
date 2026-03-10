'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Paper } from '@/lib/types'

type SortKey = 'year' | 'citations' | 'title' | 'venue'
type SortDir = 'asc' | 'desc'
type ReadingStatus = 'none' | 'to-read' | 'reading' | 'done'

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

const STATUS_LABELS: Record<ReadingStatus, { label: string; color: string }> = {
  none: { label: '—', color: '' },
  'to-read': {
    label: '📋 To Read',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  reading: {
    label: '📖 Reading',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  done: {
    label: '✅ Done',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
}

function paperKey(p: Paper) {
  return p.doi || p.title.toLowerCase().slice(0, 60)
}

export default function PaperTable({ papers }: { papers: Paper[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('citations')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [catFilter, setCatFilter] = useState('all')
  const [oaFilter, setOaFilter] = useState('all')
  const [quartileFilter, setQuartileFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [citationId, setCitationId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [readingStatus, setReadingStatus] = useState<Record<string, ReadingStatus>>({})
  const [showBookmarked, setShowBookmarked] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  /* Load bookmarks & reading status from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rr_bookmarks')
      if (saved) setBookmarks(new Set(JSON.parse(saved)))
      const savedStatus = localStorage.getItem('rr_reading_status')
      if (savedStatus) setReadingStatus(JSON.parse(savedStatus))
    } catch { /* ignore */ }
  }, [])

  const saveBookmarks = useCallback((next: Set<string>) => {
    setBookmarks(next)
    localStorage.setItem('rr_bookmarks', JSON.stringify([...next]))
  }, [])

  const saveReadingStatus = useCallback((next: Record<string, ReadingStatus>) => {
    setReadingStatus(next)
    localStorage.setItem('rr_reading_status', JSON.stringify(next))
  }, [])

  const toggleBookmark = (p: Paper) => {
    const key = paperKey(p)
    const next = new Set(bookmarks)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    saveBookmarks(next)
  }

  const cycleStatus = (p: Paper) => {
    const key = paperKey(p)
    const order: ReadingStatus[] = ['none', 'to-read', 'reading', 'done']
    const cur = readingStatus[key] || 'none'
    const nextIdx = (order.indexOf(cur) + 1) % order.length
    saveReadingStatus({ ...readingStatus, [key]: order[nextIdx] })
  }

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
    if (quartileFilter !== 'all')
      list = list.filter((p) => p.sjrQuartile === quartileFilter)
    if (showBookmarked)
      list = list.filter((p) => bookmarks.has(paperKey(p)))
    if (statusFilter !== 'all')
      list = list.filter((p) => (readingStatus[paperKey(p)] || 'none') === statusFilter)
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
  }, [papers, catFilter, oaFilter, quartileFilter, search, sortKey, sortDir, showBookmarked, bookmarks, statusFilter, readingStatus])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  /* APA Citation */
  const generateAPA = (p: Paper) => {
    return `${p.authors} (${p.year}). ${p.title}. ${p.venue}${p.doi ? `. https://doi.org/${p.doi}` : ''}`
  }

  /* BibTeX Citation */
  const generateBibTeX = (p: Paper) => {
    const key = p.authors.split(' ')[0]?.toLowerCase() || 'unknown'
    return `@article{${key}${p.year},
  title     = {${p.title}},
  author    = {${p.authors}},
  journal   = {${p.venue}},
  year      = {${p.year}},
  doi       = {${p.doi || 'N/A'}},
  citations = {${p.citations}}
}`
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  /* CSV Export */
  const exportCSV = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    const hdr = [
      '#', 'Title', 'Authors', 'Journal', 'Year', 'Citations',
      'Category', 'SJR Score', 'SJR Quartile', 'Reading Status',
      'Bookmarked', 'Open Access', 'DOI Link', 'Sci-Hub Link', 'Free PDF',
    ]
    const rows = filtered.map((p, i) =>
      [
        i + 1, esc(p.title), esc(p.authors), esc(p.venue), p.year,
        p.citations, p.category, p.sjrScore || '', p.sjrQuartile || '',
        readingStatus[paperKey(p)] || 'none',
        bookmarks.has(paperKey(p)) ? 'Yes' : 'No',
        p.openAccess ? 'Yes' : 'No', p.doiLink, p.sciHubLink, p.oaUrl,
      ].join(','),
    )
    const csv = [hdr.join(','), ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'research_papers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  /* BibTeX Export */
  const exportBibTeX = () => {
    const bib = filtered.map((p) => generateBibTeX(p)).join('\n\n')
    const blob = new Blob([bib], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'references.bib'
    a.click()
    URL.revokeObjectURL(url)
  }

  /* Stats */
  const bookmarkCount = papers.filter((p) => bookmarks.has(paperKey(p))).length
  const doneCount = papers.filter((p) => readingStatus[paperKey(p)] === 'done').length
  const readingCount = papers.filter((p) => readingStatus[paperKey(p)] === 'reading').length

  return (
    <div>
      {/* Toolbar row 1 — filters */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
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
        <select
          value={quartileFilter}
          onChange={(e) => setQuartileFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        >
          <option value="all">All Quartiles</option>
          <option value="Q1">Q1 Only</option>
          <option value="Q2">Q2 Only</option>
          <option value="Q3">Q3 Only</option>
          <option value="Q4">Q4 Only</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        >
          <option value="all">All Status</option>
          <option value="to-read">📋 To Read</option>
          <option value="reading">📖 Reading</option>
          <option value="done">✅ Done</option>
        </select>
        <button
          onClick={() => setShowBookmarked(!showBookmarked)}
          className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
            showBookmarked
              ? 'bg-red-50 border-red-300 text-red-600 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          ❤️ Saved ({bookmarkCount})
        </button>
      </div>

      {/* Toolbar row 2 — stats & exports */}
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{filtered.length} papers</span>
          <span>•</span>
          <span>📖 {readingCount} reading</span>
          <span>•</span>
          <span>✅ {doneCount} done</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5"
          >
            📥 CSV
          </button>
          <button
            onClick={exportBibTeX}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5"
          >
            📄 BibTeX
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-left">
              <th className="px-3 py-3 font-semibold w-10">#</th>
              <th className="px-2 py-3 font-semibold w-8">❤️</th>
              <Th label="Title" k="title" cur={sortKey} dir={sortDir} onSort={toggleSort} />
              <th className="px-3 py-3 font-semibold whitespace-nowrap">Authors</th>
              <Th label="Journal" k="venue" cur={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Year" k="year" cur={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Cited" k="citations" cur={sortKey} dir={sortDir} onSort={toggleSort} />
              <th className="px-3 py-3 font-semibold">Category</th>
              <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">SJR</th>
              <th className="px-3 py-3 font-semibold text-center">Q</th>
              <th className="px-3 py-3 font-semibold text-center">Status</th>
              <th className="px-3 py-3 font-semibold text-center">OA</th>
              <th className="px-3 py-3 font-semibold text-center">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((p, i) => {
              const key = paperKey(p)
              const isBookmarked = bookmarks.has(key)
              const status = readingStatus[key] || 'none'
              const isExpanded = expandedId === key
              const showCite = citationId === key

              return (
                <PaperRow
                  key={key}
                  p={p}
                  i={i}
                  isBookmarked={isBookmarked}
                  status={status}
                  isExpanded={isExpanded}
                  showCite={showCite}
                  copiedId={copiedId}
                  pkey={key}
                  onToggleBookmark={() => toggleBookmark(p)}
                  onCycleStatus={() => cycleStatus(p)}
                  onToggleExpand={() => setExpandedId(isExpanded ? null : key)}
                  onToggleCite={() => setCitationId(showCite ? null : key)}
                  onCopyAPA={() => copyToClipboard(generateAPA(p), `apa-${key}`)}
                  onCopyBibTeX={() => copyToClipboard(generateBibTeX(p), `bib-${key}`)}
                  apa={generateAPA(p)}
                  bibtex={generateBibTeX(p)}
                />
              )
            })}
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

/* ================================================================== */
/*  PaperRow                                                           */
/* ================================================================== */
function PaperRow({
  p, i, isBookmarked, status, isExpanded, showCite, copiedId, pkey,
  onToggleBookmark, onCycleStatus, onToggleExpand, onToggleCite,
  onCopyAPA, onCopyBibTeX, apa, bibtex,
}: {
  p: Paper; i: number; isBookmarked: boolean; status: ReadingStatus
  isExpanded: boolean; showCite: boolean; copiedId: string | null; pkey: string
  onToggleBookmark: () => void; onCycleStatus: () => void
  onToggleExpand: () => void; onToggleCite: () => void
  onCopyAPA: () => void; onCopyBibTeX: () => void
  apa: string; bibtex: string
}) {
  const statusInfo = STATUS_LABELS[status]

  return (
    <>
      <tr className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition ${
        status === 'done' ? 'opacity-60' : ''
      }`}>
        <td className="px-3 py-3 text-slate-400 text-xs">{i + 1}</td>
        <td className="px-2 py-3">
          <button
            onClick={onToggleBookmark}
            className={`text-lg transition ${isBookmarked ? 'text-red-500 scale-110' : 'text-slate-300 dark:text-slate-600 hover:text-red-400'}`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark paper'}
          >
            {isBookmarked ? '❤️' : '🤍'}
          </button>
        </td>
        <td className="px-3 py-3 max-w-lg">
          <div>
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
              <span className="font-medium leading-snug" title={p.title}>
                {p.title}
              </span>
            )}
            <div className="flex gap-1 mt-1">
              {p.abstract && (
                <button
                  onClick={onToggleExpand}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                >
                  {isExpanded ? '▲ Hide' : '▼ Abstract'}
                </button>
              )}
              <button
                onClick={onToggleCite}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              >
                {showCite ? '✕ Close' : '📋 Cite'}
              </button>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap max-w-[160px] truncate">
          {p.authors}
        </td>
        <td className="px-3 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={p.venue}>
          {p.venue}
        </td>
        <td className="px-3 py-3 text-center whitespace-nowrap">{p.year}</td>
        <td className="px-3 py-3 text-center font-semibold">{p.citations}</td>
        <td className="px-3 py-3">
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${CAT_COLORS[p.category] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
            {p.category}
          </span>
        </td>
        <td className="px-3 py-3 text-center font-medium tabular-nums">
          {p.sjrScore > 0 ? p.sjrScore.toFixed(3) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-center">
          {p.sjrQuartile && p.sjrQuartile !== '-' ? (
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
              p.sjrQuartile === 'Q1' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : p.sjrQuartile === 'Q2' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : p.sjrQuartile === 'Q3' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {p.sjrQuartile}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-center">
          <button
            onClick={onCycleStatus}
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition whitespace-nowrap ${statusInfo.color || 'bg-slate-50 dark:bg-slate-700/50 text-slate-400'}`}
            title="Click to change status"
          >
            {statusInfo.label}
          </button>
        </td>
        <td className="px-3 py-3 text-center">
          {p.openAccess ? (
            <span className="text-green-600 dark:text-green-400 font-bold" title="Open Access">✓</span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600">✗</span>
          )}
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1 justify-center">
            {p.doiLink && (
              <a href={p.doiLink} target="_blank" rel="noopener noreferrer"
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800/50 transition">
                DOI
              </a>
            )}
            {p.sciHubLink && (
              <a href={p.sciHubLink} target="_blank" rel="noopener noreferrer"
                className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-800/50 transition">
                PDF
              </a>
            )}
            {p.oaUrl && (
              <a href={p.oaUrl} target="_blank" rel="noopener noreferrer"
                className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium hover:bg-green-200 dark:hover:bg-green-800/50 transition">
                Free
              </a>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded abstract */}
      {isExpanded && p.abstract && (
        <tr>
          <td colSpan={13} className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80">
            <div className="max-w-4xl">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Abstract
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {p.abstract}
              </p>
            </div>
          </td>
        </tr>
      )}

      {/* Citation panel */}
      {showCite && (
        <tr>
          <td colSpan={13} className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/10">
            <div className="max-w-4xl space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    APA Citation
                  </p>
                  <button onClick={onCopyAPA}
                    className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-800/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition">
                    {copiedId === `apa-${pkey}` ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                  {apa}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    BibTeX
                  </p>
                  <button onClick={onCopyBibTeX}
                    className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-800/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition">
                    {copiedId === `bib-${pkey}` ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <pre className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30 overflow-x-auto whitespace-pre-wrap">
                  {bibtex}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ---- Sortable column header ---- */
function Th({
  label, k, cur, dir, onSort,
}: {
  label: string; k: SortKey; cur: SortKey; dir: SortDir; onSort: (k: SortKey) => void
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
