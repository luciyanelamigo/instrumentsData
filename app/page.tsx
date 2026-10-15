"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type Instrument = {
  id: number;
  uploader_name: string;
  instrument_name: string;
  part_number: string;
  serial_number: string;
  photo_url: string;
  created_at: string;
};

const MAX_PHOTO_SIZE = 4 * 1024 * 1024;

export default function Home() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/instruments", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el inventario.");
        if (active) {
          setInstruments(data.instruments);
          setError("");
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el inventario.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadCount]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setNotice("");
    if (!file) {
      setPhotoPreview("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      event.target.value = "";
      setPhotoPreview("");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setError("La foto debe pesar menos de 5 MB.");
      event.target.value = "";
      setPhotoPreview("");
      return;
    }
    setError("");
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/instruments", {
        method: "POST",
        body: new FormData(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el instrumento.");
      setInstruments((current) => [data.instrument, ...current]);
      form.reset();
      setPhotoPreview("");
      setNotice("Instrumento guardado correctamente.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el instrumento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Registro de instrumentos, inicio">
          <span className="brand-mark" aria-hidden="true">I</span>
          <span>Instrumentos<span className="brand-light"> / Registro</span></span>
        </a>
        <span className="topbar-note"><span className="status-dot" /> Inventario</span>
      </header>

      <section className="intro" id="inicio">
        <div>
          <p className="eyebrow">CONTROL DE ACTIVOS <span>·</span> 01</p>
          <h1>Registro de<br /><em>instrumentos.</em></h1>
          <p className="intro-copy">Identificá cada pieza y mantené su información a mano.</p>
        </div>
        <div className="intro-stamp" aria-hidden="true">
          <span>COLECCIÓN</span>
          <strong>{String(instruments.length).padStart(2, "0")}</strong>
          <span>REGISTROS</span>
        </div>
      </section>

      <section className="workspace" aria-label="Carga y listado de instrumentos">
        <div className="form-panel">
          <div className="section-heading">
            <span className="section-number">01</span>
            <div><h2>Nuevo instrumento</h2><p>Completá los datos de identificación.</p></div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Persona que carga <b>*</b></span>
              <input name="uploader" autoComplete="name" placeholder="Nombre y apellido" required maxLength={120} />
            </label>
            <label className="field">
              <span>Nombre del instrumento <b>*</b></span>
              <input name="instrument" placeholder="Ej. Guitarra acústica" required maxLength={160} />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Nro. de parte <b>*</b></span>
                <input name="partNumber" placeholder="Ej. GD-204" required maxLength={100} />
              </label>
              <label className="field">
                <span>Nro. de serie <b>*</b></span>
                <input name="serialNumber" placeholder="Ej. SN-008451" required maxLength={100} />
              </label>
            </div>
            <div className="field photo-field">
              <span>Foto del instrumento <b>*</b></span>
              <label className={`photo-drop${photoPreview ? " has-photo" : ""}`}>
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Vista previa del instrumento" />
                ) : (
                  <>
                    <span className="upload-icon" aria-hidden="true">+</span>
                    <span className="upload-title">Elegir una foto</span>
                    <span className="upload-hint">JPG, PNG o WebP · máximo 4 MB</span>
                  </>
                )}
                <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={handlePhotoChange} />
              </label>
            </div>

            {error && <p className="feedback error" role="alert">{error}</p>}
            {notice && <p className="feedback success" role="status">{notice}</p>}
            <button className="submit-button" type="submit" disabled={saving}>
              <span>{saving ? "Guardando..." : "Guardar instrumento"}</span>
              <span aria-hidden="true">↗</span>
            </button>
          </form>
        </div>

        <div className="list-panel">
          <div className="section-heading list-heading">
            <span className="section-number">02</span>
            <div><h2>Inventario</h2><p>{loading ? "Consultando registros..." : `${instruments.length} ${instruments.length === 1 ? "instrumento" : "instrumentos"} registrados`}</p></div>
              <button className="refresh-button" type="button" onClick={() => { setLoading(true); setReloadCount((count) => count + 1); }} aria-label="Actualizar inventario" title="Actualizar inventario">↻</button>
          </div>

          {instruments.length > 0 ? (
            <div className="instrument-list">
              {instruments.map((instrument) => (
                <article className="instrument-item" key={instrument.id}>
                  <div className="instrument-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={instrument.photo_url} alt={instrument.instrument_name} />
                  </div>
                  <div className="instrument-info">
                    <h3>{instrument.instrument_name}</h3>
                    <p>Parte <strong>{instrument.part_number}</strong><span>·</span> Serie <strong>{instrument.serial_number}</strong></p>
                    <p className="instrument-uploader">Cargado por {instrument.uploader_name}</p>
                  </div>
                  <time dateTime={instrument.created_at}>{new Date(instrument.created_at).toLocaleDateString("es-AR")}</time>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-mark" aria-hidden="true">I</span>
              <p>{loading ? "Cargando inventario..." : error ? "No se pudo conectar con el inventario." : "Todavía no hay instrumentos."}</p>
              {!loading && !error && <span>El primer registro aparecerá acá.</span>}
            </div>
          )}
        </div>
      </section>
      <footer><span>REGISTRO DE INSTRUMENTOS</span><span>GESTIÓN DE INVENTARIO</span></footer>
    </main>
  );
}