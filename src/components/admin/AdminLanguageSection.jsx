// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Globe, ChevronDown, ChevronUp } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminLanguageSection({ theme = 'dark' }) {
  const { getToken } = useAuth();
  const isDark = theme === 'dark';

  const [languages, setLanguages] = useState([]);
  const [interest, setInterest] = useState({ by_language: {}, total: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingCode, setTogglingCode] = useState(null);
  const [successCode, setSuccessCode] = useState(null);
  const [interestOpen, setInterestOpen] = useState(false);

  const fetchLanguageSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/language-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLanguages(data.languages || []);
        setInterest(data.interest || { by_language: {}, total: 0 });
      }
    } catch (e) {
      console.error('Failed to load language settings:', e);
    }
  }, [getToken]);

  const fetchInterestSubmissions = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/language-interest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (e) {
      console.error('Failed to load language interest submissions:', e);
    }
  }, [getToken]);

  useEffect(() => {
    Promise.all([fetchLanguageSettings(), fetchInterestSubmissions()]).finally(() => setLoading(false));
  }, [fetchLanguageSettings, fetchInterestSubmissions]);

  const toggleLanguage = async (code, currentEnabled) => {
    setTogglingCode(code);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/language-settings/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLanguages(prev =>
          prev.map(l => l.language_code === code ? { ...l, enabled: updated.enabled, updated_at: updated.updated_at } : l)
        );
        setSuccessCode(code);
        setTimeout(() => setSuccessCode(null), 2000);
      }
    } catch (e) {
      console.error('Failed to toggle language:', e);
    } finally {
      setTogglingCode(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl p-5 shadow-lg ring-1 ${isDark ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading language settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Language Toggles */}
      <div className={`rounded-2xl p-5 shadow-lg ring-1 ${isDark ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'}`}>
        <div className="flex items-center gap-2 mb-1">
          <Globe className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-sm font-bold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>Practice Languages</h3>
        </div>
        <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Control which languages are available in the practice call language selector
        </p>

        <div className="space-y-0">
          {languages.map((lang, idx) => {
            const isEnUS = lang.language_code === 'en-US';
            const interestCount = interest.by_language[lang.language_name] || interest.by_language[lang.language_code] || 0;
            const isToggling = togglingCode === lang.language_code;
            const justSaved = successCode === lang.language_code;

            return (
              <div
                key={lang.language_code}
                className={`flex items-center justify-between py-3 ${
                  idx < languages.length - 1 ? `border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}` : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {lang.language_name}
                      <span className={`ml-1.5 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        ({lang.language_code})
                      </span>
                    </p>
                    {isEnUS && (
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Default -- always enabled</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {interestCount > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {interestCount} request{interestCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {justSaved && (
                    <span className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>Saved</span>
                  )}
                  <button
                    onClick={() => !isEnUS && !isToggling && toggleLanguage(lang.language_code, lang.enabled)}
                    disabled={isEnUS || isToggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnUS ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${
                      lang.enabled ? 'bg-green-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      lang.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Language Interest Submissions */}
      <div className={`rounded-2xl shadow-lg ring-1 ${isDark ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'}`}>
        <button
          onClick={() => setInterestOpen(!interestOpen)}
          className={`w-full flex items-center justify-between p-5 text-left`}
        >
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              Language Interest Signups
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {submissions.length > 0 ? `${submissions.length} submission${submissions.length !== 1 ? 's' : ''}` : 'No signups yet'}
            </p>
          </div>
          {interestOpen
            ? <ChevronUp className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            : <ChevronDown className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          }
        </button>

        {interestOpen && (
          <div className={`px-5 pb-5 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {submissions.length === 0 ? (
              <p className={`text-sm py-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                No language interest signups yet.
              </p>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <th className="text-left py-2 pr-4 font-medium">Date</th>
                      <th className="text-left py-2 pr-4 font-medium">Email</th>
                      <th className="text-left py-2 pr-4 font-medium">Language</th>
                      <th className="text-left py-2 font-medium">Browser Language</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id} className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <td className={`py-2 pr-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className={`py-2 pr-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{sub.email}</td>
                        <td className={`py-2 pr-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{sub.language}</td>
                        <td className={`py-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sub.browser_language || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
