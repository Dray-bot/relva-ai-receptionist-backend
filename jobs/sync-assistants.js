require("dotenv").config();

const supabase = require("../services/supabase");
const { listAssistants } = require("../services/vapi");

async function syncAssistants() {
  console.log(
    "Starting assistant sync..."
  );

  const assistants = await listAssistants();

  if (!Array.isArray(assistants)) {
    throw new Error(
      "Vapi did not return an assistant list"
    );
  }

  console.log(
    `Found ${assistants.length} assistant(s) in Vapi.`
  );

  for (const assistant of assistants) {
    const assistantId = assistant?.id;

    if (!assistantId) {
      continue;
    }

    /*
     * We only automatically register assistants that
     * already exist in our database.
     *
     * New assistants still need an owner mapping because
     * we cannot safely guess which client's WhatsApp number
     * should receive their leads.
     */

    const { data: existing, error } =
      await supabase
        .from("assistants")
        .select("id, assistant_id, client_name")
        .eq("assistant_id", assistantId)
        .maybeSingle();

    if (error) {
      console.error(
        `Failed checking assistant ${assistantId}:`,
        error.message
      );

      continue;
    }

    if (existing) {
      console.log(
        `Already registered: ${assistant.name || assistantId}`
      );

      continue;
    }

    console.log(
      `New Vapi assistant discovered: ${
        assistant.name || assistantId
      }`
    );

    /*
     * We deliberately DO NOT insert it yet.
     *
     * We need the client's name and WhatsApp number
     * before we can safely create the mapping.
     */
  }

  console.log(
    "Assistant sync finished."
  );
}

async function run() {
  try {
    await syncAssistants();
    process.exit(0);
  } catch (error) {
    console.error(
      "Assistant sync failed:",
      error
    );

    process.exit(1);
  }
}

run();