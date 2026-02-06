/*
  Warnings:

  - You are about to alter the column `operadorId` on the `Mezcla` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `ingredientes` to the `Mezcla` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Mezcla" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "recetaNombre" TEXT NOT NULL,
    "colorCode" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaInicio" TEXT,
    "horaFin" TEXT,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "pesoTotal" REAL NOT NULL,
    "pesoFinal" REAL NOT NULL DEFAULT 0,
    "pesoActual" REAL NOT NULL DEFAULT 0,
    "ingredientes" TEXT NOT NULL,
    "diferencia" REAL NOT NULL DEFAULT 0,
    "tolerancia" REAL NOT NULL DEFAULT 0,
    "tipoMezcla" TEXT NOT NULL DEFAULT 'NUEVA',
    "operadorId" INTEGER,
    "operadorNombre" TEXT,
    "cliente" TEXT,
    "vehiculo" TEXT,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Mezcla" ("createdAt", "estado", "fechaCreacion", "id", "nodeId", "notas", "operadorId", "pesoActual", "pesoTotal", "recetaId", "recetaNombre", "updatedAt") SELECT "createdAt", "estado", "fechaCreacion", "id", "nodeId", "notas", "operadorId", "pesoActual", "pesoTotal", "recetaId", "recetaNombre", "updatedAt" FROM "Mezcla";
DROP TABLE "Mezcla";
ALTER TABLE "new_Mezcla" RENAME TO "Mezcla";
CREATE INDEX "Mezcla_fechaCreacion_idx" ON "Mezcla"("fechaCreacion");
CREATE INDEX "Mezcla_estado_idx" ON "Mezcla"("estado");
CREATE INDEX "Mezcla_nodeId_idx" ON "Mezcla"("nodeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
