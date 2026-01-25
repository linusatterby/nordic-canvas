import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateOfferDraft, useSendOffer } from "@/hooks/useOffers";
import { useToasts } from "@/components/delight/Toasts";
import type { CreateOfferPayload } from "@/lib/api/offers";

const offerSchema = z.object({
  role_title: z.string().min(1, "Roll krävs").max(100),
  location: z.string().max(100).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  hours_per_week: z.coerce.number().min(1).max(168).optional().nullable(),
  hourly_rate: z.coerce.number().min(0).optional().nullable(),
  housing_included: z.boolean(),
  housing_note: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
});

type OfferFormData = z.infer<typeof offerSchema>;

interface OfferComposerModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  talentUserId: string;
  matchId?: string | null;
  listingId?: string | null;
  prefill?: {
    role_title?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    housing_included?: boolean;
    housing_note?: string;
  };
}

export function OfferComposerModal({ open, onClose, orgId, talentUserId, matchId, listingId, prefill }: OfferComposerModalProps) {
  const { addToast } = useToasts();
  const navigate = useNavigate();
  const createDraftMutation = useCreateOfferDraft();
  const sendOfferMutation = useSendOffer();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      role_title: prefill?.role_title ?? "",
      location: prefill?.location ?? "",
      start_date: prefill?.start_date ?? "",
      end_date: prefill?.end_date ?? "",
      housing_included: prefill?.housing_included ?? false,
      housing_note: prefill?.housing_note ?? "",
      message: "",
    },
  });

  const housingIncluded = watch("housing_included");

  const onSubmit = async (data: OfferFormData) => {
    try {
      const payload: CreateOfferPayload = {
        org_id: orgId,
        talent_user_id: talentUserId,
        match_id: matchId,
        listing_id: listingId,
        listing_type: "job",
        role_title: data.role_title,
        location: data.location || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        hours_per_week: data.hours_per_week,
        hourly_rate: data.hourly_rate,
        housing_included: data.housing_included,
        housing_note: data.housing_included ? data.housing_note : null,
        message: data.message || null,
      };

      const draft = await createDraftMutation.mutateAsync(payload);
      if (draft?.id) {
        const result = await sendOfferMutation.mutateAsync(draft.id);
        
        // Handle conflict response with CTA
        if (result.ok === false) {
          const errorMsg = result.message;
          if (result.reason === 'conflict') {
            addToast({ 
              type: "error", 
              title: "Erbjudande finns redan", 
              message: errorMsg,
              action: {
                label: "Öppna erbjudanden",
                onClick: () => navigate("/employer/inbox?tab=offers"),
              },
            });
          } else {
            addToast({ type: "error", title: "Kunde inte skicka", message: errorMsg });
          }
          return;
        }
        
        addToast({ type: "success", title: "Erbjudande skickat!", message: "Talangen har fått ditt erbjudande." });
        reset();
        onClose();
      }
    } catch (err) {
      addToast({ type: "error", title: "Kunde inte skicka", message: err instanceof Error ? err.message : "Ett fel uppstod" });
    }
  };

  const isPending = createDraftMutation.isPending || sendOfferMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Skicka erbjudande</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role_title">Roll / Titel *</Label>
            <Input id="role_title" placeholder="t.ex. Servitör, Kock" {...register("role_title")} />
            {errors.role_title && <p className="text-xs text-destructive">{errors.role_title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Plats</Label>
            <Input id="location" placeholder="t.ex. Stockholm" {...register("location")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Startdatum</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Slutdatum</Label>
              <Input id="end_date" type="date" {...register("end_date")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours_per_week">Timmar/vecka</Label>
              <Input id="hours_per_week" type="number" placeholder="40" {...register("hours_per_week")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Timlön (SEK)</Label>
              <Input id="hourly_rate" type="number" placeholder="165" {...register("hourly_rate")} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="housing_included">Boende ingår</Label>
            <Switch id="housing_included" checked={housingIncluded} onCheckedChange={(c) => setValue("housing_included", c)} />
          </div>
          
          {housingIncluded && (
            <div className="space-y-2">
              <Label htmlFor="housing_note">Boendeinfo</Label>
              <Input id="housing_note" placeholder="t.ex. Delat rum" {...register("housing_note")} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Meddelande</Label>
            <Textarea id="message" placeholder="Personligt meddelande..." rows={2} {...register("message")} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={isPending} className="flex-1">Avbryt</Button>
            <Button type="submit" variant="primary" size="md" disabled={isPending} className="flex-1">
              {isPending ? "Skickar..." : "Skicka"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
