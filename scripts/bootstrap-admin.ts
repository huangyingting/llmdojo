import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword, writeAuditLog } from "../src/lib/admission";

function parseCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  const email = (
    parseCliArg("--email") ??
    process.env.BOOTSTRAP_ADMIN_EMAIL ??
    ""
  )
    .trim()
    .toLowerCase();
  const password =
    parseCliArg("--password") ?? process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  const name = (
    parseCliArg("--name") ??
    process.env.BOOTSTRAP_ADMIN_NAME ??
    "Platform Administrator"
  ).trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(
      "Error: Provide a valid admin email via --email or BOOTSTRAP_ADMIN_EMAIL."
    );
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error(
      "Error: Provide an admin password (min 8 chars) via --password or BOOTSTRAP_ADMIN_PASSWORD."
    );
    process.exit(1);
  }

  const existingAdminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  if (existingAdminCount > 0) {
    console.error(
      "Refusing bootstrap: An ADMIN account already exists in this database."
    );
    process.exit(1);
  }

  const passwordHash = hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      sessionVersion: 1,
      learningState: {
        create: {},
      },
    },
  });

  await writeAuditLog({
    action: "BOOTSTRAP_ADMIN_CREATED",
    actorId: admin.id,
    actorEmail: admin.email,
    targetUserId: admin.id,
    metadata: {
      source: "cli:bootstrap-admin",
      role: admin.role,
    },
  });

  console.log(
    `Successfully bootstrapped initial ADMIN user: ${admin.email} (id: ${admin.id})`
  );
}

main()
  .catch((err) => {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
