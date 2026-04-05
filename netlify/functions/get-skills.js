const { getStore } = require("@netlify/blobs");

const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const store = getStore({
      name: "skills-cache",
      siteID: NETLIFY_SITE_ID,
      token: NETLIFY_AUTH_TOKEN,
    });

    const cached = await store.get("latest");

    if (!cached) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Skills not fetched yet." }),
      };
    }

    const data = JSON.parse(cached);
    const params = event.queryStringParameters || {};
    const search = params.search?.toLowerCase() || "";

    let skills = data.skills;

    if (search) {
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.description.toLowerCase().includes(search)
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
