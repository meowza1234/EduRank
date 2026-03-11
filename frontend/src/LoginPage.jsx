import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "./config";

function LoginPage() {
  const [tab, setTab] = useState("login"); // "login" | "signup"
  const [userType, setUserType] = useState("student"); // "student" | "teacher"
  const navigate = useNavigate();

  // Login state
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Sign up state
  const [signupId, setSignupId] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch(API_URL + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: loginId, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const role = String(data.user?.role || "").toLowerCase();
      if (role === "admin" || role === "instructor") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch {
      setLoginError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess("");

    if (signupPassword !== signupConfirm) {
      setSignupError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    try {
      const res = await fetch(API_URL + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: signupId,
          name: signupName,
          password: signupPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSignupError(data.error || "ลงทะเบียนไม่สำเร็จ");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch {
      setSignupError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "32px", marginBottom: "4px" }}>🎓</div>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>EduRank Analytics</h1>
          <p style={{ color: "#64748b", marginTop: "4px", fontSize: "14px" }}>
            ระบบวิเคราะห์ผลการเรียน
          </p>
        </div>

        {/* User Type Toggle */}
        <div style={tabContainerStyle}>
          <button
            style={userType === "student" ? activeTabStyle : inactiveTabStyle}
            onClick={() => { setUserType("student"); setLoginError(""); }}
          >
            นักศึกษา
          </button>
          <button
            style={userType === "teacher" ? activeTabStyle : inactiveTabStyle}
            onClick={() => { setUserType("teacher"); setTab("login"); setLoginError(""); }}
          >
            อาจารย์ / เจ้าหน้าที่
          </button>
        </div>

        {/* Login / Signup Tabs (นักศึกษาเท่านั้น) */}
        {userType === "student" && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <button
              style={tab === "login" ? activeSubTabStyle : inactiveSubTabStyle}
              onClick={() => { setTab("login"); setLoginError(""); }}
            >
              เข้าสู่ระบบ
            </button>
            <button
              style={tab === "signup" ? activeSubTabStyle : inactiveSubTabStyle}
              onClick={() => { setTab("signup"); setSignupError(""); setSignupSuccess(""); }}
            >
              สมัครสมาชิก
            </button>
          </div>
        )}

        {/* Login Form */}
        {(tab === "login" || userType === "teacher") && (
          <form onSubmit={handleLogin}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                {userType === "teacher" ? "รหัสอาจารย์ / เจ้าหน้าที่" : "รหัสนักศึกษา"}
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder={userType === "teacher" ? "เช่น T001" : "เช่น S001"}
                style={inputStyle}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>รหัสผ่าน</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="รหัสผ่าน"
                style={inputStyle}
                required
              />
            </div>
            {loginError && <p style={errorStyle}>{loginError}</p>}
            <button type="submit" style={primaryButtonStyle}>
              เข้าสู่ระบบ
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === "signup" && (
          <form onSubmit={handleSignup}>
            <div style={fieldStyle}>
              <label style={labelStyle}>รหัสนักศึกษา</label>
              <input
                type="text"
                value={signupId}
                onChange={(e) => setSignupId(e.target.value)}
                placeholder="เช่น S010"
                style={inputStyle}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>ชื่อ-นามสกุล</label>
              <input
                type="text"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="ชื่อ นามสกุล"
                style={inputStyle}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>รหัสผ่าน (อย่างน้อย 4 ตัวอักษร)</label>
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="ตั้งรหัสผ่าน"
                style={inputStyle}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>ยืนยันรหัสผ่าน</label>
              <input
                type="password"
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                style={inputStyle}
                required
              />
            </div>
            {signupError && <p style={errorStyle}>{signupError}</p>}
            {signupSuccess && <p style={successStyle}>{signupSuccess}</p>}
            <button type="submit" style={primaryButtonStyle}>
              สมัครสมาชิก
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f1f5f9",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "'Segoe UI', Arial, sans-serif",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "32px 28px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
};

const tabContainerStyle = {
  display: "flex",
  borderRadius: "10px",
  backgroundColor: "#f1f5f9",
  padding: "4px",
  marginBottom: "24px",
  gap: "4px",
};

const activeTabStyle = {
  flex: 1,
  padding: "10px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#2563eb",
  color: "white",
  fontWeight: "bold",
  fontSize: "14px",
  cursor: "pointer",
};

const inactiveTabStyle = {
  flex: 1,
  padding: "10px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "transparent",
  color: "#64748b",
  fontWeight: "bold",
  fontSize: "14px",
  cursor: "pointer",
};

const activeSubTabStyle = {
  flex: 1,
  padding: "8px",
  border: "1px solid #2563eb",
  borderRadius: "8px",
  backgroundColor: "#eff6ff",
  color: "#2563eb",
  fontWeight: "bold",
  fontSize: "13px",
  cursor: "pointer",
};

const inactiveSubTabStyle = {
  flex: 1,
  padding: "8px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  backgroundColor: "white",
  color: "#64748b",
  fontWeight: "bold",
  fontSize: "13px",
  cursor: "pointer",
};

const fieldStyle = {
  marginBottom: "14px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "600",
  color: "#334155",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
};

const primaryButtonStyle = {
  width: "100%",
  padding: "12px",
  border: "none",
  borderRadius: "10px",
  backgroundColor: "#2563eb",
  color: "white",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
  marginTop: "4px",
};

const errorStyle = {
  color: "#dc2626",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  marginBottom: "12px",
};

const successStyle = {
  color: "#16a34a",
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  marginBottom: "12px",
};

export default LoginPage;
