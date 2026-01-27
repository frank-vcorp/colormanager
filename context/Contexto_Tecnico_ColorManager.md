# **📘 CONTEXTO TÉCNICO Y OPERATIVO: COLOR MANAGER**

**Versión del Documento:** 1.5

**Objetivo:** Desarrollo de software para control de inventario y producción en taller de igualación automotriz.

## **1\. EL PROBLEMA CENTRAL (La "Zona Ciega")**

El proceso de igualación de pintura tiene dos etapas:
a
1. **Fase Teórica (70%):** El software actual (**Sayer**) da una receta base. Esta fase es predecible.  
2. **Fase de Ajuste (30%):** El igualador agrega tintes "a ojo" y de forma manual para corregir el tono. Esta fase es caótica y **no se registra** actualmente.

**Consecuencia:** El inventario teórico (Sayer/Sicar) nunca cuadra con el físico. Hay fugas de material ("chorritos" no cobrados), mermas no reportadas y falta de trazabilidad.

**Solución:** **Color Manager** es un sistema auditor que se interpone entre el proceso manual y el inventario, obligando a registrar el 100% de los gramos vertidos (tanto de la receta base como de los ajustes manuales).

## **2\. ARQUITECTURA DE HARDWARE (La Estación Física)**

El sistema corre en una PC Windows existente, conectada a periféricos industriales.

* **Báscula:** **Mettler Toledo BBA242paint**.  
  * *Estado:* Existente.  
  * *Conexión:* Puerto RS232 (Serial).  
  * *Requisito:* Cable adaptador Serial-a-USB (Chipset FTDI).  
  * *Precisión:* 0.1g.  
* **Escáner:** Lector de Código de Barras **Omnidireccional de Mesa** (USB).  
  * *Estado:* **Adquisición Nueva (Requerido).**  
  * *Uso:* Operación "manos libres" para que el igualador pase los botes rápido sin soltarlos.  
* **Impresora de Etiquetas:** (Térmica, tipo Zebra/Dymo).  
  * *Estado:* **Existente en Taller** (Validar modelo y conexión USB).  
  * *Uso:* Imprimir ID Único para botes de inventario y Etiqueta Final para el cliente.  
* **PC:** Computadora actual del taller.  
  * *Software:* Debe correr la "Impresora Virtual" y la App Color Manager.

## **3\. INTEGRACIÓN DE SISTEMAS (El Ecosistema)**

### **A. SAYER (Origen de la Receta)**

* **Rol:** Generador de la fórmula inicial.  
* **Método de Integración:** **Intercepción de Impresión**.  
  * El usuario da clic en IMPRIMIR dentro de Sayer.  
  * Color Manager actúa como una "Impresora Virtual", captura el texto plano (RAW), extrae la lista de ingredientes y la carga en pantalla.  
* **Datos Extraídos:**  
  * Lista de SKUs e Ingredientes Meta (Gramos).  
  * Código de Fórmula Sayer.  
  * Marca del Auto / Código de Color.

### **B. SICAR (Origen del Inventario y Precios)**

* **Rol:** Maestro de Catálogo y Costos.  
* **Método de Integración:** **Importación Asíncrona (Excel/CSV)**.  
  * El administrador exporta el inventario de Sicar y lo carga en Color Manager.  
* **Datos Importados:** SKU, Descripción, Precio de Costo, Existencia Inicial.  
* **Regla de Costos:** Cada importación actualiza el costo unitario para que las mermas se calculen a precio actual.

### **C. COLOR MANAGER (El Cerebro Nuevo)**

* **Rol:** Ejecución, Validación y Registro Real.  
* **Base de Datos Propia:** Almacena el historial real, clientes, y las "Fórmulas Maestras" (Receta Sayer \+ Ajustes Manuales).

## **4\. LÓGICA DE NEGOCIO CRÍTICA**

### **A. Validación de Presentaciones ("Padre e Hijos")**

Los botes físicos tienen SKUs diferentes según su tamaño, pero químicamente son lo mismo para la receta.

* **SKU Raíz (Sayer):** KT-1200 (Blanco).  
* **SKU Físico (Sicar/Etiqueta):**  
  * KT-1200.10 (Presentación 1 Litro).  
  * KT-1200.40 (Presentación 4 Litros/Galón).  
* **Regla:** Si la receta pide KT-1200, el sistema debe aceptar el escaneo de cualquiera de sus "Hijos" (.10 o .40), pero descontar inventario del SKU específico escaneado.

### **B. Control FIFO y Serialización (Etiquetado de Inventario)**

* **Problema:** El código de barras de fábrica (KT-1400) es idéntico para todos los botes. El sistema no distingue un bote viejo de uno nuevo.  
* **Solución (ID ÚNICO):** Al recibir mercancía, se debe pegar una etiqueta con un **ID Único Serializado** (ej. INV-0001, INV-0002).  
* **Regla FIFO:** Si el igualador escanea el bote INV-0005 (Nuevo) y el sistema detecta que el bote INV-0001 (Viejo) del mismo producto aún tiene existencia, **bloquea la operación** y alerta: *"Termina el bote INV-0001 primero"*.

### **C. Cero "Fantasmas" (Solventes y Thinner)**

* No existe el botón "Genérico". Todo lo que entra a la mezcla debe tener código.  
* **Distinción Operativa:**  
  * **Thinner de Fórmula:** Tiene etiqueta, se escanea, se pesa y se cobra.  
  * **Thinner de Limpieza:** Bote sucio/bidón. **PROHIBIDO** subirlo a la báscula. Si la báscula detecta peso y no se escanea el thinner correcto, el sistema se bloquea.

### **D. Alerta de Reorden (Stock Bajo)**

