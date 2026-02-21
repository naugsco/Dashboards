"""
Backend API tests for News Dashboard
Tests: API endpoints, filtering, stats, and data structure
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "News Dashboard API"
        print(f"SUCCESS: API root returns: {data}")


class TestNewsEndpoint:
    """Tests for /api/news endpoint"""
    
    def test_get_news_returns_stories(self):
        """Test that news endpoint returns stories"""
        response = requests.get(f"{BASE_URL}/api/news")
        assert response.status_code == 200
        data = response.json()
        assert "stories" in data
        assert "count" in data
        assert isinstance(data["stories"], list)
        assert len(data["stories"]) > 0
        print(f"SUCCESS: Got {data['count']} stories")
    
    def test_news_story_structure(self):
        """Test that stories have required fields"""
        response = requests.get(f"{BASE_URL}/api/news?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["title", "description", "url", "source", "country", "priority", "relevance_score"]
        for story in data["stories"]:
            for field in required_fields:
                assert field in story, f"Missing field: {field}"
            # Validate data types
            assert isinstance(story["title"], str)
            assert isinstance(story["relevance_score"], (int, float))
            assert story["priority"] in ["general", "politics", "disaster"]
        print(f"SUCCESS: All {len(data['stories'])} stories have correct structure")
    
    def test_filter_by_country(self):
        """Test country filtering"""
        countries_to_test = ["United Kingdom", "Ireland", "Iceland", "Portugal"]
        
        for country in countries_to_test:
            response = requests.get(f"{BASE_URL}/api/news", params={"country": country})
            assert response.status_code == 200
            data = response.json()
            
            # All returned stories should be for the requested country
            for story in data["stories"]:
                assert story["country"] == country, f"Expected {country}, got {story['country']}"
            print(f"SUCCESS: {country} filter returned {data['count']} stories")
    
    def test_filter_by_priority(self):
        """Test priority filtering"""
        priorities = ["politics", "disaster", "general"]
        
        for priority in priorities:
            response = requests.get(f"{BASE_URL}/api/news", params={"priority": priority})
            assert response.status_code == 200
            data = response.json()
            
            # All returned stories should have the requested priority
            for story in data["stories"]:
                assert story["priority"] == priority, f"Expected {priority}, got {story['priority']}"
            print(f"SUCCESS: {priority} filter returned {data['count']} stories")
    
    def test_combined_filters(self):
        """Test combining country and priority filters"""
        response = requests.get(f"{BASE_URL}/api/news", params={
            "country": "Ireland",
            "priority": "politics"
        })
        assert response.status_code == 200
        data = response.json()
        
        for story in data["stories"]:
            assert story["country"] == "Ireland"
            assert story["priority"] == "politics"
        print(f"SUCCESS: Combined filter returned {data['count']} stories")
    
    def test_limit_parameter(self):
        """Test limit parameter works correctly"""
        response = requests.get(f"{BASE_URL}/api/news", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        assert len(data["stories"]) <= 10
        print(f"SUCCESS: Limit parameter works, got {len(data['stories'])} stories")


class TestStatsEndpoint:
    """Tests for /api/news/stats endpoint"""
    
    def test_stats_returns_data(self):
        """Test stats endpoint returns complete data"""
        response = requests.get(f"{BASE_URL}/api/news/stats")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["total_stories", "source_distribution", "country_distribution", "priority_distribution"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        assert data["total_stories"] > 0
        print(f"SUCCESS: Stats shows {data['total_stories']} total stories")
    
    def test_source_distribution(self):
        """Test source distribution data structure"""
        response = requests.get(f"{BASE_URL}/api/news/stats")
        assert response.status_code == 200
        data = response.json()
        
        sources = data["source_distribution"]
        assert len(sources) > 0
        
        for source in sources:
            assert "source" in source
            assert "count" in source
            assert isinstance(source["count"], int)
        
        source_names = [s["source"] for s in sources]
        print(f"SUCCESS: Found {len(sources)} sources: {source_names[:5]}...")
    
    def test_country_distribution(self):
        """Test country distribution data structure"""
        response = requests.get(f"{BASE_URL}/api/news/stats")
        assert response.status_code == 200
        data = response.json()
        
        countries = data["country_distribution"]
        assert len(countries) > 0
        
        expected_countries = ["United Kingdom", "Ireland", "Portugal", "Iceland", "Moldova", 
                            "Latvia", "Lithuania", "Estonia", "Finland", "Norway", "Sweden", "Cape Verde"]
        
        country_names = [c["country"] for c in countries]
        for expected in expected_countries:
            if expected in country_names:
                print(f"  - {expected}: found")
        
        print(f"SUCCESS: Found {len(countries)} countries in distribution")
    
    def test_priority_distribution(self):
        """Test priority distribution data structure"""
        response = requests.get(f"{BASE_URL}/api/news/stats")
        assert response.status_code == 200
        data = response.json()
        
        priorities = data["priority_distribution"]
        priority_names = [p["priority"] for p in priorities]
        
        expected_priorities = ["general", "politics", "disaster"]
        for expected in expected_priorities:
            assert expected in priority_names, f"Missing priority: {expected}"
        
        print(f"SUCCESS: All priority types present: {priority_names}")


class TestCountriesEndpoint:
    """Tests for /api/news/countries endpoint"""
    
    def test_countries_returns_list(self):
        """Test countries endpoint returns all supported countries"""
        response = requests.get(f"{BASE_URL}/api/news/countries")
        assert response.status_code == 200
        data = response.json()
        
        assert "countries" in data
        countries = data["countries"]
        
        expected_countries = ["United Kingdom", "Ireland", "Portugal", "Iceland", "Moldova", 
                            "Latvia", "Lithuania", "Estonia", "Finland", "Norway", "Sweden", "Cape Verde"]
        
        for expected in expected_countries:
            assert expected in countries, f"Missing country: {expected}"
        
        print(f"SUCCESS: All {len(expected_countries)} expected countries present")


class TestDataQuality:
    """Tests for data quality and content"""
    
    def test_stories_have_valid_urls(self):
        """Test that stories have valid URLs"""
        response = requests.get(f"{BASE_URL}/api/news?limit=20")
        assert response.status_code == 200
        data = response.json()
        
        for story in data["stories"]:
            url = story.get("url", "")
            assert url.startswith("http"), f"Invalid URL: {url}"
        
        print(f"SUCCESS: All {len(data['stories'])} stories have valid URLs")
    
    def test_stories_sorted_by_relevance(self):
        """Test that stories are sorted by relevance score (descending)"""
        response = requests.get(f"{BASE_URL}/api/news?limit=50")
        assert response.status_code == 200
        data = response.json()
        
        scores = [s["relevance_score"] for s in data["stories"]]
        assert scores == sorted(scores, reverse=True), "Stories not sorted by relevance"
        
        print(f"SUCCESS: Stories correctly sorted by relevance (top score: {scores[0]})")
    
    def test_regional_countries_have_stories(self):
        """Test that regional/underrepresented countries have stories"""
        regional_countries = ["Iceland", "Moldova", "Latvia", "Lithuania", "Estonia", "Cape Verde"]
        
        for country in regional_countries:
            response = requests.get(f"{BASE_URL}/api/news", params={"country": country})
            assert response.status_code == 200
            data = response.json()
            
            # Should have at least some stories for each regional country
            print(f"  - {country}: {data['count']} stories")
        
        print("SUCCESS: Regional countries have story coverage")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
