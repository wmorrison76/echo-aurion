import React from "react";

interface CertificateCardProps {
  userName: string;
  programName: string;
  completion: number;
  issuedAt?: string;
}

const CertificateCard: React.FC<CertificateCardProps> = ({
  userName,
  programName,
  completion,
  issuedAt,
}) => {
  const pct = Math.round(completion * 100);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-foreground shadow-xl">
      <div className="text-xs text-muted-foreground">LUCCCA • Echo Academy</div>
      <h2 className="text-xl font-semibold text-primary mt-1">
        Certificate of Mastery
      </h2>

      <p className="text-sm mt-3">
        This certifies that <span className="font-semibold">{userName}</span>{" "}
        has completed the training program:
      </p>

      <p className="text-sm font-semibold text-primary mt-1">{programName}</p>

      <div className="mt-3 text-xs text-muted-foreground">
        Completion: {pct}% {pct >= 80 ? "✅" : "⏳"}
      </div>

      {issuedAt && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          Issued: {new Date(issuedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default CertificateCard;
