# Registro de instrumentos

Aplicación web para cargar y consultar instrumentos. Cada registro guarda el nombre de quien lo carga, el instrumento, el número de parte, el número de serie y una foto.

## Desarrollo local

Necesitás Node.js 20 o superior y npm. Instalá las dependencias y copiá `.env.example` a `.env.local` con los valores de tus servicios:

```bash
npm install
npm run dev
```

## Vercel

1. Importá este repositorio como un proyecto en Vercel.
2. Desde **Storage**, conectá una base Postgres compatible con Vercel y creá un Blob Store.
3. Confirmá que el proyecto tenga las variables `POSTGRES_URL` y `BLOB_READ_WRITE_TOKEN`. Las integraciones de Vercel pueden agregarlas al proyecto automáticamente; para desarrollo local, copiá sus valores a `.env.local`.
4. Desplegá el proyecto. La tabla `instruments` se crea automáticamente al consultar o guardar el primer registro.

Las fotos se guardan en Vercel Blob con acceso público para poder mostrarlas en el inventario. Se aceptan imágenes JPG, PNG o WebP de hasta 4 MB. El campo de persona que carga es un nombre informado en el formulario; no representa una sesión autenticada.