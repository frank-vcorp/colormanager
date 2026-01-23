# Stack Tecnológico - Metodología INTEGRA v2.1.1

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Principio Rector:** Empezar con capa gratuita, escalar según demanda

---

## 🎯 Filosofía de Selección de Tecnologías

### Principio de Capa Gratuita Primero

> **"Empezamos gratis, crecemos cuando el uso lo demanda"**

**Criterios de selección:**
1. ✅ **Capa gratuita robusta** - Suficiente para MVP y validación
2. ✅ **Escalabilidad clara** - Path de crecimiento bien definido
3. ✅ **Sin vendor lock-in** - Posibilidad de migrar si es necesario
4. ✅ **Comunidad activa** - Documentación y soporte disponible
5. ✅ **Integración con ecosistema** - Compatible con Google Cloud y herramientas existentes

### Principio del Cañón y la Mosca 🪰💣

- Si algo puede hacerse en **Apps Script**, no se escala a **Cloud Run**
- Si basta con **Sheets o JSON local**, no se implementa una base de datos compleja
- Si basta con **Firestore**, no se usa PostgreSQL
- La herramienta más simple que resuelva el problema eficientemente

---

## 📦 Stack por Categoría

### 1. Lenguajes de Programación

#### TypeScript (Obligatorio)
- **Uso:** Frontend, Backend, Cloud Functions
- **Versión:** ≥ 5.0
- **Justificación:** Tipado fuerte, mejor DX, menos bugs en producción
- **Capa Gratuita:** N/A (lenguaje)
- **Configuración obligatoria:**
  - `strict: true`
  - Tipos explícitos en APIs públicas
  - ESLint configurado

#### Python (Opcional)
- **Uso:** Scripts, ML/AI, automatizaciones
- **Versión:** ≥ 3.11
- **Justificación:** Ecosistema de IA/ML, scripts rápidos
- **Capa Gratuita:** N/A (lenguaje)

---

### 2. Frontend

#### Next.js (Recomendado)
- **Uso:** Aplicaciones web modernas
- **Versión:** ≥ 14.0 (App Router)
- **Capa Gratuita:** ✅ Vercel (100 GB bandwidth, unlimited requests)
- **Escalabilidad:** Pro $20/mes → Enterprise custom
- **Justificación:** SSR, SSG, API routes, optimizaciones automáticas

**Alternativas:**
- **Vite + React:** Para SPAs simples
- **Astro:** Para sitios de contenido
- **Remix:** Para apps con mucha interacción de datos

#### Styling

**TailwindCSS (Recomendado)**
- **Versión:** ≥ 3.4
- **Justificación:** Utility-first, DX excelente, bundle pequeño
- **Capa Gratuita:** ✅ Open source

**Alternativas:**
- **Vanilla CSS:** Para proyectos pequeños
- **shadcn/ui:** Componentes pre-hechos con Tailwind

---

### 3. Backend y APIs

#### Node.js + Express/Fastify
- **Uso:** APIs REST, microservicios
- **Versión:** Node ≥ 20 LTS
- **Capa Gratuita:** ✅ Render (750 hrs/mes), Railway ($5 crédito/mes)
- **Escalabilidad:** Render Pro $7/mes → Railway Pro $20/mes

#### Firebase Cloud Functions
- **Uso:** Serverless functions, triggers
- **Capa Gratuita:** ✅ 2M invocaciones/mes, 400K GB-s, 200K CPU-s
- **Escalabilidad:** Pay-as-you-go después de límite
- **Justificación:** Integración nativa con Firestore, Auth, Storage

---

### 4. Bases de Datos

#### Firestore (Recomendado para MVP)
- **Uso:** Base de datos NoSQL, tiempo real
- **Capa Gratuita:** ✅ 1 GB storage, 50K reads/day, 20K writes/day
- **Escalabilidad:** Pay-as-you-go ($0.18/GB, $0.06/100K reads)
- **Justificación:** 
  - Tiempo real out-of-the-box
  - Integración con Firebase Auth
  - Offline support
  - Security rules declarativas

#### Railway PostgreSQL (Recomendado para SQL)
- **Uso:** Bases de datos relacionales
- **Capa Gratuita:** ✅ $5 crédito/mes (suficiente para desarrollo)
- **Escalabilidad:** 
  - Hobby: $5/mes (512 MB RAM, 1 GB storage)
  - Pro: $20/mes (8 GB RAM, 100 GB storage)
- **Justificación:**
  - PostgreSQL completo
  - Backups automáticos
  - Deploy en segundos
  - Métricas incluidas

