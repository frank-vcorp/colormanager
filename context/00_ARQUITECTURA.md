# 🏗️ ARQUITECTURA DEL SISTEMA: COLOR MANAGER

**ID Documento:** ARCH-20260127-01
**Estado:** VIGENTE
**Ultima Actualización:** 2026-01-27

---

## 1. Visión Técnica
Color Manager es una aplicación de escritorio robusta diseñada como "Middleware Auditor" entre el software de formulación teórica (Sayer), el sistema administrativo (SICAR) y la realidad física del taller (Báscula/Operador).

**Principios de Diseño:**
*   **Local First:** Debe funcionar sin internet, con persistencia local robusta.
*   **Hardware Native:** Comunicación directa con puertos Seriales (Báscula) y USB (Impresoras).
*   **Proof-of-Life:** Nada se registra si no pesa; nada se pesa si no se escanea.

## 2. Stack Tecnológico

### Core Application
| Componente | Selección | Justificación |
|------------|-----------|---------------|
| **Runtime** | **Electron** | Acceso nativo a I/O (Serial, FS, Impresoras) en entorno Windows. |
| **Frontend** | **React** (v19+) | Librería UI reactiva para feedback inmediato en báscula. |
| **Build Tool** | **Vite** | Rapidez de desarrollo y build optimizado. |
| **Lenguaje** | **TypeScript** | Tipado estricto para lógica de negocio crítica (gramajes, costos). |

### Persistencia y Estado
| Componente | Selección | Justificación |
|------------|-----------|---------------|
| **Base de Datos Local** | **SQLite** (via Prisma) | Relacional, local, archivo único (`.db`), opera Offline. |
| **Base de Datos Cloud** | **PostgreSQL** (Railway) | Espejo en la nube para reportes web y consultas remotas. |
| **Sincronización** | **Sync Queue** | Cola de trabajos local que sube cambios a Nube cuando hay red. |
| **State Caching** | **TanStack Query** | Manejo de estado asíncrono y caché. |
| **Global State** | **Zustand** | Gestión ligera del estado de la "Sesión de Mezcla". |

### Interfaz (UI/UX)
| Componente | Selección | Justificación |
|------------|-----------|---------------|
| **Styling** | **TailwindCSS** | Desarrollo rápido y flexible. |
| **Componentes** | **Shadcn/UI** | Componentes accesibles y personalizables. |
| **Gráficos** | **Recharts** | Visualización de niveles y barras de progreso de peso. |

### Integración de Hardware (Node.js Modules)
| Hardware | Librería | Función |
|----------|----------|--------|
| **Báscula** | `serialport` | Lectura RS232 del flujo de datos de Mettler Toledo. |
| **Impresora** | `electron-pos-printer` | Envío de comandos ESC/POS o ZPL a Zebra/Dymo. |
| **Sayer** | `chokidar` | Watcher de sistema de archivos para interceptar "prints" (archivos de texto). |

## 3. Diagrama de Arquitectura (Conceptual - Híbrido)

```mermaid
graph TD
    subgraph "Taller (Local - Electron)"
        Watcher[File Watcher] -->|Detecta Archivo| Parser[Parser Recetas]
        Parser -->|JSON Receta| SessionMgr[Gestor de Sesión]
        
        Scale[Mettler Toledo] <-->|SerialPort| Weights[Gestor de Pesaje]
        Weights -->|Feed realtime| SessionMgr
        
        SessionMgr -->|R/W| SQLite[(SQLite DB)]
        
        SQLite -->|Change Events| SyncService[Servicio Sincronización]
    end
    
    subgraph "Nube (Railway & Vercel)"
        SyncService -.->|HTTPS / REST| APIGateway[API Ingesta]
        APIGateway -->|Write| Postgres[(PostgreSQL DB)]
        
        Postgres -->|Read| WebDash[Dashboard Admin (Next.js)]
        Admin((Admin)) -->|Consulta Reportes| WebDash
    end
```

## 4. Módulos Principales (Estructura de Código Propuesta)

```
src/
├── main/                 # Proceso Principal (Backend Local)
│   ├── database/         # Prisma Cliente (SQLite)
│   ├── sync/             # Lógica de replicación a Nube
│   ├── hardware/         # Drivers (Scale, Printer)
│   ├── services/         # Lógica de Negocio (SayerParser, FIFO)
│   └── ipc/              # Puentes de comunicación Main<->Renderer
├── renderer/             # Proceso de Renderizado (UI React)
│   ├── components/       # UI Kit
│   ├── features/
│   │   ├── mixing/       # Pantalla de Mezcla (Kiosco)
│   │   ├── inventory/    # Gestión de SKUs
│   │   └── admin/        # Dashboard & Config
│   └── stores/           # Zustand Stores
└── shared/               # Tipos compartidos
```

## 5. Estrategia de Migración de Datos (Sicar Update)
Para la integración con Sicar (CSV), se usará un patrón "Upsert":
1.  Leer CSV.
2.  Buscar SKU en DB.
3.  Si existe -> Actualizar Costo y Descripción.
4.  Si no existe -> Crear registro (con flag `needs_setup` para que admin defina densidades o detalles).
