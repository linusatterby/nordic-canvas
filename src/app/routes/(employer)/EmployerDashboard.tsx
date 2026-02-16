import * as React from "react";
import { AppShell } from "@/app/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { Users, Briefcase, ArrowLeftRight, ChevronRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

function DashboardSkeleton() {
  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>

        {/* Fill rate skeleton */}
        <div className="rounded-[18px] border border-border/60 bg-card p-6 shadow-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-3 w-48 mt-3" />
        </div>

        {/* Quick action cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-[18px] border border-border/60 bg-card p-4 shadow-card ${i === 3 ? "col-span-2 md:col-span-1" : ""}`}>
              <Skeleton variant="default" className="h-8 w-8 rounded-xl mb-3" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        {/* CTA skeleton */}
        <div className="rounded-[18px] border border-border/60 bg-card p-6 shadow-card">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </AppShell>
  );
}

export function EmployerDashboard() {
  // In a real scenario this would come from a loading hook
  // For now the dashboard uses static data, so we render directly
  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Välkommen tillbaka</h1>
          <p className="text-muted-foreground mt-1">Här är din bemanningsöversikt.</p>
        </div>

        {/* Fill Rate Meter - compact on mobile */}
        <Card variant="elevated" className="mb-6 p-4 sm:p-6">
          <CardHeader className="flex-row items-center justify-between p-0">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-verified" />
              Bemanning
            </CardTitle>
            <Badge variant="verified" size="lg">78%</Badge>
          </CardHeader>
          <CardContent className="mt-3 sm:mt-4 p-0">
            <Progress value={78} size="lg" variant="verified" />
            <p className="text-sm text-muted-foreground mt-2 sm:mt-3">
              22 av 28 pass täckta för vintern
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions Grid - 2 cols mobile, 3 cols md+ */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          <Link to="/employer/jobs">
            <Card variant="interactive" className="h-full p-3 sm:p-4">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2 sm:mb-3" />
              <h3 className="font-semibold text-sm sm:text-base">Hitta kandidater</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">12 nya profiler</p>
            </Card>
          </Link>
          <Link to="/employer/jobs">
            <Card variant="interactive" className="h-full p-3 sm:p-4">
              <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2 sm:mb-3" />
              <h3 className="font-semibold text-sm sm:text-base">Annonser</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">6 aktiva</p>
            </Card>
          </Link>
          <Link to="/employer/borrow" className="col-span-2 md:col-span-1">
            <Card variant="interactive" className="h-full p-3 sm:p-4">
              <ArrowLeftRight className="h-6 w-6 sm:h-8 sm:w-8 text-delight mb-2 sm:mb-3" />
              <h3 className="font-semibold text-sm sm:text-base">Låna personal</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Täck upp snabbt</p>
            </Card>
          </Link>
        </div>

        <Card variant="default" padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground">Behöver du täcka upp snabbt?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Låna verifierade medarbetare från andra arbetsgivare i nätverket.
              </p>
            </div>
            <Link to="/employer/borrow" className="flex-shrink-0">
              <Button variant="delight" size="md" className="gap-2 w-full sm:w-auto">
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
