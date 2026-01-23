# Guía de Onboarding para Nuevos Miembros del Equipo

**Bienvenido al equipo!** 👋

Esta guía te ayudará a empezar a trabajar con la **Metodología INTEGRA Evolucionada v2.1.1**.

---

## 🎯 ¿Qué es INTEGRA?

INTEGRA es una metodología de desarrollo asistido por IA que combina:
- ✅ Trabajo colaborativo entre humanos y agentes IA
- ✅ Trazabilidad total de cambios y decisiones
- ✅ Calidad garantizada mediante "Soft Gates"
- ✅ Documentación automática y estructurada

---

## 📚 Paso 1: Lectura Inicial (30 minutos)

Lee estos documentos en orden:

### 1. README.md (10 min)
- Visión general de la metodología
- Roles de los agentes IA
- Cómo usar la plantilla

### 2. ONBOARDING.md (15 min)
- Flujo de trabajo detallado
- Cómo interactúan los agentes
- Primer ciclo de trabajo

### 3. meta/STACK-TECNOLOGICO.md (5 min)
- Stack tecnológico que usamos
- Principio de capa gratuita
- Herramientas recomendadas

---

## 🛠️ Paso 2: Setup de Herramientas (45 minutos)

### Instalar VS Code
1. Descargar de https://code.visualstudio.com/
2. Instalar extensiones recomendadas:
   - Continue.dev (IA assistant)
   - ESLint
   - Prettier
   - GitLens
   - Error Lens

### Configurar Git
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### Clonar el Repositorio de la Metodología
```bash
git clone https://github.com/frank-vcorp/frank-metodolgoia_integra_v2.git
cd frank-metodolgoia_integra_v2
```

### Explorar la Estructura
```
metodologia-integra/
├── README.md                    # Inicio aquí
├── ONBOARDING.md               # Guía para agentes IA
├── ONBOARDING-HUMANOS.md       # Esta guía
├── 00-ARQUITECTURA-SISTEMA.md  # Mapa maestro
├── arquitectura_distribuida_v_1.md  # Arquitectura detallada
├── meta/                       # Reglas y plantillas
│   ├── AGENTES.md             # Documentación de agentes IA
│   ├── SISTEMA-IDS.md         # Sistema de IDs
│   ├── STACK-TECNOLOGICO.md   # Stack tecnológico
│   ├── sistema-estados.md     # Estados de tareas
│   ├── soft-gates.md          # Puertas de calidad
│   ├── SPEC-CODIGO.md         # Convenciones de código
│   └── ...
├── context/                    # Contexto del proyecto
│   ├── decisions/             # ADRs (decisiones arquitectónicas)
│   ├── handoffs/              # Handoffs entre agentes
│   ├── interconsultas/        # Dictámenes de DEBY
│   └── infraestructura/       # Configs de GEMINI
└── templates/                  # Plantillas
    └── PROYECTO-template.md   # Template de proyecto
```

---

## 📖 Paso 3: Entender los Conceptos Clave (30 minutos)

### Sistema de Estados

Las tareas pasan por estos estados:

```
[ ] Pendiente
  ↓
[~] Planificado (INTEGRA genera SPEC)
  ↓
[/] En Progreso (SOFIA implementa)
  ↓
[V] En Validación (Tests automáticos)
  ↓
[R] En Revisión (GEMINI revisa)
  ↓
[✓] Completado (Todos los gates pasados)
  ↓
[X] Aprobado (Frank aprueba)
```

**Estados especiales:**
- `[!]` Bloqueado - Hay un impedimento externo
- `[?]` Necesita Clarificación - Falta información

### Soft Gates (Puertas de Calidad)

Antes de marcar una tarea como `[✓]`, debe pasar 4 gates:

1. **Gate 1: Compilación** - TypeScript compila sin errores, ESLint pasa
2. **Gate 2: Testing** - Tests unitarios pasan, coverage mínimo
3. **Gate 3: Revisión** - GEMINI audita código
4. **Gate 4: Documentación** - README, JSDoc, checkpoint

### Los 5 Agentes IA

1. **INTEGRA** (Gemini 3 Pro) - Arquitecto, diseña SPECs
2. **SOFIA** (Claude Haiku 4.5) - Constructora, implementa código
3. **GEMINI** (Gemini 3 Pro) - Infraestructura y QA
4. **DEBY** (Claude Opus 4.5) - Debugger forense
5. **CRONISTA** (GPT-5.1) - Administrador de PROYECTO.md

**Tu rol como humano:**
- Defines objetivos de negocio
- Validas entregables
- Apruebas tareas críticas (`[X]`)
- Tomas decisiones de alcance

---

## 🚀 Paso 4: Crear tu Primer Proyecto (1 hora)

### 1. Crear Nuevo Proyecto desde la Plantilla

**Opción A: Usar GitHub Template**
1. Ve a https://github.com/frank-vcorp/frank-metodolgoia_integra_v2
2. Click en "Use this template" → "Create a new repository"
3. Nombra tu proyecto (ej: `mi-primer-proyecto`)
4. Clone tu nuevo repo

**Opción B: Copiar Manualmente**
```bash
cp -r frank-metodolgoia_integra_v2 mi-primer-proyecto
cd mi-primer-proyecto
rm -rf .git
git init
git add .
git commit -m "feat: inicializar proyecto con metodología INTEGRA v2.1.1"
```

### 2. Instanciar PROYECTO.md

```bash
cp templates/PROYECTO-template.md PROYECTO.md
```

