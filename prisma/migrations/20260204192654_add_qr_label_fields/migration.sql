-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredienteId" TEXT NOT NULL,
    "numeroLote" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "fechaVencimiento" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codigoEtiqueta" TEXT,
    "etiquetaImpresa" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Lote_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "Ingrediente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lote" ("cantidad", "createdAt", "estado", "fechaVencimiento", "id", "ingredienteId", "numeroLote") SELECT "cantidad", "createdAt", "estado", "fechaVencimiento", "id", "ingredienteId", "numeroLote" FROM "Lote";
DROP TABLE "Lote";
ALTER TABLE "new_Lote" RENAME TO "Lote";
CREATE UNIQUE INDEX "Lote_numeroLote_key" ON "Lote"("numeroLote");
CREATE UNIQUE INDEX "Lote_codigoEtiqueta_key" ON "Lote"("codigoEtiqueta");
CREATE INDEX "Lote_estado_idx" ON "Lote"("estado");
CREATE INDEX "Lote_ingredienteId_idx" ON "Lote"("ingredienteId");
CREATE INDEX "Lote_codigoEtiqueta_idx" ON "Lote"("codigoEtiqueta");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
