import { WorkspaceGuard } from "@/components/auth/workspace-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <WorkspaceGuard>
      <AppShell>{children}</AppShell>
    </WorkspaceGuard>
  );
}
