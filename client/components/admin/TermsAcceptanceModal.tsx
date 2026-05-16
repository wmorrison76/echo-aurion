/**
 * Terms & NDA Acceptance Modal
 * Shows legal terms on first login
 * Records acceptance timestamp and IP for compliance
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/glass';

export interface TermsAcceptanceProps {
  employeeId: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  onAccept: (terms: TermsType[]) => Promise<void>;
  onReject: () => void;
  showForTerms?: TermsType[];
}

export type TermsType = 'NDA' | 'NON_COMPETE' | 'GENERAL_TERMS';

interface TermsContent {
  type: TermsType;
  title: string;
  content: string;
  version: string;
}

const TERMS_LIBRARY: Record<TermsType, TermsContent> = {
  NDA: {
    type: 'NDA',
    title: 'Non-Disclosure Agreement (NDA)',
    version: '1.0',
    content: `
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of this date between ${new Date().toLocaleDateString()}.

1. CONFIDENTIAL INFORMATION
Employee agrees that all information, data, trade secrets, and business practices of the Company, including but not limited to:
- Guest information and preferences
- Menu recipes and preparation methods
- Pricing and financial information
- Marketing strategies and plans
- Operational procedures and systems
- Employee information

shall be treated as confidential and proprietary information.

2. OBLIGATIONS
During and after employment, Employee agrees to:
- Keep all confidential information strictly confidential
- Not disclose any information to third parties without written authorization
- Not use confidential information for personal benefit
- Return all confidential materials upon termination
- Comply with all security and privacy procedures

3. PERMITTED DISCLOSURES
Information may be disclosed only when:
- Required by law or court order (with advance notice to Company)
- Authorized in writing by Company management
- Disclosed to legal counsel for legal advice
- Disclosed to family members with strict confidentiality instructions

4. DURATION
This obligation continues indefinitely, including after termination of employment.

5. EXCEPTIONS
Information that is or becomes publicly available through no breach of this Agreement is not subject to this restriction.

6. REMEDIES
Employee acknowledges that breach of this Agreement would cause irreparable harm. Company is entitled to seek injunctive relief and damages.

7. GOVERNING LAW
This Agreement is governed by applicable state and federal law.

By accepting this agreement, you acknowledge you have read, understood, and agree to comply with all terms.
    `.trim(),
  },
  NON_COMPETE: {
    type: 'NON_COMPETE',
    title: 'Non-Compete Agreement',
    version: '1.0',
    content: `
NON-COMPETE AGREEMENT

This Non-Compete Agreement ("Agreement") is entered into as of this date between ${new Date().toLocaleDateString()}.

1. DEFINITION OF COMPETING BUSINESS
A "Competing Business" means any business that:
- Operates a restaurant, bar, or hospitality establishment
- Serves food and beverages to the public
- Competes with Company in the same geographic market
- Employs or engages with former employees of Company

2. GEOGRAPHIC SCOPE
The restricted area includes:
- Current Company locations
- Primary metropolitan area (approximately 50 miles)
- Any area where Company has conducted business during employment

3. TIME RESTRICTION
- During employment: Employee agrees not to solicit Company customers or employees
- After termination: Non-compete applies for up to 1 year (or as permitted by law)
- Reduced time for hourly positions: 6 months
- Reduced time for at-will employment: 90 days

4. PROHIBITED ACTIVITIES
Employee agrees NOT to:
- Work for a competing business in any capacity
- Solicit or assist in recruiting Company employees
- Solicit Company customers or accounts
- Disclose Company secrets to competitors
- Use Company trade secrets for competitive advantage
- Prepare to open a competing business using Company information

5. EXEMPTIONS
This does not restrict:
- General skills and knowledge acquired during employment
- Work for non-competing businesses
- Employment in a different geographic area
- Publicly available information
- Information disclosed with written consent

6. CONSIDERATION
Employee understands this restriction is:
- A condition of employment
- Supported by Company investment in training
- Supported by access to confidential information
- Supported by customer relationships built

7. ENFORCEABILITY
This Agreement is enforceable to the maximum extent permitted by law. If any portion is found unenforceable, remaining portions remain valid.

8. REMEDIES
Employee acknowledges Company is entitled to seek:
- Injunctive relief (court orders)
- Money damages
- Attorneys' fees and costs

By accepting this agreement, you acknowledge understanding and agreement to all terms.
    `.trim(),
  },
  GENERAL_TERMS: {
    type: 'GENERAL_TERMS',
    title: 'System Terms of Service',
    version: '1.0',
    content: `
SYSTEM TERMS OF SERVICE

1. ACCEPTABLE USE
Employee agrees to use this system only for:
- Work-related purposes assigned by management
- Job duties and responsibilities
- Authorized business activities
- Training and professional development

2. PROHIBITED USE
Employee agrees NOT to:
- Access other employees' accounts or data
- Modify, delete, or tamper with system data
- Attempt to breach system security
- Use system for personal business
- Share login credentials with others
- Access the system outside authorized shifts (for hourly employees)
- Create unauthorized backups of data

3. SECURITY RESPONSIBILITIES
Employee agrees to:
- Maintain password confidentiality
- Log out after each use
- Report suspicious activity immediately
- Follow all security procedures
- Use strong passwords (provided by system)
- Not use system from unsecured networks (unless VPN)

4. DATA PRIVACY
Employee understands:
- System access is monitored and logged
- All activity may be reviewed for compliance
- Personal use may be restricted or monitored
- Data is encrypted and protected
- Company owns all data in system

5. COMPLIANCE
Employee agrees to:
- Follow all Company policies
- Comply with all applicable laws
- Report violations to management
- Participate in security training
- Keep software updated and patched

6. TERMINATION
Upon termination:
- All access immediately revoked
- All data remains Company property
- Obligations to protect data continue
- No personal use permitted

7. MODIFICATIONS
Company reserves right to:
- Modify these terms with notice
- Update security requirements
- Change access policies
- Enforce compliance measures

8. ACKNOWLEDGMENT
By accepting, you certify:
- You have read and understand these terms
- You agree to comply fully
- You understand consequences of violations
- You will follow all policies

Employee violations may result in:
- Access suspension or termination
- Disciplinary action up to termination
- Legal action and damages
- Law enforcement involvement (if criminal)
    `.trim(),
  },
};

export function TermsAcceptanceModal({
  employeeId,
  firstName,
  lastName,
  companyName = 'LUCCCA',
  onAccept,
  onReject,
  showForTerms = ['NDA', 'NON_COMPETE'],
}: TermsAcceptanceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [accepted, setAccepted] = useState<Set<TermsType>>(new Set());
  const [loading, setLoading] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const currentTerms = showForTerms as TermsType[];
  const currentTerm = TERMS_LIBRARY[currentTerms[currentIndex]];
  const isLastTerm = currentIndex === currentTerms.length - 1;
  const allAccepted = accepted.size === currentTerms.length;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    setScrolledToBottom(isAtBottom);
  };

  const handleAcceptCurrent = () => {
    const newAccepted = new Set(accepted);
    newAccepted.add(currentTerm.type);
    setAccepted(newAccepted);

    if (!isLastTerm) {
      setCurrentIndex(currentIndex + 1);
      setScrolledToBottom(false);
    }
  };

  const handleRejectCurrent = () => {
    onReject();
  };

  const handleAcceptAll = async () => {
    setLoading(true);
    try {
      const termsToAccept = Array.from(accepted) as TermsType[];
      await onAccept(termsToAccept);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-1">
            {currentTerm.title}
          </h2>
          <p className="text-blue-100 text-sm">
            Part {currentIndex + 1} of {currentTerms.length} • Version {currentTerm.version}
          </p>
        </div>

        {/* Content */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6 bg-slate-800/50"
        >
          <div className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed font-mono bg-slate-900/50 p-4 rounded border border-slate-700">
            {currentTerm.content}
          </div>

          {/* Scroll Indicator */}
          {!scrolledToBottom && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200">
                Please scroll down to review the entire agreement
              </p>
            </div>
          )}

          {/* Summary for Accepted Terms */}
          {accepted.size > 0 && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded">
              <p className="text-sm font-semibold text-green-200 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Accepted Terms:
              </p>
              <ul className="space-y-1">
                {Array.from(accepted).map((term) => (
                  <li key={term} className="text-sm text-green-300">
                    ✓ {TERMS_LIBRARY[term].title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-900 px-6 py-4 space-y-4">
          {/* Confirmation Text */}
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">{firstName} {lastName}</span> - By clicking
            "Accept", you acknowledge that you have read, understood, and agree to comply with all
            terms outlined above.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleRejectCurrent}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors disabled:opacity-50"
            >
              Decline & Exit
            </button>

            {!isLastTerm ? (
              <button
                onClick={handleAcceptCurrent}
                disabled={!scrolledToBottom || loading}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded transition-colors',
                  scrolledToBottom
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                )}
              >
                Accept & Continue
              </button>
            ) : (
              <button
                onClick={handleAcceptAll}
                disabled={!scrolledToBottom || !allAccepted || loading}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded transition-colors',
                  scrolledToBottom && allAccepted
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                )}
              >
                {loading ? 'Processing...' : 'Accept All & Continue'}
              </button>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2">
            {currentTerms.map((term, idx) => (
              <div key={term} className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    accepted.has(term) ? 'bg-green-500' : idx === currentIndex ? 'bg-blue-500' : 'bg-slate-600'
                  )}
                  style={{
                    width: accepted.has(term) ? '100%' : idx === currentIndex ? '50%' : '0%',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage terms acceptance state
 */
export function useTermsAcceptance(employeeId: string) {
  const [showTerms, setShowTerms] = useState<boolean>(false);
  const [termsToShow, setTermsToShow] = useState<TermsType[]>(['NDA', 'NON_COMPETE']);
  const [acceptedTerms, setAcceptedTerms] = useState<TermsType[]>([]);

  const handleAccept = async (terms: TermsType[]) => {
    try {
      // Save to API
      for (const term of terms) {
        await fetch(`/api/terms/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: employeeId,
            terms_type: term,
            accepted_version: TERMS_LIBRARY[term].version,
          }),
        });
      }

      setAcceptedTerms(terms);
      setShowTerms(false);
    } catch (error) {
      console.error('Failed to accept terms:', error);
      // Show error toast
    }
  };

  const handleReject = () => {
    setShowTerms(false);
    // Optionally: sign out user, show message, etc
  };

  return {
    showTerms,
    termsToShow,
    acceptedTerms,
    openTerms: (terms: TermsType[] = ['NDA', 'NON_COMPETE']) => {
      setTermsToShow(terms);
      setShowTerms(true);
    },
    closeTerms: () => setShowTerms(false),
    handleAccept,
    handleReject,
  };
}

/**
 * Standalone component for displaying a single term
 */
export function TermsDisplay({ termType }: { termType: TermsType }) {
  const term = TERMS_LIBRARY[termType];

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{term.title}</h3>
      <div className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed font-mono">
        {term.content}
      </div>
    </div>
  );
}
