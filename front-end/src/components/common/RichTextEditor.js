import React from "react";
import { useField } from "formik";
import HtmlEditor, {
  ImageUpload,
  Item,
  MediaResizing,
  TableContextMenu,
  TableResizing,
  Toolbar,
} from "devextreme-react/html-editor";

const TABLE_TOOLS = [
  "insertTable",
  "insertHeaderRow",
  "insertRowAbove",
  "insertRowBelow",
  "insertColumnLeft",
  "insertColumnRight",
  "deleteRow",
  "deleteColumn",
  "deleteTable",
];

const TEXT_TOOLS = ["bold", "italic", "underline", "strike", "color", "background"];
const LAYOUT_TOOLS = ["alignLeft", "alignCenter", "alignRight", "orderedList", "bulletList", "increaseIndent", "decreaseIndent"];

// Load with next/dynamic and ssr: false: the editor needs a browser.
const RichTextEditor = ({ name, placeholder, height = 320 }) => {
  const [field, , helpers] = useField(name);

  return (
    <HtmlEditor
      height={height}
      placeholder={placeholder}
      value={field.value}
      onValueChanged={({ value }) => helpers.setValue(value)}
      onFocusOut={() => helpers.setTouched(true)}
    >
      <MediaResizing enabled={true} />
      {/* The image travels inside the text. A link to one would be removed on saving. */}
      <ImageUpload tabs={["file"]} fileUploadMode="base64" />
      <TableContextMenu enabled={true} />
      <TableResizing enabled={true} />
      <Toolbar multiline={true}>
        <Item name="undo" />
        <Item name="redo" />
        <Item name="separator" />
        <Item name="header" acceptedValues={[false, 1, 2, 3]} />
        {TEXT_TOOLS.map((tool) => <Item key={tool} name={tool} />)}
        <Item name="separator" />
        {LAYOUT_TOOLS.map((tool) => <Item key={tool} name={tool} />)}
        <Item name="separator" />
        <Item name="image" />
        <Item name="separator" />
        {TABLE_TOOLS.map((tool) => <Item key={tool} name={tool} />)}
        <Item name="separator" />
        <Item name="clear" />
      </Toolbar>
    </HtmlEditor>
  );
};

export default RichTextEditor;
