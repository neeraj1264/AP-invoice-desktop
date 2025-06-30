import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TbCameraPlus } from "react-icons/tb";
import { FaTimes, FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./NewProduct.css";
import { fetchCategories, addCategory, addProduct } from "../../api";
import Header from "../header/Header";
import { addItem, getAll, saveItems } from "../../DB";

const toastOptions = {
  position: "bottom-right",
  autoClose: 2000,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
};

const NewProduct = ({ setSelectedProducts }) => {
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);

  const [product, setProduct] = useState({
    id:"",
    name: "",
    price: "",
    image: "",
    category: "",
    varieties: [], // Stores size and price combinations
  });

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [productVariety, setProductVariety] = useState({ size: "", price: "" });
  const [isWithVariety, setIsWithVariety] = useState(false); // Toggle for variety

  useEffect(() => {
    const loadCategories = async () => {
      try {
        // Fetch categories from MongoDB
        const savedCategories = await fetchCategories();

        // Update state and save categories to localStorage
        const categoryNames = savedCategories.map((category) => category.name);
        setCategories(categoryNames);
        await saveItems('categories', savedCategories.map((n,i)=>({id:i,name:n}))); // adapt shape
        localStorage.setItem("categories", JSON.stringify(categoryNames));
      } catch {
        const offline = await getAll('categories');
        setCategories(offline.map(c=>c.name));
      }
    };

    // Load categories when the component mounts
    loadCategories();
  }, []);

  const handleAddCategory = async (e) => {
    if ((e.key === "Enter" || e.key === "Return") && newCategory.trim()) {
      console.log("Enter key pressed", e.key);
      e.preventDefault();
      
      // Trim and format the new category
      let newCategoryTrimmed = newCategory.trim();
      let formattedCategory = 
        newCategoryTrimmed.charAt(0).toUpperCase() + newCategoryTrimmed.slice(1);
  
      // Check for duplicate categories and format input
      if (!categories.includes(formattedCategory)) {
        try {
          const addedCategory = await addCategory(formattedCategory);
          setCategories((prev) => [...prev, addedCategory.name]);
  
          // Update localStorage
          const updatedCategories = [...categories, addedCategory.name];
          localStorage.setItem("categories", JSON.stringify(updatedCategories));
  
          // Clear the input field
          setNewCategory("");
        } catch (error) {
          console.error("Error adding category:", error);
        }
      }
    }
  };
   

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProduct((prev) => ({
          ...prev,
          image: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProduct((prev) => ({
      ...prev,
      image: "",
    }));
  };

  const handleAddVariety = () => {
    if (!productVariety.size || !productVariety.price) {
      toast.error("Please fill in size and price!", toastOptions);
      return;
    }
  
    // Capitalize the first letter of the variety size
    const formattedSize = productVariety.size.charAt(0).toUpperCase() + productVariety.size.slice(1).toLowerCase();
  
    // Generate a variety ID like 'variety-1', 'variety-2', etc.
    const varietyId = `variety-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
    // Add the variety with the generated id
    const updatedVarieties = [
      ...product.varieties,
      { id: varietyId, size: formattedSize, price: productVariety.price },
    ];
  
    setProduct((prev) => ({
      ...prev,
      varieties: updatedVarieties,
    }));
  
    setProductVariety({ size: "", price: "" });
  };
  

  const handleAddProduct = async () => {
    // Check for name field (always required)
    if (!product.name) {
      toast.error("Please fill in the product name!", toastOptions);
      return;
    }
  
    // Capitalize the first letter of the product name
    const formattedName = product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase();
  
    // When "Add Varieties" is checked
    if (isWithVariety) {
      if (product.varieties.length === 0) {
        toast.error("Please add at least one variety!", toastOptions);
        return;
      }
      const updatedVarieties = product.varieties.map(variety => ({
        ...variety,
        size: variety.size.charAt(0).toUpperCase() + variety.size.slice(1).toLowerCase(),
      }));
      setProduct(prev => ({
        ...prev,
        name: formattedName, // Ensure the capitalized name is saved here
        varieties: updatedVarieties,
      }));
    } else {
      // When "Add Varieties" is NOT checked, validate the price field
      if (!product.price) {
        toast.error("Please fill in the product price!", toastOptions);
        return;
      }
      setProduct(prev => ({
        ...prev,
        name: formattedName, // Ensure the capitalized name is saved here
      }));
    }
  
    // Check if the product already exists in the same category
    const storedProducts = JSON.parse(localStorage.getItem("products")) || [];
    const isProductExist = storedProducts.some(
      (prod) =>
        prod.name.toLowerCase() === formattedName.toLowerCase() && // Use the formatted name here
        prod.category.toLowerCase() === product.category.toLowerCase()
    );
  
    if (isProductExist) {
      toast.error("This product already exists!", toastOptions);
      return;
    }
  
    // Generate a new ID for the product
    const productId = `invoice${storedProducts.length + 1}`;
  
    // Add the generated ID to the product
    const productWithId = { ...product, id: productId, name: formattedName }; // Use the capitalized name
  
    try {
      // Call the API function to add the product (you might need to pass the full object with the id)
      const savedProduct = await addProduct(productWithId);
      console.log("Product saved:", savedProduct);
  
      // Add the product to the localStorage
      storedProducts.push(productWithId);
      localStorage.setItem("products", JSON.stringify(storedProducts));
      await addItem('products', product);
      // toast.success('Saved offline');
      // Reset the form fields
      setProduct({
        id: "",
        name: "",
        price: "",
        image: "",
        category: "",
        varieties: [],
      });
  
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 1000);
    } catch (error) {
      toast.error("Error saving product!", toastOptions);
      console.error(error);
    }
  };
  
  const handleNavigateToInvoice = () => {
    navigate("/invoice");
  };

  return (
    <div>
      <ToastContainer />
      <Header
        headerName="Foodies Hub"
      />
      {/* <h1 className="catologue-header">New Product</h1> */}
      <div className="catologue-input-fields">
        <h1>Product Management</h1>
        <input
          type="file"
          accept="image/*"
          id="imageInput"
          style={{ display: "none" }}
          onChange={handleImageChange}
        />

        {/* <div className="image-container">
          <div
            className="camera"
            onClick={() => document.getElementById("imageInput").click()}
          >
            <TbCameraPlus className="camera-icon" />
            <p className="img-text">Add Image</p>
          </div>

          {product.image && (
            <div className="image-preview-container">
              <img
                src={product.image}
                alt="Preview"
                className="image-preview"
                style={{ width: "4.5rem", height: "4.5rem", padding: "0 1rem" }}
              />
              <FaTimes className="remove-icon" onClick={removeImage} />
            </div>
          )}
        </div> */}

        <input
          type="text"
          name="name"
          placeholder="Name*"
          value={product.name}
          onChange={handleInputChange}
          style={{marginTop: "3rem"}}
        />

        {!isWithVariety && (
          <input
            type="number"
            name="price"
            placeholder="Price (₹)"
            value={product.price}
            onChange={handleInputChange}
          />
        )}

        <div>
          <select
            name="category"
            className="dropdownn"
            value={product.category}
            onChange={handleInputChange}
          >
            <option value="">Select Category*</option>
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Add new category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyUp={handleAddCategory}
            onBlur={() => setNewCategory("")} 
            className="add-category-input"
          />
        </div>

          {/* Toggle to enable or disable varieties */}
          <div className="toggle-variety">
          <label>
            <input
              type="checkbox"
              checked={isWithVariety}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setIsWithVariety(isChecked);

                // Clear price if Add Varieties is checked
                if (isChecked) {
                  setProduct((prev) => ({
                    ...prev,
                    price: "",
                  }));
                }
              }}
            />
            Add Varieties
          </label>
        </div>

        {isWithVariety && (
          <div className="varieties-container">
            <input
              type="text"
              placeholder="Size"
              value={productVariety.size}
              onChange={(e) =>
                setProductVariety((prev) => ({ ...prev, size: e.target.value }))
              }
            />
            <input
              type="number"
              placeholder="Price (₹)"
              value={productVariety.price}
              onChange={(e) =>
                setProductVariety((prev) => ({
                  ...prev,
                  price: e.target.value,
                }))
              }
            />
            <button onClick={handleAddVariety} className="variety-btn">Add Variety</button>
          </div>
        )}

        <ul>
          {product.varieties.map((variety) => (
            <li key={variety.id}>
              {variety.size} - ₹{variety.price}
            </li>
          ))}
        </ul>
        <button className="save-button" onClick={handleAddProduct}>
        Add Product
      </button>
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <FaCheckCircle className="tick-icon" />
            <h2>Success!</h2>
            <p>Product Added Successfully</p>
          </div>
        </div>
      )}

      {/* <button onClick={handleNavigateToInvoice} className="Invoice-btn">
        Invoice
        <FaArrowRight className="Invoice-arrow" />
      </button> */}
    </div>
  );
};

export default NewProduct;
