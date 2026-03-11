import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "./config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

function DashboardPage() {
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isAdminUser = ["admin", "instructor"].includes(
    String(user.role || "").toLowerCase()
  );

  useEffect(() => {
    const loadDashboard = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setError("");

        const res = await fetch(API_URL + "/my-dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        if (!res.ok) {
          setError(data.error || "Failed to load dashboard");
          return;
        }

        setStudent(data);
      } catch (err) {
        console.error(err);
        setError("Something went wrong while loading dashboard");
      }
    };

    loadDashboard();
  }, [navigate, token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleExportReport = async () => {
  try {
    const res = await fetch(API_URL + "/export-report", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      alert("Export PDF ไม่สำเร็จ: " + text);
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "academic_report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาดขณะ export PDF");
  }
};

  const safeStudent = student || {};

  const gpax = Number(safeStudent.gpax ?? 0);
  const percentile = Number(safeStudent.percentile ?? 0);
  const sectionAvgGpax = Number(safeStudent.section_avg_gpax ?? 0);
  const sectionRank = safeStudent.section_rank ?? 0;
  const sectionTotal = safeStudent.section_total ?? 0;
  const riskScore = Number(safeStudent.risk_score ?? 0);
  const riskLevel = (safeStudent.risk || "Unknown").toString();

  const riskReasons = Array.isArray(safeStudent.risk_reasons)
    ? safeStudent.risk_reasons
    : [];

  const alerts = Array.isArray(safeStudent.alerts) ? safeStudent.alerts : [];

  const sectionDistribution = Array.isArray(safeStudent.section_distribution)
    ? safeStudent.section_distribution
    : [];

  const semesterTrend = Array.isArray(safeStudent.semester_trend)
    ? safeStudent.semester_trend
    : [];

  const smartRecommendations = Array.isArray(safeStudent.smart_recommendations)
    ? safeStudent.smart_recommendations
    : [];

  const opportunities = Array.isArray(safeStudent.improvement_opportunities)
    ? safeStudent.improvement_opportunities
    : [];

  const aiPrediction = safeStudent.ai_prediction || null;

  const predictedNextGpax =
    safeStudent.predicted_next_gpax !== null &&
    safeStudent.predicted_next_gpax !== undefined
      ? Number(safeStudent.predicted_next_gpax)
      : null;

  const trendLabel = (safeStudent.trend_label || "Stable").toString();

  const riskMeta = useMemo(() => {
    const value = riskLevel.toLowerCase();

    if (value === "low") {
      return {
        bg: "#dcfce7",
        text: "#166534",
        border: "#86efac",
        label: "Low Risk",
      };
    }

    if (value === "medium") {
      return {
        bg: "#fef3c7",
        text: "#92400e",
        border: "#fcd34d",
        label: "Medium Risk",
      };
    }

    if (value === "high") {
      return {
        bg: "#fee2e2",
        text: "#991b1b",
        border: "#fca5a5",
        label: "High Risk",
      };
    }

    return {
      bg: "#e2e8f0",
      text: "#334155",
      border: "#cbd5e1",
      label: riskLevel,
    };
  }, [riskLevel]);

  const trendMeta = useMemo(() => {
    const value = trendLabel.toLowerCase();

    if (value === "improving") {
      return {
        bg: "#dcfce7",
        text: "#166534",
        border: "#86efac",
        label: "Improving",
      };
    }

    if (value === "declining") {
      return {
        bg: "#fee2e2",
        text: "#991b1b",
        border: "#fca5a5",
        label: "Declining",
      };
    }

    return {
      bg: "#e0f2fe",
      text: "#075985",
      border: "#7dd3fc",
      label: "Stable",
    };
  }, [trendLabel]);

  const aiMeta = useMemo(() => {
    const value = (aiPrediction?.ai_risk_label || "Low").toLowerCase();

    if (value === "high") {
      return { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };
    }
    if (value === "medium") {
      return { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" };
    }
    return { bg: "#dcfce7", text: "#166534", border: "#86efac" };
  }, [aiPrediction]);

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#b91c1c" }}>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Loading dashboard...</h2>
          <p style={{ color: "#64748b" }}>Please wait while your dashboard is loading.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <h1 style={titleStyle}>EduRank Analytics</h1>
          <p style={subtitleStyle}>
            Welcome {user.name || "Student"} ({user.student_id || "N/A"})
          </p>
        </div>

        <div style={topBarRightStyle}>
          <Link to={`/student/${safeStudent.student_id || user.student_id || ""}`} style={linkButtonStyle}>
            Open My Detail
          </Link>
          <Link to="/my-courses" style={linkButtonStyle}>
            Course Analyzer
          </Link>
          <Link to="/planner" style={linkButtonStyle}>
            AI Grade Planner
          </Link>
          <Link to="/leaderboard" style={linkButtonStyle}>
            Section Insight
          </Link>
          {isAdminUser && (
          <Link to="/admin" style={linkButtonStyle}>
            Admin Dashboard
          </Link>
          )}

         <button onClick={handleExportReport} style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "10px",
            backgroundColor: "#16a34a",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer"
          }}>
            Export Academic Report
          </button>

          <button onClick={handleLogout} style={logoutButtonStyle}>
            Logout
          </button>
        </div>
      </div>

      <div style={heroCardStyle}>
        <div>
          <p style={heroMetaStyle}>
            Section: <strong>{safeStudent.section || "-"}</strong>
          </p>
          <h2 style={heroTitleStyle}>AI Academic Risk Intelligence System</h2>
          <p style={heroSubtitleStyle}>
            ติดตาม GPAX, ความเสี่ยง, แนวโน้มผลการเรียน, และโอกาสในการปรับปรุงแบบรวมศูนย์
          </p>
        </div>

        <div
          style={{
            ...pillStyle,
            backgroundColor: riskMeta.bg,
            color: riskMeta.text,
            border: `1px solid ${riskMeta.border}`,
            fontSize: "14px",
          }}
        >
          {riskMeta.label}
        </div>
      </div>

      <div style={statsGridStyle}>
        <StatCard title="GPAX" value={gpax.toFixed(2)} hint="Current cumulative GPA" />
        <StatCard title="Section Rank" value={`${sectionRank} / ${sectionTotal}`} hint="Your section standing" />
        <StatCard title="Percentile" value={`${percentile.toFixed(1)}%`} hint="Relative position" />
        <StatCard title="Risk Score" value={riskScore.toFixed(1)} hint="Current academic risk" />
        <StatCard
          title="Predicted Next GPAX"
          value={predictedNextGpax !== null ? predictedNextGpax.toFixed(2) : "-"}
          hint="Projected from trend"
        />
        <StatCard
          title="AI Risk Score"
          value={aiPrediction ? Number(aiPrediction.ai_risk_score).toFixed(1) : "-"}
          hint="AI-enhanced prediction"
        />
      </div>

      <div style={contentGridStyle}>
        <Card title="AI Risk Prediction">
          {!aiPrediction ? (
            <p style={emptyTextStyle}>No AI prediction available</p>
          ) : (
            <>
              <div style={aiBoxStyle}>
                <div>
                  <p style={miniLabelStyle}>AI Risk Label</p>
                  <h3 style={bigValueStyle}>{aiPrediction.ai_risk_label}</h3>
                </div>
                <span
                  style={{
                    ...pillStyle,
                    backgroundColor: aiMeta.bg,
                    color: aiMeta.text,
                    border: `1px solid ${aiMeta.border}`,
                  }}
                >
                  Score {Number(aiPrediction.ai_risk_score).toFixed(1)}
                </span>
              </div>

              <ul style={listStyle}>
                {(aiPrediction.factors || []).map((item, index) => (
                  <li key={index} style={listItemStyle}>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Trend Overview">
          <div style={insightBoxStyle}>
            <p style={insightTextStyle}>
              Current risk:{" "}
              <span
                style={{
                  ...pillStyle,
                  backgroundColor: riskMeta.bg,
                  color: riskMeta.text,
                  border: `1px solid ${riskMeta.border}`,
                }}
              >
                {riskMeta.label}
              </span>
            </p>

            <p style={insightTextStyle}>
              Trend status:{" "}
              <span
                style={{
                  ...pillStyle,
                  backgroundColor: trendMeta.bg,
                  color: trendMeta.text,
                  border: `1px solid ${trendMeta.border}`,
                }}
              >
                {trendMeta.label}
              </span>
            </p>

            <p style={{ ...insightTextStyle, marginBottom: 0 }}>
              Section average GPAX: <strong>{sectionAvgGpax.toFixed(2)}</strong>
            </p>
          </div>
        </Card>
      </div>

      <div style={contentGridStyle}>
        <Card title="Semester GPA Trend">
          {semesterTrend.length === 0 ? (
            <p style={emptyTextStyle}>No semester trend data available</p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={semesterTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semester" />
                  <YAxis domain={[0, 4]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="semester_gpa" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Section GPA Distribution">
          {sectionDistribution.length === 0 ? (
            <p style={emptyTextStyle}>No GPA distribution data available</p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={sectionDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div style={contentGridStyle}>
        <Card title="Improvement Opportunities">
          {opportunities.length === 0 ? (
            <p style={emptyTextStyle}>No improvement opportunities available</p>
          ) : (
            <div style={opportunityListStyle}>
              {opportunities.map((item, index) => (
                <div key={`${item.course_code}-${index}`} style={opportunityCardStyle}>
                  <div>
                    <p style={courseCodeStyle}>{item.course_code}</p>
                    <h3 style={courseTitleStyle}>{item.course_name}</h3>
                    <p style={courseMetaStyle}>
                      Current {Number(item.current_grade_point).toFixed(2)} → Target {Number(item.target_grade_point).toFixed(2)}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={priorityPillStyle}>{item.priority}</span>
                    <p style={impactTextStyle}>Impact {Number(item.impact_score).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="AI Study Strategy">
          {smartRecommendations.length === 0 ? (
            <p style={emptyTextStyle}>No smart recommendations available</p>
          ) : (
            <ul style={listStyle}>
              {smartRecommendations.map((item, index) => (
                <li key={index} style={listItemStyle}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div style={contentGridStyle}>
        <Card title="Risk Explanation">
          {riskReasons.length === 0 ? (
            <p style={emptyTextStyle}>No risk explanation available</p>
          ) : (
            <ul style={listStyle}>
              {riskReasons.map((item, index) => (
                <li key={index} style={listItemStyle}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Alerts">
          {alerts.length === 0 ? (
            <p style={emptyTextStyle}>No alerts right now</p>
          ) : (
            <ul style={listStyle}>
              {alerts.map((item, index) => (
                <li key={index} style={alertItemStyle}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Card>
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

const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "24px",
};

const topBarRightStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
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
  background: "linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)",
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
  maxWidth: "700px",
  lineHeight: 1.6,
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
  marginBottom: "20px",
  color: "#0f172a",
  fontSize: "20px",
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

const logoutButtonStyle = {
  padding: "10px 16px",
  border: "none",
  borderRadius: "10px",
  backgroundColor: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const listStyle = {
  margin: 0,
  paddingLeft: "20px",
};

const listItemStyle = {
  marginBottom: "10px",
  color: "#334155",
  lineHeight: 1.7,
};

const alertItemStyle = {
  marginBottom: "10px",
  color: "#9a3412",
  lineHeight: 1.7,
};

const emptyTextStyle = {
  margin: 0,
  color: "#94a3b8",
};

const pillStyle = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const aiBoxStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const miniLabelStyle = {
  margin: 0,
  color: "#64748b",
  fontWeight: "bold",
  fontSize: "13px",
};

const bigValueStyle = {
  margin: "8px 0 0 0",
  color: "#0f172a",
  fontSize: "30px",
};

const insightBoxStyle = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "18px",
};

const insightTextStyle = {
  marginTop: 0,
  marginBottom: "12px",
  color: "#334155",
  lineHeight: 1.7,
};

const opportunityListStyle = {
  display: "grid",
  gap: "14px",
};

const opportunityCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "center",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "16px",
};

const courseCodeStyle = {
  margin: 0,
  color: "#2563eb",
  fontWeight: "bold",
  fontSize: "13px",
};

const courseTitleStyle = {
  margin: "6px 0",
  color: "#0f172a",
};

const courseMetaStyle = {
  margin: 0,
  color: "#64748b",
};

const priorityPillStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
  fontWeight: "bold",
  fontSize: "12px",
};

const impactTextStyle = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#0f172a",
  fontWeight: "bold",
};

export default DashboardPage;