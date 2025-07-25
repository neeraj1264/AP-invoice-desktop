import React, { useState, useEffect, useMemo } from "react";
import { FaFileInvoice, FaImage, FaTrash } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";
import "./Invoice.css";
import {
  FaMinusCircle,
  FaPlusCircle,
  FaArrowRight,
  FaBars,
  FaTimesCircle,
  FaSearch,
  FaEdit,
} from "react-icons/fa";
// import { AiOutlineBars } from "react-icons/ai";
import { IoMdCloseCircle } from "react-icons/io";
import Header from "../header/Header";
import { fetchProducts, removeProduct } from "../../api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { IoClose } from "react-icons/io5";
import { getAll, saveItems } from "../../DB";
import { useOnlineStatus } from "../../useOnlineStatus";

const Invoice = () => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productsToSend, setProductsToSend] = useState([]);
  const [Search, setSearch] = useState(""); // State for search query
  const [showPopup, setShowPopup] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [selectedVariety, setSelectedVariety] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryVisible, setIsCategoryVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");

  const { isOnline, checkBackend } = useOnlineStatus();
  const [isChecking, setIsChecking] = useState(false);
  const [editingBillNo, setEditingBillNo] = useState(null);

  // default to “delivery”
  const [orderType, setOrderType] = useState("delivery");

  // two separate lists in localStorage
  const [deliveryBills, setDeliveryBills] = useState(
    () => JSON.parse(localStorage.getItem("deliveryKotData")) || []
  );
  const [dineInBills, setDineInBills] = useState(
    () => JSON.parse(localStorage.getItem("dineInKotData")) || []
  );
  const [takeawayBills, setTakeawayBills] = useState(
    () => JSON.parse(localStorage.getItem("takeawayKotData")) || []
  );
  // tracks which list to show in the modal
  const [modalType, setModalType] = useState("delivery"); // "delivery" or "dine-in"

  const [kotInstructions, setKotInstructions] = useState("");
  const [showInstructionPrompt, setShowInstructionPrompt] = useState(false);

  const openBillsModal = (type) => {
    setModalType(type);
    setShowKotModal(true);
  };

  // State for modal visibility and data
  const [showKotModal, setShowKotModal] = useState(false);
  const [now, setNow] = useState(Date.now());

  const navigate = useNavigate(); // For navigation

  const guardAddProduct = async (e) => {
    e.preventDefault();
    if (isChecking) return;
    setIsChecking(true);

    // Get fresh status on click
    const currentStatus = await checkBackend();

    if (currentStatus) {
      navigate("/NewProduct");
    } else {
      toast.info(
        "You’re offline—cannot add a new product right now.");
    }
    setIsChecking(false);
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const EXPIRY_MS = 2 * 60 * 60 * 1000;

  useEffect(() => {
    const cleanUp = (bills, setBills, storageKey) => {
      const fresh = bills.filter((order) => now - order.timestamp < EXPIRY_MS);
      if (fresh.length !== bills.length) {
        setBills(fresh);
        localStorage.setItem(storageKey, JSON.stringify(fresh));
      }
    };

    cleanUp(deliveryBills, setDeliveryBills, "deliveryKotData");
    cleanUp(dineInBills, setDineInBills, "dineInKotData");
    cleanUp(takeawayBills, setTakeawayBills, "takeawayKotData");
  }, [now, deliveryBills, dineInBills, takeawayBills]);

  // Format milliseconds to HH:mm:ss
  const formatRemaining = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const [showRemoveBtn, setShowRemoveBtn] = useState(false);
  let pressTimer;

  const handlePressStart = () => {
    // Set a timeout to show the remove button after 1 second (1000 ms)
    pressTimer = setTimeout(() => {
      setShowRemoveBtn(true);
    }, 1000);
  };

  const handlePressEnd = () => {
    // Clear the timeout if the user releases the press before 1 second
    clearTimeout(pressTimer);
  };

  const filteredProducts = selectedProducts
    .filter((product) =>
      product.name.toLowerCase().includes(Search.toLowerCase())
    )
    .reduce((acc, product) => {
      const category = product.category || "Others";

      // Ensure the category key exists in the accumulator
      if (!acc[category]) {
        acc[category] = [];
      }

      // Add the product to the correct category group
      acc[category].push(product);

      return acc;
    }, {});

  const location = useLocation();

  // memoize sorted category list for consistency
  const categories = useMemo(
    () => Object.keys(filteredProducts).sort((a, b) => a.localeCompare(b)),
    [filteredProducts]
  );

  // initialize activeCategory when filteredProducts first load
  useEffect(() => {
    if (categories.length) setActiveCategory(categories[0]);
  }, [categories]);

  // improved scroll‐spy
  useEffect(() => {
    const offset = 7 * 24; // px

    const onScroll = () => {
      // build array of {cat, distance} pairs
      const distances = categories.map((cat) => {
        const el = document.getElementById(cat);
        const top = el ? el.getBoundingClientRect().top : Infinity;
        return { cat, distance: top - offset };
      });

      // filter for those “above” the offset, then pick the one closest to it
      const inView = distances
        .filter((d) => d.distance <= 0)
        .sort((a, b) => b.distance - a.distance);

      setActiveCategory(inView[0]?.cat ?? categories[0]);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once on mount
    return () => window.removeEventListener("scroll", onScroll);
  }, [categories]);

  useEffect(() => {
    localStorage.removeItem("productsToSend");
    setProductsToSend([]);
  }, []);
  useEffect(() => {
    const fromCustomerDetail = location.state?.from === "customer-detail";
    if (fromCustomerDetail) {
      localStorage.removeItem("productsToSend");
      setProductsToSend([]);
    }
  }, [location]);

 useEffect(() => {
  let cancelled = false;

  async function hydrateFromIDB() {
    try {
      const offline = await getAll("products");
      if (cancelled) return;
      setSelectedProducts(offline);
    } catch (err) {
      console.error("Error loading from IDB:", err);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  async function refreshFromServer() {
    try {
      const products = await fetchProducts();
      if (cancelled) return;
      setSelectedProducts(products);
      await saveItems("products", products);
    } catch (err) {
      console.warn("Server fetch failed, keeping IDB data:", err);
    }
  }

  hydrateFromIDB();      // 1️⃣ immediately populate from IDB & hide spinner
  refreshFromServer();   // 2️⃣ then update in background

  // also restore the cart‑to‑send list
  const stored = JSON.parse(localStorage.getItem("productsToSend")) || [];
  setProductsToSend(stored);
  localStorage.removeItem("deliveryCharge");

  return () => {
    cancelled = true;
  };
}, []);

  // Persist cart to IDB whenever it changes
  useEffect(() => {
    // clear old cart, then repopulate
    const syncCart = async () => {
      await saveItems(
        "cart",
        productsToSend.map((p, idx) => ({ ...p, id: idx }))
      );
    };
    if (productsToSend.length) syncCart();
  }, [productsToSend]);

  const handleOpenPopup = (product) => {
    if (product.varieties && product.varieties.length > 0) {
      setCurrentProduct(product);
      setShowPopup(true);

      const savedSelectedVarieties = JSON.parse(
        localStorage.getItem("selectedVariety") || "[]"
      );
      setSelectedVariety(
        savedSelectedVarieties.filter((v) => v.productId === product.id)
      ); // Filter by productId
    } else {
      handleAddToWhatsApp(product); // Directly add product if no varieties
    }
  };

  // useEffect(() => {
  //   // Reset selectedVariety on popup close or when a new product is selected
  //   setSelectedVariety([]);
  // }, [showPopup]);

  // Save selectedVariety to localStorage whenever it changes
  useEffect(() => {
    if (selectedVariety.length > 0) {
      localStorage.setItem("selectedVariety", JSON.stringify(selectedVariety));
    }
  }, [selectedVariety]);

  // Clear selectedVariety from localStorage when page refreshes
  useEffect(() => {
    localStorage.removeItem("selectedVariety");
  }, []);

  const handleVarietyQuantityChange = (variety, delta, productId) => {
    setSelectedVariety((prev) => {
      let updatedVarieties = prev.map((selected) =>
        selected.size === variety.size &&
        selected.price === variety.price &&
        selected.productId === productId
          ? { ...selected, quantity: (selected.quantity || 0) + delta }
          : selected
      );

      // Remove variety if the quantity becomes less than 1
      updatedVarieties = updatedVarieties.filter(
        (selected) => selected.quantity > 0
      );

      // Save updated selectedVariety to localStorage
      localStorage.setItem("selectedVariety", JSON.stringify(updatedVarieties));

      // Update productsToSend based on the updated selectedVarieties

      return updatedVarieties;
    });
  };

  const handleVarietyChange = (variety, isChecked, productId) => {
    setSelectedVariety((prev) => {
      let updatedVarieties;
      if (isChecked) {
        updatedVarieties = [
          ...prev,
          { ...variety, quantity: 1, productId }, // Add productId to variety
        ];
      } else {
        updatedVarieties = prev.filter(
          (selected) =>
            !(
              selected.size === variety.size &&
              selected.price === variety.price &&
              selected.productId === productId
            ) // Match by productId too
        );
      }

      localStorage.setItem("selectedVariety", JSON.stringify(updatedVarieties));
      return updatedVarieties;
    });
  };

  const handleAddToWhatsApp = (product, selectedVarieties = []) => {
    // Handle products with no varieties
    if (selectedVarieties.length === 0) {
      const exists = productsToSend.some(
        (prod) =>
          prod.name === product.name &&
          prod.price === product.price &&
          prod.size === product.size
      );

      if (!exists) {
        // Add the product if it doesn't already exist
        setProductsToSend((prev) => {
          const updatedProducts = [...prev, { ...product, quantity: 1 }];
          // Update localStorage after setting the state
          localStorage.setItem(
            "productsToSend",
            JSON.stringify(updatedProducts)
          );
          return updatedProducts;
        });
      } else {
        // Update quantity if the product already exists
        setProductsToSend((prev) => {
          const updatedProducts = prev.map((prod) =>
            prod.name === product.name &&
            prod.price === product.price &&
            prod.size === product.size
              ? { ...prod, quantity: prod.quantity + 1 }
              : prod
          );
          // Update localStorage after setting the state
          localStorage.setItem(
            "productsToSend",
            JSON.stringify(updatedProducts)
          );
          return updatedProducts;
        });
      }
      return;
    }

    // Handle products with selected varieties
    const newProducts = selectedVarieties.map((variety) => ({
      ...product,
      ...variety,
      quantity: variety.quantity || 0, // Default quantity for each variety
    }));

    setProductsToSend((prev) => {
      let updatedProductsToSend = [...prev];

      newProducts.forEach((newProduct) => {
        const exists = updatedProductsToSend.some(
          (prod) =>
            prod.name === newProduct.name &&
            prod.price === newProduct.price &&
            prod.size === newProduct.size
        );

        if (!exists) {
          updatedProductsToSend.push(newProduct);
        } else {
          updatedProductsToSend = updatedProductsToSend.map((prod) =>
            prod.name === newProduct.name &&
            prod.price === newProduct.price &&
            prod.size === newProduct.size
              ? { ...prod, quantity: newProduct.quantity }
              : prod
          );
        }
      });

      // Update localStorage after state update
      localStorage.setItem(
        "productsToSend",
        JSON.stringify(updatedProductsToSend)
      );

      return updatedProductsToSend;
    });

    setShowPopup(false); // Close popup
    setSelectedVariety([]); // Reset selected varieties
  };

  // Function to handle quantity changes
  const handleQuantityChange = (productName, productPrice, delta) => {
    const updatedProductsToSend = productsToSend
      .map((prod) => {
        if (prod.name === productName && prod.price === productPrice) {
          const newQuantity = prod.quantity + delta;
          if (newQuantity < 1) {
            return null; // Remove the product if quantity goes below 1
          }
          return { ...prod, quantity: newQuantity };
        }
        return prod;
      })
      .filter(Boolean); // Remove any null values

    setProductsToSend(updatedProductsToSend);
    localStorage.setItem(
      "productsToSend",
      JSON.stringify(updatedProductsToSend)
    );
  };

  // Function to remove a product from selected products and productsToSend
  const handleRemoveProduct = async (productName, productPrice) => {
    try {
      // Call the API function
      await removeProduct(productName, productPrice);

      // Remove product from the selectedProducts and productsToSend arrays
      const updatedSelectedProducts = selectedProducts.filter(
        (prod) => !(prod.name === productName && prod.price === productPrice)
      );
      const updatedProductsToSend = productsToSend.filter(
        (prod) => !(prod.name === productName && prod.price === productPrice)
      );

      // Update the state
      setSelectedProducts(updatedSelectedProducts);
      setProductsToSend(updatedProductsToSend);

      // Update localStorage
      localStorage.setItem("products", JSON.stringify(updatedSelectedProducts));
      localStorage.setItem(
        "productsToSend",
        JSON.stringify(updatedProductsToSend)
      );

      console.log("Product removed successfully from both MongoDB and state");
    } catch (error) {
      console.error("Error removing product:", error.message);
    }
  };

  // Helper function to calculate total price
  const calculateTotalPrice = (products = []) => {
    return products.reduce(
      (total, product) => total + product.price * product.quantity,
      0
    );
  };

  const handleCategoryClick = (category) => {
    const categoryElement = document.getElementById(category);
    if (categoryElement) {
      // Calculate the offset position (7rem margin)
      const offset = 7 * 16; // Convert rem to pixels (assuming 1rem = 16px)
      const elementPosition = categoryElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      // Smooth scroll to the position with the offset
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setIsCategoryVisible((prev) => !prev);

    setActiveCategory(category);
  };

  const toggleCategoryVisibility = () => {
    setIsCategoryVisible((prev) => !prev); // Toggle visibility
  };

  const getCurrentBills = () => {
    if (modalType === "delivery") return deliveryBills;
    if (modalType === "dine-in") return dineInBills;
    if (modalType === "takeaway") return takeawayBills;
    return [];
  };

localStorage.getItem("kotCounter");

  // New: KOT (Kitchen Order Ticket) print handler
  const handleKot = (instruction = "") => {

    const todayKey = new Date().toLocaleDateString();
    const counter = JSON.parse(localStorage.getItem("kotCounter")) || { date: todayKey, lastNo: 0 };
    let nextNo;
  
    if (editingBillNo) {
      // we’re re‐printing an edited ticket: reuse its original number
      nextNo = editingBillNo;
    } else {
      // brand‐new KOT: bump (or reset) the counter
      nextNo = counter.date === todayKey ? counter.lastNo + 1 : 1;
      localStorage.setItem(
        "kotCounter",
        JSON.stringify({ date: todayKey, lastNo: nextNo })
      );
    }
  
    // after we’ve captured it, clear edit mode so only this one re‐print reuses it
    setEditingBillNo(null);

    const billNo = String(nextNo).padStart(4, "0");
    // Append current order snapshot
    const kotEntry = {
      billNo:     billNo,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      items: productsToSend,
      orderType,
      instruction,
    };

    // inject instructions under the header:
    const instructionHtml = instruction
      ? `<div style="font-style:italic; margin-bottom:4px;">Instruction: ${instruction}</div>`
      : "";

    if (orderType === "delivery") {
      const next = [...deliveryBills, kotEntry];
      setDeliveryBills(next);
      localStorage.setItem("deliveryKotData", JSON.stringify(next));
    } else if (orderType === "dine-in") {
      const next = [...dineInBills, kotEntry];
      setDineInBills(next);
      localStorage.setItem("dineInKotData", JSON.stringify(next));
    } else if (orderType === "takeaway") {
      const next = [...takeawayBills, kotEntry];
      setTakeawayBills(next);
      localStorage.setItem("takeawayKotData", JSON.stringify(next));
    }

    // Clear current productsToSend
    setProductsToSend([]);
    localStorage.setItem("productsToSend", JSON.stringify([]));

    const printArea = document.getElementById("sample-section");
    if (!printArea) {
      console.warn("No sample-section found to print.");
      return;
    }

    const header = `
  <div style="text-align:center; font-weight:700; margin-bottom:8px;">
  Bill No. ${billNo}
    ${
      orderType === "delivery"
        ? "Delivery"
        : orderType === "dine-in"
        ? "Dine‑In"
        : "Takeaway"
    }
  </div>
`;

    const printContent = header + instructionHtml + printArea.innerHTML;
    const win = window.open("", "", "width=600,height=400");
    const style = `<style>
  @page { size: 48mm auto; margin:0; }
  @media print {
    body{ width:48mm; margin:0; padding:4mm; font-size:1rem; }
    .product-item{ display:flex; justify-content:space-between; margin-bottom:1rem;}
    .hr{ border:none; border-bottom:1px solid #000; margin:2px 0;}
    .invoice-btn , .icon{ display:none; }
  }
</style>`;

    win.document.write(
      `<html>
      <head>
      <title>KOT Ticket</title>
     ${style}
        </head>
        <body>
        ${printContent}
        </body>
        </html>`
    );
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

   const saveKot = () => {

    const todayKey = new Date().toLocaleDateString();
    const counter = JSON.parse(localStorage.getItem("kotCounter")) || { date: todayKey, lastNo: 0 };
    let nextNo;
  
    if (editingBillNo) {
      // we’re re‐printing an edited ticket: reuse its original number
      nextNo = editingBillNo;
    } else {
      // brand‐new KOT: bump (or reset) the counter
      nextNo = counter.date === todayKey ? counter.lastNo + 1 : 1;
      localStorage.setItem(
        "kotCounter",
        JSON.stringify({ date: todayKey, lastNo: nextNo })
      );
    }
  
    // after we’ve captured it, clear edit mode so only this one re‐print reuses it
    setEditingBillNo(null);

    const billNo = String(nextNo).padStart(4, "0");
    // Append current order snapshot
    const kotEntry = {
      billNo:     billNo,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      items: productsToSend,
      orderType,
    };

    if (orderType === "delivery") {
      const next = [...deliveryBills, kotEntry];
      setDeliveryBills(next);
      localStorage.setItem("deliveryKotData", JSON.stringify(next));
    } else if (orderType === "dine-in") {
      const next = [...dineInBills, kotEntry];
      setDineInBills(next);
      localStorage.setItem("dineInKotData", JSON.stringify(next));
    } else if (orderType === "takeaway") {
      const next = [...takeawayBills, kotEntry];
      setTakeawayBills(next);
      localStorage.setItem("takeawayKotData", JSON.stringify(next));
    }

    // Clear current productsToSend
    setProductsToSend([]);
    localStorage.setItem("productsToSend", JSON.stringify([]));
  };

  const handleCreateInvoice = (orderItems, type) => {
    // save the items and the order type
    localStorage.setItem("productsToSend", JSON.stringify(orderItems.items));
    localStorage.setItem("orderType", type);
    // also pass via react-router state (optional, but nice)
    navigate("/customer-detail", { state: { orderType: type, billNo: orderItems.billNo, } });
    setShowKotModal(false);
  };

  const deleteKot = (idx) => {
    if (modalType === "delivery") {
      const updated = deliveryBills.filter((_, i) => i !== idx);
      setDeliveryBills(updated);
      localStorage.setItem("deliveryKotData", JSON.stringify(updated));
    } else if (modalType === "dine-in") {
      const updated = dineInBills.filter((_, i) => i !== idx);
      setDineInBills(updated);
      localStorage.setItem("dineInKotData", JSON.stringify(updated));
    } else if (modalType === "takeaway") {
      const updated = takeawayBills.filter((_, i) => i !== idx);
      setTakeawayBills(updated);
      localStorage.setItem("TakeAwayKotData", JSON.stringify(updated));
    }
  };

  const editKot = (order, idx) => {

    // Grab this ticket’s number into state
      setEditingBillNo(order.billNo);

    // Remove from the correct list
    if (modalType === "delivery") {
      const updated = deliveryBills.filter((_, i) => i !== idx);
      setDeliveryBills(updated);
      localStorage.setItem("deliveryKotData", JSON.stringify(updated));
    } else if (modalType === "dine-in") {
      const updated = dineInBills.filter((_, i) => i !== idx);
      setDineInBills(updated);
      localStorage.setItem("dineInKotData", JSON.stringify(updated));
    } else if (modalType === "takeaway") {
      const updated = takeawayBills.filter((_, i) => i !== idx);
      setTakeawayBills(updated);
      localStorage.setItem("TakeAwayKotData", JSON.stringify(updated));
    }

    // Load into current products
    setProductsToSend(order.items);
    localStorage.setItem("productsToSend", JSON.stringify(order.items));
    setShowKotModal(false);
  };

  const nonVegCategories = new Set([
    "Non Veg Pizza",
    "Chicken_burger",
    "Non_Veg_Special",
    "Non_Veg_Soup",
    "Chicken_Snack",
    "Non_veg_main",
    "Tandoori_Non_Veg",
  ]);

  return (
    <div>
      <Header
        headerName="Urban Pizzeria"
        setSearch={setSearch}
        onClick={toggleCategoryVisibility}
      />
      <div className="invoice-container">
        <div className="category-barr">
          <div className="category-b">
            <div className="category-bar">
              {Object.keys(filteredProducts)
                .sort((a, b) => a.localeCompare(b))
                .map((category, index) => (
                  <button
                    key={index}
                    className={`category-btn 
                      ${activeCategory === category ? "active" : ""}
                      ${nonVegCategories.has(category) ? "non-veg" : ""}
                    `}
                    onClick={() => handleCategoryClick(category)} // Trigger scroll to category
                  >
                    {category}
                  </button>
                ))}
            </div>
          </div>
        </div>
        <div className="main-section">
          <div className="main">
            {loading ? (
              // Display loading effect when fetching data
              <div className="lds-ripple">
                <div></div>
                <div></div>
              </div>
            ) : Object.keys(filteredProducts).length > 0 ? (
              Object.keys(filteredProducts)
                .sort((a, b) => a.localeCompare(b)) // Sort category names alphabetically
                .map((category, index) => (
                  <div key={index} className="category-container">
                    <h2 className="category" id={category}>
                      {category}
                    </h2>
                    {filteredProducts[category]
                      .sort((a, b) => a.price - b.price) // Sort products by price in ascending order
                      .map((product, idx) => (
                        <>
                          <hr />
                          <div>
                            <div key={idx} className="main-box">
                              {/* <div className="img-box">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              style={{ width: "3rem", height: "3rem" }}
                            />
                          ) : (
                            <FaImage
                              style={{ width: "3rem", height: "3rem" }}
                            />
                          )}
                        </div> */}

                              <div
                                className="sub-box"
                                onMouseDown={handlePressStart}
                                onMouseUp={handlePressEnd}
                                onTouchStart={handlePressStart}
                                onTouchEnd={handlePressEnd}
                              >
                                <h4 className="p-name">
                                  {product.name}
                                  {product.varieties &&
                                  Array.isArray(product.varieties) &&
                                  product.varieties[0]?.size
                                    ? ` (${product.varieties[0].size})`
                                    : ""}
                                </h4>
                                <p className="p-name-price">
                                  Rs.{" "}
                                  {product.price
                                    ? product.price // Use product price if it exists
                                    : product.varieties.length > 0
                                    ? product.varieties[0].price // Fallback to first variety price
                                    : "N/A"}{" "}
                                  {/* Handle case when neither price nor varieties are available */}
                                  {showRemoveBtn && (
                                    <span
                                      className="remove-btn"
                                      onClick={() =>
                                        handleRemoveProduct(
                                          product.name,
                                          product.price
                                        )
                                      }
                                    >
                                      <FaTimesCircle />
                                    </span>
                                  )}
                                </p>
                              </div>

                              {productsToSend.some(
                                (prod) =>
                                  prod.name === product.name &&
                                  prod.price === product.price
                              ) ? (
                                <div className="quantity-btns">
                                  <button
                                    className="icons"
                                    onClick={() =>
                                      handleQuantityChange(
                                        product.name,
                                        product.price,
                                        -1
                                      )
                                    }
                                  >
                                    <FaMinusCircle />
                                  </button>
                                  <span style={{ margin: "0 .4rem" }}>
                                    {productsToSend.find(
                                      (prod) =>
                                        prod.name === product.name &&
                                        prod.price === product.price
                                    )?.quantity || 1}
                                  </span>
                                  <button
                                    className="icons"
                                    onClick={() =>
                                      handleQuantityChange(
                                        product.name,
                                        product.price,
                                        1
                                      )
                                    }
                                  >
                                    <FaPlusCircle />
                                  </button>
                                </div>
                              ) : (
                                <div className="btn-box">
                                  <button
                                    onClick={() => handleOpenPopup(product)}
                                    className="add-btn"
                                  >
                                    Add
                                  </button>
                                  {product.varieties?.length > 0 && (
                                    <span className="customise-text">
                                      Customise
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ))}
                  </div>
                ))
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </div>

        {productsToSend.length > 0 ? (
          <div className="sample-section">
            <div className="check-container">
              <>
                <ul className="product-list" id="sample-section">
                  <hr className="hr" />
                  <li className="product-item" style={{ display: "flex" }}>
                    <div style={{ width: "10%" }}>
                      <span>No.</span>
                    </div>
                    <div style={{ width: "50%", textAlign: "center" }}>
                      <span>Name</span>
                    </div>
                    <div style={{ width: "20%", textAlign: "center" }}>
                      <span>Qty</span>
                    </div>
                    <div style={{ width: "15%", textAlign: "right" }}>
                      <span>Price</span>
                    </div>
                  </li>
                  {/* <div style={{ textAlign: "center" }}>{dash}</div> */}
                  <hr className="hr" />
                  {productsToSend.map((product, index) => (
                    <li
                      key={index}
                      className="product-item"
                      style={{ display: "flex" }}
                    >
                      <div style={{ width: "10%" }}>
                        <span>{index + 1}.</span>
                      </div>
                      <div style={{ width: "50%" }}>
                        <span>{product.name}</span>
                      </div>
                      <div style={{ width: "20%", textAlign: "center" }}>
                        <div className="quantity-btn">
                          <button
                            className="icon"
                            onClick={() =>
                              handleQuantityChange(
                                product.name,
                                product.price,
                                -1
                              )
                            }
                            // disabled={product.quantity <= 1}
                          >
                            <FaMinusCircle />
                          </button>
                          <span>{product.quantity}</span>
                          <button
                            className="icon"
                            onClick={() =>
                              handleQuantityChange(
                                product.name,
                                product.price,
                                1
                              )
                            }
                          >
                            <FaPlusCircle />
                          </button>
                        </div>
                      </div>{" "}
                      <div style={{ width: "15%", textAlign: "right" }}>
                        <span>{product.price * product.quantity}</span>
                      </div>
                    </li>
                  ))}
                  {/* <div style={{ textAlign: "center" }}>{dash}</div> */}
                  <hr className="hr" />
                  <li className="product-item" style={{ display: "flex" }}>
                    <div
                      style={{
                        width: "77%",
                        textAlign: "center",
                        fontWeight: 800,
                      }}
                    >
                      <span>Total</span>
                    </div>
                    <div
                      style={{
                        width: "15%",
                        textAlign: "right",
                        fontWeight: 900,
                      }}
                    >
                      <span>{calculateTotalPrice(productsToSend)}</span>
                    </div>
                    <div
                      style={{
                        width: "5%",
                        textAlign: "left",
                        fontWeight: 900,
                      }}
                    >
                      <span>/-</span>
                    </div>
                  </li>
                  {/* <div style={{ textAlign: "center" }}>{dash}</div> */}
                  <hr className="hr" />
                  <hr className="hr" style={{ marginBottom: "3rem" }} />
                </ul>
                <div className="order-type">
                  {["delivery", "dine-in", "takeaway"].map((type) => (
                    <label key={type} className="order-option">
                      <input
                        type="radio"
                        name="orderType"
                        value={type}
                        checked={orderType === type}
                        onChange={() => setOrderType(type)}
                      />
                      <span className="option-content">
                        <em>
                          {type === "delivery"
                            ? "Delivery"
                            : type === "dine-in"
                            ? "Dine‑In"
                            : "Takeaway"}
                        </em>
                      </span>
                    </label>
                  ))}
                </div>

                  <div style={{display: "flex" , justifyContent: "space-around"}}>
                <button
                  onClick={() => setShowInstructionPrompt(true)}
                  className="kot-btn"
                  style={{ borderRadius: "0" }}
                >
                  <h2>Print KOT</h2>
                </button>

                  <button
                  onClick={() => saveKot()}
                  className="kot-btn"
                  style={{ borderRadius: "0" }}
                >
                  <h2>Save KOT</h2>
                </button>
                </div>

              </>
            </div>
          </div>
        ) : (
          <p className="no-products">No products found </p>
        )}
      </div>

      {showInstructionPrompt && (
        <div className="instruction-overlay">
          <div className="instruction-modal">
            <h3>Any instructions for the kitchen?</h3>
            <textarea
              rows={3}
              value={kotInstructions}
              onChange={(e) => setKotInstructions(e.target.value)}
              placeholder="E.g. Extra spicy, No garlic..."
            />
            <div className="instruction-actions">
              <button
                onClick={() => {
                  setShowInstructionPrompt(false);
                  setKotInstructions("");
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowInstructionPrompt(false);
                  handleKot(kotInstructions);
                  setKotInstructions("");
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="invoice-btn">
        <button onClick={guardAddProduct} className="invoice-kot-btn">
          <h2> + PRODUCT </h2>
        </button>
        <button
          onClick={() => openBillsModal("delivery")}
          className="invoice-next-btn"
        >
          <h2>Delivery Bills ({deliveryBills.length})</h2>
        </button>
        <button
          onClick={() => openBillsModal("dine-in")}
          className="invoice-next-btn"
        >
          <h2>Dine-In Bills ({dineInBills.length})</h2>
        </button>
        <button
          onClick={() => openBillsModal("takeaway")}
          className="invoice-next-btn"
        >
          <h2>Takeaway Bills ({takeawayBills.length})</h2>
        </button>
      </div>
      {showKotModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>
              {modalType === "delivery"
                ? "Delivery"
                : modalType === "dine-in"
                ? "Dine-In"
                : "Takeaway"}{" "}
              Bills
            </h3>
            {getCurrentBills().length === 0 && <p>No bills found.</p>}

            <button
              className="close-btn"
              onClick={() => setShowKotModal(false)}
            >
              <IoClose />
            </button>
            <div className="kot-list">
              {getCurrentBills().length === 0 && <p>No bills found.</p>}
              {(modalType === "delivery"
                ? deliveryBills
                : modalType === "dine-in"
                ? dineInBills
                : takeawayBills
              ).map((order, idx) => {
                const remaining = EXPIRY_MS - (now - order.timestamp);
                return (
                  <div key={idx} className="kot-entry">
                    <h4 className="kot-timer">
                      Bill Expire in <span>{formatRemaining(remaining)}</span>
                    </h4>
                    <h4>
                       Bill No. {order.billNo}
                      <span className="kot-date">{order.date}</span>
                    </h4>
                    {order.instruction && (
                      <p className="kot-instruction">
                        <strong>Note:</strong> {order.instruction}
                      </p>
                    )}
                    <ul>
                      {order.items.map((item, i) => (
                        <>
                          <li key={i} className="kot-product-item">
                            <span>
                              {item.name} x {item.quantity}
                            </span>
                            <span>
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </li>
                        </>
                      ))}
                    </ul>
                    <div className="kot-entry-actions">
                      <FaTrash
                        className="del-action-icon action-icon"
                        size={20}
                        onClick={() => deleteKot(idx)}
                      />
                      <FaEdit
                        className="edit-action-icon action-icon"
                        size={20}
                        onClick={() => editKot(order, idx)}
                      />
                      <FaFileInvoice
                        className="invoice-action-icon action-icon"
                        size={20}
                        onClick={() =>
                          handleCreateInvoice(order, modalType)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {showPopup && currentProduct && currentProduct.varieties?.length > 0 && (
        <div className="popup-overlay">
          <div className="popup-contentt">
            <FaTimesCircle
              className="close-icon"
              onClick={() => setShowPopup(false)}
            />
            <h3>Select Size for {currentProduct.name}</h3>
            {currentProduct.varieties.map((variety, index) => (
              <div key={index} className="variety-option">
                <label className="variety-label">
                  <input
                    type="checkbox"
                    name="variety"
                    value={index}
                    checked={selectedVariety.some(
                      (v) =>
                        v.size === variety.size &&
                        v.price === variety.price &&
                        v.productId === currentProduct.id
                    )}
                    onChange={(e) =>
                      handleVarietyChange(
                        variety,
                        e.target.checked,
                        currentProduct.id
                      )
                    }
                  />
                  <span>
                    {variety.size.charAt(0).toUpperCase()} ~ ₹ {variety.price}
                  </span>
                </label>

                {selectedVariety.some(
                  (v) => v.size === variety.size && v.price === variety.price
                ) && (
                  <div className="quantity-buttons">
                    <button
                      onClick={() =>
                        handleVarietyQuantityChange(
                          variety,
                          -1,
                          currentProduct.id
                        )
                      }
                      disabled={variety.quantity <= 1}
                    >
                      <FaMinusCircle />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={
                        selectedVariety.find(
                          (v) =>
                            v.size === variety.size && v.price === variety.price
                        )?.quantity || 1
                      }
                      onChange={(e) => {
                        const quantity = parseInt(e.target.value, 10);
                        handleVarietyQuantityChange(
                          variety,
                          quantity - variety.quantity
                        );
                      }}
                    />
                    <button
                      onClick={() =>
                        handleVarietyQuantityChange(
                          variety,
                          1,
                          currentProduct.id
                        )
                      }
                    >
                      <FaPlusCircle />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() =>
                handleAddToWhatsApp(currentProduct, selectedVariety)
              }
              disabled={selectedVariety?.length === 0}
              className="save-btn"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;
