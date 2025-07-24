export const BASE_URL = 'https://apna-pizza-backend.vercel.app/api'; 
// export const BASE_URL = "https://invoice-backend-phi.vercel.app/api"; 

export const fetchCategories = async () => {
  const response = await fetch(`${BASE_URL}/categories`);
  return response.json();
};

export const addCategory = async (name) => {
  const response = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return response.json();
};

// New function to fetch products
export const fetchProducts = async () => {
  const response = await fetch(`${BASE_URL}/products`);
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }
  return response.json();
};

export const removeProduct = async (productName, productPrice) => {
  const response = await fetch(`${BASE_URL}/products`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: productName, price: productPrice }),
  });

  if (!response.ok) {
    throw new Error("Failed to remove product from database");
  }

  return response.json(); // Optional: Return the API response
};

export const addProduct = async (product) => {
  const response = await fetch(`${BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    throw new Error("Failed to save the product");
  }

  return response.json(); // Return the saved product
};

export const sendorder = async (order) => {
  const response = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    throw new Error(`Failed to send order to the server ${response.statusText}`);
  }

  return response.json(); // Return the saved product
};

export const fetchOrders = async () => {
  const response = await fetch(`${BASE_URL}/orders`);
  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }
  return response.json();
};

export const setdata = async (customerdata) => {
  const response = await fetch(`${BASE_URL}/customerdata`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(customerdata),
  });

  if (!response.ok) {
    throw new Error(`Failed to send customerdata to the server ${response.statusText}`);
  }

  return response.json(); // Return the saved product
};

export const fetchcustomerdata = async () => {
  try {
    const response = await fetch(`${BASE_URL}/customerdata`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json(); // Parse JSON only if the response is OK
  } catch (error) {
    console.error("Error fetching customer data:", error.message);
    throw error; // Rethrow for further handling
  }
};

export const removeOrder = async (orderId) => {
  const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to remove order from database');
  }

  return response.json(); // Return the API response
};
