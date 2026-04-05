const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // CORS preflight handle karo
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const store = getStore("skills-cache");
    const cached = await store.get("latest");

    if (!cached) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: "Skills not fetched yet. Please wait for next scheduled run.",
        }),
      };
    }

    const data = JSON.parse(cached);

    // Search/filter support karo
    const params = event.queryStringParameters || {};
    const search = params.search?.toLowerCase() || "";
    const language = params.language?.toLowerCase() || "";
    const topic = params.topic?.toLowerCase() || "";

    let skills = data.skills;

    if (search) {
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.description.toLowerCase().includes(search)
      );
    }

    if (language) {
      skills = skills.filter(
        (s) => s.language.toLowerCase() === language
      );
    }

    if (topic) {
      skills = skills.filter((s) =>
        s.topics.some((t) => t.toLowerCase().includes(topic))
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        skills,
        total: skills.length,
        updated_at: data.updated_at,
      }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
};
