"use client";

import { motion } from "framer-motion";
import { Button, PulsatingButton, BorderBeamButton } from "./components/ui/button";
import {
  TrendingUp,
  Zap,
  Target,
  Users,
  ArrowRight,
  BarChart3,
  Shield,
  Clock,
  Check,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "./lib/utils";

// ============================================================================
// HERO SECTION - Main landing area with CTA
// ============================================================================
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              <span>Real-time AI Trend Analysis</span>
            </div>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Your Dollar Just
            </span>
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-orange-400 bg-clip-text text-transparent animate-gradient">
              Died At 2 PM
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-400 max-w-3xl mb-10"
          >
            While you were reading this, AI was scanning{""}
            <span className="text-slate-300 font-semibold">Google Trends</span>,{""}
            <span className="text-slate-300 font-semibold">Twitter/X</span>, and{""}
            <span className="text-slate-300 font-semibold">Reddit</span>{" "}
            for news that affects your portfolio.
            <span className="text-orange-400"> Most investors miss it.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-12"
          >
            <PulsatingButton variant="default" size="xl">
              Get Early Access
              <ArrowRight className="w-5 h-5 ml-2" />
            </PulsatingButton>
            <Button variant="outline" size="xl">
              Watch Demo
            </Button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center gap-8 text-slate-500 text-sm"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>10,000+ early adopters</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>500+ topics analyzed daily</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// LIVE FEED SECTION - Real-time trending topics dashboard
// ============================================================================
interface TrendingTopic {
  id: string;
  headline: string;
  source: string;
  score: number;
  timestamp: string;
  category: string;
}

const MOCK_TOPICS: TrendingTopic[] = [
  {
    id: "1",
    headline: "Fed hints at emergency rate decision following inflation data surge",
    source: "Google Trends",
    score: 9.2,
    timestamp: "2 min ago",
    category: "Finance",
  },
  {
    id: "2",
    headline: "Major semiconductor shortage announced as supply chain disruptions escalate",
    source: "Twitter/X",
    score: 8.7,
    timestamp: "5 min ago",
    category: "Tech",
  },
  {
    id: "3",
    headline: "Crypto regulation framework leaked: What it means for your portfolio",
    source: "Reddit",
    score: 8.4,
    timestamp: "8 min ago",
    category: "Crypto",
  },
  {
    id: "4",
    headline: "AI breakthrough: New model achieves human-level reasoning",
    source: "NewsAPI",
    score: 8.1,
    timestamp: "12 min ago",
    category: "AI",
  },
];

function LiveFeedSection() {
  const [topics] = useState<TrendingTopic[]>(MOCK_TOPICS);

  return (
    <section className="bg-slate-950 border-y border-slate-800">
      <div className="container mx-auto px-6 py-16">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4"
        >
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Live Trending Feed
            </h2>
            <p className="text-slate-400">
              Real-time analysis from multiple sources
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span>Live</span>
          </div>
        </motion.div>

        {/* Topics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic, index) => (
            <TopicCard key={topic.id} topic={topic} index={index} />
          ))}
        </div>

        {/* View all CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-10"
        >
          <Button variant="ghost">
            View All Topics
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function TopicCard({ topic, index }: { topic: TrendingTopic; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10"
    >
      {/* Score badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
          <TrendingUp className="w-3 h-3" />
          {topic.score}
        </div>
      </div>

      {/* Category */}
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400">
          {topic.category}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {topic.timestamp}
        </span>
      </div>

      {/* Headline */}
      <h3 className="text-slate-200 font-semibold mb-3 line-clamp-2 group-hover:text-orange-400 transition-colors">
        {topic.headline}
      </h3>

      {/* Source */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Shield className="w-4 h-4" />
        <span>via {topic.source}</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// FEATURES SECTION
// ============================================================================
const FEATURES = [
  {
    icon: Zap,
    title: "Real-time Detection",
    description: "5-minute polling across all major platforms ensures you never miss a breaking story.",
  },
  {
    icon: Target,
    title: "Impact Scoring",
    description: "AI-powered analysis filters noise from signals, highlighting only what affects your portfolio.",
  },
  {
    icon: Users,
    title: "Community Insights",
    description: "See what other sophisticated investors are discussing before it hits mainstream media.",
  },
  {
    icon: Shield,
    title: "Verified Sources",
    description: "Cross-referenced from Google Trends, Twitter/X, Reddit, NewsAPI, and RSS feeds.",
  },
];

function FeaturesSection() {
  return (
    <section className="bg-slate-950 py-20">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Why 10,000+ investors rely on us
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            While traditional news sites bombard you with noise, our AI cuts through
            to surface only the stories that impact your financial future.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING SECTION
// ============================================================================
function PricingSection() {
  return (
    <section className="bg-slate-950 border-t border-slate-800 py-20">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            No hidden fees. Cancel anytime.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free tier */}
          <PricingCard
            name="Starter"
            price="$0"
            description="For curious investors"
            features={[
              "3 trending topics per day",
              "Basic impact scoring",
              "Email notifications",
              "Community access",
            ]}
            buttonText="Start Free"
            popular={false}
          />

          {/* Pro tier */}
          <PricingCard
            name="Pro"
            price="$29"
            description="For serious investors"
            features={[
              "Unlimited topics",
              "Advanced AI analysis",
              "Real-time alerts (5-min)",
              "Priority support",
              "API access",
              "Portfolio integration",
            ]}
            buttonText="Get Pro"
            popular={true}
          />

          {/* Enterprise tier */}
          <PricingCard
            name="Institutional"
            price="Custom"
            description="For funds & teams"
            features={[
              "Everything in Pro",
              "Team collaboration",
              "Custom integrations",
              "Dedicated support",
              "SLA guarantee",
              "White-label options",
            ]}
            buttonText="Contact Sales"
            popular={false}
          />
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  buttonText,
  popular,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  popular?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative p-8 rounded-2xl border",
        popular
          ? "bg-slate-900 border-orange-500 shadow-xl shadow-orange-500/10"
          : "bg-slate-900/50 border-slate-800"
      )}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-medium">
          Most Popular
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-white">${price}</span>
          {price !== "Custom" && <span className="text-slate-400">/month</span>}
        </div>
        <p className="text-slate-400 text-sm mt-2">{description}</p>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-slate-300">
            <Check className="w-4 h-4 text-green-400" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        variant={popular ? "default" : "outline"}
        className="w-full"
        size="lg"
      >
        {buttonText}
      </Button>
    </motion.div>
  );
}

// ============================================================================
// NAVIGATION
// ============================================================================
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">
              Quantum<span className="text-orange-400">Anchor</span>
            </span>
          </motion.div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#live-feed" className="text-slate-400 hover:text-white transition-colors">
              Live Feed
            </a>
            <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">
              Pricing
            </a>
            <BorderBeamButton>Get Early Access</BorderBeamButton>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-full left-0 right-0 bg-slate-950 border-b border-slate-800 p-4"
        >
          <div className="flex flex-col gap-4">
            <a href="#features" className="text-slate-400 hover:text-white">
              Features
            </a>
            <a href="#live-feed" className="text-slate-400 hover:text-white">
              Live Feed
            </a>
            <a href="#pricing" className="text-slate-400 hover:text-white">
              Pricing
            </a>
            <Button className="w-full">Get Early Access</Button>
          </div>
        </motion.div>
      )}
    </nav>
  );
}

// ============================================================================
// FOOTER
// ============================================================================
function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">
              Quantum<span className="text-orange-400">Anchor</span>
            </span>
          </div>

          {/* Copyright */}
          <p className="text-slate-500 text-sm">
            © 2026 QuantumAnchor. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation />
      <main>
        <HeroSection />
        <LiveFeedSection />
        <FeaturesSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
