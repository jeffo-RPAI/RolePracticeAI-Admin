// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Globe, Users, TrendingUp, Clock, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '–';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatCard({ icon: Icon, label, value, subtitle, isDark }) {
  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>{value}</p>
      {subtitle && <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>}
    </div>
  );
}

function SetupInstructions({ isDark }) {
  const steps = [
    'Create a Google Cloud service account with the GA4 Data API enabled.',
    'Add the service account email as a Viewer on your GA4 property.',
    'Set the GOOGLE_ANALYTICS_PROPERTY_ID environment variable to your GA4 property ID.',
    'Set the GOOGLE_SERVICE_ACCOUNT_JSON environment variable to the full service account JSON key.',
    'Restart the backend server to apply changes.',
  ];

  return (
    <div className={`rounded-xl border p-6 max-w-2xl mx-auto ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
          <Globe className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
            Website Traffic Analytics
          </h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Google Analytics integration is not configured yet.
          </p>
        </div>
      </div>

      <div className={`rounded-lg p-4 mb-4 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
        <div className="flex gap-2">
          <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            To display website traffic data, connect a Google Analytics 4 property to this admin panel.
          </p>
        </div>
      </div>

      <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Setup Steps</h4>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {i + 1}
            </span>
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{step}</span>
          </li>
        ))}
      </ol>

      <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Required env vars: <code className={`px-1 py-0.5 rounded text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>GOOGLE_ANALYTICS_PROPERTY_ID</code>{' '}
          and <code className={`px-1 py-0.5 rounded text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>GOOGLE_SERVICE_ACCOUNT_JSON</code>
        </p>
      </div>
    </div>
  );
}

function DataTable({ title, columns, rows, isDark }) {
  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={isDark ? 'bg-slate-700/40' : 'bg-slate-50'}>
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-2 text-left text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={`px-4 py-3 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  No data available
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className={`border-t ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  {columns.map((col, j) => (
                    <td key={j} className={`px-4 py-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {col.render ? col.render(row) : row[col.key] ?? '–'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminWebsiteTrafficSection({ theme }) {
  const isDark = theme === 'dark';
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configured, setConfigured] = useState(null);
  const [days, setDays] = useState(30);

  const fetchTraffic = useCallback(async (selectedDays) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/website-traffic?days=${selectedDays || days}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 404) {
          setConfigured(false);
          setData(null);
          return;
        }
        throw new Error(`Server returned ${res.status}`);
      }
      const json = await res.json();
      if (json.configured === false) {
        setConfigured(false);
        setData(null);
      } else {
        setConfigured(true);
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching website traffic:', err);
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setConfigured(false);
      } else {
        setError(err.message || 'Failed to load website traffic data');
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, days]);

  useEffect(() => {
    fetchTraffic(days);
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDaysChange = (newDays) => {
    setDays(newDays);
  };

  const dayOptions = [7, 14, 30, 90];
  const summary = data?.summary || {};
  const totalSourceSessions = (data?.trafficSources || []).reduce((sum, s) => sum + (s.sessions || 0), 0);

  // --- Render ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className={`w-6 h-6 animate-spin ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
        <span className={`ml-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading traffic data...</span>
      </div>
    );
  }

  if (configured === false) {
    return <SetupInstructions isDark={isDark} />;
  }

  if (error) {
    return (
      <div className={`rounded-xl border p-6 text-center ${isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
        <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
        <button
          onClick={() => fetchTraffic(days)}
          className={`mt-3 text-xs px-3 py-1.5 rounded-lg font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Globe className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>Website Traffic</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range selector */}
          <div className={`inline-flex rounded-lg border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {dayOptions.map((d) => (
              <button
                key={d}
                onClick={() => handleDaysChange(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === d
                    ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchTraffic(days)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={TrendingUp} label="Sessions" value={(summary.sessions ?? 0).toLocaleString()} isDark={isDark} />
        <StatCard icon={Users} label="Users" value={(summary.users ?? 0).toLocaleString()} isDark={isDark} />
        <StatCard icon={Users} label="New Users" value={(summary.newUsers ?? 0).toLocaleString()} isDark={isDark} />
        <StatCard icon={TrendingUp} label="Bounce Rate" value={summary.bounceRate != null ? `${summary.bounceRate.toFixed(1)}%` : '–'} isDark={isDark} />
        <StatCard icon={Clock} label="Avg Duration" value={formatDuration(summary.avgSessionDuration)} isDark={isDark} />
      </div>

      {/* Daily traffic (chart placeholder + mini table) */}
      <div className={`rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Daily Traffic</h4>
        </div>
        <div className={`px-4 py-3 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <p className="text-xs italic mb-3">Chart requires Recharts (add to admin app)</p>
        </div>
        {data?.dailyTraffic?.length > 0 && (
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className={`sticky top-0 ${isDark ? 'bg-slate-700/60' : 'bg-slate-50'}`}>
                <tr>
                  <th className={`px-4 py-1.5 text-left font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date</th>
                  <th className={`px-4 py-1.5 text-right font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sessions</th>
                  <th className={`px-4 py-1.5 text-right font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Users</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyTraffic.map((row, i) => (
                  <tr key={i} className={`border-t ${isDark ? 'border-slate-700/40' : 'border-slate-100'}`}>
                    <td className={`px-4 py-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{row.date}</td>
                    <td className={`px-4 py-1.5 text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{(row.sessions ?? 0).toLocaleString()}</td>
                    <td className={`px-4 py-1.5 text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{(row.users ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom tables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pages */}
        <DataTable
          title="Top Pages"
          isDark={isDark}
          columns={[
            { label: 'Page', key: 'page' },
            { label: 'Views', key: 'views', render: (r) => (r.views ?? 0).toLocaleString() },
            { label: 'Sessions', key: 'sessions', render: (r) => (r.sessions ?? 0).toLocaleString() },
          ]}
          rows={data?.topPages || []}
        />

        {/* Traffic Sources */}
        <DataTable
          title="Traffic Sources"
          isDark={isDark}
          columns={[
            { label: 'Source', key: 'source' },
            { label: 'Sessions', key: 'sessions', render: (r) => (r.sessions ?? 0).toLocaleString() },
            { label: '%', key: 'pct', render: (r) => totalSourceSessions > 0 ? `${((r.sessions / totalSourceSessions) * 100).toFixed(1)}%` : '–' },
          ]}
          rows={data?.trafficSources || []}
        />

        {/* Top Countries */}
        <DataTable
          title="Top Countries"
          isDark={isDark}
          columns={[
            { label: 'Country', key: 'country' },
            { label: 'Sessions', key: 'sessions', render: (r) => (r.sessions ?? 0).toLocaleString() },
          ]}
          rows={data?.topCountries || []}
        />
      </div>
    </div>
  );
}
