# 00 · Mapa Maestro del Sistema Integra v2

Este documento es la vista rápida de la **Metodología Integra Evolucionada v2** cuando se usa como plantilla de proyecto.
Sirve como mapa mental para cualquier agente (humano o IA) que entra por primera vez.

> Si solo lees un documento para entender “cómo funciona todo”, que sea este.

---

## 1. Capas de la arquitectura

Integra se organiza en cuatro capas principales:

1. **Principios y visión**  
   - `arquitectura_distribuida_v_1.md`  
   - Define el ecosistema (Google Workspace, GCP, IA), los roles (INTEGRA, SOFIA, GEMINI, DEBY, CRONISTA, FRANK) y el modelo de colaboración humano‑IA.

2. **Motor de proceso (metodología)**  
   - Carpeta `meta/`  
   - Contiene las reglas del juego:
     - `meta/sistema-estados.md` · Estados de las tareas (`[ ] [~] [/] [V] [R] [✓] [X] [!] [?]`)
     - `meta/soft-gates.md` · Puertas de calidad antes de marcar como `[✓]`
     - `meta/sistema-handoff.md` · Cómo se pasan tareas entre agentes
     - `meta/sistema-priorizacion.md` · Cómo se decide qué va primero
     - `meta/criterios_calidad.md`, `meta/SPEC-CODIGO.md` · Qué significa “bien hecho”
     - `meta/plantilla_SPEC.md`, `meta/plantilla-control.md`, `meta/plantilla-checkpoint-enriquecido.md` · Plantillas base
     - `meta/versionado-semantico.md` · Cómo versionar cambios

3. **Contexto del proyecto**  
   - Carpeta `context/`  
   - Aquí vive todo lo específico de un proyecto:
     - `context/SPEC-SEGURIDAD.md` · Reglas de seguridad
     - `context/SPEC-TESTING.md` · Estrategia de pruebas
     - `context/decisions/*.md` · ADRs (Architecture Decision Records)
   - En un proyecto real, aquí también se añaden SPECs funcionales y técnicos específicos.

4. **Tooling y automatización**  
   - Carpeta `templates/` · Plantillas listas para instanciar (por ejemplo, `templates/PROYECTO-template.md`)  
   - Carpeta `scripts/` · Scripts de soporte (por ejemplo, `scripts/generate-dashboard.js`)  
   - Otros archivos de raíz (`README.md`, `ONBOARDING.md`) completan la experiencia de uso.

Diagrama mermaid de estas capas:

```mermaid
graph TD
  A[Principios y visión<br/>arquitectura_distribuida_v_1.md] --> B[Motor de proceso<br/>meta/]
  B --> C[Contexto de proyecto<br/>context/]
  B --> D[Tooling y automatización<br/>templates/ + scripts/]
  C --> E[PROYECTO.md<br/>(backlog y estados)]
```

---

## 2. Estructura de carpetas y rol

- `README.md`  
  - Explica qué es Integra v2, roles de IA y cómo usar la plantilla.

- `ONBOARDING.md`  
  - Guía rápida para que un agente nuevo se ponga operativo.

- `arquitectura_distribuida_v_1.md`  
  - Diseño de alto nivel: ecosistema Google, orquestación de agentes, visión distribuida.

- `meta/`  
  - Todas las **reglas, estándares y plantillas** de la metodología.
  - No debería contener información de proyectos concretos; solo normas reutilizables.

- `context/`  
  - Contexto del **proyecto actual** (SPECs, ADRs, decisiones de negocio/técnicas).
  - Al usar esta plantilla para un nuevo proyecto, se crean aquí los SPECs propios.

- `templates/`  
  - Plantillas neutras para instanciar en cada nuevo proyecto:
    - `templates/PROYECTO-template.md` → se copia/renombra a `PROYECTO.md`
    - `templates/.gitignore.template` → `.gitignore`
    - `templates/.env.example.template` → `.env.example`

- `scripts/`  
  - Automatizaciones relacionadas con la metodología:
    - `scripts/generate-dashboard.js` genera un dashboard a partir de `PROYECTO.md`.

---

## 3. Roles y responsabilidades (resumen)

Para el detalle completo ver `README.md`, pero a nivel de sistema:

- **FRANK (Director humano)**  
  - Define dirección del proyecto y criterios de aceptación.  
  - Tiene la última palabra en `[X] Aprobado`.

La Metodología INTEGRA v2.0 utiliza **5 agentes especializados**. Ver documentación completa en `meta/AGENTES.md`.

-   **INTEGRA** inicia y organiza tareas en PROYECTO.md, crea SPECs y define arquitectura.
-   **SOFIA** ejecuta construcción de código, tests y documentación según SPECs.
-   **GEMINI** revisa calidad, infraestructura y seguridad. Puede devolver a SOFIA si no cumple Soft Gates.
-   **DEBY** interviene cuando hay bugs complejos, genera dictámenes técnicos con trazabilidad total.
-   **CRONISTA** mantiene PROYECTO.md actualizado con estados y notas claras.
-   **FRANK** valida entregables finales y otorga aprobación.

---

## 4. Ciclo de vida de una tarea (vista rápida)

Flujo normal de una tarea en `PROYECTO.md`:

1.  **[ ] Pendiente** · La tarea existe, pero sin diseño detallado.
2.  **[~] Planificado** · INTEGRA genera SPEC y define alcance.
3.  **[/] En Progreso** · SOFIA implementa según SPEC.
4.  **[V] En Validación** · Se ejecutan compilación, tests y checks técnicos.
5.  **[R] En Revisión** · GEMINI revisa código y documentación.
6.  **[✓] Completado** · Todos los Soft Gates pasados, checkpoint generado.
7.  **[X] Aprobado** · Frank valida y aprueba oficialmente.

Estados especiales:
- **[?] Necesita Clarificación** · Faltan decisiones o requisitos claros.

Las reglas completas están en `meta/sistema-estados.md` y `meta/soft-gates.md`.

---

## 5. Cómo usar esta plantilla como base

Cuando creas un nuevo proyecto con Integra v2:

1. **Copiar estructura base**  
   - Copia este repositorio como base del nuevo proyecto.

2. **Instanciar plantillas**  
   - Desde `templates/` crea:
     - `PROYECTO.md` a partir de `templates/PROYECTO-template.md`
     - `.gitignore` a partir de `templates/.gitignore.template`
     - `.env.example` a partir de `templates/.env.example.template`

3. **Configurar contexto de proyecto**  
   - Rellena/ajusta SPECs en `context/` (seguridad, testing y los específicos del producto).
   - Registra decisiones técnicas relevantes en `context/decisions/`.

4. **Cargar a los agentes de IA**  
   - Para CODEX y Gemini Code Assist, carga como contexto:
     - `arquitectura_distribuida_v_1.md`
     - `meta/sistema-estados.md`
     - `meta/soft-gates.md`
     - `meta/SPEC-CODIGO.md`
     - `PROYECTO.md` (cuando exista).

5. **Mantener disciplina mínima**  
   - Actualiza siempre el estado de las tareas.  
   - Usa los Soft Gates antes de marcar `[✓]`.  
   - Genera checkpoints cuando cierres tareas importantes.

Con este mapa maestro, cualquier agente debería poder ubicarse rápidamente en la metodología y saber qué documento abrir para cada tipo de decisión.
