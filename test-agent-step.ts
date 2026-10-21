import fs from "fs";
import path from "path";

// Load .env
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

// Load Vercel pulled env if any
// const vercelEnvPath = path.resolve(process.cwd(), ".env.vercel.pull");
// if (fs.existsSync(vercelEnvPath)) {
//   const envContent = fs.readFileSync(vercelEnvPath, "utf-8");
//   envContent.split("\n").forEach((line) => {
//     const parts = line.split("=");
//     if (parts.length >= 2) {
//       const key = parts[0].trim();
//       const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
//       process.env[key] = val;
//     }
//   });
// }

// Set mockup API keys if not present
if (!process.env.GROQ_API_KEY) {
  process.env.GROQ_API_KEY = "ceeb87a502msh35fce454a8891c1p1f7d05jsnc2d1b540f888"; // RapidAPI JSearch key? No, Groq key.
}

import { prepareAgentStep } from "./src/actions/agent";

async function test() {
  const job = {
    id: "job-test-123",
    title: "Frontend Developer",
    company: "Vercel",
    location: "Remote",
    salary: "$120,000",
    skills: ["React", "TypeScript", "Next.js"],
    jobUrl: "https://vercel.com/careers/test-job",
    description: "We are looking for a Frontend Developer experienced in React, Next.js, and TypeScript to join our core team."
  };

  console.log("Starting test run of prepareAgentStep...");
  const start = Date.now();
  
  try {
    const res = await prepareAgentStep(job, 70);
    console.log("prepareAgentStep result:", JSON.stringify(res, null, 2));
  } catch (error) {
    console.error("Crash during prepareAgentStep:", error);
  }
  
  console.log(`Total duration: ${(Date.now() - start) / 1000}s`);
}

test().catch(console.error);
