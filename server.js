const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
const PORT = 8081;

app.use(cors());

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send("Missing url parameter");
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        // 👇 Set fake referer and origin so the target server thinks it’s cineby.app
        Referer: "https://www.cineby.app/",
        Origin: "https://www.cineby.app/",
        // Optional: forward real user-agent
        "User-Agent": req.headers["user-agent"] || "",
      },
    });

    res.set(
      "Content-Type",
      response.headers.get("content-type") || "application/octet-stream"
    );
    response.body.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Failed to fetch target URL");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}`);
});
