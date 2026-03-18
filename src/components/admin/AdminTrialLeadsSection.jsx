// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  UserPlus, Users, Clock, CheckCircle, XCircle, ArrowUpDown,
  ExternalLink, Mail, RefreshCw, Search, Filter
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

function getTrialStatus(lead) {
  // Converted: tier_key is no longer trial and subscription is active
  if (
    lead.tier_key && lead.tier_key !== 'trial' &&
    lead.subscription_tier && lead.subscription_tier !== 'trial' &&
    lead.subscription_status !== 'trialing'
  ) {
    return 'converted';
  }

  // Check expiry
  if (lead.current_period_end) {
    const end = new Date(lead.current_period_end);
    if (end > new Date()) return 'active';
    return 'expired';
  }

  // No period end set – treat as expired if older than 14 days
  const created = new Date(lead.created_at);
  const daysSinceCreation = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
  if (daysSinceCreation > 14) return 'expired';
  return 'active';
}

function getDaysRemaining(lead) {
  if (!lead.current_period_end) {
    // Fallback: assume 14-day trial from creation
    const created = new Date(lead.created_at);
    const end = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
    const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }
  const end = new Date(lead.current_period_end);
  const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function formatRelative(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export default function AdminTrialLeadsSection({ theme = 'dark' }) {
  const { getToken } = useAuth();
  const isDark = theme === 'dark';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/trial-leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch trial leads');
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Compute statuses
  const leadsWithStatus = leads.map(l => ({
    ...l,
    status: getTrialStatus(l),
    days_remaining: getDaysRemaining(l),
    call_count: parseInt(l.call_count, 10) || 0,
  }));

  // Filter
  const filtered = leadsWithStatus.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (l.full_name || '').toLowerCase().includes(q);
      const matchEmail = (l.email || '').toLowerCase().includes(q);
      const matchOrg = (l.org_name || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchOrg) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'created_at':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      case 'call_count':
        aVal = a.call_count;
        bVal = b.call_count;
        break;
      case 'last_active':
        aVal = a.last_call_at ? new Date(a.last_call_at).getTime() : 0;
        bVal = b.last_call_at ? new Date(b.last_call_at).getTime() : 0;
        break;
      case 'name':
        aVal = (a.full_name || '').toLowerCase();
        bVal = (b.full_name || '').toLowerCase();
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      default:
        aVal = 0; bVal = 0;
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Summary stats
  const totalTrials = leadsWithStatus.length;
  const activeTrials = leadsWithStatus.filter(l => l.status === 'active').length;
  const expiredTrials = leadsWithStatus.filter(l => l.status === 'expired').length;
  const convertedTrials = leadsWithStatus.filter(l => l.status === 'converted').length;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => (
    <ArrowUpDown className={`w-3 h-3 inline ml-1 ${sortField === field ? 'opacity-100' : 'opacity-40'}`} />
  );

  const statusBadge = (status) => {
    const styles = {
      active: isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700',
      expired: isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600',
      converted: isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700',
    };
    return styles[status] || styles.expired;
  };

  const cardClass = isDark
    ? 'bg-slate-900 border border-slate-800 rounded-xl'
    : 'bg-white border border-slate-200 rounded-xl shadow-sm';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Trial Leads
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Track trial signups, engagement, and conversions
          </p>
        </div>
        <button
          onClick={fetchLeads}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trials', value: totalTrials, icon: UserPlus, color: isDark ? 'text-slate-300' : 'text-slate-700' },
          { label: 'Active', value: activeTrials, icon: Clock, color: 'text-green-400' },
          { label: 'Expired', value: expiredTrials, icon: XCircle, color: isDark ? 'text-slate-400' : 'text-slate-500' },
          { label: 'Converted', value: convertedTrials, icon: CheckCircle, color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`${cardClass} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={`${cardClass} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search name, email, or company..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm ${
                isDark
                  ? 'bg-slate-800 text-slate-200 border-slate-700 placeholder:text-slate-500'
                  : 'bg-slate-50 text-slate-900 border-slate-200 placeholder:text-slate-400'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            <Filter className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            {['all', 'active', 'expired', 'converted'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className={`${cardClass} overflow-hidden`}>
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className={`w-6 h-6 mx-auto mb-3 animate-spin ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Loading trial leads...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus className={`w-8 h-8 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {statusFilter !== 'all' ? `No ${statusFilter} trial leads found` : 'No trial leads yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-600'}>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-blue-400"
                    onClick={() => handleSort('name')}
                  >
                    Name <SortIcon field="name" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Company</th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-blue-400"
                    onClick={() => handleSort('created_at')}
                  >
                    Sign-up <SortIcon field="created_at" />
                  </th>
                  <th
                    className="text-center px-4 py-3 font-medium cursor-pointer hover:text-blue-400"
                    onClick={() => handleSort('call_count')}
                  >
                    Calls <SortIcon field="call_count" />
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-blue-400"
                    onClick={() => handleSort('last_active')}
                  >
                    Last Active <SortIcon field="last_active" />
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-center px-4 py-3 font-medium">Days Left</th>
                  <th className="text-center px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-slate-800' : 'divide-y divide-slate-100'}>
                {sorted.map(lead => {
                  const days = lead.days_remaining;
                  const daysLabel = lead.status === 'converted'
                    ? '-'
                    : days > 0
                      ? `${days}d left`
                      : `Expired ${Math.abs(days)}d ago`;
                  const daysColor = lead.status === 'converted'
                    ? ''
                    : days > 3
                      ? (isDark ? 'text-green-400' : 'text-green-600')
                      : days > 0
                        ? (isDark ? 'text-yellow-400' : 'text-yellow-600')
                        : (isDark ? 'text-red-400' : 'text-red-600');

                  return (
                    <tr
                      key={lead.id}
                      className={isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}
                    >
                      <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        {lead.full_name || 'Unknown'}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {lead.email}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {lead.org_name || '-'}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatDate(lead.created_at)}
                      </td>
                      <td className={`px-4 py-3 text-center font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {lead.call_count}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatRelative(lead.last_call_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-center text-xs font-medium ${daysColor}`}>
                        {daysLabel}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={`mailto:${lead.email}`}
                            title="Send email"
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Row count */}
        {!loading && sorted.length > 0 && (
          <div className={`px-4 py-3 text-xs border-t ${isDark ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-100'}`}>
            Showing {sorted.length} of {leadsWithStatus.length} trial leads
          </div>
        )}
      </div>
    </div>
  );
}
