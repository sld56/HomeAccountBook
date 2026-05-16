import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { BudgetPage } from '@/features/budget/BudgetPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { AuthCallback } from '@/features/auth/AuthCallback';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { InviteAcceptPage } from '@/features/onboarding/InviteAcceptPage';
import { isServerConfigured } from '@/lib/supabase';

// 서버 미설정 시(=로컬 전용 빌드)에는 인증 게이트 없이 바로 앱 진입
const protectedRoot = isServerConfigured
  ? {
      path: '/',
      element: (
        <AuthGuard>
          <AppShell />
        </AuthGuard>
      ),
    }
  : { path: '/', element: <AppShell /> };

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/invite', element: <InviteAcceptPage /> },
  {
    path: '/onboarding',
    element: isServerConfigured ? (
      <AuthGuard>
        <OnboardingPage />
      </AuthGuard>
    ) : (
      <OnboardingPage />
    ),
  },
  {
    ...protectedRoot,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'reports/:tab', element: <ReportsPage /> },
      { path: 'budget', element: <BudgetPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
