// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Mail, Send, Eye, AlertTriangle, XCircle, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

function timeAgo(ts) {
  if (!ts) return '–';
  const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const STATUS_BADGES = {
  sent:       { bg: 'bg-gray-100 text-gray-700', darkBg: 'bg-gray-700 text-gray-300' },
  delivered:  { bg: 'bg-blue-100 text-blue-700', darkBg: 'bg-blue-900/40 text-blue-300' },
  opened:     { bg: 'bg-green-100 text-green-700', darkBg: 'bg-green-900/40 text-green-300' },
  bounced:    { bg: 'bg-red-100 text-red-700', darkBg: 'bg-red-900/40 text-red-300' },
  complained: { bg: 'bg-orange-100 text-orange-700', darkBg: 'bg-orange-900/40 text-orange-300' },
};

export default function AdminEmailLogsSection({ theme }) {
  const { getToken } = useAuth();
  const isDark = theme === 'dark';

  const [stats, setStats] = useState(null);
  const [emails, setEmails] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const tableBg = isDark ? 'bg-slate-800' : 'bg-white';
  const rowHover = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  const loadStats = useCallback(async (token) => {
    const res = await fetch(`${BACKEND_URL}/api/site-admin/email-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load email stats');
    return res.json();
  }, []);

  const loadLogs = useCallback(async (token, pg) => {
    const params = new URLSearchParams({ page: pg, limit });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    const res = await fetch(`${BACKEND_URL}/api/site-admin/email-logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load email logs');
    return res.json();
  }, [limit, statusFilter, typeFilter, searchQuery]);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [statsData, logsData] = await Promise.all([
        loadStats(token),
        loadLogs(token, pg),
      ]);
      setStats(statsData);
      setEmails(logsData.emails || []);
      setTotal(logsData.total || 0);
      setPage(logsData.page || pg);
    } catch {
      setError('Failed to load email data');
    } finally {
      setLoading(false);
    }
  }, [getToken, loadStats, loadLogs, page]);

  useEffect(() => { load(1); }, [statusFilter, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    load(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const renderStatusBadge = (status) => {
    const badge = STATUS_BADGES[status] || STATUS_BADGES.sent;
    const classes = isDark ? badge.darkBg : badge.bg;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
        {status}
      </span>
    );
  };

  // Stats cards
  const totals = stats?.totals || {};
  const last7 = stats?.last7Days || {};
  const byType = stats?.byType || [];
  const openRate = totals.sent ? ((totals.opened || 0) / totals.sent * 100).toFixed(1) : '0.0';
  const bounceRate = totals.sent ? ((totals.bounced || 0) / totals.sent * 100).toFixed(1) : '0.0';

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className={`ml-2 ${mutedColor}`}>Loading email data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h2 className={`text-lg font-semibold ${textColor}`}>Email Tracking</h2>
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition
            ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <div className={`text-xs font-medium uppercase tracking-wide ${mutedColor}`}>Total Sent</div>
          <div className={`text-2xl font-bold mt-1 ${textColor}`}>{totals.sent || 0}</div>
          <Send className={`w-4 h-4 mt-1 ${mutedColor}`} />
        </div>
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <div className={`text-xs font-medium uppercase tracking-wide ${mutedColor}`}>Open Rate</div>
          <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{openRate}%</div>
          <Eye className={`w-4 h-4 mt-1 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
        </div>
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <div className={`text-xs font-medium uppercase tracking-wide ${mutedColor}`}>Bounce Rate</div>
          <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{bounceRate}%</div>
          <AlertTriangle className={`w-4 h-4 mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
        </div>
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <div className={`text-xs font-medium uppercase tracking-wide ${mutedColor}`}>Bounced</div>
          <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{totals.bounced || 0}</div>
          <XCircle className={`w-4 h-4 mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
        </div>
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <div className={`text-xs font-medium uppercase tracking-wide ${mutedColor}`}>Complained</div>
          <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{totals.complained || 0}</div>
          <AlertTriangle className={`w-4 h-4 mt-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
        </div>
      </div>

      {/* Last 7 Days */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <h3 className={`text-sm font-semibold mb-3 ${textColor}`}>Last 7 Days</h3>
        <div className="flex gap-6 text-sm">
          <div>
            <span className={mutedColor}>Sent:</span>{' '}
            <span className={`font-semibold ${textColor}`}>{last7.sent || 0}</span>
          </div>
          <div>
            <span className={mutedColor}>Opened:</span>{' '}
            <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{last7.opened || 0}</span>
          </div>
          <div>
            <span className={mutedColor}>Bounced:</span>{' '}
            <span className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{last7.bounced || 0}</span>
          </div>
        </div>
      </div>

      {/* Email Type Breakdown */}
      {byType.length > 0 && (
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <h3 className={`text-sm font-semibold mb-3 ${textColor}`}>By Email Type</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${borderColor}`}>
                  <th className={`text-left py-2 pr-4 font-medium ${mutedColor}`}>Type</th>
                  <th className={`text-right py-2 px-4 font-medium ${mutedColor}`}>Count</th>
                  <th className={`text-right py-2 px-4 font-medium ${mutedColor}`}>Opens</th>
                  <th className={`text-right py-2 pl-4 font-medium ${mutedColor}`}>Bounces</th>
                </tr>
              </thead>
              <tbody>
                {byType.map((row) => (
                  <tr key={row.email_type} className={`border-b ${borderColor} ${rowHover}`}>
                    <td className={`py-2 pr-4 ${textColor}`}>{row.email_type}</td>
                    <td className={`py-2 px-4 text-right ${textColor}`}>{row.count}</td>
                    <td className={`py-2 px-4 text-right ${isDark ? 'text-green-400' : 'text-green-600'}`}>{row.opens || 0}</td>
                    <td className={`py-2 pl-4 text-right ${isDark ? 'text-red-400' : 'text-red-600'}`}>{row.bounces || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${inputBg}`}
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="opened">Opened</option>
            <option value="bounced">Bounced</option>
            <option value="complained">Complained</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${inputBg}`}
          >
            <option value="all">All Types</option>
            {byType.map((t) => (
              <option key={t.email_type} value={t.email_type}>{t.email_type}</option>
            ))}
          </select>

          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedColor}`} />
              <input
                type="text"
                placeholder="Search recipient or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-lg border pl-9 pr-3 py-1.5 text-sm ${inputBg}`}
              />
            </div>
            <button
              type="submit"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
                ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Email Logs Table */}
      <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${tableBg}`}>
            <thead>
              <tr className={`border-b ${borderColor} ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <th className={`text-left py-3 px-4 font-medium ${mutedColor}`}>Date</th>
                <th className={`text-left py-3 px-4 font-medium ${mutedColor}`}>Recipient</th>
                <th className={`text-left py-3 px-4 font-medium ${mutedColor}`}>Subject</th>
                <th className={`text-left py-3 px-4 font-medium ${mutedColor}`}>Type</th>
                <th className={`text-left py-3 px-4 font-medium ${mutedColor}`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`py-8 text-center ${mutedColor}`}>
                    No emails found.
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr key={email.id} className={`border-b ${borderColor} ${rowHover}`}>
                    <td className={`py-2.5 px-4 whitespace-nowrap ${mutedColor}`} title={email.sent_at || email.created_at}>
                      {timeAgo(email.sent_at || email.created_at)}
                    </td>
                    <td className={`py-2.5 px-4 ${textColor} max-w-[200px] truncate`}>{email.recipient}</td>
                    <td className={`py-2.5 px-4 ${textColor} max-w-[250px] truncate`}>{email.subject}</td>
                    <td className={`py-2.5 px-4 ${mutedColor} whitespace-nowrap`}>{email.email_type || '–'}</td>
                    <td className="py-2.5 px-4">{renderStatusBadge(email.status || 'sent')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${borderColor}`}>
            <span className={`text-sm ${mutedColor}`}>
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-40
                  ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages || loading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-40
                  ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
