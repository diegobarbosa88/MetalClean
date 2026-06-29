// ─── Enums ────────────────────────────────────────────────────────────────────

export type AccountType = 'worker' | 'company' | 'admin'

export type WorkerSpecialty =
  | 'tig_welder'
  | 'mig_mag_welder'
  | 'electrode_welder'
  | 'boilermaker'
  | 'pipe_fitter'
  | 'structural_fitter'
  | 'cnc_operator'
  | 'other'

export type AvailabilityStatus = 'available' | 'working' | 'not_looking'

export type ContractPreference = 'subcontract' | 'permanent' | 'both'

export type CompanyType =
  | 'main_contractor'
  | 'subcontractor'
  | 'both'
  | 'temp_agency'
  | 'epc'

export type EmployeeCountRange = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

export type IndustrySector =
  | 'oil_gas'
  | 'petrochemical'
  | 'shipbuilding'
  | 'civil'
  | 'energy'
  | 'food_beverage'
  | 'pharma'
  | 'other'

export type JobStatus = 'draft' | 'published' | 'paused' | 'filled' | 'cancelled' | 'expired'

export type ShiftPattern = 'day' | 'night' | 'rotating' | 'offshore'

export type HousingQuality = 'shared_room' | 'single_room' | 'apartment' | 'hotel'

export type MaterialType =
  | 'carbon_steel'
  | 'stainless'
  | 'duplex'
  | 'aluminium'
  | 'titanium'
  | 'inconel'
  | 'other'

export type ApplicationStatus =
  | 'pending'
  | 'viewed'
  | 'shortlisted'
  | 'rejected'
  | 'withdrawn'
  | 'matched'

export type MatchStatus =
  | 'pending_worker'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type ReviewStatus = 'submitted' | 'published' | 'under_review' | 'removed' | 'appealed'

export type ReviewerType = 'company' | 'worker'

export type PostType = 'general' | 'portfolio_work' | 'job_update' | 'news' | 'certification'

export type PostVisibility = 'public' | 'connections' | 'private'

export type ModerationStatus = 'ok' | 'under_review' | 'removed'

export type ReportTargetType = 'review' | 'post' | 'comment' | 'profile' | 'message'

export type ReportReason =
  | 'defamation'
  | 'false_information'
  | 'harassment'
  | 'spam'
  | 'inappropriate_content'
  | 'other'

export type ReportStatus =
  | 'pending'
  | 'under_review'
  | 'resolved_kept'
  | 'resolved_removed'
  | 'escalated'

// ─── Base Entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  phone: string | null
  accountType: AccountType
  isVerified: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export interface WorkerCertification {
  id: string
  workerId: string
  standard: string
  processCode: string | null
  materialGroup: string | null
  position: string | null
  issuedBy: string
  issueDate: string
  expiryDate: string | null
  certificateUrl: string | null
  isVerified: boolean
  createdAt: string
}

