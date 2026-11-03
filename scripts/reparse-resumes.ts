/**
 * Re-parses all existing resumes in the DB using the latest parser logic.
 * Run with: npx tsx scripts/reparse-resumes.ts
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parseResumeHybrid } from '../src/lib/parser/index';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const resumes = await prisma.resume.findMany({
    where: { rawText: { not: null } },
    select: { id: true, title: true, rawText: true, profileId: true },
  });

  console.log(`Found ${resumes.length} resumes to re-parse.\n`);

  for (const resume of resumes) {
    try {
      const parsed = await parseResumeHybrid(resume.rawText!, 'User');
      const summary = parsed.summary || '';
      const summarySnippet = summary.slice(0, 100).replace(/\n/g, ' ');

      await prisma.resume.update({
        where: { id: resume.id },
        data: { content: JSON.stringify(parsed) },
      });

      console.log(`✅ ${resume.title}`);
      console.log(`   Summary (${summary.length} chars): ${summarySnippet || '(empty)'}...`);
      console.log(`   Experience: ${parsed.experience.length} | Projects: ${(parsed.projects || []).length} | Skills: ${(parsed.skills || []).length}\n`);
    } catch (err: any) {
      console.error(`❌ ${resume.title}: ${err.message}`);
    }
  }

  console.log('Done.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
