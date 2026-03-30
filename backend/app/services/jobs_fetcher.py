"""
Fetch real internship listings from JSearch (RapidAPI).
JSearch aggregates jobs from LinkedIn, Indeed, Glassdoor and others.

If RAPIDAPI_KEY is missing or JSearch fails, we fall back to a public
job-board API so users still get live jobs instead of mock-only data.

Caching: results are cached in-memory for CACHE_TTL_SECONDS per unique query
so repeated page loads don't burn API quota.
"""

from __future__ import annotations

import logging
import re
import time
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"
_HOST = "jsearch.p.rapidapi.com"
_PUBLIC_JOBS_URL = "https://www.arbeitnow.com/api/job-board-api"

# Cache: { query_key -> (timestamp, results) }
_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
CACHE_TTL_SECONDS = 600  # 10 minutes

# Common tech skills used for match scoring
_SKILL_TOKENS = {
    s.lower() for s in [
        "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
        "swift", "kotlin", "ruby", "php", "scala", "r", "matlab", "sql", "bash",
        "react", "vue", "angular", "next.js", "node.js", "django", "flask", "fastapi",
        "spring", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
        "spark", "hadoop", "kafka", "airflow", "dbt", "tableau", "power bi",
        "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "linux",
        "git", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
        "machine learning", "deep learning", "nlp", "computer vision",
        "data analysis", "statistics", "a/b testing", "etl",
    ]
}


def _extract_skills(text: str) -> list[str]:
    """Pull recognized skill tokens out of free-form job text."""
    lower = text.lower()
    found: list[str] = []
    for skill in _SKILL_TOKENS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, lower):
            found.append(skill.title() if len(skill) <= 4 else skill.capitalize())
    return sorted(set(found))[:10]


def _match_score(user_skills: list[str], job_skills: list[str]) -> int:
    """Percentage of job skills the user already has."""
    if not job_skills:
        return 50
    user_lower = {s.lower() for s in user_skills}
    job_lower = {s.lower() for s in job_skills}
    matched = len(user_lower & job_lower)
    return min(100, max(10, round(matched / len(job_lower) * 100)))


def _demand_level(applicant_count: int | None) -> str:
    if applicant_count is None:
        return "Medium"
    if applicant_count >= 200:
        return "High"
    if applicant_count >= 50:
        return "Medium"
    return "Low"


def _apply_priority(score: int) -> str:
    if score >= 75:
        return "🔥 Apply Now"
    if score >= 55:
        return "⚡ Strong Fit"
    return "📌 Consider"


def _salary_str(job: dict[str, Any]) -> str:
    lo = job.get("job_min_salary")
    hi = job.get("job_max_salary")
    period = (job.get("job_salary_period") or "").upper()
    if lo and hi:
        if period == "MONTH":
            return f"${int(lo):,} – ${int(hi):,} / mo"
        if period == "YEAR":
            return f"${int(lo/1000)}k – ${int(hi/1000)}k / yr"
    if lo:
        return f"${int(lo):,}+"
    return "N/A"


def _strip_html(value: str) -> str:
    return re.sub(r"<[^>]+>", " ", value or "")


