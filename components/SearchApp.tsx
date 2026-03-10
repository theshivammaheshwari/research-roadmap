'use client'

import { useState, useEffect, FormEvent } from 'react'
import PaperTable from './PaperTable'
import { Paper } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Popular research topics (shown before first search)                */
/* ------------------------------------------------------------------ */
const POPULAR_TOPICS = [
  'Alzheimer deep learning MRI',
  'Cancer detection machine learning',
  'Medical image segmentation deep learning',
  'NLP clinical text mining',
  'Drug discovery artificial intelligence',
  'Brain-computer interface deep learning',
  'Federated learning healthcare',
  'Protein structure prediction deep learning',
  'Autonomous driving perception',
  'Climate change machine learning',
  'Large language model evaluation',
  'Generative adversarial network medical imaging',
]

/* ================================================================== */
/*  SearchApp — main client component                                  */
/* ================================================================== */
export default function SearchApp() {
  const [query, setQuery] = useState('')
  const [yearFrom, setYearFrom] = useState(2020)
  const [yearTo, setYearTo] = useState(2025)
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [dark, setDark] = useState(false)

  /* ---- Theme ---- */
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  /* ---- Search ---- */
  const handleSearch = async (e?: FormEvent, overrideQuery?: string) => {
    e?.preventDefault()
    const q = overrideQuery || query
    if (!q.trim()) return

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        q: q.trim(),
        yearFrom: yearFrom.toString(),
        yearTo: yearTo.toString(),
      })
      const res = await fetch(`/api/search?${params}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setPapers(data.papers || [])
      setSearched(true)
    } catch {
      setError('Failed to search papers. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pickTopic = (topic: string) => {
    setQuery(topic)
    handleSearch(undefined, topic)
  }

  /* ---- Stats ---- */
  const total = papers.length
  const oaCount = papers.filter((p) => p.openAccess).length
  const cats = [...new Set(papers.map((p) => p.category))]
  const avgCit =
    total > 0
      ? Math.round(papers.reduce((s, p) => s + p.citations, 0) / total)
      : 0

  /* ---- Years for dropdown ---- */
  const years = Array.from({ length: 16 }, (_, i) => 2015 + i)

  /* ================================================================ */
  return (
    <div className="min-h-screen flex flex-col">
      {/* ---- Navbar ---- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 select-none">
            <span className="text-xl">📚</span>
            <span className="font-extrabold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Research Roadmap
            </span>
          </a>
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-lg"
            aria-label="Toggle theme"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* ---- Hero + Search ---- */}
      <section className="pt-14">
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 leading-tight">
              Smart Literature Review
            </h1>
            <p className="text-base md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Enter your research topic, select year range — get categorized
              papers with reading methodology, DOI links &amp; free PDF
              downloads.
            </p>

            <form
              onSubmit={handleSearch}
              className="max-w-3xl mx-auto space-y-4"
            >
              {/* Input row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g.  Alzheimer deep learning MRI"
                  className="flex-1 px-5 py-4 rounded-xl text-slate-900 bg-white shadow-lg text-base md:text-lg placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-300"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-bold rounded-xl shadow-lg transition text-base md:text-lg whitespace-nowrap"
                >
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                      Searching…
                    </span>
                  ) : (
                    '🔍 Search Papers'
                  )}
                </button>
              </div>

              {/* Year selectors */}
              <div className="flex flex-wrap justify-center gap-3">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <label className="text-sm text-blue-100">From</label>
                  <select
                    value={yearFrom}
                    onChange={(e) => setYearFrom(Number(e.target.value))}
                    className="bg-white/20 text-white rounded px-2 py-1 text-sm [&>option]:text-slate-900"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <label className="text-sm text-blue-100">To</label>
                  <select
                    value={yearTo}
                    onChange={(e) => setYearTo(Number(e.target.value))}
                    className="bg-white/20 text-white rounded px-2 py-1 text-sm [&>option]:text-slate-900"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ---- Popular Topics (pre-search) ---- */}
      {!searched && !loading && (
        <section className="py-12 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6">
              Popular Research Topics — click to search
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => pickTopic(topic)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition shadow-sm"
                >
                  {topic}
                </button>
              ))}
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-3 gap-6 mt-14 max-w-4xl mx-auto">
              {[
                {
                  icon: '🔍',
                  title: 'Smart Search',
                  desc: 'Searches 6 strategies in parallel for surveys, benchmarks, datasets & more.',
                },
                {
                  icon: '📖',
                  title: 'Reading Guide',
                  desc: '3-pass reading method with note-taking template built right in.',
                },
                {
                  icon: '📥',
                  title: 'Export & Links',
                  desc: 'CSV export, DOI links, Sci-Hub links, and Open Access PDFs.',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 text-center"
                >
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="font-bold mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- Error ---- */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
          </div>
        </div>
      )}

      {/* ---- Loading ---- */}
      {loading && (
        <div className="flex flex-col items-center py-20">
          <div className="w-14 h-14 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="mt-5 text-slate-500 dark:text-slate-400 text-sm">
            Searching across 250 M+ scholarly records…
          </p>
        </div>
      )}

      {/* ---- Results ---- */}
      {searched && !loading && (
        <section className="flex-1 pb-20">
          {/* Stats cards */}
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Papers Found',
                  value: total,
                  icon: '📄',
                },
                {
                  label: 'Open Access',
                  value: oaCount,
                  icon: '🔓',
                },
                {
                  label: 'Categories',
                  value: cats.length,
                  icon: '📁',
                },
                {
                  label: 'Avg Citations',
                  value: avgCit,
                  icon: '📈',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
                >
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reading guide */}
          <ReadingGuide />

          {/* Paper table */}
          <div className="max-w-[96rem] mx-auto px-4">
            <PaperTable papers={papers} />
          </div>
        </section>
      )}

      {/* ---- Footer ---- */}
      <footer className="mt-auto bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-medium">
            Built for PhD scholars &amp; researchers
          </p>
          <p>
            Powered by{' '}
            <a
              href="https://openalex.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              OpenAlex
            </a>{' '}
            — free, open scholarly data with 250 M+ works.
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ================================================================== */
/*  ReadingGuide — collapsible section                                 */
/* ================================================================== */
function ReadingGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="max-w-6xl mx-auto px-4 mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between text-left hover:shadow-md transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <div>
            <h3 className="font-bold text-lg">
              How to Read Research Papers
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              3-Pass method, note-taking template &amp; reading order
            </p>
          </div>
        </div>
        <span
          className={`text-xl transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="bg-white dark:bg-slate-800 rounded-b-xl p-6 md:p-8 border border-t-0 border-slate-100 dark:border-slate-700 -mt-2 shadow-sm space-y-8">
          {/* 3-pass method */}
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-3">
                🔍 Pass 1 — Survey (5 min)
              </h4>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <li>• Read title, abstract, introduction</li>
                <li>• Glance at all figures &amp; tables</li>
                <li>• Read the conclusion</li>
                <li>• Decide: read further or skip?</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-3">
                📝 Pass 2 — Understand (30 min)
              </h4>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <li>• Read methodology carefully</li>
                <li>• Understand the experimental setup</li>
                <li>• Note the results &amp; key metrics</li>
                <li>• Identify strengths &amp; weaknesses</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-3">
                🧠 Pass 3 — Master (2 hours)
              </h4>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <li>• Re-implement key ideas mentally</li>
                <li>• Challenge every assumption</li>
                <li>• Identify gaps &amp; future work</li>
                <li>• Write a one-paragraph summary</li>
              </ul>
            </div>
          </div>

          {/* Reading order */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-bold mb-4">
              📋 Recommended Reading Order
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              {[
                {
                  n: '1',
                  name: 'Survey Papers',
                  desc: 'Get the big picture',
                },
                {
                  n: '2',
                  name: 'Original Research',
                  desc: 'Core methods & models',
                },
                {
                  n: '3',
                  name: 'Benchmarks',
                  desc: 'What works best',
                },
                {
                  n: '4',
                  name: 'Datasets',
                  desc: 'Data sources',
                },
                {
                  n: '5',
                  name: 'Explainability',
                  desc: 'XAI & interpretation',
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3"
                >
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    Step {s.n}
                  </div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs">
                    {s.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note-taking template */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-bold mb-3">
              📝 Note-Taking Template (per paper)
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="space-y-1">
                <p>
                  <strong>Data + Preprocessing:</strong> What dataset? How
                  processed?
                </p>
                <p>
                  <strong>Methodology:</strong> Model / architecture used?
                </p>
                <p>
                  <strong>Results:</strong> Key metrics (accuracy, AUC, F1)?
                </p>
              </div>
              <div className="space-y-1">
                <p>
                  <strong>Summary:</strong> 2–3 sentence takeaway
                </p>
                <p>
                  <strong>Limitations:</strong> What&apos;s missing or weak?
                </p>
                <p>
                  <strong>Future Scope:</strong> What can be extended?
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
