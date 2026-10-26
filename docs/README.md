# Goats Store documentation / Documentación

Documentation version **2.0**, reviewed **26 October 2026**.
Versión documental **2.0**, revisada el **26 de octubre de 2026**.

The English and Spanish manuals describe application source `22cd272` on `password-reset`.
Las dos ediciones describen el código `22cd272` de la rama `password-reset`.

- `goat-store-en.md`: English master source.
- `goat-store-es.md`: fuente maestra en español.
- `../scripts/build-documentation.py`: editable DOCX generator; no application runtime dependency.

To regenerate / Para regenerar:

```sh
python -m pip install python-docx
python scripts/build-documentation.py --output-dir docs/exports
```

Both Word files are directly editable. For reproducible releases, keep Markdown masters synchronized, update version/date/source commit in the masters and generator, regenerate, and inspect exported pages before publication. The contents page uses internal section links; Word's navigation pane also recognizes the headings. Page-number fields update in compatible editors.

Ambos Word son editables. Para versiones reproducibles, sincroniza los Markdown, actualiza versión/fecha/commit en las fuentes y generador, regenera y revisa las páginas antes de publicar. El contenido tiene enlaces internos y los títulos aparecen en el panel de navegación de Word.

Do not place real credentials, private platform accesses or customer records in documentation. Application configuration and documentation examples are separate. Supabase and Neon are alternative PostgreSQL providers; this manual does not require using both or claim to verify current production settings.

Published editable files are stored in `exports/`: `Goat_Store_Documentation_EN.docx` and `Goat_Store_Documentacion_ES.docx`. The source ZIP contains both Markdown masters and the generator. To update the published files, run the generator with `--output-dir docs/exports`.

Los archivos Word publicados se encuentran en `exports/`. El ZIP incluye las fuentes de ambas ediciones y el generador para futuras revisiones.

This revision covers public shopping, department carousels, courses and personalized listings, direct checkout, sales/client administration, shared streaming profiles, whole-account inventory, numeric identifiers, AVIF/server compression, and deployment/schema incident procedures. It documents source behavior, not independently verified live provider configuration.

Esta edición cubre compras públicas, carruseles, cursos y personalizados, compra directa, administración de ventas/clientes, perfiles compartidos, cuentas completas, IDs numéricos, AVIF/compresión y diagnóstico de despliegue/esquema. Describe el código, no una verificación independiente de proveedores en producción.
