import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AppShell } from "@/presentation/components/layout/AppShell";
import { Card } from "@/presentation/components/ui/Card";
import { PageLoader, DashboardSkeleton, KanbanSkeleton } from "@/presentation/components/ui/PageLoader";
import { ToastContainer } from "@/presentation/components/ui/Toast";
import { ModalProvider } from "@/presentation/components/modals";
import { RepositoryProvider } from "@/di";
import { Login } from "@/features/auth/Login";
import { useTaskStore } from "@/stores/taskStore";
import { useProjectStore } from "@/stores/projectStore";
import { useMemberStore } from "@/stores/memberStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

// Lazy-loaded page components
const Dashboard = lazy(() =>
    import("@/presentation/pages/Dashboard").then(m => ({ default: m.Dashboard }))
);
const MyTasksPage = lazy(() =>
    import("@/presentation/pages/MyTasksPage").then(m => ({ default: m.MyTasksPage }))
);
const KanbanBoard = lazy(() =>
    import("@/presentation/pages/KanbanBoard").then(m => ({ default: m.KanbanBoard }))
);
const ProjectsPage = lazy(() =>
    import("@/presentation/pages/ProjectsPage").then(m => ({ default: m.ProjectsPage }))
);
const FileManagementPage = lazy(() =>
    import("@/presentation/pages/FileManagementPage").then(m => ({ default: m.FileManagementPage }))
);
const TeamPage = lazy(() =>
    import("@/presentation/pages/TeamPage").then(m => ({ default: m.TeamPage }))
);
const MeetingsPage = lazy(() =>
    import("@/presentation/pages/MeetingsPage").then(m => ({ default: m.MeetingsPage }))
);
const MeetingDocumentPage = lazy(() =>
    import("@/presentation/pages/MeetingDocumentPage").then(m => ({ default: m.MeetingDocumentPage }))
);
const SettingsPage = lazy(() =>
    import("@/presentation/pages/SettingsPage").then(m => ({ default: m.SettingsPage }))
);
const AdminPage = lazy(() =>
    import("@/presentation/pages/AdminPage").then(m => ({ default: m.AdminPage }))
);
const GanttPage = lazy(() =>
    import("@/presentation/pages/GanttPage").then(m => ({ default: m.GanttPage }))
);

// 출석 관련 페이지
const AttendanceDashboard = lazy(() =>
    import("@/presentation/pages/AttendanceDashboard").then(m => ({ default: m.AttendanceDashboard }))
);
const AttendanceCheckPage = lazy(() =>
    import("@/presentation/pages/AttendanceCheckPage").then(m => ({ default: m.AttendanceCheckPage }))
);
const CellManagementPage = lazy(() =>
    import("@/presentation/pages/CellManagementPage").then(m => ({ default: m.CellManagementPage }))
);
const AttendanceReportsPage = lazy(() =>
    import("@/presentation/pages/AttendanceReportsPage").then(m => ({ default: m.AttendanceReportsPage }))
);

// 인증 필요 라우트 래퍼
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

// 관리자 전용 라우트 래퍼
function AdminRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isAdmin = useAuthStore((state) => state.isAdmin);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin()) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

function AuthenticatedApp() {
    const fetchTasks = useTaskStore((state) => state.fetchTasks);
    const fetchProjects = useProjectStore((state) => state.fetchProjects);
    const fetchMembers = useMemberStore((state) => state.fetchMembers);
    const initializeTheme = useSettingsStore((state) => state.initializeTheme);

    // Initialize session timeout management
    useSessionTimeout();

    useEffect(() => {
        // 테마 초기화 (깜빡임 방지를 위해 우선 실행)
        initializeTheme();
    }, [initializeTheme]);

    useEffect(() => {
        // 데이터 로드는 약간의 지연 후 실행 (초기 렌더링 우선)
        const loadData = () => {
            fetchTasks();
            fetchProjects();
            fetchMembers();
        };

        // requestIdleCallback 지원 시 사용, 아니면 setTimeout
        if ('requestIdleCallback' in window) {
            (window as Window & typeof globalThis & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(loadData);
        } else {
            setTimeout(loadData, 100);
        }
    }, [fetchTasks, fetchProjects, fetchMembers]);

    return (
        <ModalProvider>
            <AppShell>
                <Routes>
                    <Route path="/" element={
                        <Suspense fallback={<DashboardSkeleton />}>
                            <Dashboard />
                        </Suspense>
                    } />
                    <Route path="/my-tasks" element={
                        <Suspense fallback={<PageLoader />}>
                            <MyTasksPage />
                        </Suspense>
                    } />
                    <Route path="/tasks" element={
                        <Suspense fallback={<KanbanSkeleton />}>
                            <KanbanBoard />
                        </Suspense>
                    } />
                    <Route path="/projects" element={
                        <Suspense fallback={<PageLoader />}>
                            <ProjectsPage />
                        </Suspense>
                    } />
                    <Route path="/files" element={
                        <Suspense fallback={<PageLoader />}>
                            <FileManagementPage />
                        </Suspense>
                    } />
                    <Route path="/team" element={
                        <Suspense fallback={<PageLoader />}>
                            <TeamPage />
                        </Suspense>
                    } />
                    <Route path="/meetings" element={
                        <Suspense fallback={<PageLoader />}>
                            <MeetingsPage />
                        </Suspense>
                    } />
                    <Route path="/meetings/:meetingId" element={
                        <Suspense fallback={<PageLoader />}>
                            <MeetingDocumentPage />
                        </Suspense>
                    } />
                    <Route path="/gantt" element={
                        <Suspense fallback={<PageLoader />}>
                            <GanttPage />
                        </Suspense>
                    } />
                    <Route path="/settings" element={
                        <Suspense fallback={<PageLoader />}>
                            <SettingsPage />
                        </Suspense>
                    } />
                    {/* 출석 관련 라우트 */}
                    <Route path="/attendance" element={
                        <Suspense fallback={<PageLoader />}>
                            <AttendanceDashboard />
                        </Suspense>
                    } />
                    <Route path="/attendance/check" element={
                        <Suspense fallback={<PageLoader />}>
                            <AttendanceCheckPage />
                        </Suspense>
                    } />
                    <Route path="/attendance/cells" element={
                        <Suspense fallback={<PageLoader />}>
                            <CellManagementPage />
                        </Suspense>
                    } />
                    <Route path="/attendance/reports" element={
                        <Suspense fallback={<PageLoader />}>
                            <AttendanceReportsPage />
                        </Suspense>
                    } />
                    <Route path="/admin" element={
                        <AdminRoute>
                            <Suspense fallback={<PageLoader />}>
                                <AdminPage />
                            </Suspense>
                        </AdminRoute>
                    } />
                    <Route path="*" element={
                        <div className="min-h-[60vh] flex items-center justify-center">
                            <Card className="p-12 text-center max-w-md">
                                <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
                                <p className="text-xl font-medium mb-2">페이지를 찾을 수 없습니다</p>
                                <p className="text-muted-foreground">요청하신 페이지가 존재하지 않습니다.</p>
                            </Card>
                        </div>
                    } />
                </Routes>
            </AppShell>
        </ModalProvider>
    );
}

function App() {
    // Railway 배포: basename은 항상 '/'
    const basename = '/';

    return (
        <RepositoryProvider>
            <BrowserRouter basename={basename}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/*" element={
                        <ProtectedRoute>
                            <AuthenticatedApp />
                        </ProtectedRoute>
                    } />
                </Routes>
                <ToastContainer />
            </BrowserRouter>
        </RepositoryProvider>
    );
}

export default App;
