from flask import Blueprint, request, jsonify
import requests

map_bp = Blueprint('map', __name__)

@map_bp.route('/nominatim-search')
def nominatim_search():
    q = request.args.get('q')
    if not q:
        return jsonify({'results': []})
    url = 'https://nominatim.openstreetmap.org/search'
    params = {
        'q': q,
        'format': 'json',
        'addressdetails': 1,
        'limit': 10,  # Request more results to filter
        'countrycodes': 'in'  # Restrict to India only
    }
    headers = {'User-Agent': 'community-reporting-app/1.0'}
    resp = requests.get(url, params=params, headers=headers)
    
    # Additional filtering to ensure only Indian results
    results = resp.json()
    india_results = [
        result for result in results 
        if result.get('address', {}).get('country_code', '').lower() == 'in'
    ]
    
    # Limit to 5 results after filtering
    return jsonify({'results': india_results[:5]}) 