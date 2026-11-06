import React from "react";

// Only for text from the API's RichTextField, which the backend has already cleaned.
const RichTextView = ({ html, className = "" }) => (
  <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: html || "" }} />
);

export default RichTextView;
