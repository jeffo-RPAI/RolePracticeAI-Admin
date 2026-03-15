// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Tag, Copy, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Plus, RefreshCw, Percent, DollarSign } from 'lucide-react';

const BACKEND_WS_URL = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3001';
const BACKEND_URL = BACKEND_WS_URL.replace('wss://', 'https://').replace('ws://', 'http://');

const TIER_OPTIONS = [
  { key: 'solo', label: 'Solo' },
  { key: 'team', label: 'Team' },
  { key: 'business', label: 'Business' },
];

const DISCOUNT_PRESETS = [10, 15, 20, 25, 50];

export default function AdminPromoCodesSection({ theme }) {
  const { getToken } = useAuth();
  const isDark = theme === 'dark';
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedCode, setExpandedCode] = useState(null);
  const [redemptions, setRedemptions] = useState({});
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);

  // Form state
  const [label, setLabel] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(20);
  const [selectedTiers, setSelectedTiers] = useState(['solo', 'team', 'business']);
  const [billingRestriction, setBillingRestriction] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [oneTimePerOrg, setOneTimePerOrg] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => { loadCodes(); }, []);

  async function loadCodes() {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/promo-codes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes);
      }
    } catch (err) {
      console.error('Failed to load promo codes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);

    if (!discountValue || discountValue <= 0) {
      setError('Discount value must be greater than 0');
      return;
    }
    if (discountType === 'percentage' && discountValue > 100) {
      setError('Percentage cannot exceed 100');
      return;
    }
    if (selectedTiers.length === 0) {
      setError('Select at least one applicable tier');
      return;
    }

    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/promo-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          label: label || null,
          code_prefix: codePrefix || null,
          discount_type: discountType,
          discount_value: discountValue,
          applicable_tiers: selectedTiers,
          billing_cycle_restriction: billingRestriction || null,
          max_uses: maxUses ? parseInt(maxUses) : null,
          one_time_per_org: oneTimePerOrg,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create promo code');
      }

      // Reset form
      setLabel('');
      setCodePrefix('');
      setDiscountType('percentage');
      setDiscountValue(20);
      setSelectedTiers(['solo', 'team', 'business']);
      setBillingRestriction('');
      setMaxUses('');
      setOneTimePerOrg(true);
      setExpiresAt('');
      setShowForm(false);
      await loadCodes();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(codeId, currentActive) {
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/promo-codes/${codeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentActive })
      });
      await loadCodes();
    } catch (err) {
      console.error('Failed to toggle promo code:', err);
    }
  }

  async function handleDelete(codeId) {
    if (!confirm('Delete this promo code? This will also remove the Stripe coupon.')) return;
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/promo-codes/${codeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await loadCodes();
    } catch (err) {
      console.error('Failed to delete promo code:', err);
    }
  }

  async function loadRedemptions(codeId) {
    if (expandedCode === codeId) {
      setExpandedCode(null);
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/promo-codes/${codeId}/redemptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRedemptions(prev => ({ ...prev, [codeId]: data.redemptions }));
        setExpandedCode(codeId);
      }
    } catch (err) {
      console.error('Failed to load redemptions:', err);
    }
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function toggleTier(tier) {
    setSelectedTiers(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    );
  }

  function getStatusBadge(code) {
    if (!code.is_active) {
      return <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-slate-500/20 text-slate-400">Deactivated</span>;
    }
    if (code.is_expired) {
      return <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400">Expired</span>;
    }
    if (code.max_uses && code.times_used >= code.max_uses) {
      return <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400">Maxed Out</span>;
    }
    return <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400">Active</span>;
  }

  function formatDiscount(code) {
    if (code.discount_type === 'percentage') {
      return `${parseFloat(code.discount_value)}% off`;
    }
    return `$${parseFloat(code.discount_value)} off`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Promo Codes
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Create discount codes for checkout. Synced with Stripe coupons.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCodes}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Create Promo Code
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className={`rounded-2xl p-6 space-y-5 ${
          isDark ? 'bg-slate-900 ring-1 ring-slate-800' : 'bg-white ring-1 ring-slate-200'
        }`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            New Promo Code
          </h3>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Label */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Label (optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Spring Launch 2026"
                className={`w-full rounded-lg px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Code Prefix */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Code Prefix (optional)
              </label>
              <input
                type="text"
                value={codePrefix}
                onChange={(e) => setCodePrefix(e.target.value)}
                placeholder="e.g. SAVE20 (default: PROMO)"
                maxLength={8}
                className={`w-full rounded-lg px-3 py-2 text-sm uppercase ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Discount Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    discountType === 'percentage'
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Percent className="h-3.5 w-3.5" /> Percentage
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed_amount')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    discountType === 'fixed_amount'
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" /> Fixed Amount
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {discountType === 'percentage' ? 'Discount (%)' : 'Discount ($)'}
              </label>
              {discountType === 'percentage' && (
                <div className="flex gap-2 mb-2">
                  {DISCOUNT_PRESETS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDiscountValue(p)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        discountValue === p
                          ? 'bg-blue-600 text-white'
                          : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              )}
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                min="0.01"
                max={discountType === 'percentage' ? 100 : undefined}
                step="0.01"
                className={`w-full rounded-lg px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Applicable Tiers */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Applicable Plans
              </label>
              <div className="flex gap-2">
                {TIER_OPTIONS.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleTier(t.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      selectedTiers.includes(t.key)
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Billing Cycle Restriction */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Billing Cycle
              </label>
              <div className="flex gap-2">
                {[{ key: '', label: 'Any' }, { key: 'monthly', label: 'Monthly Only' }, { key: 'annual', label: 'Annual Only' }].map(b => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBillingRestriction(b.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      billingRestriction === b.key
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Uses */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Max Total Uses (blank = unlimited)
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
                placeholder="Unlimited"
                className={`w-full rounded-lg px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* One-time per org */}
            <div className="flex items-center gap-3 pt-5">
              <button
                type="button"
                onClick={() => setOneTimePerOrg(!oneTimePerOrg)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  oneTimePerOrg ? 'bg-blue-600' : isDark ? 'bg-slate-700' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  oneTimePerOrg ? 'translate-x-4' : ''
                }`} />
              </button>
              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                One-time use per organization
              </span>
            </div>

            {/* Expiration Date */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Expiration Date (optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full rounded-lg px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {creating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Tag className="h-4 w-4" />
                  Create Promo Code
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Codes List */}
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : codes.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <Tag className={`h-12 w-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              No promo codes yet. Click "Create Promo Code" to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => {
            const applicableTiers = typeof code.applicable_tiers === 'string'
              ? JSON.parse(code.applicable_tiers)
              : (code.applicable_tiers || []);

            return (
              <div key={code.id} className={`rounded-2xl overflow-hidden ${
                isDark ? 'bg-slate-900 ring-1 ring-slate-800' : 'bg-white ring-1 ring-slate-200'
              }`}>
                {/* Code Row */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <code className={`text-sm font-mono font-bold tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {code.code}
                        </code>
                        <button
                          onClick={() => copyCode(code.code)}
                          className={`rounded p-1 transition ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                          title="Copy code"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {copied === code.code && (
                          <span className="text-xs text-green-400">Copied!</span>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        code.discount_type === 'percentage'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {formatDiscount(code)}
                      </span>
                      {code.label && (
                        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {code.label}
                        </span>
                      )}
                      {getStatusBadge(code)}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadRedemptions(code.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {expandedCode === code.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {code.times_used}{code.max_uses ? ` / ${code.max_uses}` : ''} used
                      </button>
                      <button
                        onClick={() => handleToggleActive(code.id, code.is_active)}
                        className={`rounded-lg p-1.5 transition ${
                          isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
                        }`}
                        title={code.is_active ? 'Deactivate' : 'Reactivate'}
                      >
                        {code.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(code.id)}
                        className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details row */}
                  <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    <span>Plans: {applicableTiers.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}</span>
                    {code.billing_cycle_restriction && (
                      <span className={`font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        {code.billing_cycle_restriction} only
                      </span>
                    )}
                    {code.one_time_per_org && <span>One-time per org</span>}
                    {code.expires_at && <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>}
                    {code.stripe_coupon_id && (
                      <span className={`${isDark ? 'text-green-500' : 'text-green-600'}`}>Stripe synced</span>
                    )}
                    {code.created_by_name && <span>By: {code.created_by_name}</span>}
                  </div>
                </div>

                {/* Expanded Redemptions */}
                {expandedCode === code.id && (
                  <div className={`border-t px-4 py-3 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
                    {(!redemptions[code.id] || redemptions[code.id].length === 0) ? (
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        No redemptions yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Redemptions ({redemptions[code.id].length})
                        </p>
                        {redemptions[code.id].map((r, i) => (
                          <div key={i} className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            <div className="flex gap-4">
                              <span className="font-medium">{r.user_name || 'Unknown'}</span>
                              <span>{r.user_email}</span>
                              <span>{r.organization_name}</span>
                            </div>
                            <span>{new Date(r.redeemed_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
