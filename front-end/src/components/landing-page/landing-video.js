import * as React from "react";
import Dialog from "@mui/material/Dialog";
import { AiFillPlayCircle } from "react-icons/ai";

export default function LandingVideo() {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <AiFillPlayCircle
        onClick={handleClickOpen}
        className="text-7xl cursor-pointer transform transition duration-500 hover:scale-125"
      />
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="lg"
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
          <iframe
            width="100%"
            height="500"
            src="https://www.youtube.com/embed/tADaSl_HtqA"
            title="YouTube Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
      </Dialog>
    </div>
  );
}
