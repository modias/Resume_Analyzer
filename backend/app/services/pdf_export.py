"""Generate formatted resume PDF bytes from structured JSON using ReportLab."""

from __future__ import annotations

import re
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

MARGIN = 0.6 * inch
GRAY = colors.HexColor("#666666")
MIN_BULLET_LEN = 20

_SKILL_CATEGORY_SPLIT = re.compile(r"(?=\b[A-Z][^:]{0,48}:\s)")


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "ResumeName",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "contact": ParagraphStyle(
            "ResumeContact",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=GRAY,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "ResumeSection",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            spaceBefore=0,
            spaceAfter=0,
        ),
        "entry_title": ParagraphStyle(
            "EntryTitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            alignment=TA_LEFT,
        ),
        "entry_date": ParagraphStyle(
            "EntryDate",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            alignment=TA_RIGHT,
        ),
        "entry_subtitle": ParagraphStyle(
            "EntrySubtitle",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9.5,
            alignment=TA_LEFT,
        ),
        "entry_location": ParagraphStyle(
            "EntryLocation",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            textColor=GRAY,
            alignment=TA_RIGHT,
        ),
        "project_tech": ParagraphStyle(
            "ProjectTech",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9.5,
            textColor=GRAY,
            alignment=TA_CENTER,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leftIndent=0.15 * inch,
            spaceBefore=3,
            spaceAfter=3,
        ),
        "skills": ParagraphStyle(
            "Skills",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            spaceAfter=4,
        ),
        "honors": ParagraphStyle(
            "Honors",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            spaceAfter=2,
        ),
    }


def _split_skill_lines(text: str) -> list[str]:
    trimmed = text.strip()
    if not trimmed:
        return []
    parts = [p.strip() for p in _SKILL_CATEGORY_SPLIT.split(trimmed) if p.strip()]
    return parts if parts else [trimmed]


def _clean_bullets(bullets: list[str]) -> list[str]:
    trimmed = [str(b).strip() for b in bullets if len(str(b).strip()) >= MIN_BULLET_LEN]
    out: list[str] = []
    for bullet in trimmed:
        norm = bullet.lower()
        merged = False
        for i, existing in enumerate(out):
            en = existing.lower()
            if norm == en or norm in en or en in norm:
                if len(bullet) > len(existing):
                    out[i] = bullet
                merged = True
                break
        if not merged:
            out.append(bullet)
    return out


def _entry_header_tables(
    styles: dict[str, ParagraphStyle],
    title: str,
    subtitle: str,
    location: str,
    date: str,
) -> list[Table]:
    """Row 1: title | date. Row 2: subtitle | location."""
    row1 = Table(
        [
            [
                Paragraph(_escape(title), styles["entry_title"]),
                Paragraph(_escape(date), styles["entry_date"]),
            ]
        ],
        colWidths=[4.5 * inch, 2 * inch],
    )
    row1.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )

    row2 = Table(
        [
            [
                Paragraph(_escape(subtitle), styles["entry_subtitle"]),
                Paragraph(_escape(location), styles["entry_location"]),
            ]
        ],
        colWidths=[4.5 * inch, 2 * inch],
    )
    row2.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return [row1, row2]


def _project_header_table(
    styles: dict[str, ParagraphStyle],
    name: str,
    tech: str,
    date: str,
) -> Table:
    """Row 1: name | tech | date."""
    table = Table(
        [
            [
                Paragraph(_escape(name), styles["entry_title"]),
                Paragraph(_escape(tech), styles["project_tech"]),
                Paragraph(_escape(date), styles["entry_date"]),
            ]
        ],
        colWidths=[2 * inch, 3 * inch, 1.5 * inch],
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
                ("ALIGN", (2, 0), (2, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def _render_bullets(
    story: list[Any],
    styles: dict[str, ParagraphStyle],
    bullets: list[str],
) -> None:
    for bullet in _clean_bullets(bullets):
        text = str(bullet).strip()
        if not text:
            continue
        lower = text.lower()
        if lower.startswith(("honors:", "honor:", "gpa")):
            story.append(Paragraph(_escape(text), styles["honors"]))
        else:
            story.append(Paragraph(f"• {_escape(text)}", styles["bullet"]))


def structured_resume_to_pdf_bytes(data: dict[str, Any]) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
    )
    styles = _build_styles()
    story: list[Any] = []

    name = (data.get("name") or "").strip()
    contact = (data.get("contact") or "").strip()

    if name:
        story.append(Paragraph(_escape(name), styles["name"]))
    if contact:
        story.append(Paragraph(_escape(contact), styles["contact"]))

    for section in data.get("sections") or []:
        title = (section.get("title") or "").strip()
        if title:
            story.append(Spacer(1, 8))
            story.append(Paragraph(_escape(title.upper()), styles["section"]))
            story.append(
                HRFlowable(
                    width="100%",
                    thickness=0.5,
                    color=colors.black,
                    spaceBefore=0,
                    spaceAfter=0,
                )
            )
            story.append(Spacer(1, 4))

        for entry in section.get("entries") or []:
            entry_type = entry.get("type")

            if entry_type == "entry":
                for table in _entry_header_tables(
                    styles,
                    entry.get("title") or "",
                    entry.get("subtitle") or "",
                    entry.get("location") or "",
                    entry.get("date") or "",
                ):
                    story.append(table)
                _render_bullets(story, styles, entry.get("bullets") or [])
                story.append(Spacer(1, 4))

            elif entry_type == "project":
                story.append(
                    _project_header_table(
                        styles,
                        entry.get("name") or "",
                        entry.get("tech") or "",
                        entry.get("date") or "",
                    )
                )
                _render_bullets(story, styles, entry.get("bullets") or [])
                story.append(Spacer(1, 4))

            elif entry_type == "skills":
                text = str(entry.get("text") or "").strip()
                for line in _split_skill_lines(text):
                    story.append(Paragraph(_escape(line), styles["skills"]))

    doc.build(story)
    return buffer.getvalue()