**Alternativas SQL:**
- **Supabase:** PostgreSQL + Auth + Storage (500 MB, 2 GB bandwidth gratis)
- **PlanetScale:** MySQL serverless (5 GB storage, 1B row reads/mes gratis)
- **Neon:** PostgreSQL serverless (3 GB storage gratis)

#### MongoDB Atlas (Alternativa NoSQL)
- **Capa Gratuita:** ✅ 512 MB storage, shared cluster
- **Escalabilidad:** Dedicated $57/mes
- **Justificación:** Flexible schema, buena para prototipos

---

### 5. Autenticación

#### Firebase Auth (Recomendado)
- **Capa Gratuita:** ✅ Ilimitado (solo pagas por SMS/phone auth)
- **Escalabilidad:** Pay-as-you-go para SMS
- **Justificación:**
  - Email/password, Google, GitHub, etc.
  - Integración nativa con Firestore
  - JWT tokens automáticos
  - MFA incluido

**Alternativas:**
- **Clerk:** UI pre-hecha, $25/mes después de 10K MAU
- **Auth0:** 7K MAU gratis, $35/mes después
- **Supabase Auth:** Incluido con Supabase DB

---

### 6. Storage y CDN

#### Firebase Storage
- **Capa Gratuita:** ✅ 5 GB storage, 1 GB/day download
- **Escalabilidad:** $0.026/GB storage, $0.12/GB download
- **Justificación:** Integración con Auth, security rules

#### Cloudflare R2 (Alternativa)
- **Capa Gratuita:** ✅ 10 GB storage, 1M Class A ops/mes
- **Escalabilidad:** $0.015/GB (más barato que S3)
- **Justificación:** Sin costos de egress

---

### 7. Hosting y Deployment

#### Vercel (Frontend)
- **Capa Gratuita:** ✅ 100 GB bandwidth, unlimited requests
- **Escalabilidad:** Pro $20/mes (1 TB bandwidth)
- **Justificación:**
  - Deploy automático desde GitHub
  - Preview deployments
  - Edge functions
  - Analytics incluido

#### Render (Backend/APIs)
- **Capa Gratuita:** ✅ 750 hrs/mes (suficiente para 1 servicio 24/7)
- **Escalabilidad:** Starter $7/mes (sin sleep)
- **Justificación:**
  - Deploy desde GitHub
  - Auto-scaling
  - Health checks
  - Logs persistentes

#### Railway (Full-stack)
- **Capa Gratuita:** ✅ $5 crédito/mes
- **Escalabilidad:** Hobby $5/mes, Pro $20/mes
- **Justificación:**
  - Deploy de DB + Backend en un solo lugar
  - Métricas en tiempo real
  - Rollbacks fáciles
  - Variables de entorno por ambiente

#### Hostinger (WordPress/Drupal/Opigno)
- **Uso:** CMS tradicionales, LMS
- **Capa Gratuita:** ❌ Desde $2.99/mes
- **Justificación:** 
  - Soporte PHP
  - cPanel incluido
  - Email incluido
  - Buen rendimiento para WordPress

---

### 8. Google Cloud Platform (GCP)

#### Cloud Functions
- **Capa Gratuita:** ✅ 2M invocaciones/mes
- **Uso:** Serverless functions, triggers

#### Cloud Run
- **Capa Gratuita:** ✅ 2M requests/mes, 360K GB-s
- **Uso:** Containers serverless

#### Firestore
- **Ver sección Bases de Datos**

#### Secret Manager
- **Capa Gratuita:** ✅ 6 secrets gratis
- **Uso:** Manejo seguro de API keys

---

### 9. Herramientas de Desarrollo

#### VS Code
- **Capa Gratuita:** ✅ Open source
- **Extensiones recomendadas:**
  - Continue.dev (IA coding assistant)
  - ESLint
  - Prettier
  - GitLens
  - Error Lens

#### GitHub
- **Capa Gratuita:** ✅ Repos ilimitados, Actions 2K min/mes
- **Escalabilidad:** Team $4/user/mes
- **Uso:** Control de versiones, CI/CD

#### Continue.dev
- **Capa Gratuita:** ✅ Open source
- **Uso:** Contexto compartido entre agentes IA

---

### 10. Monitoreo y Analytics

#### Vercel Analytics
- **Capa Gratuita:** ✅ Incluido en Vercel
- **Uso:** Web vitals, performance

#### Sentry (Errors)
- **Capa Gratuita:** ✅ 5K errors/mes
- **Escalabilidad:** Team $26/mes (50K errors)
- **Uso:** Error tracking, performance monitoring

