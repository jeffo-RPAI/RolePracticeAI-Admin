// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { AlertTriangle, Bug, CheckCircle, Clock, TrendingUp, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import AdminErrorDashboard from '../../AdminErrorDashboard';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminSupportSection({ theme }) {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMetrics, setShowMetrics] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/support-metrics`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setMetrics(await res.json());
    } catch (error) {
      console.error('Error fetching support metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const severityColors = {
    critical: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    high: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    low: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  };

  return (
    <div className="space-y-6">
      {/* Error Log — shown first, always visible */}
      <AdminErrorDashboard />

      {/* Collapsible Metrics Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Support Metrics & Trends
            {!loading && metrics && (
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                {metrics.openCount || 0} open &middot; {metrics.resolutionRate || 0}% resolved (30d)
              </span>
            )}
          </h3>
          {showMetrics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showMetrics && !loading && metrics && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bug className="w-4 h-4 text-red-500" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Open Errors</p>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{metrics.openCount || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Critical</p>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {metrics.bySeverity?.find(s => s.severity === 'critical')?.count || 0}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Resolution Rate (30d)</p>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{metrics.resolutionRate || 0}%</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Avg Resolution</p>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {metrics.avgResolutionHours ? `${metrics.avgResolutionHours}h` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Breakdowns */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">By Severity</h4>
                <div className="space-y-2">
                  {(metrics.bySeverity || []).map(item => (
                    <div key={item.severity} className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${severityColors[item.severity]}`}>
                        {item.severity}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">By Type</h4>
                <div className="space-y-2">
                  {(metrics.byType || []).slice(0, 6).map(item => (
                    <div key={item.error_type} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300 truncate mr-2">{item.error_type}</span>
                      <span className="font-medium text-slate-900 dark:text-slate-50 flex-shrink-0">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> By Organization
                </h4>
                <div className="space-y-2">
                  {(metrics.byOrg || []).slice(0, 6).map(item => (
                    <div key={item.org_name} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300 truncate mr-2">{item.org_name}</span>
                      <span className="font-medium text-slate-900 dark:text-slate-50 flex-shrink-0">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trending */}
            {metrics.trending && metrics.trending.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Trending Error Patterns
                </h4>
                <div className="space-y-2">
                  {metrics.trending.map((item, i) => (
                    <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-mono text-slate-900 dark:text-slate-50 truncate">{item.pattern}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{item.count} occurrences</span>
                        <span>First: {new Date(item.first_seen).toLocaleDateString()}</span>
                        <span>Last: {new Date(item.last_seen).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
