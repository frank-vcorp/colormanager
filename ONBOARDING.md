# Onboarding - Metodología INTEGRA v2 (Plantilla Neutra)

## 1. Bienvenida

Esta guía te ayuda a empezar a trabajar con la **Metodología INTEGRA Evolucionada v2** cuando la usas como plantilla en un proyecto nuevo.

Está pensada para:
- INTEGRA (arquitecto),
- SOFIA (constructora),
- GEMINI (infraestructura/QA),
- DEBY (debugger forense),
- CRONISTA (administrador),
- y Frank (director humano),
pero también sirve para cualquier otro desarrollador o IA que se sume al equipo.

El objetivo: que en menos de 1 hora tengas claro **qué documentos leer, cómo moverte entre ellos y cómo empezar a producir trabajo trazable**.

---

## 2. Orden de lectura recomendado

### Fase 1 · Entender el sistema (20–30 minutos)

1. `00-ARQUITECTURA-SISTEMA.md` (10 min)  
   - Mapa maestro de la metodología: capas, carpetas, flujo de tarea.

2. `README.md` (10–15 min)  
   - Visión general, novedades de v2, cómo usar la plantilla y roles.

3. `arquitectura_distribuida_v_1.md` (opcional, 10–20 min)  
   - Diseño detallado del sistema Integra: ecosistema Google, agentes y principios.

**Objetivo al terminar esta fase:**  
Saber “dónde vive cada cosa” y cómo se relacionan INTEGRA, SOFIA, GEMINI, DEBY, CRONISTA y Frank.

---

### Fase 2 · Reglas del juego (20–30 minutos)

4. `meta/sistema-estados.md` (10–15 min)  
   - Estados de tarea (`[ ] [~] [/] [V] [R] [✓] [X] [!] [?]`), quién mueve qué y cuándo.

5. `meta/soft-gates.md` (10–15 min)  
   - Puertas de calidad antes de llamar algo “[✓] Completado”.

6. `meta/SPEC-CODIGO.md` (10–15 min)  
   - Convenciones de código y criterios mínimos de calidad.

**Objetivo al terminar esta fase:**  
Poder leer cualquier línea de `PROYECTO.md` y entender exactamente **en qué estado está** y qué falta para avanzar.

---

### Fase 3 · Contexto y decisiones (opcional, 20–30 minutos)

7. `context/SPEC-SEGURIDAD.md`  
8. `context/SPEC-TESTING.md`  
9. `context/decisions/README.md` + `ADR-001-ejemplo-uso-pnpm.md`  
10. `meta/versionado-semantico.md`  

**Objetivo:**  
Ver cómo se documentan decisiones (ADR), seguridad, testing y versionado usando Integra.

En un proyecto nuevo, adaptarás estos archivos a tu contexto (stack, riesgos, reglas de calidad).

---

## 3. Estructura de carpetas de la metodología

Esta plantilla está pensada para usarse como carpeta `metodologia-integra/` dentro de tu proyecto, o como base de un repositorio dedicado a la metodología.

Estructura lógica:

```text
metodologia-integra/
├── 00-ARQUITECTURA-SISTEMA.md   # Mapa maestro (este es el índice mental)
├── README.md                    # Presentación y uso de la plantilla
├── arquitectura_distribuida_v_1.md
│
├── meta/                        # Reglas del juego (motor de proceso)
│   ├── sistema-estados.md
│   ├── soft-gates.md
│   ├── sistema-priorizacion.md
│   ├── sistema-handoff.md
│   ├── SPEC-CODIGO.md
│   ├── criterios_calidad.md
│   ├── plantilla_SPEC.md
│   ├── plantilla-control.md
│   ├── plantilla-checkpoint-enriquecido.md
│   └── versionado-semantico.md
│
├── context/                     # Contexto específico del proyecto
│   ├── SPEC-SEGURIDAD.md
│   ├── SPEC-TESTING.md
│   └── decisions/
│       ├── README.md
│       ├── ADR-TEMPLATE.md
│       └── ADR-001-ejemplo-uso-pnpm.md
│
├── templates/                   # Plantillas para instanciar en cada proyecto
│   ├── PROYECTO-template.md
│   ├── .gitignore.template
│   ├── .env.example.template
│   └── continuerc-template.json
│
└── scripts/                     # Automatización
    └── generate-dashboard.js
```

En tu proyecto real, además de esta carpeta tendrás tu código (api/, apps/, packages/, etc.). La metodología no impone un stack concreto; solo define **cómo** organizar el trabajo y la documentación.

---

## 4. Roles y cómo usar la plantilla

### Frank (Director humano)

- Define objetivos, prioridades y criterios de aceptación.
- Revisa entregables en lenguaje humano (no necesariamente código).
- Marca el cierre definitivo `[X]` en tareas importantes (vía CODEX).

Cómo usar esta plantilla como Frank:
- Leer `00-ARQUITECTURA-SISTEMA.md` y `README.md`.
- Revisar periódicamente `PROYECTO.md` (prioridades, estado de tareas).
- Exigir que las tareas importantes lleguen a `[✓]` solo pasando Soft Gates.

---

### INTEGRA (Arquitecto e implementador principal)

Responsabilidades principales:
- Diseñar y mantener `PROYECTO.md` actualizado.
- Crear y refinar SPECs (`meta/plantilla_SPEC.md` → `context/SPEC-*.md`).
- Coordinar con SOFIA (implementación) y GEMINI (revisión).

Checklist inicial para INTEGRA:
- Instanciar `templates/PROYECTO-template.md` como `PROYECTO.md` en la raíz del proyecto.
- Definir las primeras tareas en `PROYECTO.md` con sus estados y metadatos.
- Asegurarse de que `context/` contiene al menos:
  - Un SPEC de seguridad adaptado.
  - Un SPEC de testing adaptado.