* El sistema monitorea el consumo en tiempo real.  
* **Regla:** Cuando la existencia de un insumo baja del **50%** (configurable), se agrega a un "Reporte de Compras Sugeridas" para evitar paros.

### **E. Robustez y Persistencia (Protección contra Apagones)**

* **Riesgo:** Corte de energía o cierre accidental del navegador a mitad de una mezcla.  
* **Solución Técnica:** El sistema debe guardar el estado de la mezcla paso a paso en almacenamiento local (LocalStorage/IndexedDB).  
* **Recuperación:** Al reiniciar, el sistema debe detectar la mezcla inconclusa y preguntar: *"Detecté una orden pendiente con 4 ingredientes ya servidos. ¿Deseas continuarla?"*.

## **5\. ROLES DE USUARIO Y SEGURIDAD**

El sistema debe contar con un control de acceso estricto para proteger la información financiera.

### **A. ROL: ADMINISTRADOR (Dueño / Gerente)**

* **Acceso Total:**  
  * Panel de Configuración (Hardware, Impresoras).  
  * Módulo de Importación Sicar (Carga de Inventario y Costos).  
  * **Generador de Reportes On-Demand** (Financieros y Operativos).  
  * Gestión de Usuarios e Impresión de Etiquetas de Inventario.  
* **Seguridad:** Acceso protegido por contraseña o PIN administrativo.

### **B. ROL: IGUALADOR (Operativo)**

* **Acceso Restringido (Modo Kiosco):**  
  * **Panel de Preparación:** Interfaz de báscula y mezcla (La única pantalla operativa).  
  * **Historial de Colores:** Buscador de fórmulas anteriores (solo lectura para re-mezclar).  
* **Bloqueos Explícitos:**  
  * **NO** puede ver costos de insumos.  
  * **NO** puede ver cantidades de inventario total (solo alertas de semáforo).  
  * **NO** puede ver reportes de mermas globales.  
  * **NO** puede modificar el catálogo de productos manualmente.

## **6\. FLUJO OPERATIVO DETALLADO (El "Happy Path")**

### **PASO 1: Disparo (Desde Sayer)**

1. Igualador busca fórmula en Sayer.  
2. Clic en IMPRIMIR.  
3. Se abre Color Manager con la "Lista de Misión" cargada.

### **PASO 2: Mezcla Base (Guiada)**

1. Pantalla indica: **"Agregar ROJO (KT-1400) \- Meta: 323g"**.  
2. Igualador toma el bote y lo pasa por el escáner (Lee ID Único INV-XXXX).  
3. **Validación:**  
   * *Correcto:* Beep \+ Desbloqueo de Báscula.  
   * *Incorrecto/Lote Viejo Pendiente:* Alerta Roja \+ Bloqueo.  
4. Igualador vierte hasta que la barra de progreso llega a Verde.  
5. Sistema avanza al siguiente ingrediente automáticamente.

### **PASO 3: Ajuste Manual (Reactivo \- El 30%)**

*Contexto: La receta base terminó, pero falta tono.*

1. Igualador vierte un chorrito extra de un tinte (ej. Blanco).  
2. **Báscula:** Detecta peso estable (+4.5g) sin orden previa.  
3. **Reacción:** Sonido **¡DING\!** 🔔. Pantalla bloqueada: *"Detecté 4.5g... ¿Qué es?"*.  
4. Igualador escanea el bote de Blanco.  
5. Sistema registra el ajuste, actualiza el costo y libera la pantalla.

### **PASO 4: Cierre y Documentación**

1. El color es aprobado visualmente.  
2. Clic en TERMINAR.  
3. **Captura de Identidad:**  
   * Cliente / Taller.  
   * Vehículo / Placa.  
   * **Nota de Venta / Factura (Obligatorio).**  
4. **Guardado y Etiquetado:**  
   * Se guarda la "Fórmula Real" (ID único).  
   * Se descuenta inventario preciso.  
   * **Impresión de Etiqueta Final:** La impresora Zebra genera un sticker con: *Cliente, Auto, Fecha, ID de Fórmula y Código QR*.  
   * El igualador pega el sticker en el bote del cliente (listo para entrega).

## **7\. MANEJO DE EXCEPCIONES (Mermas)**

Si la mezcla sale mal (error humano, se cayó el bote, color imposible):

1. Botón REPORTAR MERMA.  
2. **Muro de Justificación:** El sistema exige seleccionar causa:  
   * *Error de Igualación.*  
   * *Derrame.*  
   * *Error Fórmula Sayer.*  
3. **Acción:** Se descuenta el inventario físico (el líquido se gastó), pero se marca financieramente como **PÉRDIDA**, no como Costo de Venta.

## **8\. ENTREGABLES CLAVE (Reportes)**

*Nota: Solo accesibles para el Rol Administrador.*

1. **Reporte de Inventario vs. Real:** Comparativa Sicar (Teórico) vs. Color Manager (Real).  
2. **Historial de Clientes:** Buscador rápido por Placa/Nota para re-igualar colores pasados (Accesible para ambos roles, pero sin costos para el igualador).  
3. **Reporte de Mermas:** Quién, Cuándo, Cuánto y Por Qué se tiró pintura.  
4. **Gestión de Etiquetas:** Módulo para imprimir IDs Únicos para nuevos botes de inventario.  
5. **Generador de Reportes On-Demand:** Herramienta flexible para filtrar y exportar datos.  
   * **Filtros:** Rango de Fechas, Usuario (Igualador), Cliente, Producto/SKU.  
   * **Formatos de Exportación:** PDF (para imprimir) y Excel (para análisis profundo).  
   * **Uso:** Permite responder preguntas específicas (ej. *"¿Cuánto gastó Juan en Thinner la semana pasada?"*).