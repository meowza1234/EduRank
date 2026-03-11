import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "./config";

function MyCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedGradePoint, setSelectedGradePoint] = useState("4.0");
  const [simulationResult, setSimulationResult] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState("all");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadCourses = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setError("");

        const res = await fetch(API_URL + "/my-courses", {
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
          setError(data.error || "Failed to load courses");
          return;
        }

        const sorted = Array.isArray(data)
          ? [...data].sort(
              (a, b) => Number(b.impact_score || 0) - Number(a.impact_score || 0)
            )
          : [];

        setCourses(sorted);

        if (sorted.length > 0) {
          setSelectedCourse(sorted[0].course_code);
        }
      } catch (err) {
        console.error(err);
        setError("Something went wrong while loading courses");
      }
    };

    loadCourses();
  }, [navigate, token]);

  const getPriority = (impact) => {
    const value = Number(impact || 0);

    if (value >= 2.5) {
      return "High";
    }
    if (value >= 1.0) {
      return "Medium";
    }
    return "Low";
  };

  const getPriorityStyle = (impact) => {
    const level = getPriority(impact);

    if (level === "High") {
      return {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
      };
    }

    if (level === "Medium") {
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

  const filteredCourses = useMemo(() => {
    if (priorityFilter === "all") return courses;
    return courses.filter(
      (item) => getPriority(item.impact_score).toLowerCase() === priorityFilter
    );
  }, [courses, priorityFilter]);

  const topPriorityCourses = useMemo(() => courses.slice(0, 3), [courses]);

  const handleSimulate = async () => {
    setError("");
    setSimulationResult(null);

    try {
      const res = await fetch(API_URL + "/simulate-course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_code: selectedCourse,
          new_grade_point: parseFloat(selectedGradePoint),
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

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

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <h1 style={titleStyle}>Course Impact Analyzer</h1>
          <p style={subtitleStyle}>
            ดูว่าวิชาไหนควรโฟกัสก่อน และจำลองว่าถ้าปรับเกรดแล้ว GPAX จะขยับแค่ไหน
          </p>
        </div>

        <div style={topBarRightStyle}>
          <Link to="/" style={linkButtonStyle}>
            Dashboard
          </Link>
          <Link to="/planner" style={linkButtonStyle}>
            Grade Planner
          </Link>
        </div>
      </div>

      <div style={heroCardStyle}>
        <div>
          <h2 style={heroTitleStyle}>How to read this page</h2>
          <p style={heroSubtitleStyle}>
            Impact Score ยิ่งสูง แปลว่าวิชานั้นยิ่งมีโอกาสช่วยดัน GPAX ได้มาก
            เพราะหน่วยกิตสูงและเกรดยังมีช่องให้ปรับ
          </p>
        </div>
      </div>

      <div style={grid2Style}>
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Top Priority Courses</h2>
          <p style={sectionSubStyle}>3 วิชาแรกที่ควรโฟกัสก่อน</p>

          {topPriorityCourses.length === 0 ? (
            <p style={emptyTextStyle}>No course data available</p>
          ) : (
            <div style={priorityListStyle}>
              {topPriorityCourses.map((course, index) => (
                <div key={`${course.course_code}-${index}`} style={priorityCardStyle}>
                  <div>
                    <p style={priorityCodeStyle}>{course.course_code}</p>
                    <h3 style={priorityNameStyle}>{course.course_name}</h3>
                    <p style={priorityMetaStyle}>
                      Grade {course.grade_letter} · {course.credits} credits
                    </p>
                  </div>

                  <div style={priorityRightStyle}>
                    <span
                      style={{
                        ...pillStyle,
                        ...getPriorityStyle(course.impact_score),
                      }}
                    >
                      {getPriority(course.impact_score)}
                    </span>

                    <p style={impactValueStyle}>
                      Impact {Number(course.impact_score).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>What-if Grade Simulator</h2>

          <div style={fieldStyle}>
            <label style={labelStyle}>Select Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={inputStyle}
            >
              {courses.map((course, index) => (
                <option key={`${course.course_code}-${index}`} value={course.course_code}>
                  {course.course_code} — {course.course_name}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Simulate New Grade Point</label>
            <select
              value={selectedGradePoint}
              onChange={(e) => setSelectedGradePoint(e.target.value)}
              style={inputStyle}
            >
              <option value="4.0">4.0 (A)</option>
              <option value="3.7">3.7 (A-)</option>
              <option value="3.5">3.5 (B+)</option>
              <option value="3.0">3.0 (B)</option>
              <option value="2.5">2.5 (C+)</option>
            </select>
          </div>

          <button onClick={handleSimulate} style={primaryButtonStyle}>
            Run Simulation
          </button>

          {simulationResult && (
            <div style={simBoxStyle}>
              <div style={miniGridStyle}>
                <MiniCard
                  label="Current GPAX"
                  value={Number(simulationResult.current_gpax).toFixed(2)}
                />
                <MiniCard
                  label="Simulated GPAX"
                  value={Number(simulationResult.simulated_gpax).toFixed(2)}
                />
                <MiniCard
                  label="Change"
                  value={
                    simulationResult.gpax_change > 0
                      ? `+${Number(simulationResult.gpax_change).toFixed(2)}`
                      : Number(simulationResult.gpax_change).toFixed(2)
                  }
                />
              </div>

              <p style={simTextStyle}>
                ถ้าวิชา <strong>{simulationResult.course_name}</strong> เปลี่ยนจากเกรด{" "}
                <strong>{simulationResult.current_grade_letter}</strong> เป็น grade point{" "}
                <strong>{Number(simulationResult.new_grade_point).toFixed(2)}</strong>
                GPAX ของคุณจะเปลี่ยนจาก{" "}
                <strong>{Number(simulationResult.current_gpax).toFixed(2)}</strong> เป็น{" "}
                <strong>{Number(simulationResult.simulated_gpax).toFixed(2)}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={tableHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>All Courses</h2>
            <p style={sectionSubStyle}>
              เรียงจากวิชาที่ impact สูงสุดลงมา เพื่อให้ตัดสินใจง่ายขึ้น
            </p>
          </div>

          <div style={filterGroupStyle}>
            <button
              onClick={() => setPriorityFilter("all")}
              style={priorityFilter === "all" ? activeFilterStyle : filterStyle}
            >
              All
            </button>
            <button
              onClick={() => setPriorityFilter("high")}
              style={priorityFilter === "high" ? activeFilterStyle : filterStyle}
            >
              High
            </button>
            <button
              onClick={() => setPriorityFilter("medium")}
              style={priorityFilter === "medium" ? activeFilterStyle : filterStyle}
            >
              Medium
            </button>
            <button
              onClick={() => setPriorityFilter("low")}
              style={priorityFilter === "low" ? activeFilterStyle : filterStyle}
            >
              Low
            </button>
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <p style={emptyTextStyle}>No courses found</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Semester</th>
                  <th style={thStyle}>Course Code</th>
                  <th style={thStyle}>Course Name</th>
                  <th style={thStyle}>Credits</th>
                  <th style={thStyle}>Grade</th>
                  <th style={thStyle}>Grade Point</th>
                  <th style={thStyle}>Impact Score</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Suggested Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course, index) => (
                  <tr key={`${course.course_code}-${index}`}>
                    <td style={tdStyle}>{course.semester}</td>
                    <td style={tdStyle}>{course.course_code}</td>
                    <td style={tdStyle}>{course.course_name}</td>
                    <td style={tdStyle}>{course.credits}</td>
                    <td style={tdStyle}>{course.grade_letter}</td>
                    <td style={tdStyle}>{Number(course.grade_point).toFixed(2)}</td>
                    <td style={tdStyle}>{Number(course.impact_score).toFixed(2)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          ...pillStyle,
                          ...getPriorityStyle(course.impact_score),
                        }}
                      >
                        {getPriority(course.impact_score)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {Number(course.impact_score) >= 2.5
                        ? "ควรโฟกัสก่อน"
                        : Number(course.impact_score) >= 1
                        ? "ติดตามใกล้ชิด"
                        : "รักษาระดับ"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && (
        <div style={{ ...cardStyle, border: "1px solid #fecaca", marginTop: "24px" }}>
          <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>
        </div>
      )}
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
  background: "linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)",
  color: "white",
  borderRadius: "18px",
  padding: "24px",
  marginBottom: "24px",
};

const heroTitleStyle = {
  margin: "0 0 8px 0",
  fontSize: "28px",
};

const heroSubtitleStyle = {
  margin: 0,
  color: "#dbeafe",
  lineHeight: 1.6,
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

const priorityListStyle = {
  display: "grid",
  gap: "14px",
};

const priorityCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "center",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "16px",
};

const priorityCodeStyle = {
  margin: 0,
  color: "#2563eb",
  fontWeight: "bold",
  fontSize: "13px",
};

const priorityNameStyle = {
  margin: "6px 0",
  color: "#0f172a",
};

const priorityMetaStyle = {
  margin: 0,
  color: "#64748b",
};

const priorityRightStyle = {
  textAlign: "right",
};

const impactValueStyle = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#0f172a",
  fontWeight: "bold",
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

const simBoxStyle = {
  marginTop: "18px",
  padding: "18px",
  borderRadius: "14px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const miniGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
};

const miniCardStyle = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "14px",
};

const miniLabelStyle = {
  margin: 0,
  color: "#64748b",
  fontWeight: "bold",
  fontSize: "13px",
};

const miniValueStyle = {
  margin: "8px 0 0 0",
  color: "#0f172a",
  fontSize: "24px",
};

const simTextStyle = {
  marginTop: "16px",
  marginBottom: 0,
  color: "#334155",
  lineHeight: 1.7,
};

const tableHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const filterGroupStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const filterStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  backgroundColor: "white",
  color: "#1e293b",
  fontWeight: "bold",
  cursor: "pointer",
};

const activeFilterStyle = {
  ...filterStyle,
  backgroundColor: "#2563eb",
  color: "white",
  border: "1px solid #2563eb",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1000px",
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

const emptyTextStyle = {
  margin: 0,
  color: "#94a3b8",
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

export default MyCoursesPage;