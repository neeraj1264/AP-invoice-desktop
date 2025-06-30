import React, { useRef, useEffect, useState, useMemo } from "react";
import Chart from "chart.js/auto";
import { fetchOrders } from "./api";
import Header from "./components/header/Header";

const OrderReport = () => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const pieChartRef = useRef(null); // Reference for the Pie Chart canvas
  const pieChartInstanceRef = useRef(null); // Store Pie Chart instance

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filterType, setFilterType] = useState("weekly");
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null); // Track expanded order

  // Fetch orders when component mounts
  useEffect(() => {
    const getOrders = async () => {
      setLoading(true);
      try {
        const fetchedOrders = await fetchOrders();
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error.message);
      } finally {
        setLoading(false);
      }
    };

    getOrders();
  }, []);

  // Bar Chart for overall orders & revenue
  useEffect(() => {
    if (orders.length === 0) {
      console.warn("No orders available.");
      return;
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    const now = new Date();
    let labels = [];
    let revenueData = [];
    let ordersData = [];
    let dataMap = {};

    if (filterType === "weekly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const filteredOrdersList = orders.filter(
        (order) => new Date(order.timestamp) >= startOfMonth
      );

      const weeksInMonth = [0, 0, 0, 0, 0];
      const ordersPerWeek = [0, 0, 0, 0, 0];

      filteredOrdersList.forEach((order) => {
        const orderDate = new Date(order.timestamp);
        const weekIndex = Math.floor((orderDate.getDate() - 1) / 7);
        weeksInMonth[weekIndex] += order.totalAmount;
        ordersPerWeek[weekIndex] += 1;

        const weekKey = `Week ${weekIndex + 1}`;
        if (!dataMap[weekKey]) dataMap[weekKey] = [];
        dataMap[weekKey].push(order);
      });

      labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
      revenueData = weeksInMonth;
      ordersData = ordersPerWeek;
    } else if (filterType === "monthly") {
      const ordersByMonth = {};
      const orderCountByMonth = {};

      orders.forEach((order) => {
        const orderDate = new Date(order.timestamp);
        const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
        ordersByMonth[monthKey] =
          (ordersByMonth[monthKey] || 0) + order.totalAmount;
        orderCountByMonth[monthKey] =
          (orderCountByMonth[monthKey] || 0) + 1;

        if (!dataMap[monthKey]) dataMap[monthKey] = [];
        dataMap[monthKey].push(order);
      });

      const currentYear = now.getFullYear();
      labels = Array.from({ length: 12 }, (_, i) => `${currentYear}-${i + 1}`);
      revenueData = labels.map((month) => ordersByMonth[month] || 0);
      ordersData = labels.map((month) => orderCountByMonth[month] || 0);
    } else if (filterType === "yearly") {
      const ordersByYear = {};
      const orderCountByYear = {};

      orders.forEach((order) => {
        const orderDate = new Date(order.timestamp);
        const year = orderDate.getFullYear();
        ordersByYear[year] =
          (ordersByYear[year] || 0) + order.totalAmount;
        orderCountByYear[year] =
          (orderCountByYear[year] || 0) + 1;

        if (!dataMap[year]) dataMap[year] = [];
        dataMap[year].push(order);
      });

      labels = Object.keys(ordersByYear).sort();
      revenueData = labels.map((year) => ordersByYear[year] || 0);
      ordersData = labels.map((year) => orderCountByYear[year] || 0);
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Total Revenue",
            data: revenueData,
            backgroundColor: "rgba(54, 162, 235, 0.6)",
          },
          {
            label: "Total Orders",
            data: ordersData,
            backgroundColor: "rgba(255, 99, 132, 0.6)",
          },
        ],
      },
      options: {
        responsive: true,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const clickedIndex = elements[0].index;
            const period = labels[clickedIndex];
            setSelectedPeriod(period);
            setFilteredOrders(dataMap[period] || []);
            setExpandedOrderId(null); // collapse any expanded order when period changes
          } else {
            setSelectedPeriod(null);
            setFilteredOrders([]);
            setExpandedOrderId(null);
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (tooltipItem) => {
                const datasetIndex = tooltipItem.datasetIndex;
                const value = tooltipItem.raw;
                return datasetIndex === 0
                  ? `💰 Revenue: $${value.toFixed(2)}`
                  : `🛒 Orders: ${value}`;
              },
            },
          },
        },
      },
    });
  }, [orders, filterType]);

  // Compute Top 5 Selling Products from filtered orders using useMemo
  const top5Products = useMemo(() => {
    const topProducts = {};
    filteredOrders.forEach((order) => {
      if (order.products && Array.isArray(order.products)) {
        order.products.forEach((product) => {
          const name = product.productName || product.name || "Unknown";
          const quantity = product.quantity || 1;
          topProducts[name] = (topProducts[name] || 0) + quantity;
        });
      }
    });
    return Object.entries(topProducts)
      .sort(([, aQty], [, bQty]) => bQty - aQty)
      .slice(0, 5);
  }, [filteredOrders]);

  // Pie Chart for Top 5 Selling Products
  useEffect(() => {
    // Destroy previous pie chart instance if it exists
    if (pieChartInstanceRef.current) {
      pieChartInstanceRef.current.destroy();
    }

    if (top5Products.length > 0) {
      const pieLabels = top5Products.map(([name]) => name);
      const pieData = top5Products.map(([, qty]) => qty);
      const ctxPie = pieChartRef.current.getContext("2d");

      pieChartInstanceRef.current = new Chart(ctxPie, {
        type: "pie",
        data: {
          labels: pieLabels,
          datasets: [
            {
              data: pieData,
              backgroundColor: [
                "rgba(255, 99, 132, 0.6)",
                "rgba(54, 162, 235, 0.6)",
                "rgba(255, 206, 86, 0.6)",
                "rgba(75, 192, 192, 0.6)",
                "rgba(153, 102, 255, 0.6)",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  const label = tooltipItem.label;
                  const value = tooltipItem.raw;
                  return `${label}: ${value}`;
                },
              },
            },
          },
        },
      });
    }
  }, [top5Products]);

  // Calculate total revenue for the selected period
  const totalRevenue = filteredOrders.reduce(
    (acc, order) => acc + order.totalAmount,
    0
  );

  // Toggle expanded order row to show/hide product details
  const toggleOrder = (orderId) => {
    setExpandedOrderId((prevId) => (prevId === orderId ? null : orderId));
  };

  // Format the date string for display
  const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).replace(/\//g, "-");

  return (
    <>
      <Header />
      <div style={{ textAlign: "center", margin: "4rem 20rem 2rem" }}>
        {loading ? (
          <div className="lds-ripple">
            <div></div>
            <div></div>
          </div>
        ) : (
          <>
            <h1>Order Report</h1>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setSelectedPeriod(null);
                setFilteredOrders([]);
                setExpandedOrderId(null);
              }}
              style={{ marginBottom: "10px", padding: "5px" }}
            >
              <option value="weekly">Weekly (Current Month)</option>
              <option value="monthly">Monthly (Last 12 Months)</option>
              <option value="yearly">Yearly</option>
            </select>

            {/* Bar Chart */}
            <canvas ref={chartRef} width={"90%"} height={"50%"} />

            {selectedPeriod && (
              <>
                <h2 className="data-show" style={{ marginTop: "2rem" }}>
                  Showing Data for: <strong>{selectedPeriod}</strong>
                </h2>
                <h2 className="data-show">
                  Total Orders: <strong>{filteredOrders.length}</strong>
                </h2>
                <h2 className="data-show">
                  Total Revenue: <strong>Rs.{totalRevenue.toFixed(2)}</strong>
                </h2>
              </>
            )}

            {filteredOrders.length === 0 ? (
              <p>No orders available for the selected period.</p>
            ) : (
              <>
                {/* Orders Table with expandable rows */}
                <table
                  border="1"
                  style={{
                    width: "96%",
                    margin: "20px auto",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer Name</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <React.Fragment key={order._id}>
                        <tr
                          onClick={() => toggleOrder(order._id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td style={{ fontSize: "1rem" }}>
                            {formatDate(order.timestamp)}
                          </td>
                          <td>{order.customerName || "Unknown"}</td>
                          <td>Rs.{order.totalAmount.toFixed(2)}</td>
                        </tr>
                        {expandedOrderId === order._id && (
                          <tr>
                            <td colSpan="3">
                              <table
                                border="1"
                                style={{
                                  width: "100%",
                                  marginTop: "10px",
                                  borderCollapse: "collapse",
                                }}
                              >
                                <thead>
                                  <tr>
                                    <th>Product Name</th>
                                    <th>Price (₹)</th>
                                    <th>Quantity</th>
                                    <th>Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.products &&
                                    order.products.map((product, idx) => (
                                      <tr key={idx}>
                                        <td>
                                          {product.productName ||
                                            product.name ||
                                            "Unknown"}
                                        </td>
                                        <td>{product.price}</td>
                                        <td>{product.quantity}</td>
                                        <td>
                                          {product.price * product.quantity}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Pie Chart & Top 5 Selling Products Table */}
                <h2 style={{ marginTop: "2rem" }}>
                  Top 5 Selling Products (Pie Chart & Table)
                </h2>
                <canvas ref={pieChartRef} width={"50%"} height={"50%"} />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default OrderReport;
