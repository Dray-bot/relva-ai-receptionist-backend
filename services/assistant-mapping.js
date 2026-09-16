const supabase = require("./supabase");

async function getAssistantOwner(assistantId) {
  if (!assistantId) {
    throw new Error("assistantId is required");
  }

  const {
    data,
    error
  } = await supabase
    .from("assistants")
    .select(
      "id, assistant_id, client_name, email"
    )
    .eq(
      "assistant_id",
      assistantId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to find assistant owner: ${error.message}`
    );
  }

  return data;
}

module.exports = {
  getAssistantOwner
};