import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Globe,
  Search,
  Shield,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const homeContent = {
  ar: {
    hero: {
      eyebrow: "منصة عمليات أمنية تعليمية",
      title: "مرحبًا بك في LogShield",
      subtitle:
        "منصة تعليمية وعملية لفرق العمليات الأمنية (Security Operations) تساعدك على تعلم التحقيق في الأحداث الأمنية وتحليل التنبيهات والتصنيف الأولي للأنشطة المشبوهة داخل بيئة محاكاة واقعية.",
    },
    features: [
      {
        icon: AlertTriangle,
        title: "تحليل التنبيهات",
        description:
          "راجع التنبيهات الأمنية، صنّفها، تتبّع حالتها، واربطها بالحوادث.",
      },
      {
        icon: Shield,
        title: "التحقيق في الحوادث",
        description:
          "أنشئ حوادث، اربط تنبيهات متعددة، أضف أدلة وملاحظات، واتبع جدول تحقيق موحد.",
      },
      {
        icon: BarChart3,
        title: "تحليل البيانات التجريبية",
        description:
          "تدرّب على التحقيق والتحليل باستخدام بيانات تجريبية آمنة وسيناريوهات محاكاة واقعية.",
      },
      {
        icon: TrendingUp,
        title: "مراقبة الأنشطة المشبوهة",
        description:
          "اكتشف محاولات تسجيل الدخول الفاشلة والسلوك غير الطبيعي وأنماط الهجمات عبر لوحة المعلومات.",
      },
      {
        icon: Search,
        title: "معلومات التهديدات",
        description:
          "ابحث عن الثغرات والمعلومات الأمنية ثم اربطها بسياق التحقيق.",
      },
      {
        icon: Wrench,
        title: "أدوات المحلل",
        description:
          "استخدم أدوات العمليات الأمنية مثل مستخرج IOC وBase64 ومفكك JWT وأدوات أخرى أثناء التحقيق.",
      },
    ],
    educational: {
      title: "بيئة تدريبية واقعية",
      description:
        "تم تصميم LogShield كمنصة تعليمية وعملية تسمح للمستخدمين بالتدرّب على تحليل الحوادث والتصنيف الأولي للتنبيهات داخل بيئة آمنة تعتمد على بيانات تجريبية وسيناريوهات تحاكي عمليات Security Operations الواقعية.",
    },
    simulation: {
      title: "سيناريوهات محاكاة جاهزة للتحليل",
      description:
        "تتضمن المنصة أنشطة مشبوهة محاكاة وأحداثًا تشبه الهجمات يمكن تحليلها عبر لوحة المعلومات والتنبيهات والسجلات والحوادث ومعلومات التهديدات.",
    },
    workflow: {
      title: "كيفية بدء التحقيق في LogShield",
      steps: [
        "راجع لوحة المعلومات",
        "افتح التنبيهات المشبوهة",
        "حلّل السجلات ذات الصلة",
        "أنشئ حادثًا عند الحاجة",
        "أضف الأدلة وملاحظات المحلل",
        "استخدم معلومات التهديدات وأدوات العمليات الأمنية",
        "وثّق الإجراءات عبر التقارير وسجلات التدقيق",
      ],
    },
    cta: {
      title: "ابدأ رحلتك داخل المنصة",
      description:
        "يمكنك الآن فتح لوحة المعلومات، مراجعة التنبيهات، استكشاف الحوادث، واستخدام أدوات التحليل لفهم سير عمل Security Operations في الممارسة.",
      buttons: {
        dashboard: "فتح لوحة المعلومات",
        alerts: "عرض التنبيهات",
        incidents: "فتح الحوادث",
        tools: "استكشاف أدوات العمليات الأمنية",
      },
    },
  },
  en: {
    hero: {
      eyebrow: "Security Operations Workspace",
      title: "Welcome to LogShield",
      subtitle:
        "An educational and practical Security Operations platform that helps you learn security investigation, alert analysis, and suspicious activity triage inside a realistic simulation environment.",
    },
    features: [
      {
        icon: AlertTriangle,
        title: "Alert Analysis",
        description:
          "Review security alerts, classify them, track status, and connect them to incidents.",
      },
      {
        icon: Shield,
        title: "Incident Investigation",
        description:
          "Create incidents, connect multiple alerts, add evidence and notes, and follow a unified timeline.",
      },
      {
        icon: BarChart3,
        title: "Demo Data Analysis",
        description:
          "Practice investigation and analysis using safe demo data and realistic simulated scenarios.",
      },
      {
        icon: TrendingUp,
        title: "Suspicious Activity Monitoring",
        description:
          "Explore failed logins, abnormal behavior, and attack-like patterns through dashboard views.",
      },
      {
        icon: Search,
        title: "Threat Intelligence",
        description:
          "Search vulnerabilities and security intelligence, then connect findings to investigation context.",
      },
      {
        icon: Wrench,
        title: "Analyst Utilities",
        description:
          "Use Security Operations tools such as IOC Extractor, Base64, JWT Decoder, and other utilities during investigations.",
      },
    ],
    educational: {
      title: "Realistic Training and Simulation Environment",
      description:
        "LogShield is designed as both an educational and practical platform. It allows users to train on incident analysis and alert triage inside a safe environment powered by demo data and scenarios that simulate real-world Security Operations.",
    },
    simulation: {
      title: "Simulated Scenarios Ready for Analysis",
      description:
        "The platform includes simulated suspicious activities and attack-like events that users can analyze through dashboard, alerts, logs, incidents, threat intelligence, and audit trails.",
    },
    workflow: {
      title: "How to Start an Investigation in LogShield",
      steps: [
        "Review the Dashboard",
        "Open suspicious Alerts",
        "Analyze related Logs",
        "Create an Incident when needed",
        "Add evidence and analyst notes",
        "Use Threat Intelligence and Security Operations Toolkit",
        "Document actions through Reports and Audit Logs",
      ],
    },
    cta: {
      title: "Start Your Journey Inside the Platform",
      description:
        "Open the dashboard, review alerts, explore incidents, and use the analysis tools to understand Security Operations workflow in practice.",
      buttons: {
        dashboard: "Open Dashboard",
        alerts: "View Alerts",
        incidents: "Open Incidents",
        tools: "Explore Security Operations Toolkit",
      },
    },
  },
} as const;

