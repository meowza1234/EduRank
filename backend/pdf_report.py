from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from datetime import datetime
import os


def _register_thai_fonts():
    _here = os.path.dirname(os.path.abspath(__file__))
    font_dirs = [
        os.path.join(_here, "fonts"),
        "C:/Windows/Fonts",
        "/usr/share/fonts/truetype/thai-tlwg",
        "/usr/share/fonts/truetype",
        "/usr/share/fonts",
    ]
    candidates = [
        ("ThaiFontRegular", ["tahoma.ttf", "arial.ttf", "Garuda.ttf", "Loma.ttf", "Norasi.ttf", "FreeSans.ttf"]),
        ("ThaiFontBold", ["tahomabd.ttf", "arialbd.ttf", "Garuda.ttf", "Loma.ttf", "FreeSansBold.ttf"]),
    ]
    registered = {}
    for name, filenames in candidates:
        for font_dir in font_dirs:
            for filename in filenames:
                path = os.path.join(font_dir, filename)
                if os.path.exists(path):
                    try:
                        pdfmetrics.registerFont(TTFont(name, path))
                        registered[name] = True
                        break
                    except Exception:
                        pass
            if name in registered:
                break
    return "ThaiFontRegular" in registered


_thai_fonts_ok = _register_thai_fonts()
FONT_REGULAR = "ThaiFontRegular" if _thai_fonts_ok else "Helvetica"
FONT_BOLD = "ThaiFontBold" if _thai_fonts_ok else "Helvetica-Bold"


def generate_student_report(student):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)

    y = 750

    pdf.setFont(FONT_BOLD, 20)
    pdf.drawString(50, y, "EduRank Analytics Report")

    y -= 30
    pdf.setFont(FONT_REGULAR, 11)
    pdf.drawString(50, y, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    y -= 35
    pdf.setFont(FONT_BOLD, 14)
    pdf.drawString(50, y, "Student Information")

    y -= 22
    pdf.setFont(FONT_REGULAR, 12)
    pdf.drawString(50, y, f"Name: {student.get('name', '-')}")
    y -= 18
    pdf.drawString(50, y, f"Student ID: {student.get('student_id', '-')}")
    y -= 18
    pdf.drawString(50, y, f"Section: {student.get('section', '-')}")

    y -= 30
    pdf.setFont(FONT_BOLD, 14)
    pdf.drawString(50, y, "Academic Summary")

    y -= 22
    pdf.setFont(FONT_REGULAR, 12)
    pdf.drawString(50, y, f"GPAX: {student.get('gpax', '-')}")
    y -= 18
    pdf.drawString(50, y, f"Section Rank: {student.get('section_rank', '-')} / {student.get('section_total', '-')}")
    y -= 18
    pdf.drawString(50, y, f"Percentile: {student.get('percentile', '-')}")
    y -= 18
    pdf.drawString(50, y, f"Risk Level: {student.get('risk', '-')}")
    y -= 18
    pdf.drawString(50, y, f"Risk Score: {student.get('risk_score', '-')}")
    y -= 18
    pdf.drawString(50, y, f"Predicted Next GPAX: {student.get('predicted_next_gpax', '-')}")

    ai = student.get("ai_prediction", {})

    y -= 30
    pdf.setFont(FONT_BOLD, 14)
    pdf.drawString(50, y, "AI Risk Prediction")

    y -= 22
    pdf.setFont(FONT_REGULAR, 12)
    pdf.drawString(50, y, f"AI Risk Score: {ai.get('ai_risk_score', '-')}")
    y -= 18
    pdf.drawString(50, y, f"AI Risk Label: {ai.get('ai_risk_label', '-')}")

    y -= 30
    pdf.setFont(FONT_BOLD, 14)
    pdf.drawString(50, y, "AI Study Recommendations")

    y -= 22
    pdf.setFont(FONT_REGULAR, 11)
    recommendations = student.get("smart_recommendations", [])

    if not recommendations:
        pdf.drawString(60, y, "- No recommendations available")
        y -= 16
    else:
        for rec in recommendations[:6]:
            pdf.drawString(60, y, f"- {rec[:95]}")
            y -= 16
            if y < 80:
                pdf.showPage()
                y = 750
                pdf.setFont(FONT_REGULAR, 11)

    pdf.save()
    buffer.seek(0)
    return buffer