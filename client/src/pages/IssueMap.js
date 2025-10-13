import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { issuesAPI, getPlaceAutocomplete } from '../services/api';
import { FiFilter, FiX, FiEye, FiSearch, FiMapPin } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

// Fix default marker icon issue in Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker icons for each status
const statusIcons = {
  submitted: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    iconSize: [25, 41],
    shadowSize: [41, 41],
  }),
  verified: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    iconSize: [25, 41],
    shadowSize: [41, 41],
  }),
  in_progress: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    iconSize: [25, 41],
    shadowSize: [41, 41],
  }),
  resolved: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    iconSize: [25, 41],
    shadowSize: [41, 41],
  }),
  closed: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    iconSize: [25, 41],
    shadowSize: [41, 41],
  }),
};

const IssueMap = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [filters, setFilters] = useState({
    issue_type: '',
    status: '',
    priority: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [issueTypes, setIssueTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [search, setSearch] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [searchMarker, setSearchMarker] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimer = useRef(null);

  const mapCenter = [20.5937, 78.9629]; // Center of India
  const [mapPosition, setMapPosition] = useState(mapCenter);

  useEffect(() => {
    fetchIssues();
    fetchFilterOptions();
  }, [filters]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchIssues = async () => {
    try {
      const params = { per_page: 100 };
      if (filters.issue_type) params.issue_type = filters.issue_type;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;

      const response = await issuesAPI.getAll(params);
      setIssues(response.data.issues);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [typesResponse, statusesResponse] = await Promise.all([
        issuesAPI.getTypes(),
        issuesAPI.getStatuses()
      ]);
      setIssueTypes(typesResponse.data.issue_types);
      setStatuses(statusesResponse.data.statuses);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const clearFilters = () => {
    setFilters({
      issue_type: '',
      status: '',
      priority: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Place search autocomplete with debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setSearchError('');
    setSelectedIndex(-1);
    
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.length === 0) {
      setAutocompleteResults([]);
      setShowDropdown(false);
      setSearchLoading(false);
      return;
    }

    if (value.length < 3) {
      setAutocompleteResults([]);
      setShowDropdown(false);
      setSearchLoading(false);
      return;
    }

    // Show loading
    setSearchLoading(true);
    setShowDropdown(true);

    // Debounce API call
    debounceTimer.current = setTimeout(async () => {
      try {
        const data = await getPlaceAutocomplete(value);
        if (data.results && data.results.length > 0) {
          setAutocompleteResults(data.results);
          setSearchError('');
        } else {
          setAutocompleteResults([]);
          setSearchError('No locations found');
        }
      } catch (err) {
        console.error('Search error:', err);
        setAutocompleteResults([]);
        setSearchError('Failed to search. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    }, 500); // 500ms debounce
  };

  // When a suggestion is clicked, set a marker and pan map
  const handleSuggestionClick = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (lat && lon) {
      setSearchMarker({ lat, lng: lon, label: result.display_name });
      setMapPosition([lat, lon]);
    }
    setAutocompleteResults([]);
    setShowDropdown(false);
    setSearch(result.display_name || '');
    setSelectedIndex(-1);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearch('');
    setAutocompleteResults([]);
    setSearchMarker(null);
    setShowDropdown(false);
    setSearchError('');
    setSelectedIndex(-1);
    setSearchLoading(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || autocompleteResults.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < autocompleteResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < autocompleteResults.length) {
          handleSuggestionClick(autocompleteResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Helper to pan map
  function ChangeMapView({ center }) {
    const map = useMap();
    useEffect(() => {
      map.setView(center);
    }, [center]);
    return null;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Enhanced Place Search Bar */}
      <div className="mb-6 relative" ref={searchRef} style={{ zIndex: 100 }}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Search for places, cities, or addresses in India..."
            className="w-full pl-10 pr-20 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:border-gray-400"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <FiX className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          🇮🇳 Search is limited to locations within India
        </p>

        {/* Dropdown Results */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
            style={{ zIndex: 1000 }}
          >
            {searchLoading ? (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-sm text-gray-600">Searching...</p>
              </div>
            ) : searchError ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">{searchError}</p>
              </div>
            ) : autocompleteResults.length > 0 ? (
              <ul>
                {autocompleteResults.map((result, idx) => (
                  <li
                    key={idx}
                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                      selectedIndex === idx
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSuggestionClick(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="flex items-start space-x-3">
                      <FiMapPin className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        selectedIndex === idx ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.display_name.split(',')[0]}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {result.display_name.split(',').slice(1).join(',')}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            
            {/* Helpful hint */}
            {search.length > 0 && search.length < 3 && (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400">Type at least 3 characters to search</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Issue Map</h1>
            <p className="text-gray-600 mt-2">
              View all reported issues in your community
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 btn-secondary"
            >
              <FiFilter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 btn-secondary"
              >
                <FiX className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Issues</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Type
              </label>
              <select
                value={filters.issue_type}
                onChange={(e) => setFilters(prev => ({ ...prev, issue_type: e.target.value }))}
                className="input-field"
              >
                <option value="">All Types</option>
                {issueTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="input-field"
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="input-field"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Submitted</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Verified</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-700">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Resolved</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Closed</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="card p-0 overflow-hidden" style={{ height: '70vh' }}>
        <MapContainer center={mapPosition} zoom={5} style={{ width: '100%', height: '100%' }}>
          <ChangeMapView center={mapPosition} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {issues.map((issue) => (
            <Marker
              key={issue.id}
              position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
              eventHandlers={{ click: () => setSelectedIssue(issue) }}
              icon={statusIcons[issue.status] || statusIcons.submitted}
            >
              {selectedIssue && selectedIssue.id === issue.id && (
                <Popup onClose={() => setSelectedIssue(null)}>
                  <div className="p-2 max-w-xs">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {selectedIssue.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedIssue.description.substring(0, 100)}...
                    </p>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`status-badge status-${selectedIssue.status}`}>
                        {selectedIssue.status.replace('_', ' ')}
                      </span>
                      <span className={`priority-badge ${getPriorityColor(selectedIssue.priority)}`}>
                        {selectedIssue.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {selectedIssue.issue_type.replace('_', ' ')} • {formatDate(selectedIssue.created_at)}
                    </p>
                    {selectedIssue.address && (
                      <p className="text-xs text-gray-500 mb-2">
                        📍 {selectedIssue.address}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        By {selectedIssue.reporter?.first_name} {selectedIssue.reporter?.last_name}
                      </span>
                      <Link
                        to={`/issue/${selectedIssue.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        <FiEye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </Popup>
              )}
            </Marker>
          ))}
          {searchMarker && (
            <Marker position={[searchMarker.lat, searchMarker.lng]}>
              <Popup>{searchMarker.label}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Issue Count */}
      <div className="mt-4 text-center">
        <p className="text-gray-600">
          Showing {issues.length} issue{issues.length !== 1 ? 's' : ''}
          {hasActiveFilters && ' (filtered)'}
        </p>
      </div>
    </div>
  );
};

export default IssueMap;
//
// To use this component, make sure to install dependencies:
// npm install react-leaflet leaflet
//