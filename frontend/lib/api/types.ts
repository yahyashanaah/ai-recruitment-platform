export interface CandidateProfile {
  candidate_id: string;
  file_name: string;
  name: string;
  phone_number: string;
  gmail: string;
  location: string;
  years_of_experience: number;
  skills: string[];
  education: string;
  current_position: string;
  certifications: string[];
  raw_profile: Record<string, unknown>;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  files_processed: number;
  total_chunks: number;
  processed_count: number;
  failed_count: number;
  candidates: CandidateProfile[];
  errors: string[];
}

export interface ChatAskPayload {
  question: string;
  top_k?: number;
}

export interface ChatSource {
  candidate_name: string;
  file_name: string;
  page_number: number;
}

export interface MatchJDRequest {
  job_description: string;
  top_n?: number;
}

export interface SmartJDRequest {
  role_brief: string;
  include_salary_suggestion?: boolean;
}

export interface ScoreBreakdown {
  skills_score: number;
  experience_score: number;
  education_score: number;
  certifications_score: number;
}

export interface SkillOverlapBreakdown {
  matched_required_skills: number;
  total_required_skills: number;
  overlap_percentage: number;
}

export interface MatchCandidate {
  candidate_name: string;
  phone_number: string;
  gmail: string;
  location: string;
  years_of_experience: number;
  skills_match: string[];
  missing_skills: string[];
  skill_overlap: SkillOverlapBreakdown;
  education: string;
  overall_score: number;
  reasoning: string;
  current_position: string;
  certifications: string[];
  score_breakdown: ScoreBreakdown;
}

export interface ParsedJD {
  required_skills: string[];
  nice_to_have_skills: string[];
  min_experience: number;
  education_required: string;
}

export interface SalarySuggestion {
  currency: string;
  min_amount: number | null;
  max_amount: number | null;
  period: string;
  rationale: string;
}

export interface SmartJDResponse {
  title: string;
  seniority: string;
  employment_type: string;
  role_summary: string;
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  matching_keywords: string[];
  min_experience: number;
  education_required: string;
  optimized_job_description: string;
  salary_suggestion: SalarySuggestion | null;
}

export interface MatchResponse {
  parsed_jd: ParsedJD;
  top_candidates: MatchCandidate[];
}

export interface DeleteCandidateResponse {
  candidate_id: string;
  deleted_from_sqlite: boolean;
  deleted_vectors: number;
}

export interface HealthResponse {
  status: string;
}

export interface ChatStreamHandlers {
  onToken: (text: string) => void;
  onSources: (sources: ChatSource[]) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}
