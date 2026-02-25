"""
Master skills dictionary used for extraction and scoring.
Each skill maps to a list of aliases/variations to match against text.
"""

SKILLS: dict[str, list[str]] = {
    # Languages
    "Python": ["python"],
    "SQL": ["sql", "mysql", "postgresql", "postgres", "sqlite", "tsql", "plsql"],
    "R": [r"\br\b", "r programming", "r language"],
    "Java": ["java"],
    "JavaScript": ["javascript", "js", "node.js", "nodejs"],
    "TypeScript": ["typescript", "ts"],
    "C++": ["c\\+\\+", "cpp"],
    "Scala": ["scala"],
    "Go": [r"\bgo\b", "golang"],
    "Rust": ["rust"],
    "MATLAB": ["matlab"],
    "Bash": ["bash", "shell scripting", "zsh"],

    # Data / ML
    "Machine Learning": ["machine learning", r"\bml\b", "statistical modeling"],
    "Deep Learning": ["deep learning", "neural network", "neural networks"],
    "NLP": ["nlp", "natural language processing", "text mining"],
    "Computer Vision": ["computer vision", "image recognition", "opencv"],
    "TensorFlow": ["tensorflow", "tf"],
    "PyTorch": ["pytorch", "torch"],
    "Scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
    "Keras": ["keras"],
    "XGBoost": ["xgboost", "gradient boosting", "lightgbm"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "Matplotlib": ["matplotlib", "seaborn", "plotly"],
    "Statistics": ["statistics", "statistical analysis", "hypothesis testing", "probability"],
    "A/B Testing": ["a/b testing", "ab testing", "experimentation", "split testing"],

    # Data Engineering
    "Spark": ["apache spark", r"\bspark\b", "pyspark"],
    "Kafka": ["apache kafka", r"\bkafka\b"],
    "Airflow": ["apache airflow", r"\bairflow\b"],
    "dbt": [r"\bdbt\b", "data build tool"],
    "ETL": [r"\betl\b", "data pipeline", "data pipelines"],
    "Hadoop": ["hadoop", "hdfs", "mapreduce"],
    "Hive": [r"\bhive\b"],

    # Visualization / BI
    "Tableau": ["tableau"],
    "PowerBI": ["power bi", "powerbi"],
    "Looker": ["looker"],
    "Grafana": ["grafana"],

    # Cloud
    "AWS": [r"\baws\b", "amazon web services", "s3", "ec2", "lambda", "sagemaker", "redshift", "glue"],
    "GCP": [r"\bgcp\b", "google cloud", "bigquery", "dataflow", "vertex ai"],
    "Azure": [r"\bazure\b", "microsoft azure", "azure ml"],

    # DevOps / MLOps
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", r"\bk8s\b"],
    "CI/CD": ["ci/cd", "github actions", "jenkins", "circleci"],
    "Terraform": ["terraform"],
    "MLflow": ["mlflow"],

    # Databases
    "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"],
    "Elasticsearch": ["elasticsearch"],
    "Snowflake": ["snowflake"],

    # Version Control / Collab
    "Git": [r"\bgit\b", "github", "gitlab", "version control"],
    "REST APIs": ["rest api", "restful", "rest apis", "api development"],
    "GraphQL": ["graphql"],

    # Soft / quantified
    "Communication": ["communication", "presentation", "stakeholder"],
    "Leadership": ["leadership", "led", "managed"],
}

# Flat alias → canonical name lookup
_ALIAS_MAP: dict[str, str] = {}
for canonical, aliases in SKILLS.items():
    for alias in aliases:
        _ALIAS_MAP[alias.lower()] = canonical

CANONICAL_NAMES = list(SKILLS.keys())
