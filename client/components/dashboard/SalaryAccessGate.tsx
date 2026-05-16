/**
 * SalaryAccessGate
 * Modal/dialog requiring passcode verification to access payroll data
 * Implements additional security layer for sensitive financial information
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from '../ui/use-toast';
import { logger } from '../../lib/logger';

interface SalaryAccessGateProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (passcode: string) => void;
  title?: string;
  description?: string;
}

const SalaryAccessGate: React.FC<SalaryAccessGateProps> = ({
  isOpen,
  onClose,
  onVerified,
  title = 'Payroll Data Access',
  description = 'This section contains sensitive payroll and salary information. Please enter your security passcode to proceed.',
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  const handleVerify = async () => {
    if (!passcode) {
      setVerificationError('Passcode is required');
      return;
    }

    if (passcode.length < 4) {
      setVerificationError('Passcode must be at least 4 characters');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');

    try {
      // In production, verify passcode against backend
      // For now, accept any 4+ digit code and set session flag
      const response = await fetch('/api/auth/verify-payroll-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode }),
      });

      if (!response.ok) {
        throw new Error('Passcode verification failed');
      }

      // Set session flag
      sessionStorage.setItem(
        'payroll_verified',
        JSON.stringify({
          verified: true,
          timestamp: Date.now(),
          expires: Date.now() + 15 * 60 * 1000, // 15 min expiry
        })
      );

      toast({
        title: 'Access Granted',
        description: 'You now have access to payroll data for 15 minutes.',
      });

      onVerified(passcode);
      setPasscode('');
      setAttempts(0);
    } catch (error) {
      logger.warn('Payroll access verification failed', {
        error: error instanceof Error ? error.message : String(error),
        attempt: attempts + 1,
      });

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= maxAttempts) {
        setVerificationError(
          `Maximum attempts exceeded. Access locked for 15 minutes.`
        );
        toast({
          title: 'Access Locked',
          description:
            'Too many failed attempts. Please try again in 15 minutes.',
          variant: 'destructive',
        });
        setTimeout(onClose, 1000);
      } else {
        setVerificationError(
          `Invalid passcode. ${maxAttempts - newAttempts} attempts remaining.`
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 mb-1">
                Restricted Access
              </p>
              <p className="text-amber-800 text-xs">
                This action is logged for security and audit purposes. Your
                access attempt will be recorded.
              </p>
            </div>
          </div>

          {/* Passcode Input */}
          <div className="space-y-2">
            <label htmlFor="passcode" className="text-sm font-medium">
              Security Passcode
            </label>
            <div className="relative">
              <Input
                id="passcode"
                type={showPasscode ? 'text' : 'password'}
                placeholder="Enter your passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isVerifying || attempts >= maxAttempts}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                disabled={isVerifying || attempts >= maxAttempts}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {showPasscode ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {verificationError && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{verificationError}</p>
            </div>
          )}

          {/* Info Message */}
          {attempts > 0 && attempts < maxAttempts && (
            <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-blue-700">
                Attempt {attempts}/{maxAttempts}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isVerifying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying || !passcode || attempts >= maxAttempts}
          >
            {isVerifying ? 'Verifying...' : 'Verify Access'}
          </Button>
        </DialogFooter>

        {/* Footer Note */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Session expires in 15 minutes. For support, contact your administrator.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryAccessGate;
