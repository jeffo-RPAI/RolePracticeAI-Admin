// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Building2, Users, DollarSign, UserPlus, AlertTriangle, TrendingDown, Clock, CreditCard, RefreshCw, CheckCircle, XCircle, Eye, ShieldAlert, Save, Circle, Rocket, Mail, Globe, ChevronDown, ChevronUp } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminDashboardSection({ theme, onOpenOrg }) {
  const { getToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [segments, setSegments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [onlineOrgs, setOnlineOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [betaHoldEnabled, setBetaHoldEnabled] = useState(false);
  const [betaHoldMessage, setBetaHoldMessage] = useState('');
  const [betaHoldSaving, setBetaHoldSaving] = useState(false);
  const [betaHoldDirty, setBetaHoldDirty] = useState(false);
  const [betaBadgeEnabled, setBetaBadgeEnabled] = useState(false);
  const [pilotApps, setPilotApps] = useState([]);
  const [pilotExpanded, setPilotExpanded] = useState(null);
  const [pilotHistoryOpen, setPilotHistoryOpen] = useState(false);
  const [pilotHistoryTab, setPilotHistoryTab] = useState('approved');

  const fetchBetaHold = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/beta-hold`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBetaHoldEnabled(data.enabled);
        setBetaHoldMessage(data.message);
        setBetaBadgeEnabled(data.badgeEnabled);
      }
    } catch (err) {
      console.error('Error fetching beta hold:', err);
    }
  }, [getToken]);

  const saveBetaSettings = useCallback(async (updates) => {
    setBetaHoldSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/beta-hold`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setBetaHoldDirty(false);
      }
    } catch (err) {
      console.error('Error saving beta settings:', err);
    } finally {
      setBetaHoldSaving(false);
    }
  }, [getToken]);

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, rankingsRes, segmentsRes, alertsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/site-admin/dashboard-stats`, { headers }),
        fetch(`${BACKEND_URL}/api/site-admin/top-bottom-orgs`, { headers }),
        fetch(`${BACKEND_URL}/api/site-admin/top-segments`, { headers }),
        fetch(`${BACKEND_URL}/api/site-admin/proactive-alerts`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (rankingsRes.ok) setRankings(await rankingsRes.json());
      if (segmentsRes.ok) {
        const data = await segmentsRes.json();
        setSegments(data.segments || []);
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.signals || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const fetchOnline = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/online-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineOrgs(data.onlineOrgs || []);
      }
    } catch {}
  }, [getToken]);

  const fetchPilotApps = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/pilot-applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPilotApps(data.applications || []);
      }
    } catch (err) {
      console.error('Error fetching pilot applications:', err);
    }
  }, [getToken]);

  const updatePilotApp = async (id, updates) => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/pilot-applications/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchPilotApps();
      }
    } catch (err) {
      console.error('Error updating pilot application:', err);
    }
  };

  useEffect(() => { fetchData(); fetchBetaHold(); fetchOnline(); fetchPilotApps(); }, [fetchData, fetchBetaHold, fetchOnline, fetchPilotApps]);

  // Poll online users every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, [fetchOnline]);

  const handleAlertAction = async (signalId, status) => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/churn-signals/${signalId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== signalId));
      }
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 dark:border-slate-50"></div>
      </div>
    );
  }

  const severityColors = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const signalIcons = {
    no_activity_7d: Clock,
    no_activity_14d: Clock,
    no_activity_30d: Clock,
    payment_failed: CreditCard,
    trial_expiring: AlertTriangle,
    usage_drop: TrendingDown,
    onboarding_stall: UserPlus,
    low_engagement: Users,
  };

  return (
    <div className="space-y-6">
      {/* Pilot Requests – top of dashboard (pending only) */}
      {pilotApps.filter(a => a.status === 'pending').length > 0 && (
        <div className="rounded-2xl p-5 shadow-lg ring-1 bg-white dark:bg-slate-900 ring-slate-200 dark:ring-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Pilot Requests</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                {pilotApps.filter(a => a.status === 'pending').length} pending
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {pilotApps.filter(a => a.status === 'pending').map(app => (
              <div key={app.id} className="rounded-xl border p-4 transition border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{app.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{app.company_name} &middot; {app.rep_count} reps</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      pending
                    </span>
                    <button
                      onClick={() => setPilotExpanded(pilotExpanded === app.id ? null : app.id)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {pilotExpanded === app.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {pilotExpanded === app.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Mail className="w-3 h-3" /> {app.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Globe className="w-3 h-3" /> {app.website || 'N/A'}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Team:</span> {app.team_type}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Timing:</span> {app.start_timing || 'N/A'}
                      </div>
                    </div>
                    {app.primary_use_case && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Use case:</span> {app.primary_use_case}
                      </p>
                    )}
                    {app.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Notes:</span> {app.notes}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Applied {new Date(app.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(app.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => updatePilotApp(app.id, { status: 'approved', pilot_seats: app.rep_count, pilot_minutes: 200 })}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => updatePilotApp(app.id, { status: 'rejected' })}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600/80 text-white hover:bg-red-500 transition"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pilot History – approved & rejected, collapsed by default */}
      {pilotApps.filter(a => a.status === 'approved' || a.status === 'rejected').length > 0 && (
        <div className="rounded-2xl shadow-lg ring-1 bg-white dark:bg-slate-900 ring-slate-200 dark:ring-slate-800">
          <button
            onClick={() => setPilotHistoryOpen(!pilotHistoryOpen)}
            className="w-full flex items-center justify-between p-5"
          >
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Pilot History</h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {pilotApps.filter(a => a.status === 'approved').length} approved
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {pilotApps.filter(a => a.status === 'rejected').length} rejected
              </span>
            </div>
            {pilotHistoryOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {pilotHistoryOpen && (
            <div className="px-5 pb-5">
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setPilotHistoryTab('approved')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    pilotHistoryTab === 'approved'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Approved ({pilotApps.filter(a => a.status === 'approved').length})
                </button>
                <button
                  onClick={() => setPilotHistoryTab('rejected')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    pilotHistoryTab === 'rejected'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Rejected ({pilotApps.filter(a => a.status === 'rejected').length})
                </button>
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {pilotApps.filter(a => a.status === pilotHistoryTab).length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-2">No {pilotHistoryTab} applications</p>
                ) : (
                  pilotApps.filter(a => a.status === pilotHistoryTab).map(app => (
                    <div key={app.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                      pilotHistoryTab === 'approved'
                        ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/10'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/20'
                    }`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{app.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{app.company_name} &middot; {app.rep_count} reps</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {pilotHistoryTab === 'approved' && app.pilot_seats && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{app.pilot_seats} seats / {app.pilot_minutes} min</p>
                        )}
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(app.updated_at || app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Beta Controls */}
      <div className={`rounded-2xl p-5 shadow-lg ring-1 ${
        betaHoldEnabled
          ? 'bg-amber-50 dark:bg-amber-950/30 ring-amber-300 dark:ring-amber-700'
          : 'bg-white dark:bg-slate-900 ring-slate-200 dark:ring-slate-800'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className={`w-5 h-5 ${betaHoldEnabled ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Beta Controls</h3>
        </div>

        {/* Beta Badge Toggle */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Beta Badge on Logo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Shows a "Beta" stamp on the app logo for all users.</p>
          </div>
          <button
            onClick={() => {
              const newVal = !betaBadgeEnabled;
              setBetaBadgeEnabled(newVal);
              saveBetaSettings({ badgeEnabled: newVal });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              betaBadgeEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              betaBadgeEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Beta Hold Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Beta Hold</p>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                betaHoldEnabled
                  ? 'bg-amber-200 text-amber-800 dark:bg-amber-800/40 dark:text-amber-300'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {betaHoldEnabled ? 'Active' : 'Off'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Block new users from onboarding – show a holding page instead.</p>
          </div>
          <button
            onClick={() => {
              const newVal = !betaHoldEnabled;
              setBetaHoldEnabled(newVal);
              saveBetaSettings({ enabled: newVal, message: betaHoldMessage });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              betaHoldEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              betaHoldEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <div className="flex gap-2">
          <textarea
            value={betaHoldMessage}
            onChange={(e) => { setBetaHoldMessage(e.target.value); setBetaHoldDirty(true); }}
            rows={2}
            placeholder="Custom message for the holding page..."
            className="flex-1 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {betaHoldDirty && (
            <button
              onClick={() => saveBetaSettings({ enabled: betaHoldEnabled, message: betaHoldMessage })}
              disabled={betaHoldSaving}
              className="self-end px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              {betaHoldSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Orgs" value={stats?.total_orgs || 0} color="blue" />
        <StatCard icon={Users} label="Total Users" value={stats?.total_users || 0} color="indigo" />
        <StatCard icon={DollarSign} label="MRR" value={`$${((stats?.mrr_cents || 0) / 100).toLocaleString()}`} color="green" />
        <StatCard icon={UserPlus} label="New This Month" value={stats?.new_signups_month || 0} color="purple" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Subscriptions</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">{stats?.active_subscriptions || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Calls</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">{(stats?.total_calls || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Minutes</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">{(stats?.total_minutes || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Online Now */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Circle className="w-3 h-3 text-green-500 fill-green-500" />
            Online Now
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              ({onlineOrgs.reduce((sum, o) => sum + o.onlineUsers.length, 0)} users across {onlineOrgs.length} orgs)
            </span>
          </h3>
          <button onClick={fetchOnline} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
        {onlineOrgs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No users online right now</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {onlineOrgs.map(org => (
              <div key={org.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="min-w-0">
                  <button
                    onClick={() => onOpenOrg?.(org.id, org.name)}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block text-left"
                  >
                    {org.name}
                  </button>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {org.onlineUsers.map(u => (
                      <span key={u.id} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Circle className="w-1.5 h-1.5 text-green-500 fill-green-500 flex-shrink-0" />
                        {u.fullName || u.email}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 ml-3">
                  {org.onlineUsers.length} {org.onlineUsers.length === 1 ? 'user' : 'users'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Churn Risk Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Churn Risk Alerts ({alerts.length})
            </h3>
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {alerts.map(alert => {
              const AlertIcon = signalIcons[alert.signal_type] || AlertTriangle;
              return (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <AlertIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{alert.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${severityColors[alert.severity]}`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs text-slate-500">{alert.org_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                    <button
                      onClick={() => handleAlertAction(alert.id, 'acknowledged')}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      title="Acknowledge"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAlertAction(alert.id, 'resolved')}
                      className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                      title="Resolve"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAlertAction(alert.id, 'dismissed')}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                      title="Dismiss"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rankings */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Orgs by Minutes */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-4">Top Orgs by Minutes</h3>
          <div className="space-y-2">
            {(rankings?.topMinutes || []).map((org, i) => (
              <div key={org.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                  <span className="text-slate-900 dark:text-slate-50 font-medium">{org.name}</span>
                </div>
                <span className="text-slate-600 dark:text-slate-400">{parseFloat(org.minutes_used).toLocaleString()} min</span>
              </div>
            ))}
            {(!rankings?.topMinutes || rankings.topMinutes.length === 0) && (
              <p className="text-sm text-slate-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Orgs by Spend */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-4">Top Orgs by Spend</h3>
          <div className="space-y-2">
            {(rankings?.topSpend || []).map((org, i) => (
              <div key={org.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                  <span className="text-slate-900 dark:text-slate-50 font-medium">{org.name}</span>
                </div>
                <span className="text-slate-600 dark:text-slate-400">${(parseInt(org.amount_cents) / 100).toFixed(0)}/mo</span>
              </div>
            ))}
            {(!rankings?.topSpend || rankings.topSpend.length === 0) && (
              <p className="text-sm text-slate-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Bottom Orgs by Minutes (at risk) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-4">Lowest Usage (Active Subs)</h3>
          <div className="space-y-2">
            {(rankings?.bottomMinutes || []).map((org, i) => (
              <div key={org.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                  <span className="text-slate-900 dark:text-slate-50 font-medium">{org.name}</span>
                </div>
                <span className="text-slate-600 dark:text-slate-400">{parseFloat(org.minutes_used).toLocaleString()} min</span>
              </div>
            ))}
            {(!rankings?.bottomMinutes || rankings.bottomMinutes.length === 0) && (
              <p className="text-sm text-slate-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Segments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-4">Top Segments</h3>
          <div className="space-y-2">
            {segments.map((seg, i) => (
              <div key={seg.segment} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                  <span className="text-slate-900 dark:text-slate-50 font-medium">{seg.segment}</span>
                </div>
                <span className="text-slate-600 dark:text-slate-400">{seg.org_count} orgs / {seg.total_users} users</span>
              </div>
            ))}
            {segments.length === 0 && (
              <p className="text-sm text-slate-500">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const gradients = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
