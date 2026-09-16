function cleanText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned || null;
}

function extractEmailFromText(text) {
  if (!text) {
    return null;
  }

  const emailMatch = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return emailMatch
    ? emailMatch[0].toLowerCase()
    : null;
}

function getAllMessages(call) {
  const messages = [];

  if (Array.isArray(call?.artifact?.messages)) {
    messages.push(
      ...call.artifact.messages
    );
  }

  if (Array.isArray(call?.messages)) {
    messages.push(
      ...call.messages
    );
  }

  return messages;
}

function findValue(
  value,
  keys
) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return findValue(
        JSON.parse(value),
        keys
      );
    } catch {
      return null;
    }
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  for (const key of keys) {
    if (
      value[key] !== undefined &&
      value[key] !== null
    ) {
      return value[key];
    }
  }

  for (const child of Object.values(value)) {
    const result =
      findValue(
        child,
        keys
      );

    if (result !== null) {
      return result;
    }
  }

  return null;
}

function extractAppointment(call) {
  const messages =
    getAllMessages(call);

  for (const message of messages) {
    const startDateTime =
      findValue(
        message,
        [
          "startDateTime",
          "startDate",
          "startTime"
        ]
      );

    if (!startDateTime) {
      continue;
    }

    const endDateTime =
      findValue(
        message,
        [
          "endDateTime",
          "endDate",
          "endTime"
        ]
      );

    const timeZone =
      findValue(
        message,
        [
          "timeZone",
          "timezone"
        ]
      );

    return {
      appointmentBooked: true,

      appointmentDate:
        String(
          startDateTime
        ),

      appointmentEndDate:
        endDateTime
          ? String(
              endDateTime
            )
          : null,

      appointmentTimeZone:
        timeZone
          ? String(
              timeZone
            )
          : null
    };
  }

  return {
    appointmentBooked: false,
    appointmentDate: null,
    appointmentEndDate: null,
    appointmentTimeZone: null
  };
}

function extractLead(call) {
  const customer =
    call?.customer || {};

  const metadata =
    call?.metadata || {};

  const leadName =
    cleanText(
      customer.name
    ) ||
    cleanText(
      customer.firstName &&
      customer.lastName
        ? `${customer.firstName} ${customer.lastName}`
        : customer.firstName
    );

  const leadPhone =
    cleanText(
      customer.number
    ) ||
    cleanText(
      customer.phoneNumber
    );

  const transcript =
    cleanText(
      call?.artifact?.transcript
    ) ||
    cleanText(
      call?.transcript
    ) ||
    "";

  const leadEmail =
    cleanText(
      customer.email
    ) ||
    cleanText(
      customer.emailAddress
    ) ||
    extractEmailFromText(
      transcript
    );

  const appointment =
    extractAppointment(
      call
    );

  /*
   * Prefer structured metadata when available.
   * Otherwise fall back to transcript detection
   * for real calls.
   */
  const qualified =
    typeof metadata.qualified === "boolean"
      ? metadata.qualified
      : detectQualification(
          transcript
        );

  const interest =
    cleanText(
      metadata.interest
    ) ||
    detectInterest(
      transcript
    );

  const appointmentBooked =
    typeof metadata.appointmentBooked === "boolean"
      ? metadata.appointmentBooked
      : appointment.appointmentBooked;

  return {
    qualified,

    leadName,

    leadPhone,

    leadEmail,

    interest,

    summary:
      transcript
        ? transcript.substring(
            0,
            2000
          )
        : null,

    appointmentBooked,

    appointmentDate:
      appointment.appointmentDate,

    appointmentEndDate:
      appointment.appointmentEndDate,

    appointmentTimeZone:
      appointment.appointmentTimeZone,

    followUpRequired:
      !appointmentBooked
  };
}

function detectQualification(
  transcript
) {
  const text =
    transcript.toLowerCase();

  return (
    text.includes("buy") ||
    text.includes("buying") ||
    text.includes("sell") ||
    text.includes("selling") ||
    text.includes("rent") ||
    text.includes("renting") ||
    text.includes("invest") ||
    text.includes("property") ||
    text.includes("house") ||
    text.includes("apartment") ||
    text.includes("appointment") ||
    text.includes("viewing")
  );
}

function detectInterest(
  transcript
) {
  const text =
    transcript.toLowerCase();

  if (
    text.includes("buy") ||
    text.includes("buying")
  ) {
    return "Buying";
  }

  if (
    text.includes("sell") ||
    text.includes("selling")
  ) {
    return "Selling";
  }

  if (
    text.includes("rent") ||
    text.includes("renting")
  ) {
    return "Renting";
  }

  if (
    text.includes("invest") ||
    text.includes("investment")
  ) {
    return "Investing";
  }

  if (
    text.includes("view") ||
    text.includes("viewing")
  ) {
    return "Property viewing";
  }

  if (
    text.includes("property")
  ) {
    return "Property inquiry";
  }

  return null;
}

module.exports = {
  extractLead
};