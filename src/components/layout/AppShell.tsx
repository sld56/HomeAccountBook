import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TransactionForm } from '@/features/transactions/TransactionForm';
import { useSettings, applySettingsEffects } from '@/stores/settingsStore';
import { TweaksPanel } from '@/components/dev/TweaksPanel';
import { MigrationModal } from '@/features/settings/MigrationModal';
import { useAuth } from '@/features/auth/authStore';
import { isServerConfigured } from '@/lib/supabase';
import { startServerSync, stopServerSync } from '@/stores/serverSync';

export function AppShell() {
  const [addOpen, setAddOpen] = useState(false);
  const fontSize = useSettings((s) => s.fontSize);
  const hiContrast = useSettings((s) => s.hiContrast);
  const palette = useSettings((s) => s.palette);
  const household_id = useAuth((s) => s.household_id);

  useEffect(() => {
    applySettingsEffects(fontSize, hiContrast, palette);
  }, [fontSize, hiContrast, palette]);

  useEffect(() => {
    if (!isServerConfigured) return;
    if (household_id) {
      startServerSync();
      return () => { stopServerSync(); };
    }
  }, [household_id]);

  return (
    <div className="app-shell">
      <Sidebar onAddTransaction={() => setAddOpen(true)} />
      <main className="app-main">
        <Outlet context={{ openAdd: () => setAddOpen(true) }} />
      </main>
      <TransactionForm open={addOpen} onClose={() => setAddOpen(false)} />
      {isServerConfigured && <MigrationModal />}
      {import.meta.env.DEV && <TweaksPanel />}
    </div>
  );
}
