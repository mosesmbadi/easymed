/**
 * The reason a request failed, in words a user can act on.
 *
 * A DRF 400 carries the reason in its body ({"item": ["FSH is a service item
 * and cannot hold stock."]}); axios's own err.message is only "Request failed
 * with status code 400". Prefer the body, fall back to the message.
 */
const flatten = (value) => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (typeof value === "object") return Object.values(value).flatMap(flatten);
    return [String(value)];
};

export const apiErrorMessage = (err, fallback = "Something went wrong") => {
    const data = err?.response?.data;

    if (typeof data === "string" && data.trim() && !data.trim().startsWith("<")) {
        return data;
    }
    if (data && typeof data === "object") {
        if (data.detail) return flatten(data.detail).join(" ");
        if (data.error_message) return flatten(data.error_message).join(" ");

        const messages = Object.entries(data).map(([field, msg]) => {
            const text = flatten(msg).join(" ");
            // Field errors usually name the problem already; only general
            // errors lose their key, since "non_field_errors:" means nothing.
            return field === "non_field_errors" ? text : `${field.replace(/_/g, " ")}: ${text}`;
        });
        if (messages.length) return messages.join("; ");
    }
    return err?.message || fallback;
};
