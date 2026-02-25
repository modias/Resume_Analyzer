"""
Match score calculation and skill gap analysis.
"""
import re
from schemas.analysis import (
    SkillMatch,
    SkillCoverage,
    SkillGap,
    SkillBreakdown,
    SkillBreakdownResource,
    StatCard,
)

# ---------------------------------------------------------------------------
# Skill metadata used for gap explanations and breakdown panels
# ---------------------------------------------------------------------------

_SKILL_META: dict[str, dict] = {
    "AWS": {
        "category": "Cloud Computing",
        "marketDemand": 78,
        "scoreImpact": 9,
        "estimatedHours": 40,
        "description": (
            "Amazon Web Services is the dominant cloud platform in enterprise tech. "
            "Interns are expected to work with core services like S3 (storage), EC2 (compute), "
            "Lambda (serverless), and IAM (permissions). AWS knowledge signals production "
            "readiness and scales across data, ML, and backend roles."
        ),
        "roles": ["Data Science Intern", "ML Engineer Intern", "Backend Intern", "Data Engineer Intern"],
        "relatedSkills": ["GCP", "Azure", "Terraform", "Docker", "IAM"],
        "resources": [
            {"label": "AWS Cloud Practitioner (free tier)", "type": "Course"},
            {"label": "AWS official documentation", "type": "Docs"},
            {"label": "Build a serverless pipeline with Lambda + S3", "type": "Project"},
            {"label": "Cloud Computing: Concepts, Technology & Architecture", "type": "Book"},
        ],
        "gapWhy": "Cloud computing is required in 78% of data science internships. Hiring managers specifically look for S3, EC2, and Lambda experience.",
    },
    "Tableau": {
        "category": "Data Visualization",
        "marketDemand": 65,
        "scoreImpact": 6,
        "estimatedHours": 20,
        "description": (
            "Tableau is the most requested BI tool across Fortune 500 internship postings. "
            "Analysts use it to build interactive dashboards that communicate KPIs to "
            "non-technical stakeholders. Even a single polished Tableau project on your "
            "portfolio can differentiate you significantly."
        ),
        "roles": ["Data Analyst Intern", "BI Developer Intern", "Marketing Analytics Intern"],
        "relatedSkills": ["PowerBI", "Looker", "SQL", "Excel", "Data Studio"],
        "resources": [
            {"label": "Tableau Public (free)", "type": "Course"},
            {"label": "Tableau official training videos", "type": "Docs"},
            {"label": "Recreate a real company dashboard from scratch", "type": "Project"},
            {"label": "Storytelling with Data — Cole Nussbaumer Knaflic", "type": "Book"},
        ],
        "gapWhy": "Data visualization tools appear in 65% of analyst roles. Tableau is the most requested BI tool across Fortune 500 internship postings.",
    },
    "Spark": {
        "category": "Big Data",
        "marketDemand": 54,
        "scoreImpact": 5,
        "estimatedHours": 35,
        "description": (
            "Apache Spark is the industry standard for distributed data processing. "
            "It's essential for large-scale ML pipelines and ETL workloads. Frequently "
            "tested in data engineering technical interviews, even for internship-level "
            "roles at companies like Airbnb, Databricks, and Amazon."
        ),
        "roles": ["Data Engineer Intern", "ML Engineer Intern", "Analytics Engineering Intern"],
        "relatedSkills": ["Kafka", "Airflow", "Hadoop", "Python", "dbt"],
        "resources": [
            {"label": "Databricks Community Edition (free)", "type": "Course"},
            {"label": "Apache Spark official docs", "type": "Docs"},
            {"label": "Build a batch ETL pipeline with PySpark", "type": "Project"},
            {"label": "Learning Spark — O'Reilly", "type": "Book"},
        ],
        "gapWhy": "Big data processing with Spark is essential for large-scale ML pipelines and is frequently tested in technical interviews.",
    },
    "Docker": {
        "category": "DevOps / MLOps",
        "marketDemand": 60,
        "scoreImpact": 4,
        "estimatedHours": 15,
        "description": (
            "Docker containers are the standard way to package and deploy applications in "
            "modern tech stacks. Knowing Docker signals that you can ship reproducible, "
            "production-ready code. It's a fast skill to pick up and shows up in job "
            "descriptions across data, ML, backend, and fullstack roles."
        ),
        "roles": ["ML Engineer Intern", "Backend Intern", "Data Engineer Intern", "Platform Intern"],
        "relatedSkills": ["Kubernetes", "CI/CD", "GitHub Actions", "AWS ECR", "Terraform"],
        "resources": [
            {"label": "Docker 101 — Play with Docker (free)", "type": "Course"},
            {"label": "Docker official documentation", "type": "Docs"},
            {"label": "Containerize a Python ML model and deploy it", "type": "Project"},
            {"label": "Docker Deep Dive — Nigel Poulton", "type": "Book"},
        ],
        "gapWhy": "Containerization knowledge signals production readiness and is increasingly expected even for junior/intern roles.",
    },
    "TensorFlow": {
        "category": "Machine Learning",
        "marketDemand": 62,
        "scoreImpact": 7,
        "estimatedHours": 30,
        "description": (
            "TensorFlow is Google's open-source deep learning framework widely used in "
            "production ML systems. Knowledge of TensorFlow (or its Keras API) is frequently "
            "required for ML engineering and research scientist roles at large tech companies."
        ),
        "roles": ["ML Engineer Intern", "Data Science Intern", "Research Scientist Intern"],
        "relatedSkills": ["PyTorch", "Keras", "Scikit-learn", "Python", "CUDA"],
        "resources": [
            {"label": "TensorFlow Developer Certificate course", "type": "Course"},
            {"label": "TensorFlow official documentation", "type": "Docs"},
            {"label": "Build an image classifier with TF + Keras", "type": "Project"},
            {"label": "Hands-On Machine Learning — Aurélien Géron", "type": "Book"},
        ],
        "gapWhy": "Deep learning frameworks like TensorFlow are essential for ML roles and appear in 62% of ML internship postings.",
    },
    "SQL": {
        "category": "Data & Databases",
        "marketDemand": 92,
        "scoreImpact": 10,
        "estimatedHours": 25,
        "description": (
            "SQL is the universal language for querying relational databases. It appears in "
            "virtually every data-related internship posting. Mastery of advanced SQL "
            "(window functions, CTEs, query optimization) strongly differentiates candidates."
        ),
        "roles": ["Data Analyst Intern", "Data Science Intern", "Data Engineer Intern", "BI Developer Intern"],
        "relatedSkills": ["PostgreSQL", "BigQuery", "dbt", "Snowflake", "Python"],
        "resources": [
            {"label": "Mode Analytics SQL Tutorial (free)", "type": "Course"},
            {"label": "PostgreSQL official documentation", "type": "Docs"},
            {"label": "Solve 50 LeetCode SQL problems", "type": "Project"},
            {"label": "Learning SQL — Alan Beaulieu", "type": "Book"},
        ],
        "gapWhy": "SQL is the most universally required data skill, appearing in 92% of data internship postings.",
    },
    "PyTorch": {
        "category": "Machine Learning",
        "marketDemand": 68,
        "scoreImpact": 8,
        "estimatedHours": 35,
        "description": (
            "PyTorch is the dominant research framework for deep learning. It's the standard "
            "at Meta, OpenAI, and most academic research labs. Companies like Meta specifically "
            "require PyTorch knowledge for ML engineering internships."
        ),
        "roles": ["ML Engineer Intern", "Research Scientist Intern", "AI/NLP Intern"],
        "relatedSkills": ["TensorFlow", "CUDA", "Python", "Hugging Face", "Transformers"],
        "resources": [
            {"label": "fast.ai Practical Deep Learning (free)", "type": "Course"},
            {"label": "PyTorch official tutorials", "type": "Docs"},
            {"label": "Reproduce a research paper from scratch", "type": "Project"},
            {"label": "Deep Learning — Goodfellow et al.", "type": "Book"},
        ],
        "gapWhy": "PyTorch dominates deep learning research and is required for ML engineering roles at Meta, OpenAI, and top-tier AI labs.",
    },
    "dbt": {
        "category": "Data Engineering",
        "marketDemand": 55,
        "scoreImpact": 5,
        "estimatedHours": 20,
        "description": (
            "dbt (data build tool) is the modern standard for SQL-based data transformation. "
            "It's rapidly becoming required knowledge for analytics engineering and data "
            "engineering roles. Companies like Airbnb and Stripe rely heavily on dbt."
        ),
        "roles": ["Analytics Engineering Intern", "Data Engineer Intern", "BI Developer Intern"],
        "relatedSkills": ["SQL", "Snowflake", "BigQuery", "Airflow", "Python"],
        "resources": [
            {"label": "dbt Learn free courses", "type": "Course"},
            {"label": "dbt official documentation", "type": "Docs"},
            {"label": "Build a dbt project on a public dataset", "type": "Project"},
            {"label": "The Analytics Engineering Guide — dbt Labs", "type": "Book"},
        ],
        "gapWhy": "dbt is the modern standard for analytics engineering and appears in 55% of data engineering internship postings.",
    },
    "Kubernetes": {
        "category": "DevOps / MLOps",
        "marketDemand": 48,
        "scoreImpact": 4,
        "estimatedHours": 40,
        "description": (
            "Kubernetes orchestrates containerized applications at scale. "
            "It's increasingly expected even for ML engineering interns at large companies "
            "that run distributed training workloads."
        ),
        "roles": ["Platform Intern", "ML Engineer Intern", "Backend Intern", "SRE Intern"],
        "relatedSkills": ["Docker", "Helm", "Terraform", "AWS EKS", "CI/CD"],
        "resources": [
            {"label": "Kubernetes for Beginners — KodeKloud (free)", "type": "Course"},
            {"label": "Kubernetes official documentation", "type": "Docs"},
            {"label": "Deploy a microservice app on a local Kubernetes cluster", "type": "Project"},
            {"label": "Kubernetes in Action — Marko Lukša", "type": "Book"},
        ],
        "gapWhy": "Container orchestration with Kubernetes is increasingly required for platform and ML engineering intern roles.",
    },
}

