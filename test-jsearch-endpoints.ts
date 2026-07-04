import "dotenv/config";

async function testPath(path: string) {
  const apiKey = process.env.JSEARCH_API_KEY;
  const url = new URL(`https://jsearch.p.rapidapi.com${path}`);
  url.searchParams.set("query", "React Developer");
  
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey!,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });
    console.log(`Path: ${path} | Status: ${res.status}`);
    const data = await res.json();
    console.log(`Path: ${path} | Message:`, data.message || "No message (success?)");
  } catch (err) {
    console.error(`Path: ${path} | Error:`, err);
  }
}

async function run() {
  await testPath("/search");
  await testPath("/job-search");
  await testPath("/search-jobs");
  await testPath("/jobs");
}

run();
