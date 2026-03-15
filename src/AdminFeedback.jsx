// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { MessageSquare, RefreshCw, Star, Inbox, Check, Tag, TrendingUp, Target, TrendingDown } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function AdminFeedback({ theme }) {
  const { getToken } = useAuth();
  const [callFeedback, setCallFeedback] = useState([]);
  const [generalFeedback, setGeneralFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('general'); // 'general' or 'call'
  const [filter, setFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [updating, setUpdating] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textColor = isDark ? 'text-slate-200' : 'text-slate-800';
  const labelColor = isDark ? 'text-slate-400' : 'text-slate-600';

  useEffect(() => {
    loadAllFeedback();
    const interval = setInterval(loadAllFeedback, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAllFeedback = async () => {
    try {
      const token = await getToken();
      const [callRes, generalRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/feedback/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/feedback/general/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (callRes.ok) {
        const data = await callRes.json();
        setCallFeedback(data.feedback);
      }
      if (generalRes.ok) {
        const data = await generalRes.json();
        setGeneralFeedback(data.feedback);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (id, newStatus, response = null) => {
    setUpdating(true);
    try {
      const token = await getToken();
      const endpoint = tab === 'general'
        ? `${BACKEND_URL}/api/feedback/general/${id}/status`
        : `${BACKEND_URL}/api/feedback/${id}/status`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, adminResponse: response })
      });

      if (res.ok) {
        await loadAllFeedback();
        setSelectedFeedback(null);
        setAdminResponse('');
      } else {
        alert('Failed to update feedback status');
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      alert('Failed to update feedback status');
    } finally {
      setUpdating(false);
    }
  };

  const currentFeedback = tab === 'general' ? generalFeedback : callFeedback;
  const filteredFeedback = currentFeedback.filter(f => {
    if (filter === 'all') return true;
    return f.status === filter;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'reviewed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'bug': return isDark ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-red-50 text-red-700 border-red-200';
      case 'feature': return isDark ? 'bg-purple-900/30 text-purple-400 border-purple-700' : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ui': return isDark ? 'bg-cyan-900/30 text-cyan-400 border-cyan-700' : 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'other': return isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-700 border-slate-300';
      default: return isDark ? 'bg-blue-900/30 text-blue-400 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-12 ${textColor}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading feedback...</span>
      </div>
    );
  }

  const pendingGeneral = generalFeedback.filter(f => f.status === 'pending').length;
  const pendingCall = callFeedback.filter(f => f.status === 'pending').length;

  // Score accuracy stats from call feedback
  const scoreFeedbackEntries = callFeedback.filter(f => f.score_accuracy);
  const accuracyCounts = {
    too_low: scoreFeedbackEntries.filter(f => f.score_accuracy === 'too_low').length,
    spot_on: scoreFeedbackEntries.filter(f => f.score_accuracy === 'spot_on').length,
    too_high: scoreFeedbackEntries.filter(f => f.score_accuracy === 'too_high').length,
  };
  const totalAccuracy = scoreFeedbackEntries.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>Feedback Dashboard</h2>
          <p className={`text-sm ${labelColor} mt-1`}>
            Review and respond to user feedback
          </p>
        </div>
        <button
          onClick={loadAllFeedback}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
          } hover:opacity-80 transition`}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Score Accuracy Summary */}
      {totalAccuracy > 0 && (
        <div className={`rounded-xl border p-4 ${cardClass}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${labelColor}`}>
            Score Accuracy Feedback ({totalAccuracy} responses)
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'too_low', label: 'Too Low', Icon: TrendingUp, color: isDark ? 'text-blue-400' : 'text-blue-600', iconBg: isDark ? 'bg-blue-900/30' : 'bg-blue-50' },
              { key: 'spot_on', label: 'Spot On', Icon: Target, color: isDark ? 'text-green-400' : 'text-green-600', iconBg: isDark ? 'bg-green-900/30' : 'bg-green-50' },
              { key: 'too_high', label: 'Too High', Icon: TrendingDown, color: isDark ? 'text-orange-400' : 'text-orange-600', iconBg: isDark ? 'bg-orange-900/30' : 'bg-orange-50' },
            ].map(item => (
              <div key={item.key} className="text-center">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-1 ${item.iconBg}`}>
                  <item.Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <p className={`text-2xl font-bold ${item.color}`}>{accuracyCounts[item.key]}</p>
                <p className={`text-xs ${labelColor}`}>{item.label}</p>
                <p className={`text-[10px] ${labelColor}`}>
                  {totalAccuracy > 0 ? Math.round((accuracyCounts[item.key] / totalAccuracy) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
          {/* Recent comments from score feedback */}
          {(() => {
            const withComments = scoreFeedbackEntries.filter(f => f.feedback_text && f.score_accuracy);
            if (withComments.length === 0) return null;
            const AccuracyIcon = { too_low: TrendingUp, spot_on: Target, too_high: TrendingDown };
            const AccuracyColor = { too_low: 'text-blue-400', spot_on: 'text-green-400', too_high: 'text-orange-400' };
            return (
              <div className={`mt-3 pt-3 space-y-2 ${isDark ? 'border-t border-slate-700/50' : 'border-t border-slate-200'}`}>
                <p className={`text-xs font-medium ${labelColor}`}>Recent comments:</p>
                {withComments.slice(0, 5).map((f, i) => {
                  const FIcon = AccuracyIcon[f.score_accuracy] || Target;
                  return (
                    <div key={i} className={`flex items-start gap-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <FIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${AccuracyColor[f.score_accuracy] || 'text-slate-400'}`} />
                      <span className="flex-1">{f.feedback_text}</span>
                      <span className={`shrink-0 ${labelColor}`}>{f.user_email}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab Switch */}
      <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
        <button
          onClick={() => { setTab('general'); setFilter('all'); }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            tab === 'general'
              ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          General Feedback
          {pendingGeneral > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white font-bold">
              {pendingGeneral}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab('call'); setFilter('all'); }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            tab === 'call'
              ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Call Feedback
          {pendingCall > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white font-bold">
              {pendingCall}
            </span>
          )}
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'reviewed', label: 'Reviewed' },
          { value: 'resolved', label: 'Resolved' }
        ].map(f => {
          const count = f.value === 'all'
            ? currentFeedback.length
            : currentFeedback.filter(fb => fb.status === f.value).length;

          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                filter === f.value
                  ? 'bg-[#2563EB] text-white'
                  : isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {filteredFeedback.length === 0 ? (
          <div className={`text-center p-12 rounded-lg border ${cardClass}`}>
            <Inbox className={`h-16 w-16 mx-auto mb-3 ${labelColor}`} />
            <p className={labelColor}>
              No {filter !== 'all' && filter} feedback found
            </p>
          </div>
        ) : (
          filteredFeedback.map(f => (
            <div
              key={`${tab}-${f.id}`}
              className={`rounded-lg border p-4 transition ${cardClass} ${
                selectedFeedback?.id === f.id ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className={`font-semibold ${textColor}`}>
                      {f.user_name || f.user_email}
                    </p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= f.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {tab === 'general' && f.category && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getCategoryColor(f.category)}`}>
                        {f.category}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${labelColor}`}>
                    {new Date(f.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${getStatusColor(f.status)}`}>
                  {f.status}
                </span>
              </div>

              {/* Call Details (only for call feedback) */}
              {tab === 'call' && (
                <div className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 text-xs ${labelColor}`}>
                    <div><span className="font-semibold">Role:</span> {f.role || 'N/A'}</div>
                    <div><span className="font-semibold">Persona:</span> {f.persona || 'N/A'}</div>
                    <div><span className="font-semibold">Segment:</span> {f.segment || 'N/A'}</div>
                    <div><span className="font-semibold">Score:</span> {f.overall_score || 'N/A'}/100</div>
                  </div>
                </div>
              )}

              {/* Feedback Text */}
              <div className="mb-3">
                <p className={`text-sm ${labelColor} font-semibold mb-1`}>Feedback:</p>
                <p className={`text-sm ${textColor} whitespace-pre-wrap`}>{f.feedback_text}</p>
              </div>

              {/* Admin Response */}
              {f.admin_response && (
                <div className={`mb-3 p-3 rounded-lg border ${
                  isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-xs font-semibold ${labelColor} mb-1`}>Admin Response:</p>
                  <p className={`text-sm ${textColor} whitespace-pre-wrap`}>{f.admin_response}</p>
                  {f.admin_responded_at && (
                    <p className={`text-xs ${labelColor} mt-1`}>
                      {new Date(f.admin_responded_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                {f.status !== 'reviewed' && (
                  <button
                    onClick={() => setSelectedFeedback(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition"
                  >
                    Respond & Mark Reviewed
                  </button>
                )}
                {f.status === 'reviewed' && (
                  <button
                    onClick={() => updateFeedbackStatus(f.id, 'resolved')}
                    disabled={updating}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Mark Resolved
                  </button>
                )}
                {f.status !== 'pending' && (
                  <button
                    onClick={() => updateFeedbackStatus(f.id, 'pending')}
                    disabled={updating}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                      isDark
                        ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Back to Pending
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Response Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 ${cardClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${textColor}`}>Respond to Feedback</h3>
              <button
                onClick={() => { setSelectedFeedback(null); setAdminResponse(''); }}
                className={`text-2xl ${labelColor} hover:opacity-70`}
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <p className={`text-sm ${labelColor}`}>
                  <strong>{selectedFeedback.user_name || selectedFeedback.user_email}</strong> gave {selectedFeedback.rating} stars
                </p>
                {tab === 'general' && selectedFeedback.category && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getCategoryColor(selectedFeedback.category)}`}>
                    {selectedFeedback.category}
                  </span>
                )}
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <p className={`text-sm ${textColor}`}>{selectedFeedback.feedback_text}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className={`block text-sm font-semibold ${labelColor} mb-2`}>
                Your Response (Optional)
              </label>
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Add a response or leave blank to mark as reviewed without comment..."
                rows={4}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? 'bg-slate-900 border-slate-600 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-600`}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => updateFeedbackStatus(selectedFeedback.id, 'reviewed', adminResponse || null)}
                disabled={updating}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Mark as Reviewed'}
              </button>
              <button
                onClick={() => { setSelectedFeedback(null); setAdminResponse(''); }}
                disabled={updating}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                  isDark
                    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
