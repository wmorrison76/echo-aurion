// src/components/ImageModifierModal.jsx
import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "../utils/cropImage"; // Ensure correct path

const ImageModifierModal = ({ imageSrc, onClose, onConfirm }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(croppedImage);
    } catch (e) {
      console.error("Cropping failed:", e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg shadow-md w-[90%] max-w-xl">
        <div className="relative w-full h-[300px] bg-gray-200">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={3 / 2}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="flex justify-between mt-4">
          <button onClick={onClose} className="text-red-600 font-medium">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-blue-600 text-white px-4 py-1 rounded"
          >
            Use Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageModifierModal;
