const { schedule } = require("@netlify/functions");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const AI_AGENT_QUERIES = [
  "ai-agent automation tool",
  "langchain agent",
  "autogpt",
  "crewai",
  "openai agent",
  "ai workflow automation",
  "llm agent framework",
];

const fetchGitHubSkills = async () => {
  let allSkills = [];

  for (const query of AI_AGENT_QUERIES) {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(
        query
      )}&sort=stars&order=desc&per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const data = await response.json();

    if (!data.items) continue;

    const filtered = data.items
      .filter((repo) => {
        const updatedAt = new Date(repo.updated_at);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        return (
          repo.stargazers_count >= 100 &&
          !repo.archived &&
          !repo.disabled &&
          repo.open_issues_count < 50 &&
          updatedAt > threeMonthsAgo
        );
      })
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || "No description",
        stars: repo.stargazers_count,
        url: repo.html_url,
        topics: repo.topics || [],
        language: repo.language || "Unknown",
        updated_at: repo.updated_at,
        open_issues: repo.open_issues_count,
      }));

    allSkills = [...allSkills, ...filtered];

    // Rate limit safe rakhne ke liye delay
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Duplicate remove karo
  const unique = Array.from(
    new Map(allSkills.map((s) => [s.id, s])).values()
  );

  // Stars ke hisaab se sort karo
  unique.sort((a, b) => b.stars - a.stars);

  return unique.slice(0, 50); // Top 50 skills
};

const handler = async () => {
  try {
    console.log("Fetching AI agent skills from GitHub...");
    const skills = await fetchGitHubSkills();

    // Netlify Blob mein save karo
    const { getStore } = require("@netlify/blobs");
    const store = getStore("skills-cache");
    await store.set(
      "latest",
      JSON.stringify({
        skills,
        updated_at: new Date().toISOString(),
        total: skills.length,
      })
    );

    console.log(`✅ ${skills.length} skills cached successfully`);
    return { statusCode: 200 };
  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500 };
  }
};

exports.handler = schedule("0 0 * * *", handler);