export interface WorkerProfile {
  id: string
  userId: string
  fullName: string
  slug: string
  avatarUrl: string | null
  coverUrl: string | null
  headline: string | null
  bio: string | null
  locationCity: string | null
  locationCountry: string
  nationality: string | null
  birthYear: number | null
  primarySpecialty: WorkerSpecialty
  secondarySpecialties: WorkerSpecialty[]
  yearsExperience: number | null
  availabilityStatus: AvailabilityStatus
  availableFrom: string | null
  preferredContractType: ContractPreference | null
  desiredHourlyRateMin: number | null
  desiredHourlyRateMax: number | null
  willingToRelocate: boolean
  preferredLocations: string[]
  hasOwnTools: boolean
  equipmentList: string[]
  reviewCount: number
  scoreAvg: number | null
  certifications?: WorkerCertification[]
  createdAt: string
  updatedAt: string
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface CompanyProfile {
  id: string
  userId: string
  companyName: string
  slug: string
  logoUrl: string | null
  coverUrl: string | null
  bio: string | null
  taxId: string | null
  taxIdVerified: boolean
  foundedYear: number | null
  employeeCountRange: EmployeeCountRange | null
  companyType: CompanyType | null
  sectors: IndustrySector[]
  locationAddress: string | null
  locationCity: string
  locationCountry: string
  website: string | null
  linkedinUrl: string | null
  currentProjectsSummary: string | null
  reviewCount: number
  scoreAvg: number | null
  createdAt: string
  updatedAt: string
}

// ─── Job Posting ──────────────────────────────────────────────────────────────

export interface RequiredCertification {
  standard: string
  processCode?: string
  materialGroup?: string
}

export interface JobPosting {
  id: string
  companyId: string
  company?: Pick<CompanyProfile, 'companyName' | 'slug' | 'logoUrl' | 'scoreAvg' | 'locationCity'>
  title: string
  slug: string
  description: string
  specialtyRequired: WorkerSpecialty
  specialtiesAccepted: WorkerSpecialty[]
  requiredCertifications: RequiredCertification[]
  minYearsExperience: number | null
  ownToolsRequired: boolean
  hourlyRateMin: number
  hourlyRateMax: number | null
  currency: string
  rateIncludesTax: boolean
  subsidenceDaily: number | null
  housingIncluded: boolean
  housingQuality: HousingQuality | null
  transportIncluded: boolean
  projectName: string | null
  workLocationCity: string
  workLocationCountry: string
  startDate: string | null
  estimatedDurationWeeks: number | null
  shiftPattern: ShiftPattern | null
  materialTypes: MaterialType[]
  status: JobStatus
  publishedAt: string | null
  expiresAt: string | null
  viewCount: number
  applicationCount: number
  createdAt: string
  updatedAt: string
}

// ─── Application ──────────────────────────────────────────────────────────────

export interface JobApplication {
  id: string
  jobId: string
  job?: Pick<JobPosting, 'title' | 'slug' | 'hourlyRateMin' | 'workLocationCity'>
  workerId: string
  worker?: Pick<WorkerProfile, 'fullName' | 'slug' | 'avatarUrl' | 'primarySpecialty' | 'scoreAvg'>
  coverNote: string | null
  proposedRate: number | null
  status: ApplicationStatus
  appliedAt: string
  updatedAt: string
}

// ─── Match ────────────────────────────────────────────────────────────────────

export interface Match {
  id: string
  jobId: string | null
  applicationId: string | null
  companyId: string
  company?: Pick<CompanyProfile, 'companyName' | 'slug' | 'logoUrl'>
  workerId: string
  worker?: Pick<WorkerProfile, 'fullName' | 'slug' | 'avatarUrl'>
  confirmedHourlyRate: number
  currency: string
  workLocationCity: string
  workLocationCountry: string
  startDate: string | null
  endDate: string | null
  actualEndDate: string | null
  housingIncluded: boolean
  status: MatchStatus
  confirmedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  companyCanReviewUntil: string | null
  workerCanReviewUntil: string | null
  createdAt: string
  updatedAt: string
}

// ─── Review ───────────────────────────────────────────────────────────────────

export interface WorkerReviewScores {
  scoreAttendance: number
  scoreTechnicalQuality: number
  scoreSafetyCompliance: number
  scoreAttitudeTeamwork: number
}

export interface CompanyReviewScores {
  scorePaymentPunctuality: number
  scoreRateCompliance: number
  scoreSafetyConditions: number
  scoreHousingAllowances: number | null
}

export interface Review {
  id: string
  matchId: string
  reviewerUserId: string
  revieweeUserId: string
  reviewerType: ReviewerType
  scores: WorkerReviewScores | CompanyReviewScores
  writtenReview: string | null
  overallScore: number
  isVisible: boolean
  status: ReviewStatus
  responseText: string | null
  responseAt: string | null
  submittedAt: string
  updatedAt: string
}

// ─── Post & Feed ──────────────────────────────────────────────────────────────

export interface PostMedia {
  type: 'image' | 'video'
  url: string
  thumbnailUrl: string | null
  caption: string | null
}

export interface Post {
  id: string
  authorUserId: string
  authorType: 'worker' | 'company'
  author?: Pick<WorkerProfile, 'fullName' | 'slug' | 'avatarUrl'> | Pick<CompanyProfile, 'companyName' | 'slug' | 'logoUrl'>
  contentText: string | null
  postType: PostType
  media: PostMedia[]
  likeCount: number
  commentCount: number
  visibility: PostVisibility
  moderationStatus: ModerationStatus
  isLikedByCurrentUser?: boolean
  createdAt: string
  updatedAt: string
}

export interface PostComment {
  id: string
  postId: string
  authorUserId: string
  author?: Pick<WorkerProfile, 'fullName' | 'slug' | 'avatarUrl'>
  parentId: string | null
  content: string
  moderationStatus: ModerationStatus
  createdAt: string
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  participantA: string
  participantB: string
  otherParticipant?: Pick<WorkerProfile | CompanyProfile, 'slug'> & { displayName: string; avatarUrl: string | null }
  lastMessageAt: string | null
  lastMessagePreview: string | null
  unreadCount?: number
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  attachmentUrl: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_application'
  | 'application_status_changed'
  | 'match_invite'
  | 'match_accepted'
  | 'match_completed'
  | 'review_eligible'
  | 'review_received'
  | 'review_response'
  | 'moderation_resolved'
  | 'message_received'
  | 'certification_expiring'

export interface NotificationData {
  entityType?: ReportTargetType | 'match' | 'application' | 'job'
  entityId?: string
  deepLink?: string
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  data: NotificationData
  isRead: boolean
  readAt: string | null
  createdAt: string
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface CursorPaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthSession {
  user: User
  tokens: AuthTokens
}
