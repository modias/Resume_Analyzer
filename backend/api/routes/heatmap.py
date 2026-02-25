from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HeatmapResponse(BaseModel):
    skills: list[str]
    roles: list[str]
    data: dict[str, dict[str, int]]


_HEATMAP_SKILLS = [
    "Python", "SQL", "R", "Tableau", "PowerBI", "AWS", "GCP", "Azure",
    "Spark", "Kafka", "Docker", "Kubernetes", "Machine Learning", "Deep Learning",
    "NLP", "Computer Vision", "Statistics", "A/B Testing", "dbt", "Airflow",
]

_HEATMAP_ROLES = [
    "Data Science", "ML Engineer", "Data Analyst", "BI Developer", "Data Engineer",
]

_HEATMAP_DATA: dict[str, dict[str, int]] = {
    "Data Science": {
        "Python": 95, "SQL": 80, "R": 55, "Tableau": 40, "PowerBI": 30,
        "AWS": 60, "GCP": 45, "Azure": 40, "Spark": 50, "Kafka": 25,
        "Docker": 45, "Kubernetes": 30, "Machine Learning": 90, "Deep Learning": 75,
        "NLP": 65, "Computer Vision": 55, "Statistics": 85, "A/B Testing": 70,
        "dbt": 20, "Airflow": 35,
    },
    "ML Engineer": {
        "Python": 98, "SQL": 55, "R": 20, "Tableau": 15, "PowerBI": 10,
        "AWS": 75, "GCP": 65, "Azure": 60, "Spark": 70, "Kafka": 50,
        "Docker": 85, "Kubernetes": 80, "Machine Learning": 95, "Deep Learning": 90,
        "NLP": 70, "Computer Vision": 75, "Statistics": 65, "A/B Testing": 40,
        "dbt": 15, "Airflow": 60,
    },
    "Data Analyst": {
        "Python": 70, "SQL": 95, "R": 50, "Tableau": 85, "PowerBI": 80,
        "AWS": 35, "GCP": 25, "Azure": 30, "Spark": 25, "Kafka": 10,
        "Docker": 20, "Kubernetes": 10, "Machine Learning": 45, "Deep Learning": 20,
        "NLP": 25, "Computer Vision": 10, "Statistics": 80, "A/B Testing": 75,
        "dbt": 40, "Airflow": 30,
    },
    "BI Developer": {
        "Python": 50, "SQL": 90, "R": 30, "Tableau": 95, "PowerBI": 98,
        "AWS": 40, "GCP": 30, "Azure": 45, "Spark": 20, "Kafka": 10,
        "Docker": 15, "Kubernetes": 10, "Machine Learning": 30, "Deep Learning": 10,
        "NLP": 15, "Computer Vision": 5, "Statistics": 60, "A/B Testing": 55,
        "dbt": 50, "Airflow": 25,
    },
    "Data Engineer": {
        "Python": 85, "SQL": 88, "R": 15, "Tableau": 25, "PowerBI": 20,
        "AWS": 82, "GCP": 72, "Azure": 68, "Spark": 92, "Kafka": 88,
        "Docker": 90, "Kubernetes": 85, "Machine Learning": 40, "Deep Learning": 25,
        "NLP": 20, "Computer Vision": 15, "Statistics": 45, "A/B Testing": 30,
        "dbt": 85, "Airflow": 90,
    },
}


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap() -> HeatmapResponse:
    """Return skill demand heatmap data across all role categories."""
    return HeatmapResponse(
        skills=_HEATMAP_SKILLS,
        roles=_HEATMAP_ROLES,
        data=_HEATMAP_DATA,
    )
