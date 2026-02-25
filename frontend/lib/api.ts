const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Token storage ────────────────────────────────────────────────────────────

const TOKEN_KEY = "ii_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, ...rest } = options;
  const token = getToken();

  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string>),
  };

  if (!skipAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.detail ?? `Request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  school: string;
  major: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export async function register(
  name: string,
  email: string,
  password: string,
  school = "",
  major = ""
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, school, major }),
    skipAuth: true,
  });
  setToken(data.access_token);
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
  setToken(data.access_token);
  return data;
}

export function logout(): void {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export async function updateMe(updates: Partial<Pick<User, "name" | "school" | "major">>): Promise<User> {
  return apiFetch<User>("/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

// ─── Resume Analysis ──────────────────────────────────────────────────────────

export interface SkillMatch {
  skill: string;
  present: boolean;
}

export interface OptimizationSuggestion {
  original: string;
  suggested: string;
  reason: string;
}

export interface AnalyzeResponse {
  match_score: number;
  required_coverage: number;
  preferred_coverage: number;
  quantified_impact: number;
  extracted_skills: string[];
  required_skills: SkillMatch[];
  missing_skills: string[];
  suggestions: OptimizationSuggestion[];
}

export async function analyzeResume(
  resume: File,
  jobDescription: string,
  jobTitle = "",
  company = ""
): Promise<AnalyzeResponse> {
  const token = getToken();

  const formData = new FormData();
  formData.append("resume", resume);
  formData.append("job_description", jobDescription);
  formData.append("job_title", jobTitle);
  formData.append("company", company);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/resume/analyze`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? `Analysis failed (${response.status})`);
  }

  return response.json();
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  match_score: number;
  stat_cards: { label: string; value: number; color: string }[];
  skill_coverage: { skill: string; coverage: number }[];
  skill_gaps: { skill: string; why: string }[];
  total_analyses: number;
  callback_rate: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/dashboard/stats", { skipAuth: false });
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: number;
  company: string;
  role: string;
  match_score: number;
  demand_level: "High" | "Medium" | "Low";
  apply_priority: string;
  required_skills: string[];
  market_frequency: number;
  salary_estimate: string;
}

export async function getJobs(params?: {
  q?: string;
  demand?: string;
  min_score?: number;
}): Promise<Job[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.demand) qs.set("demand", params.demand);
  if (params?.min_score !== undefined) qs.set("min_score", String(params.min_score));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Job[]>(`/jobs${query}`);
}