function LanguageToggle({
  currentLang,
  onLanguageChange,
}: {
  currentLang: "ar" | "en";
  onLanguageChange: (lang: "ar" | "en") => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-cyber-cyan/20 bg-cyber-cyan/[0.06] p-1">
      <button
        type="button"
        onClick={() => onLanguageChange("en")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
          currentLang === "en"
            ? "bg-gradient-to-r from-cyber-cyan to-cyan-300 text-cyber-bg shadow shadow-cyan-500/20"
            : "text-cyber-muted hover:text-cyber-text"
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => onLanguageChange("ar")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
          currentLang === "ar"
            ? "bg-gradient-to-r from-cyber-cyan to-cyan-300 text-cyber-bg shadow shadow-cyan-500/20"
            : "text-cyber-muted hover:text-cyber-text"
        }`}
      >
        العربية
      </button>
    </div>
  );
}

export function HomePage() {
  const { role } = useAuth();
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [isLoaded, setIsLoaded] = useState(false);
  const canUseSocWorkspace = role === "admin" || role === "analyst";

  useEffect(() => {
    const savedLanguage = localStorage.getItem("logshield-language") as "ar" | "en" | null;
    if (savedLanguage === "ar" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }
    setIsLoaded(true);
  }, []);

  const handleLanguageChange = (lang: "ar" | "en") => {
    setLanguage(lang);
    localStorage.setItem("logshield-language", lang);
  };

  const content = homeContent[language];
  const isRTL = language === "ar";

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cyber-bg text-cyber-text">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyber-cyan/30 border-t-cyber-cyan" />
          <p className="mt-3 text-sm text-cyber-muted">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isRTL ? "rtl" : "ltr"}
      className={`relative min-h-screen overflow-hidden bg-cyber-bg text-cyber-text ${isRTL ? "rtl" : "ltr"}`}
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.10),transparent_34rem),radial-gradient(circle_at_18%_80%,rgba(139,92,246,0.06),transparent_26rem),linear-gradient(135deg,#060B13_0%,#0B1220_50%,#060B13_100%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(34,211,238,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.16)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 xl:px-10">
        <section className="soc-panel p-5 sm:p-6 lg:p-8">
          <div
            className={`flex flex-col gap-4 ${isRTL ? "lg:items-end" : "lg:items-start"} lg:flex-row lg:justify-between lg:gap-6`}
          >
            <div className={`space-y-3 ${isRTL ? "text-right" : "text-left"} lg:max-w-[70%]`}>
              <p className="soc-eyebrow text-[10px] sm:text-[11px]">{content.hero.eyebrow}</p>
              <h1 className="text-3xl font-black leading-tight text-cyber-text sm:text-4xl lg:text-5xl">
                {content.hero.title}
              </h1>
              <p
                className={`max-w-3xl text-sm leading-7 text-cyber-muted sm:text-base ${
                  isRTL ? "lg:ml-auto" : "lg:mr-auto"
                }`}
              >
                {content.hero.subtitle}
              </p>
            </div>
            <div className={`shrink-0 ${isRTL ? "lg:mr-0" : "lg:ml-0"} self-start`}>
              <LanguageToggle currentLang={language} onLanguageChange={handleLanguageChange} />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {content.features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className={`soc-panel p-5 ${isRTL ? "text-right" : "text-left"} transition duration-200 hover:border-cyan-300/25 hover:bg-cyber-elevated/90 ${
                    index < 6 ? `animate-slide-up-delay-${index}` : ""
                  }`}
                >
                  <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/10">
                      <Icon className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold leading-6 text-cyber-text">{feature.title}</h3>
                      <p className="text-sm leading-6 text-cyber-muted">{feature.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="soc-panel p-6">
            <h2 className={`text-xl font-bold text-cyber-text sm:text-2xl ${isRTL ? "text-right" : "text-left"}`}>
              {content.educational.title}
            </h2>
            <p className={`mt-3 text-sm leading-7 text-cyber-muted sm:text-base ${isRTL ? "text-right" : "text-left"}`}>
              {content.educational.description}
            </p>
          </div>

          <div className="soc-panel p-6">
            <h2 className={`text-xl font-bold text-cyber-text sm:text-2xl ${isRTL ? "text-right" : "text-left"}`}>
              {content.simulation.title}
            </h2>
            <p className={`mt-3 text-sm leading-7 text-cyber-muted sm:text-base ${isRTL ? "text-right" : "text-left"}`}>
              {content.simulation.description}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="soc-panel p-6">
            <h2 className={`text-xl font-bold text-cyber-text sm:text-2xl ${isRTL ? "text-right" : "text-left"}`}>
              {content.workflow.title}
            </h2>
            <div className={`mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 ${isRTL ? "text-right" : "text-left"}`}>
              {content.workflow.steps.map((step, index) => (
                <div key={step} className={`flex items-start gap-3 rounded-lg border border-cyber-border-cyan/40 bg-cyber-elevated/45 p-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyber-cyan/18 text-xs font-semibold text-cyan-300">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-cyber-muted">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="soc-panel p-6">
            <h2 className={`text-xl font-bold text-cyber-text sm:text-2xl ${isRTL ? "text-right" : "text-left"}`}>
              {content.cta.title}
            </h2>
            <p className={`mt-3 max-w-4xl text-sm leading-7 text-cyber-muted sm:text-base ${isRTL ? "text-right lg:ml-auto" : "text-left lg:mr-auto"}`}>
              {content.cta.description}
            </p>
            <div className={`mt-5 flex flex-wrap gap-3 ${isRTL ? "justify-start lg:justify-end" : "justify-start"}`}>
              {canUseSocWorkspace ? (
                <>
                  <Link to="/dashboard" className="soc-button-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold">
                    <BarChart3 className="h-4 w-4" />
                    {content.cta.buttons.dashboard}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/alerts" className="soc-button-ghost flex items-center gap-2 px-5 py-2.5 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    {content.cta.buttons.alerts}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/incidents" className="soc-button-ghost flex items-center gap-2 px-5 py-2.5 text-sm font-semibold">
                    <Shield className="h-4 w-4" />
                    {content.cta.buttons.incidents}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : null}
              <Link
                to="/tools?tool=website-security-analyzer"
                className={`${canUseSocWorkspace ? "soc-button-ghost" : "soc-button-primary"} flex items-center gap-2 px-5 py-2.5 text-sm font-semibold`}
              >
                <Wrench className="h-4 w-4" />
                {content.cta.buttons.tools}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/url-scanner" className="soc-button-ghost flex items-center gap-2 px-5 py-2.5 text-sm font-semibold">
                <Globe className="h-4 w-4" />
                {language === "ar" ? "فحص الروابط" : "Scan URLs"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/threat-intelligence" className="soc-button-ghost flex items-center gap-2 px-5 py-2.5 text-sm font-semibold">
                <Search className="h-4 w-4" />
                {language === "ar" ? "بحث الثغرات" : "Search CVEs"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
