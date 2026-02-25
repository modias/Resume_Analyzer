// ─── Dashboard ───────────────────────────────────────────────────────────────

export const matchScore = 63;

export const statCards = [
  { label: "Required Skills Coverage", value: 70, color: "#6366f1" },
  { label: "Preferred Skills Coverage", value: 60, color: "#8b5cf6" },
  { label: "Quantified Impact", value: 40, color: "#ec4899" },
];

export const skillCoverageData = [
  { skill: "Python", coverage: 85 },
  { skill: "SQL", coverage: 70 },
  { skill: "Tableau", coverage: 45 },
  { skill: "AWS", coverage: 30 },
  { skill: "ML", coverage: 55 },
];

export const skillGaps = [
  {
    skill: "AWS",
    why: "Cloud computing is required in 78% of data science internships. Hiring managers specifically look for S3, EC2, and Lambda experience.",
  },
  {
    skill: "Tableau",
    why: "Data visualization tools appear in 65% of analyst roles. Tableau is the most requested BI tool across Fortune 500 internship postings.",
  },
  {
    skill: "Spark",
    why: "Big data processing with Spark is essential for large-scale ML pipelines and is frequently tested in technical interviews.",
  },
  {
    skill: "Docker",
    why: "Containerization knowledge signals production readiness and is increasingly expected even for junior/intern roles.",
  },
];

// ─── Analyze ─────────────────────────────────────────────────────────────────

export const extractedSkills = [
  "Python", "Pandas", "NumPy", "SQL", "Machine Learning",
  "Data Analysis", "Matplotlib", "Scikit-learn", "Git", "REST APIs",
];

export const requiredSkills = [
  { skill: "Python", present: true },
  { skill: "SQL", present: true },
  { skill: "AWS", present: false },
  { skill: "Tableau", present: false },
  { skill: "Spark", present: false },
  { skill: "Machine Learning", present: true },
  { skill: "Docker", present: false },
  { skill: "TensorFlow", present: false },
];

export const optimizationSuggestions = [
  {
    original: "Worked on data analysis projects using Python.",
    suggested: "Engineered 3 end-to-end data pipelines using Python (Pandas, NumPy), reducing data processing time by 40%.",
  },
  {
    original: "Created visualizations for the team.",
    suggested: "Designed 12 interactive dashboards in Matplotlib & Seaborn, surfacing KPIs that drove a 15% revenue increase.",
  },
  {
    original: "Helped with machine learning model.",
    suggested: "Collaborated in developing a gradient boosting classifier (scikit-learn) achieving 91% accuracy on a 500K-row dataset.",
  },
];

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type DemandLevel = "High" | "Medium" | "Low";
export type ApplyPriority = "🔥 Apply Now" | "⚡ Strong Fit" | "📌 Consider";

export interface Job {
  id: number;
  company: string;
  role: string;
  matchScore: number;
  demandLevel: DemandLevel;
  applyPriority: ApplyPriority;
  requiredSkills: string[];
  marketFrequency: number;
  salaryEstimate: string;
}

export const jobs: Job[] = [
  {
    id: 1,
    company: "Google",
    role: "Data Science Intern",
    matchScore: 82,
    demandLevel: "High",
    applyPriority: "🔥 Apply Now",
    requiredSkills: ["Python", "SQL", "ML", "BigQuery", "TensorFlow"],
    marketFrequency: 94,
    salaryEstimate: "$8,000 / mo",
  },
  {
    id: 2,
    company: "Meta",
    role: "ML Engineering Intern",
    matchScore: 74,
    demandLevel: "High",
    applyPriority: "⚡ Strong Fit",
    requiredSkills: ["PyTorch", "Python", "C++", "Distributed Systems", "SQL"],
    marketFrequency: 88,
    salaryEstimate: "$9,000 / mo",
  },
  {
    id: 3,
    company: "Stripe",
    role: "Data Analyst Intern",
    matchScore: 68,
    demandLevel: "Medium",
    applyPriority: "⚡ Strong Fit",
    requiredSkills: ["SQL", "Python", "Tableau", "Statistics", "A/B Testing"],
    marketFrequency: 72,
    salaryEstimate: "$7,200 / mo",
  },
  {
    id: 4,
    company: "Airbnb",
    role: "Analytics Engineering Intern",
    matchScore: 61,
    demandLevel: "Medium",
    applyPriority: "📌 Consider",
    requiredSkills: ["dbt", "SQL", "Python", "Spark", "Airflow"],
    marketFrequency: 65,
    salaryEstimate: "$7,500 / mo",
  },
  {
    id: 5,
    company: "Netflix",
    role: "Research Scientist Intern",
    matchScore: 55,
    demandLevel: "Low",
    applyPriority: "📌 Consider",
    requiredSkills: ["R", "Python", "Statistics", "Causal Inference", "SQL"],
    marketFrequency: 58,
    salaryEstimate: "$8,500 / mo",
  },
  {
    id: 6,
    company: "Amazon",
    role: "Business Intelligence Intern",
    matchScore: 79,
    demandLevel: "High",
    applyPriority: "🔥 Apply Now",
    requiredSkills: ["SQL", "Python", "QuickSight", "AWS", "ETL"],
    marketFrequency: 85,
    salaryEstimate: "$7,800 / mo",
  },
];

