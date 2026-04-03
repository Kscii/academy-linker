import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import RequireAuth from "@/components/auth/RequireAuth"
import { AuthProvider } from "@/contexts/AuthContext"
import { SettingsProvider } from "@/contexts/SettingsContext"

import ParentLayout from "@/layouts/ParentLayout"

import AccountPage from "@/screens/AccountPage"
import HomePage from "@/screens/HomePage"
import LoginPage from "@/screens/LoginPage"
import SettingsPage from "@/screens/SettingsPage"
import DiscussionsPage from "@/screens/parent/DiscussionsPage"
import ReportDetailPage from "@/screens/parent/ReportDetailPage"
import ReportsListPage from "@/screens/parent/ReportsListPage"
import StudentDashboardPage from "@/screens/parent/StudentDashboardPage"
import SubjectDetailPage from "@/screens/parent/SubjectDetailPage"
import TeacherDiscussionsPage from "@/screens/parent/TeacherDiscussionsPage"
import TasksPage from "@/screens/parent/TasksPage"

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <SettingsPage />
                </RequireAuth>
              }
            />

            <Route
              path="/parent/students/:sid"
              element={
                <RequireAuth>
                  <ParentLayout />
                </RequireAuth>
              }
            >
              <Route index element={<StudentDashboardPage />} />

              <Route path="dashboard" element={<StudentDashboardPage />} />
              <Route
                path="subjects/:subjectId"
                element={<SubjectDetailPage />}
              />
              <Route path="reports" element={<ReportsListPage />} />
              <Route
                path="reports/:reportId"
                element={<ReportDetailPage />}
              />
              <Route path="discussions" element={<DiscussionsPage />} />
              <Route
                path="discussions/teachers/:tid"
                element={<TeacherDiscussionsPage />}
              />
              <Route path="tasks" element={<TasksPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App
