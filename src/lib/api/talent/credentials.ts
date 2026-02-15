import { supabase } from "@/integrations/supabase/client";

export interface Credential {
  id: string;
  user_id: string;
  credential_type: string;
  label: string | null;
  issuer: string | null;
  issued_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialInsert {
  credential_type: string;
  label?: string | null;
  issuer?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
}

export async function fetchMyCredentials(): Promise<Credential[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("talent_credentials")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Credential[];
}

export async function addCredential(input: CredentialInsert): Promise<Credential> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("talent_credentials")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Credential;
}

export async function deleteCredential(id: string): Promise<void> {
  const { error } = await supabase
    .from("talent_credentials")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
