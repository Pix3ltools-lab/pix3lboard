/**
 * Data Migration Page
 * Transfer data between local and cloud storage
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/context/DataContext';
import { useAuth } from '@/lib/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import {
  migrateLocalToCloud,
  migrateCloudToLocal,
  createLocalBackup,
  type MigrationProgress,
  type MigrationResult,
} from '@/lib/migration/migrator';
import { Upload, Download, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function MigratePage() {
  const router = useRouter();
  const { storageMode } = useData();
  const { isAuthenticated } = useAuth();

  const [direction, setDirection] = useState<'local-to-cloud' | 'cloud-to-local' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [backupKey, setBackupKey] = useState<string | null>(null);

  const handleMigrate = async (dir: 'local-to-cloud' | 'cloud-to-local') => {
    if (dir === 'local-to-cloud' && !isAuthenticated) {
      alert('Please sign in to migrate to cloud');
      router.push('/login');
      return;
    }

    // Confirmation
    const confirmMessage =
      dir === 'local-to-cloud'
        ? 'This will upload your local data to the cloud. A backup will be created automatically. Continue?'
        : 'This will download your cloud data to local storage. Your current local data will be replaced. Continue?';

    if (!confirm(confirmMessage)) return;

    setDirection(dir);
    setIsProcessing(true);
    setProgress({ phase: 'init', percent: 0, message: 'Initializing...' });
    setResult(null);

    // Create backup
    try {
      const backup = createLocalBackup();
      setBackupKey(backup);
    } catch (error) {
      console.error('Failed to create backup:', error);
    }

    // Run migration
    try {
      let migrationResult: MigrationResult;

      if (dir === 'local-to-cloud') {
        migrationResult = await migrateLocalToCloud(setProgress);
      } else {
        migrationResult = await migrateCloudToLocal(setProgress);
      }

      setResult(migrationResult);

      if (migrationResult.success) {
        // Show success and offer to switch mode
        setTimeout(() => {
          const switchMode =
            dir === 'local-to-cloud'
              ? confirm(
                  'Migration successful! Would you like to switch to Cloud Mode now? (Page will reload)'
                )
              : confirm(
                  'Download successful! Would you like to switch to Local Mode now? (Page will reload)'
                );

          if (switchMode) {
            const newMode = dir === 'local-to-cloud' ? 'cloud' : 'local';
            localStorage.setItem('pix3lboard-storage-mode', newMode);
            window.location.href = '/';
          }
        }, 1000);
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Migration failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setDirection(null);
    setProgress(null);
    setResult(null);
    setBackupKey(null);
  };

  return (
    <div className="min-h-screen bg-primary-bg">
      <Header showStorage={false} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-text mb-2">Data Migration</h1>
          <p className="text-secondary-text">
            Transfer your data between local storage and cloud
          </p>
        </div>

        {!direction && !result && (
          <>
            {/* Current Mode Info */}
            <div className="bg-secondary-bg border border-primary-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-primary-text mb-3">Current Mode</h2>
              <div className="flex items-center gap-3 p-4 bg-primary-bg border border-primary-border rounded-lg">
                <div className="text-primary-text capitalize font-medium">
                  {storageMode} Mode
                </div>
              </div>
            </div>

            {/* Migration Options */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload to Cloud */}
              <div className="bg-secondary-bg border border-primary-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Upload className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-semibold text-primary-text">
                    Upload to Cloud
                  </h3>
                </div>

                <p className="text-secondary-text mb-4">
                  Transfer your local data to Supabase cloud storage. Your data will be synced
                  across all devices.
                </p>

                <div className="space-y-2 text-sm mb-6">
                  <div className="flex items-center gap-2 text-green-400">
                    <span>✓</span>
                    <span>Multi-device sync</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <span>✓</span>
                    <span>Automatic backup created</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400">
                    <span>⚠</span>
                    <span>Requires authentication</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleMigrate('local-to-cloud')}
                  disabled={!isAuthenticated}
                  className="w-full"
                >
                  {isAuthenticated ? (
                    <>
                      Upload to Cloud
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    'Sign In Required'
                  )}
                </Button>
              </div>

              {/* Download from Cloud */}
              <div className="bg-secondary-bg border border-primary-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Download className="h-6 w-6 text-blue-400" />
                  <h3 className="text-xl font-semibold text-primary-text">
                    Download from Cloud
                  </h3>
                </div>

                <p className="text-secondary-text mb-4">
                  Download your cloud data to local storage. Work offline with all your data in
                  your browser.
                </p>

                <div className="space-y-2 text-sm mb-6">
                  <div className="flex items-center gap-2 text-green-400">
                    <span>✓</span>
                    <span>Works offline</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <span>✓</span>
                    <span>100% privacy</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-400">
                    <span>✗</span>
                    <span>Replaces local data</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => handleMigrate('cloud-to-local')}
                  disabled={!isAuthenticated}
                  className="w-full"
                >
                  {isAuthenticated ? (
                    <>
                      Download from Cloud
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    'Sign In Required'
                  )}
                </Button>
              </div>
            </div>

            {/* Warning */}
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-yellow-500 mb-1">Important</div>
                  <ul className="text-sm text-secondary-text space-y-1">
                    <li>• A backup will be created automatically</li>
                    <li>• Migration may take a few minutes for large datasets</li>
                    <li>• Do not close this page during migration</li>
                    <li>• Sign in required for cloud operations</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Migration Progress */}
        {isProcessing && progress && (
          <div className="bg-secondary-bg border border-primary-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-primary-text mb-4">
              {direction === 'local-to-cloud' ? 'Uploading to Cloud' : 'Downloading from Cloud'}
            </h2>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-secondary-text mb-2">
                <span className="capitalize">{progress.phase}</span>
                <span>{Math.round(progress.percent)}%</span>
              </div>
              <div className="w-full bg-primary-bg rounded-full h-3 overflow-hidden">
                <div
                  className="bg-accent-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            <p className="text-secondary-text text-center">{progress.message}</p>

            {backupKey && (
              <p className="text-xs text-green-400 mt-4 text-center">
                Backup created: {backupKey}
              </p>
            )}
          </div>
        )}

        {/* Migration Result */}
        {result && !isProcessing && (
          <div className="bg-secondary-bg border border-primary-border rounded-lg p-6">
            {result.success ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                  <h2 className="text-xl font-semibold text-primary-text">
                    Migration Successful!
                  </h2>
                </div>

                <div className="space-y-2 text-secondary-text mb-6">
                  <p>
                    ✓ {result.workspacesCount} workspace{result.workspacesCount !== 1 ? 's' : ''}
                  </p>
                  <p>
                    ✓ {result.boardsCount} board{result.boardsCount !== 1 ? 's' : ''}
                  </p>
                  <p>
                    ✓ {result.listsCount} list{result.listsCount !== 1 ? 's' : ''}
                  </p>
                  <p>
                    ✓ {result.cardsCount} card{result.cardsCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => router.push('/')} className="flex-1">
                    Go to Home
                  </Button>
                  <Button variant="secondary" onClick={handleReset} className="flex-1">
                    Migrate More
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <XCircle className="h-8 w-8 text-red-400" />
                  <h2 className="text-xl font-semibold text-primary-text">Migration Failed</h2>
                </div>

                <p className="text-red-400 mb-6">{result.error}</p>

                {backupKey && (
                  <p className="text-sm text-secondary-text mb-4">
                    Your data is safe. Backup: {backupKey}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleReset} className="flex-1">
                    Try Again
                  </Button>
                  <Button variant="secondary" onClick={() => router.push('/')} className="flex-1">
                    Go to Home
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Back to Settings */}
        {!isProcessing && !result && (
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" onClick={() => router.push('/settings')}>
              Back to Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
