function parseMonthYear(str: string): string {
  if (!str) return "";
  const cleaned = str.trim();
  if (cleaned.toLowerCase() === "present") return "present";
  
  // Check if it matches YYYY-MM
  if (/^\d{4}-\d{2}$/.test(cleaned)) return cleaned;
  
  // Check if it matches MM/YYYY or MM-YYYY
  const numMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (numMatch) {
    const mm = numMatch[1].padStart(2, "0");
    const yyyy = numMatch[2];
    return `${yyyy}-${mm}`;
  }

  const parts = cleaned.split(/\s+/);
  if (parts.length === 2) {
    const monthStr = parts[0].toLowerCase();
    const year = parts[1];
    if (/^\d{4}$/.test(year)) {
      const months: Record<string, string> = {
        jan: "01", january: "01",
        feb: "02", february: "02",
        mar: "03", march: "03",
        apr: "04", april: "04",
        may: "05",
        jun: "06", june: "06",
        jul: "07", july: "07",
        aug: "08", august: "08",
        sep: "09", september: "09",
        oct: "10", october: "10",
        nov: "11", november: "11",
        dec: "12", december: "12"
      };
      const month = months[monthStr.substring(0, 3)];
      if (month) {
        return `${year}-${month}`;
      }
    }
  } else if (parts.length === 1 && /^\d{4}$/.test(cleaned)) {
    return `${cleaned}-01`;
  }
  return "";
}

const parseDuration = (duration: string) => {
  // Split by any dash, hyphen, EM dash, EN dash, tilde or "to"
  const parts = (duration || "").split(/\s*(?:-|–|—|to|~)\s*/i);
  const startStr = parts[0] || "";
  const endStr = parts[1] || "";
  
  const startVal = parseMonthYear(startStr);
  const endVal = parseMonthYear(endStr);
  const isPresent = endStr.toLowerCase().trim() === "present";
  
  return { startVal, endVal, isPresent };
};

// Test cases
const tests = [
  "Apr 2026 – Present",
  "Nov 2025 – Dec 2025",
  "2021 - 2023",
  "04/2026 - Present",
  "05-2022 to 08-2024",
  "Present",
  ""
];

tests.forEach(t => {
  console.log(`INPUT: "${t}" -> `, parseDuration(t));
});
