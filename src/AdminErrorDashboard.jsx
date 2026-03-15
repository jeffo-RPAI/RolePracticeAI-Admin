// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { CheckCircle, XCircle, Eye, Filter, RefreshCw, Sparkles, Trash2, Archive, ChevronDown, ChevronRight, X, Copy, ClipboardCheck } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_WS_URL?.replace('wss://', 'https://').replace('ws://', 'http://') || 'http://localhost:3001';

function AdminErrorDashboard() {
  const { getToken } = useAuth();
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedError, setSelectedError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingError, setAnalyzingError] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const [copiedId, setCopiedId] = useState(null);

  const copyErrorDetails = (err) => {
    const lines = [];
    lines.push(`ERROR: ${err.message}`);
    lines.push(`Type: ${err.error_type} | Severity: ${err.severity} | Status: ${err.status}${err.source === 'sentry' ? ' | Source: Sentry' : ''}`);
    lines.push(`Time: ${new Date(err.created_at).toLocaleString()}`);
    if (err.user_name || err.user_email_full) lines.push(`User: ${err.user_name || ''} (${err.user_email_full || err.user_email || 'Anonymous'})`);
    if (err.organization_name) lines.push(`Org: ${err.organization_name}`);
    if (err.url) lines.push(`URL: ${err.url}`);
    if (err.user_agent) lines.push(`UA: ${err.user_agent}`);
    if (err.stack_trace) lines.push(`\nSTACK TRACE:\n${err.stack_trace}`);
    if (err.context && typeof err.context === 'object' && Object.keys(err.context).length > 0) {
      lines.push(`\nCONTEXT:\n${JSON.stringify(err.context, null, 2)}`);
    }
    if (err.admin_notes?.includes('AI Analysis:')) {
      lines.push(`\nAI ANALYSIS:\n${err.admin_notes.split('AI Analysis:')[1]?.trim() || err.admin_notes}`);
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedId(err.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const [filters, setFilters] = useState({
    severity: '',
    status: '',
    type: '',
    limit: 50,
    offset: 0
  });

  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/admin/error-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setStats(await response.json());
    } catch (error) {
      console.error('Failed to fetch error stats:', error);
    }
  }, [getToken]);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      params.append('limit', filters.limit);
      params.append('offset', filters.offset);

      const response = await fetch(`${BACKEND_URL}/api/admin/error-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors);
        setSelected(new Set());
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, filters]);

  const updateErrorStatus = async (errorIds, status) => {
    try {
      const token = await getToken();
      const isBulk = Array.isArray(errorIds);
      if (isBulk) {
        await fetch(`${BACKEND_URL}/api/admin/error-logs/bulk-update`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ errorIds, status })
        });
      } else {
        await fetch(`${BACKEND_URL}/api/admin/error-logs/${errorIds}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
      }
      await fetchErrors();
      await fetchStats();
      setSelectedError(null);
      setExpandedId(null);
    } catch (error) {
      console.error('Failed to update error:', error);
    }
  };

  const deleteErrors = async (errorIds) => {
    if (!window.confirm(`Delete ${errorIds.length} error${errorIds.length > 1 ? 's' : ''} permanently?`)) return;
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/error-logs`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorIds })
      });
      await fetchErrors();
      await fetchStats();
    } catch (error) {
      console.error('Failed to delete errors:', error);
    }
  };

  const analyzeErrorWithAI = async (errorId) => {
    try {
      setAnalyzingError(true);
      setAiAnalysis(null);
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/admin/analyze-error`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorId })
      });
      if (response.ok) {
        const data = await response.json();
        setAiAnalysis(data.analysis);
        await fetchErrors();
      }
    } catch (error) {
      console.error('Failed to analyze error with AI:', error);
    } finally {
      setAnalyzingError(false);
    }
  };

  useEffect(() => { fetchErrors(); fetchStats(); }, [fetchErrors, fetchStats]);

  useEffect(() => {
    const interval = setInterval(() => { fetchErrors(); fetchStats(); }, 60000);
    return () => clearInterval(interval);
  }, [fetchErrors, fetchStats]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      default: return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/20';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'investigating': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      case 'resolved': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
      case 'ignored': return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/20';
      case 'archived': return 'text-slate-500 bg-slate-50 dark:text-slate-500 dark:bg-slate-900/20';
      default: return '';
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const allSelected = errors.length > 0 && selected.size === errors.length;

  return (
    <div>
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">New</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-50">{stats.overview.new_count}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">Critical</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.overview.critical_new_count}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">Last 24h</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-50">{stats.overview.last_24h_count}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">Affected Users</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-50">{stats.overview.affected_users}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-slate-400" />
        <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value, offset: 0 })}
          className="px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200">
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, offset: 0 })}
          className="px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value, offset: 0 })}
          className="px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200">
          <option value="">All Types</option>
          <option value="javascript">JavaScript</option>
          <option value="network">Network</option>
          <option value="audio">Audio</option>
          <option value="websocket">WebSocket</option>
          <option value="ai_provider">AI Provider</option>
          <option value="recording">Recording</option>
          <option value="auth">Authentication</option>
          <option value="sentry">Sentry</option>
        </select>
        <select value={filters.limit} onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), offset: 0 })}
          className="px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200">
          <option value="25">25 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
        </select>
        <button onClick={() => { fetchErrors(); fetchStats(); }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selected.size} selected</span>
          <button onClick={() => updateErrorStatus([...selected], 'resolved')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">
            <CheckCircle className="w-3 h-3" /> Resolve
          </button>
          <button onClick={() => updateErrorStatus([...selected], 'ignored')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-600 text-white hover:bg-slate-700">
            <Archive className="w-3 h-3" /> Archive
          </button>
          <button onClick={() => deleteErrors([...selected])}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}

      {/* Error List */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading errors...</div>
      ) : errors.length === 0 ? (
        <div className="p-8 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">No errors found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2.5 text-left w-8">
                  <input type="checkbox" checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(errors.map(e => e.id)))}
                    className="rounded cursor-pointer" />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400 w-8"></th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Time</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Type</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Message</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400">User</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Organization</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Severity</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {errors.map((err) => {
                const isExpanded = expandedId === err.id;
                return (
                  <React.Fragment key={err.id}>
                    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/30' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : err.id)}>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(err.id)}
                          onChange={() => toggleSelect(err.id)} className="rounded cursor-pointer" />
                      </td>
                      <td className="px-3 py-2.5">
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(err.created_at).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{err.error_type}</span>
                        {err.source === 'sentry' && (
                          <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded" title="From Sentry">S</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm max-w-xs truncate text-slate-900 dark:text-slate-200">{err.message}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 max-w-[140px] truncate">
                        {err.user_email_full || err.user_email || 'Anonymous'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                        {err.organization_name || '–'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${getSeverityColor(err.severity)}`}>{err.severity}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${getStatusColor(err.status)}`}>{err.status}</span>
                      </td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {err.status !== 'resolved' && (
                            <button onClick={() => updateErrorStatus(err.id, 'resolved')}
                              title="Mark Resolved" className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {err.status !== 'ignored' && (
                            <button onClick={() => updateErrorStatus(err.id, 'ignored')}
                              title="Archive" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteErrors([err.id])}
                            title="Delete" className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="px-0 py-0">
                          <div className="mx-3 my-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 overflow-hidden">
                            {/* Full message */}
                            <div className="min-w-0">
                              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Message</label>
                              <p className="text-sm text-slate-900 dark:text-slate-100 mt-0.5 break-all whitespace-pre-wrap">{err.message}</p>
                            </div>

                            {/* Stack trace */}
                            {err.stack_trace && (
                              <div className="min-w-0">
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stack Trace</label>
                                <pre className="mt-0.5 p-2.5 bg-slate-100 dark:bg-slate-900 rounded text-[11px] text-slate-700 dark:text-slate-300 max-h-40 overflow-auto whitespace-pre-wrap break-all">
                                  {err.stack_trace}
                                </pre>
                              </div>
                            )}

                            {/* Context */}
                            {err.context && typeof err.context === 'object' && Object.keys(err.context).length > 0 && (
                              <div className="min-w-0">
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Context</label>
                                <pre className="mt-0.5 p-2.5 bg-slate-100 dark:bg-slate-900 rounded text-[11px] text-slate-700 dark:text-slate-300 max-h-32 overflow-auto whitespace-pre-wrap break-all">
                                  {JSON.stringify(err.context, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* User & Org info */}
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                              {(err.user_name || err.user_email_full) && (
                                <span><strong>User:</strong> {err.user_name} ({err.user_email_full})</span>
                              )}
                              {err.organization_name && (
                                <span><strong>Org:</strong> {err.organization_name}</span>
                              )}
                              {err.url && (
                                <span className="break-all"><strong>URL:</strong> {err.url}</span>
                              )}
                              {err.user_agent && (
                                <span className="break-all"><strong>UA:</strong> {err.user_agent}</span>
                              )}
                            </div>

                            {/* Sentry link */}
                            {err.source === 'sentry' && err.context?.sentryIssueUrl && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">SENTRY</span>
                                <a href={err.context.sentryIssueUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                                  View in Sentry →
                                </a>
                                {err.context.sentryCount && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">{err.context.sentryCount} occurrences in Sentry</span>
                                )}
                              </div>
                            )}

                            {/* AI Analysis */}
                            {err.admin_notes?.includes('AI Analysis:') && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 min-w-0">
                                <label className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">AI Analysis</label>
                                <pre className="mt-1 text-xs whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 font-sans">
                                  {err.admin_notes.split('AI Analysis:')[1]?.trim() || err.admin_notes}
                                </pre>
                              </div>
                            )}

                            {/* Actions row */}
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              {err.status === 'new' && (
                                <button onClick={() => updateErrorStatus(err.id, 'investigating')}
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                                  Investigating
                                </button>
                              )}
                              {err.status !== 'resolved' && (
                                <button onClick={() => updateErrorStatus(err.id, 'resolved')}
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">
                                  Resolve
                                </button>
                              )}
                              {err.status !== 'ignored' && (
                                <button onClick={() => updateErrorStatus(err.id, 'ignored')}
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-600 text-white hover:bg-slate-700">
                                  Archive
                                </button>
                              )}
                              <button onClick={() => analyzeErrorWithAI(err.id)} disabled={analyzingError}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                                <Sparkles className="w-3 h-3" />
                                {analyzingError ? 'Analyzing...' : 'AI Analyze'}
                              </button>
                              <button onClick={() => copyErrorDetails(err)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500">
                                {copiedId === err.id ? <><ClipboardCheck className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy All</>}
                              </button>
                              <button onClick={() => deleteErrors([err.id])}
                                className="ml-auto px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700">
                                Delete
                              </button>
                            </div>

                            {/* Live AI analysis result */}
                            {aiAnalysis && expandedId === err.id && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 min-w-0">
                                <label className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">AI Analysis (New)</label>
                                <pre className="mt-1 text-xs whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 font-sans">{aiAnalysis}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminErrorDashboard;
