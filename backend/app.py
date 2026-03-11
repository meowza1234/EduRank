from flask import Flask, jsonify, request, send_file
from analytics import (
    get_student_dashboard,
    get_student_courses,
    simulate_course_improvement,
    get_section_leaderboard,
    get_ai_risk_prediction,
)
from pdf_report import generate_student_report
import os
import pandas as pd
import secrets

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        from flask import make_response
        response = make_response("", 204)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

TOKENS = {}
ADMIN_ROLES = {"admin", "instructor"}


def load_users():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    users_path = os.path.join(base_dir, "..", "data", "users.csv")
    df = pd.read_csv(users_path, dtype=str)
    df["student_id"] = df["student_id"].str.strip()
    df["password"] = df["password"].str.strip()
    df["role"] = df["role"].fillna("").str.strip().str.lower()
    df["section"] = df["section"].fillna("").str.strip()
    df["name"] = df["name"].fillna("").str.strip()
    return df


def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.replace("Bearer ", "").strip()
    student_id = TOKENS.get(token)

    if not student_id:
        return None

    users = load_users()
    user_df = users[users["student_id"] == student_id]
    if user_df.empty:
        return None

    return user_df.iloc[0].to_dict()


def is_admin_user(user):
    if not user:
        return False
    return str(user.get("role", "")).lower() in ADMIN_ROLES


def get_available_sections():
    users = load_users()
    student_rows = users[users["role"] == "student"].copy()
    sections = sorted(
        [section for section in student_rows["section"].dropna().unique().tolist() if section]
    )
    return sections


def get_student_rows_for_sections(section_filter="ALL"):
    users = load_users()
    student_rows = users[users["role"] == "student"].copy()

    if section_filter != "ALL":
        student_rows = student_rows[student_rows["section"] == section_filter].copy()

    student_rows = student_rows.sort_values(by=["student_id"]).reset_index(drop=True)
    return student_rows


def build_admin_dashboard_payload(section_filter):
    student_rows = get_student_rows_for_sections(section_filter)

    students = []
    high_risk = 0
    medium_risk = 0
    low_risk = 0
    improving = 0
    stable = 0
    declining = 0

    total_gpax = 0.0
    top_gpax = 0.0

    for _, row in student_rows.iterrows():
        detail = get_student_dashboard(row["student_id"])
        if not detail:
            continue

        gpax = float(detail.get("gpax", 0))
        risk = str(detail.get("risk", "Low"))
        trend = str(detail.get("trend_label", "Stable"))
        predicted_next_gpax = detail.get("predicted_next_gpax", None)

        total_gpax += gpax
        top_gpax = max(top_gpax, gpax)

        if risk == "High":
            high_risk += 1
        elif risk == "Medium":
            medium_risk += 1
        else:
            low_risk += 1

        if trend == "Improving":
            improving += 1
        elif trend == "Declining":
            declining += 1
        else:
            stable += 1

        top_focus_course = None
        if detail.get("course_priority"):
            top_course = detail["course_priority"][0]
            top_focus_course = {
                "course_code": top_course.get("course_code"),
                "course_name": top_course.get("course_name"),
                "impact_score": top_course.get("impact_score"),
            }

        ai_prediction = detail.get("ai_prediction", {}) or {}

        students.append({
            "student_id": detail.get("student_id"),
            "name": detail.get("name"),
            "section": detail.get("section"),
            "gpax": round(gpax, 2),
            "section_rank": detail.get("section_rank"),
            "section_total": detail.get("section_total"),
            "overall_rank": detail.get("overall_rank"),
            "percentile": detail.get("percentile"),
            "risk": risk,
            "risk_score": detail.get("risk_score"),
            "trend_label": trend,
            "predicted_next_gpax": predicted_next_gpax,
            "alerts": detail.get("alerts", []),
            "risk_reasons": detail.get("risk_reasons", []),
            "top_focus_course": top_focus_course,
            "ai_prediction": ai_prediction,
        })

    # เรียงตามรหัสนักศึกษา
    students = sorted(students, key=lambda x: str(x.get("student_id", "")))

    total_students = len(students)
    avg_gpax = round(total_gpax / total_students, 2) if total_students > 0 else 0.0

    high_risk_students = sorted(
        [s for s in students if s["risk"] == "High"],
        key=lambda x: str(x.get("student_id", ""))
    )
    medium_risk_students = sorted(
        [s for s in students if s["risk"] == "Medium"],
        key=lambda x: str(x.get("student_id", ""))
    )

    # top students ยังเก็บไว้ แต่จะให้ฝั่ง frontend ไม่แสดงก็ได้
    top_students = sorted(
        students,
        key=lambda x: (-float(x.get("gpax", 0)), str(x.get("student_id", "")))
    )[:5]

    return {
        "selected_section": section_filter,
        "available_sections": ["ALL"] + get_available_sections(),
        "summary": {
            "total_students": total_students,
            "avg_gpax": avg_gpax,
            "top_gpax": round(top_gpax, 2),
            "high_risk_count": high_risk,
            "medium_risk_count": medium_risk,
            "low_risk_count": low_risk,
        },
        "risk_distribution": [
            {"label": "High", "count": high_risk},
            {"label": "Medium", "count": medium_risk},
            {"label": "Low", "count": low_risk},
        ],
        "trend_distribution": [
            {"label": "Improving", "count": improving},
            {"label": "Stable", "count": stable},
            {"label": "Declining", "count": declining},
        ],
        "students": students,
        "high_risk_students": high_risk_students,
        "medium_risk_students": medium_risk_students,
        "top_students": top_students,
    }


