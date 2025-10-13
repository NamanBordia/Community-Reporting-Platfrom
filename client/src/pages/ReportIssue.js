import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import api, { getPlaceAutocomplete } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import { FiSearch, FiX, FiMapPin } from 'react-icons/fi';

// Fix default marker icon issue in Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const ReportIssue = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, checkAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Location search state
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  
  const searchRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const debounceTimer = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    issue_type: '',
    priority: 'medium',
    address: ''
  });

  const [errors, setErrors] = useState({});

  const issueTypes = [
    { value: 'pothole', label: 'Pothole' },
    { value: 'streetlight', label: 'Street Light' },
    { value: 'garbage', label: 'Garbage Collection' },
    { value: 'traffic', label: 'Traffic Signal' },
    { value: 'sidewalk', label: 'Sidewalk Damage' },
    { value: 'drainage', label: 'Drainage Issue' },
    { value: 'noise', label: 'Noise Complaint' },
    { value: 'other', label: 'Other' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-red-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-800' }
  ];

  const defaultCenter = [20.5937, 78.9629]; // Center of India

  // Check authentication on component mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        checkAuth(); // This will log the current auth state
        if (!isAuthenticated) {
          console.log('User not authenticated, redirecting to login...');
          toast.error('Please log in to report an issue');
          navigate('/login');
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        toast.error('Authentication failed. Please log in again.');
        navigate('/login');
      }
    };

    checkAuthentication();
  }, [isAuthenticated, navigate, checkAuth]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target) &&
          searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
        setSelectedSearchIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          image: 'Please select a valid image file'
        }));
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: 'Image size must be less than 5MB'
        }));
        return;
      }

      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({
        ...prev,
        image: ''
      }));
    }
  };

  // Replace handleMapClick with Leaflet version
  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    
    // Pan to selected location when it changes
    useEffect(() => {
      if (selectedLocation) {
        map.setView([selectedLocation.lat, selectedLocation.lng], map.getZoom());
      }
    }, [selectedLocation, map]);
    
    return selectedLocation ? (
      <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
    ) : null;
  }

  // Location search functionality
  const handleLocationSearchChange = (e) => {
    const value = e.target.value;
    setLocationSearch(value);
    setSelectedSearchIndex(-1);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.length === 0) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      setSearchLoading(false);
      return;
    }

    if (value.length < 3) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchDropdown(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const data = await getPlaceAutocomplete(value);
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Location search error:', err);
        setSearchResults([]);
        toast.error('Failed to search locations');
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  const handleSearchResultClick = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (lat && lng) {
      setSelectedLocation({ lat, lng });
      setLocationSearch(result.display_name);
      setFormData(prev => ({
        ...prev,
        address: result.display_name
      }));
    }
    setSearchResults([]);
    setShowSearchDropdown(false);
    setSelectedSearchIndex(-1);
  };

  const handleClearLocationSearch = () => {
    setLocationSearch('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setSelectedSearchIndex(-1);
    setSearchLoading(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (!showSearchDropdown || searchResults.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSearchIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
          handleSearchResultClick(searchResults[selectedSearchIndex]);
        }
        break;
      case 'Escape':
        setShowSearchDropdown(false);
        setSelectedSearchIndex(-1);
        break;
      default:
        break;
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.issue_type) {
      newErrors.issue_type = 'Please select an issue type';
    }

    if (!selectedLocation) {
      newErrors.location = 'Please select a location on the map';
    }

    if (!selectedImage) {
      newErrors.image = 'Please upload an image';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form data before submission:', formData);
    
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to submit an issue');
      navigate('/login');
      return;
    }

    try {
      const formDataToSend = new FormData();
      
      // Log each field before appending
      console.log('Title value:', formData.title);
      console.log('Description value:', formData.description);
      console.log('Issue type value:', formData.issue_type);
      console.log('Priority value:', formData.priority);
      console.log('Address value:', formData.address);
      console.log('Location:', selectedLocation);
      
      // Ensure all required fields are strings and not undefined
      if (!formData.title) {
        toast.error('Title is required');
        return;
      }

      // Add fields to FormData
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('issue_type', formData.issue_type || '');
      formDataToSend.append('priority', formData.priority || '');
      formDataToSend.append('address', formData.address || '');
      
      if (selectedLocation) {
        formDataToSend.append('latitude', selectedLocation.lat);
        formDataToSend.append('longitude', selectedLocation.lng);
      }
      
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }

      // Log the final FormData contents
      console.log('FormData contents:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`${key}: ${value} (${typeof value})`);
      }

      // Log the request configuration
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      };
      console.log('Request config:', config);
      
      const response = await api.post('/issues', formDataToSend, config);
      console.log('Issue submitted successfully:', response.data);
      
      toast.success('Issue reported successfully!');
      navigate('/issues');
    } catch (error) {
      console.error('Error submitting issue:', error.response?.data || error);
      if (error.response?.status === 422) {
        // Handle validation errors
        const errorData = error.response.data;
        if (errorData.msg) {
          toast.error(errorData.msg);
        } else {
          toast.error('Please check all required fields');
        }
      } else if (error.response?.status === 401) {
        toast.error('Please log in to submit an issue');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast.error('Failed to submit issue. Please try again.');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Issue</h1>
          <p className="text-gray-600">
            Help improve your community by reporting local issues. Your report will be reviewed and addressed by local authorities.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Issue Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Brief description of the issue"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label htmlFor="issue_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Type *
                </label>
                <select
                  id="issue_type"
                  name="issue_type"
                  value={formData.issue_type}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.issue_type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select issue type</option>
                  {issueTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.issue_type && <p className="mt-1 text-sm text-red-600">{errors.issue_type}</p>}
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Provide detailed information about the issue..."
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {priorityLevels.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Street address or landmark"
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Image *</h2>
            
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">
                      Click to upload an image or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </button>
                {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
              </div>

              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full h-64 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      fileInputRef.current.value = '';
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Location Selection */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Location *</h2>
            
            {/* Location Search */}
            <div className="mb-6 relative" ref={searchRef} style={{ zIndex: 100 }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for a location (India only)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={locationSearch}
                  onChange={handleLocationSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Type a city, address, or place name in India..."
                  className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {locationSearch && (
                  <button
                    type="button"
                    onClick={handleClearLocationSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                🇮🇳 Search is limited to locations within India
              </p>

              {/* Search Dropdown */}
              {showSearchDropdown && (
                <div
                  ref={searchDropdownRef}
                  className="absolute w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                  style={{ zIndex: 1000 }}
                >
                  {searchLoading ? (
                    <div className="p-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <p className="mt-2 text-xs text-gray-600">Searching...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ul>
                      {searchResults.map((result, idx) => (
                        <li
                          key={idx}
                          className={`px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                            selectedSearchIndex === idx
                              ? 'bg-blue-50 text-blue-700'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleSearchResultClick(result)}
                          onMouseEnter={() => setSelectedSearchIndex(idx)}
                        >
                          <div className="flex items-start space-x-2">
                            <FiMapPin className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                              selectedSearchIndex === idx ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {result.display_name.split(',')[0]}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {result.display_name.split(',').slice(1).join(',')}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : locationSearch.length >= 3 ? (
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-500">No locations found</p>
                    </div>
                  ) : null}
                  
                  {locationSearch.length > 0 && locationSearch.length < 3 && (
                    <div className="p-3 text-center">
                      <p className="text-xs text-gray-400">Type at least 3 characters</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Or click on the map to mark the exact location of the issue
            </p>
            
            <div className="mb-4 relative" style={{ zIndex: 1 }}>
              <div style={{ width: '100%', height: '400px' }}>
                <MapContainer
                  center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : defaultCenter}
                  zoom={5}
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker />
                </MapContainer>
              </div>
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
            </div>
            
            {selectedLocation && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Selected Location:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>

          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ReportIssue; 