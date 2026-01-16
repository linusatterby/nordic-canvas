import * as React from "react";
import { Link } from "react-router-dom";
import { Sparkles, Calendar, MessageSquare, Award, ChevronDown } from "lucide-react";
import { PublicShell } from "@/app/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function ForTalanger() {
  const scrollToSection = () => {
    document.getElementById("hur-det-funkar")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <PublicShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-delight/5" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="default" className="mb-6">
              <Sparkles className="h-3 w-3 mr-1" />
              Season Passport
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6">
              Bygg ditt säsongs-CV.{" "}
              <span className="text-primary">Matcha jobb + boende.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Seasonal Talent hjälper dig hitta rätt säsongsjobb, visa upp dina 
              färdigheter och få boende där jobben finns.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button variant="primary" size="lg" className="min-w-[160px]">
                  Kom igång
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
            Tre enkla steg till ditt nästa säsongsjobb
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Step 1 */}
            <Card className="p-8 text-center relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">1. Swipe</h3>
              <p className="text-muted-foreground text-sm">
                Bläddra bland säsongsjobb som matchar dina färdigheter och önskemål. 
                Swipe höger på de du gillar.
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="p-8 text-center relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-verified to-verified/50" />
              <div className="h-14 w-14 rounded-2xl bg-verified/10 flex items-center justify-center mx-auto mb-5">
                <MessageSquare className="h-7 w-7 text-verified" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">2. Match</h3>
              <p className="text-muted-foreground text-sm">
                När arbetsgivaren gillar dig tillbaka får ni en match. 
                Chatta direkt och lär känna varandra.
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="p-8 text-center relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-delight to-delight/50" />
              <div className="h-14 w-14 rounded-2xl bg-delight/10 flex items-center justify-center mx-auto mb-5">
                <Calendar className="h-7 w-7 text-delight" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">3. Schema</h3>
              <p className="text-muted-foreground text-sm">
                Få pass bokade direkt i appen. Se ditt schema, håll koll på 
                tillgänglighet och tjäna pengar.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Season Passport */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                <Award className="h-3 w-3 mr-1" />
                Season Passport
              </Badge>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ditt digitala säsongs-CV
              </h2>
              <p className="text-muted-foreground mb-6">
                Bygg upp ditt Legacy Score genom att jobba hårt, få bra omdömen 
                och samla verifierade badges. Ju högre score, desto mer attraktiv 
                blir du för arbetsgivare.
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3 text-foreground">
                  <div className="h-6 w-6 rounded-full bg-verified/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-verified text-xs">✓</span>
                  </div>
                  Verifierade certifikat & utbildningar
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <div className="h-6 w-6 rounded-full bg-verified/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-verified text-xs">✓</span>
                  </div>
                  Legacy Score som växer med erfarenhet
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <div className="h-6 w-6 rounded-full bg-verified/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-verified text-xs">✓</span>
                  </div>
                  Prioritet på populära jobb
                </li>
              </ul>
            </div>
            
            {/* Mock Passport Card */}
            <div className="flex justify-center">
              <Card className="w-full max-w-sm p-6 bg-gradient-to-br from-card to-secondary/30 border-2">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">ST</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Season Passport</p>
                    <p className="text-sm text-muted-foreground">Ditt digitala CV</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Legacy Score</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-foreground">72</span>
                    <span className="text-muted-foreground mb-1">/100</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-verified rounded-full"
                      style={{ width: "72%" }}
                    />
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Verifierade Badges</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      <span className="text-verified mr-1">✓</span> RSA
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <span className="text-verified mr-1">✓</span> Hygienpass
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <span className="text-verified mr-1">✓</span> Truck B
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Redo att hitta ditt nästa säsongsjobb?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Skapa ditt konto gratis och börja matcha med arbetsgivare redan idag.
          </p>
          <Link to="/auth">
            <Button 
              variant="secondary" 
              size="lg"
              className="min-w-[180px]"
            >
              Kom igång gratis
            </Button>
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
