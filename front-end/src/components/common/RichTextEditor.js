import React from "react";
import { useField } from "formik";
import HtmlEditor from "devextreme-react/html-editor";

// These live out here, and are passed as props, for a reason. A change to the
// `toolbar` option makes DevExtreme rebuild the whole editor. Declared inside the
// component, or as child elements, they count as changed on every render, and the
// form renders on every keystroke: the editor would lose focus after one character
// and destroy its own table and image dialogs as they opened.
const TOOLBAR = {
  multiline: true,
  items: [
    "undo",
    "redo",
    "separator",
    { name: "header", acceptedValues: [false, 1, 2, 3] },
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "separator",
    "alignLeft",
    "alignCenter",
    "alignRight",
    "orderedList",
    "bulletList",
    "increaseIndent",
    "decreaseIndent",
    "separator",
    "image",
    "separator",
    "insertTable",
    "insertHeaderRow",
    "insertRowAbove",
    "insertRowBelow",
    "insertColumnLeft",
    "insertColumnRight",
    "deleteRow",
    "deleteColumn",
    "deleteTable",
    "separator",
    "clear",
  ],
};
// The image travels inside the text. A link to one would be removed on saving.
const IMAGE_UPLOAD = { tabs: ["file"], fileUploadMode: "base64" };
const ENABLED = { enabled: true };

// Load with next/dynamic and ssr: false: the editor needs a browser.
const RichTextEditor = ({ name, placeholder, height = 320 }) => {
  const [field, , helpers] = useField(name);

  return (
    <HtmlEditor
      height={height}
      placeholder={placeholder}
      value={field.value}
      toolbar={TOOLBAR}
      imageUpload={IMAGE_UPLOAD}
      mediaResizing={ENABLED}
      tableContextMenu={ENABLED}
      tableResizing={ENABLED}
      onValueChanged={({ value }) => helpers.setValue(value)}
      onFocusOut={() => helpers.setTouched(true)}
    />
  );
};

export default RichTextEditor;
