import { ChangeEvent, useMemo, useRef, useState } from "react";
import { ImagePlus, Trash2, UserCircle2 } from "lucide-react";

interface ProfileAvatarUploaderProps {
  currentAvatarUrl?: string;
  displayName: string;
  loading?: boolean;
  onAvatarChange: (nextAvatarDataUrl: string) => void;
  onRemove: () => void;
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const GENERIC_ERROR = "Please upload a PNG, JPG, or WebP image under 2MB.";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ProfileAvatarUploader({
  currentAvatarUrl,
  displayName,
  loading = false,
  onAvatarChange,
  onRemove,
}: ProfileAvatarUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  function handlePick() {
    fileInputRef.current?.click();
  }

  function hasSupportedSignature(bytes: Uint8Array): boolean {
    if (bytes.length < 12) return false;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    return isPng || isJpeg || isWebp;
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    const normalizedType = String(file.type || "").toLowerCase();
    const lowerName = String(file.name || "").toLowerCase();
    if (
      lowerName.endsWith(".svg") ||
      normalizedType === "image/svg+xml" ||
      !ALLOWED_TYPES.includes(normalizedType)
    ) {
      setError(GENERIC_ERROR);
      event.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError(GENERIC_ERROR);
      event.target.value = "";
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!hasSupportedSignature(bytes)) {
        setError(GENERIC_ERROR);
        event.target.value = "";
        return;
      }
    } catch {
      setError(GENERIC_ERROR);
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      setError("Could not read image preview. Please try another file.");
    };
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Could not read image preview. Please try another file.");
        return;
      }
      onAvatarChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="soc-panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Profile Photo</h3>
          <p className="text-xs text-slate-400">
            Avatar preview is validated locally and stored per user in this browser until backend avatar storage is configured.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-2xl border border-cyan-400/20 bg-cyan-500/10">
          {currentAvatarUrl ? (
            <img src={currentAvatarUrl} alt="Profile avatar preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-cyan-200">
              <span className="text-lg font-bold">{initials}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="soc-button-ghost" onClick={handlePick} disabled={loading}>
            <ImagePlus className="h-4 w-4" />
            Upload photo
          </button>
          <button type="button" className="soc-button-ghost" onClick={onRemove} disabled={loading || !currentAvatarUrl}>
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <UserCircle2 className="h-4 w-4 text-cyan-300" />
          Allowed formats: PNG, JPG, WebP. Max size: 2MB.
        </div>
        <p className="mt-2">
          Avatar preview is validated locally and stored per user in this browser. Server-side image reprocessing is recommended for production.
        </p>
      </div>
    </section>
  );
}
