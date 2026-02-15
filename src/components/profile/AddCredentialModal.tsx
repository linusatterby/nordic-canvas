import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAddCredential } from "@/hooks/useCredentials";
import { useCredentialCatalog } from "@/hooks/useCredentialCatalog";
import { Skeleton } from "@/components/ui/Skeleton";

const OTHER_VALUE = "__other__";

interface Props {
  onClose: () => void;
}

export function AddCredentialModal({ onClose }: Props) {
  const addMutation = useAddCredential();
  const { data: catalog, isLoading: catalogLoading } = useCredentialCatalog();

  const [type, setType] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [issuer, setIssuer] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [error, setError] = React.useState("");

  // Set default type once catalog loads
  React.useEffect(() => {
    if (catalog && catalog.length > 0 && !type) {
      setType(catalog[0].code);
    }
  }, [catalog, type]);

  const isOther = type === OTHER_VALUE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isOther && !label.trim()) {
      setError("Ange namn för certifikatet.");
      return;
    }

    try {
      await addMutation.mutateAsync({
        credential_type: isOther ? "other" : type,
        label: isOther ? label.trim() : null,
        issuer: issuer.trim() || null,
        expires_at: expiresAt || null,
      });
      onClose();
    } catch {
      setError("Kunde inte spara. Försök igen.");
    }
  };

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Lägg till certifikat</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="cred-type">Typ</Label>
            {catalogLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                id="cred-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(catalog ?? []).map((ct) => (
                  <option key={ct.code} value={ct.code}>{ct.label}</option>
                ))}
                <option value={OTHER_VALUE}>Annat…</option>
              </select>
            )}
          </div>

          {isOther && (
            <div className="space-y-2">
              <Label htmlFor="cred-label">Namn</Label>
              <Input
                id="cred-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="T.ex. Motorsågskörkort"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cred-issuer">Utfärdare (valfritt)</Label>
            <Input
              id="cred-issuer"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="T.ex. Röda Korset"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cred-expires">Giltig t.o.m. (valfritt)</Label>
            <Input
              id="cred-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={addMutation.isPending || catalogLoading}>
              {addMutation.isPending ? "Sparar…" : "Spara"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