Edita `PROYECTO.md`:
```markdown
# PROYECTO: Mi Primer Proyecto (Cliente: Aprendizaje)

## Objetivo
Aprender la metodología INTEGRA creando una app simple.

## Backlog inicial
- [ ] Setup del proyecto (Next.js + TypeScript)
- [ ] Implementar página de inicio
- [ ] Agregar autenticación básica
```

### 3. Trabajar con los Agentes IA

**Ejemplo de conversación con INTEGRA:**
```
Tú: "Hola INTEGRA, tengo este proyecto nuevo. 
     Necesito crear una app Next.js con autenticación.
     ¿Puedes generar el SPEC para el setup inicial?"

INTEGRA: [Genera SPEC-SETUP.md en context/]
         [Actualiza PROYECTO.md con tarea en [~]]

Tú: "Perfecto, SOFIA por favor implementa según el SPEC"

SOFIA: [Implementa código]
       [Actualiza tarea a [/] → [V]]
       [Crea checkpoint]

GEMINI: [Revisa código]
        [Valida Soft Gates]
        [Actualiza a [✓] o devuelve a [/] con comentarios]
```

---

## 📋 Paso 5: Flujo de Trabajo Diario

### Mañana (Planning)
1. Revisa `PROYECTO.md` - ¿Qué tareas están pendientes?
2. Prioriza con INTEGRA - ¿Qué es más importante?
3. INTEGRA genera SPECs para tareas complejas

### Tarde (Implementación)
1. SOFIA implementa según SPECs
2. Ejecuta tests localmente
3. Crea checkpoint al completar

### Noche (Revisión)
1. GEMINI revisa código
2. Valida Soft Gates
3. Tú apruebas entregables importantes

---

## 🎓 Recursos de Aprendizaje

### Documentos Esenciales

**Para entender la metodología:**
- `README.md` - Visión general
- `00-ARQUITECTURA-SISTEMA.md` - Mapa maestro
- `meta/sistema-estados.md` - Estados de tareas
- `meta/soft-gates.md` - Puertas de calidad

**Para escribir código:**
- `meta/SPEC-CODIGO.md` - Convenciones de código
- `meta/STACK-TECNOLOGICO.md` - Stack tecnológico
- `context/SPEC-SEGURIDAD.md` - Seguridad
- `context/SPEC-TESTING.md` - Testing

**Para documentar:**
- `meta/plantilla-checkpoint-enriquecido.md` - Checkpoints
- `meta/plantilla_SPEC.md` - SPECs
- `meta/SISTEMA-IDS.md` - Sistema de IDs

### Ejemplos Reales

Revisa estos archivos para ver ejemplos:
- `context/decisions/ADR-001-ejemplo-uso-pnpm.md` - Ejemplo de ADR
- `RESUMEN-IMPLEMENTACION-V2.md` - Caso de estudio real

---

## ❓ Preguntas Frecuentes

### ¿Necesito saber usar todos los agentes IA?

No necesariamente. Puedes empezar usando solo uno o dos:
- **Mínimo:** INTEGRA (para planning) + tu IDE
- **Recomendado:** INTEGRA + SOFIA + tu IDE
- **Completo:** Los 5 agentes

### ¿Qué hago si no tengo acceso a los modelos de IA?

Puedes usar la metodología sin IA:
- Tú haces el rol de INTEGRA (planning)
- Tú implementas (rol de SOFIA)
- Pides code review a un compañero (rol de GEMINI)

La metodología sigue funcionando, solo es más manual.

### ¿Puedo modificar la metodología?

Sí! La metodología es flexible. Si encuentras algo que no funciona para tu caso:
1. Documenta el problema
2. Propón una solución
3. Actualiza la metodología
4. Comparte con el equipo

### ¿Cómo reporto bugs o sugiero mejoras?

1. Crea un issue en el repo de la metodología
2. O habla directamente con Frank
3. O actualiza la documentación y haz un PR

---

## 🆘 ¿Necesitas Ayuda?

### Recursos
- **Documentación:** Lee `meta/` y `context/`
- **Ejemplos:** Revisa `RESUMEN-IMPLEMENTACION-V2.md`
- **Frank:** Pregúntale directamente

### Checklist de "Estoy Listo"

- [ ] Leí README.md y ONBOARDING.md
- [ ] Instalé VS Code y extensiones
- [ ] Cloné el repo de la metodología
- [ ] Entiendo los estados de tareas
- [ ] Entiendo los Soft Gates
- [ ] Sé qué hace cada agente IA
- [ ] Creé mi primer proyecto de prueba
- [ ] Hice mi primer commit siguiendo convenciones

---

## 🎯 Próximos Pasos

1. **Semana 1:** Familiarízate con la metodología
   - Lee toda la documentación
   - Crea un proyecto de prueba
   - Experimenta con los agentes

2. **Semana 2:** Trabaja en un proyecto real
   - Usa PROYECTO.md para tracking
   - Aplica Soft Gates
   - Crea checkpoints

3. **Semana 3:** Domina las herramientas
   - Usa ADRs para decisiones importantes
   - Implementa el sistema de IDs
   - Optimiza tu flujo de trabajo

4. **Semana 4:** Contribuye a la metodología
   - Identifica mejoras
   - Actualiza documentación
   - Comparte aprendizajes

---

**¡Bienvenido al equipo! 🚀**

Si tienes dudas, pregunta. La metodología está viva y evoluciona con el equipo.

---

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Autor:** Frank Saavedra  
**Metodología:** INTEGRA v2.1.1
