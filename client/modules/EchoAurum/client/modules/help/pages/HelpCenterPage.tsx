import React, { useState } from "react";
import {
  BookOpen,
  Zap,
  Video,
  FileText,
  HelpCircle,
  CheckCircle2,
  Users,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/PageLayout";
import { HelpModal } from "../components/HelpModal";
import { OnboardingTutorial } from "../components/OnboardingTutorial";
import { useHelp } from "../hooks/useHelp";
import type { HelpCategory } from "@/shared/help";
const FEATURED_GUIDES = [
  {
    id: "getting-started-welcome",
    title: "Welcome to EchoAurum",
    description:
      "Get oriented with the platform and understand its core features",
    category: "getting-started",
    icon: "🎯",
    readTime: 5,
  },
  {
    id: "gl-journal-entries",
    title: "Posting Journal Entries",
    description:
      "Learn double-entry bookkeeping and post your first transaction",
    category: "gl-operations",
    icon: "📝",
    readTime: 12,
  },
  {
    id: "guardian-ai-overview",
    title: "Understanding Guardian AI",
    description:
      "Your AI-powered financial oversight system that prevents fraud",
    category: "guardian-ai",
    icon: "🤖",
    readTime: 15,
  },
  {
    id: "ap-invoice-workflow",
    title: "Invoice Processing Workflow",
    description:
      "Manage invoices from receipt to payment with intelligent matching",
    category: "ap-management",
    icon: "💳",
    readTime: 12,
  },
  {
    id: "reporting-financial-statements",
    title: "Generating Financial Reports",
    description:
      "Create trial balance, income statement, and balance sheet reports",
    category: "reporting",
    icon: "📊",
    readTime: 15,
  },
  {
    id: "pnl-setup-outlets",
    title: "Setting Up Your Outlets",
    description: "Create and configure outlets (hotels, restaurants, spas)",
    category: "pnl-management",
    icon: "🏨",
    readTime: 8,
  },
];
const LEARNING_PATHS = [
  {
    title: "New to EchoAurum",
    description: "Complete onboarding for new users",
    steps: [
      "Welcome & Platform Overview",
      "Setting Up Your Outlets",
      "Post Your First Journal Entry",
      "Process Your First Invoice",
      "Your First Month-End Close",
    ],
    estimatedTime: 8,
    icon: "🚀",
    color: "from-emerald-500 to-teal-500",
  },
  {
    title: "Guardian AI Mastery",
    description:
      "Learn how to use Guardian AI for fraud prevention and compliance",
    steps: [
      "Guardian AI Overview",
      "Argus: Data Compliance",
      "Zelda: Duplicate Detection",
      "Phoenix: Fraud Detection",
      "Odin: Audit Trail",
    ],
    estimatedTime: 4,
    icon: "🤖",
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Advanced GL Operations",
    description: "Master journal entries, reconciliation, and reporting",
    steps: [
      "Double-Entry Bookkeeping",
      "Account Classification",
      "Cost Center Allocation",
      "Month-End Close Process",
      "Financial Statement Analysis",
    ],
    estimatedTime: 6,
    icon: "📚",
    color: "from-blue-500 to-cyan-500",
  },
];
export default function HelpCenterPage() {
  const help = useHelp();
  const [selectedLearningPath, setSelectedLearningPath] = useState<
    number | null
  >(null);
  return (
    <PageLayout>
      {" "}
      <div className="space-y-12 py-12">
        {" "}
        {/* Hero Section */}{" "}
        <section className="text-center space-y-6">
          {" "}
          <div className="inline-block">
            {" "}
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-aurum-500/20 border border-aurum-500/40 mx-auto mb-4">
              {" "}
              <BookOpen className="h-8 w-8 text-aurum-300" />{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <h1 className="text-4xl font-bold text-foreground">
              {" "}
              Help & Learning Center{" "}
            </h1>{" "}
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
              {" "}
              Master EchoAurum with comprehensive guides, interactive tutorials,
              and expert tips{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex items-center justify-center gap-3 pt-4">
            {" "}
            <Button
              onClick={() => help.openOnboarding()}
              size="lg"
              className="gap-2 bg-aurum-600 hover:bg-aurum-700"
            >
              {" "}
              <Zap className="h-5 w-5" /> Start Training{" "}
            </Button>{" "}
            <Button
              onClick={() => help.openHelp("getting-started")}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              {" "}
              <HelpCircle className="h-5 w-5" /> Browse Help{" "}
            </Button>{" "}
          </div>{" "}
        </section>{" "}
        {/* Quick Stats */}{" "}
        <section className="grid grid-cols-4 gap-4">
          {" "}
          {[
            { icon: FileText, label: "Articles", value: "50+" },
            { icon: Video, label: "Video Guides", value: "25+" },
            { icon: HelpCircle, label: "FAQs", value: "100+" },
            { icon: Users, label: "Community", value: "Active" },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/40 bg-surface/60 p-6 text-center hover:border-border/60 transition-colors"
            >
              {" "}
              <stat.icon className="h-8 w-8 text-aurum-300 mx-auto mb-3" />{" "}
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>{" "}
              <p className="text-sm text-muted-foreground mt-2">
                {stat.label}
              </p>{" "}
            </div>
          ))}{" "}
        </section>{" "}
        {/* Featured Guides */}{" "}
        <section>
          {" "}
          <div className="mb-8">
            {" "}
            <h2 className="text-2xl font-bold text-foreground">
              {" "}
              Featured Guides{" "}
            </h2>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Start with these most-popular articles{" "}
            </p>{" "}
          </div>{" "}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {" "}
            {FEATURED_GUIDES.map((guide) => (
              <button
                key={guide.id}
                onClick={() => help.openHelpArticle(guide.id)}
                className="group rounded-xl border border-border/40 bg-surface/60 p-6 hover:border-aurum-500/40 hover:bg-surface-variant/40 transition-all text-left"
              >
                {" "}
                <div className="text-4xl mb-4">{guide.icon}</div>{" "}
                <h3 className="font-semibold text-foreground group-hover:text-aurum-300 transition-colors">
                  {" "}
                  {guide.title}{" "}
                </h3>{" "}
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {" "}
                  {guide.description}{" "}
                </p>{" "}
                <div className="mt-4 flex items-center justify-between">
                  {" "}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {" "}
                    ⏱️ {guide.readTime} min read{" "}
                  </span>{" "}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-aurum-300">
                    {" "}
                    →{" "}
                  </span>{" "}
                </div>{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        {/* Learning Paths */}{" "}
        <section>
          {" "}
          <div className="mb-8">
            {" "}
            <h2 className="text-2xl font-bold text-foreground">
              {" "}
              Learning Paths{" "}
            </h2>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Structured training programs for different roles{" "}
            </p>{" "}
          </div>{" "}
          <div className="grid md:grid-cols-3 gap-6">
            {" "}
            {LEARNING_PATHS.map((path, index) => (
              <div
                key={index}
                className={`rounded-xl border border-border/40 bg-gradient-to-br ${path.color} p-0.5 overflow-hidden group hover:border-border/80 transition-colors`}
              >
                {" "}
                <div className="rounded-[11px] bg-surface p-6 h-full flex flex-col">
                  {" "}
                  <div className="text-5xl mb-4">{path.icon}</div>{" "}
                  <h3 className="text-xl font-bold text-foreground">
                    {" "}
                    {path.title}{" "}
                  </h3>{" "}
                  <p className="mt-2 text-sm text-muted-foreground flex-1">
                    {" "}
                    {path.description}{" "}
                  </p>{" "}
                  <div className="mt-6 space-y-2 mb-6">
                    {" "}
                    {path.steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        {" "}
                        <span className="text-aurum-300 font-bold mt-0.5">
                          {" "}
                          ✓{" "}
                        </span>{" "}
                        <span>{step}</span>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between pt-4 border-t border-border/40">
                    {" "}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      {path.estimatedTime} hours{" "}
                    </span>{" "}
                    <Button
                      onClick={() => setSelectedLearningPath(index)}
                      size="sm"
                      className="bg-aurum-600 hover:bg-aurum-700"
                    >
                      {" "}
                      Start Path{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        {/* Quick Tips */}{" "}
        <section>
          {" "}
          <div className="mb-8">
            {" "}
            <h2 className="text-2xl font-bold text-foreground">
              Pro Tips
            </h2>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Quick wins to be more efficient{" "}
            </p>{" "}
          </div>{" "}
          <div className="grid md:grid-cols-2 gap-4">
            {" "}
            {[
              {
                title: "Use Keyboard Shortcuts",
                tip: "Press ⌘K (Mac) or Ctrl+K (Windows) to quickly search and navigate features",
                icon: "⌨️",
              },
              {
                title: "Trust Guardian AI",
                tip: "When Guardian flags something, investigate. It catches errors and fraud most humans miss.",
                icon: "🤖",
              },
              {
                title: "Cost Centers Matter",
                tip: "Always assign to the correct cost center. It affects reporting and accountability.",
                icon: "🎯",
              },
              {
                title: "Document Everything",
                tip: "Add clear descriptions and references to journal entries. Future you will thank present you.",
                icon: "📝",
              },
              {
                title: "Review Monthly",
                tip: "Close each month properly. Don't let variance items pile up. Deal with them immediately.",
                icon: "📅",
              },
              {
                title: "Ask Questions",
                tip: "Your controller is your friend. Better to ask than guess. Wrong accounts = wrong reporting.",
                icon: "❓",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/40 bg-surface/60 p-6"
              >
                {" "}
                <div className="flex items-start gap-4">
                  {" "}
                  <div className="text-4xl flex-shrink-0">{item.icon}</div>{" "}
                  <div>
                    {" "}
                    <p className="font-semibold text-foreground">
                      {" "}
                      {item.title}{" "}
                    </p>{" "}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {" "}
                      {item.tip}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        {/* FAQ Section */}{" "}
        <section>
          {" "}
          <div className="mb-8">
            {" "}
            <h2 className="text-2xl font-bold text-foreground">
              {" "}
              Common Questions{" "}
            </h2>{" "}
            <p className="mt-2 text-muted-foreground">
              {" "}
              Browse frequently asked questions{" "}
            </p>{" "}
          </div>{" "}
          <div className="space-y-3 max-w-3xl">
            {" "}
            {[
              {
                q: "What's the difference between Budget, Forecast, and Actual?",
                a: "Budget is planned at year start. Forecast is updated monthly. Actual is what really happened.",
              },
              {
                q: "Why does Guardian block my entries?",
                a: "Guardian enforces compliance. Read the error message—it tells you exactly what's wrong.",
              },
              {
                q: "Can I post to prior months?",
                a: "Usually yes, within 30 days. After that, ask your controller to reopen the period.",
              },
              {
                q: "What if I make a mistake?",
                a: "Post a reversing entry (opposite amounts), then post the correct entry. Guardian logs everything.",
              },
              {
                q: "How do I know which GL account to use?",
                a: "Ask your manager or controller. Don't guess. Wrong account = wrong reporting.",
              },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => help.openHelp("troubleshooting")}
                className="w-full text-left p-4 rounded-lg border border-border/40 bg-surface/60 hover:bg-surface-variant/40 hover:border-border/60 transition-colors"
              >
                {" "}
                <p className="font-medium text-foreground">{item.q}</p>{" "}
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.a}
                </p>{" "}
              </button>
            ))}{" "}
          </div>{" "}
          <div className="mt-6 text-center">
            {" "}
            <Button
              onClick={() => help.openHelp("getting-started")}
              variant="outline"
            >
              {" "}
              View All FAQs{" "}
            </Button>{" "}
          </div>{" "}
        </section>{" "}
        {/* Getting Started */}{" "}
        <section className="rounded-2xl border border-border/40 bg-gradient-to-r from-aurum-500/10 to-purple-500/10 p-8 text-center">
          {" "}
          <Award className="h-12 w-12 text-aurum-300 mx-auto mb-4" />{" "}
          <h2 className="text-2xl font-bold text-foreground">
            {" "}
            Ready to Get Started?{" "}
          </h2>{" "}
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            {" "}
            Begin with our comprehensive onboarding training. You'll be
            comfortable posting entries, processing invoices, and understanding
            Guardian AI within a week.{" "}
          </p>{" "}
          <Button
            onClick={() => help.openOnboarding()}
            size="lg"
            className="mt-6 gap-2 bg-aurum-600 hover:bg-aurum-700"
          >
            {" "}
            <CheckCircle2 className="h-5 w-5" /> Start Onboarding Training{" "}
          </Button>{" "}
        </section>{" "}
        {/* Support Section */}{" "}
        <section className="rounded-2xl border border-border/40 bg-surface/60 p-8">
          {" "}
          <h2 className="text-xl font-bold text-foreground mb-6">
            {" "}
            Need Extra Help?{" "}
          </h2>{" "}
          <div className="grid md:grid-cols-3 gap-6">
            {" "}
            <div className="space-y-3">
              {" "}
              <p className="font-semibold text-foreground">
                📚 Knowledge Base
              </p>{" "}
              <p className="text-sm text-muted-foreground">
                {" "}
                Browse articles, FAQs, and glossary. Click the Help button
                anytime.{" "}
              </p>{" "}
            </div>{" "}
            <div className="space-y-3">
              {" "}
              <p className="font-semibold text-foreground">👥 Your Team</p>{" "}
              <p className="text-sm text-muted-foreground">
                {" "}
                Ask your manager or controller. They're your best resource for
                day-to-day questions.{" "}
              </p>{" "}
            </div>{" "}
            <div className="space-y-3">
              {" "}
              <p className="font-semibold text-foreground">🆘 Support</p>{" "}
              <p className="text-sm text-muted-foreground">
                {" "}
                Contact your administrator if you encounter technical issues or
                need access.{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </section>{" "}
      </div>{" "}
      {/* Modals */}{" "}
      <HelpModal
        isOpen={help.helpOpen}
        onClose={help.closeHelp}
        initialCategory={help.helpCategory}
        initialArticleId={help.helpArticleId}
      />{" "}
      <OnboardingTutorial
        isOpen={help.onboardingOpen}
        onClose={help.closeOnboarding}
        moduleId={help.onboardingModuleId}
      />{" "}
    </PageLayout>
  );
}
