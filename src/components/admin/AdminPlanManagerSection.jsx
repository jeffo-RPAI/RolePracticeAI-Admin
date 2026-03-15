// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Check, X, Save, RotateCcw } from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3001').replace('wss://', 'https://').replace('ws://', 'http://');

export default function AdminPlanManagerSection({ theme }) {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState({}); // { tierKey: { feature: bool } }
  const [saving, setSaving] = useState(null); // tierKey being saved
  const [saved, setSaved] = useState(null);

  const isDark = theme === 'dark';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/plan-features`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load plan features');
      const d = await res.json();
      setData(d);
      setPending({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFeature = (tierKey, feature) => {
    const tier = data.tiers.find(t => t.tier_key === tierKey);
    if (!tier) return;
    const currentValue = pending[tierKey]?.[feature] ?? tier[feature];
    setPending(prev => ({
      ...prev,
      [tierKey]: { ...prev[tierKey], [feature]: !currentValue }
    }));
  };

  const getEffectiveValue = (tier, feature) => {
    return pending[tier.tier_key]?.[feature] ?? tier[feature];
  };

  const hasPendingChanges = (tierKey) => {
    const changes = pending[tierKey];
    if (!changes) return false;
    const tier = data.tiers.find(t => t.tier_key === tierKey);
    return Object.entries(changes).some(([k, v]) => v !== tier[k]);
  };

  const saveTier = async (tierKey) => {
    const changes = pending[tierKey];
    if (!changes) return;

    // Only send actual changes
    const tier = data.tiers.find(t => t.tier_key === tierKey);
    const actualChanges = {};
    for (const [k, v] of Object.entries(changes)) {
      if (v !== tier[k]) actualChanges[k] = v;
    }
    if (Object.keys(actualChanges).length === 0) return;

    try {
      setSaving(tierKey);
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/plan-features/${tierKey}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: actualChanges })
      });
      if (!res.ok) throw new Error('Failed to save');
      const result = await res.json();

      // Update local data
      setData(prev => ({
        ...prev,
        tiers: prev.tiers.map(t => t.tier_key === tierKey ? { ...t, ...result.tier } : t)
      }));
      setPending(prev => { const n = { ...prev }; delete n[tierKey]; return n; });
      setSaved(tierKey);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const resetTier = (tierKey) => {
    setPending(prev => { const n = { ...prev }; delete n[tierKey]; return n; });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className={`mt-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Loading plan features...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
        <button onClick={fetchData} className="mt-3 text-sm text-blue-500 hover:text-blue-400">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const { tiers, featureColumns, featureLabels } = data;

  // Sort tiers by display_order
  const sortedTiers = [...tiers].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Plan Feature Manager</h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Manage which features are included in each subscription plan. Changes take effect immediately for all organizations on that plan.
        </p>
      </div>

      {/* Feature Matrix */}
      <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <th className={`px-4 py-3 text-left text-xs font-semibold sticky left-0 z-10 ${isDark ? 'text-slate-400 bg-slate-900' : 'text-slate-500 bg-white'}`}>
                  Feature
                </th>
                {sortedTiers.map(tier => (
                  <th key={tier.tier_key} className={`px-3 py-3 text-center text-xs font-semibold min-w-[100px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <div>{tier.name}</div>
                    <div className={`text-[10px] font-normal mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {tier.tier_key === 'enterprise' ? 'Custom'
                        : tier.monthly_price > 0 ? `$${(tier.monthly_price / 100).toFixed(0)}${tier.price_per_user ? '/user' : ''}/mo`
                        : 'Free'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureColumns.map((feature, idx) => (
                <tr
                  key={feature}
                  className={`border-b ${isDark ? 'border-slate-800/50' : 'border-slate-100'} ${idx % 2 === 0 ? '' : isDark ? 'bg-slate-800/20' : 'bg-slate-50/50'}`}
                >
                  <td className={`px-4 py-2.5 text-sm font-medium sticky left-0 z-10 ${isDark ? 'text-slate-300 bg-slate-900' : 'text-slate-700 bg-white'} ${idx % 2 !== 0 ? isDark ? '!bg-slate-900' : '!bg-white' : ''}`}>
                    {featureLabels[feature] || feature}
                  </td>
                  {sortedTiers.map(tier => {
                    const value = getEffectiveValue(tier, feature);
                    const isChanged = pending[tier.tier_key]?.[feature] !== undefined && pending[tier.tier_key][feature] !== tier[feature];
                    return (
                      <td key={tier.tier_key} className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => toggleFeature(tier.tier_key, feature)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all ${
                            value
                              ? isChanged
                                ? 'bg-green-500 text-white ring-2 ring-green-300'
                                : isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600'
                              : isChanged
                                ? 'bg-red-500/20 text-red-400 ring-2 ring-red-300'
                                : isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'
                          }`}
                        >
                          {value ? <Check className="h-4 w-4" /> : <X className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Save row per tier */}
        <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            {sortedTiers.map(tier => {
              const hasChanges = hasPendingChanges(tier.tier_key);
              if (!hasChanges && saved !== tier.tier_key) return null;
              return (
                <div key={tier.tier_key} className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{tier.name}:</span>
                  {saved === tier.tier_key ? (
                    <span className="text-xs text-green-500 font-medium">Saved!</span>
                  ) : (
                    <>
                      <button
                        onClick={() => saveTier(tier.tier_key)}
                        disabled={saving === tier.tier_key}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition disabled:opacity-50"
                      >
                        <Save className="h-3 w-3" />
                        {saving === tier.tier_key ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => resetTier(tier.tier_key)}
                        className={`p-1 rounded-lg transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        title="Reset changes"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {!sortedTiers.some(t => hasPendingChanges(t.tier_key)) && saved === null && (
              <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                Click any cell to toggle. Changes are saved per plan.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Plan Limits Summary */}
      <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`px-5 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Plan Limits</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <th className={`px-4 py-2 text-left text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Limit</th>
                {sortedTiers.map(tier => (
                  <th key={tier.tier_key} className={`px-3 py-2 text-center text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Monthly Minutes', key: 'monthly_minutes', format: v => v ? `${v}/user` : 'Unlimited' },
                { label: 'Max Users', key: 'max_users', format: v => v || 'Unlimited' },
                { label: 'Min Users', key: 'min_users', format: v => v || 1 },
                { label: 'Daily Call Limit', key: 'max_calls_per_day', format: v => v || 'Unlimited' },
                { label: 'AI Providers', key: 'ai_providers', format: v => (v || ['grok']).join(', ') },
              ].map((row, idx) => (
                <tr key={row.key} className={`border-b ${isDark ? 'border-slate-800/50' : 'border-slate-100'}`}>
                  <td className={`px-4 py-2 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{row.label}</td>
                  {sortedTiers.map(tier => (
                    <td key={tier.tier_key} className={`px-3 py-2 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {row.format(tier[row.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