@app.route("/")
def home():
    return jsonify({"message": "EduRank Analytics API is running"})


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    student_id = str(data.get("student_id", "")).strip()
    name = str(data.get("name", "")).strip()
    password = str(data.get("password", "")).strip()
    section = str(data.get("section", "")).strip() or "TBD"

    if not student_id or not name or not password:
        return jsonify({"error": "กรุณากรอกข้อมูลให้ครบทุกช่อง"}), 400

    if len(password) < 4:
        return jsonify({"error": "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"}), 400

    users = load_users()
    if not users[users["student_id"] == student_id].empty:
        return jsonify({"error": "รหัสนักศึกษานี้ถูกลงทะเบียนแล้ว"}), 409

    base_dir = os.path.dirname(os.path.abspath(__file__))
    users_path = os.path.join(base_dir, "..", "data", "users.csv")

    # อ่านไฟล์เพื่อเช็คว่าบรรทัดสุดท้ายลงท้ายด้วย newline หรือไม่
    with open(users_path, "rb") as f:
        f.seek(0, 2)
        ends_with_newline = f.read(1) == b"\n" if f.tell() > 0 else True
    with open(users_path, "a", encoding="utf-8", newline="") as f:
        if not ends_with_newline:
            f.write("\n")
        f.write(f"{student_id},{name},{password},{section},student\n")

    token = secrets.token_hex(16)
    TOKENS[token] = student_id

    return jsonify({
        "message": "ลงทะเบียนสำเร็จ",
        "token": token,
        "user": {
            "student_id": student_id,
            "name": name,
            "section": section,
            "role": "student"
        }
    }), 201


@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        student_id = str(data.get("student_id", "")).strip()
        password = str(data.get("password", "")).strip()

        users = load_users()
        user_df = users[
            (users["student_id"] == student_id) &
            (users["password"] == password)
        ]

        if user_df.empty:
            return jsonify({"error": "Invalid student ID or password"}), 401

        user = user_df.iloc[0].to_dict()
        token = secrets.token_hex(16)
        TOKENS[token] = user["student_id"]

        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {
                "student_id": user["student_id"],
                "name": user["name"],
                "section": user["section"],
                "role": user["role"]
            }
        })
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@app.route("/me")
def me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    return jsonify({
        "student_id": user["student_id"],
        "name": user["name"],
        "section": user["section"],
        "role": user["role"],
        "is_admin": is_admin_user(user)
    })


