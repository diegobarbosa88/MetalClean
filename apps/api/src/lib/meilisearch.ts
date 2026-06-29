import { MeiliSearch } from 'meilisearch'
import { config } from '../config.js'

export const meili = new MeiliSearch({
  host: config.meilisearch.host,
  apiKey: config.meilisearch.apiKey,
})

export const WORKERS_INDEX = 'workers'
export const JOBS_INDEX = 'jobs'

export async function setupMeilisearchIndexes() {
  // Workers index
  await meili.createIndex(WORKERS_INDEX, { primaryKey: 'id' }).catch(() => {})
  await meili.index(WORKERS_INDEX).updateSettings({
    searchableAttributes: ['fullName', 'headline', 'bio', 'locationCity', 'certificationStandards'],
    filterableAttributes: ['primarySpecialty', 'locationCountry', 'availabilityStatus', 'scoreAvg', 'yearsExperience', 'hasOwnTools'],
    sortableAttributes: ['scoreAvg', 'yearsExperience', 'reviewCount'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  })

  // Jobs index
  await meili.createIndex(JOBS_INDEX, { primaryKey: 'id' }).catch(() => {})
  await meili.index(JOBS_INDEX).updateSettings({
    searchableAttributes: ['title', 'description', 'projectName', 'workLocationCity', 'companyName'],
    filterableAttributes: ['specialtyRequired', 'workLocationCountry', 'housingIncluded', 'isFeatured', 'status', 'shiftPattern', 'materialTypes'],
    sortableAttributes: ['hourlyRateMin', 'publishedAt', 'viewCount'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  })
}

export function workerToDocument(worker: Record<string, unknown>) {
  return {
    id: worker['id'],
    fullName: worker['fullName'],
    slug: worker['slug'],
    headline: worker['headline'],
    bio: worker['bio'],
    avatarUrl: worker['avatarUrl'],
    primarySpecialty: worker['primarySpecialty'],
    secondarySpecialties: worker['secondarySpecialties'],
    locationCity: worker['locationCity'],
    locationCountry: worker['locationCountry'],
    availabilityStatus: worker['availabilityStatus'],
    yearsExperience: worker['yearsExperience'],
    scoreAvg: worker['scoreAvg'] ? Number(worker['scoreAvg']) : null,
    reviewCount: worker['reviewCount'],
    hasOwnTools: worker['hasOwnTools'],
    certificationStandards: Array.isArray(worker['certifications'])
      ? (worker['certifications'] as Array<{ standard: string }>).map((c) => c.standard)
      : [],
  }
}

export function jobToDocument(job: Record<string, unknown>) {
  const company = job['company'] as Record<string, unknown> | undefined
  return {
    id: job['id'],
    title: job['title'],
    slug: job['slug'],
    description: job['description'],
    projectName: job['projectName'],
    specialtyRequired: job['specialtyRequired'],
    workLocationCity: job['workLocationCity'],
    workLocationCountry: job['workLocationCountry'],
    hourlyRateMin: Number(job['hourlyRateMin']),
    hourlyRateMax: job['hourlyRateMax'] ? Number(job['hourlyRateMax']) : null,
    housingIncluded: job['housingIncluded'],
    transportIncluded: job['transportIncluded'],
    shiftPattern: job['shiftPattern'],
    materialTypes: job['materialTypes'],
    status: job['status'],
    isFeatured: job['isFeatured'] ?? false,
    publishedAt: job['publishedAt'],
    viewCount: job['viewCount'],
    companyName: company?.['companyName'],
    companySlug: company?.['slug'],
    companyLogoUrl: company?.['logoUrl'],
    companyScoreAvg: company?.['scoreAvg'] ? Number(company['scoreAvg']) : null,
  }
}
