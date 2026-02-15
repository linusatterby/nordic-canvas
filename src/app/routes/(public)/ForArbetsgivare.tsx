import * as React from "react";
import { Link } from "react-router-dom";
import { Users, Repeat, Calendar, ChevronDown, CheckCircle, FileSpreadsheet } from "lucide-react";
import { PublicShell } from "@/app/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function ForArbetsgivare() {
  const scrollToSection = () => {
    document.getElementById("hur-det-funkar")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <PublicShell pageTitle="För Arbetsgivare" pageDescription="Hitta pålitliga säsongsarbetare snabbt och enkelt." canonicalPath="/for-arbetsgivare">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-verified/5" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="default" className="mb-6">
              <Users className="h-3 w-3 mr-1" />
              Säkra personal snabbt
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6">
              Säkra personal på dagar –{" "}
              <span className="text-primary">inte veckor</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Matcha talang + schema + boende och dela resurser i Trusted Circles 
              när trycket ökar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?role=employer">
                <Button variant="primary" size="lg" className="min-w-[200px]">
                  Testa demo som arbetsgivare
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
            Tre kraftfulla verktyg för din verksamhet inom besöksnäringen
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Feature 1 */}
            <Card className="p-8 text-center relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Swipea talang</h3>
              <p className="text-muted-foreground text-sm">
                Bedöm snabbt och gå till match & chatt.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 text-center relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-verified to-verified/50" />
              <div className="h-14 w-14 rounded-2xl bg-verified/10 flex items-center justify-center mx-auto mb-5">
                <Repeat className="h-7 w-7 text-verified" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Borrow & Release</h3>
              <p className="text-muted-foreground text-sm">
                Låna vid akut behov och släpp pass vid överbemanning.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 text-center relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-delight to-delight/50" />
              <div className="h-14 w-14 rounded-2xl bg-delight/10 flex items-center justify-center mx-auto mb-5">
                <Calendar className="h-7 w-7 text-delight" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Schemalägg & exportera</h3>
              <p className="text-muted-foreground text-sm">
                Se krockar, boka pass, exportera timmar.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* I demo kan du... */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-4">
              I demo kan du...
            </h2>
            <p className="text-muted-foreground text-center mb-10">
              Testa hela flödet utan att skapa riktigt konto
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Skapa borrow request</p>
                  <p className="text-sm text-muted-foreground">Se offer från andra arbetsgivare</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="h-8 w-8 rounded-full bg-verified/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-verified" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Se demo-match + chatt</p>
                  <p className="text-sm text-muted-foreground">Upplev hela matchningsflödet</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="h-8 w-8 rounded-full bg-delight/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-delight" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Se demo-bokning + release offer</p>
                  <p className="text-sm text-muted-foreground">Ta över pass från Trusted Circle</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Exportera veckan som CSV</p>
                  <p className="text-sm text-muted-foreground">Löneunderlag redo för export</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Redo att testa?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Prova demo-läget kostnadsfritt – inga konto krävs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth?role=employer">
              <Button 
                variant="secondary" 
                size="lg"
                className="min-w-[220px]"
              >
                Testa demo som arbetsgivare
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button 
                variant="ghost" 
                size="lg"
                className="min-w-[140px] text-primary-foreground hover:bg-primary-foreground/10"
              >
                Logga in
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