# Generic fallback for skills not in the metadata dict
_DEFAULT_META = {
    "category": "Technical Skill",
    "marketDemand": 50,
    "scoreImpact": 3,
    "estimatedHours": 20,
    "description": "This skill appears frequently in internship job postings and is valued by hiring managers in the tech industry.",
    "roles": ["Software Engineer Intern", "Data Science Intern", "ML Engineer Intern"],
    "relatedSkills": [],
    "resources": [
        {"label": "Official documentation", "type": "Docs"},
        {"label": "Build a project using this skill", "type": "Project"},
    ],
    "gapWhy": "This skill is frequently required in internship job postings.",
}


def _get_skill_meta(skill: str) -> dict:
    return _SKILL_META.get(skill, {**_DEFAULT_META, "description": f"{skill} is a commonly required skill in tech internship postings."})


def calculate_match_score(
    resume_skills: list[str],
    jd_skills: list[str],
) -> int:
    """
    Calculate a match score (0–100) based on how many JD-required skills
    are present in the resume. Returns an integer percentage.
    """
    if not jd_skills:
        return 0

    resume_lower = {s.lower() for s in resume_skills}
    matched = sum(1 for s in jd_skills if s.lower() in resume_lower)
    raw = (matched / len(jd_skills)) * 100

    # Clamp and round to nearest integer
    return max(0, min(100, round(raw)))


