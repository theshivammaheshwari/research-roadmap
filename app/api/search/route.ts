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
  primary_location: { source: { display_name: string } | null } | null
  open_access: { is_oa: boolean; oa_url: string | null }
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
    year: work.publication_year || 0,
    citations: work.cited_by_count || 0,
    doi,
    doiLink: doi ? `https://doi.org/${doi}` : '',
    sciHubLink: doi ? `https://sci-hub.se/${doi}` : '',
    openAccess: work.open_access?.is_oa || false,
    oaUrl: work.open_access?.oa_url || '',
    category: categorize(title),
  }
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

  return NextResponse.json({
    papers: papers.slice(0, 200),
    totalFound: papers.length,
    query,
    yearFrom: parseInt(yearFrom),
    yearTo: parseInt(yearTo),
  })
}
