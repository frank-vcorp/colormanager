const { ipcRenderer } = require('electron');
const registroTest = {
  id: `MZC-TEST-${Date.now()}`,
  recetaId: `RECETA-999`,
  recetaNombre: `Receta Pruebas`,
  fecha: new Date().toISOString(),
  horaInicio: new Date().toISOString(),
  horaFin: new Date().toISOString(),
  pesoTotal: 100,
  pesoFinal: 100,
  ingredientes: [{ codigo: 'A', pesoTarget: 100, pesoPesado: 100 }],
  estado: "perfecto",
  diferencia: 0,
  tolerancia: 0.5,
  tipoMezcla: "NUEVA",
  operadorId: 1,
  operadorNombre: "Admin"
};
ipcRenderer.invoke('mezcla:guardar', registroTest).then(console.log).catch(console.error);