def _location_matches(user_location: str, job_location: str) -> bool:
    """
    Loose location matching to avoid false negatives from formatting differences.
    Examples:
      "New York, NY" should match "New York, New York, United States"
      "San Francisco" should match "San Francisco Bay Area"
    """
    u = (user_location or "").strip().lower()
    j = (job_location or "").strip().lower()
    if not u:
        return True
    if not j:
        return False
    if u in j:
        return True

    # Token overlap fallback (ignore very short tokens and punctuation)
    user_tokens = [t for t in re.split(r"[^a-z0-9]+", u) if len(t) >= 2]
    if not user_tokens:
        return True
    overlap = sum(1 for t in user_tokens if t in j)
    # Match when at least half of meaningful tokens are present.
    return overlap >= max(1, len(user_tokens) // 2)


def _map_public_job(raw_job: dict[str, Any]) -> dict[str, Any]:
    text_parts = [
        raw_job.get("title") or "",
        raw_job.get("description") or "",
        " ".join(raw_job.get("tags") or []),
    ]
    merged_text = _strip_html(" ".join(text_parts))
    job_skills = _extract_skills(merged_text)
    return {
        "_job_skills": job_skills,
        "company": raw_job.get("company_name") or "Unknown",
        "role": raw_job.get("title") or "Internship",
        "demand_level": "Medium",
        "required_skills": job_skills[:8],
        "market_frequency": 70,
        "salary_estimate": "N/A",
        "apply_link": raw_job.get("url") or "",
        "location": raw_job.get("location") or "",
        "employer_logo": "",
        "posted_at": raw_job.get("created_at") or "",
    }


async def _fetch_public_jobs(
    query: str,
    user_skills: list[str],
    location: str = "",
    remote_only: bool = False,
    page: int = 1,
) -> list[dict[str, Any]]:
    cache_key = "|".join(
        [
            "public",
            query.lower().strip(),
            location.lower().strip(),
            str(remote_only).lower(),
            str(page),
        ]
    )
    cached = _CACHE.get(cache_key)
    if cached:
        ts, data = cached
        if time.time() - ts < CACHE_TTL_SECONDS:
            return _rescore(data, user_skills)

    # Public endpoint returns broad data; fetch several pages and filter client-side.
    base_jobs: list[dict[str, Any]] = []
    page_start = max(1, page)
    page_end = page_start + 4
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for p in range(page_start, page_end + 1):
                resp = await client.get(_PUBLIC_JOBS_URL, params={"page": str(p)})
                resp.raise_for_status()
                raw_list = (resp.json() or {}).get("data") or []
                for raw_job in raw_list:
                    mapped = _map_public_job(raw_job)
                    # Keep query as a soft signal (scoring), not a hard filter.
                    # Hard filtering can drop almost everything and force fake fallback.
                    if location and not _location_matches(location, mapped.get("location") or ""):
                        continue
                    if remote_only and "remote" not in (mapped["location"] or "").lower():
                        continue
                    base_jobs.append(mapped)
    except Exception as exc:
        logger.warning("Public jobs request failed: %s", exc)
        return []

    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in base_jobs:
        link = (item.get("apply_link") or "").strip().lower()
        key = (
            f"link::{link}"
            if link
            else "meta::"
            + "||".join(
                [
                    (item.get("company") or "").strip().lower(),
                    (item.get("role") or "").strip().lower(),
                    (item.get("location") or "").strip().lower(),
                ]
            )
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    _CACHE[cache_key] = (time.time(), deduped)
    logger.info("Public jobs fetched %d jobs for '%s'", len(deduped), query)
    ranked = _rescore(deduped, user_skills)
    if query:
        # Prefer jobs that mention query tokens in role/company while preserving broad coverage.
        tokens = [t for t in re.split(r"[^a-zA-Z0-9]+", query.lower()) if len(t) >= 3][:6]
        if tokens:
            def query_boost(item: dict[str, Any]) -> int:
                text = f'{item.get("role", "")} {item.get("company", "")}'.lower()
                return sum(1 for t in tokens if t in text)

            ranked.sort(key=lambda item: (query_boost(item), item.get("match_score", 0)), reverse=True)
    return ranked


async def fetch_linkedin_jobs(
    query: str,
    user_skills: list[str],
    location: str = "",
    employment_type: str = "INTERN",
    date_posted: str = "week",
    remote_only: bool = False,
    page: int = 1,
    num_pages: int = 5,
) -> list[dict[str, Any]]:
    """
    Call JSearch (1 request per unique query) and return dicts shaped like JobOut.
    Results are cached for CACHE_TTL_SECONDS to avoid burning API quota.
    Returns [] when RAPIDAPI_KEY is not set.

    Args:
        query: Job title / keyword search
        user_skills: User's skills for match scoring
        location: City, state or country to filter by (e.g. "New York, NY")
        employment_type: Comma-separated types — INTERN, FULLTIME, PARTTIME, CONTRACTOR
        date_posted: One of: all, today, 3days, week, month
        remote_only: Return only remote positions
        page: Page number (1-based, each page ~10 results)
        num_pages: Number of pages to fetch per request window
    """
    settings = get_settings()
    if not settings.rapidapi_key:
        return await _fetch_public_jobs(
            query=query,
            user_skills=user_skills,
            location=location,
            remote_only=remote_only,
            page=page,
        )
    num_pages = max(1, min(10, int(num_pages)))

    # Cache key includes all params that change the API result
    cache_key = "|".join([
        query.lower().strip(),
        location.lower().strip(),
        employment_type.upper(),
        date_posted,
        str(remote_only).lower(),
        str(page),
        str(num_pages),
    ])
    cached = _CACHE.get(cache_key)
    if cached:
        ts, data = cached
        if time.time() - ts < CACHE_TTL_SECONDS:
            logger.info("JSearch cache hit for '%s'", cache_key)
            return _rescore(data, user_skills)

    headers = {
        "X-RapidAPI-Key": settings.rapidapi_key,
        "X-RapidAPI-Host": _HOST,
    }

    params: dict[str, str] = {
        "query": query,
        "page": str(page),
        "num_pages": str(num_pages),
        "employment_types": employment_type.upper(),
        "date_posted": date_posted,
    }
    if location:
        params["location"] = location
    if remote_only:
        params["remote_jobs_only"] = "true"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(_JSEARCH_URL, headers=headers, params=params)
            resp.raise_for_status()
            raw = resp.json().get("data", [])
    except Exception as exc:
        logger.warning("JSearch request failed: %s", exc)
        return await _fetch_public_jobs(
            query=query,
            user_skills=user_skills,
            location=location,
            remote_only=remote_only,
            page=page,
        )

    # Parse raw jobs (store without user-specific scores so cache is reusable)
    base_jobs: list[dict[str, Any]] = []
    for job in raw:
        desc = (job.get("job_description") or "") + " ".join(
            job.get("job_highlights", {}).get("Qualifications", [])
        )
        job_skills = job.get("job_required_skills") or _extract_skills(desc)
        base_jobs.append({
            "_job_skills": job_skills,
            "company": job.get("employer_name") or "Unknown",
            "role": job.get("job_title") or "Internship",
            "demand_level": _demand_level(None),
            "required_skills": job_skills[:8],
            "market_frequency": 70,
            "salary_estimate": _salary_str(job),
            "apply_link": job.get("job_apply_link") or "",
            "location": ", ".join(
                filter(None, [job.get("job_city"), job.get("job_state"), job.get("job_country")])
            ),
            "employer_logo": job.get("employer_logo") or "",
            "posted_at": job.get("job_posted_at_datetime_utc") or "",
        })

    if location:
        base_jobs = [j for j in base_jobs if _location_matches(location, j.get("location") or "")]

    # Deduplicate by apply link when available, else company+role+location.
    deduped_base_jobs: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in base_jobs:
        apply_link = (item.get("apply_link") or "").strip().lower()
        key = (
            f"link::{apply_link}"
            if apply_link
            else "meta::"
            + "||".join(
                [
                    (item.get("company") or "").strip().lower(),
                    (item.get("role") or "").strip().lower(),
                    (item.get("location") or "").strip().lower(),
                ]
            )
        )
        if key in seen:
            continue
        seen.add(key)
        deduped_base_jobs.append(item)

    # Store in cache
    _CACHE[cache_key] = (time.time(), deduped_base_jobs)
    logger.info(
        "JSearch fetched %d raw / %d deduped jobs for '%s' (1 API call used)",
        len(base_jobs),
        len(deduped_base_jobs),
        query,
    )

    return _rescore(deduped_base_jobs, user_skills)


def _rescore(base_jobs: list[dict[str, Any]], user_skills: list[str]) -> list[dict[str, Any]]:
    """Apply match scores to cached base jobs without any API call."""
    results = []
    for i, job in enumerate(base_jobs):
        score = _match_score(user_skills, job["_job_skills"])
        results.append({
            **{k: v for k, v in job.items() if k != "_job_skills"},
            "id": i + 1,
            "match_score": score,
            "apply_priority": _apply_priority(score),
            "market_frequency": min(99, score + 10),
        })
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results
