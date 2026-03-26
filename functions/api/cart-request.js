export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const phone = String(body?.phone || "").trim();
    const comment = String(body?.comment || "").trim();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!name || !email) {
      return Response.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    if (!items.length) {
      return Response.json(
        { error: "Cart is empty." },
        { status: 400 }
      );
    }

    const itemsText = items
      .map((item, index) => {
        const qty = Number(item.qty) || 0;
        const price = Number(item.price) || 0;

        return [
          `${index + 1}. ${item.name || "Unnamed item"}`,
          `   Article: ${item.article || "-"}`,
          `   Brand: ${item.brand || "-"}`,
          `   Transmission: ${item.group || "-"}`,
          `   Type: ${item.type || "-"}`,
          `   Qty: ${qty}`,
          `   Price: EUR ${price.toFixed(2)}`
        ].join("\n");
      })
      .join("\n\n");

    const emailText = [
      "New cart request from website",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || "-"}`,
      "",
      `Comment: ${comment || "-"}`,
      "",
      "Items:",
      itemsText
    ].join("\n");

    const resendApiKey = context.env.RESEND_API_KEY;
    const toEmail = context.env.REQUEST_TO_EMAIL;
    const fromEmail = context.env.REQUEST_FROM_EMAIL || "onboarding@resend.dev";

    if (!resendApiKey || !toEmail) {
      return Response.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `New cart request from ${name}`,
        text: emailText
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return Response.json(
        { error: resendData?.message || "Failed to send email." },
        { status: 500 }
      );
    }

const customerItemsText = items
  .map((item, index) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;

    return `${index + 1}. ${item.name || "Unnamed item"} — Qty: ${qty} — EUR ${price.toFixed(2)}`;
  })
  .join("\n");

const customerText = [
  `Hello ${name},`,
  "",
  "Thank you for your request to Tiptronic Group.",
  "We have received your cart enquiry with the following items:",
  "",
  customerItemsText,
  "",
  `Comment: ${comment || "-"}`,
  "",
  "Our team will contact you shortly.",
  "",
  "Best regards,",
  "Tiptronic Group"
].join("\n");

const customerHtml = `
  <p>Hello ${escapeHtml(name)},</p>
  <p>Thank you for your request to <strong>Tiptronic Group</strong>.</p>
  <p>We have received your cart enquiry with the following items:</p>
  <pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${escapeHtml(customerItemsText)}</pre>
  <p><strong>Comment:</strong> ${escapeHtml(comment || "-")}</p>
  <p>Our team will contact you shortly.</p>
  <p>Best regards,<br>Tiptronic Group</p>
`;

const customerResponse = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${resendApiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: fromEmail,
    to: [email],
    subject: "We received your cart request | Tiptronic Group",
    text: customerText,
    html: customerHtml
  })
});

const customerData = await customerResponse.json();

if (!customerResponse.ok) {
  return Response.json(
    {
      error: customerData?.message || "Request received, but confirmation email failed."
    },
    { status: 500 }
  );
}

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
