import re
import fitz  # PyMuPDF


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract clean text from a PDF byte stream."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = [page.get_text("text") for page in doc]
    doc.close()
    raw = "\n".join(pages)
    return _clean_text(raw)


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    return text.strip()


def count_quantified_bullets(text: str) -> int:
    """
    Count bullet points that contain a number with %, x, or similar
    quantification patterns (e.g. "increased accuracy by 20%").
    """
    number_pattern = re.compile(
        r"(\d+[\.,]?\d*\s*(%|x|X|times|ms|seconds|hours|users|records|queries|models|pipelines))"
    )
    bullets = re.split(r"[\n•\-\*]", text)
    return sum(1 for b in bullets if number_pattern.search(b))
