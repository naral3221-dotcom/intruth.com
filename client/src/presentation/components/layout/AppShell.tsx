import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { TopNavigation } from "./TopNavigation";
import { QuickAddButton } from "../ui/QuickAddButton";
import { useEmptyContextMenu } from "../context-menu";

interface AppShellProps {
    children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const { handleContextMenu } = useEmptyContextMenu();

    return (
        <div
            className="relative min-h-screen bg-background text-foreground"
            onContextMenu={handleContextMenu}
        >
            {/* Top Navigation */}
            <TopNavigation />

            {/* Main Content Area */}
            <main className="pt-14 min-h-screen">
                <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 lg:py-8">
                    {children || <Outlet />}
                </div>
            </main>

            {/* Quick Add FAB Button */}
            <QuickAddButton />
        </div>
    );
}
