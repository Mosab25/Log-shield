import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bug,
  FileText,
  Fingerprint,
  Globe,
  Lock,
  Search,
  Shield,
  Target,
  Wrench,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

// Content object with Arabic and English translations
const homeContent = {
  ar: {
    hero: {
      title: "مرحباً بك في LogShield",
      subtitle: "منصة تعليمية وعملية لفرق العمليات الأمنية (SOC) تساعدك على تعلم التحقيق في الأحداث الأمنية، وتحليل التنبيهات، والتصنيف الأولي للأنشطة المشبوهة داخل بيئة محاكاة واقعية.",
    },
    features: [
      {
        icon: AlertTriangle,
        title: "تحليل التنبيهات",
        description: "راجع التنبيهات الأمنية، قم بتصنيفها، تتبع حالتها، واربطها بالحوادث.",
      },
      {
        icon: Shield,
        title: "التحقيق في الحوادث",
        description: "أنشئ حوادث، اربط تنبيهات متعددة، أضف أدلة وملاحظات، واتبع جدول تحقيق موحد.",
      },
      {
        icon: BarChart3,
        title: "تحليل البيانات التجريبية",
        description: "تدرب على التحقيق والتحليل باستخدام بيانات تجريبية آمنة وسيناريوهات محاكاة واقعية.",
      },
      {
        icon: TrendingUp,
        title: "مراقبة الأنشطة المشبوهة",
        description: "استكشف محاولات تسجيل الدخول الفاشلة، السلوك غير الطبيعي، وأنماط تشبه الهجمات عبر لوحة المعلومات.",
      },
      {
        icon: Search,
        title: "معلومات التهديدات",
        description: "ابحث عن الثغرات والمعلومات الأمنية، ثم اربطها بسياق التحقيق.",
      },
      {
        icon: Wrench,
        title: "أدوات المحلل",
        description: "استخدم أدوات SOC مثل مستخرج IOC، Base64، مفكك JWT، وأدوات أخرى أثناء التحقيق.",
      },
    ],
    educational: {
      title: "بيئة تدريبية وتدريبية واقعية",
      description: "تم تصميم LogShield كمنصة تعليمية وعملية. تسمح للمستخدمين بالتدرب على تحليل الحوادث والتصنيف الأولي للتنبيهات داخل بيئة آمدة تعمل ببيانات تجريبية وسيناريوهات تحاكي عمليات SOC الواقعية.",
    },
    simulation: {
      title: "سيناريوهات هجوم محاكاة جاهزة للتحليل",
      description: "تشمل المنصة أنشطة مشبوهة محاكاة وأحداث تشبه الهجمات التي يمكن للمستخدمين تحليلها عبر لوحة المعلومات، والتنبيهات، والسجلات، والحوادث، ومعلومات التهديدات، وآليات التدقيق.",
    },
    modules: {
      title: "وحدات المنصة",
    },
    workflow: {
      title: "كيفية بدء التحقيق في LogShield",
      steps: [
        "راجع لوحة المعلومات",
        "افتح التنبيهات المشبوهة",
        "حلل السجلات ذات الصلة",
        "أنشئ حادث عند الحاجة",
        "أضف أدلة وملاحظات المحلل",
        "استخدم معلومات التهديدات وأدوات SOC",
        "وثق الإجراءات عبر التقارير وسجلات التدقيق",
      ],
    },
    cta: {
      title: "ابدأ رحلتك داخل المنصة",
      description: "يمكنك الآن فتح لوحة المعلومات، مراجعة التنبيهات، استكشاف الحوادث، واستخدام أدوات التحليل لفهم كيفية عمل سير عمل SOC في الممارسة.",
      buttons: {
        dashboard: "فتح لوحة المعلومات",
        alerts: "عرض التنبيهات",
        incidents: "فتح الحوادث",
        tools: "استكشاف أدوات SOC",
      },
    },
  },
  en: {
    hero: {
      title: "Welcome to LogShield",
      subtitle: "An educational and practical SOC platform that helps you learn security investigation, alert analysis, and suspicious activity triage inside a realistic simulation environment.",
    },
    features: [
      {
        icon: AlertTriangle,
        title: "Alert Analysis",
        description: "Review security alerts, classify them, track their status, and link them to incidents.",
      },
      {
        icon: Shield,
        title: "Incident Investigation",
        description: "Create incidents, connect multiple alerts, add evidence and notes, and follow a unified investigation timeline.",
      },
      {
        icon: BarChart3,
        title: "Demo Data Analysis",
        description: "Practice investigation and analysis using safe demo data and realistic simulated scenarios.",
      },
      {
        icon: TrendingUp,
        title: "Suspicious Activity Monitoring",
        description: "Explore failed login attempts, abnormal behavior, and attack-like patterns through the dashboard.",
      },
      {
        icon: Search,
        title: "Threat Intelligence",
        description: "Search for vulnerabilities and security intelligence, then connect them to the investigation context.",
      },
      {
        icon: Wrench,
        title: "Analyst Utilities",
        description: "Use SOC tools such as IOC Extractor, Base64, JWT Decoder, and other utilities during investigation.",
      },
    ],
    educational: {
      title: "Realistic Training and Simulation Environment",
      description: "LogShield is designed as both an educational and practical platform. It allows users to train on incident analysis and alert triage inside a safe environment powered by demo data and scenarios that simulate real-world SOC operations.",
    },
    simulation: {
      title: "Simulated Attack Scenarios Ready for Analysis",
      description: "The platform includes simulated suspicious activities and attack-like events that users can analyze through the dashboard, alerts, logs, incidents, threat intelligence, and audit trails.",
    },
    modules: {
      title: "Platform Modules",
    },
    workflow: {
      title: "How to Start an Investigation in LogShield",
      steps: [
        "Review the Dashboard",
        "Open suspicious Alerts",
        "Analyze related Logs",
        "Create an Incident when needed",
        "Add evidence and analyst notes",
        "Use Threat Intelligence and SOC Tools",
        "Document actions through Reports and Audit Logs",
      ],
    },
    cta: {
      title: "Start Your Journey Inside the Platform",
      description: "You can now open the dashboard, review alerts, explore incidents, and use the analysis tools to understand how a SOC workflow operates in practice.",
      buttons: {
        dashboard: "Open Dashboard",
        alerts: "View Alerts",
        incidents: "Open Incidents",
        tools: "Explore SOC Tools",
      },
    },
  },
};

