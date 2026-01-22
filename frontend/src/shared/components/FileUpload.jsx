import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import './FileUpload.css';

const FileUpload = ({ onFileSelect, accept = '.csv,.xlsx,.xls', maxSize = 10 }) => {
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
    // Check file size (maxSize in MB)
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size exceeds ${maxSize}MB limit`);
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
            <h3 className="upload-title">Drag & drop your sales file here</h3>
            <p className="upload-subtitle">CSV or Excel · Arabic & English supported</p>
            
            <div className="upload-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="btn-browse"
              onClick={handleBrowseClick}
            >
              Browse Files
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
        <p className="info-text">
          Your file can have any column names or language. AIMOPS will help you map them automatically in the next step.
        </p>
      </div>
    </div>
  );
};

export default FileUpload;