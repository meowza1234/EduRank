import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "./config";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

function GradePlannerPage() {
  const [form, setForm] = useState({
    current_gpax: "",
    earned_credits: "",
    remaining_credits: "",
    target_gpax: "",
  });

  const [result, setResult] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [expectedSemesterGpa, setExpectedSemesterGpa] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadInitialData = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setError("");

        const [dashboardRes, coursesRes] = await Promise.all([
          fetch(API_URL + "/my-dashboard", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(API_URL + "/my-courses", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const dashboardData = await dashboardRes.json();
        const coursesData = await coursesRes.json();

        if (dashboardRes.status === 401 || coursesRes.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        if (!dashboardRes.ok) {
          setError(dashboardData.error || "Failed to load dashboard data");
          return;
        }

        if (!coursesRes.ok) {
          setError(coursesData.error || "Failed to load course data");
          return;
        }

        const earnedCredits = Array.isArray(coursesData)
          ? coursesData.reduce((sum, item) => sum + Number(item.credits || 0), 0)
          : 0;

        setDashboard(dashboardData);
        setCourses(Array.isArray(coursesData) ? coursesData : []);

        setForm((prev) => ({
          ...prev,
          current_gpax: Number(dashboardData.gpax ?? 0).toFixed(2),
          earned_credits: String(earnedCredits),
          remaining_credits: prev.remaining_credits || "18",
          target_gpax: prev.target_gpax || Number(dashboardData.gpax ?? 0 + 0.2).toFixed(2),
        }));
      } catch (err) {
        console.error(err);
        setError("Something went wrong while loading planner data");
      }
    };

    loadInitialData();
  }, [navigate, token]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const applyTargetPreset = (value) => {
    setForm((prev) => ({
      ...prev,
      target_gpax: value.toFixed(2),
    }));
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    try {
      const res = await fetch(API_URL + "/planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_gpax: parseFloat(form.current_gpax),
          earned_credits: parseFloat(form.earned_credits),
          remaining_credits: parseFloat(form.remaining_credits),
          target_gpax: parseFloat(form.target_gpax),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Calculation failed");
        return;
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while calculating");
    }
  };

  const handleSimulate = async () => {
    setError("");
    setSimulationResult(null);

    try {
      const res = await fetch(API_URL + "/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_gpax: parseFloat(form.current_gpax),
          earned_credits: parseFloat(form.earned_credits),
          remaining_credits: parseFloat(form.remaining_credits),
          expected_semester_gpa: parseFloat(expectedSemesterGpa),
          target_gpax: parseFloat(form.target_gpax),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Simulation failed");
        return;
      }

      setSimulationResult(data);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while simulating");
    }
  };

  const trendData = useMemo(() => {
    const items = [];

    if (form.current_gpax) {
      items.push({
        stage: "Current",
        gpax: parseFloat(form.current_gpax),
      });
    }

    if (simulationResult) {
      items.push({
        stage: "Projected",
        gpax: simulationResult.projected_gpax,
      });
    }

    if (form.target_gpax) {
      items.push({
        stage: "Target",
        gpax: parseFloat(form.target_gpax),
      });
    }

    return items;
  }, [form.current_gpax, form.target_gpax, simulationResult]);

  const riskMeta = useMemo(() => {
    const risk = (simulationResult?.risk_level || "").toLowerCase();

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
  }, [simulationResult]);

  const topImpactCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => Number(b.impact_score || 0) - Number(a.impact_score || 0))
      .slice(0, 3);
  }, [courses]);

  const difficultyMeta = useMemo(() => {
    const level = result?.difficulty_level || "";

    if (level === "แทบเป็นไปไม่ได้") {
      return { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };
    }
    if (level === "ท้าทาย") {
      return { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" };
    }
    if (level === "ปานกลาง") {
      return { bg: "#e0f2fe", text: "#075985", border: "#7dd3fc" };
    }
    return { bg: "#dcfce7", text: "#166534", border: "#86efac" };
  }, [result]);

  if (error && !dashboard) {
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
          <h1 style={titleStyle}>AI Grade Planner</h1>
          <p style={subtitleStyle}>
            วางแผน GPAX เป้าหมาย จำลองสถานการณ์ และดูคำแนะนำเชิงปฏิบัติ
          </p>
        </div>

        <div style={topBarRightStyle}>
          <Link to="/" style={linkButtonStyle}>
            Dashboard
          </Link>
          <Link to="/my-courses" style={linkButtonStyle}>
            Course Analyzer
          </Link>
          <Link to={`/student/${dashboard?.student_id || ""}`} style={linkButtonStyle}>
            My Detail
          </Link>
        </div>
      </div>

      <div style={heroCardStyle}>
        <div>
          <p style={heroMetaStyle}>
            Current GPAX: <strong>{Number(form.current_gpax || 0).toFixed(2)}</strong>
          </p>
          <h2 style={heroTitleStyle}>Plan Your Next Academic Move</h2>
          <p style={heroSubtitleStyle}>
            ระบบจะช่วยคำนวณว่าต้องได้ GPA เทอมหน้าประมาณเท่าไรถึงจะถึงเป้าหมาย
            และจำลองผลลัพธ์ให้เห็นก่อนตัดสินใจ
          </p>
        </div>

        <div style={presetWrapperStyle}>
          <button onClick={() => applyTargetPreset(2.75)} style={presetButtonStyle}>
            Target 2.75
          </button>
          <button onClick={() => applyTargetPreset(3.0)} style={presetButtonStyle}>
            Target 3.00
          </button>
          <button onClick={() => applyTargetPreset(3.25)} style={presetButtonStyle}>
            Target 3.25
          </button>
        </div>
      </div>

      <div style={grid2Style}>
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Target Planner</h2>
          <form onSubmit={handleCalculate}>
            <Field
              label="Current GPAX"
              name="current_gpax"
              value={form.current_gpax}
              onChange={handleChange}
              placeholder="เช่น 2.75"
            />
            <Field
              label="Earned Credits"
              name="earned_credits"
              value={form.earned_credits}
              onChange={handleChange}
              placeholder="เช่น 30"
            />
            <Field
              label="Remaining Credits"
              name="remaining_credits"
              value={form.remaining_credits}
              onChange={handleChange}
              placeholder="เช่น 18"
            />
            <Field
              label="Target GPAX"
              name="target_gpax"
              value={form.target_gpax}
              onChange={handleChange}
              placeholder="เช่น 3.00"
            />

            <button type="submit" style={primaryButtonStyle}>
              Calculate Required GPA
            </button>
          </form>

          {result && (
            <div style={resultBoxStyle}>
              <div style={resultHeaderStyle}>
                <div>
                  <p style={miniLabelStyle}>Required Semester GPA</p>
                  <h3 style={resultMainValueStyle}>
                    {Number(result.required_semester_gpa).toFixed(2)}
                  </h3>
                </div>

                <span
                  style={{
                    ...pillStyle,
                    backgroundColor: difficultyMeta.bg,
                    color: difficultyMeta.text,
                    border: `1px solid ${difficultyMeta.border}`,
                  }}
                >
                  {result.difficulty_level}
                </span>
              </div>

              <p style={resultTextStyle}>
                {result.possible
                  ? "เป้าหมายนี้ยังทำได้ ถ้าวางแผนดีและรักษาเกรดในวิชาที่สำคัญ"
                  : "เป้าหมายนี้สูงเกินไปเมื่อเทียบกับหน่วยกิตที่เหลือ ควรปรับเป้าหมายหรือวางแผนระยะยาว"}
              </p>

              <ul style={listStyle}>
                {result.recommendations.map((item, index) => (
                  <li key={index} style={listItemStyle}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>What-if Simulator</h2>

          <Field
            label="Expected Semester GPA"
            name="expectedSemesterGpa"
            value={expectedSemesterGpa}
            onChange={(e) => setExpectedSemesterGpa(e.target.value)}
            placeholder="เช่น 3.50"
          />

          <button type="button" onClick={handleSimulate} style={darkButtonStyle}>
            Simulate Scenario
          </button>

          {simulationResult && (
            <div style={{ marginTop: "18px" }}>
              <div style={statsMiniGridStyle}>
                <MiniCard
                  label="Projected GPAX"
                  value={Number(simulationResult.projected_gpax).toFixed(2)}
                />
                <MiniCard
                  label="Expected GPA"
                  value={Number(simulationResult.expected_semester_gpa).toFixed(2)}
                />
                <MiniCard
                  label="Target GPAX"
                  value={Number(simulationResult.target_gpax).toFixed(2)}
                />
              </div>

              <div style={{ marginTop: "16px" }}>
                <span
                  style={{
                    ...pillStyle,
                    backgroundColor: riskMeta.bg,
                    color: riskMeta.text,
                    border: `1px solid ${riskMeta.border}`,
                  }}
                >
                  {simulationResult.risk_level} Risk
                </span>
              </div>

              <div style={{ width: "100%", height: 280, marginTop: "20px" }}>
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis domain={[0, 4]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="gpax" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={adviceBoxStyle}>
                <h3 style={{ marginTop: 0, color: "#0f172a" }}>AI Academic Advice</h3>
                <ul style={listStyle}>
                  {simulationResult.ai_advice.map((item, index) => (
                    <li key={index} style={listItemStyle}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={grid2Style}>
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Impact Opportunity</h2>
          <p style={sectionSubStyle}>
            วิชาเหล่านี้มีโอกาสช่วยดัน GPAX ได้มากที่สุดในตอนนี้
          </p>

          {topImpactCourses.length === 0 ? (
            <p style={emptyTextStyle}>No course data available</p>
          ) : (
            <>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={topImpactCourses.map((item) => ({
                      course: item.course_code,
                      impact: Number(item.impact_score || 0),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="course" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="impact" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <ul style={listStyle}>
                {topImpactCourses.map((item, index) => (
                  <li key={index} style={listItemStyle}>
                    <strong>{item.course_name}</strong> ({item.course_code}) — Grade{" "}
                    {item.grade_letter}, Impact Score{" "}
                    {Number(item.impact_score).toFixed(2)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Action Plan</h2>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              เริ่มจากตั้งเป้า GPAX ที่เป็นไปได้ เช่น เพิ่มทีละ 0.20 หรือ 0.25
            </li>
            <li style={listItemStyle}>
              ใช้ What-if Simulator เพื่อดูว่าถ้าได้ GPA เทอมหน้า 3.50 หรือ 3.70
              แล้ว GPAX จะขยับถึงไหน
            </li>
            <li style={listItemStyle}>
              ไปที่ Course Analyzer เพื่อดูว่าวิชาไหนควรโฟกัสก่อนจาก Impact Score
            </li>
            <li style={listItemStyle}>
              ถ้าคุณมี risk ระดับ Medium หรือ High ให้ลดวิชาที่เสี่ยงได้เกรดต่ำก่อน
            </li>
          </ul>

          <div style={actionButtonGroupStyle}>
            <Link to="/my-courses" style={secondaryButtonStyle}>
              Open Course Analyzer
            </Link>
            <Link to={`/student/${dashboard?.student_id || ""}`} style={secondaryButtonStyle}>
              View My Detail
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ ...cardStyle, border: "1px solid #fecaca" }}>
          <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <input {...props} type="number" step="0.01" style={inputStyle} />
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div style={miniCardStyle}>
      <p style={miniLabelStyle}>{label}</p>
      <h4 style={miniValueStyle}>{value}</h4>
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

const presetWrapperStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const presetButtonStyle = {
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: "999px",
  backgroundColor: "rgba(255,255,255,0.14)",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const grid2Style = {
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

const fieldStyle = {
  marginBottom: "16px",
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "bold",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  padding: "12px 18px",
  border: "none",
  borderRadius: "10px",
  backgroundColor: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const darkButtonStyle = {
  padding: "12px 18px",
  border: "none",
  borderRadius: "10px",
  backgroundColor: "#0f172a",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const resultBoxStyle = {
  marginTop: "18px",
  padding: "18px",
  borderRadius: "14px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const resultHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const miniLabelStyle = {
  margin: 0,
  color: "#64748b",
  fontWeight: "bold",
  fontSize: "13px",
};

const resultMainValueStyle = {
  margin: "8px 0 0 0",
  color: "#0f172a",
  fontSize: "32px",
};

const resultTextStyle = {
  marginTop: "14px",
  marginBottom: "12px",
  color: "#334155",
  lineHeight: 1.7,
};

const pillStyle = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const statsMiniGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
};

const miniCardStyle = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "14px",
};

const miniValueStyle = {
  margin: "8px 0 0 0",
  color: "#0f172a",
  fontSize: "24px",
};

const adviceBoxStyle = {
  marginTop: "20px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "18px",
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

const emptyTextStyle = {
  margin: 0,
  color: "#94a3b8",
};

const actionButtonGroupStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "16px",
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

const secondaryButtonStyle = {
  textDecoration: "none",
  backgroundColor: "white",
  color: "#1d4ed8",
  padding: "10px 16px",
  borderRadius: "10px",
  fontWeight: "bold",
  border: "1px solid #cbd5e1",
};

export default GradePlannerPage;