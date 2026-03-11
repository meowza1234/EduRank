import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "./config";

function SectionLeaderboardPage() {
  const [students, setStudents] = useState([]);
  const [section, setSection] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(API_URL + "/section-leaderboard", {
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
          setError(data.error || "Failed to load leaderboard");
          return;
        }

        setStudents(Array.isArray(data.students) ? data.students : []);
        setSection(data.section || "");
      } catch (err) {
        console.error(err);
        setError("Something went wrong while loading leaderboard");
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [navigate, token]);

  const myRow = useMemo(() => {
    return students.find((item) => item.student_id === user.student_id) || null;
  }, [students, user.student_id]);

  const topGpax = useMemo(() => {
    if (!students.length) return 0;
    return Math.max(...students.map((item) => Number(item.gpax || 0)));
  }, [students]);

  const avgGpax = useMemo(() => {
    if (!students.length) return 0;
    const total = students.reduce((sum, item) => sum + Number(item.gpax || 0), 0);
    return total / students.length;
  }, [students]);

  const hideName = (name, studentId) => {
    if (studentId === user.student_id) return name;
    if (!name) return "Student";
    return `${name[0]}***`;
  };

  const riskBadge = (risk) => {
    const value = (risk || "").toLowerCase();

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

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Loading leaderboard...</h2>
          <p style={{ color: "#64748b" }}>Please wait while ranking data is loading.</p>
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

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <h1 style={titleStyle}>Section Insight Board</h1>
          <p style={subtitleStyle}>
            ใช้ดูอันดับของตัวเองเทียบกับ section โดยไม่เปิดข้อมูลเพื่อนแบบเต็ม
          </p>
        </div>

        <div style={topBarRightStyle}>
          <Link to="/" style={linkButtonStyle}>
            Dashboard
          </Link>
          <Link to="/student/{user.student_id}" style={{ display: "none" }}>
            hidden
          </Link>
          <Link to={`/student/${user.student_id || ""}`} style={linkButtonStyle}>
            Open My Detail
          </Link>
          <Link to="/planner" style={linkButtonStyle}>
            Grade Planner
          </Link>
          <Link to="/my-courses" style={linkButtonStyle}>
            Course Analyzer
          </Link>
        </div>
      </div>

      <div style={heroCardStyle}>
        <div>
          <p style={heroSectionStyle}>
            Section: <strong>{section || "-"}</strong>
          </p>
          <h2 style={heroTitleStyle}>My Position in Section</h2>
          <p style={heroSubtitleStyle}>
            ระบบนี้ออกแบบให้เหมาะกับนักศึกษา โดยเน้นดูอันดับและสถานะของตัวเอง
            พร้อม benchmark กับ section โดยไม่เปิดข้อมูลคนอื่นแบบละเอียด
          </p>
        </div>

        <div style={heroBadgeStyle}>{students.length} Students</div>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <p style={summaryLabelStyle}>My Rank</p>
          <h3 style={summaryValueStyle}>
            {myRow ? `#${myRow.section_rank}` : "-"}
          </h3>
          <p style={summaryHintStyle}>อันดับของคุณใน section</p>
        </div>

        <div style={summaryCardStyle}>
          <p style={summaryLabelStyle}>My GPAX</p>
          <h3 style={summaryValueStyle}>
            {myRow ? Number(myRow.gpax).toFixed(2) : "-"}
          </h3>
          <p style={summaryHintStyle}>ผลการเรียนสะสมของคุณ</p>
        </div>

        <div style={summaryCardStyle}>
          <p style={summaryLabelStyle}>Top GPAX</p>
          <h3 style={summaryValueStyle}>{topGpax.toFixed(2)}</h3>
          <p style={summaryHintStyle}>ค่าสูงสุดใน section</p>
        </div>

        <div style={summaryCardStyle}>
          <p style={summaryLabelStyle}>Section Avg</p>
          <h3 style={summaryValueStyle}>{avgGpax.toFixed(2)}</h3>
          <p style={summaryHintStyle}>ค่าเฉลี่ยของ section</p>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Leaderboard Table</h2>
        <p style={sectionSubStyle}>
          ชื่อของนักศึกษาคนอื่นถูกย่อไว้เพื่อให้เหมาะกับการใช้งานจริง
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Rank</th>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>GPAX</th>
                <th style={thStyle}>Percentile</th>
                <th style={thStyle}>Risk Score</th>
                <th style={thStyle}>Risk</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((item) => {
                const isMe = item.student_id === user.student_id;

                return (
                  <tr
                    key={item.student_id}
                    style={{
                      backgroundColor: isMe ? "#eff6ff" : "white",
                    }}
                  >
                    <td style={tdStyle}>
                      <strong>#{item.section_rank}</strong>
                    </td>
                    <td style={tdStyle}>
                      {hideName(item.name, item.student_id)}
                      {isMe ? " (You)" : ""}
                    </td>
                    <td style={tdStyle}>{Number(item.gpax).toFixed(2)}</td>
                    <td style={tdStyle}>{Number(item.percentile).toFixed(1)}%</td>
                    <td style={tdStyle}>{Number(item.risk_score).toFixed(1)}</td>
                    <td style={tdStyle}>
                      <span style={{ ...pillStyle, ...riskBadge(item.risk) }}>
                        {item.risk}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {isMe ? (
                        <Link to={`/student/${item.student_id}`} style={detailLinkStyle}>
                          View My Detail
                        </Link>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Private</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

const heroSectionStyle = {
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

const heroBadgeStyle = {
  backgroundColor: "white",
  color: "#1d4ed8",
  padding: "12px 18px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
  marginBottom: "24px",
};

const summaryCardStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e2e8f0",
};

const summaryLabelStyle = {
  margin: 0,
  color: "#64748b",
  fontWeight: "bold",
  fontSize: "14px",
};

const summaryValueStyle = {
  margin: "10px 0 6px 0",
  color: "#0f172a",
  fontSize: "28px",
};

const summaryHintStyle = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "14px",
};

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "18px",
  padding: "24px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e2e8f0",
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: "8px",
  color: "#0f172a",
};

const sectionSubStyle = {
  marginTop: 0,
  marginBottom: "18px",
  color: "#64748b",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "760px",
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

export default SectionLeaderboardPage;