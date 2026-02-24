const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.mezcla.findMany({ take: 10, orderBy: { createdAt: 'desc' }});
  console.log(JSON.stringify(m, null, 2));
}
main().then(() => prisma.$disconnect());
