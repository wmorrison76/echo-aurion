import { ReactNode, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HELP_ARTICLES, FAQS, type HelpCategory } from "@/shared/help";
import { cn } from "@/lib/utils";
interface ContextualHelpProps {
  title: string;
  description: string;
  tips?: string[];
  relatedArticleId?: string;
  category?: HelpCategory;
  children?: ReactNode;
  className?: string;
}
export function ContextualHelpBox({
  title,
  description,
  tips,
  relatedArticleId,
  className,
}: ContextualHelpProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg bg-sky-500/10 border border-sky-500/30",
        className,
      )}
    >
      {" "}
      <div className="flex items-start gap-3">
        {" "}
        <HelpCircle className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />{" "}
        <div className="flex-1">
          {" "}
          <p className="font-semibold text-sky-300 text-sm">{title}</p>{" "}
          <p className="text-sm text-sky-200/80 mt-1">{description}</p>{" "}
          {tips && tips.length > 0 && (
            <ul className="mt-3 space-y-1">
              {" "}
              {tips.map((tip, i) => (
                <li
                  key={i}
                  className="text-xs text-sky-200/70 flex items-start gap-2"
                >
                  {" "}
                  <span className="mt-1.5 block h-1 w-1 rounded-full bg-sky-400/60" />{" "}
                  <span>{tip}</span>{" "}
                </li>
              ))}{" "}
            </ul>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
interface HelpTriggerButtonProps {
  tooltipContent: string;
  onHelpClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}
export function HelpTriggerButton({
  tooltipContent,
  onHelpClick,
  className,
  size = "md",
}: HelpTriggerButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const sizeClasses = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };
  return (
    <div className="relative inline-block">
      {" "}
      <Button
        variant="ghost"
        size="icon"
        onClick={onHelpClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "h-auto p-1 text-muted-foreground hover:text-aurum-300",
          className,
        )}
      >
        {" "}
        <HelpCircle
          className={cn(sizeClasses[size], "opacity-60 hover:opacity-100")}
        />{" "}
      </Button>{" "}
      {showTooltip && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 w-48 p-3 rounded-lg bg-surface-variant border border-border/40 shadow-lg text-xs text-muted-foreground">
          {" "}
          <p>{tooltipContent}</p>{" "}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-surface-variant border-t-4 border-t-transparent border-b-4 border-b-transparent" />{" "}
        </div>
      )}{" "}
    </div>
  );
}
interface HelpIconProps {
  articleId: string;
  onOpenHelp?: () => void;
  className?: string;
  compact?: boolean;
}
export function HelpIcon({
  articleId,
  onOpenHelp,
  className,
  compact = false,
}: HelpIconProps) {
  const article = HELP_ARTICLES.find((a) => a.id === articleId);
  if (!article) return null;
  return (
    <HelpTriggerButton
      tooltipContent={article.description}
      onHelpClick={onOpenHelp}
      className={className}
      size={compact ? "sm" : "md"}
    />
  );
}
interface QuickAnswerProps {
  question: string;
  className?: string;
}
export function QuickAnswer({ question, className }: QuickAnswerProps) {
  const faq = FAQS.find((f) =>
    f.question.toLowerCase().includes(question.toLowerCase()),
  );
  if (!faq) return null;
  return (
    <div
      className={cn(
        "p-3 rounded-lg bg-surface-variant/40 border border-border/40",
        className,
      )}
    >
      {" "}
      <p className="text-xs font-semibold text-aurum-300 mb-2">
        {" "}
        💡 Quick Answer{" "}
      </p>{" "}
      <p className="text-sm text-muted-foreground">{faq.answer}</p>{" "}
    </div>
  );
}
interface HelpHeaderProps {
  title: string;
  description: string;
  articleId?: string;
  onOpenHelp?: () => void;
}
export function HelpHeader({
  title,
  description,
  articleId,
  onOpenHelp,
}: HelpHeaderProps) {
  return (
    <div className="mb-6">
      {" "}
      <div className="flex items-start justify-between gap-4 mb-2">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {description}
          </p>{" "}
        </div>{" "}
        {articleId && (
          <HelpIcon
            articleId={articleId}
            onOpenHelp={onOpenHelp}
            className="mt-1"
          />
        )}{" "}
      </div>{" "}
    </div>
  );
}
interface StepGuideProps {
  steps: Array<{ title: string; description: string; tips?: string[] }>;
  className?: string;
}
export function StepGuide({ steps, className }: StepGuideProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {" "}
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4">
          {" "}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-aurum-500/20 border border-aurum-500/40 text-aurum-300 font-semibold text-sm">
            {" "}
            {index + 1}{" "}
          </div>{" "}
          <div className="flex-1">
            {" "}
            <p className="font-semibold text-foreground text-sm">
              {" "}
              {step.title}{" "}
            </p>{" "}
            <p className="mt-1 text-sm text-muted-foreground">
              {" "}
              {step.description}{" "}
            </p>{" "}
            {step.tips && step.tips.length > 0 && (
              <ul className="mt-2 space-y-1">
                {" "}
                {step.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground flex items-start gap-2 ml-2"
                  >
                    {" "}
                    <span className="text-aurum-300 font-bold">→</span>{" "}
                    <span>{tip}</span>{" "}
                  </li>
                ))}{" "}
              </ul>
            )}{" "}
          </div>{" "}
        </div>
      ))}{" "}
    </div>
  );
}
