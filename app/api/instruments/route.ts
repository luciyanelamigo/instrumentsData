import { del, put } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const maxPhotoSize = 4 * 1024 * 1024;
const imageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS instruments (
      id SERIAL PRIMARY KEY,
      uploader_name VARCHAR(120) NOT NULL,
      instrument_name VARCHAR(160) NOT NULL,
      part_number VARCHAR(100) NOT NULL,
      serial_number VARCHAR(100) NOT NULL,
      photo_url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const { rows } = await sql`
      SELECT id, uploader_name, instrument_name, part_number, serial_number, photo_url, created_at
      FROM instruments
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ instruments: rows });
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con la base de datos. Revisá la configuración de Vercel." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let photoUrl: string | undefined;
  try {
    const form = await request.formData();
    const uploader = String(form.get("uploader") ?? "").trim();
    const instrument = String(form.get("instrument") ?? "").trim();
    const partNumber = String(form.get("partNumber") ?? "").trim();
    const serialNumber = String(form.get("serialNumber") ?? "").trim();
    const photo = form.get("photo");

    if (!uploader || !instrument || !partNumber || !serialNumber) {
      return NextResponse.json({ error: "Completá todos los campos obligatorios." }, { status: 400 });
    }
    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: "Seleccioná una foto del instrumento." }, { status: 400 });
    }
    if (!imageTypes[photo.type]) {
      return NextResponse.json({ error: "La foto debe estar en formato JPG, PNG o WebP." }, { status: 400 });
    }
    if (photo.size > maxPhotoSize) {
      return NextResponse.json({ error: "La foto debe pesar menos de 4 MB." }, { status: 400 });
    }
    if (uploader.length > 120 || instrument.length > 160 || partNumber.length > 100 || serialNumber.length > 100) {
      return NextResponse.json({ error: "Uno o más campos superan el largo permitido." }, { status: 400 });
    }

    await ensureTable();
    const blob = await put(`instruments/${crypto.randomUUID()}.${imageTypes[photo.type]}`, photo, {
      access: "public",
      contentType: photo.type,
    });
    photoUrl = blob.url;

    const { rows } = await sql`
      INSERT INTO instruments (uploader_name, instrument_name, part_number, serial_number, photo_url)
      VALUES (${uploader}, ${instrument}, ${partNumber}, ${serialNumber}, ${photoUrl})
      RETURNING id, uploader_name, instrument_name, part_number, serial_number, photo_url, created_at
    `;
    return NextResponse.json({ instrument: rows[0] }, { status: 201 });
  } catch {
    if (photoUrl) {
      try {
        await del(photoUrl);
      } catch {
        // Keep the original failure response if Blob cleanup also fails.
      }
    }
    return NextResponse.json(
      { error: "No se pudo guardar el instrumento. Revisá las conexiones de Postgres y Blob en Vercel." },
      { status: 503 },
    );
  }
}