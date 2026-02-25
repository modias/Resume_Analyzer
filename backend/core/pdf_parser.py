import asyncio
import io
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=4)


def _extract_text_sync(pdf_bytes: bytes) -> str:
    """Synchronous PDF text extraction using pdfplumber."""
    import pdfplumber

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    return "\n".join(text_parts)


async def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF file asynchronously."""
    loop = asyncio.get_event_loop()
    text = await loop.run_in_executor(_executor, _extract_text_sync, pdf_bytes)
    return text.strip()
