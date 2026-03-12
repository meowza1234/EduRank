import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "./config";

function StudentListPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("ALL");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    const role = String(localUser.role || "").toLowerCase();
    if (!["admin", "instructor"].includes(role)) {
      setForbidden(true);
      setLoading(false);
      return;
    }

    fetch(API_URL + "/students-list", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return null;
        }
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setStudents(data.students || []);
      })
      .catch((e) => setError("โหลดข้อมูลไม่สำเร็จ: " + e.message))
      .finally(() => setLoading(false));
  }, []);

  const sections = ["ALL", ...Array.from(new Set(students.map((s) => s.section).filter(Boolean))).sort()];

  const filtered = students.filter((s) => {
    const matchSection = sectionFilter === "ALL" || s.section === sectionFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.student_id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q);
    return matchSection && matchSearch;
  });

  if (forbidden) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ color: "#b91c1c", marginTop: 0 }}>ไม่มีสิทธิ์เข้าถึง</h2>
          <Link to="/" style={btnSecondary}>← ย้อนกลับ</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <h1 style={titleStyle}>รายชื่อนักศึกษาทั้งหมด</h1>
          <p style={subtitleStyle}>นักศึกษาที่ลงทะเบียนในระบบทั้งหมด รวมถึงผู้ที่ยังไม่มีเกรด</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/grade-entry" style={btnPrimary}>กรอกเกรด</Link>
          <Link to="/admin" style={btnSecondary}>← Admin Dashboard</Link>
        </div>
      </div>

      {/* Summary */}
      <div style={summaryRowStyle}>
        <div style={summaryCardStyle}>
          <p style={summaryLabelStyle}>นักศึกษาทั้งหมด</p>
          <h2 style={summaryValueStyle}>{students.length}</h2>
        </div>
        {sections.filter((s) => s !== "ALL").map((sec) => (
          <div key={sec} style={summaryCardStyle}>
            <p style={summaryLabelStyle}>{sec}</p>
            <h2 style={summaryValueStyle}>{students.filter((s) => s.section === sec).length}</h2>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={filterRowStyle}>
        <input
          type="text"
          placeholder="ค้นหารหัสหรือชื่อนักศึกษา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInputStyle}
        />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setSectionFilter(sec)}
              style={sectionFilter === sec ? activePillStyle : inactivePillStyle}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: "#64748b" }}>กำลังโหลด...</p>
        ) : error ? (
          <p style={{ color: "#dc2626" }}>{error}</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#64748b" }}>ไม่พบนักศึกษา</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>รหัสนักศึกษา</th>
                <th style={thStyle}>ชื่อ-นามสกุล</th>
                <th style={thStyle}>Section</th>
                <th style={thStyle}>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.student_id} style={i % 2 === 0 ? trEvenStyle : trOddStyle}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold", color: "#1d4ed8" }}>
                    {s.student_id}
                  </td>
                  <td style={tdStyle}>{s.name}</td>
                  <td style={tdStyle}>
                    <span style={sectionBadgeStyle}>{s.section || "TBD"}</span>
                  </td>
                  <td style={tdStyle}>
                    <Link
                      to={`/student/${s.student_id}`}
                      style={viewBtnStyle}
                    >
                      ดูข้อมูล
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

const titleStyle = { margin: 0, fontSize: "32px", color: "#0f172a" };
const subtitleStyle = { marginTop: "8px", marginBottom: 0, color: "#64748b" };

const summaryRowStyle = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "24px",
};

const summaryCardStyle = {
  backgroundColor: "white",
  borderRadius: "14px",
  padding: "18px 24px",
  boxShadow: "0 4px 12px rgba(15,23,42,0.07)",
  border: "1px solid #e2e8f0",
  minWidth: "120px",
};

const summaryLabelStyle = { margin: 0, fontSize: "13px", color: "#64748b", fontWeight: "bold" };
const summaryValueStyle = { margin: "8px 0 0 0", fontSize: "28px", color: "#0f172a" };

const filterRowStyle = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "20px",
};

const searchInputStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
  minWidth: "260px",
  outline: "none",
};

const activePillStyle = {
  padding: "8px 16px",
  borderRadius: "999px",
  border: "none",
  backgroundColor: "#2563eb",
  color: "white",
  fontWeight: "bold",
  fontSize: "13px",
  cursor: "pointer",
};

const inactivePillStyle = {
  padding: "8px 16px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  backgroundColor: "white",
  color: "#64748b",
  fontWeight: "bold",
  fontSize: "13px",
  cursor: "pointer",
};

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "18px",
  padding: "24px",
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  border: "1px solid #e2e8f0",
  overflowX: "auto",
};

const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "14px" };

const thStyle = {
  textAlign: "left",
  padding: "12px 16px",
  color: "#64748b",
  fontWeight: "bold",
  borderBottom: "2px solid #e2e8f0",
  backgroundColor: "#f8fafc",
};

const tdStyle = { padding: "12px 16px", color: "#334155", verticalAlign: "middle" };
const trEvenStyle = { backgroundColor: "white" };
const trOddStyle = { backgroundColor: "#f8fafc" };

const sectionBadgeStyle = {
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "6px",
  padding: "3px 10px",
  fontSize: "12px",
  fontWeight: "bold",
};

const viewBtnStyle = {
  textDecoration: "none",
  backgroundColor: "#f1f5f9",
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "6px 14px",
  fontSize: "13px",
  fontWeight: "bold",
};

const btnPrimary = {
  textDecoration: "none",
  padding: "10px 20px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "14px",
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

export default StudentListPage;
