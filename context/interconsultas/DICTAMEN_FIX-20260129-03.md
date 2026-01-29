# DICTAMEN TÉCNICO: Prisma Client no encontrado en producción Electron

- **ID:** FIX-20260129-03
- **Fecha:** 2026-01-29
- **Solicitante:** Frank (Humano)
- **Estado:** ✅ VALIDADO

---

## A. Análisis de Causa Raíz

### Síntoma
```
Error: Cannot find module '.prisma/client/default'
at app.asar/node_modules/.prisma/client/default.js
```
El error ocurre al ejecutar el instalador `.exe` en Windows.

### Hallazgo Forense

1. **pnpm usa symlinks virtuales** - La estructura `node_modules/.prisma/client` es un symlink que apunta a `.pnpm/@prisma+client@X/node_modules/.prisma/client/`. Electron-builder no sigue correctamente estos symlinks.

2. **Query Engine binario no empaquetado** - El archivo `libquery_engine-*.so.node` (o `.dll.node` en Windows) tiene ~16MB y debe estar fuera del `.asar` para que Node.js nativo pueda cargarlo.

3. **Sin configuración `asarUnpack`** - Sin esta opción, electron-builder empaqueta todo dentro del `.asar`, pero los binarios nativos (`.node`) no pueden ejecutarse desde dentro.

4. **Falta `binaryTargets` en schema.prisma** - Por defecto, Prisma solo genera el engine para la plataforma actual (`native`), pero para cross-compilation se necesitan targets específicos.

### Causa
Combinación de:
- Empaquetado incorrecto de symlinks de pnpm
- Binarios nativos dentro del .asar
- Falta de Query Engine para plataforma target

---

## B. Justificación de la Solución

### Cambios Aplicados

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `prisma/schema.prisma` | Agregar `output` y `binaryTargets` | Control de ubicación y cross-platform |
| `package.json` | Agregar `extraResources` | Empaquetar Query Engine fuera de asar |
| `package.json` | Agregar `asarUnpack` | Extraer módulos nativos del asar |
| `package.json` | Agregar `postinstall` script | Auto-regenerar Prisma |
| `src/main/database/db.ts` | Configurar `PRISMA_QUERY_ENGINE_LIBRARY` | Resolver ruta del engine en producción |

### Configuración Final

#### schema.prisma
```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../node_modules/.prisma/client"
  binaryTargets = ["native", "debian-openssl-3.0.x", "windows", "linux-musl-openssl-3.0.x"]
}
```

#### package.json (build section)
```json
{
  "files": [
    "dist-electron/**/*",
    { "from": "dist-renderer", "to": "renderer", "filter": ["**/*"] },
    "prisma/**/*",
    "node_modules/.prisma/**/*",
    "node_modules/@prisma/client/**/*"
  ],
  "extraResources": [
    {
      "from": "node_modules/.prisma/client/",
      "to": "prisma-client",
      "filter": ["*.node", "schema.prisma"]
    }
  ],
  "asarUnpack": [
    "node_modules/.prisma/**/*",
    "**/libquery_engine*",
    "**/query_engine*"
  ]
}
```

#### db.ts - Resolución de paths
```typescript
function getPrismaEngineDirectory(): string {
  if (isDev()) {
    return path.join(process.cwd(), "node_modules", ".prisma", "client")
  }
  
  // En producción: buscar en resources/prisma-client o app.asar.unpacked
  const resourcesPath = process.resourcesPath
  const enginePath = path.join(resourcesPath, "prisma-client")
  const unpackedPath = path.join(resourcesPath, "app.asar.unpacked", "node_modules", ".prisma", "client")
  
  return fs.existsSync(enginePath) ? enginePath : unpackedPath
}
```

---

## C. Validación

```bash
# Regenerar cliente Prisma
$ pnpm prisma generate
✔ Generated Prisma Client (v5.22.0) to ./node_modules/.prisma/client

# Verificar binarios generados
$ ls node_modules/.prisma/client/*.node
libquery_engine-debian-openssl-3.0.x.so.node     # Linux
libquery_engine-linux-musl-openssl-3.0.x.so.node # Alpine/Docker
query_engine-windows.dll.node                     # Windows

# Compilar TypeScript
$ pnpm run build:main
✔ Sin errores
```

---

## D. Instrucciones Post-Fix

### Para Build de Producción
```bash
# 1. Regenerar Prisma con nuevos targets
pnpm prisma generate

# 2. Ejecutar build completo
pnpm run build

# 3. Verificar estructura en release/
ls -la release/linux-unpacked/resources/
# Debe incluir: prisma-client/ o app.asar.unpacked/
```

### Verificación en Instalador Windows
1. Buscar en `resources/prisma-client/`:
   - `query_engine-windows.dll.node`
   - `schema.prisma`
2. O en `resources/app.asar.unpacked/node_modules/.prisma/client/`

### Prevención Futura
- Ejecutar `pnpm prisma generate` después de cualquier cambio a `schema.prisma`
- El script `postinstall` lo hace automáticamente en `pnpm install`
- Antes de release, verificar que el `binaryTargets` incluya la plataforma destino

---

## E. Archivos Modificados

| Archivo | Tipo de Cambio |
|---------|----------------|
| `prisma/schema.prisma` | Agregar output y binaryTargets |
| `package.json` | Agregar extraResources, asarUnpack, postinstall |
| `src/main/database/db.ts` | Nueva lógica para resolver Query Engine en producción |

---

## F. Referencias

- [Prisma Electron Guide](https://www.prisma.io/docs/concepts/components/prisma-client/deployment#electron-and-similar-apps)
- [electron-builder asarUnpack](https://www.electron.build/configuration/configuration#Configuration-asarUnpack)
- [Prisma binaryTargets](https://www.prisma.io/docs/concepts/components/prisma-schema/generators#binary-targets)
