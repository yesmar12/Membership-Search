import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import Fuse from 'fuse.js';
import Modal from 'react-modal';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as XLSX from 'xlsx';

const CSVUploader = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);
  const [fuse, setFuse] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);

  useEffect(() => {
    if (data.length > 0 && selectedColumns.length > 0) {
      const fuseInstance = new Fuse(data, {
        includeScore: true,
        threshold: 0.2,
        keys: selectedColumns,
      });
      setFuse(fuseInstance);
    }
  }, [data, selectedColumns]);

  const handleFileUpload = (file) => {
    if (file) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            setData(result.data);
            setHeaders(result.meta.fields);
            setFilteredRows(result.data);
            setIsModalOpen(true);
          },
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const [headerRow, ...rows] = jsonData;
          const formattedData = rows.map((row) => {
            const rowData = {};
            headerRow.forEach((header, index) => {
              rowData[header] = row[index] || '';
            });
            return rowData;
          });
          setData(formattedData);
          setHeaders(headerRow);
          setFilteredRows(formattedData);
          setIsModalOpen(true);
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert('Unsupported file format. Please upload a CSV or Excel file.');
      }
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    if (fuse && event.target.value) {
      const results = fuse.search(event.target.value);
      setFilteredRows(results.map(result => ({ ...result.item, score: result.score })));
    } else {
      setFilteredRows(data);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  const handleColumnSelection = (header) => {
    setSelectedColumns(prevColumns => {
      if (prevColumns.includes(header)) {
        return prevColumns.filter(col => col !== header);
      } else {
        return [...prevColumns, header];
      }
    });
  };

  const handleModalClose = () => {
    if (selectedColumns.length > 0) {
      setIsModalOpen(false);
    } else {
      alert('Please select at least one column to search.');
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">DSA Member Search</h2>
      <div className="mb-3">
        <label htmlFor="file-upload" className="btn btn-secondary">Add Membership List</label>
        <input
          id="file-upload"
          type="file"
          style={{ display: 'none' }}
          accept=".csv, .xlsx, .xls"
          onChange={(e) => handleFileUpload(e.target.files[0])}
        />
      </div>
      <p className="text-muted">Disclaimer: Nothing is uploaded outside of your own computer. All processing is done locally.</p>
      {headers.length > 0 && (
        <div>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search for a row..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <h3 className="mb-3">Results:</h3>
          <div className="table-responsive">
            <table className="table table-bordered table-striped">
              <thead className="thead-dark">
                <tr>
                  {headers.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                  {searchTerm && <th>Match Score</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, searchTerm ? 10 : Math.floor(window.innerHeight / 40)).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((header, colIndex) => (
                      <td key={colIndex}>{row[header]}</td>
                    ))}
                    {searchTerm && <td>{row.score !== undefined ? row.score.toFixed(2) : 'N/A'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={handleModalClose}
        ariaHideApp={false}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            zIndex: 2000
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1500
          }
        }}
      >
        <h2>Select Columns to Search</h2>
        <div className="form-check">
          {headers.map((header, index) => (
            <div key={index} className="mb-2">
              <label className="form-check-label">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selectedColumns.includes(header)}
                  onChange={() => handleColumnSelection(header)}
                />
                {header}
              </label>
            </div>
          ))}
        </div>
        <button className="btn btn-primary mt-3" onClick={handleModalClose}>Confirm Selection</button>
      </Modal>
    </div>
  );
};

export default CSVUploader;

// Usage: Import CSVUploader component in your main app and use <CSVUploader /> to render it.
