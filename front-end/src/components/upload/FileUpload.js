import { useField } from "formik";

const FileUpload = ({ fileRef, ...props }) => {
    const [field, meta] = useField(props);
    return (
      <div className="w-full p-2 border border-gray rounded-lg">
        <input ref={fileRef} multiple={true} type="file" {...field} />
        {meta.touched && meta.error ? (
          <div style={{ color: "red" }}>{meta.error}</div>
        ) : null}
      </div>
    );
};

export default FileUpload;