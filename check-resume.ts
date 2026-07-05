import fs from "fs";
import path from "path";

// Manually parse .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  });
}

import { prisma } from "./src/lib/prisma";

async function main() {
  const resume = await prisma.resume.findFirst({
    where: { isDefault: true }
  });
  console.log("DEFAULT RESUME CONTENT:", resume?.content);
}

main().catch(console.error);
