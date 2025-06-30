import React from "react";
import "./AddToHome.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";

const AddToHomeModal = ({ installPrompt, onInstallClick, onCloseClick }) => {
  return (
    installPrompt && (
      <div className="install-popup-overlay">
        <div className="install-popup">
        {/* <div className="x" onClick={onCloseClick}>
        <FontAwesomeIcon className="circle" icon={faCircleXmark} />
                </div> */}
          <div className="installApp">
          {/* <img src="logo2.png" alt="logo"  className="install-img"/> */}
            <p className="install-lable"> Install App in your device</p>
            {/* <p style={{ margin: "0 1rem", color: "white" }}>|</p> */}
            <span onClick={onInstallClick} className="install">
              Install
            </span>
          </div>
        </div>
      </div>
    )
  );
};

export default AddToHomeModal;
