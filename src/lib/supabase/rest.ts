const REST_HEADERS = {
  "Content-Type": "application/json",
};

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  return url.replace(/\/$/, "");
}

function restHeaders(key: string, extra?: Record<string, string>): HeadersInit {
  return {
    ...REST_HEADERS,
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

export function hasSupabaseAdmin(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function hasSupabasePublic(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

function adminKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return key;
}

function publicKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.");
  return key;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Supabase request failed (${res.status})`);
  }
  if (res.status === 204) return [] as T;
  return (await res.json()) as T;
}

export async function publicSelect<T>(
  table: string,
  query = "select=*",
): Promise<T[]> {
  const res = await fetch(`${supabaseUrl()}/rest/v1/${table}?${query}`, {
    headers: restHeaders(publicKey()),
    cache: "no-store",
  });
  return parseJson<T[]>(res);
}

export async function adminUpsert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
): Promise<void> {
  if (!rows.length) return;
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: restHeaders(adminKey(), {
        Prefer: "resolution=merge-duplicates",
      }),
      body: JSON.stringify(rows),
    },
  );
  await parseJson(res);
}

export async function adminDeleteEq(
  table: string,
  column: string,
  value: string | number,
): Promise<void> {
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/${table}?${column}=eq.${encodeURIComponent(String(value))}`,
    {
      method: "DELETE",
      headers: restHeaders(adminKey()),
    },
  );
  await parseJson(res);
}

export async function adminDeleteIn(
  table: string,
  column: string,
  values: (string | number)[],
): Promise<void> {
  if (!values.length) return;
  const list = values.map((v) => encodeURIComponent(String(v))).join(",");
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/${table}?${column}=in.(${list})`,
    {
      method: "DELETE",
      headers: restHeaders(adminKey()),
    },
  );
  await parseJson(res);
}

export async function adminInsert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
): Promise<void> {
  if (!rows.length) return;
  const res = await fetch(`${supabaseUrl()}/rest/v1/${table}`, {
    method: "POST",
    headers: restHeaders(adminKey(), { Prefer: "return=minimal" }),
    body: JSON.stringify(rows),
  });
  await parseJson(res);
}

export async function uploadLogo(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const res = await fetch(
    `${supabaseUrl()}/storage/v1/object/logos/${encodeURIComponent(objectPath)}`,
    {
      method: "POST",
      headers: {
        apikey: adminKey(),
        Authorization: `Bearer ${adminKey()}`,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: new Uint8Array(buffer),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Logo upload failed (${res.status})`);
  }
  return `${supabaseUrl()}/storage/v1/object/public/logos/${objectPath}`;
}
