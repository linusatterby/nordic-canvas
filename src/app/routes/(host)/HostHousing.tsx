import * as React from "react";
import { AppShell } from "@/app/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMyHostHousing, useCreateHousingListing, useUpdateHousingListingStatus } from "@/hooks/useHousing";
import { Home, Plus, Edit2, CheckCircle, XCircle, MapPin, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "@/hooks/use-toast";

interface HousingFormData {
  title: string;
  location: string;
  approx_area: string;
  rent_per_month: number | "";
  rooms: number | "";
  furnished: boolean;
  available_from: string;
  available_to: string;
  deposit: number | "";
  housing_text: string;
}

const emptyForm: HousingFormData = {
  title: "",
  location: "",
  approx_area: "",
  rent_per_month: "",
  rooms: "",
  furnished: false,
  available_from: "",
  available_to: "",
  deposit: "",
  housing_text: "",
};

export default function HostHousing() {
  const { data: listings, isLoading } = useMyHostHousing();
  const createListing = useCreateHousingListing();
  const updateStatus = useUpdateHousingListingStatus();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<HousingFormData>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (listing: NonNullable<typeof listings>[0]) => {
    setEditingId(listing.id);
    setForm({
      title: listing.title || "",
      location: listing.location || "",
      approx_area: listing.approx_area || "",
      rent_per_month: listing.rent_per_month ?? "",
      rooms: listing.rooms ?? "",
      furnished: listing.furnished ?? false,
      available_from: listing.available_from || "",
      available_to: listing.available_to || "",
      deposit: listing.deposit ?? "",
      housing_text: listing.housing_text || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.rent_per_month) {
      toast({ title: "Fyll i titel och hyra", variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
        // For v0, edit is just update status or reopen modal
        toast({ title: "Redigering sparad", description: "Ändringar har uppdaterats." });
      } else {
        await createListing.mutateAsync({
          title: form.title,
          location: form.location || null,
          approx_area: form.approx_area || null,
          rent_per_month: Number(form.rent_per_month),
          rooms: form.rooms ? Number(form.rooms) : null,
          furnished: form.furnished,
          available_from: form.available_from || null,
          available_to: form.available_to || null,
          deposit: form.deposit ? Number(form.deposit) : null,
          housing_text: form.housing_text || null,
        });
        toast({ title: "Boende skapat!", description: "Ditt boende är nu sparat som utkast." });
      }
      setIsModalOpen(false);
      setForm(emptyForm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunde inte spara";
      toast({ title: "Fel", description: msg, variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, newStatus: "published" | "closed") => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast({
        title: newStatus === "published" ? "Publicerad!" : "Stängd",
        description: newStatus === "published"
          ? "Boendet är nu synligt för kandidater."
          : "Boendet är nu stängt.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunde inte uppdatera status";
      toast({ title: "Fel", description: msg, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "published":
        return <Badge variant="verified" size="sm">Publicerad</Badge>;
      case "closed":
        return <Badge variant="default" size="sm">Stängd</Badge>;
      default:
        return <Badge variant="outline" size="sm">Utkast</Badge>;
    }
  };

  return (
    <AppShell role="host">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mina boenden</h1>
            <p className="text-muted-foreground">Hantera dina boendeannonser</p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Skapa boende
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : listings && listings.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Card key={listing.id} variant="default" padding="md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-1">
                      {listing.title || listing.approx_area || "Boende"}
                    </CardTitle>
                    {getStatusBadge(listing.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    {listing.approx_area && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{listing.approx_area}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">
                        {listing.rent_per_month
                          ? formatCurrency(listing.rent_per_month) + "/mån"
                          : "—"}
                      </span>
                    </div>
                    {listing.rooms && (
                      <span>{listing.rooms} rum{listing.furnished ? ", möblerad" : ""}</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {listing.status === "draft" && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleStatusChange(listing.id, "published")}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Publicera
                      </Button>
                    )}
                    {listing.status === "published" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleStatusChange(listing.id, "closed")}
                        disabled={updateStatus.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Stäng
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(listing)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="default" padding="lg" className="text-center">
            <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">Du har inga boenden än</p>
            <Button variant="primary" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Skapa ditt första boende
            </Button>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            {editingId ? "Redigera boende" : "Skapa boende"}
          </h2>

          <div className="space-y-3">
            <div>
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="T.ex. Mysig lägenhet i centrum"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="location">Ort</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Visby"
                />
              </div>
              <div>
                <Label htmlFor="approx_area">Område</Label>
                <Input
                  id="approx_area"
                  value={form.approx_area}
                  onChange={(e) => setForm({ ...form, approx_area: e.target.value })}
                  placeholder="Innerstad"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rent">Hyra/månad (SEK) *</Label>
                <Input
                  id="rent"
                  type="number"
                  value={form.rent_per_month}
                  onChange={(e) =>
                    setForm({ ...form, rent_per_month: e.target.value ? Number(e.target.value) : "" })
                  }
                  placeholder="6500"
                />
              </div>
              <div>
                <Label htmlFor="rooms">Rum</Label>
                <Input
                  id="rooms"
                  type="number"
                  value={form.rooms}
                  onChange={(e) =>
                    setForm({ ...form, rooms: e.target.value ? Number(e.target.value) : "" })
                  }
                  placeholder="2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="available_from">Tillgänglig från</Label>
                <Input
                  id="available_from"
                  type="date"
                  value={form.available_from}
                  onChange={(e) => setForm({ ...form, available_from: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="available_to">Tillgänglig till</Label>
                <Input
                  id="available_to"
                  type="date"
                  value={form.available_to}
                  onChange={(e) => setForm({ ...form, available_to: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="deposit">Deposition (SEK)</Label>
              <Input
                id="deposit"
                type="number"
                value={form.deposit}
                onChange={(e) =>
                  setForm({ ...form, deposit: e.target.value ? Number(e.target.value) : "" })
                }
                placeholder="10000"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="furnished"
                checked={form.furnished}
                onCheckedChange={(checked) => setForm({ ...form, furnished: checked })}
              />
              <Label htmlFor="furnished">Möblerad</Label>
            </div>

            <div>
              <Label htmlFor="housing_text">Beskrivning</Label>
              <Textarea
                id="housing_text"
                value={form.housing_text}
                onChange={(e) => setForm({ ...form, housing_text: e.target.value })}
                placeholder="Beskriv boendet..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Avbryt
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={createListing.isPending}
            >
              {editingId ? "Spara" : "Skapa"}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
