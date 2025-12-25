import React, { useState, useEffect } from 'react';
import { Package, Cookie, Activity, CheckCircle, ArrowRight, Settings } from 'lucide-react';
import { activityService } from '../../services/activityService';

function Dashboard({ stats, onNavigate }) {
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  const statsCards = [
    {
      id: 'stores',
      label: 'Total Stores',
      value: stats?.totalStores || 0,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      id: 'cookies',
      label: 'Total Cookies',
      value: stats?.totalCookies || 0,
      icon: Cookie,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      id: 'sessions',
      label: 'Active Sessions',
      value: stats?.activeSessions || 0,
      icon: Activity,
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    },
    {
      id: 'status',
      label: 'System Status',
      value: stats?.systemStatus || 'Online',
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    }
  ];

  // Fetch recent activities on mount
  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      setIsLoadingActivities(true);
      const activities = await activityService.getRecent();
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Keep empty array if error
      setRecentActivities([]);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'info': return 'bg-blue-100 text-blue-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={stat.textColor} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
          
          {isLoadingActivities ? (
            // Loading skeleton
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-100">
                  <div className="w-2 h-2 mt-2 bg-gray-300 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length > 0 ? (
            // Real activities with custom scrollbar
            <div className="space-y-4 overflow-y-auto custom-scrollbar max-h-96">
              {recentActivities.map((activity) => (
                <div key={activity._id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">{activity.action}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeColor(activity.type)}`}>
                        {activity.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {activity.store || 'System'} • {activity.timeAgo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // No activities
            <div className="text-center py-8">
              <Activity className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-500">No recent activities</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {/* ✅ UPDATED: "Refresh Cookies" → "Cookies" with Cookie icon, no blue background */}
            <button
              onClick={() => onNavigate('cookies')}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Cookie size={18} />
                <span className="font-medium">Cookies</span>
              </div>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onNavigate('stores')}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package size={18} />
                <span className="font-medium">View All Stores</span>
              </div>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings size={18} />
                <span className="font-medium">System Settings</span>
              </div>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;