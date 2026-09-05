import { apiError, apiOk } from "@/lib/apiResponse";
import { isAdminAuthenticated } from "@/lib/auth";
import { uploadLogoBuffer } from "@/lib/logoStorage";
import { hasSupabaseAdmin } from "@/lib/supabase/rest";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return apiError("Unauthorized.", 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("Expected multipart form data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError("Missing file.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/png";

  if (hasSupabaseAdmin()) {
    const result = await uploadLogoBuffer(buffer, contentType);
    if (!result.ok) return apiError(result.error, 500);
    return apiOk({ url: result.url });
  }

  try {
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
          ? "gif"
          : contentType.includes("svg")
            ? "svg"
            : "jpg";
    const name = `logo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "logos");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buffer);
    return apiOk({ url: `/logos/${name}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not store logo locally.";
    return apiError(message, 500);
  }
}