// Language toggle component
function LanguageToggle({ currentLang, onLanguageChange }: { currentLang: 'ar' | 'en'; onLanguageChange: (lang: 'ar' | 'en') => void }) {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="relative inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 p-1 shadow-[0_0_26px_rgba(34,211,238,0.16)]">
        <button
          onClick={() => onLanguageChange('ar')}
          className={`relative z-10 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
            currentLang === 'ar'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          العربية
        </button>
        <button
          onClick={() => onLanguageChange('en')}
          className={`relative z-10 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
            currentLang === 'en'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          English
        </button>
      </div>
    </div>
  );
}

export function HomePage() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('logshield-language') as 'ar' | 'en' | null;
    if (savedLanguage && (savedLanguage === 'ar' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    }
    setIsLoaded(true);
  }, []);

  // Save language preference to localStorage when it changes
  const handleLanguageChange = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('logshield-language', lang);
  };

  // Get content based on current language
  const content = homeContent[language];
  const isRTL = language === 'ar';

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] text-slate-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className={`min-h-screen bg-[#020817] text-slate-100 relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Background effects - Fixed to cover full viewport */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.18),transparent_34rem),radial-gradient(circle_at_18%_78%,rgba(56,189,248,0.12),transparent_26rem),linear-gradient(135deg,#020817_0%,#061227_48%,#020817_100%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(125,211,252,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,.22)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="absolute left-1/2 top-0 h-px w-[84rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
        <div className="absolute -right-48 top-20 h-[34rem] w-[34rem] rounded-full border border-cyan-300/10" />
        <div className="absolute -right-32 top-36 h-[22rem] w-[22rem] rounded-full border border-sky-400/10" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Language Toggle */}
        <div className="animate-fade-in">
          <LanguageToggle currentLang={language} onLanguageChange={handleLanguageChange} />
        </div>

        {/* Hero Section */}
        <section className={`text-center ${isRTL ? 'lg:text-right' : 'lg:text-left'} animate-slide-up`}>
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              {content.hero.title}
            </h1>
            <p className={`mt-6 text-lg leading-8 text-slate-300 sm:text-xl ${isRTL ? 'lg:ml-auto' : 'lg:mr-auto'} animate-fade-in-delay`}>
              {content.hero.subtitle}
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mt-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {content.features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`soc-panel p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] ${isRTL ? 'text-right' : 'text-left'} ${index < 6 ? `animate-slide-up-delay-${index}` : ''}`}
                >
                  <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10">
                      <Icon className="h-6 w-6 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  </div>
                  <p className={`mt-4 text-slate-300 ${isRTL ? 'lg:mr-16' : 'lg:ml-16'}`}>
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Educational Section */}
        <section className="mt-20 animate-slide-up-delay-3">
          <div className="soc-panel p-8">
            <h2 className={`text-2xl font-bold text-white sm:text-3xl ${isRTL ? 'text-right' : 'text-left'}`}>
              {content.educational.title}
            </h2>
            <p className={`mt-4 text-lg leading-7 text-slate-300 ${isRTL ? 'text-right' : 'text-left'}`}>
              {content.educational.description}
            </p>
          </div>
        </section>

        {/* Simulation Section */}
        <section className="mt-16 animate-slide-up-delay-4">
          <div className="soc-panel p-8">
            <h2 className={`text-2xl font-bold text-white sm:text-3xl ${isRTL ? 'text-right' : 'text-left'}`}>
              {content.simulation.title}
            </h2>
            <p className={`mt-4 text-lg leading-7 text-slate-300 ${isRTL ? 'text-right' : 'text-left'}`}>
              {content.simulation.description}
            </p>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="mt-20 animate-slide-up-delay-5">
          <div className="soc-panel p-8">
            <h2 className={`text-2xl font-bold text-white sm:text-3xl ${isRTL ? 'text-right' : 'text-left'}`}>
              {content.workflow.title}
            </h2>
            <div className={`mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {content.workflow.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-sm font-semibold text-cyan-400">
                    {index + 1}
                  </div>
                  <p className="text-slate-300">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-20">
          <div className="soc-panel p-8">
            <h2 className={`text-2xl font-bold text-white sm:text-3xl ${isRTL ? 'text-right' : 'text-left'}`}>
              {content.cta.title}
            </h2>
            <p className={`mt-4 text-lg leading-7 text-slate-300 ${isRTL ? 'text-right' : 'text-left'}`}>
              {content.cta.description}
            </p>
            <div className={`mt-8 flex flex-wrap gap-4 justify-center ${isRTL ? 'lg:justify-end' : 'lg:justify-start'}`}>
              <Link
                to="/dashboard"
                className="soc-button flex items-center gap-2 px-6 py-3 text-sm font-semibold"
              >
                <BarChart3 className="h-4 w-4" />
                {content.cta.buttons.dashboard}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/alerts"
                className="soc-button-ghost flex items-center gap-2 px-6 py-3 text-sm font-semibold"
              >
                <AlertTriangle className="h-4 w-4" />
                {content.cta.buttons.alerts}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/incidents"
                className="soc-button-ghost flex items-center gap-2 px-6 py-3 text-sm font-semibold"
              >
                <Shield className="h-4 w-4" />
                {content.cta.buttons.incidents}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/tools"
                className="soc-button-ghost flex items-center gap-2 px-6 py-3 text-sm font-semibold"
              >
                <Wrench className="h-4 w-4" />
                {content.cta.buttons.tools}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
