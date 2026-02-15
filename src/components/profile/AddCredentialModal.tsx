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

const CREDENTIAL_TYPES = [
  { value: "skoterkort", label: "Skoterkort" },
  { value: "hlr", label: "HLR" },
  { value: "korkort_b", label: "Körkort B" },
  { value: "korkort_c", label: "Körkort C" },
  { value: "hygienpass", label: "Hygienpass" },
  { value: "servering", label: "Serveringstillstånd" },
  { value: "other", label: "Övrigt" },
];

interface Props {
  onClose: () => void;
}

export function AddCredentialModal({ onClose }: Props) {
  const addMutation = useAddCredential();
  const [type, setType] = React.useState("skoterkort");
  const [label, setLabel] = React.useState("");
  const [issuer, setIssuer] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (type === "other" && !label.trim()) {
      setError("Ange namn för certifikatet.");
      return;
    }

    try {
      await addMutation.mutateAsync({
        credential_type: type,
        label: type === "other" ? label.trim() : null,
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
            <select
              id="cred-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CREDENTIAL_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>

          {type === "other" && (
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
            <Button type="submit" variant="primary" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Sparar…" : "Spara"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
