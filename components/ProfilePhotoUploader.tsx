"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

type ProfilePhotoUploaderProps = {
  currentUrl: string | null;
  name: string;
  roleLabel: string;
};

type UploadState = {
  loading: boolean;
  error: string | null;
  message: string | null;
};

const initialState: UploadState = {
  loading: false,
  error: null,
  message: null
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProfilePhotoUploader({ currentUrl, name, roleLabel }: ProfilePhotoUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState(currentUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState(initialState);
  const router = useRouter();

  const initials = useMemo(() => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [name]);

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      setState({ loading: false, error: "La foto debe ser JPG, PNG o WebP.", message: null });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setState({ loading: false, error: "La foto no puede superar los 5 MB.", message: null });
      event.target.value = "";
      return;
    }

    setState({ loading: true, error: null, message: null });

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch("/api/dashboard/profile-photo", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as { photoUrl?: string; error?: string };

      if (!response.ok || !data.photoUrl) {
        throw new Error(data.error ?? "No se pudo guardar la foto.");
      }

      setPhotoUrl(data.photoUrl);
      setPreviewUrl(null);
      setState({ loading: false, error: null, message: "Foto actualizada." });
      router.refresh();
    } catch (error) {
      setPreviewUrl(null);
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "No se pudo guardar la foto.",
        message: null
      });
    } finally {
      event.target.value = "";
      URL.revokeObjectURL(localPreview);
    }
  }

  const visiblePhoto = previewUrl ?? photoUrl;

  return (
    <article className="dashboard-card profile-photo-card">
      <div className="profile-photo-frame" aria-hidden="true">
        {visiblePhoto ? <img src={visiblePhoto} alt="" /> : <span>{initials || "TV"}</span>}
      </div>

      <div className="profile-photo-copy">
        <p className="eyebrow">{roleLabel}</p>
        <h2>{name}</h2>
      </div>

      <label className={`photo-upload-button ${state.loading ? "disabled" : ""}`}>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={state.loading} />
        {state.loading ? "Subiendo..." : photoUrl ? "Cambiar foto" : "Subir foto"}
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.message ? <p className="form-success">{state.message}</p> : null}
    </article>
  );
}
