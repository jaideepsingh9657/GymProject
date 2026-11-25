import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";


const PERMISSIONS: Record<string, string[]> = {
  OWNER: ["*"],
  ADMIN: ["members:read", "members:write", "plans:read", "subscriptions:write", "payments:read", "payments:write", "attendance:read", "attendance:write", "dashboard:read", "enquiries:read", "enquiries:write", "trainers:read", "trainers:assign", "announcements:write"],
  TRAINER: ["members:read:assigned", "workouts:read", "workouts:write", "diets:read", "diets:write", "progress:write", "exercises:read", "exercises:write"],
  MEMBER: ["self:read", "self:write"],
};
const ALL = [...new Set(Object.values(PERMISSIONS).flat().filter((p) => p !== "*")), "plans:write", "dashboard:read", "payments:refund", "reports:read", "settings:write", "users:manage", "audit:read", "trainers:write", "trainers:assign"];

export async function seed(db: PrismaClient, email?: string, password?: string) {
  if (!email || !password || password.length < 12) throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD (min 12 chars)");

  const branch = (await db.gymBranch.findFirst()) ?? (await db.gymBranch.create({ data: { name: "Luxury Fitness Gym (main)" } }));

  for (const key of ALL) await db.permission.upsert({ where: { key }, update: {}, create: { key } });
  for (const [key, perms] of Object.entries(PERMISSIONS)) {
    const role = await db.role.upsert({ where: { key }, update: {}, create: { key, name: key[0] + key.slice(1).toLowerCase() } });
    const grant = perms.includes("*") ? ALL : perms;
    for (const p of grant) {
      const permission = await db.permission.findUniqueOrThrow({ where: { key: p } });
      await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } });
    }
  }

  const ownerRole = await db.role.findUniqueOrThrow({ where: { key: "OWNER" } });
  const owner = await db.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase(), passwordHash: await argon2.hash(password), branchId: branch.id },
  });
  await db.userRole.upsert({ where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } }, update: {}, create: { userId: owner.id, roleId: ownerRole.id } });
  return { branch, owner };
}

if (require.main === module) {
  const db = new PrismaClient();
  seed(db, process.env.SEED_OWNER_EMAIL, process.env.SEED_OWNER_PASSWORD)
    .then((r) => console.log(`Seeded branch, roles, permissions and owner ${r.owner.email}`))
    .finally(() => db.$disconnect());
}
