"use client";

import { useMemo, useState, type ChangeEvent, type PointerEvent } from "react";
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

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
} | null;

const initialState: UploadState = {
  loading: false,
  error: null,
  message: null
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const CROP_SIZE = 512;
const PREVIEW_SIZE = 260;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProfilePhotoUploader({ currentUrl, name, roleLabel }: ProfilePhotoUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState(currentUrl);
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragState, setDragState] = useState<DragState>(null);
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

  function preparePhoto(event: ChangeEvent<HTMLInputElement>) {
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

    if (editorImageUrl) {
      URL.revokeObjectURL(editorImageUrl);
    }

    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setEditorImageUrl(URL.createObjectURL(file));
    setState({ loading: false, error: null, message: null });
    event.target.value = "";
  }

  function closeEditor() {
    if (state.loading) return;

    if (editorImageUrl) {
      URL.revokeObjectURL(editorImageUrl);
    }

    setEditorImageUrl(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setDragState(null);
  }

  async function uploadCroppedPhoto() {
    if (!editorImageUrl) return;

    setState({ loading: true, error: null, message: null });

    try {
      const photoBlob = await cropImage(editorImageUrl, zoom, offsetX, offsetY);
      const formData = new FormData();
      formData.append("photo", photoBlob, "profile-photo.png");

      const response = await fetch("/api/dashboard/profile-photo", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as { photoUrl?: string; error?: string };

      if (!response.ok || !data.photoUrl) {
        throw new Error(data.error ?? "No se pudo guardar la foto.");
      }

      setPhotoUrl(data.photoUrl);
      URL.revokeObjectURL(editorImageUrl);
      setEditorImageUrl(null);
      setState({ loading: false, error: null, message: "Foto actualizada." });
      router.refresh();
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "No se pudo guardar la foto.",
        message: null
      });
    }
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (state.loading) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offsetX,
      originY: offsetY
    });
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    setOffsetX(clamp(dragState.originX + event.clientX - dragState.startX, -110, 110));
    setOffsetY(clamp(dragState.originY + event.clientY - dragState.startY, -110, 110));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragState?.pointerId === event.pointerId) {
      setDragState(null);
    }
  }

  return (
    <article className="dashboard-card profile-photo-card">
      <div className="profile-photo-frame" aria-hidden="true">
        {photoUrl ? <img src={photoUrl} alt="" /> : <span>{initials || "TV"}</span>}
      </div>

      <div className="profile-photo-copy">
        <p className="eyebrow">{roleLabel}</p>
        <h2>{name}</h2>
      </div>

      <label className={`photo-upload-button ${state.loading ? "disabled" : ""}`}>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={preparePhoto} disabled={state.loading} />
        {photoUrl ? "Cambiar foto" : "Subir foto"}
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.message ? <p className="form-success">{state.message}</p> : null}

      {editorImageUrl ? (
        <div className="modal-backdrop" role="presentation">
          <section className="action-modal photo-editor-modal" role="dialog" aria-modal="true" aria-labelledby="photo-editor-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Foto de perfil</p>
                <h2 id="photo-editor-title">Encuadrar foto</h2>
              </div>
              <button className="modal-close" type="button" onClick={closeEditor} disabled={state.loading} aria-label="Cerrar">
                ×
              </button>
            </div>

            <div
              className={`photo-crop-preview ${dragState ? "dragging" : ""}`}
              aria-label="Vista previa del encuadre"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={endDrag}
            >
              <img className="photo-crop-backdrop" src={editorImageUrl} alt="" />
              <img
                className="photo-crop-foreground"
                src={editorImageUrl}
                alt=""
                style={{
                  transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${zoom})`
                }}
              />
            </div>
            <p className="photo-editor-hint">Arrastrá la foto para acomodarla dentro del círculo.</p>

            <div className="photo-editor-controls">
              <div>
                <span>Zoom</span>
                <div className="photo-zoom-buttons" aria-label="Zoom">
                  <button type="button" onClick={() => setZoom((current) => clamp(Number((current - 0.1).toFixed(2)), 1, 2.4))} disabled={state.loading || zoom <= 1}>
                    −
                  </button>
                  <strong>{Math.round(zoom * 100)}%</strong>
                  <button type="button" onClick={() => setZoom((current) => clamp(Number((current + 0.1).toFixed(2)), 1, 2.4))} disabled={state.loading || zoom >= 2.4}>
                    +
                  </button>
                </div>
              </div>
            </div>

            {state.error ? <p className="form-error">{state.error}</p> : null}
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={closeEditor} disabled={state.loading}>
                Elegir otra
              </button>
              <button className="primary-button" type="button" onClick={uploadCroppedPhoto} disabled={state.loading}>
                {state.loading ? "Guardando..." : "Usar foto"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function cropImage(imageUrl: string, zoom: number, offsetX: number, offsetY: number) {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = CROP_SIZE;
  canvas.height = CROP_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No se pudo preparar la imagen.");
  }

  context.clearRect(0, 0, CROP_SIZE, CROP_SIZE);

  const baseScale = Math.max(CROP_SIZE / image.naturalWidth, CROP_SIZE / image.naturalHeight);
  const scale = baseScale * zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const previewRatio = CROP_SIZE / PREVIEW_SIZE;
  const drawX = (CROP_SIZE - drawWidth) / 2 + offsetX * previewRatio;
  const drawY = (CROP_SIZE - drawHeight) / 2 + offsetY * previewRatio;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("No se pudo preparar la imagen."));
        }
      },
      "image/png"
    );
  });
}

function loadImage(imageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la imagen."));
    image.src = imageUrl;
  });
}
