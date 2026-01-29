import * as React from "react";
import { AppShell } from "@/app/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Users, Briefcase, ArrowLeftRight, ChevronRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export function EmployerDashboard() {
  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Välkommen tillbaka</h1>
          <p className="text-muted-foreground mt-1">Här är din bemanningsöversikt.</p>
        </div>

        {/* Fill Rate Meter */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-verified" />
              Bemanning
            </CardTitle>
            <Badge variant="verified" size="lg">78%</Badge>
          </CardHeader>
          <CardContent className="mt-4">
            <Progress value={78} size="lg" variant="verified" />
            <p className="text-sm text-muted-foreground mt-3">
              22 av 28 pass täckta för vintern
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Link to="/employer/swipe-talent">
            <Card variant="interactive" padding="md" className="h-full">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold">Hitta talanger</h3>
              <p className="text-sm text-muted-foreground">12 nya profiler</p>
            </Card>
          </Link>
          <Link to="/employer/jobs">
            <Card variant="interactive" padding="md" className="h-full">
              <Briefcase className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold">Annonser</h3>
              <p className="text-sm text-muted-foreground">6 aktiva</p>
            </Card>
          </Link>
          <Link to="/employer/borrow">
            <Card variant="interactive" padding="md" className="h-full">
              <ArrowLeftRight className="h-8 w-8 text-delight mb-3" />
              <h3 className="font-semibold">Låna personal</h3>
              <p className="text-sm text-muted-foreground">Täck upp snabbt</p>
            </Card>
          </Link>
        </div>

        <Card variant="default" padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Behöver du täcka upp snabbt?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Låna verifierade medarbetare från andra arbetsgivare i nätverket.
              </p>
            </div>
            <Link to="/employer/borrow">
              <Button variant="delight" size="md" className="gap-2">
                Låna personal
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default EmployerDashboard;
