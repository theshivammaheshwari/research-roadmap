export interface Paper {
  id: string
  title: string
  authors: string
  venue: string
  year: number
  citations: number
  doi: string
  doiLink: string
  sciHubLink: string
  openAccess: boolean
  oaUrl: string
  category: string
  sjrScore: number
  sjrQuartile: string
  abstract: string
}

export interface SearchResponse {
  papers: Paper[]
  totalFound: number
  query: string
  yearFrom: number
  yearTo: number
}