#### Google Analytics 4
- **Capa Gratuita:** ✅ Ilimitado
- **Uso:** Analytics de usuarios

---

### 11. Comunicaciones

#### Twilio SendGrid (Email)
- **Capa Gratuita:** ✅ 100 emails/day
- **Escalabilidad:** Essentials $15/mes (50K emails)
- **Uso:** Emails transaccionales

#### Twilio (SMS/WhatsApp)
- **Capa Gratuita:** ✅ $15 crédito trial
- **Escalabilidad:** Pay-as-you-go ($0.0075/SMS)
- **Uso:** Notificaciones SMS, WhatsApp Business API

#### Resend (Alternativa Email)
- **Capa Gratuita:** ✅ 3K emails/mes
- **Escalabilidad:** Pro $20/mes (50K emails)
- **Justificación:** DX excelente, React Email

---

### 12. Integraciones y Automatización

#### Zapier
- **Capa Gratuita:** ✅ 100 tasks/mes
- **Escalabilidad:** Starter $20/mes (750 tasks)
- **Uso:** Automatizaciones sin código

#### Google Apps Script
- **Capa Gratuita:** ✅ Ilimitado
- **Uso:** Automatizaciones de Google Workspace

---

## 📊 Matriz de Decisión por Tipo de Proyecto

### Proyecto Pequeño (MVP, PoC)
```
Frontend: Vercel (Next.js)
Backend: Firebase Cloud Functions
DB: Firestore
Auth: Firebase Auth
Storage: Firebase Storage
Costo mensual: $0
```

### Proyecto Mediano (Startup, SaaS)
```
Frontend: Vercel Pro ($20)
Backend: Render Starter ($7) o Railway Hobby ($5)
DB: Railway PostgreSQL ($5) o Firestore pay-as-you-go
Auth: Firebase Auth o Clerk
Storage: Cloudflare R2
Costo mensual: ~$30-40
```

### Proyecto Grande (Empresa, Alto Tráfico)
```
Frontend: Vercel Team ($20/user)
Backend: Railway Pro ($20) o Cloud Run
DB: Railway Pro ($20) + Firestore
Auth: Clerk Pro o Auth0
Storage: Cloudflare R2 + CDN
Monitoring: Sentry Team ($26)
Costo mensual: ~$100-200
```

---

## ✅ Checklist de Selección de Tecnología

Antes de agregar una nueva tecnología al stack, verificar:

- [ ] ¿Tiene capa gratuita suficiente para MVP?
- [ ] ¿El path de escalabilidad es claro y razonable?
- [ ] ¿Se integra bien con el ecosistema actual (Google Cloud)?
- [ ] ¿La documentación es buena?
- [ ] ¿La comunidad es activa?
- [ ] ¿Hay alternativas más simples que resuelvan el problema?
- [ ] ¿Cumple con el principio del Cañón y la Mosca?

---

## 🚫 Tecnologías a Evitar

### Sin Capa Gratuita Adecuada
- AWS (complejo, sin capa gratuita generosa)
- Azure (complejo, orientado a enterprise)

### Vendor Lock-in Fuerte
- Herramientas propietarias sin exportación de datos
- Servicios sin API para migración

### Overkill para Proyectos Pequeños
- Kubernetes (usar Cloud Run en su lugar)
- Microservicios complejos (empezar monolito)
- Bases de datos distribuidas (empezar con PostgreSQL simple)

---

## 📈 Path de Escalamiento Típico

### Fase 1: MVP (0-1K usuarios)
- Vercel + Firebase (100% gratis)
- Costo: $0/mes

### Fase 2: Validación (1K-10K usuarios)
- Vercel + Railway Hobby + Firestore
- Costo: ~$30/mes

### Fase 3: Crecimiento (10K-100K usuarios)
- Vercel Pro + Railway Pro + Firestore + Monitoring
- Costo: ~$100-200/mes

### Fase 4: Escala (100K+ usuarios)
- Evaluación caso por caso
- Considerar Cloud Run, CDN dedicado, DB replicada
- Costo: $500+/mes

---

## 🔄 Proceso de Actualización del Stack

1. **Propuesta:** INTEGRA documenta en ADR la necesidad
2. **Evaluación:** Verificar checklist de selección
3. **Prueba:** PoC en proyecto de prueba
4. **Documentación:** Actualizar este documento
5. **Aprobación:** Frank valida
6. **Implementación:** SOFIA integra
7. **Revisión:** GEMINI valida seguridad e infraestructura

---

**Versión:** 1.0  
**Última Actualización:** 2025-12-26  
**Mantenido por:** Metodología INTEGRA v2.1.1
