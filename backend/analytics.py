import os
import pandas as pd


def get_data_paths():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "..", "data")

    return {
        "students": os.path.join(data_dir, "students.csv"),
        "courses": os.path.join(data_dir, "courses.csv"),
        "enrollments": os.path.join(data_dir, "enrollments.csv"),
    }


def load_core_data():
    paths = get_data_paths()

    students = pd.read_csv(paths["students"])
    courses = pd.read_csv(paths["courses"])
    enrollments = pd.read_csv(paths["enrollments"])

    return students, courses, enrollments


def build_student_course_view():
    students, courses, enrollments = load_core_data()

    df = enrollments.merge(students, on="student_id", how="left")
    df = df.merge(courses, on="course_code", how="left")

    return df


def calculate_student_gpax():
    df = build_student_course_view().copy()
    df["weighted_points"] = df["grade_point"] * df["credits"]

    summary = (
        df.groupby(["student_id", "name", "section"], as_index=False)
        .agg(
            total_weighted_points=("weighted_points", "sum"),
            total_credits=("credits", "sum"),
        )
    )

    summary["gpax"] = summary["total_weighted_points"] / summary["total_credits"]
    summary["gpax"] = summary["gpax"].round(2)

    summary = summary.sort_values("gpax", ascending=False).reset_index(drop=True)

    summary["overall_rank"] = (
        summary["gpax"].rank(ascending=False, method="min").astype(int)
    )

    summary["section_rank"] = (
        summary.groupby("section")["gpax"]
        .rank(ascending=False, method="min")
        .astype(int)
    )

    summary["section_total"] = (
        summary.groupby("section")["student_id"].transform("count")
    )

    total = len(summary)
    if total > 1:
        summary["percentile"] = (
            ((total - summary["overall_rank"]) / (total - 1) * 100).round(1)
        )
    else:
        summary["percentile"] = 100.0

    summary["section_avg_gpax"] = (
        summary.groupby("section")["gpax"].transform("mean").round(2)
    )

    summary["section_median_gpax"] = (
        summary.groupby("section")["gpax"].transform("median").round(2)
    )

    return summary


def classify_risk(score):
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def add_risk_metrics(summary_df):
    df = summary_df.copy()

    rank_ratio = df["section_rank"] / df["section_total"]
    avg_gap = (df["section_avg_gpax"] - df["gpax"]).clip(lower=0)
    percentile_gap = (1 - (df["percentile"] / 100)).clip(lower=0)

    df["risk_score"] = (
        (avg_gap * 40) +
        (rank_ratio * 30) +
        (percentile_gap * 30)
    ).clip(0, 100).round(1)

    df["risk"] = df["risk_score"].apply(classify_risk)

    return df


def generate_risk_reasons(row):
    reasons = []

    if row["gpax"] < row["section_avg_gpax"]:
        reasons.append(
            f"GPAX ต่ำกว่าค่าเฉลี่ยของ section อยู่ {round(row['section_avg_gpax'] - row['gpax'], 2)}"
        )

    if row["section_rank"] / row["section_total"] > 0.6:
        reasons.append("อันดับใน section อยู่ครึ่งล่างของกลุ่มเรียน")

    if row["percentile"] < 50:
        reasons.append("Percentile ต่ำกว่าค่ากลางของกลุ่มนักศึกษา")

    if row["risk"] == "High":
        reasons.append("คะแนนความเสี่ยงโดยรวมอยู่ในระดับสูง")

    if not reasons:
        reasons.append("ผลการเรียนโดยรวมอยู่ในเกณฑ์ดีเมื่อเทียบกับกลุ่มเรียน")

    return reasons


def generate_alerts(row):
    alerts = []

    if row["risk"] == "High":
        alerts.append("⚠ คุณมีความเสี่ยงทางการเรียนสูง ควรโฟกัสการดึงเกรดในวิชาหลัก")
    elif row["risk"] == "Medium":
        alerts.append("⚠ คุณอยู่ในระดับเฝ้าระวัง ควรรักษาความสม่ำเสมอของผลการเรียน")

    if row["gpax"] < row["section_avg_gpax"]:
        alerts.append("📉 GPAX ของคุณยังต่ำกว่าค่าเฉลี่ยของ section")

    if row["section_rank"] == 1:
        alerts.append("🏆 คุณอยู่ในอันดับ 1 ของ section")

    return alerts


