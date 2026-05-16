import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";

interface ClientInfo {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  businessName?: string;
}

interface ConsentFormProps {
  clientInfo: ClientInfo;
  formType?: "adult_content" | "general_terms";
  onSubmit?: (consentGiven: boolean, clientInfo: ClientInfo) => Promise<void>;
}

export default function ConsentForm({
  clientInfo,
  formType = "general_terms",
  onSubmit,
}: ConsentFormProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const generatePDF = async () => {
    if (!contentRef.current) return;

    try {
      // Use html2pdf library (needs to be installed)
      const html2pdf = (await import("html2pdf.js")).default;

      const element = contentRef.current;
      const opt = {
        margin: 10,
        filename: `consent-form-${clientInfo.name}-${Date.now()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      };

      html2pdf().set(opt).from(element).save();
    } catch (error) {
      alert("Failed to generate PDF. Please try printing to PDF instead.");
      window.print();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(true, clientInfo);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isAdultForm = formType === "adult_content";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={generatePDF}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Printer className="w-4 h-4" />
          Print
        </Button>
        {onSubmit && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="sm"
            className="ml-auto"
          >
            {isSubmitting ? "Signing..." : "Sign & Submit"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="bg-gray-100">
          <CardTitle className="text-lg">
            {isAdultForm
              ? "Adult Content Consent Form"
              : "General Terms & Conditions"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div
            ref={contentRef}
            className="prose prose-sm max-w-none space-y-4 text-sm"
          >
            {/* Header with Client Info */}
            <div className="border-b pb-4">
              <p className="font-semibold">Consent Form - Client Information</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div>
                  <span className="font-semibold">Name:</span> {clientInfo.name}
                </div>
                <div>
                  <span className="font-semibold">Email:</span>{" "}
                  {clientInfo.email}
                </div>
                {clientInfo.phone && (
                  <div>
                    <span className="font-semibold">Phone:</span>{" "}
                    {clientInfo.phone}
                  </div>
                )}
                {clientInfo.businessName && (
                  <div>
                    <span className="font-semibold">Business:</span>{" "}
                    {clientInfo.businessName}
                  </div>
                )}
                {clientInfo.address && (
                  <div className="col-span-2">
                    <span className="font-semibold">Address:</span>{" "}
                    {clientInfo.address}
                    {clientInfo.city && `, ${clientInfo.city}`}
                    {clientInfo.state && `, ${clientInfo.state}`}
                    {clientInfo.zip && ` ${clientInfo.zip}`}
                  </div>
                )}
              </div>
            </div>

            {isAdultForm ? (
              <>
                <div>
                  <p className="font-semibold mb-2">
                    1. PURPOSE & ACKNOWLEDGMENT
                  </p>
                  <p>
                    This consent form ("Form") is entered into by and between
                    the Cake Design Studio ("Studio") and the Client named
                    above. The Client wishes to request the generation of images
                    containing adult or mature themes ("Adult Content").
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">
                    2. CLIENT ACKNOWLEDGMENTS
                  </p>
                  <p className="mb-2">
                    The Client acknowledges and confirms that:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      The Client is of legal age (18 years or older) in their
                      jurisdiction
                    </li>
                    <li>
                      The Client understands that Adult Content may contain
                      mature themes, language, or imagery
                    </li>
                    <li>
                      The Client has read and understands the content guidelines
                      and restrictions
                    </li>
                    <li>
                      The Client is requesting Adult Content for lawful purposes
                      only
                    </li>
                    <li>
                      The Client will not use Adult Content for illegal,
                      harmful, or unethical purposes
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">3. COMPLIANCE LOGGING</p>
                  <p>
                    The Client understands and agrees that all requests for
                    Adult Content, including the prompt text, timestamp, and
                    client information, will be logged in the Studio's secure
                    compliance database. This logging is for:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Audit and compliance purposes</li>
                    <li>Legal protection for both parties</li>
                    <li>Quality assurance and improvement</li>
                    <li>Prevention of misuse</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">
                    4. DATA PRIVACY & SECURITY
                  </p>
                  <p>
                    All Adult Content images and associated metadata will be
                    stored with encryption and access restrictions. Client data
                    will not be shared with third parties without explicit
                    consent, except as required by law.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">
                    5. RESTRICTIONS & LIMITATIONS
                  </p>
                  <p className="mb-2">
                    The Studio reserves the right to refuse requests for:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Content involving violence or harm</li>
                    <li>Illegal activities or content</li>
                    <li>Non-consensual imagery</li>
                    <li>Content involving minors in any form</li>
                    <li>
                      Other content deemed inappropriate at Studio's discretion
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">6. LIABILITY DISCLAIMER</p>
                  <p>
                    The Client assumes full responsibility for their use of
                    Adult Content. The Studio is not liable for any consequences
                    resulting from the Client's use or misuse of Adult Content,
                    including but not limited to: legal issues, damage to
                    reputation, or other harm.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">7. CONSENT & AGREEMENT</p>
                  <p>
                    By signing this form, the Client confirms that they have
                    read, understood, and agree to all terms outlined herein.
                    The Client consents to the logging, storage, and processing
                    of their request and associated data as described.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="font-semibold mb-2">1. SERVICE AGREEMENT</p>
                  <p>
                    The Studio agrees to provide cake design and customization
                    services to the Client in accordance with this agreement and
                    the Client's specific requests.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">2. PAYMENT & DEPOSITS</p>
                  <p>
                    The Client agrees to pay the quoted price for services. A
                    deposit may be required to confirm the order. All prices are
                    in USD unless otherwise specified.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">3. DESIGN PROCESS</p>
                  <p>
                    The Client will participate in the intake form and design
                    review process. Changes requested after approval may incur
                    additional fees.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">4. INTELLECTUAL PROPERTY</p>
                  <p>
                    Client-provided designs and specifications are owned by the
                    Client. All created design files and images are provided as
                    work-for-hire unless otherwise specified.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">
                    5. LIMITATION OF LIABILITY
                  </p>
                  <p>
                    The Studio is not liable for issues beyond its control,
                    including shipping damage, venue restrictions, or client
                    satisfaction beyond agreed specifications.
                  </p>
                </div>
              </>
            )}

            {/* Signature Section */}
            <div className="border-t pt-4 mt-6">
              <p className="font-semibold mb-4">CLIENT SIGNATURE & CONSENT</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold">
                    I have read and understood all terms in this agreement:
                  </p>
                </div>

                <div className="border-t-2 border-gray-400 w-48 h-8" />
                <p className="text-xs">Client Signature</p>

                <p className="text-xs text-gray-600">
                  Date: {new Date().toLocaleDateString()}
                </p>

                <div className="border-t border-gray-300 pt-3 mt-3">
                  <p className="text-xs text-gray-600">
                    Document generated on {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        💾 This form can be printed and signed by hand, or signed electronically
        before submission.
      </div>
    </div>
  );
}
