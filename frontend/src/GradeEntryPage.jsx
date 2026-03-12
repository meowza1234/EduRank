import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API_URL from "./config";

const GRADE_OPTIONS = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];

function GradeEntryPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState("2025-1");
  const [courseCode, setCourseCode] = useState("");
  const [gradeLetter, setGradeLetter] = useState("B");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const role = String(localUser.role || "").toLowerCase();
    if (!["admin", "instructor"].includes(role)) {
      setForbidden(true);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch(API_URL + "/students-list", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_URL + "/courses", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (sRes.status === 401 || cRes.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        if (sRes.status === 403 || cRes.status === 403) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        const sData = await sRes.json();
        const cData = await cRes.json();
        setStudents(sData.students || []);
        setCourses(cData.courses || []);
        if ((sData.students || []).length > 0) setStudentId(sData.students[0].student_id);
        if ((cData.courses || []).length > 0) setCourseCode(cData.courses[0].course_code);
      } catch (e) {
        setError("โหลดข้อมูลไม่สำเร็จ: " + e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setSaveError("");

    try {
      const res = await fetch(API_URL + "/grades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ student_id: studentId, semester, course_code: courseCode, grade_letter: gradeLetter }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "บันทึกไม่สำเร็จ");
      } else {
        setSaveMsg(data.message + (data.updated ? " (อัปเดตแล้ว)" : " (เพิ่มใหม่)"));
      }
    } catch (e) {
      setSaveError("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ color: "#b91c1c", marginTop: 0 }}>ไม่มีสิทธิ์เข้าถึง</h2>
          <p>หน้านี้สำหรับ admin หรือ instructor เท่านั้น</p>
          <Link to="/" style={btnSecondary}>← ย้อนกลับ</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p>กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ color: "#b91c1c", marginTop: 0 }}>Error</h2>
          <p>{error}</p>
          <Link to="/admin" style={btnSecondary}>← ย้อนกลับ</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <h1 style={titleStyle}>Grade Entry</h1>
          <p style={subtitleStyle}>กรอกหรืออัปเดตเกรดนักศึกษา</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Link to="/admin" style={btnSecondary}>← Admin Dashboard</Link>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: "20px" }}>บันทึกเกรด</h2>
        <p style={{ color: "#64748b", marginTop: 0, marginBottom: "24px" }}>
          หากมีเกรดอยู่แล้วในภาคเรียนและวิชานั้น ระบบจะอัปเดตให้อัตโนมัติ
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>นักศึกษา</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              style={selectStyle}
              required
            >
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.student_id} — {s.name} ({s.section})
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>ภาคการศึกษา</label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="เช่น 2025-1"
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>วิชา</label>
            <select
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              style={selectStyle}
              required
            >
              {courses.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} — {c.course_name} ({c.credits} หน่วยกิต)
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>เกรด</label>
            <select
              value={gradeLetter}
              onChange={(e) => setGradeLetter(e.target.value)}
              style={selectStyle}
              required
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {saveMsg && (
            <div style={successBoxStyle}>{saveMsg}</div>
          )}
          {saveError && (
            <div style={errorBoxStyle}>{saveError}</div>
          )}

          <button type="submit" disabled={saving} style={btnPrimary}>
            {saving ? "กำลังบันทึก..." : "บันทึกเกรด"}
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
};

const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
  flexWrap: "wrap",
  gap: "16px",
};

const titleStyle = {
  margin: 0,
  fontSize: "32px",
  color: "#0f172a",
};

const subtitleStyle = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#64748b",
};

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "18px",
  padding: "28px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e2e8f0",
  maxWidth: "640px",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle = {
  fontWeight: "bold",
  color: "#334155",
  fontSize: "14px",
};

const inputStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
  outline: "none",
};

const selectStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
  backgroundColor: "white",
  cursor: "pointer",
};

const btnPrimary = {
  padding: "12px 24px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
  alignSelf: "flex-start",
};

const btnSecondary = {
  textDecoration: "none",
  padding: "10px 20px",
  backgroundColor: "white",
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "14px",
};

const successBoxStyle = {
  backgroundColor: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
  borderRadius: "10px",
  padding: "12px 16px",
  fontWeight: "bold",
};

const errorBoxStyle = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
  borderRadius: "10px",
  padding: "12px 16px",
  fontWeight: "bold",
};

export default GradeEntryPage;
