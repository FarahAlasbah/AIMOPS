// frontend/src/features/data-upload/pages/DataUpload.jsx
import { Navigate, Route, Routes } from "react-router-dom";
import UploadsPage from "./UploadsPage";
import MappingPage from "./MappingPage";
import ReviewPage from "./ReviewPage";
import "./DataUpload.css";


export default function DataUpload() {
  return (
    <Routes>
      <Route index element={<Navigate to="uploads" replace />} />
      <Route path="uploads" element={<UploadsPage />} />
      <Route path="map/:batchId" element={<MappingPage />} />
      <Route path="review/:batchId" element={<ReviewPage />} />
      <Route path="*" element={<Navigate to="uploads" replace />} />
    </Routes>
  );
}
