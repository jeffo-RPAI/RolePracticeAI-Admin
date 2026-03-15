// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminPlatformSettingsSection({ theme }) {
  const { getToken } = useAuth();
  const [platformSettings, setPlatformSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchPlatformSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/platform-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlatformSettings(data.settings || {});
      }
    } catch (e) {
      console.error('Failed to load platform settings:', e);
    }
  }, [getToken]);

  useEffect(() => { fetchPlatformSettings(); }, [fetchPlatformSettings]);

  const savePlatformSettings = async (updates) => {
    setSettingsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/platform-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: updates }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlatformSettings(data.settings || {});
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save platform settings:', e);
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-4">Platform Settings</h3>

        {/* Trial Banner Toggle */}
        <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Trial Upgrade Banner</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Show banner prompting trial users to subscribe</p>
          </div>
          <button
            onClick={() => {
              const newVal = platformSettings.trial_banner_enabled === 'true' ? 'false' : 'true';
              savePlatformSettings({ trial_banner_enabled: newVal });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              platformSettings.trial_banner_enabled === 'true' ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              platformSettings.trial_banner_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Days Threshold */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Banner Days Threshold</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Show banner when trial has this many days or fewer remaining</p>
          </div>
          <select
            value={platformSettings.trial_banner_days_threshold || '7'}
            onChange={(e) => savePlatformSettings({ trial_banner_days_threshold: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 px-3 py-1.5"
          >
            {[1, 2, 3, 5, 7, 10, 14].map(d => (
              <option key={d} value={String(d)}>{d} day{d !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        {settingsSaved && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">Settings saved.</p>
        )}
      </div>
    </div>
  );
}
