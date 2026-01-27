
const ingredientRegex = /^\s*(\d+)\s*:\s*([A-Za-z0-9_-]+)\s+(\d+[.,]?\d*)\s*(?:\(g(?:r)?\)|g(?:r)?)?/i;

const testCases = [
  "01 : kt-1400  323,0 g",
  "02 : KT_1400 323.0(gr)",
  "03 : PINTURA-ROJA 100.5",
  "04 : base_negra 50",
  "05:TINTA 10,2g"
];

console.log("Probando Regex de Sayer:");
testCases.forEach(line => {
  const match = line.match(ingredientRegex);
  if (match) {
    console.log(`[PASS] "${line}" -> ID:${match[1]}, Code:${match[2]}, Qty:${match[3]}`);
  } else {
    console.error(`[FAIL] "${line}"`);
    process.exit(1);
  }
});

console.log("Todos los casos de prueba pasaron.");
