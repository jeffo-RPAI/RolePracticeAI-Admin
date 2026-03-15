// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState } from 'react';
import {
  LayoutDashboard, Headphones, Users, MessageSquare,
  Activity, BarChart3, Phone, Settings2, Newspaper, SlidersHorizontal,
  FlaskConical, ClipboardList, Bug, MessageCircle, Wrench, Tag,
  Mail, Globe,
} from 'lucide-react';
import AdminDashboardSection from './components/admin/AdminDashboardSection';
import AdminSupportSection from './components/admin/AdminSupportSection';
import AdminChatPanel from './components/admin/AdminChatPanel';
import AdminAutoFixSettings from './components/admin/AdminAutoFixSettings';
import AdminUserAdminSection from './components/admin/AdminUserAdminSection';
import AdminMessagingSection from './components/admin/AdminMessagingSection';
import AdminTrialsSection from './components/admin/AdminTrialsSection';
import AdminWaitlistSection from './components/admin/AdminWaitlistSection';
import AdminSystemHealthSection from './components/admin/AdminSystemHealthSection';
import AdminScoreAnalyticsSection from './components/admin/AdminScoreAnalyticsSection';
import AdminCallBrowserSection from './components/admin/AdminCallBrowserSection';
import AdminPlanManagerSection from './components/admin/AdminPlanManagerSection';
import AdminNewsletterSection from './components/admin/AdminNewsletterSection';
import AdminPlatformSettingsSection from './components/admin/AdminPlatformSettingsSection';
import AdminPromoCodesSection from './components/admin/AdminPromoCodesSection';
import AdminFeedback from './AdminFeedback';
import AdminEmailLogsSection from './components/admin/AdminEmailLogsSection';
import AdminWebsiteTrafficSection from './components/admin/AdminWebsiteTrafficSection';

const sections = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    key: 'users', label: 'Users', icon: Users,
    subTabs: [
      { key: 'accounts', label: 'Accounts', icon: Users },
      { key: 'trials', label: 'Pilots', icon: FlaskConical },
      { key: 'waitlist', label: 'Waitlist', icon: ClipboardList },
    ],
  },
  {
    key: 'support', label: 'Support', icon: Headphones,
    subTabs: [
      { key: 'errors', label: 'Error Dashboard', icon: Bug },
      { key: 'autofix', label: 'AutoFix', icon: Wrench },
      { key: 'chat', label: 'Live Chat', icon: MessageCircle },
      { key: 'feedback', label: 'Feedback', icon: MessageSquare },
    ],
  },
  {
    key: 'activity', label: 'Activity', icon: BarChart3,
    subTabs: [
      { key: 'calls', label: 'Calls', icon: Phone },
      { key: 'analytics', label: 'Analytics', icon: BarChart3 },
      { key: 'traffic', label: 'Website Traffic', icon: Globe },
    ],
  },
  {
    key: 'comms', label: 'Communications', icon: MessageSquare,
    subTabs: [
      { key: 'messaging', label: 'Messaging', icon: MessageSquare },
      { key: 'newsletter', label: 'Newsletter', icon: Newspaper },
      { key: 'email_logs', label: 'Email Logs', icon: Mail },
      { key: 'settings', label: 'Settings', icon: SlidersHorizontal },
    ],
  },
  {
    key: 'plans', label: 'Plans', icon: Settings2,
    subTabs: [
      { key: 'manager', label: 'Plan Manager', icon: Settings2 },
      { key: 'promo', label: 'Promo Codes', icon: Tag },
    ],
  },
  { key: 'health', label: 'System Health', icon: Activity },
];

export default function SiteAdminConsole({ theme }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeSubTabs, setActiveSubTabs] = useState({
    users: 'accounts',
    support: 'errors',
    activity: 'calls',
    comms: 'messaging',
    plans: 'manager',
  });
  const [navigateToOrg, setNavigateToOrg] = useState(null);
  const isDark = theme === 'dark';

  // Navigate from Dashboard → Users/Accounts → specific org
  const handleOpenOrg = (orgId, orgName) => {
    setNavigateToOrg({ id: orgId, name: orgName });
    setActiveSection('users');
    setActiveSubTabs(prev => ({ ...prev, users: 'accounts' }));
  };

  const currentSection = sections.find(s => s.key === activeSection);
  const currentSubTab = currentSection?.subTabs
    ? activeSubTabs[activeSection]
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Primary Nav */}
      <div className={`flex items-center gap-1 mb-4 rounded-2xl p-1.5 shadow-lg ring-1 overflow-x-auto ${isDark ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'}`}>
        {sections.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeSection === key
                ? isDark ? 'bg-slate-50 text-slate-900 shadow-md' : 'bg-slate-900 text-white shadow-md'
                : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab Nav */}
      {currentSection?.subTabs && (
        <div className={`flex items-center gap-1 mb-6 rounded-xl p-1 ring-1 overflow-x-auto ${isDark ? 'bg-slate-800/50 ring-slate-700' : 'bg-slate-100 ring-slate-200'}`}>
          {currentSection.subTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSubTabs(prev => ({ ...prev, [activeSection]: key }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentSubTab === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Section Content */}
      {activeSection === 'dashboard' && (
        <AdminDashboardSection theme={theme} onOpenOrg={handleOpenOrg} />
      )}

      {activeSection === 'users' && currentSubTab === 'accounts' && (
        <AdminUserAdminSection theme={theme} navigateToOrg={navigateToOrg} onNavigateConsumed={() => setNavigateToOrg(null)} />
      )}
      {activeSection === 'users' && currentSubTab === 'trials' && (
        <AdminTrialsSection theme={theme} />
      )}
      {activeSection === 'users' && currentSubTab === 'waitlist' && (
        <AdminWaitlistSection theme={theme} />
      )}

      {activeSection === 'support' && currentSubTab === 'errors' && (
        <AdminSupportSection theme={theme} />
      )}
      {activeSection === 'support' && currentSubTab === 'autofix' && (
        <AdminAutoFixSettings theme={theme} />
      )}
      {activeSection === 'support' && currentSubTab === 'chat' && (
        <AdminChatPanel theme={theme} />
      )}
      {activeSection === 'support' && currentSubTab === 'feedback' && (
        <AdminFeedback theme={theme} />
      )}

      {activeSection === 'activity' && currentSubTab === 'calls' && (
        <AdminCallBrowserSection theme={theme} />
      )}
      {activeSection === 'activity' && currentSubTab === 'analytics' && (
        <AdminScoreAnalyticsSection theme={theme} />
      )}
      {activeSection === 'activity' && currentSubTab === 'traffic' && (
        <AdminWebsiteTrafficSection theme={theme} />
      )}

      {activeSection === 'comms' && currentSubTab === 'messaging' && (
        <AdminMessagingSection theme={theme} />
      )}
      {activeSection === 'comms' && currentSubTab === 'newsletter' && (
        <AdminNewsletterSection theme={theme} />
      )}
      {activeSection === 'comms' && currentSubTab === 'email_logs' && (
        <AdminEmailLogsSection theme={theme} />
      )}
      {activeSection === 'comms' && currentSubTab === 'settings' && (
        <AdminPlatformSettingsSection theme={theme} />
      )}

      {activeSection === 'plans' && currentSubTab === 'manager' && (
        <AdminPlanManagerSection theme={theme} />
      )}
      {activeSection === 'plans' && currentSubTab === 'promo' && (
        <AdminPromoCodesSection theme={theme} />
      )}
      {activeSection === 'health' && (
        <AdminSystemHealthSection theme={theme} />
      )}
    </div>
  );
}
