// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, Building2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminScoreAnalyticsSection({ theme }) {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drillOrg, setDrillOrg] = useState(null);
  const [drillData, setDrillData] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    fetchPlatformData();
  }, [getToken]);

  const fetchPlatformData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/score-analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load score analytics');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgDrillDown = async (orgId, orgName) => {
    try {
      setDrillOrg({ id: orgId, name: orgName });
      setDrillLoading(true);
      setDrillData(null);
      setExpandedUser(null);
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/score-analytics?orgId=${orgId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load org details');
      setDrillData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setDrillLoading(false);
    }
  };

  const TrendBadge = ({ trend }) => {
    if (trend === 'improving') return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
        <TrendingUp className="h-3 w-3" /> Improving
      </span>
    );
    if (trend === 'declining') return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
        <TrendingDown className="h-3 w-3" /> Declining
      </span>
    );
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
        <Minus className="h-3 w-3" /> Stable
      </span>
    );
  };

  const ScoreBar = ({ value, label }) => {
    const pct = Math.min((value / 100) * 100, 100);
    const color = value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-3">
        <span className={`text-xs w-44 truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
        <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-semibold w-8 text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{value}</span>
      </div>
    );
  };

  const Sparkline = ({ points, width = 100, height = 28 }) => {
    if (!points || points.length < 2) return null;
    const scores = points.map(p => p.score);
    const min = Math.min(...scores) - 5;
    const max = Math.max(...scores) + 5;
    const range = max - min || 1;
    const step = width / (scores.length - 1);
    const pathData = scores.map((s, i) => `${i === 0 ? 'M' : 'L'}${i * step},${height - ((s - min) / range) * height}`).join(' ');
    const strokeColor = scores[scores.length - 1] >= scores[0] ? '#22c55e' : '#ef4444';
    return <svg width={width} height={height} className="inline-block"><path d={pathData} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  };

  const scoreColor = (score) => {
    if (score >= 70) return isDark ? 'text-green-400' : 'text-green-600';
    if (score >= 50) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className={`mt-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Loading score analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
      </div>
    );
  }

  // ===== ORG DRILL-DOWN VIEW =====
  if (drillOrg) {
    const dd = drillData;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setDrillOrg(null); setDrillData(null); setExpandedUser(null); }}
            className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{drillOrg.name}</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Score analytics drill-down</p>
          </div>
        </div>

        {drillLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          </div>
        ) : dd ? (
          <>
            {/* Org summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Scored Calls (90d)</p>
                <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{dd.summary?.totalCalls || 0}</p>
              </div>
              <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Average Score</p>
                <p className={`text-2xl font-bold mt-1 ${scoreColor(dd.summary?.avgScore || 0)}`}>{dd.summary?.avgScore || 0}/100</p>
              </div>
              <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Users</p>
                <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{dd.users?.length || 0}</p>
              </div>
            </div>

            {/* Category averages */}
            {dd.summary?.categoryAvgs && (
              <div className={`rounded-2xl p-6 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Category Averages</h3>
                <div className="space-y-3">
                  {Object.entries(dd.summary.categoryLabels || {}).map(([key, label]) => {
                    const val = dd.summary.categoryAvgs[key];
                    if (val === null || val === undefined) return null;
                    return <ScoreBar key={key} value={val} label={label} />;
                  })}
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  {dd.summary.strongest?.length > 0 && (
                    <div className={`rounded-xl p-4 ${isDark ? 'bg-green-900/10 border border-green-900/30' : 'bg-green-50 border border-green-200'}`}>
                      <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>Strengths</p>
                      {dd.summary.strongest.map(s => (
                        <div key={s.key} className="flex justify-between py-1">
                          <span className={`text-sm ${isDark ? 'text-green-300' : 'text-green-800'}`}>{s.label}</span>
                          <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>{s.avg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {dd.summary.weakest?.length > 0 && (
                    <div className={`rounded-xl p-4 ${isDark ? 'bg-red-900/10 border border-red-900/30' : 'bg-red-50 border border-red-200'}`}>
                      <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-red-400' : 'text-red-700'}`}>Areas for Improvement</p>
                      {dd.summary.weakest.map(w => (
                        <div key={w.key} className="flex justify-between py-1">
                          <span className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>{w.label}</span>
                          <span className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>{w.avg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Per-user list */}
            {dd.users?.length > 0 && (
              <div className={`rounded-2xl p-6 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Users</h3>
                <div className="space-y-2">
                  {dd.users.map(user => {
                    const isExpanded = expandedUser === user.userId;
                    return (
                      <div key={user.userId} className={`rounded-xl overflow-hidden ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        <button
                          onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                          className={`w-full flex items-center gap-4 px-4 py-3 text-left`}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
                            <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{user.email}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Sparkline points={user.scoreHistory} />
                            <div className="text-right">
                              <p className={`text-lg font-bold ${scoreColor(user.avgScore)}`}>{user.avgScore}</p>
                              <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{user.totalCalls} calls</p>
                            </div>
                            <TrendBadge trend={user.trend} />
                          </div>
                        </button>
                        {isExpanded && user.categoryAvgs && (
                          <div className={`px-4 pb-4 pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Category Breakdown</p>
                            <div className="space-y-2">
                              {Object.entries(dd.summary?.categoryLabels || {}).map(([key, label]) => {
                                const val = user.categoryAvgs[key];
                                if (val === null || val === undefined) return null;
                                return <ScoreBar key={key} value={val} label={label} />;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  }

  // ===== PLATFORM OVERVIEW =====
  const { organizations = [], platformSummary = {} } = data || {};
  const { categoryLabels = {}, categoryAvgs = {}, weakest = [], strongest = [], weeklyTrend = [] } = platformSummary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Score Analytics</h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Platform-wide scoring trends across all organizations (last 90 days)
        </p>
      </div>

      {/* Platform Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Scored Calls</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{platformSummary.totalScoredCalls || 0}</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Organizations</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{organizations.length}</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Platform Avg Score</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {organizations.length > 0 ? Math.round(organizations.reduce((s, o) => s + o.avgScore * o.totalCalls, 0) / Math.max(organizations.reduce((s, o) => s + o.totalCalls, 0), 1)) : 0}/100
          </p>
        </div>
      </div>

      {/* Platform Category Breakdown */}
      {Object.keys(categoryAvgs).length > 0 && (
        <div className={`rounded-2xl p-6 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Platform Category Averages
          </h3>
          <div className="space-y-3">
            {Object.entries(categoryLabels).map(([key, label]) => {
              const val = categoryAvgs[key];
              if (val === null || val === undefined) return null;
              return <ScoreBar key={key} value={val} label={label} />;
            })}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {strongest.length > 0 && (
              <div className={`rounded-xl p-4 ${isDark ? 'bg-green-900/10 border border-green-900/30' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>Platform Strengths</p>
                {strongest.map(s => (
                  <div key={s.key} className="flex justify-between py-1">
                    <span className={`text-sm ${isDark ? 'text-green-300' : 'text-green-800'}`}>{s.label}</span>
                    <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>{s.avg}</span>
                  </div>
                ))}
              </div>
            )}
            {weakest.length > 0 && (
              <div className={`rounded-xl p-4 ${isDark ? 'bg-red-900/10 border border-red-900/30' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-red-400' : 'text-red-700'}`}>Platform Weak Areas</p>
                {weakest.map(w => (
                  <div key={w.key} className="flex justify-between py-1">
                    <span className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>{w.label}</span>
                    <span className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>{w.avg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Platform Trend */}
      {weeklyTrend.length > 0 && (
        <div className={`rounded-2xl p-6 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Weekly Score Trend
          </h3>
          <div className="flex items-end gap-2 h-40">
            {weeklyTrend.map((week, i) => {
              const height = Math.max((week.avgScore / 100) * 100, 4);
              const weekLabel = new Date(week.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const color = week.avgScore >= 70 ? 'from-green-600 to-green-400' : week.avgScore >= 50 ? 'from-yellow-600 to-yellow-400' : 'from-red-600 to-red-400';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{week.avgScore}</span>
                  <div className={`w-full rounded-t-lg bg-gradient-to-t ${color} transition-all`} style={{ height: `${height}%`, minHeight: '4px' }} />
                  <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{weekLabel}</span>
                  <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{week.calls} calls</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Organizations Table */}
      <div className={`rounded-2xl p-6 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Organizations by Score Activity
        </h3>
        {organizations.length === 0 ? (
          <p className={`text-sm text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            No scored calls across organizations
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <th className={`pb-3 text-left text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Organization</th>
                  <th className={`pb-3 text-right text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Calls</th>
                  <th className={`pb-3 text-right text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg Score</th>
                  <th className={`pb-3 text-right text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Users</th>
                  <th className={`pb-3 text-right text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Last Call</th>
                  <th className={`pb-3 text-right text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}></th>
                </tr>
              </thead>
              <tbody>
                {organizations.map(org => (
                  <tr key={org.id} className={`border-b ${isDark ? 'border-slate-800/50' : 'border-slate-100'}`}>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className={`h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{org.name}</span>
                      </div>
                    </td>
                    <td className={`py-3 text-right text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{org.totalCalls}</td>
                    <td className="py-3 text-right">
                      <span className={`text-sm font-semibold ${scoreColor(org.avgScore)}`}>{org.avgScore}</span>
                    </td>
                    <td className={`py-3 text-right text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{org.activeUsers}</td>
                    <td className={`py-3 text-right text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {org.lastCall ? new Date(org.lastCall).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => fetchOrgDrillDown(org.id, org.name)}
                        className={`text-xs font-medium px-3 py-1 rounded-lg transition ${
                          isDark ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
