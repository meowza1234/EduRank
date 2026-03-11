import csv
import os
import random

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

students_path = os.path.join(DATA_DIR, "students.csv")
users_path = os.path.join(DATA_DIR, "users.csv")
enrollments_path = os.path.join(DATA_DIR, "enrollments.csv")
courses_path = os.path.join(DATA_DIR, "courses.csv")


def ensure_courses():
    if os.path.exists(courses_path):
        return

    courses = [
        ["C101", "Mathematics", 3, "Core"],
        ["C102", "Programming", 3, "Core"],
        ["C103", "Database", 3, "Core"],
        ["C104", "Networks", 3, "Core"],
        ["C105", "Statistics", 3, "Support"],
        ["C106", "Cybersecurity Fundamentals", 3, "Core"],
        ["C107", "Operating Systems", 3, "Core"],
        ["C108", "Web Development", 3, "Support"],
    ]

    with open(courses_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["course_code", "course_name", "credits", "category"])
        writer.writerows(courses)


def generate_students():
    first_names = [
        "Anan", "Benjamas", "Chaiwat", "Duangkamol", "Ekkarat",
        "Fahsai", "Gun", "Hataichanok", "Ice", "Jirapat",
        "Kanda", "Lalita", "มนตรี", "Napat", "Orathai",
        "Phurin", "Qwan", "Ratchanon", "Sasiporn", "Thanawat",
        "Urai", "Voranan", "Waranya", "Xavier", "Yada",
        "Zin", "Aom", "Beam", "Cream", "Dream",
        "Earth", "Film", "Grace", "Honey", "Ing",
        "Jane", "Kaew", "Looknam", "Mint", "Ning",
        "Oat", "Ploy", "Queen", "Rin", "Som",
        "Tar", "Um", "View", "Waen", "Ying",
        "Atom", "Boss", "Champ", "Deen", "Em", "Fluke", "Game", "Hope", "Jom", "Knight"
    ]

    students = []
    users = []

    for i in range(60):
        student_id = f"S{str(i + 1).zfill(3)}"
        name = first_names[i]
        section = "SEC-A" if i < 20 else ("SEC-B" if i < 40 else "SEC-C")

        students.append([student_id, name, section])
        users.append([student_id, name, "1234", section, "student"])

    users.append(["A001", "Teacher Admin", "1234", "SEC-A", "admin"])
    users.append(["I001", "Instructor Demo", "1234", "SEC-B", "instructor"])

    with open(students_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["student_id", "name", "section"])
        writer.writerows(students)

    with open(users_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["student_id", "name", "password", "section", "role"])
        writer.writerows(users)


def grade_to_point(letter):
    mapping = {
        "A": 4.0,
        "A-": 3.7,
        "B+": 3.5,
        "B": 3.0,
        "C+": 2.5,
        "C": 2.0,
        "D+": 1.5,
        "D": 1.0,
        "F": 0.0,
    }
    return mapping[letter]


def point_to_letter(point):
    mapping = {
        4.0: "A",
        3.7: "A-",
        3.5: "B+",
        3.0: "B",
        2.5: "C+",
        2.0: "C",
        1.5: "D+",
        1.0: "D",
        0.0: "F",
    }
    return mapping[point]


def generate_enrollments():
    random.seed(42)

    course_codes_by_semester = {
        "2024-1": ["C101", "C102", "C103"],
        "2024-2": ["C104", "C105", "C106"],
        "2025-1": ["C107", "C108", "C102"],
    }

    # กลุ่มคะแนนให้ section ต่างกันนิดหน่อย
    section_grade_pool = {
        "SEC-A": [4.0, 3.7, 3.5, 3.0, 3.0, 3.7, 3.5, 2.5],
        "SEC-B": [3.7, 3.5, 3.0, 3.0, 2.5, 2.5, 3.5, 2.0],
        "SEC-C": [3.5, 3.0, 2.5, 2.5, 2.0, 3.0, 1.5, 3.5],
    }

    enrollments = []

    for i in range(60):
        student_id = f"S{str(i + 1).zfill(3)}"
        section = "SEC-A" if i < 20 else ("SEC-B" if i < 40 else "SEC-C")

        for semester, course_codes in course_codes_by_semester.items():
            for course_code in course_codes:
                point = random.choice(section_grade_pool[section])
                letter = point_to_letter(point)
                enrollments.append([
                    student_id,
                    semester,
                    course_code,
                    letter,
                    point
                ])

    with open(enrollments_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["student_id", "semester", "course_code", "grade_letter", "grade_point"])
        writer.writerows(enrollments)


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    ensure_courses()
    generate_students()
    generate_enrollments()
    print("Generated demo data for 60 students successfully.")