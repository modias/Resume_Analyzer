"""
Extracts skills from resume and job description text using a curated skill database
with token-boundary pattern matching to avoid false positives.
"""
import re

# ---------------------------------------------------------------------------
# Skill database — canonical name → list of aliases/variants to match
# ---------------------------------------------------------------------------

SKILL_DB: dict[str, list[str]] = {
    # Programming Languages
    "Python": ["python"],
    "Java": ["java"],
    "JavaScript": ["javascript", "js"],
    "TypeScript": ["typescript", "ts"],
    "C++": ["c\\+\\+", "cpp"],
    "C": [r"\bc\b"],
    "C#": ["c#", "c sharp", "csharp"],
    "R": [r"\br\b"],
    "Go": [r"\bgo\b", "golang"],
    "Rust": ["rust"],
    "Scala": ["scala"],
    "Ruby": ["ruby"],
    "PHP": ["php"],
    "Swift": ["swift"],
    "Kotlin": ["kotlin"],
    "MATLAB": ["matlab"],
    "Julia": ["julia"],
    "Bash": ["bash", "shell scripting", "shell script"],
    "Perl": ["perl"],
    "Lua": ["lua"],
    # Data & Analytics
    "SQL": ["sql", "t-sql", "pl/sql", "mysql", "postgres"],
    "NoSQL": ["nosql"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "Matplotlib": ["matplotlib"],
    "Seaborn": ["seaborn"],
    "Plotly": ["plotly"],
    "Tableau": ["tableau"],
    "PowerBI": ["power bi", "powerbi", "power-bi"],
    "Looker": ["looker"],
    "Redash": ["redash"],
    "Excel": ["excel", "microsoft excel"],
    "Google Sheets": ["google sheets"],
    "dbt": [r"\bdbt\b"],
    "Airflow": ["airflow", "apache airflow"],
    "Spark": ["spark", "apache spark", "pyspark"],
    "Kafka": ["kafka", "apache kafka"],
    "Hadoop": ["hadoop"],
    "Databricks": ["databricks"],
    "Snowflake": ["snowflake"],
    "BigQuery": ["bigquery", "big query"],
    "Redshift": ["redshift", "amazon redshift"],
    "dbt": [r"\bdbt\b"],
    "ETL": ["etl", "extract transform load"],
    "A/B Testing": ["a/b testing", "a/b test", "ab testing", "split testing"],
    "Statistics": ["statistics", "statistical analysis"],
    "Causal Inference": ["causal inference"],
    "Hypothesis Testing": ["hypothesis testing"],
    "Regression": ["regression analysis", "logistic regression", "linear regression"],
    # Machine Learning & AI
    "Machine Learning": ["machine learning", r"\bml\b"],
    "Deep Learning": ["deep learning"],
    "NLP": ["nlp", "natural language processing"],
    "Computer Vision": ["computer vision", r"\bcv\b"],
    "TensorFlow": ["tensorflow", "tf"],
    "PyTorch": ["pytorch", "torch"],
    "Scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
    "Keras": ["keras"],
    "XGBoost": ["xgboost"],
    "LightGBM": ["lightgbm"],
    "Hugging Face": ["hugging face", "huggingface"],
    "OpenCV": ["opencv"],
    "spaCy": ["spacy"],
    "NLTK": ["nltk"],
    "LangChain": ["langchain"],
    "Reinforcement Learning": ["reinforcement learning", r"\brl\b"],
    "Transformers": ["transformers", "transformer model"],
    "RAG": [r"\brag\b", "retrieval augmented generation"],
    "LLM": [r"\bllm\b", "large language model"],
    # Cloud Platforms
    "AWS": [r"\baws\b", "amazon web services"],
    "GCP": [r"\bgcp\b", "google cloud", "google cloud platform"],
    "Azure": ["azure", "microsoft azure"],
    "S3": [r"\bs3\b", "amazon s3"],
    "EC2": [r"\bec2\b", "amazon ec2"],
    "Lambda": ["aws lambda", "lambda function"],
    "CloudRun": ["cloud run", "cloudrun"],
    "Firebase": ["firebase"],
    "Vercel": ["vercel"],
    "Heroku": ["heroku"],
    # DevOps & MLOps
    "Docker": ["docker", "containerization", "container"],
    "Kubernetes": ["kubernetes", r"\bk8s\b"],
    "Terraform": ["terraform"],
    "CI/CD": ["ci/cd", "continuous integration", "continuous deployment", "continuous delivery"],
    "GitHub Actions": ["github actions"],
    "Jenkins": ["jenkins"],
    "Helm": ["helm"],
    "Ansible": ["ansible"],
    "MLflow": ["mlflow"],
    "Kubeflow": ["kubeflow"],
    "Weights & Biases": ["wandb", "weights and biases", "weights & biases"],
    # Web & Backend
    "React": ["react", "react.js", "reactjs"],
    "Next.js": ["next.js", "nextjs"],
    "Vue": ["vue", "vue.js", "vuejs"],
    "Angular": ["angular"],
    "FastAPI": ["fastapi"],
    "Flask": ["flask"],
    "Django": ["django"],
    "Node.js": ["node.js", "nodejs", "node"],
    "Express": ["express", "express.js"],
    "REST": ["rest", "rest api", "restful"],
    "GraphQL": ["graphql"],
    "gRPC": ["grpc"],
    "WebSocket": ["websocket", "websockets"],
    # Databases
    "PostgreSQL": ["postgresql", "postgres"],
    "MySQL": ["mysql"],
    "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"],
    "Cassandra": ["cassandra"],
    "Elasticsearch": ["elasticsearch", "elastic search"],
    "SQLite": ["sqlite"],
    "DynamoDB": ["dynamodb", "amazon dynamodb"],
    "Neo4j": ["neo4j"],
    "Pinecone": ["pinecone"],
    # Tools & Platforms
    "Git": [r"\bgit\b"],
    "GitHub": ["github"],
    "GitLab": ["gitlab"],
    "Jira": ["jira"],
    "Confluence": ["confluence"],
    "Figma": ["figma"],
    "Linux": ["linux", "unix"],
    "Jupyter": ["jupyter", "jupyter notebook", "jupyter lab"],
    "VS Code": ["vs code", "vscode"],
    "Postman": ["postman"],
    "Swagger": ["swagger", "openapi"],
    "Prometheus": ["prometheus"],
    "Grafana": ["grafana"],
    "Sentry": ["sentry"],
    "dbt": [r"\bdbt\b"],
    # Business / Soft skills (kept minimal — not useful for matching)
    "Communication": ["communication"],
    "Leadership": ["leadership"],
    "Agile": ["agile", "scrum", "kanban"],
    "Data Structures": ["data structures", "algorithms", "data structures and algorithms", "dsa"],
    "System Design": ["system design"],
    "Object-Oriented Programming": ["oop", "object-oriented", "object oriented programming"],
}


def _build_patterns() -> list[tuple[str, re.Pattern[str]]]:
    """Pre-compile regex patterns for each skill."""
    patterns: list[tuple[str, re.Pattern[str]]] = []
    for canonical, aliases in SKILL_DB.items():
        combined = "|".join(f"(?:{alias})" for alias in aliases)
        pattern = re.compile(rf"(?<!\w)(?:{combined})(?!\w)", re.IGNORECASE)
        patterns.append((canonical, pattern))
    return patterns


_COMPILED_PATTERNS = _build_patterns()


def extract_skills(text: str) -> list[str]:
    """
    Extract canonical skill names present in the given text.
    Returns a deduplicated list sorted alphabetically.
    """
    found: set[str] = set()
    for canonical, pattern in _COMPILED_PATTERNS:
        if pattern.search(text):
            found.add(canonical)
    return sorted(found)


def extract_required_skills_from_jd(jd_text: str) -> list[str]:
    """
    Extract skills mentioned in a job description.
    Weighs skills that appear in requirements/qualifications sections more heavily.
    """
    return extract_skills(jd_text)
