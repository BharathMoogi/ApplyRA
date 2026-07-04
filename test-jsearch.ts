import "dotenv/config";

async function test() {
  const apiKey = process.env.JSEARCH_API_KEY;
  console.log("Using API Key:", apiKey ? "Present" : "Missing");
  if (!apiKey) return;

  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", "Frontend Software Engineer");
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "1");
  url.searchParams.set("remote_jobs_only", "true");

  console.log("Fetching URL:", url.toString());

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });

    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Response data keys:", Object.keys(data));
    if (data.data) {
      console.log("Number of jobs found:", data.data.length);
      if (data.data.length > 0) {
        console.log("First job title:", data.data[0].job_title);
        console.log("First job employer:", data.data[0].employer_name);
      }
    } else {
      console.log("Full response:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
