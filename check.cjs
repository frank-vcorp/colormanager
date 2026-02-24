const { PrismaClient } = require('./generated/prisma-client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:///root/antigravity-projects/Colormanager/colormanager/prisma/dev.db',
        },
    },
});
async function main() {
    const m = await prisma.mezcla.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
    console.log(JSON.stringify(m, null, 2));
}
main().then(() => prisma.$disconnect());
