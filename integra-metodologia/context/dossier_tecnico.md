# Dossier Técnico: [Nombre del Proyecto]

**Última actualización:** YYYY-MM-DD  
**Responsable:** INTEGRA

---

## 1. Visión General

### 1.1 Descripción del Proyecto
[Qué es y para qué sirve]

### 1.2 Objetivos de Negocio
- [Objetivo 1]
- [Objetivo 2]

### 1.3 Stack Tecnológico
| Capa | Tecnología |
|------|------------|
| Frontend | Next.js + React + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes |
| Base de Datos | Firebase Firestore |
| Autenticación | Firebase Auth |
| Hosting | Vercel |

---

## 2. Arquitectura

### 2.1 Diagrama de Alto Nivel
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────►│   Next.js   │────►│  Firebase   │
│   (Web)     │     │   (Vercel)  │     │  (GCP)      │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 2.2 Estructura de Carpetas
```
proyecto/
├── apps/
│   └── web/           # Aplicación Next.js
├── packages/
│   └── core/          # Lógica compartida
├── context/           # Documentación técnica
├── Checkpoints/       # Puntos de control
└── meta/              # Estándares
```

---

## 3. Decisiones Arquitectónicas

### 3.1 Registro de ADRs
| ID | Título | Estado | Fecha |
|----|--------|--------|-------|
| ADR-001 | [Título] | Aceptado | YYYY-MM-DD |

### 3.2 Decisiones Clave
- **[Decisión 1]:** [Justificación breve]

---

## 4. Seguridad

### 4.1 Autenticación
[Cómo funciona]

### 4.2 Autorización (Roles)
| Rol | Permisos |
|-----|----------|
| admin | Todo |
| empleado | CRUD operativo |
| cliente | Solo lectura |

### 4.3 Secretos
- Gestionados vía variables de entorno
- Nunca en repositorio
- `.env.example` como referencia

---

## 5. Integraciones

| Servicio | Propósito | Estado |
|----------|-----------|--------|
| Firebase | DB + Auth | ✅ Activo |
| Vercel | Hosting | ✅ Activo |

---

## 6. Entornos

| Entorno | URL | Branch |
|---------|-----|--------|
| Production | https://app.ejemplo.com | main |
| Preview | https://preview.ejemplo.com | PR branches |
| Local | http://localhost:3000 | - |

---

## 7. Comandos Útiles

```bash
# Desarrollo
pnpm install
pnpm dev

# Build
pnpm build

# Tests
pnpm test

# Lint
pnpm lint
```

---

## 8. Registro de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| YYYY-MM-DD | Documento inicial | INTEGRA |

---

*Dossier generado bajo Metodología INTEGRA v2.1.1*