@app.route("/my-dashboard")
def my_dashboard():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    dashboard = get_student_dashboard(user["student_id"])
    if not dashboard:
        # นักศึกษาสมัครใหม่ยังไม่มีข้อมูลเกรด — คืน empty dashboard
        dashboard = {
            "student_id": user["student_id"],
            "name": user["name"],
            "section": user.get("section", "TBD"),
            "gpax": 0.0,
            "overall_rank": 0,
            "section_rank": 0,
            "section_total": 0,
            "percentile": 0.0,
            "section_avg_gpax": 0.0,
            "section_median_gpax": 0.0,
            "risk_score": 0.0,
            "risk": "Low",
            "risk_reasons": ["ยังไม่มีข้อมูลผลการเรียนในระบบ"],
            "alerts": ["📋 ยังไม่มีข้อมูลผลการเรียน กรุณารอให้อาจารย์นำเข้าข้อมูลเกรด"],
            "section_distribution": [],
            "course_priority": [],
            "semester_trend": [],
            "predicted_next_gpax": None,
            "trend_label": "Stable",
            "smart_recommendations": ["เริ่มต้นได้เลย! เมื่ออาจารย์นำเข้าข้อมูลเกรดของคุณแล้ว ระบบจะวิเคราะห์และให้คำแนะนำการปรับปรุงผลการเรียนโดยอัตโนมัติ"],
            "ai_prediction": None,
            "improvement_opportunities": [],
        }

    return jsonify(dashboard)


@app.route("/my-courses")
def my_courses():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    courses = get_student_courses(user["student_id"])
    return jsonify(courses)


@app.route("/section-leaderboard")
def section_leaderboard():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    leaderboard = get_section_leaderboard(user["section"])

    return jsonify({
        "section": user["section"],
        "count": len(leaderboard),
        "students": leaderboard
    })


@app.route("/ai-prediction")
def ai_prediction():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    result = get_ai_risk_prediction(user["student_id"])
    if not result:
        return jsonify({"error": "Prediction not available"}), 404

    return jsonify(result)


@app.route("/admin-dashboard")
def admin_dashboard():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not is_admin_user(user):
        return jsonify({"error": "Forbidden: admin or instructor only"}), 403

    requested_section = str(request.args.get("section", "ALL")).strip()
    available_sections = get_available_sections()

    if requested_section != "ALL" and requested_section not in available_sections:
        return jsonify({"error": "Invalid section"}), 400

    payload = build_admin_dashboard_payload(requested_section)
    payload["viewer"] = {
        "student_id": user["student_id"],
        "name": user["name"],
        "role": user.get("role", ""),
        "section": user["section"],
    }

    return jsonify(payload)


@app.route("/export-report")
def export_report():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    student = get_student_dashboard(user["student_id"])
    if not student:
        return jsonify({"error": "Student not found"}), 404

    pdf_buffer = generate_student_report(student)

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"academic_report_{user['student_id']}.pdf",
        mimetype="application/pdf",
    )


@app.route("/simulate-course", methods=["POST"])
def simulate_course():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    course_code = data.get("course_code")
    new_grade_point = data.get("new_grade_point")

    if not course_code or new_grade_point is None:
        return jsonify({"error": "course_code and new_grade_point are required"}), 400

    result = simulate_course_improvement(
        user["student_id"],
        course_code,
        float(new_grade_point)
    )

    if not result:
        return jsonify({"error": "Course not found for this student"}), 404

    return jsonify(result)


@app.route("/student/<student_id>")
def student_detail(student_id):
    data = get_student_dashboard(student_id)
    if not data:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(data)


