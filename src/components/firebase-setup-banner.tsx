import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, X, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface FirebaseSetupBannerProps {
  onDismiss?: () => void;
}

export function FirebaseSetupBanner({ onDismiss }: FirebaseSetupBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const firebaseRules = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(firebaseRules);
    setCopied(true);
    toast.success('Firebase rules copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-lg font-medium text-yellow-100 mb-1">
                    Firebase Setup Required
                  </h3>
                  <p className="text-sm text-yellow-200/80">
                    Your Firebase Security Rules need to be configured to enable data access
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Step-by-step Instructions */}
                <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-slate-900 rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">
                        Go to{' '}
                        <a 
                          href="https://console.firebase.google.com/project/classyreserveai/firestore/rules"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-400 hover:text-yellow-300 underline inline-flex items-center gap-1"
                        >
                          Firebase Console → Firestore Rules
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-slate-900 rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200 mb-2">
                        Copy and paste these development rules:
                      </p>
                      <div className="relative">
                        <pre className="bg-slate-950 text-slate-300 p-3 rounded text-xs overflow-x-auto border border-slate-700">
                          {firebaseRules}
                        </pre>
                        <Button
                          size="sm"
                          onClick={handleCopyRules}
                          className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-slate-200"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-slate-900 rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">
                        Click <span className="text-yellow-400 font-medium">Publish</span> and wait 10 seconds
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-slate-900 rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">
                        Refresh this page and click{' '}
                        <span className="text-yellow-400 font-medium">Seed Firebase</span> to populate data
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 text-xs text-yellow-200/70 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/20">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-yellow-200">Note:</strong> These are development rules that allow all access. 
                    See <code className="bg-slate-900 px-1 rounded">FIREBASE_SECURITY_RULES.md</code> for production rules before going live.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleCopyRules}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Rules
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('https://console.firebase.google.com/project/classyreserveai/firestore/rules', '_blank')}
                    className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Firebase Console
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}