- Acordar con Frank cómo se usarán los estados `[✓]` y `[X]` en ese proyecto.

---

### SOFIA (Constructora Principal)

Responsabilidades principales:
- Implementar código siguiendo `SPEC-CODIGO.md`.
- Crear checkpoints al completar bloques significativos.
- Actualizar estados en `PROYECTO.md`.

Checklist para SOFIA:
- Cargar como contexto:
  - `meta/SPEC-CODIGO.md`
  - `meta/soft-gates.md`
  - `PROYECTO.md`
- Aplicar el flujo de estados:
  - Implementar tareas en `[/]`.
  - Pasar a `[V]` cuando esté listo para validación.

---

### Gemini Code Assist (revisor / segundo implementador)

Responsabilidades principales:
- Revisar código, arquitectura y documentación antes de `[✓]`.
- Verificar cumplimiento de:
  - `meta/SPEC-CODIGO.md`
  - `context/SPEC-SEGURIDAD.md`
  - `context/SPEC-TESTING.md`
- Implementar cambios o refactors cuando se requiera una segunda mano.

Checklist para usar Gemini:
- Cargar como contexto:
  - `00-ARQUITECTURA-SISTEMA.md`
  - `arquitectura_distribuida_v_1.md`
  - `meta/SPEC-CODIGO.md`
  - `meta/soft-gates.md`
  - `PROYECTO.md`
- Aplicar el flujo de estados:
  - Revisar tareas en `[R]`.
  - Decidir si pasan a `[✓]` o deben volver a `[/]` con comentarios.

---

## 5. Empezar un proyecto nuevo con Integra

### Paso 1 · Copiar la metodología al proyecto

En tu repositorio del proyecto:

1. Crea una carpeta `metodologia-integra/` (o usa este repo como raíz).
2. Copia dentro todo el contenido de esta plantilla.
3. Añade `metodologia-integra/` a tu estructura o ajústala según `README.md`.

---

### Paso 2 · Instanciar plantillas

En el root del proyecto:

- Copia `templates/PROYECTO-template.md` a `PROYECTO.md` y personalízalo:
  - Define sprints, tareas iniciales y responsables.
  - Usa los estados `[ ] [~] [/] [V] [R] [✓] [X] [!] [?]`.

- Copia:
  - `templates/.gitignore.template` → `.gitignore`
  - `templates/.env.example.template` → `.env.example`

En `context/`:
- Ajusta `SPEC-SEGURIDAD.md` y `SPEC-TESTING.md` al stack real de tu proyecto.
- Añade nuevos SPECs según necesidades (`context/SPEC-XXX.md`).

---

### Paso 3 · Configurar Continue.dev (opcional)

Si usas VS Code + Continue:

- Copia `templates/continuerc-template.json` a `.continue/config.json` (o equivalente).
- Ajusta rutas según dónde coloques `metodologia-integra/` dentro de tu repo.
- Usa el contexto automático para que CODEX y Gemini siempre vean:
  - `PROYECTO.md`
  - documentos de `meta/`
  - `context/` y los últimos checkpoints.

---

### Paso 4 · Primer ciclo de trabajo

1. Frank e INTEGRA definen el primer bloque de trabajo en `PROYECTO.md`.
2. INTEGRA toma una tarea en `[ ]`, la pasa a `[~]` y genera el SPEC correspondiente.
3. SOFIA pasa la tarea a `[/]` e implementa según el SPEC.
4. SOFIA ejecuta validaciones y la mueve a `[V]`.
5. GEMINI revisa (`[R]`), aplica Soft Gates y decide si pasa a `[✓]` o vuelve a `[/]`.
6. Frank, informado por INTEGRA, decide cuándo marcar `[X]` para entregables clave.

---

## 6. Notas sobre neutralidad de la plantilla

- Algunos documentos (`RESUMEN-IMPLEMENTACION-V2.md`, `context/decisions/ADR-001-ejemplo-uso-pnpm.md`) describen cómo se aplicó Integra en un proyecto real previo.  
  Se mantienen como **ejemplos históricos**, no como instrucciones obligatorias.
- Siempre que adaptes la metodología a un proyecto nuevo:
  - revisa `context/` y ajusta cualquier referencia de ejemplo al contexto actual;
  - trata `RESUMEN-IMPLEMENTACION-V2.md` como un “case study”, no como parte del proceso formal.

---

## 7. Qué se espera de cada agente al terminar el onboarding

- **Frank**
  - Entiende el flujo de estados y Soft Gates a alto nivel.
  - Sabe leer `PROYECTO.md` y exigir trazabilidad y checkpoints.

- **INTEGRA**
  - Sabe dónde vivirán SPECs, ADRs, checkpoints y PROYECTO.md.
  - Puede arrancar un proyecto nuevo copiando esta plantilla y adaptando `context/`.

- **SOFIA**
  - Conoce `meta/SPEC-CODIGO.md`, `meta/soft-gates.md` y `meta/sistema-estados.md`.
  - Puede implementar tareas en `[/]` y crear checkpoints.

- **GEMINI**
  - Conoce `meta/SPEC-CODIGO.md`, `meta/soft-gates.md` y `meta/sistema-estados.md`.
  - Puede revisar tareas en `[R]` y decidir si pasan a `[✓]` o se reabren.

Con esto, la metodología queda lista para usarse como **plantilla neutra** en cualquier proyecto que quiera combinar trazabilidad fuerte, calidad y colaboración humano–IA.  