@app.route("/planner", methods=["POST"])
def grade_planner():
    data = request.get_json()

    current_gpax = float(data.get("current_gpax", 0))
    earned_credits = float(data.get("earned_credits", 0))
    remaining_credits = float(data.get("remaining_credits", 0))
    target_gpax = float(data.get("target_gpax", 0))

    if remaining_credits <= 0:
        return jsonify({"error": "หน่วยกิตที่เหลือต้องมากกว่า 0"}), 400

    required_gpa = (
        (target_gpax * (earned_credits + remaining_credits)) -
        (current_gpax * earned_credits)
    ) / remaining_credits

    required_gpa = round(required_gpa, 2)
    possible = 0.0 <= required_gpa <= 4.0

    if required_gpa <= 2.5:
        difficulty_level = "ง่าย"
    elif required_gpa <= 3.2:
        difficulty_level = "ปานกลาง"
    elif required_gpa <= 4.0:
        difficulty_level = "ท้าทาย"
    else:
        difficulty_level = "แทบเป็นไปไม่ได้"

    recommendations = []

    if not possible:
        recommendations.append(
            "เป้าหมาย GPAX นี้อาจสูงเกินไปเมื่อเทียบกับหน่วยกิตที่เหลือ ลองปรับเป้าหมายหรือวางแผนระยะยาวแทน"
        )
    else:
        recommendations.append(
            f"คุณต้องได้ GPA เฉลี่ยประมาณ {required_gpa} ในภาคการศึกษาถัดไป เพื่อให้ GPAX ถึงเป้าหมาย"
        )

        if required_gpa >= 3.5:
            recommendations.append(
                "ควรโฟกัสวิชาที่หน่วยกิตสูงก่อน เพราะจะมีผลต่อ GPAX มากที่สุด"
            )

        if target_gpax - current_gpax >= 0.4:
            recommendations.append(
                "เป้าหมายสูงกว่าค่า GPAX ปัจจุบันค่อนข้างมาก คุณต้องรักษาผลการเรียนให้ดีในทุกวิชา"
            )

        if required_gpa < 3.0:
            recommendations.append(
                "เป้าหมายนี้ทำได้ไม่ยาก หากคุณรักษาผลการเรียนให้สม่ำเสมอและหลีกเลี่ยงเกรดต่ำ"
            )

        if 3.0 <= required_gpa <= 3.5:
            recommendations.append(
                "ควรเตรียมตัวสอบ ทำการบ้านให้ครบ และบริหารเวลาอ่านหนังสือให้ดี"
            )

        if required_gpa > 3.7:
            recommendations.append(
                "คุณอาจต้องได้เกรด A หรือ B+ ในหลายวิชาเพื่อให้ถึงเป้าหมายนี้"
            )

    return jsonify({
        "current_gpax": current_gpax,
        "earned_credits": earned_credits,
        "remaining_credits": remaining_credits,
        "target_gpax": target_gpax,
        "required_semester_gpa": required_gpa,
        "possible": possible,
        "difficulty_level": difficulty_level,
        "recommendations": recommendations
    })


@app.route("/simulate", methods=["POST"])
def simulate_scenario():
    data = request.get_json()

    current_gpax = float(data.get("current_gpax", 0))
    earned_credits = float(data.get("earned_credits", 0))
    remaining_credits = float(data.get("remaining_credits", 0))
    expected_semester_gpa = float(data.get("expected_semester_gpa", 0))
    target_gpax = float(data.get("target_gpax", 0))

    if remaining_credits <= 0:
        return jsonify({"error": "หน่วยกิตที่เหลือต้องมากกว่า 0"}), 400

    projected_gpax = (
        (current_gpax * earned_credits) +
        (expected_semester_gpa * remaining_credits)
    ) / (earned_credits + remaining_credits)

    projected_gpax = round(projected_gpax, 2)

    if projected_gpax < 2.5:
        risk_level = "High"
    elif projected_gpax < 3.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    ai_advice = []

    if projected_gpax < 3.0:
        ai_advice.append("ควรเร่งปรับผลการเรียนในวิชาหลักและหลีกเลี่ยงเกรดต่ำกว่า B")
    else:
        ai_advice.append("แนวโน้มผลการเรียนอยู่ในระดับดี หากรักษาความสม่ำเสมอจะช่วยดัน GPAX ได้ต่อเนื่อง")

    if expected_semester_gpa >= 3.5:
        ai_advice.append("หากคุณทำ GPA เทอมนี้ได้ตามเป้า จะช่วยเพิ่ม GPAX ได้อย่างชัดเจน")

    if remaining_credits >= 15:
        ai_advice.append("คุณยังมีหน่วยกิตเหลือมากพอที่จะปรับสถานะทางวิชาการได้")
    else:
        ai_advice.append("หน่วยกิตที่เหลือไม่มาก ควรโฟกัสทุกวิชาให้ดีที่สุดเพราะมีผลต่อ GPAX โดยตรง")

    if target_gpax > projected_gpax:
        ai_advice.append("จากสถานการณ์นี้ GPAX ที่คาดการณ์ยังต่ำกว่าเป้าหมาย ควรเพิ่ม GPA เทอมนี้ให้สูงขึ้นอีก")
    else:
        ai_advice.append("จากสถานการณ์นี้ คุณมีโอกาสแตะหรือเข้าใกล้เป้าหมาย GPAX ที่ตั้งไว้")

    return jsonify({
        "current_gpax": current_gpax,
        "earned_credits": earned_credits,
        "remaining_credits": remaining_credits,
        "expected_semester_gpa": expected_semester_gpa,
        "target_gpax": target_gpax,
        "projected_gpax": projected_gpax,
        "risk_level": risk_level,
        "ai_advice": ai_advice
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)