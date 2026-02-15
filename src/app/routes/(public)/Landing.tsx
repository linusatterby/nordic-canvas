import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Home, Star, Shield, Zap, CheckCircle2, Clock, ShieldCheck, MapPin, Play } from "lucide-react";
import { PublicShell } from "@/app/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDemoSession } from "@/contexts/DemoSessionContext";

const features = [
  {
    icon: <Users className="h-5 w-5" />,
    title: "Matchning som funkar",
    description: "Se relevanta jobb och kandidater baserat på roll, tillgänglighet och preferenser.",
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "Pålitlighet",
    description: "Bygg ett rykte över tid. Se historik, omdömen och genomförda uppdrag.",
  },
  {
    icon: <Home className="h-5 w-5" />,
    title: "Boende, enklare",
    description: "Hitta boende och värdar i samma flöde — med tydligare trygghet för båda sidor.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Tryggare från start",
    description: "Verifierade profiler gör det enklare att anställa, låna och jobba med förtroende.",
  },
];

const valueBlocks = [
  { icon: <Clock className="h-4 w-4" />, title: "Snabb match", desc: "Svar på minuter, inte dagar" },
  { icon: <ShieldCheck className="h-4 w-4" />, title: "Verifierad identitet", desc: "Tryggt för både talang och arbetsgivare" },
  { icon: <MapPin className="h-4 w-4" />, title: "Besöksnäringsfokus", desc: "Hotell, restaurang, turism och upplevelser" },
];

const heroBullets = [
  "Verifierad profil",
  "Snabb match",
  "Boende & värdar",
];

const roleChips = [
  "Bartender", "Servering", "Kock", "Reception",
  "Housekeeping", "Guide", "Disk/Runner", "Liftvärd",
];

export function Landing() {
  const { startDemo } = useDemoSession();
  const [demoLoading, setDemoLoading] = React.useState(false);

  const handleStartDemo = async (role: "employer" | "talent") => {
    setDemoLoading(true);
    try {
      await startDemo(role);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <PublicShell canonicalPath="/"  >
      {/* Hero */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
        {/* Warm ivory → sand gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-warm-accent-muted/30 via-transparent to-teal-muted/20" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-warm-accent/5 blur-[120px] -translate-y-1/2 translate-x-1/4" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="warm" className="mb-4">
              <Zap className="h-3 w-3" />
              Besöksnäringen är igång
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Din nästa roll i besöksnäringen — börjar här
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Vi kopplar ihop talanger och arbetsgivare inom hotell, restaurang,
              turism och upplevelser. Matcha rätt. Fyll passen. Kom igång.
            </p>

            {/* Floating hero panel */}
            <div className="glass rounded-[20px] shadow-card border border-border p-5 sm:p-7 max-w-xl mx-auto mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <Link to="/auth/signup?role=talent">
                  <Button variant="primary" size="lg" className="gap-2 w-full sm:w-auto">
                    Se jobb
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth/signup?role=employer">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Hitta personal
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {heroBullets.map((bullet) => (
                  <span key={bullet} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-teal" />
                    {bullet}
                  </span>
                ))}
              </div>
            </div>

            {/* Role chips */}
            <div className="max-w-2xl mx-auto mt-6">
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-3">Populära roller</p>
              <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none justify-center flex-wrap sm:flex-nowrap sm:justify-center"
                   style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {roleChips.map((role) => (
                  <span
                    key={role}
                    className="snap-start shrink-0 px-4 py-1.5 rounded-full text-sm font-medium
                               bg-card border border-border
                               text-foreground/80
                               hover:bg-warm-accent-muted hover:text-primary hover:border-primary/30
                               transition-all duration-fast cursor-default select-none"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Value blocks glass strip */}
          <div className="glass rounded-[18px] shadow-card border border-border max-w-2xl mx-auto mt-10">
            <div className="flex flex-col sm:flex-row items-stretch divide-y sm:divide-y-0 sm:divide-x divide-border/40">
              {valueBlocks.map((block) => (
                <div key={block.title} className="flex-1 flex flex-col items-center text-center py-5 px-5 gap-1.5">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary mb-1">
                    {block.icon}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{block.title}</span>
                  <span className="text-xs text-muted-foreground leading-snug">{block.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Byggd för pass, säsong och tempo
            </h2>
            <p className="text-muted-foreground">
              Allt du behöver för att hitta rätt — oavsett om du söker jobb eller behöver personal.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-[18px] border border-border bg-card p-6 text-center
                           transition-all duration-fast ease-out
                           hover:-translate-y-1 hover:shadow-hover hover:border-primary/20"
              >
                <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl
                                bg-primary/10 text-primary ring-2 ring-primary/10
                                mb-4 transition-all duration-fast group-hover:ring-primary/25">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[hsl(var(--c-surface-elevated))]">
        <div className="container mx-auto px-4">
          <div className="rounded-[24px] bg-card border border-border text-center max-w-3xl mx-auto p-10 lg:p-14 shadow-lift">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-foreground">
              Redo att komma igång?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Skapa konto på under 2 minuter. Gratis för talanger.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth/signup">
                <Button variant="primary" size="lg" className="gap-2">
                  Skapa konto
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
             <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => handleStartDemo("talent")}
                disabled={demoLoading}
              >
                <Play className="h-4 w-4" />
                {demoLoading ? "Startar…" : "Testa demo som talang"}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

export default Landing;
