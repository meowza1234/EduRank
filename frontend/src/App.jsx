import { Routes, Route } from "react-router-dom";
import DashboardPage from "./DashboardPage.jsx";
import StudentDetailPage from "./StudentDetailPage.jsx";
import GradePlannerPage from "./GradePlannerPage.jsx";
import LoginPage from "./LoginPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import MyCoursesPage from "./MyCoursesPage.jsx";
import SectionLeaderboardPage from "./SectionLeaderboardPage.jsx";
import AdminDashboardPage from "./AdminDashboardPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/:studentId"
        element={
          <ProtectedRoute>
            <StudentDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/planner"
        element={
          <ProtectedRoute>
            <GradePlannerPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-courses"
        element={
          <ProtectedRoute>
            <MyCoursesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <SectionLeaderboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;