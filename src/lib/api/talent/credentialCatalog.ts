import { supabase } from "@/integrations/supabase/client";

export interface CatalogCredential {
  code: string;
  label: string;
  category: string;
  is_common: boolean;
  sort_order: number;
  active: boolean;
}

export async function fetchCredentialCatalog(): Promise<CatalogCredential[]> {
  const { data, error } = await supabase
    .from("credential_catalog")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogCredential[];
}