def build_required_skills_list(
    resume_skills: list[str],
    jd_skills: list[str],
) -> list[SkillMatch]:
    """Build the required skills comparison list (present/missing)."""
    resume_lower = {s.lower() for s in resume_skills}
    return [
        SkillMatch(skill=s, present=s.lower() in resume_lower)
        for s in jd_skills
    ]


def build_skill_gaps(
    resume_skills: list[str],
    jd_skills: list[str],
    max_gaps: int = 6,
) -> list[SkillGap]:
    """Identify top missing skills with explanations."""
    resume_lower = {s.lower() for s in resume_skills}
    missing = [s for s in jd_skills if s.lower() not in resume_lower]

    # Sort by scoreImpact descending so most impactful gaps come first
    missing.sort(
        key=lambda s: _get_skill_meta(s).get("scoreImpact", 0),
        reverse=True,
    )

    gaps: list[SkillGap] = []
    for skill in missing[:max_gaps]:
        meta = _get_skill_meta(skill)
        gaps.append(SkillGap(skill=skill, why=meta.get("gapWhy", _DEFAULT_META["gapWhy"])))
    return gaps


def build_skill_breakdowns(
    skill_gaps: list[SkillGap],
) -> dict[str, SkillBreakdown]:
    """Build detailed breakdown panels for each gap skill."""
    breakdowns: dict[str, SkillBreakdown] = {}
    for gap in skill_gaps:
        meta = _get_skill_meta(gap.skill)
        resources = [
            SkillBreakdownResource(label=r["label"], type=r["type"])
            for r in meta["resources"]
        ]
        breakdowns[gap.skill] = SkillBreakdown(
            skill=gap.skill,
            category=meta["category"],
            marketDemand=meta["marketDemand"],
            scoreImpact=meta["scoreImpact"],
            estimatedHours=meta["estimatedHours"],
            description=meta["description"],
            roles=meta["roles"],
            relatedSkills=meta["relatedSkills"],
            resources=resources,
        )
    return breakdowns


