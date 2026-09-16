const VAPI_BASE_URL = "https://api.vapi.ai";

function getHeaders() {
  const apiKey = process.env.VAPI_API_KEY;

  if (!apiKey) {
    throw new Error("VAPI_API_KEY is missing from .env");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

async function vapiRequest(path, options = {}) {
  const response = await fetch(
    `${VAPI_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {})
      }
    }
  );

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Vapi API error ${response.status}: ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function listAssistants() {
  return vapiRequest("/assistant");
}

async function getAssistant(assistantId) {
  if (!assistantId) {
    throw new Error("assistantId is required");
  }

  return vapiRequest(
    `/assistant/${encodeURIComponent(assistantId)}`
  );
}

async function getCall(callId) {
  if (!callId) {
    throw new Error("callId is required");
  }

  return vapiRequest(
    `/call/${encodeURIComponent(callId)}`
  );
}

module.exports = {
  listAssistants,
  getAssistant,
  getCall
};