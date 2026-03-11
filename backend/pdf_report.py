from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime


def generate_student_report(student):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)

    y = 750

    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(50, y, "EduRank Analytics Report")

    y -= 30
    pdf.setFont("Helvetica", 11)
    pdf.drawString(50, y, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    y -= 35
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "Student Information")

    y -= 22
    pdf.setFont("Helvetica", 12)
    pdf.drawString(50, y, f"Name: {student.get('name', '-')}")
    y -= 18
    pdf.drawString(50, y, f"Student ID: {student.get('student_id', '-')}")
    y -= 18
    pdf.drawString(50, y, f"Section: {student.get('section', '-')}")

    y -= 30
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "Academic Summary")

    y -= 22
    pdf.setFont("Helvetica", 12)
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
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "AI Risk Prediction")

    y -= 22
    pdf.setFont("Helvetica", 12)
    pdf.drawString(50, y, f"AI Risk Score: {ai.get('ai_risk_score', '-')}")
    y -= 18
    pdf.drawString(50, y, f"AI Risk Label: {ai.get('ai_risk_label', '-')}")

    y -= 30
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "AI Study Recommendations")

    y -= 22
    pdf.setFont("Helvetica", 11)
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
                pdf.setFont("Helvetica", 11)

    pdf.save()
    buffer.seek(0)
    return buffer