def get_section_distribution(full_df, section):
    section_df = full_df[full_df["section"] == section].copy()

    bins = [
        ("0.00-1.99", ((section_df["gpax"] >= 0.0) & (section_df["gpax"] < 2.0)).sum()),
        ("2.00-2.49", ((section_df["gpax"] >= 2.0) & (section_df["gpax"] < 2.5)).sum()),
        ("2.50-2.99", ((section_df["gpax"] >= 2.5) & (section_df["gpax"] < 3.0)).sum()),
        ("3.00-3.49", ((section_df["gpax"] >= 3.0) & (section_df["gpax"] < 3.5)).sum()),
        ("3.50-4.00", ((section_df["gpax"] >= 3.5) & (section_df["gpax"] <= 4.0)).sum()),
    ]

    return [{"range": label, "count": int(count)} for label, count in bins]


def get_course_priority(student_id):
    df = build_student_course_view().copy()
    student_df = df[df["student_id"] == student_id].copy()

    if student_df.empty:
        return []

    student_df["impact_score"] = (
        (4.0 - student_df["grade_point"]) * student_df["credits"]
    ).round(2)

    student_df = student_df.sort_values(
        by=["impact_score", "credits"],
        ascending=False
    )

    recommendations = []
    for _, row in student_df.iterrows():
        recommendations.append({
            "course_code": row["course_code"],
            "course_name": row["course_name"],
            "credits": int(row["credits"]),
            "grade_letter": row["grade_letter"],
            "grade_point": float(row["grade_point"]),
            "impact_score": float(row["impact_score"]),
            "priority_reason": (
                "วิชานี้ควรโฟกัสก่อน เพราะหน่วยกิตสูงและเกรดปัจจุบันยังมีช่องให้ปรับได้"
                if row["impact_score"] >= 3
                else "วิชานี้มีผลต่อ GPAX ระดับปานกลาง"
            ),
        })

    return recommendations


def get_student_courses(student_id):
    df = build_student_course_view().copy()
    student_df = df[df["student_id"] == student_id].copy()

    if student_df.empty:
        return []

    student_df["impact_score"] = (
        (4.0 - student_df["grade_point"]) * student_df["credits"]
    ).round(2)

    result = student_df[
        [
            "semester",
            "course_code",
            "course_name",
            "credits",
            "category",
            "grade_letter",
            "grade_point",
            "impact_score",
        ]
    ].sort_values(by=["impact_score", "credits"], ascending=False)

    return result.to_dict(orient="records")


def simulate_course_improvement(student_id, course_code, new_grade_point):
    df = build_student_course_view().copy()
    student_df = df[df["student_id"] == student_id].copy()

    if student_df.empty:
        return None

    if course_code not in student_df["course_code"].values:
        return None

    student_df["weighted_points"] = (
        student_df["grade_point"] * student_df["credits"]
    )

    current_gpax = (
        student_df["weighted_points"].sum()
        / student_df["credits"].sum()
    )

    simulated_df = student_df.copy()

    simulated_df.loc[
        simulated_df["course_code"] == course_code,
        "grade_point"
    ] = float(new_grade_point)

    simulated_df["weighted_points"] = (
        simulated_df["grade_point"] * simulated_df["credits"]
    )

    simulated_gpax = (
        simulated_df["weighted_points"].sum()
        / simulated_df["credits"].sum()
    )

    course_row = student_df[
        student_df["course_code"] == course_code
    ].iloc[0]

    return {
        "course_code": course_row["course_code"],
        "course_name": course_row["course_name"],
        "current_grade_letter": course_row["grade_letter"],
        "current_grade_point": round(float(course_row["grade_point"]), 2),
        "new_grade_point": round(float(new_grade_point), 2),
        "current_gpax": round(float(current_gpax), 2),
        "simulated_gpax": round(float(simulated_gpax), 2),
        "gpax_change": round(float(simulated_gpax - current_gpax), 2),
    }