// ─── Strategy ─────────────────────────────────────────────────────────────────

export const applicationTimelineData = [
  { week: "Week 1", applications: 3, callbacks: 0 },
  { week: "Week 2", applications: 7, callbacks: 1 },
  { week: "Week 3", applications: 12, callbacks: 2 },
  { week: "Week 4", applications: 18, callbacks: 4 },
  { week: "Week 5", applications: 22, callbacks: 6 },
  { week: "Week 6", applications: 28, callbacks: 9 },
  { week: "Week 7", applications: 31, callbacks: 11 },
  { week: "Week 8", applications: 35, callbacks: 14 },
];

export const matchScoreBuckets = [
  { bucket: "< 50%", interviewRate: 4 },
  { bucket: "50–60%", interviewRate: 11 },
  { bucket: "60–70%", interviewRate: 22 },
  { bucket: "70–80%", interviewRate: 38 },
  { bucket: "> 80%", interviewRate: 61 },
];

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export const heatmapSkills = [
  "Python", "SQL", "R", "Tableau", "PowerBI", "AWS", "GCP", "Azure",
  "Spark", "Kafka", "Docker", "Kubernetes", "ML", "Deep Learning",
  "NLP", "Computer Vision", "Statistics", "A/B Testing", "dbt", "Airflow",
];

export const heatmapRoles = [
  "Data Science", "ML Engineer", "Data Analyst", "BI Developer", "Data Engineer",
];

export const heatmapData: Record<string, Record<string, number>> = {
  "Data Science": {
    Python: 95, SQL: 80, R: 55, Tableau: 40, PowerBI: 30, AWS: 60, GCP: 45, Azure: 40,
    Spark: 50, Kafka: 25, Docker: 45, Kubernetes: 30, ML: 90, "Deep Learning": 75,
    NLP: 65, "Computer Vision": 55, Statistics: 85, "A/B Testing": 70, dbt: 20, Airflow: 35,
  },
  "ML Engineer": {
    Python: 98, SQL: 55, R: 20, Tableau: 15, PowerBI: 10, AWS: 75, GCP: 65, Azure: 60,
    Spark: 70, Kafka: 50, Docker: 85, Kubernetes: 80, ML: 95, "Deep Learning": 90,
    NLP: 70, "Computer Vision": 75, Statistics: 65, "A/B Testing": 40, dbt: 15, Airflow: 60,
  },
  "Data Analyst": {
    Python: 70, SQL: 95, R: 50, Tableau: 85, PowerBI: 80, AWS: 35, GCP: 25, Azure: 30,
    Spark: 25, Kafka: 10, Docker: 20, Kubernetes: 10, ML: 45, "Deep Learning": 20,
    NLP: 25, "Computer Vision": 10, Statistics: 80, "A/B Testing": 75, dbt: 40, Airflow: 30,
  },
  "BI Developer": {
    Python: 50, SQL: 90, R: 30, Tableau: 95, PowerBI: 98, AWS: 40, GCP: 30, Azure: 45,
    Spark: 20, Kafka: 10, Docker: 15, Kubernetes: 10, ML: 30, "Deep Learning": 10,
    NLP: 15, "Computer Vision": 5, Statistics: 60, "A/B Testing": 55, dbt: 50, Airflow: 25,
  },
  "Data Engineer": {
    Python: 85, SQL: 88, R: 15, Tableau: 25, PowerBI: 20, AWS: 82, GCP: 72, Azure: 68,
    Spark: 92, Kafka: 88, Docker: 90, Kubernetes: 85, ML: 40, "Deep Learning": 25,
    NLP: 20, "Computer Vision": 15, Statistics: 45, "A/B Testing": 30, dbt: 85, Airflow: 90,
  },
};
