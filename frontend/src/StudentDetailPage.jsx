import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API_URL from "./config";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function StudentDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdminUser = ["admin", "instructor"].includes(String(localUser.role || "").toLowerCase());

  useEffect(() => {
    const loadStudent = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setError("");

        const res = await fetch(API_URL + `/student/${studentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load student detail");
          return;
        }

        setStudent(data);
      } catch (err) {
        console.error(err);
        setError("Something went wrong while loading student detail");
      }
    };

    loadStudent();
  }, [studentId, token, navigate]);

  const riskMeta = useMemo(() => {
    const risk = (student?.risk || "").toLowerCase();

    if (risk === "high") {
      return {
        bg: "#fee2e2",
        text: "#991b1b",
        border: "#fca5a5",
      };
    }

    if (risk === "medium") {
      return {
        bg: "#fef3c7",
        text: "#92400e",
        border: "#fcd34d",
      };
    }

    return {
      bg: "#dcfce7",
      text: "#166534",
      border: "#86efac",
    };
  }, [student]);

  const trendMeta = useMemo(() => {
    const trend = (student?.trend_label || "").toLowerCase();

    if (trend === "declining") {
      return {
        bg: "#fee2e2",
        text: "#991b1b",
        border: "#fca5a5",
      };
    }

    if (trend === "improving") {
      return {
        bg: "#dcfce7",
        text: "#166534",
        border: "#86efac",
      };
    }

    return {
      bg: "#e0f2fe",
      text: "#075985",
      border: "#7dd3fc",
    };
  }, [student]);

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

  if (!student) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Loading student detail...</h2>
          <p style={{ color: "#64748b" }}>Please wait while your detail is loading.</p>
        </div>
      </div>
    );
  }

  const gpax = Number(student.gpax ?? 0);
  const percentile = Number(student.percentile ?? 0);
  const riskScore = Number(student.risk_score ?? 0);
  const predicted = student.predicted_next_gpax ?? null;
  const trend = Array.isArray(student.semester_trend) ? student.semester_trend : [];
  const alerts = Array.isArray(student.alerts) ? student.alerts : [];
  const reasons = Array.isArray(student.risk_reasons) ? student.risk_reasons : [];
  const smart = Array.isArray(student.smart_recommendations)
    ? student.smart_recommendations
    : [];

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <h1 style={titleStyle}>My Academic Detail</h1>
          <p style={subtitleStyle}>ดูข้อมูลเชิงลึกของผลการเรียนและความเสี่ยงของคุณ</p>
        </div>

        <div style={topBarRightStyle}>
          {isAdminUser ? (
            <Link to="/admin" style={linkButtonStyle}>
              ← Admin Dashboard
            </Link>
          ) : (
            <>
              <Link to="/" style={linkButtonStyle}>
                Dashboard
              </Link>
              <Link to="/planner" style={linkButtonStyle}>
                Grade Planner
              </Link>
              <Link to="/my-courses" style={linkButtonStyle}>
                Course Analyzer
              </Link>
            </>
          )}
        </div>
      </div>

      <div style={heroCardStyle}>
        <div>
          <p style={heroMetaStyle}>
            {student.name} ({student.student_id})
          </p>
          <h2 style={heroTitleStyle}>Section {student.section}</h2>
          <p style={heroSubtitleStyle}>
            ระบบวิเคราะห์สถานะผลการเรียน อันดับ ความเสี่ยง และแนวโน้ม GPA ของคุณ
          </p>
        </div>

        <div style={badgeGroupStyle}>
          <span
            style={{
              ...pillStyle,
              backgroundColor: riskMeta.bg,
              color: riskMeta.text,
              border: `1px solid ${riskMeta.border}`,
            }}
          >
            {student.risk} Risk
          </span>

          <span
            style={{
              ...pillStyle,
              backgroundColor: trendMeta.bg,
              color: trendMeta.text,
              border: `1px solid ${trendMeta.border}`,
            }}
          >
            {student.trend_label}
          </span>
        </div>
      </div>

      <div style={statsGridStyle}>
        <StatCard title="GPAX" value={gpax.toFixed(2)} hint="ผลการเรียนสะสม" />
        <StatCard
          title="Section Rank"
          value={`${student.section_rank} / ${student.section_total}`}
          hint="อันดับใน section"
        />
        <StatCard
          title="Percentile"
          value={`${percentile.toFixed(1)}%`}
          hint="ตำแหน่งเทียบกับกลุ่ม"
        />
        <StatCard
          title="Risk Score"
          value={riskScore.toFixed(1)}
          hint="คะแนนความเสี่ยงรวม"
        />
        <StatCard
          title="Section Avg"
          value={Number(student.section_avg_gpax ?? 0).toFixed(2)}
          hint="ค่าเฉลี่ย section"
        />
        <StatCard
          title="Predicted Next GPAX"
          value={predicted !== null ? Number(predicted).toFixed(2) : "-"}
          hint="ค่าคาดการณ์เทอมถัดไป"
        />
      </div>

      <div style={contentGridStyle}>
        <Card title="Academic Snapshot">
          <InfoRow label="Student ID" value={student.student_id} />
          <InfoRow label="Section" value={student.section} />
          <InfoRow label="Overall Rank" value={student.overall_rank} />
          <InfoRow label="Risk Level" value={student.risk} />
          <InfoRow label="Trend" value={student.trend_label} />
        </Card>

        <Card title="Semester GPA Trend">
          {trend.length === 0 ? (
            <p style={emptyTextStyle}>No semester trend data available</p>
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semester" />
                  <YAxis domain={[0, 4]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="semester_gpa"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div style={contentGridStyle}>
        <Card title="Risk Explanation">
          {reasons.length === 0 ? (
            <p style={emptyTextStyle}>No risk explanation available</p>
          ) : (
            <ul style={listStyle}>
              {reasons.map((item, index) => (
                <li key={index} style={listItemStyle}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Alerts">
          {alerts.length === 0 ? (
            <p style={emptyTextStyle}>No alerts at the moment</p>
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

      {!isAdminUser && (
        <div style={contentGridStyle}>
          <Card title="AI Study Strategy">
            {smart.length === 0 ? (
              <p style={emptyTextStyle}>No recommendations available</p>
            ) : (
              <ul style={listStyle}>
                {smart.map((item, index) => (
                  <li key={index} style={listItemStyle}>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Suggested Next Action">
            <div style={insightBoxStyle}>
              <p style={insightTextStyle}>
                เริ่มจากเช็กวิชาที่มี impact สูงในหน้า Course Analyzer แล้วใช้ Grade
                Planner จำลองแผนว่าถ้าปรับ GPA เทอมหน้าจะทำให้ GPAX ไปถึงเป้าหมายได้หรือไม่
              </p>

              <div style={actionButtonGroupStyle}>
                <Link to="/my-courses" style={primaryButtonStyle}>
                  Open Course Analyzer
                </Link>
                <Link to="/planner" style={secondaryButtonStyle}>
                  Open Grade Planner
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}
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

function InfoRow({ label, value }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={infoValueStyle}>{value}</span>
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
  maxWidth: "640px",
  lineHeight: 1.6,
};

const badgeGroupStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const pillStyle = {
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
  backgroundColor: "white",
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

const infoRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "14px 0",
  borderBottom: "1px solid #e2e8f0",
};

const infoLabelStyle = {
  color: "#64748b",
  fontWeight: "bold",
};

const infoValueStyle = {
  color: "#0f172a",
  fontWeight: "bold",
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

const insightBoxStyle = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "18px",
};

const insightTextStyle = {
  marginTop: 0,
  marginBottom: "16px",
  color: "#334155",
  lineHeight: 1.7,
};

const actionButtonGroupStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
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

const primaryButtonStyle = {
  textDecoration: "none",
  backgroundColor: "#2563eb",
  color: "white",
  padding: "10px 16px",
  borderRadius: "10px",
  fontWeight: "bold",
};

const secondaryButtonStyle = {
  textDecoration: "none",
  backgroundColor: "white",
  color: "#1d4ed8",
  padding: "10px 16px",
  borderRadius: "10px",
  fontWeight: "bold",
  border: "1px solid #cbd5e1",
};

export default StudentDetailPage;