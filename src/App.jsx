// App.js
import React, { useState , useEffect} from "react";
import { BrowserRouter as Router, Route, Routes, Navigate , useLocation} from "react-router-dom";
import Invoice from "./components/Invoice/Invoice";
import "./App.css";
import CustomerDetail from "./components/CustomerDetail/CustomerDetail";
import NewProduct from "./components/ProductAdded/NewProduct";
import History from "./components/history/History";
import { CustomerData } from "./components/data/CustomerData";
import AddToHomeModal from "./components/AddToHome/AddToHome";
import Advance from "./components/advance/Advance";
import OrderReport from "./OrderReport";
import Check from "./components/check/Check";


const App = () => {

  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordPopup, setShowPasswordPopup] = useState(true);

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [installPrompt, setInstallPrompt] = useState(null);

  const currentRoute = window.location.pathname;

   // Clear 'productsToSend' from localStorage on page reload
   useEffect(() => {

    const storedPasswordStatus = localStorage.getItem("passwordCorrect");
    if (storedPasswordStatus === "true") {
      setIsPasswordCorrect(true);
      setShowPasswordPopup(false); // Hide password popup if already logged in
    }

    const handleBeforeUnload = () => {
      localStorage.removeItem("productsToSend");
    };

    // Set the event listener for page reload
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleSubmit = () => {
    // Check if the entered password is correct
    if (password === "0000") {
      localStorage.setItem("passwordCorrect", "true"); // Store password status in localStorage
      setIsPasswordCorrect(true);
      setShowPasswordPopup(false); // Close the password popup
    } else {
      alert("Incorrect password. Please try again.");
    }
  };

  const handleInstallClick = () => {
    if (installPrompt instanceof Event) {
      const installEvent = installPrompt;
      installEvent.prompt();
      installEvent.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        setInstallPrompt(null);
      });
    }
  };

  const handleCloseClick = () => {
    setInstallPrompt(null);
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleClickOutsidePopup = (event) => {
      // Check if the clicked element is not inside the install popup
      if (!event.target.closest('.install-popup')) {
        setInstallPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    document.addEventListener('click', handleClickOutsidePopup);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('click', handleClickOutsidePopup);
    };
  }, []);

  return (
    <>
     {showPasswordPopup && !isPasswordCorrect && (
        <div className="password-popup">
          <div className="password-content">
            <h3>Enter Password</h3>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter password"
            />
            <button onClick={handleSubmit}>Submit</button>
          </div>
        </div>
      )}
       {isPasswordCorrect && (
    <Router>
      <Routes>
      <Route path="/" element={<Navigate to="/invoice" />} />

        <Route
          path="/NewProduct"
          element={<NewProduct setSelectedProducts={setSelectedProducts} />}
        />
        <Route
          path="/invoice"
          element={<Invoice selectedProducts={selectedProducts} />}
        />
        <Route path="/customer-detail" element={<CustomerDetail />} />
        <Route path="/customer-data" element={<CustomerData />} />
        <Route path="/history" element={<History />} />
        <Route path="/advance" element={<Advance />} />
        <Route path="/report" element={<OrderReport />} />
        <Route path="/check" element={<Check />} />

      </Routes>
    </Router>
       )}
      {installPrompt && currentRoute === '/invoice' && (
        <AddToHomeModal
        installPrompt={installPrompt}
        onInstallClick={handleInstallClick}
        onCloseClick={handleCloseClick}
        />
      )}
      </>
  );
};

export default App;
