-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Mezcla" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "recetaNombre" TEXT NOT NULL,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "pesoTotal" REAL NOT NULL,
    "pesoActual" REAL NOT NULL DEFAULT 0,
    "operadorId" TEXT,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ingrediente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "densidad" REAL NOT NULL,
    "costo" REAL NOT NULL,
    "stockActual" REAL NOT NULL,
    "stockMinimo" REAL NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredienteId" TEXT NOT NULL,
    "numeroLote" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "fechaVencimiento" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tabla" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "cambios" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE INDEX "Mezcla_nodeId_idx" ON "Mezcla"("nodeId");

-- CreateIndex
CREATE INDEX "Mezcla_estado_idx" ON "Mezcla"("estado");

-- CreateIndex
CREATE INDEX "Mezcla_fechaCreacion_idx" ON "Mezcla"("fechaCreacion");

-- CreateIndex
CREATE UNIQUE INDEX "Ingrediente_codigo_key" ON "Ingrediente"("codigo");

-- CreateIndex
CREATE INDEX "Ingrediente_codigo_idx" ON "Ingrediente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_numeroLote_key" ON "Lote"("numeroLote");

-- CreateIndex
CREATE INDEX "Lote_ingredienteId_idx" ON "Lote"("ingredienteId");

-- CreateIndex
CREATE INDEX "Lote_estado_idx" ON "Lote"("estado");

-- CreateIndex
CREATE INDEX "SyncLog_syncedAt_idx" ON "SyncLog"("syncedAt");

-- CreateIndex
CREATE INDEX "SyncLog_tabla_idx" ON "SyncLog"("tabla");
