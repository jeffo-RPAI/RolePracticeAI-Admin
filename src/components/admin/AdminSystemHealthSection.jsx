// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Activity, Database, Server, CreditCard, Mail, Shield, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Clock, Cpu, HardDrive, Users,
  Zap, ExternalLink, Cloud, Eye, GripVertical, Sparkles, X, Github
} from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3001').replace('wss://', 'https://').replace('ws://', 'http://');

const DEFAULT_CARD_ORDER = ['server', 'database', 'openai', 'xai', 'anthropic', 'clerk', 'stripe', 'resend', 'railway', 'vercel', 'sentry', 'github'];
const STORAGE_KEY = 'rp_health_card_order';

function StatusBadge({ status }) {
  if (status === 'ok') return <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400"><CheckCircle className="w-3.5 h-3.5" /> Healthy</span>;
  if (status === 'warning') return <span className="flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400"><AlertTriangle className="w-3.5 h-3.5" /> Warning</span>;
  if (status === 'critical') return <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400"><XCircle className="w-3.5 h-3.5" /> Critical</span>;
  if (status === 'unconfigured') return <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Not configured</span>;
  return <span className="text-xs text-slate-400">Unknown</span>;
}

function ProgressBar({ percent, colorClass }) {
  return (
    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

function MetricRow({ label, value, warn }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-medium ${warn ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-900 dark:text-slate-50'}`}>
        {value ?? '–'}
      </span>
    </div>
  );
}

function renderCardContent(key, check) {
  if (check.error) return <p className="text-xs text-red-500">{check.error}</p>;

  switch (key) {
    case 'server':
      return (
        <>
          <MetricRow label="Uptime" value={check.uptimeFormatted} />
          <MetricRow label="Heap Usage" value={`${check.memory?.heapUsedMB} / ${check.memory?.heapTotalMB} MB`} />
          <ProgressBar
            percent={check.memory?.heapPercent || 0}
            colorClass={check.memory?.heapPercent > 90 ? 'bg-red-500' : check.memory?.heapPercent > 75 ? 'bg-yellow-500' : 'bg-green-500'}
          />
          <MetricRow label="RSS Memory" value={`${check.memory?.rssMB} MB`} />
          <MetricRow label="Node.js" value={check.nodeVersion} />
        </>
      );
    case 'database':
      return (
        <>
          <MetricRow label="Latency" value={`${check.latencyMs}ms`} />
          <MetricRow label="DB Size" value={`${check.sizeMB} MB`} />
          <MetricRow label="Connections" value={`${check.totalConnections} / ${check.maxConnections}`} />
          <ProgressBar
            percent={check.connectionPercent || 0}
            colorClass={check.connectionPercent > 80 ? 'bg-red-500' : check.connectionPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'}
          />
          <MetricRow label="Errors (24h)" value={check.errors24h} />
        </>
      );
    case 'openai':
    case 'xai':
    case 'anthropic':
      return (
        <>
          <MetricRow label="Reachable" value={check.reachable ? 'Yes' : 'No'} />
          <MetricRow label="Latency" value={`${check.latencyMs}ms`} />
          {check.rateLimited && <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Rate limited</p>}
        </>
      );
    case 'clerk':
      return (
        <>
          <MetricRow label="Latency" value={`${check.latencyMs}ms`} />
          <MetricRow label="Total Users" value={check.totalUsers?.toLocaleString()} />
        </>
      );
    case 'stripe':
      return (
        <>
          <MetricRow label="Latency" value={`${check.latencyMs}ms`} />
          {check.balanceAvailable?.map((b, i) => (
            <MetricRow key={i} label={`Balance (${b.currency.toUpperCase()})`} value={`$${b.amount.toFixed(2)}`} />
          ))}
          <MetricRow label="Failed Payments (7d)" value={check.recentFailedPayments} warn={check.recentFailedPayments > 0} />
        </>
      );
    case 'resend':
      return (
        <>
          <MetricRow label="Latency" value={`${check.latencyMs}ms`} />
          {check.message && <MetricRow label="Status" value={check.message} />}
          {check.domains?.map((d, i) => (
            <MetricRow key={i} label={d.name} value={d.status} warn={d.status !== 'verified'} />
          ))}
        </>
      );
    case 'railway':
      return (
        <>
          <MetricRow label="Latency" value={`${check.latencyMs}ms`} />
          <MetricRow label="Account" value={check.account} />
        </>
      );
    case 'vercel':
      return (
        <>
          <MetricRow label="Latency" value={`${check.latencyMs}ms`} />
          {check.latestDeploy && (
            <>
              <MetricRow label="Latest Deploy" value={check.latestDeploy.state} warn={check.latestDeploy.state === 'ERROR'} />
              <MetricRow label="Deployed" value={new Date(check.latestDeploy.createdAt).toLocaleString()} />
            </>
          )}
        </>
      );
    case 'sentry':
      return (
        <>
          <MetricRow label="Latency" value={`${check.latencyMs}ms`} />
          <MetricRow label="Errors (24h)" value={check.errors24h} warn={check.errors24h > 50} />
        </>
      );
    case 'github':
      return (
        <>
          <MetricRow label="Reachable" value={check.reachable ? 'Yes' : 'No'} />
          <MetricRow label="Latency" value={`${check.latencyMs}ms`} />
          {check.account && <MetricRow label="Account" value={check.account} />}
        </>
      );
    default:
      return <MetricRow label="Status" value={check.status} />;
  }
}

const CARD_TITLES = {
  server: 'Backend Server', database: 'Neon PostgreSQL', openai: 'OpenAI',
  xai: 'xAI / Grok', anthropic: 'Anthropic / Claude', clerk: 'Clerk Auth', stripe: 'Stripe Payments',
  resend: 'Resend Email', railway: 'Railway', vercel: 'Vercel', sentry: 'Sentry', github: 'GitHub',
};

const CARD_ICONS = {
  server: Server, database: Database, openai: Zap, xai: Zap, anthropic: Sparkles, clerk: Shield,
  stripe: CreditCard, resend: Mail, railway: Cloud, vercel: Cloud, sentry: Eye, github: Github,
};

const CARD_URLS = {
  server: null, // No external dashboard
  database: 'https://console.neon.tech',
  openai: 'https://platform.openai.com',
  xai: 'https://console.x.ai',
  anthropic: 'https://console.anthropic.com',
  clerk: 'https://dashboard.clerk.com',
  stripe: 'https://dashboard.stripe.com',
  resend: 'https://resend.com/overview',
  railway: 'https://railway.app/dashboard',
  vercel: 'https://vercel.com/dashboard',
  sentry: 'https://sentry.io',
  github: 'https://github.com/jeffo-RPAI/RolePracticeAI-App',
};

export default function AdminSystemHealthSection({ theme }) {
  const { getToken } = useAuth();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Card order (persisted to localStorage)
  const [cardOrder, setCardOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CARD_ORDER;
    } catch { return DEFAULT_CARD_ORDER; }
  });

  // Drag-and-drop state
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverCard, setDragOverCard] = useState(null);

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(null); // service key being analyzed
  const [analyses, setAnalyses] = useState({}); // { serviceKey: 'analysis text' }

  const fetchHealth = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/system-health`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setHealth(await res.json());
        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchHealth(), 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Save card order to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cardOrder));
  }, [cardOrder]);

  // Drag handlers
  const handleDragStart = (key) => setDraggedCard(key);
  const handleDragOver = (e, key) => { e.preventDefault(); setDragOverCard(key); };
  const handleDragEnd = () => { setDraggedCard(null); setDragOverCard(null); };
  const handleDrop = (targetKey) => {
    if (!draggedCard || draggedCard === targetKey) return;
    setCardOrder(prev => {
      const newOrder = [...prev];
      const fromIdx = newOrder.indexOf(draggedCard);
      const toIdx = newOrder.indexOf(targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggedCard);
      return newOrder;
    });
    setDraggedCard(null);
    setDragOverCard(null);
  };

  // AI analysis
  const analyzeService = async (serviceKey, check) => {
    setAnalyzing(serviceKey);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/system-health/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceKey, check }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyses(prev => ({ ...prev, [serviceKey]: data.analysis }));
      }
    } catch (error) {
      console.error('Error analyzing service:', error);
    } finally {
      setAnalyzing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 dark:border-slate-50"></div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-20 text-slate-500 dark:text-slate-400">
        Failed to load system health data.
        <button onClick={() => fetchHealth(true)} className="ml-2 underline">Retry</button>
      </div>
    );
  }

  const { overall, alerts, checks } = health;
  const configuredServices = Object.entries(checks).filter(([, c]) => c.status !== 'unconfigured');
  const unconfiguredServices = Object.entries(checks).filter(([, c]) => c.status === 'unconfigured');

  // Build ordered list of cards (only configured ones)
  const orderedCards = cardOrder
    .filter(key => checks[key] && checks[key].status !== 'unconfigured')
    .concat(
      // Add any configured services not in the saved order (new services)
      configuredServices.map(([k]) => k).filter(k => !cardOrder.includes(k))
    );

  return (
    <div className="space-y-6">
      {/* Overall Status Banner */}
      <div className={`rounded-2xl p-5 shadow-lg ring-1 ${
        overall === 'ok' ? 'bg-green-50 dark:bg-green-900/20 ring-green-200 dark:ring-green-800' :
        overall === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 ring-yellow-200 dark:ring-yellow-800' :
        'bg-red-50 dark:bg-red-900/20 ring-red-200 dark:ring-red-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {overall === 'ok' ? <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" /> :
             overall === 'warning' ? <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" /> :
             <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />}
            <div>
              <h2 className={`text-lg font-bold ${
                overall === 'ok' ? 'text-green-800 dark:text-green-200' :
                overall === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                'text-red-800 dark:text-red-200'
              }`}>
                {overall === 'ok' ? 'All Systems Operational' :
                 overall === 'warning' ? 'Some Services Degraded' :
                 'Critical Issues Detected'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {configuredServices.filter(([, c]) => c.status === 'ok').length}/{configuredServices.length} services healthy
                {lastRefreshed && ` – Last checked ${lastRefreshed.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-white dark:bg-slate-800 shadow ring-1 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ring-1 ${
              alert.severity === 'critical'
                ? 'bg-red-50 dark:bg-red-900/20 ring-red-200 dark:ring-red-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 ring-yellow-200 dark:ring-yellow-800'
            }`}>
              {alert.severity === 'critical'
                ? <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />}
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {CARD_TITLES[alert.service] || alert.service}:
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Service Cards (drag-and-drop grid) */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {orderedCards.map(key => {
          const check = checks[key];
          const Icon = CARD_ICONS[key] || Activity;
          const title = CARD_TITLES[key] || key;
          const isDragging = draggedCard === key;
          const isDragOver = dragOverCard === key && draggedCard !== key;
          const hasIssue = check.status === 'warning' || check.status === 'critical';

          return (
            <div
              key={key}
              draggable
              onDragStart={() => handleDragStart(key)}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(key)}
              className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg ring-1 transition-all ${
                isDragging ? 'opacity-40 scale-95' :
                isDragOver ? 'ring-2 ring-blue-400 dark:ring-blue-500 scale-[1.02]' :
                check.status === 'critical' ? 'ring-red-300 dark:ring-red-800' :
                check.status === 'warning' ? 'ring-yellow-300 dark:ring-yellow-800' :
                'ring-slate-200 dark:ring-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing" />
                  <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  {CARD_URLS[key] ? (
                    <a href={CARD_URLS[key]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {title} <ExternalLink className="w-3 h-3 opacity-40" />
                    </a>
                  ) : (
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">{title}</h3>
                  )}
                </div>
                <StatusBadge status={check.status} />
              </div>

              {/* Card Metrics */}
              <div className="space-y-2 mb-3">
                {renderCardContent(key, check)}
              </div>

              {/* AI Analyze Button */}
              <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700">
                {analyses[key] ? (
                  <div className="relative">
                    <button
                      onClick={() => setAnalyses(prev => { const n = { ...prev }; delete n[key]; return n; })}
                      className="absolute top-0 right-0 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="pr-5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">AI Analysis</p>
                      <pre className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{analyses[key]}</pre>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => analyzeService(key, check)}
                    disabled={analyzing === key}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg w-full justify-center disabled:opacity-50 ${
                      hasIssue
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {analyzing === key ? 'Analyzing...' : hasIssue ? 'AI Diagnose' : 'AI Health Check'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unconfigured Services */}
      {unconfiguredServices.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-3">Services Not Yet Connected</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Add these environment variables to Railway to enable monitoring:
          </p>
          <div className="flex flex-wrap gap-2">
            {unconfiguredServices.map(([key]) => {
              const envVar = key === 'railway' ? 'RAILWAY_API_TOKEN' :
                            key === 'vercel' ? 'VERCEL_API_TOKEN' :
                            key === 'sentry' ? 'SENTRY_AUTH_TOKEN' :
                            key === 'anthropic' ? 'ANTHROPIC_API_KEY' :
                            key === 'github' ? 'GITHUB_TOKEN' : `${key.toUpperCase()}_API_KEY`;
              return (
                <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                  {CARD_TITLES[key] || key}
                  <code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">{envVar}</code>
                </span>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
