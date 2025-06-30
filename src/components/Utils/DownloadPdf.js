import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const handleScreenshotAsPDF = (elementId) => {
  const element = document.getElementById(elementId);
  console.log("Element for screenshot:", element);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  html2canvas(element).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = canvas.height * pageWidth / canvas.width;

    if (imgHeight > pageHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, pageHeight);
    } else {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    }

    pdf.save("invoice.pdf"); // Download the PDF
  }).catch(error => {
    console.error("Error capturing screenshot as PDF: ", error);
  });
};
