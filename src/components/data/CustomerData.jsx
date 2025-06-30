import React, { useEffect, useState } from "react";
import "./CustomerData.css"; // Import the CSS file
import { fetchcustomerdata, fetchOrders } from "../../api"; // Import fetchOrders as well
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Header from "../header/Header";
import { getAll, saveItems } from "../../DB";

export const CustomerData = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]); // State for orders
  const [filteredCustomers, setFilteredCustomers] = useState([]); // State for filtered customers
  const [loading, setLoading] = useState(false); // Loading state
  const [Search, setSearch] = useState(""); // State for search query
  const [expandedCustomer, setExpandedCustomer] = useState(null); // To track which customer is expanded
  const navigate = useNavigate();

  // Fetch customers from API and localStorage fallback
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const storedCustomers = await fetchcustomerdata();
        setCustomers(storedCustomers);
        setFilteredCustomers(storedCustomers);
        await saveItems('customers', storedCustomers);
      }catch {
        const offline = await getAll('customers');
        setCustomers(offline);
        setFilteredCustomers(offline);
      }  finally {
        setLoading(false);
      }
    };

    fetchData();

    // Fallback: load customers from localStorage if available
    const localStorageCustomers =
      JSON.parse(localStorage.getItem("customers")) || [];
    if (localStorageCustomers.length > 0) {
      setCustomers(localStorageCustomers);
      setFilteredCustomers(localStorageCustomers);
    }
  }, []);

  // Fetch orders from API
  useEffect(() => {
    const getOrders = async () => {
      try {
        const ordersData = await fetchOrders(); // Fetch orders from API
        setOrders(ordersData);
        await saveItems('orders', data);
      } catch {
        const offline = await getAll('orders');
        setOrders(offline);
      }
    };

    getOrders();
  }, []);

  // Filter customers based on search query
  useEffect(() => {
    const searchLower = Search.toLowerCase();

    const results = customers.filter((customer) => {
      const nameMatch =
        customer.name && customer.name.toLowerCase().includes(searchLower);
      const phoneMatch =
        customer.phone &&
        String(customer.phone).toLowerCase().includes(searchLower);
      const addressMatch =
        customer.address &&
        customer.address.toLowerCase().includes(searchLower);
      return nameMatch || phoneMatch || addressMatch;
    });

    setFilteredCustomers(results);
  }, [Search, customers]);

  // Helper function to calculate lifetime order total for a given customer's phone number
  const getLifetimeOrderTotal = (phone) => {
    return orders
      .filter((order) => String(order.phone) === String(phone))
      .reduce((sum, order) => sum + order.totalAmount, 0);
  };

  // Toggle the expanded customer details (show order items grouped by date)
  const handleCustomerClick = (phone) => {
    if (expandedCustomer === phone) {
      setExpandedCustomer(null); // Collapse if already expanded
    } else {
      setExpandedCustomer(phone); // Expand the clicked customer
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <>
      <Header headerName="Customer Data" setSearch={setSearch} />
      <div className="customer-data-container">
        {loading ? (
          <div className="lds-ripple">
            <div></div>
            <div></div>
          </div>
        ) : (
          <>
            {filteredCustomers.length === 0 ? (
              <p className="no-customers-message">No customers found.</p>
            ) : (
              <ul className="customer-list">
                {filteredCustomers.map((customer, index) => (
                  <li
                    key={index}
                    className="customer-item"
                    onClick={() => handleCustomerClick(customer.phone)}
                    style={{ cursor: "pointer" }}
                  >
                    <h3 className="customer-title">Customer {index + 1}</h3>
                    <p>
                      <strong>Name:</strong> {customer.name}
                    </p>
                    <p>
                      <strong>Phone:</strong> {customer.phone}
                    </p>
                    <p>
                      <strong>Address:</strong> {customer.address}
                    </p>
                    <p>
                      <strong>Total Lifetime Spend:</strong> ₹
                      {getLifetimeOrderTotal(customer.phone).toFixed(2)}
                    </p>
                    {/* Expanded view: display orders grouped by date */}
                    {expandedCustomer === customer.phone && (
                      <div className="customer-orders">
                        {(() => {
                          // Filter orders for the current customer
                          const customerOrders = orders.filter(
                            (order) =>
                              String(order.phone) === String(customer.phone)
                          );

                          // Group orders by the date (using local date string)
                          const ordersByDate = customerOrders.reduce(
                            (group, order) => {
                              const dateKey = new Date(
                                order.timestamp
                              ).toLocaleDateString();
                              if (!group[dateKey]) {
                                group[dateKey] = [];
                              }
                              group[dateKey].push(order);
                              return group;
                            },
                            {}
                          );

                          // Sort dates in descending order (newest first)
                          const sortedDates = Object.keys(ordersByDate).sort(
                            (a, b) => new Date(b) - new Date(a)
                          );

                          return sortedDates.map((date, idx) => {
                            const ordersOnDate = ordersByDate[date];

                            // Calculate the total price for orders on this date
                            const totalOnDate = ordersOnDate.reduce(
                              (sum, order) => sum + order.totalAmount,
                              0
                            );

                            return (
                              <div
                                key={idx}
                                className="customer-order-date-group"
                              >
                                <h4>Date: {date}</h4>
                                <ul>
                                  {ordersOnDate.map((order, orderIndex) => (
                                    <li key={order.id || orderIndex}>
                                      <span className="time">
                                        Time:{" "}
                                        {new Date(
                                          order.timestamp
                                        ).toLocaleTimeString()}
                                      </span>
                                      <ul>
                                        {order.products.map(
                                          (product, pIndex) => (
                                            <li key={pIndex}>
                                              {pIndex + 1}. {product.name}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </li>
                                  ))}
                                </ul>
                                <p>
                                  <strong>Total Price Spent on {date}:</strong>{" "}
                                  ₹{totalOnDate.toFixed(2)}
                                </p>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
};
