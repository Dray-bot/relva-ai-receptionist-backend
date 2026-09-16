require("dotenv").config();

const express = require("express");

const supabase = require("./services/supabase");
const { listAssistants } = require("./services/vapi");

const vapiRoutes = require("./routes/vapi");

const app = express();

const PORT =
  process.env.PORT || 3000;

app.use(
  express.json({
    limit: "1mb"
  })
);

app.use(
  "/webhooks/vapi",
  vapiRoutes
);

app.get("/health", async (req, res) => {
  try {
    const {
      error
    } = await supabase
      .from("assistants")
      .select("id")
      .limit(1);

    if (error) {
      console.error(
        "Supabase health check failed:",
        error
      );

      return res.status(503).json({
        success: false,
        message:
          "Backend is running but Supabase is unavailable"
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Backend and Supabase are connected",
      timestamp:
        new Date().toISOString()
    });
  } catch (error) {
    console.error(
      "Health check error:",
      error
    );

    return res.status(503).json({
      success: false,
      message:
        "Supabase connection failed"
    });
  }
});

app.get("/test/vapi", async (req, res) => {
  try {
    const assistants =
      await listAssistants();

    return res.status(200).json({
      success: true,
      count:
        Array.isArray(assistants)
          ? assistants.length
          : 0,
      assistants
    });
  } catch (error) {
    console.error(
      "Vapi test failed:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,
      error: "Route not found"
    });
  }
);

app.use(
  (err, req, res, next) => {
    console.error(
      "Server error:",
      err
    );

    return res.status(500).json({
      success: false,
      error:
        "Internal server error"
    });
  }
);

app.listen(
  PORT,
  () => {
    console.log(
      `AI receptionist backend running on port ${PORT}`
    );
  }
);