function cleanText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned || null;
}

/* =========================================================
   MESSAGE HELPERS
========================================================= */

function getAllMessages(call) {
  const messages = [];

  if (Array.isArray(call?.artifact?.messages)) {
    messages.push(...call.artifact.messages);
  }

  if (Array.isArray(call?.messages)) {
    messages.push(...call.messages);
  }

  return messages;
}

function getMessageText(message) {
  if (!message) {
    return "";
  }

  if (typeof message === "string") {
    return message;
  }

  if (typeof message.message === "string") {
    return message.message;
  }

  if (typeof message.content === "string") {
    return message.content;
  }

  if (typeof message.text === "string") {
    return message.text;
  }

  return "";
}

function getUserMessages(call) {
  return getAllMessages(call)
    .filter(
      message =>
        message?.role === "user"
    )
    .map(getMessageText)
    .filter(Boolean);
}

function getBotMessages(call) {
  return getAllMessages(call)
    .filter(
      message =>
        message?.role === "bot" ||
        message?.role === "assistant"
    )
    .map(getMessageText)
    .filter(Boolean);
}

/* =========================================================
   PHONE NUMBER EXTRACTION
========================================================= */

const DIGIT_WORDS = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9"
};

function normalizeSpokenDigits(text) {
  if (!text) {
    return "";
  }

  const words = text
    .toLowerCase()
    .replace(/[-.,()[\]]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let result = "";

  for (const word of words) {
    if (DIGIT_WORDS[word] !== undefined) {
      result += DIGIT_WORDS[word];
    }
  }

  return result;
}

function normalizePhoneNumber(digits) {
  if (!digits) {
    return null;
  }

  /*
   * Nigerian local number:
   * 08140555354
   */

  if (
    digits.length === 11 &&
    digits.startsWith("0")
  ) {
    return digits;
  }

  /*
   * Nigerian international number:
   * 2348140555354
   */

  if (
    digits.length === 13 &&
    digits.startsWith("234")
  ) {
    return `+${digits}`;
  }

  /*
   * Other international numbers.
   */

  if (
    digits.length >= 10 &&
    digits.length <= 15
  ) {
    return `+${digits}`;
  }

  return null;
}

function extractPhoneFromText(text) {
  if (!text) {
    return null;
  }

  const lowerText =
    text.toLowerCase();

  const phoneContext =
    lowerText.includes("phone") ||
    lowerText.includes("number") ||
    lowerText.includes("mobile") ||
    lowerText.includes("contact");

  if (!phoneContext) {
    return null;
  }

  /*
   * Handles:
   *
   * 08140555354
   * 0814 055 5354
   * 0. 81. 40. 5. 553-54
   * +234 814 055 5354
   */

  const digitCandidateMatches =
    text.match(
      /\+?\d[\d\s().-]{8,}\d/g
    );

  if (digitCandidateMatches) {
    for (
      const candidate
      of digitCandidateMatches
    ) {
      const digits =
        candidate.replace(
          /\D/g,
          ""
        );

      if (
        digits.length >= 10 &&
        digits.length <= 15
      ) {
        return normalizePhoneNumber(
          digits
        );
      }
    }
  }

  /*
   * Handles:
   *
   * "zero eight one four zero five
   * five five three five four"
   */

  const spokenDigits =
    normalizeSpokenDigits(text);

  if (
    spokenDigits.length >= 10 &&
    spokenDigits.length <= 15
  ) {
    return normalizePhoneNumber(
      spokenDigits
    );
  }

  return null;
}

function extractLeadPhone(call) {
  /*
   * Prefer Vapi's structured customer data.
   */

  const customer =
    call?.customer || {};

  const customerPhone =
    cleanText(
      customer.number
    ) ||
    cleanText(
      customer.phoneNumber
    );

  if (customerPhone) {
    return customerPhone;
  }

  /*
   * Fall back to the actual user's
   * spoken message.
   */

  const userMessages =
    getUserMessages(call);

  for (
    const message
    of userMessages
  ) {
    const phone =
      extractPhoneFromText(
        message
      );

    if (phone) {
      return phone;
    }
  }

  return null;
}

/* =========================================================
   EMAIL EXTRACTION
========================================================= */

function normalizeSpokenEmail(text) {
  if (!text) {
    return null;
  }

  let value =
    text
      .toLowerCase()
      .trim();

  /*
   * Convert common spoken email phrases.
   */

  value =
    value
      .replace(
        /\s+at\s+/gi,
        "@"
      )
      .replace(
        /\s+at-sign\s+/gi,
        "@"
      )
      .replace(
        /\s+dot\s+/gi,
        "."
      );

  /*
   * Remove spaces around email punctuation.
   */

  value =
    value
      .replace(
        /\s*@\s*/g,
        "@"
      )
      .replace(
        /\s*\.\s*/g,
        "."
      );

  /*
   * Handle spelled-out characters.
   *
   * Example:
   * S-A-M-U-E-L-D-R. A. Y-1. 8-0
   *
   * becomes:
   * samueldray180
   */

  const atIndex =
    value.indexOf("@");

  if (atIndex === -1) {
    return null;
  }

  let localPart =
    value
      .slice(0, atIndex)
      .replace(
        /[^a-z0-9._+-]/gi,
        ""
      );

  let domainPart =
    value
      .slice(atIndex + 1)
      .replace(
        /[^a-z0-9.-]/gi,
        ""
      );

  /*
   * Common STT variations.
   */

  domainPart =
    domainPart
      .replace(
        /^gmailcom$/i,
        "gmail.com"
      )
      .replace(
        /^gmail\.com\.*$/i,
        "gmail.com"
      )
      .replace(
        /^yahoocom$/i,
        "yahoo.com"
      )
      .replace(
        /^outlookcom$/i,
        "outlook.com"
      )
      .replace(
        /^hotmailcom$/i,
        "hotmail.com"
      );

  if (
    !localPart ||
    !domainPart
  ) {
    return null;
  }

  const email =
    `${localPart}@${domainPart}`;

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    return null;
  }

  return email;
}