def get_student_semester_trend(student_id):
    df = build_student_course_view().copy()
    student_df = df[df["student_id"] == student_id].copy()

    if student_df.empty:
        return {"trend": [], "predicted_next_gpax": None, "trend_label": "No Data"}

    student_df["weighted_points"] = student_df["grade_point"] * student_df["credits"]

    semester_summary = (
        student_df.groupby("semester", as_index=False)
        .agg(
            total_weighted_points=("weighted_points", "sum"),
            total_credits=("credits", "sum"),
        )
    )

    semester_summary["semester_gpa"] = (
        semester_summary["total_weighted_points"] / semester_summary["total_credits"]
    ).round(2)

    semester_summary = semester_summary.sort_values("semester").reset_index(drop=True)

    trend = semester_summary[["semester", "semester_gpa"]].to_dict(orient="records")

    values = semester_summary["semester_gpa"].tolist()

    if len(values) >= 2:
        diffs = [values[i] - values[i - 1] for i in range(1, len(values))]
        avg_diff = sum(diffs) / len(diffs)
        predicted_next = round(values[-1] + avg_diff, 2)
    else:
        predicted_next = round(values[-1], 2)

    predicted_next = max(0.0, min(4.0, predicted_next))

    if len(values) >= 2:
        if values[-1] > values[0]:
            trend_label = "Improving"
        elif values[-1] < values[0]:
            trend_label = "Declining"
        else:
            trend_label = "Stable"
    else:
        trend_label = "Stable"

    return {
        "trend": trend,
        "predicted_next_gpax": predicted_next,
        "trend_label": trend_label,
    }


def generate_smart_recommendations(student):
    student_id = student["student_id"]
    courses = get_student_courses(student_id)
    trend_data = get_student_semester_trend(student_id)

    recommendations = []

    if student["risk"] == "High":
        recommendations.append("คุณมีความเสี่ยงสูง ควรเร่งปรับผลการเรียนในวิชาแกนหลักก่อน")
    elif student["risk"] == "Medium":
        recommendations.append("คุณอยู่ในระดับเฝ้าระวัง ควรรักษาความสม่ำเสมอและลดเกรดต่ำ")
    else:
        recommendations.append("ผลการเรียนของคุณอยู่ในเกณฑ์ดี ควรรักษามาตรฐานต่อไป")

    if student["gpax"] < student["section_avg_gpax"]:
        recommendations.append(
            f"GPAX ของคุณต่ำกว่าค่าเฉลี่ย section อยู่ {round(student['section_avg_gpax'] - student['gpax'], 2)} ควรโฟกัสวิชาที่ impact สูง"
        )

    if courses:
        top_course = courses[0]
        recommendations.append(
            f"ควรโฟกัสวิชา {top_course['course_name']} ก่อน เพราะมี Impact Score {top_course['impact_score']}"
        )

    if trend_data["trend_label"] == "Declining":
        recommendations.append("แนวโน้ม GPA ของคุณกำลังลดลง ควรวางแผนการอ่านหนังสือและติดตามผลรายวิชาอย่างใกล้ชิด")
    elif trend_data["trend_label"] == "Improving":
        recommendations.append("แนวโน้ม GPA ของคุณกำลังดีขึ้น ควรรักษาวิธีเรียนและความสม่ำเสมอแบบนี้ต่อไป")

    if trend_data["predicted_next_gpax"] is not None:
        recommendations.append(
            f"จากแนวโน้มปัจจุบัน GPAX เทอมถัดไปอาจอยู่ประมาณ {trend_data['predicted_next_gpax']}"
        )

    return recommendations


