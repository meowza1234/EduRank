import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "./config";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [selectedSection, setSelectedSection] = useState("ALL");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");

  const loadAdminDashboard = async (sectionValue = "ALL") => {
    if (!token) {
      navigate("/login");
      return;
    }

    const localRole = String(localUser.role || "").toLowerCase();
    if (!["admin", "instructor"].includes(localRole)) {
      setForbidden(true);
      return;
    }

    try {
      setError("");

      const meRes = await fetch(API_URL + "/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const meData = await meRes.json();

      if (meRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!meRes.ok) {
        setError(meData.error || "Failed to verify user");
        return;
      }

      if (!meData.is_admin) {
        setForbidden(true);
        return;
      }

      setViewer(meData);

      const res = await fetch(
        API_URL + `/admin-dashboard?section=${encodeURIComponent(sectionValue)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await res.json();

      if (res.status === 403) {
        setForbidden(true);
        return;
      }

      if (!res.ok) {
        setError(result.error || "Failed to load admin dashboard");
        return;
      }

      setData(result);
      setSelectedSection(result.selected_section || "ALL");
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading admin dashboard");
    }
  };

  useEffect(() => {
    loadAdminDashboard("ALL");
  }, []);

  const summary = data?.summary || {
    total_students: 0,
    avg_gpax: 0,
    top_gpax: 0,
    high_risk_count: 0,
    medium_risk_count: 0,
    low_risk_count: 0,
  };

  const students = useMemo(() => {
    const rows = Array.isArray(data?.students) ? data.students : [];
    return [...rows].sort((a, b) =>
      String(a.student_id || "").localeCompare(String(b.student_id || ""))
    );
  }, [data]);

  const highRiskStudents = useMemo(() => {
    const rows = Array.isArray(data?.high_risk_students) ? data.high_risk_students : [];
    return [...rows].sort((a, b) =>
      String(a.student_id || "").localeCompare(String(b.student_id || ""))
    );
  }, [data]);

  const mediumRiskStudents = useMemo(() => {
    const rows = Array.isArray(data?.medium_risk_students)
      ? data.medium_risk_students
      : [];
    return [...rows].sort((a, b) =>
      String(a.student_id || "").localeCompare(String(b.student_id || ""))
    );
  }, [data]);

  const riskDistribution = Array.isArray(data?.risk_distribution)
    ? data.risk_distribution
    : [];
  const trendDistribution = Array.isArray(data?.trend_distribution)
    ? data.trend_distribution
    : [];
  const availableSections = Array.isArray(data?.available_sections)
    ? data.available_sections
    : ["ALL"];

  const atRiskStudents = useMemo(() => {
    return [...students].filter(
      (item) => item.risk === "High" || item.risk === "Medium"
    );
  }, [students]);

  const getRiskStyle = (risk) => {
    const value = String(risk || "").toLowerCase();

    if (value === "high") {
      return {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
      };
    }

    if (value === "medium") {
      return {
        backgroundColor: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
      };
    }

    return {
      backgroundColor: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
    };
  };

  const getTrendStyle = (trend) => {
    const value = String(trend || "").toLowerCase();

    if (value === "declining") {
      return {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
      };
    }

    if (value === "improving") {
      return {
        backgroundColor: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
    }

    return {
      backgroundColor: "#e0f2fe",
      color: "#075985",
      border: "1px solid #7dd3fc",
    };
  };

  if (forbidden) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#b91c1c" }}>Access Denied</h2>
          <p style={{ color: "#475569", lineHeight: 1.7 }}>
            หน้านี้สำหรับ admin หรือ instructor เท่านั้น
          </p>
          <Link to="/" style={linkButtonStyle}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#b91c1c" }}>Error</h2>
          <p>{error}</p>
          <Link to="/" style={linkButtonStyle}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Loading admin dashboard...</h2>
          <p style={{ color: "#64748b" }}>Please wait while analytics is loading.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={topHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Admin / Instructor Dashboard</h1>
          <p style={subtitleStyle}>
            Viewer: {viewer?.name || "-"} ({viewer?.role || "-"})
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link
            to="/grade-entry"
            style={{
              textDecoration: "none",
              padding: "10px 20px",
              border: "1px solid #2563eb",
              borderRadius: "10px",
              backgroundColor: "#2563eb",
              color: "white",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            กรอกเกรดนักศึกษา
          </Link>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "10px 20px",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              backgroundColor: "white",
              color: "#334155",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            ← ย้อนกลับ
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              navigate("/login");
            }}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "10px",
              backgroundColor: "#2563eb",
              color: "white",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={heroCardStyle}>
        <div>
          <p style={heroMetaStyle}>
            {selectedSection === "ALL"
              ? "ภาพรวมทุก Section"
              : `Section ${selectedSection}`}
          </p>
          <h2 style={heroTitleStyle}>Academic Monitoring & Risk Intelligence</h2>
          <p style={heroSubtitleStyle}>
            admin สามารถดูภาพรวมทุก section หรือกรองดูราย section ได้
            พร้อมติดตามกลุ่มเสี่ยงและแนวโน้มผลการเรียนทั้งหมด
          </p>
        </div>

        <div style={heroRightStyle}>
          <label style={selectLabelStyle}>เลือก Section</label>
          <select
            value={selectedSection}
            onChange={(e) => loadAdminDashboard(e.target.value)}
            style={selectStyle}
          >
            {availableSections.map((section) => (
              <option key={section} value={section}>
                {section === "ALL" ? "All Sections" : section}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={statsGridStyle}>
        <StatCard
          title="Total Students"
          value={String(summary.total_students)}
          hint="จำนวนนักศึกษาตาม filter"
        />
        <StatCard
          title="Average GPAX"
          value={Number(summary.avg_gpax).toFixed(2)}
          hint="ค่าเฉลี่ยสะสม"
        />
        <StatCard
          title="Top GPAX"
          value={Number(summary.top_gpax).toFixed(2)}
          hint="ผลการเรียนสูงสุด"
        />
        <StatCard
          title="High Risk"
          value={String(summary.high_risk_count)}
          hint="กลุ่มเสี่ยงสูง"
        />
        <StatCard
          title="Medium Risk"
          value={String(summary.medium_risk_count)}
          hint="กลุ่มเฝ้าระวัง"
        />
        <StatCard
          title="Low Risk"
          value={String(summary.low_risk_count)}
          hint="กลุ่มผลการเรียนดี"
        />
      </div>

      <div style={contentGridStyle}>
        <Card title="Risk Distribution">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Trend Distribution">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={trendDistribution}
                  dataKey="count"
                  nameKey="label"
                  outerRadius={95}
                  label
                >
                  {trendDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0
                          ? "#22c55e"
                          : index === 1
                          ? "#38bdf8"
                          : "#ef4444"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div style={contentGridStyle}>
        <Card title="At-risk Overview">
          <div style={riskOverviewBoxStyle}>
            <p style={riskOverviewTextStyle}>
              High Risk: <strong>{highRiskStudents.length}</strong>
            </p>
            <p style={riskOverviewTextStyle}>
              Medium Risk: <strong>{mediumRiskStudents.length}</strong>
            </p>
            <p style={{ ...riskOverviewTextStyle, marginBottom: 0 }}>
              Students needing follow-up:{" "}
              <strong>{highRiskStudents.length + mediumRiskStudents.length}</strong>
            </p>
          </div>
        </Card>

        <Card title="Admin Note">
          <div style={riskOverviewBoxStyle}>
            <p style={riskOverviewTextStyle}>
              ตารางทั้งหมดในหน้า admin ถูกจัดเรียงตาม <strong>รหัสนักศึกษา</strong>
            </p>
            <p style={{ ...riskOverviewTextStyle, marginBottom: 0 }}>
              ใช้ตัวเลือกด้านบนเพื่อสลับดูทุก section หรือดูเฉพาะ section ที่ต้องการ
            </p>
          </div>
        </Card>
      </div>

      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={cardTitleStyle}>Students Requiring Attention</h2>
            <p style={sectionSubStyle}>
              แสดงเฉพาะกลุ่ม High/Medium Risk และเรียงตามรหัสนักศึกษา
            </p>
          </div>
        </div>

        {atRiskStudents.length === 0 ? (
          <p style={emptyTextStyle}>No at-risk students found</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Student ID</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Section</th>
                  <th style={thStyle}>GPAX</th>
                  <th style={thStyle}>Risk</th>
                  <th style={thStyle}>Risk Score</th>
                  <th style={thStyle}>Trend</th>
                  <th style={thStyle}>Predicted GPAX</th>
                  <th style={thStyle}>Top Focus Course</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {atRiskStudents.map((student) => (
                  <tr key={student.student_id}>
                    <td style={tdStyle}>{student.student_id}</td>
                    <td style={tdStyle}>{student.name}</td>
                    <td style={tdStyle}>{student.section}</td>
                    <td style={tdStyle}>{Number(student.gpax).toFixed(2)}</td>
                    <td style={tdStyle}>
                      <span style={{ ...pillStyle, ...getRiskStyle(student.risk) }}>
                        {student.risk}
                      </span>
                    </td>
                    <td style={tdStyle}>{Number(student.risk_score).toFixed(1)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{ ...pillStyle, ...getTrendStyle(student.trend_label) }}
                      >
                        {student.trend_label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {student.predicted_next_gpax !== null &&
                      student.predicted_next_gpax !== undefined
                        ? Number(student.predicted_next_gpax).toFixed(2)
                        : "-"}
                    </td>
                    <td style={tdStyle}>
                      {student.top_focus_course ? (
                        <>
                          <strong>{student.top_focus_course.course_code}</strong>
                          <br />
                          <span style={{ color: "#64748b", fontSize: "13px" }}>
                            Impact {Number(
                              student.top_focus_course.impact_score || 0
                            ).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={tdStyle}>
                      <Link
                        to={`/student/${student.student_id}`}
                        style={detailLinkStyle}
                      >
                        View Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, marginTop: "24px" }}>
        <h2 style={cardTitleStyle}>Full Student Table</h2>
        <p style={sectionSubStyle}>
          ตารางภาพรวมทั้งหมด เรียงตามรหัสนักศึกษา และแสดงข้อมูลได้ครบทุก section ตาม filter
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Student ID</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Section</th>
                <th style={thStyle}>GPAX</th>
                <th style={thStyle}>Percentile</th>
                <th style={thStyle}>Risk</th>
                <th style={thStyle}>Trend</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.student_id}>
                  <td style={tdStyle}>{student.student_id}</td>
                  <td style={tdStyle}>{student.name}</td>
                  <td style={tdStyle}>{student.section}</td>
                  <td style={tdStyle}>{Number(student.gpax).toFixed(2)}</td>
                  <td style={tdStyle}>{Number(student.percentile).toFixed(1)}%</td>
                  <td style={tdStyle}>
                    <span style={{ ...pillStyle, ...getRiskStyle(student.risk) }}>
                      {student.risk}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{ ...pillStyle, ...getTrendStyle(student.trend_label) }}
                    >
                      {student.trend_label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <Link to={`/student/${student.student_id}`} style={detailLinkStyle}>
                      View Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, hint }) {
  return (
    <div style={statCardStyle}>
      <p style={statTitleStyle}>{title}</p>
      <h3 style={statValueStyle}>{value}</h3>
      <p style={statHintStyle}>{hint}</p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={cardStyle}>
      <h2 style={cardTitleStyle}>{title}</h2>
      {children}
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
};

const topHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "24px",
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
  fontSize: "15px",
};

const heroCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
  color: "white",
  borderRadius: "18px",
  padding: "24px",
  marginBottom: "24px",
};

const heroMetaStyle = {
  margin: 0,
  color: "#bfdbfe",
  fontSize: "14px",
};

const heroTitleStyle = {
  margin: "8px 0",
  fontSize: "28px",
};

const heroSubtitleStyle = {
  margin: 0,
  color: "#dbeafe",
  maxWidth: "680px",
  lineHeight: 1.6,
};

const heroRightStyle = {
  backgroundColor: "rgba(255,255,255,0.10)",
  padding: "18px 22px",
  borderRadius: "16px",
  minWidth: "220px",
};

const selectLabelStyle = {
  display: "block",
  color: "#dbeafe",
  marginBottom: "8px",
  fontSize: "14px",
  fontWeight: "bold",
};

const selectStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.3)",
  fontSize: "15px",
  boxSizing: "border-box",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
  marginBottom: "24px",
};

const statCardStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "22px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e2e8f0",
};

const statTitleStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
  fontWeight: "bold",
};

const statValueStyle = {
  margin: "12px 0 8px 0",
  fontSize: "32px",
  color: "#0f172a",
};

const statHintStyle = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "14px",
};

const contentGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "24px",
  marginBottom: "24px",
};

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "18px",
  padding: "24px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e2e8f0",
};

const cardTitleStyle = {
  marginTop: 0,
  marginBottom: "10px",
  color: "#0f172a",
  fontSize: "20px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const sectionSubStyle = {
  marginTop: 0,
  marginBottom: "14px",
  color: "#64748b",
};

const riskOverviewBoxStyle = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "18px",
};

const riskOverviewTextStyle = {
  marginTop: 0,
  marginBottom: "12px",
  color: "#334155",
  lineHeight: 1.7,
};

const emptyTextStyle = {
  margin: 0,
  color: "#94a3b8",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1100px",
};

const thStyle = {
  textAlign: "left",
  padding: "14px",
  borderBottom: "2px solid #e2e8f0",
  color: "#475569",
  fontSize: "14px",
  backgroundColor: "#f8fafc",
};

const tdStyle = {
  padding: "14px",
  borderBottom: "1px solid #e2e8f0",
  color: "#0f172a",
};

const pillStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const linkButtonStyle = {
  textDecoration: "none",
  backgroundColor: "white",
  color: "#1d4ed8",
  padding: "10px 16px",
  borderRadius: "10px",
  fontWeight: "bold",
  border: "1px solid #cbd5e1",
};

const detailLinkStyle = {
  textDecoration: "none",
  color: "#2563eb",
  fontWeight: "bold",
};

export default AdminDashboardPage;