function extractEmailFromText(text) {
  if (!text) {
    return null;
  }

  /*
   * Normal email:
   * john@gmail.com
   */

  const normalMatch =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

  if (normalMatch) {
    return normalMatch[0]
      .toLowerCase()
      .trim();
  }

  /*
   * Spoken email:
   *
   * "john at gmail dot com"
   */

  const spoken =
    normalizeSpokenEmail(
      text
    );

  if (spoken) {
    return spoken;
  }

  return null;
}

function extractLeadEmail(call) {
  /*
   * Prefer structured customer email.
   */

  const customer =
    call?.customer || {};

  const customerEmail =
    cleanText(
      customer.email
    ) ||
    cleanText(
      customer.emailAddress
    );

  if (customerEmail) {
    return customerEmail
      .toLowerCase();
  }

  /*
   * Fall back to the actual user's
   * spoken message.
   */

  const userMessages =
    getUserMessages(call);

  for (
    const message
    of userMessages
  ) {
    const email =
      extractEmailFromText(
        message
      );

    if (email) {
      return email;
    }
  }

  return null;
}

/* =========================================================
   NAME EXTRACTION
========================================================= */

function cleanName(name) {
  return name
    .trim()
    .replace(
      /[.,!?]+$/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}

function extractLeadName(call) {
  const customer =
    call?.customer || {};

  const customerName =
    cleanText(
      customer.name
    );

  if (customerName) {
    return customerName;
  }

  const firstName =
    cleanText(
      customer.firstName
    );

  const lastName =
    cleanText(
      customer.lastName
    );

  if (
    firstName &&
    lastName
  ) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) {
    return firstName;
  }

  /*
   * Fall back to what the caller said.
   */

  const userMessages =
    getUserMessages(call);

  for (
    const message
    of userMessages
  ) {
    const patterns = [
      /\bmy name is\s+(.+)/i,
      /\bi am\s+(.+)/i,
      /\bi'm\s+(.+)/i
    ];

    for (
      const pattern
      of patterns
    ) {
      const match =
        message.match(
          pattern
        );

      if (!match) {
        continue;
      }

      let name =
        cleanName(
          match[1]
        );

      /*
       * Don't accidentally capture
       * an entire sentence.
       */

      name =
        name
          .split(
            /\b(?:and|i'm|i am|my phone|my email|my number)\b/i
          )[0]
          .trim();

      if (name) {
        return name;
      }
    }
  }

  return null;
}

/* =========================================================
   RECURSIVE VALUE SEARCH
========================================================= */

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

  for (
    const key
    of keys
  ) {
    if (
      value[key] !== undefined &&
      value[key] !== null
    ) {
      return value[key];
    }
  }

  for (
    const child
    of Object.values(value)
  ) {
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

/* =========================================================
   APPOINTMENT EXTRACTION
========================================================= */

function extractAppointment(
  call
) {
  const messages =
    getAllMessages(call);

  /*
   * First look for structured
   * calendar information.
   */

  for (
    const message
    of messages
  ) {
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
          : "Africa/Lagos"
    };
  }

  /*
   * Fallback to David's confirmation.
   */

  const botMessages =
    getBotMessages(call);

  for (
    const message
    of botMessages
  ) {
    const lower =
      message.toLowerCase();

    const bookingConfirmed =
      lower.includes("booked") ||
      lower.includes("booking is confirmed") ||
      lower.includes("appointment is confirmed") ||
      lower.includes("appointment has been confirmed");

    if (!bookingConfirmed) {
      continue;
    }

    const parsed =
      parseAppointmentFromText(
        message
      );

    if (parsed) {
      return parsed;
    }
  }

  return {
    appointmentBooked: false,
    appointmentDate: null,
    appointmentEndDate: null,
    appointmentTimeZone: null
  };
}

function parseAppointmentFromText(
  text
) {
  /*
   * Matches:
   *
   * September 17, 2026, at 4:00 PM
   * September 17 2026 at 4 PM
   */

  const match =
    text.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4}),?\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i
    );

  if (!match) {
    return null;
  }

  const month =
    match[1];

  const day =
    Number(match[2]);

  const year =
    Number(match[3]);

  let hour =
    Number(match[4]);

  const minute =
    Number(
      match[5] || "0"
    );

  const meridiem =
    match[6].toUpperCase();

  if (
    meridiem === "PM" &&
    hour !== 12
  ) {
    hour += 12;
  }

  if (
    meridiem === "AM" &&
    hour === 12
  ) {
    hour = 0;
  }

  /*
   * Build a Lagos (+01:00) ISO datetime.
   */

  const monthNumber =
    {
      January: 1,
      February: 2,
      March: 3,
      April: 4,
      May: 5,
      June: 6,
      July: 7,
      August: 8,
      September: 9,
      October: 10,
      November: 11,
      December: 12
    }[month];

  const localIso =
    `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+01:00`;

  const start =
    new Date(localIso);

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return null;
  }

  const end =
    new Date(
      start.getTime() +
        30 * 60 * 1000
    );

  return {
    appointmentBooked: true,

    appointmentDate:
      start.toISOString(),

    appointmentEndDate:
      end.toISOString(),

    appointmentTimeZone:
      "Africa/Lagos"
  };
}

/* =========================================================
   QUALIFICATION
========================================================= */

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

/* =========================================================
   MAIN LEAD EXTRACTION
========================================================= */

function extractLead(call) {
  const metadata =
    call?.metadata || {};

  const transcript =
    cleanText(
      call?.artifact?.transcript
    ) ||
    cleanText(
      call?.transcript
    ) ||
    getAllMessages(call)
      .map(
        getMessageText
      )
      .join("\n");

  const leadName =
    extractLeadName(
      call
    );

  const leadPhone =
    extractLeadPhone(
      call
    );

  const leadEmail =
    extractLeadEmail(
      call
    );

  const appointment =
    extractAppointment(
      call
    );

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

module.exports = {
  extractLead
};