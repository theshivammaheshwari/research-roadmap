import { NextRequest, NextResponse } from 'next/server'

/* ------------------------------------------------------------------ */
/*  OpenAlex types                                                     */
/* ------------------------------------------------------------------ */
interface OAWork {
  id: string
  doi: string | null
  title: string | null
  publication_year: number | null
  cited_by_count: number
  authorships: { author: { display_name: string } }[]
  primary_location: {
    source: { id: string; display_name: string } | null
  } | null
  open_access: { is_oa: boolean; oa_url: string | null }
}

interface OASource {
  id: string
  display_name: string
  summary_stats: {
    '2yr_mean_citedness': number
    h_index: number
    i10_index: number
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function categorize(title: string): string {
  const t = title.toLowerCase()
  if (
    /\b(survey|review|systematic|overview|state[\s-]of[\s-]the[\s-]art|meta[\s-]?analysis|literature)\b/.test(
      t,
    )
  )
    return 'Survey / Review'
  if (
    /\b(explainabl|interpretab|xai|grad[\s-]?cam|shap\b|salienc|counterfactual|attention[\s-]?map|layer[\s-]?wise[\s-]?relevance)\b/.test(
      t,
    )
  )
    return 'Explainability'
  if (/\b(dataset|data[\s-]?set|corpus|data[\s-]?resource|benchmark[\s-]?data)\b/.test(t))
    return 'Dataset'
  if (
    /\b(benchmark|compari|comparative|evaluation[\s-]?of|reproducib|data[\s-]?leakage|ablation)\b/.test(
      t,
    )
  )
    return 'Benchmark'
  return 'Original Research'
}

function extractPaper(work: OAWork) {
  const doi = (work.doi || '').replace('https://doi.org/', '')
  const auths = work.authorships || []
  let authors = auths[0]?.author?.display_name || 'Unknown'
  if (auths.length > 1) authors += ' et al.'

  const title = (work.title || '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&#\d+;/g, '')

  return {
    id: work.id,
    title,
    authors,
    venue: work.primary_location?.source?.display_name || '',
    sourceId: work.primary_location?.source?.id || '',
    year: work.publication_year || 0,
    citations: work.cited_by_count || 0,
    doi,
    doiLink: doi ? `https://doi.org/${doi}` : '',
    sciHubLink: doi ? `https://sci-hub.se/${doi}` : '',
    openAccess: work.open_access?.is_oa || false,
    oaUrl: work.open_access?.oa_url || '',
    category: categorize(title),
    sjrScore: 0,
    sjrQuartile: '-',
  }
}

async function fetchSources(
  sourceIds: string[],
): Promise<Map<string, { score: number; quartile: string }>> {
  const map = new Map<string, { score: number; quartile: string }>()
  if (sourceIds.length === 0) return map

  /* OpenAlex allows filtering by pipe-separated IDs, max ~50 per request */
  const chunks: string[][] = []
  for (let i = 0; i < sourceIds.length; i += 50) {
    chunks.push(sourceIds.slice(i, i + 50))
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const ids = chunk.map((id) => id.replace('https://openalex.org/', '')).join('|')
      const url = `https://api.openalex.org/sources?filter=openalex:${ids}&per_page=50&mailto=research-roadmap@scholar.tools`
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 9000)
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timer)
        if (!res.ok) return
        const data = await res.json()
        for (const src of (data.results || []) as OASource[]) {
          const score = src.summary_stats?.['2yr_mean_citedness'] || 0
          const rounded = Math.round(score * 1000) / 1000
          let quartile = '-'
          if (rounded > 0) {
            if (rounded >= 3.0) quartile = 'Q1'
            else if (rounded >= 1.5) quartile = 'Q2'
            else if (rounded >= 0.5) quartile = 'Q3'
            else quartile = 'Q4'
          }
          map.set(src.id, { score: rounded, quartile })
        }
      } catch { /* timeout or network error — skip */ }
    }),
  )

  return map
}

async function fetchWorks(params: Record<string, string>): Promise<OAWork[]> {
  const url = new URL('https://api.openalex.org/works')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('mailto', 'research-roadmap@scholar.tools')

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 9000)
    const res = await fetch(url.toString(), { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []) as OAWork[]
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/search?q=...&yearFrom=...&yearTo=...                      */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get('q')?.trim()
  const yearFrom = searchParams.get('yearFrom') || '2020'
  const yearTo = searchParams.get('yearTo') || '2026'

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 },
    )
  }

  /* Build title-search keywords (strip special chars) */
  const titleWords = query
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 4)
    .join('+')

  const dateFilter = `from_publication_date:${yearFrom}-01-01,to_publication_date:${yearTo}-12-31`

  /* Six parallel search strategies for broad coverage */
  const [r1, r2, r3, r4, r5, r6] = await Promise.all([
    /* 1. Full-text search */
    fetchWorks({
      search: query,
      filter: dateFilter,
      sort: 'cited_by_count:desc',
      per_page: '50',
    }),
    /* 2. Title keyword search (more precise) */
    fetchWorks({
      filter: `title.search:${titleWords},${dateFilter}`,
      sort: 'cited_by_count:desc',
      per_page: '50',
    }),
    /* 3. Survey / Review */
    fetchWorks({
      search: `${query} survey review`,
      filter: dateFilter,
      sort: 'cited_by_count:desc',
      per_page: '25',
    }),
    /* 4. Benchmark / Comparison */
    fetchWorks({
      search: `${query} benchmark comparison evaluation`,
      filter: dateFilter,
      sort: 'cited_by_count:desc',
      per_page: '20',
    }),
    /* 5. Explainability / Interpretability */
    fetchWorks({
      search: `${query} explainable interpretable`,
      filter: dateFilter,
      sort: 'cited_by_count:desc',
      per_page: '20',
    }),
    /* 6. Dataset */
    fetchWorks({
      search: `${query} dataset`,
      filter: dateFilter,
      sort: 'cited_by_count:desc',
      per_page: '20',
    }),
  ])

  /* Deduplicate by DOI (or title) */
  const seen = new Set<string>()
  const papers: ReturnType<typeof extractPaper>[] = []

  for (const works of [r1, r2, r3, r4, r5, r6]) {
    for (const work of works) {
      const paper = extractPaper(work)
      if (!paper.title || paper.title.length < 10) continue
      const key = paper.doi || paper.title.toLowerCase().slice(0, 80)
      if (!seen.has(key)) {
        seen.add(key)
        papers.push(paper)
      }
    }
  }

  /* Sort by citations descending */
  papers.sort((a, b) => b.citations - a.citations)
  const top = papers.slice(0, 200)

  /* Fetch journal metrics for unique sources */
  const uniqueSourceIds = [...new Set(top.map((p) => p.sourceId).filter(Boolean))]
  const sourceMetrics = await fetchSources(uniqueSourceIds)

  /* Merge SJR-like scores into papers */
  for (const p of top) {
    if (p.sourceId && sourceMetrics.has(p.sourceId)) {
      const m = sourceMetrics.get(p.sourceId)!
      p.sjrScore = m.score
      p.sjrQuartile = m.quartile
    }
  }

  /* Remove internal sourceId before sending to client */
  const result = top.map(({ sourceId, ...rest }) => rest)

  return NextResponse.json({
    papers: result,
    totalFound: papers.length,
    query,
    yearFrom: parseInt(yearFrom),
    yearTo: parseInt(yearTo),
  })
}
