// frontend/src/shared/components/FileUpload.jsx
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import './FileUpload.css';

const FileUpload = ({ onFileSelect, accept = '.csv,.xlsx,.xls', maxSize = 10 }) => {
  const { t } = useTranslation("common");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file) => {
    if (file.size > maxSize * 1024 * 1024) {
      alert(t("shared.fileUpload.fileSizeExceeds", { maxSize }));
      return;
    }

    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-dropzone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {!selectedFile ? (
          <>
            <div className="upload-icon">
              <Upload size={48} />
            </div>
            <h3 className="upload-title">{t("shared.fileUpload.dragDropTitle")}</h3>
            <p className="upload-subtitle">{t("shared.fileUpload.dragDropSubtitle")}</p>

            <div className="upload-divider">
              <span>{t("shared.fileUpload.or")}</span>
            </div>

            <button
              type="button"
              className="btn-browse"
              onClick={handleBrowseClick}
            >
              {t("shared.fileUpload.browseFiles")}
            </button>
          </>
        ) : (
          <div className="file-selected">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <p className="file-name">{selectedFile.name}</p>
              <p className="file-size">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              type="button"
              className="btn-remove"
              onClick={() => {
                setSelectedFile(null);
                if (onFileSelect) onFileSelect(null);
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="upload-info-box">
        <div className="info-icon">ℹ️</div>
        <p className="info-text">{t("shared.fileUpload.infoText")}</p>
      </div>
    </div>
  );
};

export default FileUpload;