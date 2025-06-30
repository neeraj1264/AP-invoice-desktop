import React, { useState, useEffect } from "react";
import "./History.css";
import { FaArrowLeft, FaWhatsapp } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { fetchOrders, removeOrder, sendorder } from "../../api";
import Header from "../header/Header";
import { clearStore, deleteItem, getAll, saveItems } from "../../DB";

const History = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [filter, setFilter] = useState("Today");
  const [expandedOrderId, setExpandedOrderId] = useState(null); // Track expanded order
  const [loading, setLoading] = useState(false); // Loading state
  const [showRemoveBtn, setShowRemoveBtn] = useState(false);
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const BASE_URL = "https://aus-invoice-backend.vercel.app/api";

  // Show remove button on long press
  let pressTimer;
  const handlePressStart = () => {
    pressTimer = setTimeout(() => {
      setShowRemoveBtn(true);
    }, 1000);
  };
  const handlePressEnd = () => {
    clearTimeout(pressTimer);
  };

  // above your component
  const filterByDay = (orders, filterValue) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysAgo = getDaysAgo(filterValue);
    const start = new Date(today);
    start.setDate(start.getDate() - daysAgo);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return orders.filter((o) => {
      const d = new Date(o.timestamp);
      return d >= start && d <= end;
    });
  };

  const handleRemoveOrder = async (orderId) => {
    try {
      // Check if 'advancefeatured' is true in localStorage
      const advanceFeatured =
        localStorage.getItem("advancedFeature") === "true";

      if (advanceFeatured) {
        // Proceed with the removal if advancefeatured is true
        await removeOrder(orderId);

        // Remove the order from the state
        const updatedOrders = orders.filter((order) => order.id !== orderId);
        setOrders(updatedOrders);

        setFilteredOrders((prevFilteredOrders) =>
          prevFilteredOrders.filter((order) => order.id !== orderId)
        );

        console.log("Order removed successfully from both MongoDB and state");
      } else {
        alert("Advance feature not granted.");
        navigate("/advance");
      }
    } catch (error) {
      console.error("Error removing order:", error.message);
    }
  };

  useEffect(() => {
    const getOrders = async () => {
      setLoading(true); // Start loading
      try {
        const data = await fetchOrders(); // Call the API function

        setOrders(data);
        // await saveItems("orders", data);

        const dayOrders = filterByDay(data, filter);

        setFilteredOrders(dayOrders);

        // Calculate grand total for the day
        setGrandTotal(dayOrders.reduce((sum, o) => sum + o.totalAmount, 0));
      } catch {
        const offline = await getAll("orders");
        setOrders(offline);
        const dayOrders = filterByDay(offline, filter);
        setFilteredOrders(dayOrders);
        setGrandTotal(dayOrders.reduce((sum, o) => sum + o.totalAmount, 0));
      } finally {
        setLoading(false); // Stop loading
      }
    };

    getOrders();
  }, [filter]);

  // Helper to get "days ago" count
  const getDaysAgo = (filterValue) => {
    switch (filterValue) {
      case "Today":
        return 0;
      case "Yesterday":
        return 1;
      default:
        return parseInt(filterValue.split(" ")[0]); // Extract '2' from '2 days ago'
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const formatDate = (isoString) => {
    const orderDate = new Date(isoString);
    const day = orderDate.getDate();
    const month = orderDate.toLocaleString("default", { month: "short" });
    const year = orderDate.getFullYear();
    const hours = orderDate.getHours() % 12 || 12;
    const minutes = orderDate.getMinutes().toString().padStart(2, "0");
    const period = orderDate.getHours() >= 12 ? "PM" : "AM";

    return `${month} ${day}, ${year} - ${hours}:${minutes} ${period}`;
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
  };

  const toggleOrder = (orderId) => {
    setExpandedOrderId((prevId) => (prevId === orderId ? null : orderId));
  };

  const handleWhatsappClick = (order) => {
    const customerPhoneNumber = order.phone; // Correct field to access phone number
    const message = `We hope you had a delightful order experience with us. Your feedback is incredibly valuable as we continue to enhance our services. How did you enjoy your meal? We’d love to hear your thoughts.\nTeam: Urban Pizzeria`;
    // Create the WhatsApp URL to send the message
    const whatsappUrl = `https://wa.me/+91${customerPhoneNumber}?text=${encodeURIComponent(
      message
    )}`;

    // Open WhatsApp with the message
    window.open(whatsappUrl, "_blank");
  };

  const syncOfflineOrders = async () => {
    setSyncing(true);
    try {
      const queue = await getAll("orders");
      console.log("Queue before sync:", queue);

      for (let raw of queue) {
        // strip out server‐only props
        const { _id, __v, ...rest } = raw;
        // normalize phone to null
        const payload = { ...rest, phone: rest.phone || null };

        console.log("→ POST /orders payload:", payload);

        const res = await fetch(`${BASE_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        console.log("← status", res.status, "body:", text);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await deleteItem("orders", raw.id);

        // 2) clear the entire queue in one shot
        console.log("Cleared orders in IndexedDB");

        // re-fetch fresh data
        const fresh = await fetchOrders();
        console.log("Fetched from server:", fresh);
        setOrders(fresh);
        const dayOrders = filterByDay(fresh, filter);
        setFilteredOrders(dayOrders);
        setGrandTotal(dayOrders.reduce((sum, o) => sum + o.totalAmount, 0));
        console.log("Offline orders synced successfully");
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <Header headerName="Order History" />
      {loading ? (
        <div className="lds-ripple">
          <div></div>
          <div></div>
        </div>
      ) : (
        <>
          <div
            className="sync-container"
            style={{ position: "absolute", right: "1rem" }}
          >
            <button
              onClick={syncOfflineOrders}
              disabled={syncing}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                background: syncing ? "#ccc" : "#4caf50",
                color: "#fff",
                border: "none",
                cursor: syncing ? "default" : "pointer",
                marginTop: "1rem",
              }}
            >
              {syncing ? "Syncing…" : "Sync Offline Orders"}
            </button>
          </div>

          <div className="history-container">
            <div className="grand-total">
              <h2 className="total-sale">
                <select
                  id="filter"
                  value={filter}
                  onChange={handleFilterChange}
                  style={{ borderRadius: "1rem" }}
                >
                  <option value="Today">
                    Today ₹
                    {orders
                      .filter(
                        (order) =>
                          new Date(order.timestamp).toLocaleDateString() ===
                          new Date().toLocaleDateString()
                      )
                      .reduce((sum, order) => sum + order.totalAmount, 0)}
                  </option>
                  <option value="Yesterday">
                    Yesterday ₹
                    {orders
                      .filter((order) => {
                        const orderDate = new Date(order.timestamp);
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        return (
                          orderDate.toLocaleDateString() ===
                          yesterday.toLocaleDateString()
                        );
                      })
                      .reduce((sum, order) => sum + order.totalAmount, 0)}
                  </option>
                  {[...Array(6)].map((_, i) => (
                    <option key={i} value={`${i + 2} days ago`}>
                      {i + 2} days ago ₹
                      {orders
                        .filter((order) => {
                          const orderDate = new Date(order.timestamp);
                          const filterDate = new Date();
                          filterDate.setDate(filterDate.getDate() - (i + 2));
                          return (
                            orderDate.toLocaleDateString() ===
                            filterDate.toLocaleDateString()
                          );
                        })
                        .reduce((sum, order) => sum + order.totalAmount, 0)}
                    </option>
                  ))}
                </select>
              </h2>
            </div>

            {filteredOrders.length > 0 ? (
              [...filteredOrders].reverse().map((order, index) => (
                <div
                  key={order.id}
                  className="order-section"
                  onMouseDown={handlePressStart}
                  onMouseUp={handlePressEnd}
                  onTouchStart={handlePressStart}
                  onTouchEnd={handlePressEnd}
                >
                  <hr />
                  <div onClick={() => toggleOrder(order.id)}>
                    <h2 style={{ cursor: "pointer", fontSize: "1rem" }}>
                      Order {filteredOrders.length - index} -{" "}
                      <span>{formatDate(order.timestamp)}</span>
                    </h2>
                    <p>
                      <strong>Amount Received: ₹{order.totalAmount}</strong>{" "}
                      {order.phone && (
                        <FaWhatsapp
                          className="whatsapp"
                          onClick={() => handleWhatsappClick(order)}
                        />
                      )}{" "}
                    </p>
                    {showRemoveBtn && (
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveOrder(order.id)}
                      >
                        Remove Order
                      </button>
                    )}
                  </div>

                  {expandedOrderId === order.id && ( // Render table only if this order is expanded
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Items</th>
                          <th>Price</th>
                          <th>Qty</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.products.map((product, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}.</td>
                            <td>
                              {product.size
                                ? `${product.name} (${product.size})`
                                : product.name}
                            </td>
                            <td>{product.price}</td>
                            <td>{product.quantity}</td>
                            <td>{product.price * product.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))
            ) : (
              <p>No orders found for {filter.toLowerCase()}.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default History;
