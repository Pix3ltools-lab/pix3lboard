/**
 * Settings Page
 * Storage mode management and app settings
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/context/DataContext';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Database, HardDrive, Cloud, ArrowRight, AlertCircle, Lock } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { storageMode, switchStorageMode } = useData();
  const { isAuthenticated, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchMode = async (newMode: 'local' | 'cloud') => {
    if (newMode === 'cloud' && !isAuthenticated) {
      // Redirect to login
      router.push('/login');
      return;
    }

    if (newMode === storageMode) return;

    setIsLoading(true);

    // Show confirmation
    const confirmed = window.confirm(
      newMode === 'cloud'
        ? 'Switch to Cloud Mode? Your local data will need to be migrated. This will reload the page.'
        : 'Switch to Local Mode? You will need to download your cloud data first. This will reload the page.'
    );

    if (confirmed) {
      await switchStorageMode(newMode);
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-bg">
      <Header showStorage={false} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-text mb-2">Settings</h1>
          <p className="text-secondary-text">
            Manage your storage preferences and app settings
          </p>
        </div>

        {/* Storage Mode Section */}
        <div className="bg-secondary-bg border border-primary-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-primary-text mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Mode
          </h2>

          {/* Current Mode Indicator */}
          <div className="mb-6 p-4 bg-primary-bg border border-primary-border rounded-lg">
            <div className="flex items-center gap-3">
              {storageMode === 'local' ? (
                <HardDrive className="h-6 w-6 text-blue-400" />
              ) : (
                <Cloud className="h-6 w-6 text-green-400" />
              )}
              <div>
                <div className="font-medium text-primary-text">
                  Current Mode: <span className="capitalize">{storageMode}</span>
                </div>
                <div className="text-sm text-secondary-text">
                  {storageMode === 'local'
                    ? 'All data stored locally in your browser (5MB limit)'
                    : `Cloud storage with PostgreSQL database${profile ? ` (${profile.email})` : ''}`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Mode Options */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Local Mode Card */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                storageMode === 'local'
                  ? 'border-blue-400 bg-blue-400/5'
                  : 'border-primary-border hover:border-blue-400/50'
              }`}
              onClick={() => handleSwitchMode('local')}
            >
              <div className="flex items-start gap-3 mb-3">
                <HardDrive className={`h-6 w-6 mt-1 ${storageMode === 'local' ? 'text-blue-400' : 'text-secondary-text'}`} />
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-text mb-1">
                    Local Mode
                  </h3>
                  <p className="text-sm text-secondary-text">
                    Privacy-first. All data stays in your browser.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-400">
                  <span>✓</span>
                  <span>100% private</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <span>✓</span>
                  <span>No account needed</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <span>✓</span>
                  <span>Works offline</span>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <span>✗</span>
                  <span>Single device only</span>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <span>✗</span>
                  <span>5MB storage limit</span>
                </div>
              </div>

              {storageMode === 'local' && (
                <div className="mt-3 pt-3 border-t border-primary-border">
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>Active</span>
                  </div>
                </div>
              )}
            </div>

            {/* Cloud Mode Card */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                storageMode === 'cloud'
                  ? 'border-green-400 bg-green-400/5'
                  : 'border-primary-border hover:border-green-400/50'
              }`}
              onClick={() => handleSwitchMode('cloud')}
            >
              <div className="flex items-start gap-3 mb-3">
                <Cloud className={`h-6 w-6 mt-1 ${storageMode === 'cloud' ? 'text-green-400' : 'text-secondary-text'}`} />
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-text mb-1">
                    Cloud Mode
                  </h3>
                  <p className="text-sm text-secondary-text">
                    Multi-device sync with Supabase.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-400">
                  <span>✓</span>
                  <span>Multi-device sync</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <span>✓</span>
                  <span>No storage limit</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <span>✓</span>
                  <span>Automatic backup</span>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <span>✗</span>
                  <span>Requires account</span>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <span>✗</span>
                  <span>Needs authentication</span>
                </div>
              </div>

              {storageMode === 'cloud' && (
                <div className="mt-3 pt-3 border-t border-primary-border">
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Connected</span>
                  </div>
                </div>
              )}

              {storageMode === 'local' && !isAuthenticated && (
                <div className="mt-3 pt-3 border-t border-primary-border">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/login');
                    }}
                    className="w-full text-xs"
                  >
                    Sign In Required
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Warning for mode switching */}
          {storageMode !== 'cloud' || !isAuthenticated ? (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-yellow-500 mb-1">
                    Before switching modes
                  </div>
                  <div className="text-sm text-secondary-text space-y-1">
                    <p>• Export your data as backup (recommended)</p>
                    <p>• Cloud mode requires authentication</p>
                    <p>• Switching will reload the page</p>
                    <p>• Use migration tools to transfer data between modes</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Data Management Section */}
        <div className="bg-secondary-bg border border-primary-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-primary-text mb-4">
            Data Management
          </h2>

          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={() => {
                // Export functionality already exists in DataContext
                alert('Export feature coming soon via DataContext');
              }}
              className="w-full justify-start"
            >
              <Database className="h-4 w-4 mr-2" />
              Export Data (JSON)
            </Button>

            {storageMode === 'local' && isAuthenticated && (
              <Button
                variant="primary"
                onClick={() => {
                  router.push('/migrate');
                }}
                className="w-full justify-start"
              >
                <Cloud className="h-4 w-4 mr-2" />
                Migrate Local Data to Cloud
              </Button>
            )}

            {storageMode === 'cloud' && (
              <Button
                variant="secondary"
                onClick={() => {
                  router.push('/migrate');
                }}
                className="w-full justify-start"
              >
                <HardDrive className="h-4 w-4 mr-2" />
                Download Cloud Data to Local
              </Button>
            )}
          </div>
        </div>

        {/* Back to Home */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