def get_ai_risk_prediction(student_id):
    summary = add_risk_metrics(calculate_student_gpax())
    student_df = summary[summary["student_id"] == student_id]

    if student_df.empty:
        return None

    row = student_df.iloc[0].to_dict()
    trend_data = get_student_semester_trend(student_id)
    courses = get_student_courses(student_id)

    trend_penalty = 0
    if trend_data["trend_label"] == "Declining":
        trend_penalty = 15
    elif trend_data["trend_label"] == "Stable":
        trend_penalty = 5

    predicted_penalty = 0
    predicted_next = trend_data["predicted_next_gpax"]
    if predicted_next is not None and predicted_next < row["gpax"]:
        predicted_penalty = round((row["gpax"] - predicted_next) * 20, 1)

    impact_penalty = 0
    high_impact_count = sum(
        1 for item in courses if float(item["impact_score"]) >= 2.5
    )
    impact_penalty = min(high_impact_count * 5, 20)

    ai_score = min(
        100,
        round(float(row["risk_score"]) * 0.6 + trend_penalty + predicted_penalty + impact_penalty, 1)
    )

    if ai_score >= 75:
        label = "High"
    elif ai_score >= 45:
        label = "Medium"
    else:
        label = "Low"

    explanation = []

    if row["gpax"] < row["section_avg_gpax"]:
        explanation.append("GPAX ต่ำกว่าค่าเฉลี่ยของ section")
    if trend_data["trend_label"] == "Declining":
        explanation.append("แนวโน้มผลการเรียนกำลังลดลง")
    if high_impact_count >= 2:
        explanation.append("มีหลายวิชาที่ impact สูงและควรรีบปรับ")
    if predicted_next is not None and predicted_next < row["gpax"]:
        explanation.append("ค่าคาดการณ์เทอมถัดไปมีแนวโน้มลดลง")

    if not explanation:
        explanation.append("แนวโน้มโดยรวมยังอยู่ในเกณฑ์ค่อนข้างดี")

    return {
        "ai_risk_score": ai_score,
        "ai_risk_label": label,
        "factors": explanation,
        "predicted_next_gpax": predicted_next,
    }


def get_multi_course_opportunities(student_id):
    courses = get_student_courses(student_id)

    if not courses:
        return []

    top = sorted(
        courses,
        key=lambda x: float(x["impact_score"]),
        reverse=True
    )[:5]

    opportunities = []
    for item in top:
        current = float(item["grade_point"])
        if current >= 4.0:
            continue

        next_target = min(4.0, current + 0.5)
        opportunities.append({
            "course_code": item["course_code"],
            "course_name": item["course_name"],
            "current_grade_point": current,
            "target_grade_point": round(next_target, 2),
            "impact_score": float(item["impact_score"]),
            "priority": "High" if float(item["impact_score"]) >= 2.5 else "Medium",
        })

    return opportunities


def get_student_dashboard(student_id):
    summary = calculate_student_gpax()
    summary = add_risk_metrics(summary)

    student_df = summary[summary["student_id"] == student_id]

    if student_df.empty:
        return None

    student = student_df.iloc[0].to_dict()
    student["risk_reasons"] = generate_risk_reasons(student)
    student["alerts"] = generate_alerts(student)
    student["section_distribution"] = get_section_distribution(summary, student["section"])
    student["course_priority"] = get_course_priority(student_id)

    trend_data = get_student_semester_trend(student_id)
    student["semester_trend"] = trend_data["trend"]
    student["predicted_next_gpax"] = trend_data["predicted_next_gpax"]
    student["trend_label"] = trend_data["trend_label"]

    student["smart_recommendations"] = generate_smart_recommendations(student)
    student["ai_prediction"] = get_ai_risk_prediction(student_id)
    student["improvement_opportunities"] = get_multi_course_opportunities(student_id)

    return student


def get_section_leaderboard(section):
    summary = calculate_student_gpax()
    summary = add_risk_metrics(summary)

    section_df = summary[summary["section"] == section].copy()

    if section_df.empty:
        return []

    section_df = section_df.sort_values(
        by=["gpax", "overall_rank"],
        ascending=[False, True]
    ).reset_index(drop=True)

    result = []
    for _, row in section_df.iterrows():
        result.append({
            "student_id": row["student_id"],
            "name": row["name"],
            "section": row["section"],
            "gpax": round(float(row["gpax"]), 2),
            "overall_rank": int(row["overall_rank"]),
            "section_rank": int(row["section_rank"]),
            "section_total": int(row["section_total"]),
            "percentile": round(float(row["percentile"]), 1),
            "risk_score": round(float(row["risk_score"]), 1),
            "risk": row["risk"],
        })

    return result