// utils.js
import html2canvas from "html2canvas";

export const handleScreenshot = (elementId) => {
    const element = document.getElementById(elementId);
    console.log("Element for screenshot:", element);
    if (!element) {
      console.error(`Element with ID ${elementId} not found.`);
      return;
    }
    html2canvas(element).then((canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "logo.png";
      link.click();
    }).catch(error => {
      console.error("Error capturing screenshot: ", error);
    });
  };