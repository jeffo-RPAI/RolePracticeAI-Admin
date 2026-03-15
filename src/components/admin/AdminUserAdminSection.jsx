// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Building2, Users, ArrowLeft, Search, Trash2, Shield, Eye, Phone, Mic, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Settings, Brain, CreditCard, Pencil, MessageCircle, Check, X, Loader2, MapPin, Circle, AlertTriangle, Calendar, Mail, Send } from 'lucide-react';

const ALL_METHODOLOGIES = [
  { key: 'bant',             name: 'BANT' },
  { key: 'spin',             name: 'SPIN Selling' },
  { key: 'challenger',       name: 'Challenger Sale' },
  { key: 'meddic',          name: 'MEDDIC / MEDDPICC' },
  { key: 'sandler',          name: 'Sandler Selling' },
  { key: 'miller_heiman',    name: 'Miller Heiman' },
  { key: 'solution_selling', name: 'Solution Selling' },
  { key: 'value_selling',    name: 'Value Selling' },
  { key: 'command_message',  name: 'Command of the Message' },
  { key: 'target_account',   name: 'Target Account Selling' },
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminUserAdminSection({ theme, navigateToOrg, onNavigateConsumed }) {
  const { getToken } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [integrityResult, setIntegrityResult] = useState(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityFixing, setIntegrityFixing] = useState(false);
  const [clerkSyncResult, setClerkSyncResult] = useState(null);
  const [clerkSyncLoading, setClerkSyncLoading] = useState(false);
  const [clerkSyncFixing, setClerkSyncFixing] = useState(false);
  const [onlineOrgIds, setOnlineOrgIds] = useState(new Set());
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkUpdateFields, setBulkUpdateFields] = useState({
    subscription_status: '',
    tier_key: '',
    trial_end: '',
  });
  // Bulk email state
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [bulkEmailSending, setBulkEmailSending] = useState(false);
  const [bulkEmailResult, setBulkEmailResult] = useState(null);
  const [bulkEmailRecipients, setBulkEmailRecipients] = useState([]);
  const [bulkEmailFields, setBulkEmailFields] = useState({
    subject: '',
    headerText: '',
    body: '',
    signature: 'The RolePractice.ai Team',
    bcc: '',
  });
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const lastFocusedEmailField = useRef(null);
  // Inline org name editing
  const [editingOrgId, setEditingOrgId] = useState(null);
  const [editingOrgName, setEditingOrgName] = useState('');
  const emailFieldRefs = useRef({});

  const PLACEHOLDERS = [
    { token: '{{first_name}}', label: 'First Name', description: 'First name only' },
    { token: '{{name}}', label: 'Full Name', description: 'Full name' },
    { token: '{{company}}', label: 'Company', description: 'Organization name' },
  ];

  const insertPlaceholder = (token) => {
    const fieldKey = lastFocusedEmailField.current || 'body';
    const el = emailFieldRefs.current[fieldKey];
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? start;
      const before = el.value.slice(0, start);
      const after = el.value.slice(end);
      const newValue = before + token + after;
      setBulkEmailFields(f => ({ ...f, [fieldKey]: newValue }));
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      setBulkEmailFields(f => ({ ...f, [fieldKey]: (f[fieldKey] || '') + token }));
    }
  };

  const fetchOrgs = useCallback(async () => {
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations-detailed?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.organizations || []);
        setSelected(new Set());
      }
    } catch (error) {
      console.error('Error fetching orgs:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, search]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  // Handle cross-section navigation (e.g. Dashboard → Accounts → specific org)
  useEffect(() => {
    if (navigateToOrg) {
      setSelectedOrg(navigateToOrg);
      onNavigateConsumed?.();
    }
  }, [navigateToOrg]);

  // Fetch online org IDs for the list view
  const fetchOnlineOrgIds = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/online-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineOrgIds(new Set((data.onlineOrgs || []).map(o => o.id)));
      }
    } catch {}
  }, [getToken]);

  useEffect(() => {
    fetchOnlineOrgIds();
    const interval = setInterval(fetchOnlineOrgIds, 30000);
    return () => clearInterval(interval);
  }, [fetchOnlineOrgIds]);

  function toggleSelect(id) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleAll() {
    setSelected(prev => prev.size === orgs.length ? new Set() : new Set(orgs.map(o => o.id)));
  }

  async function renameOrg(orgId, newName) {
    if (!newName.trim()) return;
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, name: newName.trim() } : o));
      }
    } catch (err) {
      console.error('Error renaming org:', err);
    }
    setEditingOrgId(null);
  }

  async function deleteOrg(orgId, orgName) {
    if (!window.confirm(`Permanently delete "${orgName}" and all its data? This cannot be undone.`)) return;
    setDeletingIds(prev => new Set([...prev, orgId]));
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { await fetchOrgs(); }
      else { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to delete'); }
    } catch { alert('Failed to delete organization'); }
    finally { setDeletingIds(prev => { const s = new Set(prev); s.delete(orgId); return s; }); }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    const names = orgs.filter(o => selected.has(o.id)).map(o => o.name).join(', ');
    if (!window.confirm(`Permanently delete ${selected.size} organization(s)?\n\n${names}\n\nThis cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const token = await getToken();
      await Promise.all([...selected].map(id =>
        fetch(`${BACKEND_URL}/api/site-admin/organizations/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      ));
      await fetchOrgs();
    } catch { alert('One or more deletions failed'); }
    finally { setBulkDeleting(false); }
  }

  async function bulkUpdate() {
    if (selected.size === 0) return;
    const updates = {};
    if (bulkUpdateFields.subscription_status) updates.subscription_status = bulkUpdateFields.subscription_status;
    if (bulkUpdateFields.tier_key) updates.tier_key = bulkUpdateFields.tier_key;
    if (bulkUpdateFields.trial_end) updates.trial_end = bulkUpdateFields.trial_end;
    if (Object.keys(updates).length === 0) return;

    setBulkUpdating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations/bulk-update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgIds: [...selected], updates }),
      });
      if (res.ok) {
        setShowBulkUpdate(false);
        setBulkUpdateFields({ subscription_status: '', tier_key: '', trial_end: '' });
        setSelected(new Set());
        await fetchOrgs();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Bulk update failed');
      }
    } catch { alert('Bulk update failed'); }
    finally { setBulkUpdating(false); }
  }

  async function openBulkEmail() {
    setShowBulkEmail(true);
    setBulkEmailResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/bulk-email/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgIds: [...selected] }),
      });
      if (res.ok) {
        const data = await res.json();
        setBulkEmailRecipients(data.recipients || []);
      }
    } catch { /* ignore preview errors */ }
  }

  async function sendBulkEmail() {
    if (!bulkEmailFields.subject || !bulkEmailFields.body) {
      alert('Subject and body are required');
      return;
    }
    const recipientCount = bulkEmailRecipients.length || selected.size;
    if (!window.confirm(`Send individual emails to ${recipientCount} organization admin(s)?\n\nSubject: ${bulkEmailFields.subject}`)) return;
    setBulkEmailSending(true);
    setBulkEmailResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/bulk-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgIds: [...selected], ...bulkEmailFields, bcc: bulkEmailFields.bcc || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkEmailResult({ success: true, ...data });
      } else {
        setBulkEmailResult({ success: false, error: data.error || 'Failed to send' });
      }
    } catch {
      setBulkEmailResult({ success: false, error: 'Network error' });
    } finally {
      setBulkEmailSending(false);
    }
  }

  const allSelected = orgs.length > 0 && selected.size === orgs.length;

  async function runIntegrityCheck() {
    setIntegrityLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/db-integrity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setIntegrityResult(await res.json());
      else setIntegrityResult({ error: 'Check failed' });
    } catch { setIntegrityResult({ error: 'Network error' }); }
    finally { setIntegrityLoading(false); }
  }

  async function fixIntegrityIssues() {
    if (!window.confirm('Auto-fix all orphaned records? This cleans up stale data.')) return;
    setIntegrityFixing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/db-integrity/fix`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIntegrityResult({ fixed: true, ...data });
        await fetchOrgs();
      } else {
        setIntegrityResult({ error: 'Fix failed' });
      }
    } catch { setIntegrityResult({ error: 'Network error' }); }
    finally { setIntegrityFixing(false); }
  }

  async function runClerkSync() {
    setClerkSyncLoading(true);
    setClerkSyncResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/clerk-sync`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setClerkSyncResult(await res.json());
      else {
        const data = await res.json().catch(() => ({}));
        setClerkSyncResult({ error: data.error || 'Clerk sync check failed' });
      }
    } catch { setClerkSyncResult({ error: 'Network error' }); }
    finally { setClerkSyncLoading(false); }
  }

  async function fixClerkSync() {
    if (!window.confirm('Delete all DB users whose Clerk accounts no longer exist? This cannot be undone.')) return;
    setClerkSyncFixing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/clerk-sync/fix`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClerkSyncResult({ fixed: true, deleted: data.deleted });
        await fetchOrgs();
      } else {
        setClerkSyncResult({ error: 'Fix failed' });
      }
    } catch { setClerkSyncResult({ error: 'Network error' }); }
    finally { setClerkSyncFixing(false); }
  }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-500" />
      : <ChevronDown className="w-3 h-3 text-blue-500" />;
  }

  const sortedOrgs = [...orgs].sort((a, b) => {
    let av = a[sortCol] ?? '';
    let bv = b[sortCol] ?? '';
    if (sortCol === 'member_count' || sortCol === 'amount_cents' || sortCol === 'minutes_used') {
      av = parseFloat(av) || 0;
      bv = parseFloat(bv) || 0;
    } else {
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (selectedOrg) {
    return <OrgDetailView orgId={selectedOrg.id} orgName={selectedOrg.name} theme={theme} onBack={() => { setSelectedOrg(null); fetchOrgs(); }} />;
  }

  return (
    <div className="space-y-4">
      {/* Search + bulk actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {selected.size} selected
            </span>
            <button
              onClick={openBulkEmail}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition whitespace-nowrap"
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </button>
            <button
              onClick={() => setShowBulkUpdate(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5" />
              Mass Update
            </button>
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition disabled:opacity-50 whitespace-nowrap"
            >
              {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </button>
          </div>
        )}
        <button
          onClick={runIntegrityCheck}
          disabled={integrityLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap disabled:opacity-50"
        >
          {integrityLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
          DB Check
        </button>
        <button
          onClick={runClerkSync}
          disabled={clerkSyncLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap disabled:opacity-50"
        >
          {clerkSyncLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
          Clerk Sync
        </button>
      </div>

      {/* Integrity Check Results */}
      {integrityResult && (
        <div className={`p-4 rounded-xl text-sm ${
          integrityResult.error ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800' :
          integrityResult.fixed ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' :
          integrityResult.healthy ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200 dark:ring-green-800' :
          'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">
              {integrityResult.error ? `Error: ${integrityResult.error}` :
               integrityResult.fixed ? `Fixed ${integrityResult.fixesApplied} issue(s)` :
               integrityResult.healthy ? 'Database is healthy – no issues found' :
               `Found ${integrityResult.issueCount} issue(s)`}
            </span>
            <div className="flex gap-2">
              {integrityResult.issueCount > 0 && !integrityResult.fixed && (
                <button
                  onClick={fixIntegrityIssues}
                  disabled={integrityFixing}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {integrityFixing ? 'Fixing...' : 'Auto-Fix All'}
                </button>
              )}
              <button onClick={() => setIntegrityResult(null)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
          {integrityResult.issues?.length > 0 && (
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              {integrityResult.issues.map((issue, i) => (
                <li key={i}>
                  <span className={`inline-block w-16 font-mono ${issue.severity === 'critical' ? 'text-red-600' : issue.severity === 'warning' ? 'text-amber-600' : 'text-slate-500'}`}>
                    [{issue.severity}]
                  </span>
                  {issue.description} {issue.count ? `(${issue.count} records)` : issue.records ? `(${issue.records.length} records)` : ''}
                </li>
              ))}
            </ul>
          )}
          {integrityResult.fixes?.length > 0 && (
            <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-400 mt-1">
              {integrityResult.fixes.map((fix, i) => <li key={i}>{fix}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Clerk Sync Results */}
      {clerkSyncResult && (
        <div className={`p-4 rounded-xl text-sm ${
          clerkSyncResult.error ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800' :
          clerkSyncResult.fixed ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' :
          clerkSyncResult.staleUsers?.length === 0 ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200 dark:ring-green-800' :
          'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">
              {clerkSyncResult.error ? `Error: ${clerkSyncResult.error}` :
               clerkSyncResult.fixed ? `Cleaned up ${clerkSyncResult.deleted} stale user(s)` :
               clerkSyncResult.staleUsers?.length === 0 ? `All ${clerkSyncResult.totalChecked} DB users verified in Clerk (${clerkSyncResult.clerkTotal} Clerk users)` :
               `Found ${clerkSyncResult.staleUsers.length} DB user(s) not in Clerk`}
            </span>
            <div className="flex gap-2">
              {clerkSyncResult.staleUsers?.length > 0 && !clerkSyncResult.fixed && (
                <button
                  onClick={fixClerkSync}
                  disabled={clerkSyncFixing}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {clerkSyncFixing ? 'Cleaning...' : 'Delete Stale Users'}
                </button>
              )}
              <button onClick={() => setClerkSyncResult(null)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
          {clerkSyncResult.staleUsers?.length > 0 && (
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              {clerkSyncResult.staleUsers.map((u, i) => (
                <li key={i}>
                  <span className="text-red-600 dark:text-red-400 font-mono">[stale]</span>{' '}
                  {u.email} {u.org_name ? `(${u.org_name})` : '(no org)'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Mass Update Panel */}
      {showBulkUpdate && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-blue-200 dark:ring-blue-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                Mass Update – {selected.size} organization{selected.size !== 1 ? 's' : ''}
              </h3>
            </div>
            <button onClick={() => setShowBulkUpdate(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Only fill in fields you want to change. Leave blank to keep current values.
              Updating: {orgs.filter(o => selected.has(o.id)).map(o => o.name).join(', ')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subscription Status</label>
                <select
                  value={bulkUpdateFields.subscription_status}
                  onChange={e => setBulkUpdateFields(f => ({ ...f, subscription_status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">– No change –</option>
                  <option value="trial">Trial</option>
                  <option value="trialing">Trialing</option>
                  <option value="active">Active</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              {/* Tier */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tier</label>
                <select
                  value={bulkUpdateFields.tier_key}
                  onChange={e => setBulkUpdateFields(f => ({ ...f, tier_key: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">– No change –</option>
                  <option value="trial">Trial</option>
                  <option value="pilot">Pilot</option>
                  <option value="solo">Solo</option>
                  <option value="team">Team</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Trial Expiration Date */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Trial Expiration Date</span>
                </label>
                <input
                  type="date"
                  value={bulkUpdateFields.trial_end}
                  onChange={e => setBulkUpdateFields(f => ({ ...f, trial_end: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowBulkUpdate(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={bulkUpdate}
                disabled={bulkUpdating || (!bulkUpdateFields.subscription_status && !bulkUpdateFields.tier_key && !bulkUpdateFields.trial_end)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {bulkUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Apply to {selected.size} org{selected.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Modal */}
      {showBulkEmail && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-emerald-200 dark:ring-emerald-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                Send Email – {selected.size} organization{selected.size !== 1 ? 's' : ''}
              </h3>
            </div>
            <button onClick={() => { setShowBulkEmail(false); setBulkEmailResult(null); setShowEmailPreview(false); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="px-4 py-4 space-y-4">
            {/* Result banner */}
            {bulkEmailResult && (
              <div className={`p-3 rounded-xl text-sm font-medium ${bulkEmailResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
              }`}>
                {bulkEmailResult.success
                  ? `Sent ${bulkEmailResult.sent} email(s)${bulkEmailResult.failed > 0 ? `, ${bulkEmailResult.failed} failed` : ''}`
                  : `Error: ${bulkEmailResult.error}`}
              </div>
            )}

            {/* Recipients preview */}
            {bulkEmailRecipients.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Recipients ({bulkEmailRecipients.length})</label>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {bulkEmailRecipients.map(r => (
                    <span key={r.org_id} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px] text-slate-600 dark:text-slate-400">
                      <Building2 className="w-2.5 h-2.5" /> {r.org_name} <span className="text-slate-400 dark:text-slate-500">({r.email})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Placeholders – click to insert */}
            <div className="px-3 py-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mb-1.5 font-medium">Click to insert at cursor position:</p>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map(p => (
                  <button
                    key={p.token}
                    type="button"
                    onClick={() => insertPlaceholder(p.token)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800/40 transition cursor-pointer"
                    title={p.description}
                  >
                    <code className="font-mono text-[11px]">{p.token}</code>
                    <span className="text-blue-500 dark:text-blue-400 text-[10px]">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Subject</label>
              <input
                type="text"
                ref={el => emailFieldRefs.current.subject = el}
                onFocus={() => lastFocusedEmailField.current = 'subject'}
                value={bulkEmailFields.subject}
                onChange={e => setBulkEmailFields(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Quick update from RolePractice.ai"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            {/* Header Text (displayed in email banner) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Header Text <span className="text-slate-400 font-normal">(shown in the blue banner – defaults to subject if empty)</span></label>
              <input
                type="text"
                ref={el => emailFieldRefs.current.headerText = el}
                onFocus={() => lastFocusedEmailField.current = 'headerText'}
                value={bulkEmailFields.headerText}
                onChange={e => setBulkEmailFields(f => ({ ...f, headerText: e.target.value }))}
                placeholder="e.g. An Update For You, {{name}}"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
              <textarea
                ref={el => emailFieldRefs.current.body = el}
                onFocus={() => lastFocusedEmailField.current = 'body'}
                value={bulkEmailFields.body}
                onChange={e => setBulkEmailFields(f => ({ ...f, body: e.target.value }))}
                placeholder={"Hi {{name}},\n\nWe wanted to reach out to let you know...\n\nPlease let us know if you have any questions!"}
                rows={8}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none font-mono"
              />
            </div>

            {/* Signature */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Signature</label>
              <input
                type="text"
                ref={el => emailFieldRefs.current.signature = el}
                onFocus={() => lastFocusedEmailField.current = 'signature'}
                value={bulkEmailFields.signature}
                onChange={e => setBulkEmailFields(f => ({ ...f, signature: e.target.value }))}
                placeholder="The RolePractice.ai Team"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            {/* BCC */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">BCC (optional)</label>
              <input
                type="email"
                value={bulkEmailFields.bcc}
                onChange={e => setBulkEmailFields(f => ({ ...f, bcc: e.target.value }))}
                placeholder="your-email@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-400">Get a copy of each email sent for confirmation</p>
            </div>

            {/* Email Preview Toggle */}
            <div>
              <button
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {showEmailPreview ? 'Hide Preview' : 'Show Email Preview'}
              </button>
              {showEmailPreview && (
                <div className="mt-2 rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
                  <div className="bg-[#f1f5f9] p-4">
                    <div className="max-w-[600px] mx-auto bg-white rounded-xl overflow-hidden shadow-md">
                      <div className="bg-[#1e3a8a] px-6 py-6 text-center">
                        <div className="text-white text-xs font-medium mb-3 opacity-60">[ RolePractice.ai Logo ]</div>
                        <h2 className="text-white text-lg font-bold">
                          {(bulkEmailFields.headerText || bulkEmailFields.subject || 'Your Header Text').replace(/\{\{first_name\}\}/g, 'John').replace(/\{\{name\}\}/g, 'John Smith').replace(/\{\{company\}\}/g, 'Acme Corp')}
                        </h2>
                      </div>
                      <div className="px-6 py-6 text-sm text-slate-700 leading-relaxed">
                        {(bulkEmailFields.body || 'Your message body will appear here...').replace(/\{\{first_name\}\}/g, 'John').replace(/\{\{name\}\}/g, 'John Smith').replace(/\{\{company\}\}/g, 'Acme Corp').split('\n').map((line, i) => (
                          <p key={i} className="mb-3">{line || '\u00A0'}</p>
                        ))}
                        <p className="mt-6 font-bold">{bulkEmailFields.signature || 'The RolePractice.ai Team'}</p>
                      </div>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-3">RolePractice.ai | AI Role-Practice Training</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400">
                Emails are sent individually from <strong>{'{EMAIL_FROM}'}</strong> via Resend
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowBulkEmail(false); setBulkEmailResult(null); setShowEmailPreview(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={sendBulkEmail}
                  disabled={bulkEmailSending || !bulkEmailFields.subject || !bulkEmailFields.body}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {bulkEmailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {bulkEmailSending ? 'Sending...' : `Send to ${bulkEmailRecipients.length || selected.size} org${(bulkEmailRecipients.length || selected.size) !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 dark:border-slate-50"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="grid grid-cols-[32px_36px_2fr_60px_1fr_1fr_1fr_1fr_1fr_1fr_72px] gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider items-center select-none min-w-[900px]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded cursor-pointer"
            />
            <span title="Online" className="flex justify-center"><Circle className="w-3 h-3" /></span>
            {[
              { col: 'name',           label: 'Organization' },
              { col: 'setup_completed_at', label: 'Setup' },
              { col: 'member_count',   label: 'Users' },
              { col: 'tier_key',       label: 'Tier' },
              { col: 'subscription_status', label: 'Status' },
              { col: 'trial_end',      label: 'Trial End' },
              { col: 'amount_cents',   label: 'Amount' },
              { col: 'minutes_used',   label: 'Minutes' },
            ].map(({ col, label }) => (
              <button
                key={col}
                onClick={() => toggleSort(col)}
                className="group flex items-center gap-1 text-left hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                {label}
                <SortIcon col={col} />
              </button>
            ))}
            <span></span>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedOrgs.map(org => {
              const isSelected = selected.has(org.id);
              const isDeleting = deletingIds.has(org.id);
              return (
                <div
                  key={org.id}
                  className={`grid grid-cols-[32px_36px_2fr_60px_1fr_1fr_1fr_1fr_1fr_1fr_72px] gap-2 px-4 py-3 text-sm items-center cursor-pointer transition-colors min-w-[900px] ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100/70 dark:hover:bg-blue-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => setSelectedOrg(org)}
                >
                  <div onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(org.id)}
                      className="rounded cursor-pointer"
                    />
                  </div>
                  <span className="flex justify-center">
                    {onlineOrgIds.has(org.id) && (
                      <Circle className="w-2.5 h-2.5 text-green-500 fill-green-500" />
                    )}
                  </span>
                  <div className="min-w-0">
                    {editingOrgId === org.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editingOrgName}
                          onChange={e => setEditingOrgName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') renameOrg(org.id, editingOrgName);
                            if (e.key === 'Escape') setEditingOrgId(null);
                          }}
                          className="px-2 py-0.5 text-sm rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 w-full"
                        />
                        <button onClick={() => renameOrg(org.id, editingOrgName)} className="p-0.5 text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingOrgId(null)} className="p-0.5 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-900 dark:text-slate-50 truncate block group/name">
                        {org.name}
                        <button
                          onClick={e => { e.stopPropagation(); setEditingOrgId(org.id); setEditingOrgName(org.name); }}
                          className="ml-1 opacity-0 group-hover/name:opacity-100 text-slate-400 hover:text-blue-500 transition-opacity inline-flex"
                          title="Rename organization"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {org.account_number && <span className="text-xs text-slate-400 dark:text-slate-500">{org.account_number}</span>}
                  </div>
                  <span className="flex items-center justify-center">
                    {org.setup_completed_at ? (
                      <span title={`Setup completed via ${org.onboarding_method === 'voice' ? 'voice interview' : 'form'}`}>
                        <Check className="w-4 h-4 text-emerald-500" />
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600" title="Setup not completed">–</span>
                    )}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">{org.member_count}</span>
                  <span className="text-slate-600 dark:text-slate-400">{formatTier(org.tier_key)}</span>
                  <span>
                    <StatusBadge status={org.subscription_status || org.sub_status} tierKey={org.tier_key} />
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {org.trial_end ? new Date(org.trial_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '–'}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {org.amount_cents > 0 ? `$${(parseInt(org.amount_cents) / 100).toFixed(0)}` : 'Free'}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {parseFloat(org.minutes_used || 0).toFixed(0)} / {org.minutes_available || '~'}
                  </span>
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => deleteOrg(org.id, org.name)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                      title="Delete organization"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
            {orgs.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                {search ? 'No organizations match your search' : 'No organizations found'}
              </div>
            )}
          </div>
          </div>{/* close overflow-x-auto */}
        </div>
      )}
    </div>
  );
}

// Features included by each tier (true = included in plan)
const TIER_FEATURES = {
  trial:          { custom_personas: true, custom_scenarios: true, ai_persona_generation: true, call_recording: false, call_transcripts: true, analytics_basic: true, analytics_advanced: false, team_leaderboard: true, manager_dashboard: false, api_access: false, sso_enabled: false, custom_integrations: false, white_label: false, dedicated_support: false, onboarding_training: false, call_aid: false, sales_methodology: false, post_call_intelligence: false },
  solo:           { custom_personas: true, custom_scenarios: true, ai_persona_generation: true, call_recording: false, call_transcripts: true, analytics_basic: true, analytics_advanced: false, team_leaderboard: false, manager_dashboard: false, api_access: false, sso_enabled: false, custom_integrations: false, white_label: false, dedicated_support: false, onboarding_training: false, call_aid: false, sales_methodology: false, post_call_intelligence: false },
  team:           { custom_personas: true, custom_scenarios: true, ai_persona_generation: true, call_recording: true, call_transcripts: true, analytics_basic: true, analytics_advanced: true, team_leaderboard: true, manager_dashboard: true, api_access: false, sso_enabled: false, custom_integrations: false, white_label: false, dedicated_support: false, onboarding_training: false, call_aid: true, sales_methodology: true, post_call_intelligence: true },
  business:       { custom_personas: true, custom_scenarios: true, ai_persona_generation: true, call_recording: true, call_transcripts: true, analytics_basic: true, analytics_advanced: true, team_leaderboard: true, manager_dashboard: true, api_access: true, sso_enabled: false, custom_integrations: true, white_label: false, dedicated_support: true, onboarding_training: true, call_aid: true, sales_methodology: true, post_call_intelligence: true },
  pilot: { custom_personas: true, custom_scenarios: true, ai_persona_generation: true, call_recording: true, call_transcripts: true, analytics_basic: true, analytics_advanced: true, team_leaderboard: true, manager_dashboard: true, api_access: false, sso_enabled: false, custom_integrations: false, white_label: false, dedicated_support: false, onboarding_training: true, call_aid: true, sales_methodology: true, post_call_intelligence: true },
  enterprise:     { custom_personas: true, custom_scenarios: true, ai_persona_generation: true, call_recording: true, call_transcripts: true, analytics_basic: true, analytics_advanced: true, team_leaderboard: true, manager_dashboard: true, api_access: true, sso_enabled: true, custom_integrations: true, white_label: true, dedicated_support: true, onboarding_training: true, call_aid: true, sales_methodology: true, post_call_intelligence: true },
};

function FeatureToggle({ label, description, value, onChange, color }) {
  const onColor = color === 'green' ? 'bg-green-600' : 'bg-blue-600';
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? onColor : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function formatTier(key) {
  if (key === 'pilot') return 'Pilot';
  if (key === 'trial') return 'Trial';
  if (key === 'solo') return 'Solo';
  if (key === 'team') return 'Team';
  if (key === 'business') return 'Business';
  if (key === 'enterprise') return 'Enterprise';
  return key || 'Trial';
}

function StatusBadge({ status, tierKey }) {
  // When an org is "trialing" but on pilot tier, show it as pending
  const effectiveKey = (status === 'trialing' && tierKey === 'pilot') ? 'pilot' : status;
  const styles = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    trialing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    pilot: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400',
    past_due: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    canceled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  const labels = {
    active: 'Active', trialing: 'Trialing', trial: 'Trial',
    pilot: 'Pilot', past_due: 'Past Due', canceled: 'Canceled',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[effectiveKey] || styles.trialing}`}>
      {labels[effectiveKey] || status || 'trial'}
    </span>
  );
}

function AdminAccountInfoSection({ orgData, orgId }) {
  const { getToken } = useAuth();
  const [form, setForm] = useState({
    phone: '', address_line1: '', address_line2: '', city: '', state: '', zip: '', country: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (orgData) {
      setForm({
        phone: orgData.phone || '',
        address_line1: orgData.address_line1 || '',
        address_line2: orgData.address_line2 || '',
        city: orgData.city || '',
        state: orgData.state || '',
        zip: orgData.zip || '',
        country: orgData.country || '',
      });
    }
  }, [orgData]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/organizations/${orgId}/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Error saving account info:', e);
    } finally {
      setSaving(false);
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const hasData = form.phone || form.address_line1 || form.city;

  const inputClass = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <MapPin className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Account Info</h3>
        {hasData && !expanded && (
          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 truncate">
            {[form.phone, form.city, form.state].filter(Boolean).join(' · ')}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 ml-auto text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Country</label>
              <input type="text" value={form.country} onChange={e => update('country', e.target.value)} placeholder="United States" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Address</label>
            <input type="text" value={form.address_line1} onChange={e => update('address_line1', e.target.value)} placeholder="123 Main Street" className={inputClass} />
          </div>
          <input type="text" value={form.address_line2} onChange={e => update('address_line2', e.target.value)} placeholder="Suite / Unit (optional)" className={inputClass} />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">City</label>
              <input type="text" value={form.city} onChange={e => update('city', e.target.value)} placeholder="New York" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">State</label>
              <input type="text" value={form.state} onChange={e => update('state', e.target.value)} placeholder="NY" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">ZIP</label>
              <input type="text" value={form.zip} onChange={e => update('zip', e.target.value)} placeholder="10001" className={inputClass} />
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Account Info'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrgDetailView({ orgId, orgName, theme, onBack }) {
  const { getToken } = useAuth();
  const [orgData, setOrgData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Plan & feature settings state
  const [planSettings, setPlanSettings] = useState(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  // Methodology settings state
  const [methEnabled, setMethEnabled] = useState(false);
  const [methSelected, setMethSelected] = useState([]);
  const [methSaving, setMethSaving] = useState(false);
  const [methSaved, setMethSaved] = useState(false);

  // Setup data (questionnaire) state
  const [setupData, setSetupData] = useState(null);
  const [showSetupData, setShowSetupData] = useState(false);
  const [setupDataLoading, setSetupDataLoading] = useState(false);

  // Delete org state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  // User inline edit state
  const [editingUserId, setEditingUserId] = useState(null);
  const [editDraft, setEditDraft] = useState({ full_name: '', email: '' });

  // Add user state
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserDraft, setAddUserDraft] = useState({ full_name: '', email: '', role: 'user' });
  const [addUserSaving, setAddUserSaving] = useState(false);
  const [addUserInviteResult, setAddUserInviteResult] = useState(null);

  // Reset test user state
  const [showResetUser, setShowResetUser] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const handleResetTestUser = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/reset-test-user/${encodeURIComponent(resetEmail.trim())}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setResetResult({ success: true, ...data.cleaned });
        fetchOrgUsers();
      } else {
        setResetResult({ success: false, error: data.error || 'Reset failed' });
      }
    } catch (err) {
      setResetResult({ success: false, error: err.message });
    } finally {
      setResetLoading(false);
    }
  };

  const handleAddUser = async (sendInvite = false) => {
    if (!addUserDraft.email.trim()) return;
    setAddUserSaving(true);
    setAddUserInviteResult(null);
    try {
      const token = await getToken();
      const endpoint = sendInvite
        ? `${BACKEND_URL}/api/site-admin/organizations/${orgId}/invite-user`
        : `${BACKEND_URL}/api/site-admin/organizations/${orgId}/users`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(addUserDraft),
      });
      const data = await res.json();
      if (res.ok) {
        if (sendInvite) {
          setAddUserInviteResult({
            success: true,
            emailSent: data.emailSent,
            email: addUserDraft.email,
            code: data.code
          });
        }
        setAddUserDraft({ full_name: '', email: '', role: 'user' });
        if (!sendInvite) setShowAddUser(false);
        fetchOrgUsers();
      } else {
        if (sendInvite) {
          setAddUserInviteResult({ success: false, error: data.detail || data.error || 'Failed' });
        } else {
          alert(data.detail || data.error || 'Failed to add user');
        }
      }
    } catch (err) {
      console.error('Error adding user:', err);
      if (sendInvite) setAddUserInviteResult({ success: false, error: err.message });
    } finally {
      setAddUserSaving(false);
    }
  };

  // Send chat message to user state
  const [msgUserId, setMsgUserId] = useState(null);
  const [msgUser, setMsgUser] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  // Send email to user state
  const [emailUserId, setEmailUserId] = useState(null);
  const [emailUser, setEmailUser] = useState(null);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', signature: '' });
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Merge org state
  const [showMerge, setShowMerge] = useState(false);

  // Online users tracking
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  // Org error logs
  const [orgErrors, setOrgErrors] = useState([]);
  const [showOrgErrors, setShowOrgErrors] = useState(false);
  const [orgErrorsLoading, setOrgErrorsLoading] = useState(false);
  const [expandedErrorId, setExpandedErrorId] = useState(null);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/online-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const thisOrg = (data.onlineOrgs || []).find(o => o.id === orgId);
        setOnlineUserIds(new Set(thisOrg ? thisOrg.onlineUsers.map(u => u.id) : []));
      }
    } catch {}
  }, [getToken, orgId]);

  const fetchOrgErrors = useCallback(async () => {
    setOrgErrorsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/error-logs?orgId=${orgId}&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrgErrors(data.errors || []);
      }
    } catch {}
    setOrgErrorsLoading(false);
  }, [getToken, orgId]);

  const fetchOrgUsers = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}/users-detailed`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrgData(data.organization);
        setUsers(data.users || []);
        // Initialize methodology settings from org data
        setMethEnabled(data.organization?.sales_methodology_enabled || false);
        setMethSelected(data.organization?.enabled_methodologies || []);
      }
    } catch (error) {
      console.error('Error fetching org users:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, orgId]);

  const fetchSetupData = useCallback(async () => {
    setSetupDataLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}/questionnaire`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSetupData(data.questionnaire);
      }
    } catch (err) {
      console.error('Error fetching setup data:', err);
    } finally {
      setSetupDataLoading(false);
    }
  }, [getToken, orgId]);

  useEffect(() => { fetchOrgUsers(); fetchOnlineUsers(); }, [fetchOrgUsers, fetchOnlineUsers]);

  // Poll online status every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  const fetchPlanSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/organizations/${orgId}/settings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlanSettings({
          tier_key: data.organization?.tier_key || 'trial',
          subscription_status: data.organization?.subscription_status || 'trial',
          recording_enabled: data.settings?.recording_enabled ?? false,
          live_call_aid_enabled: data.settings?.live_call_aid_enabled ?? false,
          show_recording_indicator: data.settings?.show_recording_indicator ?? true,
          team_recording_access: data.organization?.team_recording_access ?? false,
          feature_overrides: data.organization?.feature_overrides || {},
          monthly_minutes_limit: data.organization?.monthly_minutes_limit || 0,
          current_period_end: data.organization?.current_period_end || '',
        });
      }
    } catch (error) {
      console.error('Error fetching plan settings:', error);
    }
  }, [getToken, orgId]);

  useEffect(() => { fetchPlanSettings(); }, [fetchPlanSettings]);

  const handleSavePlanSettings = async () => {
    setPlanSaving(true);
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/organizations/${orgId}/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(planSettings),
      });
      setPlanSaved(true);
      setTimeout(() => setPlanSaved(false), 2000);
      fetchOrgUsers(); // refresh header tier/status
    } catch (error) {
      console.error('Error saving plan settings:', error);
    } finally {
      setPlanSaving(false);
    }
  };

  const handleSaveMethodologySettings = async () => {
    setMethSaving(true);
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}/methodology-settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: methEnabled, methodologies: methSelected }),
      });
      setMethSaved(true);
      setTimeout(() => setMethSaved(false), 2000);
    } catch (error) {
      console.error('Error saving methodology settings:', error);
    } finally {
      setMethSaving(false);
    }
  };

  const toggleMethodology = (key) => {
    setMethSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleToggleFeature = async (userId, feature, currentValue) => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/users/${userId}/features`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [feature]: !currentValue }),
      });
      if (res.ok) fetchOrgUsers();
    } catch (error) {
      console.error('Error toggling feature:', error);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        fetchOrgUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleDeleteOrg = async () => {
    if (deleteConfirmText !== orgName) return;
    setDeleteConfirming(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        onBack();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete organization');
        setDeleteConfirming(false);
      }
    } catch (error) {
      console.error('Error deleting org:', error);
      setDeleteConfirming(false);
    }
  };

  const handleSaveUserEdit = async (userId) => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editDraft),
      });
      if (res.ok) { setEditingUserId(null); fetchOrgUsers(); }
    } catch (error) {
      console.error('Error saving user edit:', error);
    }
  };

  const handleSendUserMessage = async () => {
    if (!msgText.trim()) return;
    setMsgSending(true);
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/support/admin/send-to-user`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerk_user_id: msgUser?.clerk_user_id, content: msgText }),
      });
      setMsgSent(true);
      setTimeout(() => {
        setMsgSent(false);
        setMsgUserId(null);
        setMsgUser(null);
        setMsgText('');
      }, 1200);
    } catch (error) {
      console.error('Error sending chat message:', error);
    } finally {
      setMsgSending(false);
    }
  };

  const handleSendUserEmail = async () => {
    if (!emailForm.subject || !emailForm.body) return;
    setEmailSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/user-email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: emailUserId, ...emailForm }),
      });
      if (res.ok) {
        setEmailSent(true);
        setTimeout(() => {
          setEmailSent(false);
          setEmailUserId(null);
          setEmailUser(null);
          setEmailForm({ subject: '', body: '', signature: '' });
        }, 1200);
      }
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setEmailSending(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}/members/${userId}/role`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      fetchOrgUsers();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 dark:border-slate-50"></div>
      </div>
    );
  }

  const roleBadge = (role) => {
    const styles = {
      org_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      user: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
      viewer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500',
    };
    const labels = { org_admin: 'Org Admin', owner: 'Org Admin', admin: 'Org Admin', user: 'User', viewer: 'Viewer' };
    return { style: styles[role] || styles.user, label: labels[role] || role };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {orgName}
            {orgData?.account_number && <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">{orgData.account_number}</span>}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatTier(orgData?.tier_key)} | {orgData?.subscription_status || 'trial'} |
            {orgData?.amount ? ` $${(parseInt(orgData.amount) / 100).toFixed(0)}/mo` : ' Free'} |
            {orgData?.monthly_minutes ? ` ${orgData.monthly_minutes} min/mo` : ' No limit'}
          </p>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem('impersonate_org_id', orgId);
            sessionStorage.setItem('impersonate_org_name', orgName);
            window.location.reload();
          }}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
        >
          Launch Into Org
        </button>
        <button
          onClick={() => setShowMerge(true)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Merge Into…
        </button>
        <button
          onClick={() => { setShowResetUser(true); setResetResult(null); setResetEmail(''); }}
          className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Reset User
        </button>
      </div>

      {showMerge && (
        <MergeModal
          sourceOrgId={orgId}
          sourceOrgName={orgName}
          onClose={() => setShowMerge(false)}
          onSuccess={onBack}
        />
      )}

      {/* Reset Test User Dialog */}
      {showResetUser && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-red-200 dark:ring-red-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Reset Test User
            </h3>
            <button onClick={() => setShowResetUser(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="px-4 py-4 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fully purges user record, org, all org data, calls, badges, provisioned accounts, AND deletes from Clerk.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                onKeyDown={e => e.key === 'Enter' && handleResetTestUser()}
              />
              <button
                onClick={handleResetTestUser}
                disabled={resetLoading || !resetEmail.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {resetLoading ? 'Resetting...' : 'Reset'}
              </button>
            </div>
            {resetResult && (
              <div className={`text-xs p-3 rounded-lg ${resetResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                {resetResult.success ? (
                  <div>
                    <p className="font-semibold mb-1">Reset complete:</p>
                    <p>User deleted: {resetResult.user ? 'Yes' : 'No (not found)'}</p>
                    <p>Orgs purged: {resetResult.orgsDeleted || 0}</p>
                    <p>Org memberships removed: {resetResult.orgMember}</p>
                    <p>Calls deleted: {resetResult.calls}</p>
                    <p>Provisioned accounts removed: {resetResult.provAccounts}</p>
                    <p>Clerk user deleted: {resetResult.clerkDeleted ? 'Yes' : 'No (not found or already deleted)'}</p>
                  </div>
                ) : (
                  <p>Error: {resetResult.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plan & Features */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Plan & Features</h3>
        </div>
        {planSettings ? (
          <div className="px-4 py-4 space-y-4">
            {/* Plan Tier + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Plan Tier</label>
                <select
                  value={planSettings.tier_key}
                  onChange={e => setPlanSettings(p => ({ ...p, tier_key: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50"
                >
                  <option value="pilot">Pilot</option>
                  <option value="trial">Trial (Basic)</option>
                  <option value="solo">Solo</option>
                  <option value="team">Team</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Status</label>
                <select
                  value={planSettings.subscription_status}
                  onChange={e => setPlanSettings(p => ({ ...p, subscription_status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50"
                >
                  <option value="trialing">Trial - Pending</option>
                  <option value="trial">Trial - Active</option>
                  <option value="active">Active</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
            </div>

            {/* Minutes & Trial End */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Minutes Limit</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={planSettings.monthly_minutes_limit}
                    onChange={e => setPlanSettings(p => ({ ...p, monthly_minutes_limit: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">{planSettings.monthly_minutes_limit === 0 ? 'Uses tier default' : 'min/mo'}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Trial / Period End</label>
                <input
                  type="date"
                  value={planSettings.current_period_end ? new Date(planSettings.current_period_end).toISOString().split('T')[0] : ''}
                  onChange={e => setPlanSettings(p => ({ ...p, current_period_end: e.target.value ? new Date(e.target.value + 'T23:59:59Z').toISOString() : '' }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50"
                />
                {planSettings.current_period_end && (
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(planSettings.current_period_end) > new Date()
                      ? `${Math.ceil((new Date(planSettings.current_period_end) - new Date()) / 86400000)} days remaining`
                      : 'Expired'}
                  </p>
                )}
              </div>
            </div>

            {/* Recording settings */}
            <div className="space-y-3 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recording</p>
              <FeatureToggle
                label="Recording Enabled"
                description="Allow this org to record practice calls"
                value={planSettings.recording_enabled}
                onChange={v => setPlanSettings(p => ({ ...p, recording_enabled: v }))}
                color="green"
              />
              {planSettings.recording_enabled && (
                <>
                  <FeatureToggle
                    label="Team Recording Access"
                    description="Allow org admins to listen to team member recordings"
                    value={planSettings.team_recording_access}
                    onChange={v => setPlanSettings(p => ({ ...p, team_recording_access: v }))}
                    color="blue"
                  />
                  <FeatureToggle
                    label="Show Recording Indicator"
                    description="Display a recording indicator to users during practice calls"
                    value={planSettings.show_recording_indicator ?? true}
                    onChange={v => setPlanSettings(p => ({ ...p, show_recording_indicator: v }))}
                    color="blue"
                  />
                </>
              )}
            </div>

            {/* Feature add-ons – only show features NOT included in the current plan tier */}
            {(() => {
              const tierKey = planSettings.tier_key || 'trial';
              const tierIncluded = TIER_FEATURES[tierKey] || TIER_FEATURES.trial;
              const allFeatures = [
                { key: 'custom_personas', label: 'Custom Personas' },
                { key: 'custom_scenarios', label: 'Custom Scenarios' },
                { key: 'ai_persona_generation', label: 'AI Persona Gen' },
                { key: 'call_recording', label: 'Call Recording' },
                { key: 'call_transcripts', label: 'Call Transcripts' },
                { key: 'analytics_basic', label: 'Basic Analytics' },
                { key: 'analytics_advanced', label: 'Advanced Analytics' },
                { key: 'team_leaderboard', label: 'Leaderboard' },
                { key: 'manager_dashboard', label: 'Manager Dashboard' },
                { key: 'api_access', label: 'API Access' },
                { key: 'sso_enabled', label: 'SSO' },
                { key: 'custom_integrations', label: 'Integrations' },
                { key: 'white_label', label: 'White Label' },
                { key: 'dedicated_support', label: 'Dedicated Support' },
                { key: 'onboarding_training', label: 'Onboarding' },
                { key: 'call_aid', label: 'Live Call AI' },
                { key: 'sales_methodology', label: 'Coaching Framework' },
                { key: 'post_call_intelligence', label: 'Post-Call Intelligence' },
              ];
              // Only show features NOT in the current tier (add-on overrides)
              const notIncluded = allFeatures.filter(f => !tierIncluded[f.key]);
              // Also show any that have an active override even if now included (so admin can remove it)
              const overrides = planSettings.feature_overrides || {};
              const withOverrides = allFeatures.filter(f => tierIncluded[f.key] && overrides[f.key] !== undefined);
              const displayFeatures = [...notIncluded, ...withOverrides];

              if (displayFeatures.length === 0) return null;

              return (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Feature Add-ons</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Features not included in the {formatTier(tierKey)} plan. Click to grant (green) or keep off (gray).
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {displayFeatures.map(({ key, label }) => {
                      const isIncluded = tierIncluded[key];
                      const state = overrides[key] === true ? 'on' : overrides[key] === false ? 'off' : 'inherit';
                      const cycle = () => {
                        setPlanSettings(p => {
                          const fo = { ...(p.feature_overrides || {}) };
                          if (isIncluded) {
                            // Feature is included in plan but has an override – toggle removes it
                            delete fo[key];
                          } else if (state === 'inherit') {
                            fo[key] = true; // Grant it
                          } else {
                            delete fo[key]; // Remove override
                          }
                          return { ...p, feature_overrides: fo };
                        });
                      };
                      const isGranted = isIncluded ? (state !== 'off') : (state === 'on');
                      return (
                        <button
                          key={key}
                          onClick={cycle}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                            isGranted
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <span className="truncate">{label}</span>
                          <span className="ml-1.5 shrink-0 text-[10px] font-bold uppercase">
                            {isGranted ? 'ON' : 'OFF'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="pt-1">
              <button
                onClick={handleSavePlanSettings}
                disabled={planSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {planSaving ? 'Saving...' : planSaved ? 'Saved!' : 'Save Plan & Features'}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">Loading settings...</div>
        )}
      </div>

      {/* Account Info (Address & Phone) */}
      <AdminAccountInfoSection orgData={orgData} orgId={orgId} />

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Users className="w-4 h-4" /> Users ({users.length})
          </h3>
          <button
            onClick={() => setShowAddUser(v => !v)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
          >
            + Add User
          </button>
        </div>

        {showAddUser && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={addUserDraft.full_name}
                onChange={e => setAddUserDraft(d => ({ ...d, full_name: e.target.value }))}
                placeholder="Full name"
                className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                value={addUserDraft.email}
                onChange={e => setAddUserDraft(d => ({ ...d, email: e.target.value }))}
                placeholder="Email *"
                className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={addUserDraft.role}
                onChange={e => setAddUserDraft(d => ({ ...d, role: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50"
              >
                <option value="org_admin">Org Admin</option>
                <option value="user">User</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={() => handleAddUser(true)}
                disabled={addUserSaving || !addUserDraft.email.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                {addUserSaving ? 'Sending...' : 'Add & Send Invite'}
              </button>
              <button
                onClick={() => handleAddUser(false)}
                disabled={addUserSaving || !addUserDraft.email.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-500 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-medium transition-colors"
              >
                Add Only
              </button>
              <button
                onClick={() => { setShowAddUser(false); setAddUserInviteResult(null); }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
            {addUserInviteResult && (
              <div className={`px-3 py-2 rounded-lg text-xs ${
                addUserInviteResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}>
                {addUserInviteResult.success ? (
                  <>
                    {addUserInviteResult.emailSent
                      ? `Invite email sent to ${addUserInviteResult.email}!`
                      : `User added. Email failed – share code manually: `}
                    {!addUserInviteResult.emailSent && addUserInviteResult.code && (
                      <span className="font-mono font-bold ml-1">{addUserInviteResult.code}</span>
                    )}
                  </>
                ) : (
                  `Error: ${addUserInviteResult.error}`
                )}
              </div>
            )}
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map(user => {
            const badge = roleBadge(user.role);
            const isEditing = editingUserId === user.id;
            return (
              <div key={user.id} className="px-4 py-3 flex items-center justify-between gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {user.full_name?.[0] || user.email[0].toUpperCase()}
                </div>

                {isEditing ? (
                  /* Inline edit mode */
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <input
                      type="text"
                      value={editDraft.full_name}
                      onChange={e => setEditDraft(d => ({ ...d, full_name: e.target.value }))}
                      placeholder="Full name"
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      value={editDraft.email}
                      onChange={e => setEditDraft(d => ({ ...d, email: e.target.value }))}
                      placeholder="Email"
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSaveUserEdit(user.id)}
                      className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200 transition-colors"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingUserId(null)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Normal display mode */
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate flex items-center gap-1.5">
                        {onlineUserIds.has(user.id) && (
                          <Circle className="w-2 h-2 text-green-500 fill-green-500 flex-shrink-0" />
                        )}
                        {user.full_name || 'No name'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap justify-end">
                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mr-1">
                        <span title="Minutes used">{parseFloat(user.minutes_used || 0).toFixed(1)} min</span>
                        <span title="Calls">{user.calls_made || 0} calls</span>
                        <span title="Last call">
                          {user.last_call_at ? new Date(user.last_call_at).toLocaleDateString() : 'Never'}
                        </span>
                      </div>

                      {/* Role selector */}
                      <select
                        value={['org_admin', 'owner', 'admin'].includes(user.role) ? 'org_admin' : user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`px-2 py-1 rounded-lg border text-xs font-medium ${badge.style} border-transparent`}
                      >
                        <option value="org_admin">Org Admin</option>
                        <option value="user">User</option>
                        <option value="viewer">Viewer</option>
                      </select>

                      {/* Recording toggle */}
                      <button
                        onClick={() => handleToggleFeature(user.id, 'recording_access', user.recording_access)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.recording_access
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                        title={`Recording: ${user.recording_access ? 'ON' : 'OFF'}`}
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>

                      {/* Send Invite (for users without a Clerk account yet) */}
                      {!user.clerk_user_id && (
                        <button
                          onClick={async () => {
                            try {
                              const t = await getToken();
                              const r = await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}/invite-user`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: user.email, full_name: user.full_name, role: user.role }),
                              });
                              const d = await r.json();
                              if (r.ok && d.emailSent) {
                                alert(`Invite email sent to ${user.email}`);
                              } else if (r.ok) {
                                alert(`Invite created but email failed. Code: ${d.code}`);
                              } else {
                                alert(d.error || 'Failed to send invite');
                              }
                            } catch (err) {
                              alert('Error sending invite');
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors"
                          title="Send invite email"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => { setEditingUserId(user.id); setEditDraft({ full_name: user.full_name || '', email: user.email || '' }); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                        title="Edit user"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Email */}
                      <button
                        onClick={() => { setEmailUserId(user.id); setEmailUser(user); }}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"
                        title="Send email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>

                      {/* Message */}
                      <button
                        onClick={() => { setMsgUserId(user.id); setMsgUser(user); }}
                        className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-500 transition-colors"
                        title="Send in-app message"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No users found</div>
          )}
        </div>
      </div>

      {/* Error Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <button
          onClick={() => { setShowOrgErrors(prev => !prev); if (!showOrgErrors && orgErrors.length === 0) fetchOrgErrors(); }}
          className="w-full px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Error Logs</h3>
            {orgErrors.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                {orgErrors.length}
              </span>
            )}
          </div>
          {showOrgErrors ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showOrgErrors && (
          <div className="px-4 py-3">
            {orgErrorsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : orgErrors.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No errors logged for this organization.</p>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {orgErrors.map(err => (
                  <div key={err.id}>
                    <button
                      onClick={() => setExpandedErrorId(expandedErrorId === err.id ? null : err.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                        expandedErrorId === err.id
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        err.severity === 'critical' ? 'bg-red-500' :
                        err.severity === 'error' ? 'bg-orange-500' :
                        err.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{err.error_message}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {err.user_name || err.user_email_full || 'Unknown'}
                      </span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {new Date(err.created_at).toLocaleDateString()}
                      </span>
                      {err.status === 'resolved' && <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    </button>
                    {expandedErrorId === err.id && (
                      <div className="ml-5 mt-1 mb-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs space-y-2">
                        <div>
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Type:</span>{' '}
                          <span className="text-slate-800 dark:text-slate-200">{err.error_type || 'unknown'}</span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Severity:</span>{' '}
                          <span className="text-slate-800 dark:text-slate-200">{err.severity}</span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Status:</span>{' '}
                          <span className={`${err.status === 'resolved' ? 'text-green-600' : err.status === 'archived' ? 'text-slate-500' : 'text-orange-600'}`}>
                            {err.status}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Message:</span>
                          <p className="mt-0.5 text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">{err.error_message}</p>
                        </div>
                        {err.stack_trace && (
                          <div>
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Stack Trace:</span>
                            <pre className="mt-0.5 text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto text-[11px]">{err.stack_trace}</pre>
                          </div>
                        )}
                        {err.context && (
                          <div>
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Context:</span>
                            <pre className="mt-0.5 text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all max-h-24 overflow-y-auto text-[11px]">
                              {typeof err.context === 'string' ? err.context : JSON.stringify(err.context, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div className="text-slate-400">
                          {new Date(err.created_at).toLocaleString()} · {err.user_name || ''} ({err.user_email_full || 'unknown'})
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-red-200 dark:ring-red-900/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-red-100 dark:border-red-900/30 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Permanently delete this organization, all its members, call history, and cancel any active Stripe subscription.
            This action <strong>cannot be undone</strong>.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Type <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{orgName}</span> to confirm.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type org name to confirm"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              onClick={handleDeleteOrg}
              disabled={deleteConfirmText !== orgName || deleteConfirming}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {deleteConfirming ? 'Deleting...' : 'Delete Organization'}
            </button>
          </div>
        </div>
      </div>

      {/* Methodology Feature Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Coaching Framework Feature</h3>
        </div>
        <div className="px-4 py-4 space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Enable Methodology Scoring</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Allow users in this org to select a coaching framework during setup and receive framework-specific scoring.
              </p>
            </div>
            <button
              onClick={() => setMethEnabled(prev => !prev)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                methEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                methEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Methodology checkboxes */}
          {methEnabled && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Available Methodologies (check to enable for this org)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_METHODOLOGIES.map(m => (
                  <label key={m.key} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={methSelected.includes(m.key)}
                      onChange={() => toggleMethodology(m.key)}
                      className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      {m.name}
                    </span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMethSelected(ALL_METHODOLOGIES.map(m => m.key))}
                className="mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline"
              >
                Select all
              </button>
              <span className="mx-2 text-xs text-slate-400">·</span>
              <button
                type="button"
                onClick={() => setMethSelected([])}
                className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSaveMethodologySettings}
              disabled={methSaving}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {methSaving ? 'Saving...' : methSaved ? 'Saved!' : 'Save Methodology Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Setup Data / Questionnaire Viewer */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <button
          onClick={() => {
            const next = !showSetupData;
            setShowSetupData(next);
            if (next && !setupData && !setupDataLoading) fetchSetupData();
          }}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Setup Data (Questionnaire)</h3>
            {setupData?.onboarding_method && (
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                setupData.onboarding_method === 'voice'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {setupData.onboarding_method === 'voice' ? 'Voice Interview' : 'Form'}
              </span>
            )}
          </div>
          {showSetupData ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showSetupData && (
          <div className="px-5 pb-5 border-t border-slate-200 dark:border-slate-800">
            {setupDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : !setupData ? (
              <p className="py-6 text-center text-sm text-slate-400">No questionnaire data – setup not completed.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Voice Interview Transcript */}
                {setupData.voice_interview_transcript && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5" /> Voice Interview Transcript
                    </h4>
                    <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50 dark:bg-slate-800/50">
                      {(Array.isArray(setupData.voice_interview_transcript)
                        ? setupData.voice_interview_transcript
                        : []
                      ).map((entry, i) => (
                        <div key={i} className={`text-sm ${entry.role === 'assistant' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          <span className="font-semibold text-xs uppercase mr-1.5">
                            {entry.role === 'assistant' ? 'AI:' : 'User:'}
                          </span>
                          {entry.text || entry.content || JSON.stringify(entry)}
                        </div>
                      ))}
                      {!Array.isArray(setupData.voice_interview_transcript) && (
                        <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                          {JSON.stringify(setupData.voice_interview_transcript, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                {/* Training Goals (highlighted) */}
                {setupData.training_goals && (
                  <div className="p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">Training Goals</h4>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{setupData.training_goals}</p>
                  </div>
                )}

                {/* Form Responses Grid */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    Form Responses
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: 'Product Name', value: setupData.product_name },
                      { label: 'Product Description', value: setupData.product_description },
                      { label: 'Pricing', value: setupData.product_pricing || [setupData.pricing_type, setupData.pricing_range].filter(Boolean).join(': ') },
                      { label: 'Differentiators', value: setupData.differentiators },
                      { label: 'Industry', value: setupData.industry === 'Other' ? setupData.industry_other : setupData.industry },
                      { label: 'Company Size', value: setupData.company_size },
                      { label: 'Avg Deal Size', value: setupData.avg_deal_size },
                      { label: 'Sales Cycle', value: setupData.sales_cycle_length },
                      { label: 'Primary Buyers', value: setupData.primary_buyers?.join(', ') },
                      { label: 'Customer Sizes', value: setupData.customer_company_sizes?.join(', ') },
                      { label: 'Customer Industries', value: setupData.customer_industries },
                      { label: 'Decision Involved', value: setupData.buying_decision_involved?.join(', ') },
                      { label: 'Technical Level', value: setupData.buyer_technical_level != null ? `${setupData.buyer_technical_level}/5` : null },
                      { label: 'Top Challenges', value: setupData.top_challenges?.join(', ') },
                      { label: 'Competitors', value: setupData.competitors?.join(', ') },
                      { label: 'Common Objections', value: setupData.common_objections?.join(', ') },
                      { label: 'Top Loss Reason', value: setupData.top_loss_reason },
                      { label: 'Target Job Titles', value: setupData.target_job_titles?.join(', ') },
                      { label: 'Buyer Priorities', value: setupData.buyer_priorities?.join(', ') },
                      { label: 'Buyer Skepticism', value: setupData.buyer_skepticism != null ? `${setupData.buyer_skepticism}/5` : null },
                      { label: 'Approval Required', value: setupData.approval_required },
                      { label: 'Practice Stages', value: setupData.practice_stages?.join(', ') },
                      { label: 'Success Definition', value: setupData.success_definition },
                      { label: 'Common Mistakes', value: setupData.common_mistakes },
                      { label: 'Must-Ask Questions', value: setupData.must_ask_questions },
                      { label: 'Custom Scenarios', value: setupData.custom_scenarios },
                      { label: 'Risk Posture', value: setupData.risk_posture },
                      { label: 'Urgency', value: setupData.urgency },
                      { label: 'Buying History', value: setupData.buying_history },
                      { label: 'Proof Threshold', value: setupData.proof_threshold?.join(', ') },
                      { label: 'Why Now Trigger', value: setupData.why_now_trigger },
                      { label: 'Call Setting', value: setupData.call_setting },
                      { label: 'Product Features', value: setupData.product_features?.join(', ') },
                      { label: 'Training Goals', value: setupData.training_goals },
                      { label: 'Playbook File', value: setupData.playbook_file_name },
                      { label: 'Completed At', value: setupData.completed_at ? new Date(setupData.completed_at).toLocaleString() : null },
                      { label: 'Onboarding Method', value: setupData.onboarding_method },
                    ].filter(f => f.value).map((field, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{field.label}</p>
                        <p className="text-sm text-slate-900 dark:text-slate-100 mt-0.5 break-words">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Playbook Text */}
                {setupData.playbook_text && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Playbook Content
                    </h4>
                    <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
                      <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{setupData.playbook_text}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send Chat Message Modal */}
      {msgUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setMsgUserId(null); setMsgUser(null); setMsgText(''); }} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                Chat Message to {msgUser?.full_name || 'User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {msgUser?.email} – appears in their support chat
              </p>
            </div>
            <div className="px-5 py-4">
              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => { setMsgUserId(null); setMsgUser(null); setMsgText(''); }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendUserMessage}
                disabled={!msgText.trim() || msgSending}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {msgSending ? 'Sending...' : msgSent ? 'Sent!' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {emailUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setEmailUserId(null); setEmailUser(null); }} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-500" />
                <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  Send Email to {emailUser?.full_name || 'User'}
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{emailUser?.email}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Body</label>
                <textarea
                  value={emailForm.body}
                  onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write your email..."
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Use {'{{first_name}}'} or {'{{name}}'} for personalization</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Signature</label>
                <input
                  type="text"
                  value={emailForm.signature}
                  onChange={e => setEmailForm(f => ({ ...f, signature: e.target.value }))}
                  placeholder="The RolePractice.ai Team"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => { setEmailUserId(null); setEmailUser(null); }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendUserEmail}
                disabled={!emailForm.subject || !emailForm.body || emailSending}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {emailSending ? 'Sending...' : emailSent ? 'Sent!' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MergeModal({ sourceOrgId, sourceOrgName, onClose, onSuccess }) {
  const { getToken } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations-detailed`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setOrgs((data.organizations || []).filter(o => o.id !== sourceOrgId));
        }
      } catch { setError('Failed to load organizations'); }
      finally { setLoadingOrgs(false); }
    })();
  }, [getToken, sourceOrgId]);

  async function handleMerge() {
    if (!targetOrgId) return;
    const target = orgs.find(o => o.id === parseInt(targetOrgId));
    if (!window.confirm(`Merge "${sourceOrgName}" INTO "${target?.name}"?\n\nAll users and call history will move to "${target?.name}". "${sourceOrgName}" will be permanently deleted.\n\nThis cannot be undone.`)) return;
    setMerging(true); setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations/${targetOrgId}/merge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceOrgId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Merge failed'); }
      else { setResult(data); setTimeout(onSuccess, 1500); }
    } catch { setError('Merge failed. Please try again.'); }
    finally { setMerging(false); }
  }

  const target = orgs.find(o => o.id === parseInt(targetOrgId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Merge Organization</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Merge <span className="font-semibold text-slate-700 dark:text-slate-300">{sourceOrgName}</span> into another org. All users and calls will be moved. Source org will be deleted.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {result ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✓ Merged {result.movedUsers} users and {result.movedCalls} calls. Redirecting…
            </p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Merge Into</label>
                {loadingOrgs ? (
                  <p className="text-sm text-slate-500">Loading…</p>
                ) : (
                  <select
                    value={targetOrgId}
                    onChange={e => setTargetOrgId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select target organization…</option>
                    {orgs.map(o => (
                      <option key={o.id} value={o.id}>{o.name} ({o.member_count} users)</option>
                    ))}
                  </select>
                )}
              </div>
              {target && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                  This will move all members and call history from <strong>{sourceOrgName}</strong> into <strong>{target.name}</strong>, then delete <strong>{sourceOrgName}</strong>.
                </div>
              )}
            </>
          )}
        </div>
        {!result && (
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={!targetOrgId || merging}
              className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {merging ? 'Merging…' : 'Merge Organizations'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
