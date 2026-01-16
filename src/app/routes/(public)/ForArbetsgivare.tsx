import * as React from "react";
import { Link } from "react-router-dom";
import { Users, Repeat, Calendar, BarChart3, ChevronDown, Clock, Shield, Zap } from "lucide-react";
import { PublicShell } from "@/app/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function ForArbetsgivare() {
  const scrollToSection = () => {
    document.getElementById("hur-det-funkar")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <PublicShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-verified/5" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="default" className="mb-6">
              <Zap className="h-3 w-3 mr-1" />
              Operativ kontroll
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6">
              Fyll pass på timmar –{" "}
              <span className="text-primary">och dela personal när det behövs.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Hitta kvalificerade säsongsarbetare, schemalägg smidigt och låna 
              personal från andra arbetsgivare vid behov.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button variant="primary" size="lg" className="min-w-[160px]">
                  Hitta talanger
                </Button>
              </Link>
              <Button 
                variant="secondary" 
                size="lg" 
                onClick={scrollToSection}
                className="min-w-[160px] gap-2"
              >
                Se hur det funkar
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="hur-det-funkar" className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">
            Så funkar det
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Tre kraftfulla verktyg för din säsongsverksamhet
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Feature 1 */}
            <Card className="p-8 text-center relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Swipe kandidater</h3>
              <p className="text-muted-foreground text-sm">
                Bläddra genom kvalificerade säsongsarbetare. Se Legacy Score, 
                verifierade badges och tillgänglighet på ett ögonblick.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 text-center relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-verified to-verified/50" />
              <div className="h-14 w-14 rounded-2xl bg-verified/10 flex items-center justify-center mx-auto mb-5">
                <Repeat className="h-7 w-7 text-verified" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Borrow-button</h3>
              <p className="text-muted-foreground text-sm">
                Behöver du extra personal? Skicka en förfrågan och få tillgång 
                till talanger som är lediga hos andra arbetsgivare.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 text-center relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-delight to-delight/50" />
              <div className="h-14 w-14 rounded-2xl bg-delight/10 flex items-center justify-center mx-auto mb-5">
                <Calendar className="h-7 w-7 text-delight" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Scheduler + Busy blocks</h3>
              <p className="text-muted-foreground text-sm">
                Se vem som är ledig i realtid. Skapa bokningar och undvik 
                krockar med anonymiserade busy blocks.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Operativ kontroll */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <BarChart3 className="h-3 w-3 mr-1" />
                Operativ kontroll
              </Badge>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Allt du behöver i ett gränssnitt
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Håll koll på din säsongsverksamhet med realtidsdata och smarta verktyg.
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              <Card className="p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">2h</p>
                <p className="text-sm text-muted-foreground">Snitt tid till match</p>
                <p className="text-xs text-muted-foreground/60 mt-1">(exempel)</p>
              </Card>
              
              <Card className="p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-verified/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-verified" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">94%</p>
                <p className="text-sm text-muted-foreground">Verifierade talanger</p>
                <p className="text-xs text-muted-foreground/60 mt-1">(exempel)</p>
              </Card>
              
              <Card className="p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-delight/10 flex items-center justify-center mx-auto mb-4">
                  <Repeat className="h-6 w-6 text-delight" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">78%</p>
                <p className="text-sm text-muted-foreground">Borrow-acceptans</p>
                <p className="text-xs text-muted-foreground/60 mt-1">(exempel)</p>
              </Card>
            </div>

            {/* Feature highlights */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Säker schemaläggning
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Busy blocks visar när talanger är upptagna hos andra – utan att 
                  avslöja vilken arbetsgivare. Du ser tillgänglighet, inte konkurrenter.
                </p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-verified">✓</span>
                    Realtidsuppdaterade kalender
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-verified">✓</span>
                    Automatisk konfliktdetektering
                  </li>
                </ul>
              </Card>
              
              <Card className="p-8">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Delad personalpool
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Med Borrow-funktionen kan du snabbt hitta ersättare. Talanger 
                  som är lediga hos andra kan acceptera din förfrågan direkt.
                </p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-verified">✓</span>
                    Snabb respons på förfrågningar
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-verified">✓</span>
                    Automatisk bokning vid accept
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Redo att optimera din säsongsverksamhet?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Skapa ditt konto gratis och börja hitta talanger redan idag.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button 
                variant="secondary" 
                size="lg"
                className="min-w-[180px]"
              >
                Hitta talanger
              </Button>
            </Link>
            <Link to="/auth">
              <Button 
                variant="ghost" 
                size="lg"
                className="min-w-[180px] text-primary-foreground hover:bg-primary-foreground/10"
              >
                Skapa jobb
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