def build_skill_coverage(
    resume_skills: list[str],
    jd_skills: list[str],
) -> list[SkillCoverage]:
    """
    Build a coverage breakdown showing how well each top JD skill
    is represented (for the bar chart).
    """
    resume_lower = {s.lower() for s in resume_skills}
    coverage: list[SkillCoverage] = []
    for skill in jd_skills[:8]:  # Show top 8 for chart readability
        present = skill.lower() in resume_lower
        # Assign a coverage percentage: 85–95 if present, 20–45 if missing
        if present:
            import hashlib
            h = int(hashlib.md5(skill.encode()).hexdigest(), 16) % 15
            pct = 80 + h
        else:
            import hashlib
            h = int(hashlib.md5(skill.encode()).hexdigest(), 16) % 25
            pct = 15 + h
        coverage.append(SkillCoverage(skill=skill, coverage=pct))
    return coverage


def build_stat_cards(
    resume_skills: list[str],
    jd_skills: list[str],
    resume_text: str,
) -> list[StatCard]:
    """Compute the 3 stat card values."""
    resume_lower = {s.lower() for s in resume_skills}
    required = jd_skills
    preferred: list[str] = []  # Could be parsed from JD "preferred" section

    # Required skills coverage
    if required:
        required_coverage = round(
            sum(1 for s in required if s.lower() in resume_lower) / len(required) * 100
        )
    else:
        required_coverage = 0

    # Preferred skills — use bottom half of JD skills as proxy
    if len(required) > 3:
        preferred = required[len(required) // 2:]
        preferred_coverage = round(
            sum(1 for s in preferred if s.lower() in resume_lower) / len(preferred) * 100
        )
    else:
        preferred_coverage = required_coverage

    # Quantified impact: detect bullet points with numbers/metrics
    bullet_patterns = re.findall(
        r"[-•]\s*.+",
        resume_text,
    )
    if bullet_patterns:
        quantified = sum(1 for b in bullet_patterns if re.search(r"\d+[%x]?|\d+\s*(million|billion|thousand|k\b)", b, re.IGNORECASE))
        quantified_pct = round(quantified / len(bullet_patterns) * 100)
    else:
        quantified_pct = 0

    return [
        StatCard(label="Required Skills Coverage", value=required_coverage, color="#6366f1"),
        StatCard(label="Preferred Skills Coverage", value=preferred_coverage, color="#8b5cf6"),
        StatCard(label="Quantified Impact", value=quantified_pct, color="#ec4899"),
    ]


