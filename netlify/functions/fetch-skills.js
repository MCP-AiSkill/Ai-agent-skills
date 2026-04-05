const { getStore } = require("@netlify/blobs");

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
    await new Promise((r) => setTimeout(r, 1000));
  }

  const unique = Array.from(
    new Map(allSkills.map((s) => [s.id, s])).values()
  );
  unique.sort((a, b) => b.stars - a.stars);
  return unique.slice(0, 50);
};

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    console.log("Fetching AI agent skills from GitHub...");
    const skills = await fetchGitHubSkills();

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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `✅ ${skills.length} skills fetched and cached!`,
        total: skills.length,
      }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
