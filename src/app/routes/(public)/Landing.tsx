import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Briefcase, Home, Star, Shield, Zap, CheckCircle2 } from "lucide-react";
import { PublicShell } from "@/app/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const features = [
  {
    icon: <Users className="h-5 w-5" />,
    title: "Smart matchning",
    description: "Vår algoritm matchar talanger med jobb baserat på erfarenhet, tillgänglighet och preferenser.",
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "Pålitlighetspoäng",
    description: "Bygg ditt rykte uppdrag efter uppdrag. Arbetsgivare ser din historik och betyg.",
  },
  {
    icon: <Home className="h-5 w-5" />,
    title: "Boende direkt i appen",
    description: "Hitta boende enkelt. Verifiera värdar och hyresgäster för trygghet.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Verifierad identitet",
    description: "Alla användare verifieras för en säker och pålitlig arbetsmarknad.",
  },
];

const stats = [
  { value: "12K+", label: "Talanger" },
  { value: "850+", label: "Arbetsgivare" },
  { value: "95%", label: "Nöjdhet" },
];

const heroBullets = [
  "Verifierad identitet",
  "Snabb matchning",
  "Boende i appen",
];

export function Landing() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Warm gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-warm-accent-muted/40 via-transparent to-primary-muted/20" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-warm-accent/5 blur-[120px] -translate-y-1/2 translate-x-1/4" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="primary" className="mb-6">
              <Zap className="h-3 w-3" />
              Besöksnäringen väntar
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Din nästa roll i besöksnäringen börjar här
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Vi kopplar samman talanger och arbetsgivare inom hotell, restaurang,
              turism och upplevelser. Matcha. Chatta. Kom igång.
            </p>

            {/* Floating hero panel */}
            <div className="glass rounded-[20px] shadow-lift p-6 sm:p-8 max-w-xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <Link to="/auth/signup?role=talent">
                  <Button variant="primary" size="lg" className="gap-2 w-full sm:w-auto">
                    Hitta jobb
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth/signup?role=employer">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    Hitta talanger
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {heroBullets.map((bullet) => (
                  <span key={bullet} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-verified" />
                    {bullet}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats glass strip */}
          <div className="glass rounded-[18px] shadow-card max-w-lg mx-auto mt-12">
            <div className="flex items-center divide-x divide-border/40">
              {stats.map((stat) => (
                <div key={stat.label} className="flex-1 text-center py-5 px-4">
                  <div className="text-3xl lg:text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide font-medium">{stat.label}</div>
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
              Byggd för besöksnäringen
            </h2>
            <p className="text-muted-foreground">
              Allt du behöver för att hitta rätt match – oavsett om du söker jobb eller personal.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group glass-panel rounded-[18px] border border-border/50 p-6 text-center
                           transition-all duration-fast ease-out
                           hover:-translate-y-1 hover:shadow-hover hover:border-warm-accent/25"
              >
                <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl
                                bg-warm-accent-muted text-warm-accent ring-2 ring-warm-accent/10
                                mb-4 transition-all duration-fast group-hover:ring-warm-accent/25">
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
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-[24px] bg-ink text-frost text-center max-w-3xl mx-auto p-10 lg:p-14 shadow-lift relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-warm-accent/8" />
            <div className="relative">
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">
                Redo för säsongen?
              </h2>
              <p className="text-frost/70 mb-8 max-w-lg mx-auto">
                Skapa ditt konto på under 2 minuter. Ingen kostnad för talanger.
              </p>
              <Link to="/auth/signup">
                <Button variant="primary" size="lg" className="gap-2">
                  Kom igång gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

export default Landing;
