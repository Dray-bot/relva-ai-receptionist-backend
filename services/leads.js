const supabase = require("./supabase");

async function saveLead({
  assistantId,
  callId,
  lead
}) {
  if (!assistantId) {
    throw new Error("assistantId is required");
  }

  if (!callId) {
    throw new Error("callId is required");
  }

  if (!lead?.leadPhone) {
    throw new Error(
      "Cannot save lead without a phone number"
    );
  }

  const {
    data: existingLead,
    error: lookupError
  } = await supabase
    .from("leads")
    .select("*")
    .eq("call_id", callId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Failed to check existing lead: ${lookupError.message}`
    );
  }

  if (existingLead) {
    return {
      lead: existingLead,
      isNew: false
    };
  }

  /*
   * Only schedule email follow-ups when:
   * - the lead is qualified
   * - the lead provided an email
   * - an appointment was not already booked
   */
  const shouldFollowUp =
    lead.qualified === true &&
    !!lead.leadEmail &&
    lead.followUpRequired === true;

  const nextFollowUpAt =
    shouldFollowUp
      ? new Date(
          Date.now() +
            24 * 60 * 60 * 1000
        ).toISOString()
      : null;

  const {
    data,
    error
  } = await supabase
    .from("leads")
    .insert({
      assistant_id: assistantId,
      call_id: callId,
      lead_name: lead.leadName,
      lead_phone: lead.leadPhone,
      lead_email: lead.leadEmail,
      status: lead.qualified
        ? "new"
        : "closed",
      follow_up_step: 0,
      next_follow_up_at:
        nextFollowUpAt,
      interest: lead.interest,
      summary: lead.summary,
      realtor_notified_at: null
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to save lead: ${error.message}`
    );
  }

  return {
    lead: data,
    isNew: true
  };
}

module.exports = {
  saveLead
};