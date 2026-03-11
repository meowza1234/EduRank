import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

function StudentDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`http://127.0.0.1:5000/student/${studentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setStudent(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load student data");
      });
  }, [studentId, token, navigate]);

  if (error) {
    return (
      <div style={{ padding: "32px", fontFamily: "Arial, sans-serif" }}>
        {error}
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ padding: "32px", fontFamily: "Arial, sans-serif" }}>
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "32px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <Link
        to="/"
        style={{
          display: "inline-block",
          marginBottom: "20px",
          color: "#2563eb",
          textDecoration: "none",
          fontWeight: "bold",
        }}
      >
        ← Back to Dashboard
      </Link>

      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          maxWidth: "720px",
        }}
      >
        <h1 style={{ color: "#1e293b", marginBottom: "8px" }}>
          {student.name}
        </h1>

        <p style={{ color: "#64748b", marginBottom: "24px" }}>
          Student ID: {student.student_id}
        </p>

        <div style={infoRow}>
          <span style={labelStyle}>Section</span>
          <span>{student.section}</span>
        </div>

        <div style={infoRow}>
          <span style={labelStyle}>GPAX</span>
          <span>
            {student.gpax !== undefined
              ? Number(student.gpax).toFixed(2)
              : student.gpa !== undefined
              ? Number(student.gpa).toFixed(2)
              : "-"}
          </span>
        </div>

        <div style={infoRow}>
          <span style={labelStyle}>Overall Rank</span>
          <span>{student.overall_rank ?? "-"}</span>
        </div>

        <div style={infoRow}>
          <span style={labelStyle}>Section Rank</span>
          <span>
            {student.section_rank ?? "-"} / {student.section_total ?? "-"}
          </span>
        </div>

        <div style={infoRow}>
          <span style={labelStyle}>Percentile</span>
          <span>
            {student.percentile !== undefined
              ? Number(student.percentile).toFixed(1) + "%"
              : "-"}
          </span>
        </div>

        <div style={infoRow}>
          <span style={labelStyle}>Risk Level</span>
          <span>{student.risk ?? "-"}</span>
        </div>

        {student.risk_score !== undefined && (
          <div style={infoRow}>
            <span style={labelStyle}>Risk Score</span>
            <span>{Number(student.risk_score).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 0",
  borderBottom: "1px solid #e2e8f0",
};

const labelStyle = {
  fontWeight: "bold",
  color: "#334155",
};

export default StudentDetailPage;