// CustomerDetail.js
import React, { useState, useEffect, useRef } from "react";
import { FaArrowLeft, FaArrowRight, FaCloudDownloadAlt } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { handleScreenshot } from "../Utils/DownloadPng"; // Import the function
import "./Customer.css";
// import { handleScreenshotAsPDF } from "../Utils/DownloadPdf";
import Header from "../header/Header";
import { sendorder, setdata, fetchcustomerdata } from "../../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaWhatsapp } from "react-icons/fa6";
import { IoPrint } from "react-icons/io5";
import { addItem, getAll, saveItems } from "../../DB";

const toastOptions = {
  position: "bottom-right",
  autoClose: 5000,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
};
const CustomerDetail = () => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [productsToSend, setproductsToSend] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [orders, setOrders] = useState([]);
  const getdeliveryCharge = localStorage.getItem("deliveryCharge");
  const deliveryChargeAmount = parseFloat(getdeliveryCharge) || 0;
  // State to hold all saved customers for auto-fill
  const [savedCustomers, setSavedCustomers] = useState([]);
  // State to hold suggestions based on current phone input
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);

  const [discountAmount, setDiscountAmount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  const invoiceRef = useRef(); // Reference to the hidden invoice content
  const navigate = useNavigate();

  useEffect(() => {
    // Load selected products and total amount from localStorage
    const storedProducts =
      JSON.parse(localStorage.getItem("productsToSend")) || [];
    const storedAmount = parseFloat(localStorage.getItem("totalAmount")) || 0;
    const savedOrders = JSON.parse(localStorage.getItem("orders")) || [];
    setOrders(savedOrders);

    setproductsToSend(storedProducts);
    setTotalAmount(storedAmount);
  }, []);

  useEffect(() => {
    // Fetch customer data from API (or use localStorage fallback)
    const fetchData = async () => {
      try {
        const response = await fetchcustomerdata();
        const customersArray = Array.isArray(response)
          ? response
          : response.data || [];
        setSavedCustomers(customersArray);
        // await saveItems('customers', customersArray);
      } catch {
        const offline = await getAll("customers");
        setSavedCustomers(offline);
        const localStorageCustomers =
          JSON.parse(localStorage.getItem("customers")) || [];
        if (localStorageCustomers.length > 0) {
          setSavedCustomers(localStorageCustomers);
        }
      }
    };
    fetchData();
  }, []);

  // Load orders from IDB for history
  useEffect(() => {
    const load = async () => {
      const offline = await getAll("orders");
      setOrders(offline);
    };
    load();
  }, []);

  // Update suggestions based on current phone input (prefix match)
  useEffect(() => {
    if (customerPhone.trim().length === 10) {
      setPhoneSuggestions([]);
    } else if (customerPhone.trim() !== "") {
      const suggestions = savedCustomers.filter((customer) =>
        String(customer.phone).trim().startsWith(customerPhone.trim())
      );
      setPhoneSuggestions(suggestions);
    } else {
      setPhoneSuggestions([]);
    }
  }, [customerPhone, savedCustomers]);

  // When a suggestion is clicked, fill the fields and clear suggestions.
  const handleSuggestionClick = (customer) => {
    setCustomerPhone(String(customer.phone));
    setCustomerName(customer.name);
    setCustomerAddress(customer.address);
    setPhoneSuggestions([]);
  };

  // Helper function to calculate total price
  const calculateTotalPrice = (products = []) => {
    return products.reduce(
      (total, product) => total + product.price * product.quantity,
      0
    );
  };

  const computeTotals = () => {
    const base = calculateTotalPrice(productsToSend) + deliveryChargeAmount;

    const amt = parseFloat(discountAmount) || 0;
    const pct = parseFloat(discountPercent) || 0;

    let disc = 0;
    if (pct > 0) disc = (pct / 100) * base;
    else if (amt > 0) disc = amt;
    disc = Math.min(disc, base);

    return { base, discountValue: disc, netTotal: base - disc };
  };

  const { discountValue, netTotal } = computeTotals();

  const handleSendToWhatsApp = () => {

    // Reuse your computeTotals logic so WhatsApp matches the printed invoice
    const { base, discountValue, netTotal } = computeTotals();
    // base is itemTotal + deliveryChargeAmount

    // Map product details into a formatted string
    const productDetails = productsToSend
      .map((product) => {
        const quantity = product.quantity || 1;
        const size = product.size ? ` ${product.size}` : ""; // Include size only if it exists
        return `${quantity}.0 x ${product.name}${size} = ₹${
          product.price * quantity
        }`;
      })
      .join("\n"); // Join product details with a single newline

    // Check if deliveryCharge exists
    const serviceChargeText = deliveryCharge
      ? `Service Charge +${deliveryChargeAmount}` // No extra newline
      : "";

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  // Build the WhatsApp message in the same order as the invoice
   let msg = `Order: *${orderId}*\n`;
   msg += `Amount: *${netTotal.toFixed(2)}*`;
   if (customerPhone)   msg += `\nPhone: *${customerPhone}*`;
   if (customerName)    msg += `\nName: *${customerName}*`;
   if (customerAddress) msg += `\nAddress: *${customerAddress}*`;
   msg += `\n\n----------ITEMS----------\n${productDetails}`;
   // Totals block
   if (serviceChargeText) {
     msg += `\n\n${serviceChargeText}`;
   }

   if (discountValue > 0) {
     msg += `\nDiscount  *–${discountValue.toFixed(2)}*`;
   }
   const message = encodeURIComponent(msg);

    const phoneNumber = customerPhone;

    const formattedPhoneNumber = phoneNumber
      ? `+91${phoneNumber}` // Prepend +91 for India if the phone number is present
      : phoneNumber;

    if (phoneNumber) {
      window.open(
        `https://wa.me/${formattedPhoneNumber}?text=${message}`,
        "_blank"
      );
    } else {
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSendClick = async () => {
    const { discountValue, netTotal } = computeTotals();

    const productsToSend = JSON.parse(localStorage.getItem("productsToSend"));
    if (!productsToSend || productsToSend.length === 0) {
      toast.error("Please add product before proceed", toastOptions);
      return; // Exit the function early
    }

    setShowPopup(true);

    if (deliveryCharge) {
      localStorage.setItem("deliveryCharge", deliveryCharge);
    }

    const orderId = `order_${Date.now()}`;

    // Create an order object
    const order = {
      id: orderId,
      products: productsToSend,
      totalAmount: netTotal,
      discountApplied: discountValue,
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      timestamp: new Date().toISOString(),
    };

    const customerDataObject = {
      id: orderId,
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      timestamp: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      // OFFLINE: just queue for later
      await addItem("orders", order);
      await addItem("customers", customerDataObject);
      toast.info("You’re offline — order is saved locally ", toastOptions);
      setShowPopup(false);
      navigate("/invoice");
      return;
    }
    // ONLINE: send immediately
    setShowPopup(true);
    try {
      await sendorder(order);
      await setdata(customerDataObject);
    } catch (err) {
      await addItem("orders", order);
      console.error("Error sending online order:", err);
      toast.info("You’re offline — order is saved locally ", toastOptions);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);

    localStorage.removeItem("productsToSend");

    // Navigate to the invoice page
    navigate("/invoice");
  };

  const handlePngDownload = () => {
    // Show the hidden invoice, take the screenshot, and then hide it again
    invoiceRef.current.style.display = "block";
    setTimeout(() => {
      handleScreenshot("mobileinvoice");
      invoiceRef.current.style.display = "none";
    }, 10);
  };

  const convertImageToBase64 = (imagePath) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "Anonymous"; // To handle cross-origin issues if needed
      image.src = imagePath;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = (error) => reject(error);
    });
  };

  const MobilePrint = async () => {
    try {
      // Convert both logo and QR code to Base64

      const kotContent = document.getElementById("mobileinvoice").innerHTML;

      const newWindow = window.open("", "", "width=600,height=400");
      newWindow.document.write(`
        <html>
          <head>
            <title>KOT</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                margin: 3rem 0;
                padding: 0;
                width: 48mm;
              }
              table {
                width: 94%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid black;
                padding: 2px;
                text-align: left;
                font-size: 11px;
                color: "black";
              }
                .total {
                font-size: 13px;
                text-align: left;
                margin-top: 4px;
                display: flex;
                align-items: baseline;
                justify-content: space-between;
              }
              .totalAmount {
                font-size: 15px;
                font-weight: 800;
                border: 2px dashed;
                text-align: center;
                background: black;
                color: white;
                padding: 0.4rem;
              }
              .logo {
                display: flex;
                margin: auto;
              }
              .logo img {
                width: 40px;
                height: auto;
              }
              hr {
                border: 2px dashed;
              }
            </style>
          </head>
          <body>
            ${kotContent}
          </body>
        </html>
      `);

      newWindow.document.close();

      newWindow.onload = () => {
        newWindow.focus();
        newWindow.print();
        newWindow.close();
      };
    } catch (error) {
      console.error("Error generating printable content:", error);
    }
  };

  // Handle customer phone input validation
  const handlePhoneChange = (e) => {
    const phoneValue = e.target.value;

    // Only allow numeric input and ensure length is <= 10
    if (/^\d*$/.test(phoneValue) && phoneValue.length <= 10) {
      setCustomerPhone(phoneValue);
    }
  };

  const getdeliverycharge = localStorage.getItem("deliveryCharge")
    ? parseFloat(localStorage.getItem("deliveryCharge"))
    : 0; // Default to 0 if not set

  const [logoAvailable, setLogoAvailable] = useState(true);
  const [qrAvailable, setQrAvailable] = useState(true);

  const orderType = localStorage.getItem("orderType");

  return (
    <div>
      <ToastContainer />
      <Header />
      <div className="cust-inputs" style={{ marginTop: "4rem" }}>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name..."
        />
      </div>
      <div className="cust-inputs">
        <input
          type="text"
          value={customerPhone}
          onChange={handlePhoneChange}
          placeholder="Customer phone..."
        />
      </div>

      {/* Suggestions Dropdown */}
      {phoneSuggestions.length > 0 && (
        <ul
          className="suggestions"
          style={{
            background: "#fff",
            border: "2px solid black",
            zIndex: 10,
            listStyle: "none",
            padding: 0,
            margin: "auto",
            width: "90%",
            maxHeight: "150px",
            overflowY: "auto",
            borderRadius: "1rem",
          }}
        >
          {phoneSuggestions.map((suggestion) => (
            <li
              key={suggestion.phone}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: "0.5rem",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {suggestion.phone} - {suggestion.name}
            </li>
          ))}
        </ul>
      )}

      <div className="cust-inputs">
        <input
          type="text"
          value={customerAddress}
          onChange={(e) => setCustomerAddress(e.target.value)}
          placeholder="Customer address..."
        />
      </div>
      <div className="cust-inputs">
        <input
          type="number"
          value={deliveryCharge}
          onChange={(e) => setDeliveryCharge(e.target.value)}
          placeholder="Delivery charge..."
        />
      </div>

      <div className="cust-inputs">
        <input
          type="number"
          value={discountAmount}
          onChange={(e) => {
            setDiscountAmount(e.target.value);
            setDiscountPercent(""); // clear percent if you start typing an amount
          }}
          placeholder="Discount (₹ amount)"
        />
      </div>
      <div className="cust-inputs">
        <select
          value={discountPercent}
          onChange={(e) => {
            setDiscountPercent(e.target.value);
            setDiscountAmount("");
          }}
        >
          <option value="">Discount (%)</option>
          <option value="5">5%</option>
          <option value="10">10%</option>
          <option value="15">15%</option>
          <option value="20">20%</option>
          <option value="25">25%</option>
          <option value="30">30%</option>
          <option value="35">35%</option>
          <option value="40">40%</option>
          <option value="45">45%</option>
          <option value="50">50%</option>
          <option value="55">55%</option>
          <option value="60">60%</option>
          <option value="65">65%</option>
          <option value="70">70%</option>
          <option value="75">75%</option>
          <option value="80">80%</option>
          <option value="85">85%</option>
          <option value="90">90%</option>
          <option value="95">95%</option>
          <option value="100">100%</option>
        </select>
      </div>

      {/* mobile print content */}
      <div
        className="invoice-content"
        id="mobileinvoice"
        ref={invoiceRef}
        style={{ display: "none" }}
      >
        <h3 style={{ textAlign: "center" }}>
          {orderType === "delivery" ? "Delivery" : "Dine-In"}
        </h3>
        {logoAvailable && (
          <img
            src="/logo5.jpg"
            alt="Logo5"
            width={150}
            className="logo"
            onError={() => setLogoAvailable(false)}
          />
        )}
        <h1 style={{ textAlign: "center", margin: 0, fontSize: "25px" }}>
          Australian Bite
        </h1>
        <p
          style={{
            textAlign: "center",
            marginTop: "1rem",
            fontSize: "14px",
            padding: "0 2px",
          }}
        >
          Ambarsari Farm, Kurukshetra Road Pehowa, (136-128)
        </p>
        <p style={{ textAlign: "center", margin: 0, fontSize: "14px" }}>
          +91 74043-39777
        </p>
        <p style={{ textAlign: "center", margin: 0, fontSize: "14px" }}>
          +91 74043-38777
        </p>
        <hr />
        <h2 style={{ textAlign: "center", margin: 0, fontSize: "20px" }}>
          Invoice Details
        </h2>
        <div className="customer-info">
          <p style={{ fontSize: "12px", margin: "0" }}>
            Bill No:&nbsp;&nbsp;
            {`#${Math.floor(1000 + Math.random() * 9000)}`}{" "}
            {/* Random 6-digit bill number */}
          </p>
          <p style={{ fontSize: "12px", margin: "0" }}>
            Date:&nbsp;&nbsp;&nbsp;&nbsp;
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }) +
              " " +
              new Date().toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true, // Enables 12-hour format
              })}
          </p>

          {customerName && (
            <p style={{ fontSize: "12px", margin: "0" }}>
              Customer:&nbsp;{customerName}
            </p>
          )}
          {customerPhone && (
            <p style={{ fontSize: "12px", margin: "0" }}>
              Phone:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{customerPhone}
            </p>
          )}
          {customerAddress && (
            <p style={{ fontSize: "12px", margin: "0 0 1rem 0" }}>
              Address:&nbsp;&nbsp;&nbsp;&nbsp;{customerAddress}
            </p>
          )}
        </div>
        <table>
          <thead>
            <tr className="productname">
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {productsToSend.map((product, index) => (
              <tr key={index} className="productdetail">
                <td>
                  {product.size
                    ? `${product.name} (${product.size})`
                    : product.name}
                </td>
                <td style={{ textAlign: "Center" }}>{product.quantity || 1}</td>
                <td style={{ textAlign: "Center" }}>₹{product.price}</td>
                <td style={{ textAlign: "Center" }}>
                  ₹{product.price * (product.quantity || 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {getdeliverycharge !== 0 && (
          <>
            <div className="total">
              <p style={{ margin: "1rem 0 0 0" }}>Item Total </p>

              <p style={{ margin: "0" }}>
                ₹
                {productsToSend
                  .reduce(
                    (sum, product) =>
                      sum + product.price * (product.quantity || 1),
                    0
                  )
                  .toFixed(2)}
              </p>
            </div>
            <div className="total">
              <p style={{ margin: "0" }}>Service Charge:</p>
              <p style={{ margin: "0" }}>₹{getdeliverycharge.toFixed(2)}</p>
            </div>
          </>
        )}
        {(discountAmount > 0 || discountPercent > 0) && (
          <div className="total">
            <p style={{ margin: 0 }}>
              Discount: {discountPercent > 0 && ` (${discountPercent}%)`}
            </p>
            <p style={{ margin: "0" }}>–{discountValue.toFixed(2)}</p>
          </div>
        )}
        <p className="totalAmount">Net Total: ₹{netTotal.toFixed(2)}</p> <hr />
        {qrAvailable && (
          <>
            <div
              style={{
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "1rem",
              }}
            >
              {" "}
              Order Online
            </div>
            <img
              src="/qr.png"
              alt="QR Code"
              style={{ display: "flex", margin: "2px auto" }}
              onError={() => setQrAvailable(false)}
            />
          </>
        )}
        <div
          style={{
            textAlign: "center",
            fontSize: "15px",
            padding: "2rem 0",
          }}
        >
          Thank You Visit Again!
        </div>
        <hr />
        <hr />
      </div>
      <div className="invoice-btn">
        <button
          onClick={() => {
            navigate("/invoice", { state: { from: "customer-detail" } });
          }}
          className="invoice-kot-btn"
        >
          <h2> BACK </h2>
        </button>

        <button onClick={handleSendClick} className="invoice-next-btn">
          <h2> NEXT</h2>
          {/* <FaArrowRight className="Invoice-arrow" /> */}
        </button>
      </div>
      {/* Modal Popup */}
      {showPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupContent}>
            <h2> Action</h2>
            <button onClick={handleSendToWhatsApp} style={styles.popupButton}>
              <FaWhatsapp style={{ fontSize: "1.5rem" }} />{" "}
              <span style={{ marginLeft: "1rem" }}>WhatsApp</span>
            </button>
            <button onClick={handlePngDownload} style={styles.popupButton}>
              <FaCloudDownloadAlt style={{ fontSize: "1.5rem" }} />
              <span style={{ marginLeft: "1rem" }}>Download</span>
            </button>
            <button onClick={MobilePrint} style={styles.popupButton}>
              <IoPrint style={{ fontSize: "1.5rem" }} />{" "}
              <span style={{ marginLeft: "1rem" }}>Print</span>
            </button>

            <button onClick={handleClosePopup} style={styles.popupCloseButton}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000, // ✅ Added here
  },
  popupContent: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
  },
  popupButton: {
    display: "flex",
    width: "100%",
    margin: "10px 0",
    padding: "10px",
    fontSize: "16px",
    cursor: "pointer",
  },
  popupCloseButton: {
    marginTop: "10px",
    backgroundColor: "red",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default CustomerDetail;
