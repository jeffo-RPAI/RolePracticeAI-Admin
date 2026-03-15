// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Filter, Building2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

const CATEGORY_LABELS = {
  discovery: 'Discovery & Questioning',
  businessAcumen: 'Business Acumen & Qualification',
  activeListening: 'Active Listening',
  valueCommunication: 'Value Communication',
  objectionHandling: 'Objection Handling',
  callControl: 'Call Control & Presence',
  nextSteps: 'Next Steps & Commitment',
  rapport: 'Rapport & Trust Building'
};

export default function AdminCallBrowserSection({ theme }) {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [orgFilter, setOrgFilter] = useState('');
  const [recordingFilter, setRecordingFilter] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    fetchCalls();
  }, [page, orgFilter, recordingFilter]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const params = new URLSearchParams({ page, limit: 25 });
      if (orgFilter) params.set('orgId', orgFilter);
      if (recordingFilter) params.set('hasRecording', recordingFilter);
      const res = await fetch(`${BACKEND_URL}/api/site-admin/calls?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load calls');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score) => {
    if (score >= 70) return isDark ? 'text-green-400' : 'text-green-600';
    if (score >= 50) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  const scoreBg = (score) => {
    if (score >= 70) return isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
    if (score >= 50) return isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700';
    return isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
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

  // ===== CALL DETAIL VIEW =====
  if (selectedCall) {
    const call = selectedCall;
    const rawScores = call.scores || {};
    const scores = rawScores;
    const categoryScores = rawScores?.scores || rawScores || {};
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedCall(null)} className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{call.userName}'s Call</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {call.orgName} · {new Date(call.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} {new Date(call.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              {call.scenarioType && ` · ${call.scenarioType}`}
            </p>
          </div>
          <div className={`text-3xl font-bold ${scoreColor(call.score)}`}>{call.score}/100</div>
        </div>

        {/* Recording */}
        {call.audioRecording && (
          <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Call Recording</h3>
            <audio controls className="w-full h-10" preload="none">
              <source src={call.audioRecording} type="audio/webm" />
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* Call Details */}
        <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'User', value: call.userName },
              { label: 'Organization', value: call.orgName },
              { label: 'Role', value: call.role || '-' },
              { label: 'Difficulty', value: call.difficulty || '-' },
              { label: 'Duration', value: call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '-' },
              { label: 'Methodology', value: call.methodology || '-' },
              { label: 'Persona', value: call.persona || '-' },
              { label: 'Segment', value: call.segment || '-' },
            ].map(item => (
              <div key={item.label}>
                <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</p>
                <p className={`text-sm font-medium mt-0.5 capitalize ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Category Scores */}
        {Object.entries(CATEGORY_LABELS).some(([key]) => categoryScores[key] != null) && (
          <div className={`rounded-2xl p-6 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Category Scores</h3>
            <div className="space-y-3">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const val = categoryScores[key];
                if (val == null) return null;
                return <ScoreBar key={key} value={val} label={label} />;
              })}
            </div>
          </div>
        )}

        {/* Strengths & Improvements */}
        {(scores.strengths?.length > 0 || scores.improvements?.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {scores.strengths?.length > 0 && (
              <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-green-900/10 border border-green-900/30' : 'bg-green-50 border border-green-200'}`}>
                <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-green-400' : 'text-green-700'}`}>Strengths</h4>
                <ul className="space-y-2">
                  {scores.strengths.map((s, i) => (
                    <li key={i} className={`text-sm ${isDark ? 'text-green-300' : 'text-green-800'}`}>• {typeof s === 'string' ? s : s.text || s.description || JSON.stringify(s)}</li>
                  ))}
                </ul>
              </div>
            )}
            {scores.improvements?.length > 0 && (
              <div className={`rounded-2xl p-5 shadow-lg ${isDark ? 'bg-red-900/10 border border-red-900/30' : 'bg-red-50 border border-red-200'}`}>
                <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-red-400' : 'text-red-700'}`}>Areas for Improvement</h4>
                <ul className="space-y-2">
                  {scores.improvements.map((s, i) => (
                    <li key={i} className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>• {typeof s === 'string' ? s : s.text || s.description || JSON.stringify(s)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Key Moments */}
        {scores.keyMoments?.length > 0 && (
          <div className={`rounded-2xl p-6 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <h3 className={`text-base font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Key Moments</h3>
            <div className="space-y-2">
              {scores.keyMoments.map((m, i) => (
                <div key={i} className={`text-sm px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-700'}`}>
                  {typeof m === 'string' ? m : m.text || m.description || JSON.stringify(m)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coaching Insight */}
        {scores.coachingInsight && (
          <div className={`rounded-2xl p-6 shadow-lg ${isDark ? 'bg-purple-900/10 border border-purple-900/30' : 'bg-purple-50 border border-purple-200'}`}>
            <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Coaching Insight</h3>
            <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>{scores.coachingInsight}</p>
          </div>
        )}

        {/* Next Steps */}
        {scores.nextStepsRecommendation && (
          <div className={`rounded-2xl p-6 shadow-lg ${isDark ? 'bg-blue-900/10 border border-blue-900/30' : 'bg-blue-50 border border-blue-200'}`}>
            <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Recommended Next Steps</h3>
            <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>{scores.nextStepsRecommendation}</p>
          </div>
        )}
      </div>
    );
  }

  // ===== CALL LIST VIEW =====
  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Call Browser</h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Browse all calls across the platform. Click any call to view scorecard and listen to recording.
        </p>
      </div>

      {/* Filters */}
      <div className={`rounded-2xl p-4 shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white'} flex flex-wrap items-center gap-3`}>
        <Filter className={`h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        <select
          value={orgFilter}
          onChange={e => { setOrgFilter(e.target.value); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
        >
          <option value="">All Organizations</option>
          {data?.organizations?.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        <select
          value={recordingFilter}
          onChange={e => { setRecordingFilter(e.target.value); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
        >
          <option value="">All Calls</option>
          <option value="true">With Recording</option>
          <option value="false">Without Recording</option>
        </select>
        {data?.pagination && (
          <span className={`ml-auto text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {data.pagination.total} total calls
          </span>
        )}
      </div>

      {/* Calls Table */}
      <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          </div>
        ) : error ? (
          <p className={`text-sm text-center py-12 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
        ) : data?.calls?.length === 0 ? (
          <p className={`text-sm text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No calls found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    {['Date', 'User', 'Organization', 'Scenario', 'Duration', 'Score', 'Recording', ''].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} ${h === 'Score' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.calls.map(call => (
                    <tr
                      key={call.id}
                      className={`border-b cursor-pointer transition ${isDark ? 'border-slate-800/50 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}
                      onClick={() => setSelectedCall(call)}
                    >
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {new Date(call.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(call.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{call.userName}</p>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{call.userEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className={`h-3.5 w-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                          <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{call.orgName}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{call.scenarioType || '-'}</td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {call.duration ? `${Math.floor(call.duration / 60)}m` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreBg(call.score)}`}>
                          {call.score}/100
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {call.audioRecording ? (
                          <Play className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        ) : (
                          <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>–</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right`}>
                        <ChevronRight className={`h-4 w-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className={`px-6 py-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between`}>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} calls)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={data.pagination.page <= 1}
                    className={`p-1.5 rounded-lg transition disabled:opacity-30 ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    className={`p-1.5 rounded-lg transition disabled:opacity-30 ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
