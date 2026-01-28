import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Briefcase, Home, Star, Shield, Zap } from "lucide-react";
import { PublicShell } from "@/app/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const features = [
  {
    icon: <Users className="h-6 w-6" />,
    title: "Smart matchning",
    description: "Vår algoritm matchar talanger med jobb baserat på erfarenhet, tillgänglighet och preferenser.",
  },
  {
    icon: <Star className="h-6 w-6" />,
    title: "Pålitlighetspoäng",
    description: "Bygg ditt rykte uppdrag efter uppdrag. Arbetsgivare ser din historik och betyg.",
  },
  {
    icon: <Home className="h-6 w-6" />,
    title: "Boende direkt i appen",
    description: "Hitta boende enkelt. Verifiera värdar och hyresgäster för trygghet.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Verifierad identitet",
    description: "Alla användare verifieras för en säker och pålitlig arbetsmarknad.",
  },
];

const stats = [
  { value: "12K+", label: "Talanger" },
  { value: "850+", label: "Arbetsgivare" },
  { value: "95%", label: "Nöjdhet" },
];

export function Landing() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-delight/5" />
        <div className="container mx-auto px-4 py-20 lg:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="primary" className="mb-6">
              <Zap className="h-3 w-3" />
              Besöksnäringen väntar
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Din nästa roll i besöksnäringen börjar här
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Vi kopplar samman talanger och arbetsgivare inom hotell, restaurang, 
              turism och upplevelser. Swipea, matcha, jobba.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth/signup?role=talent">
                <Button variant="primary" size="lg" className="gap-2">
                  Hitta jobb
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth/signup?role=employer">
                <Button variant="secondary" size="lg">
                  Hitta talanger
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 lg:gap-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Byggd för besöksnäringen
            </h2>
            <p className="text-muted-foreground">
              Allt du behöver för att hitta rätt match – oavsett om du söker jobb eller personal.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} variant="flat" padding="lg" className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary-muted text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card variant="elevated" padding="lg" className="bg-ink text-frost text-center max-w-3xl mx-auto">
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
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}

export default Landing;
