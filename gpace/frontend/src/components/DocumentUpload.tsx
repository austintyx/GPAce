import React, { useState } from 'react';

const DocumentUpload = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed.');
      }

      // Handle successful upload (e.g., show a success message)
      alert('File uploaded successfully!');
      setFile(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="document-upload">
      <h2 className="text-lg font-bold">Upload Document</h2>
      <input type="file" onChange={handleFileChange} />
      {error && <p className="text-red-500">{error}</p>}
      <button onClick={handleUpload} className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded">
        Upload
      </button>
    </div>
  );
};

export default DocumentUpload;