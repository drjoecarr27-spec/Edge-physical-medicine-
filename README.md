# EDGE visual preview

Independent visual-only copy of the owner's public site. The original Vercel deployment is not modified.

The Docker build snapshots public pages, CSS, JavaScript, fonts and images. English text is validated before/after style injection by SHA-256. Original HTML and scripts remain unchanged apart from the added visual stylesheet and page-tools script. The first chapter's two image paths serve a bundled, AI-created Toyota Corolla illustration with minor front-left damage instead of the original BMW image. No manufacturer advertising images are used.

`node server.mjs --snapshot` prepares a snapshot. `node server.mjs` serves it on `PORT` or 8080. No npm dependencies. `/health` and `/_edge/audit.json` report the actual snapshot. Resources not discovered at build time can be read from the original public host. POST and API endpoints are not relayed; this is a visual preview, not a patient-data collection service.

Language tools offer optional external Google machine translation; English remains the original. No patient data is sent to translation services by this application. Translation quality is not clinically certified.

Image downloads use the previous deployment's durable image path first; a temporary upload URL is the initial bootstrap fallback. Preserve the bundled image when migrating to a different host. `index.html` is the earlier incomplete prototype and is NOT served by the new Docker application.
