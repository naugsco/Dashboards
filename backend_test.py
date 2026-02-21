import requests
import sys
from datetime import datetime
import json

class NewsAPITester:
    def __init__(self, base_url="https://eu-news-pulse.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else type(response_data)}")
                except:
                    print(f"   Response: Non-JSON or empty")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Error: {response.text[:200]}")

            self.results.append({
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_sample": response.text[:100] if not success else "OK"
            })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.results.append({
                "test": name,
                "method": method,  
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "response_sample": str(e)
            })
            return False, {}

    def test_basic_news_endpoint(self):
        """Test GET /api/news endpoint"""
        success, response = self.run_test(
            "Get All News Stories",
            "GET",
            "news",
            200
        )
        if success and response:
            stories = response.get('stories', [])
            count = response.get('count', 0)
            print(f"   Found {count} stories")
            if stories:
                sample_story = stories[0]
                required_fields = ['title', 'description', 'source', 'country', 'priority', 'relevance_score']
                missing_fields = [field for field in required_fields if field not in sample_story]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in story: {missing_fields}")
                else:
                    print(f"   ✅ Story structure looks good")
                    print(f"   Sample: {sample_story.get('title', 'No title')[:50]}...")
        return success

    def test_country_filter(self):
        """Test GET /api/news?country=United Kingdom"""
        success, response = self.run_test(
            "Filter News by Country",
            "GET", 
            "news",
            200,
            params={"country": "United Kingdom"}
        )
        if success and response:
            stories = response.get('stories', [])
            if stories:
                # Check if all stories are for UK
                uk_stories = [s for s in stories if s.get('country') == 'United Kingdom']
                print(f"   UK stories: {len(uk_stories)}/{len(stories)}")
        return success

    def test_priority_filter(self):
        """Test GET /api/news?priority=politics"""
        success, response = self.run_test(
            "Filter News by Priority",
            "GET",
            "news", 
            200,
            params={"priority": "politics"}
        )
        if success and response:
            stories = response.get('stories', [])
            if stories:
                politics_stories = [s for s in stories if s.get('priority') == 'politics']
                print(f"   Politics stories: {len(politics_stories)}/{len(stories)}")
        return success

    def test_news_stats(self):
        """Test GET /api/news/stats"""
        success, response = self.run_test(
            "Get News Statistics",
            "GET",
            "news/stats",
            200
        )
        if success and response:
            required_fields = ['source_distribution', 'country_distribution', 'priority_distribution', 'total_stories']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing fields in stats: {missing_fields}")
            else:
                print(f"   ✅ Stats structure looks good")
                print(f"   Total stories: {response.get('total_stories', 0)}")
                print(f"   Sources: {len(response.get('source_distribution', []))}")
                print(f"   Countries: {len(response.get('country_distribution', []))}")
        return success

    def test_countries_endpoint(self):
        """Test GET /api/news/countries"""
        success, response = self.run_test(
            "Get Countries List",
            "GET", 
            "news/countries",
            200
        )
        if success and response:
            countries = response.get('countries', [])
            print(f"   Available countries: {len(countries)}")
            expected_countries = ['United Kingdom', 'Ireland', 'Portugal', 'Iceland', 'Moldova', 'Estonia', 'Latvia', 'Lithuania', 'Cape Verde']
            found_countries = [c for c in expected_countries if c in countries]
            print(f"   Expected countries found: {len(found_countries)}/{len(expected_countries)}")
        return success

    def test_regional_country_filters(self):
        """Test filtering by new regional countries"""
        regional_countries = ['Iceland', 'Moldova', 'Estonia', 'Latvia']
        all_passed = True
        
        for country in regional_countries:
            success, response = self.run_test(
                f"Filter News by {country}",
                "GET",
                "news",
                200,
                params={"country": country}
            )
            if success and response:
                stories = response.get('stories', [])
                country_stories = [s for s in stories if s.get('country') == country]
                print(f"   {country} stories: {len(country_stories)}/{len(stories)}")
                if len(stories) == 0:
                    print(f"   ⚠️  No stories found for {country}")
                elif len(country_stories) != len(stories):
                    print(f"   ⚠️  Mixed countries in {country} filter results")
            else:
                all_passed = False
                
        return all_passed

    def test_regional_sources_in_stats(self):
        """Test that regional sources appear in stats"""
        success, response = self.run_test(
            "Check Regional Sources in Stats",
            "GET",
            "news/stats",
            200
        )
        if success and response:
            source_dist = response.get('source_distribution', [])
            sources = [s['source'] for s in source_dist]
            print(f"   All sources: {sources}")
            
            # Check for regional sources
            regional_sources = ['RUV', 'Iceland Monitor', 'Grapevine', 'Moldpres', 'Moldova Live', 
                              'YAM News', 'ERR News', 'LSM Latvia', 'LRT', 'Baltic Times', 
                              'AllAfrica', 'Inforpress', 'Expresso das Ilhas']
            found_regional = [src for src in regional_sources if src in sources]
            print(f"   Regional sources found: {len(found_regional)}/{len(regional_sources)}")
            print(f"   Found regional sources: {found_regional}")
            
            # Check total story count (should be 161+ according to request)
            total = response.get('total_stories', 0)
            print(f"   Total stories: {total} (expected: 161+)")
            
        return success

    def test_story_volume_check(self):
        """Test that we have 161+ stories as mentioned in requirements"""
        success, response = self.run_test(
            "Story Volume Check (161+)",
            "GET",
            "news",
            200,
            params={"limit": 200}
        )
        if success and response:
            stories = response.get('stories', [])
            count = len(stories)
            print(f"   Story count: {count}")
            if count >= 161:
                print(f"   ✅ Volume requirement met ({count} >= 161)")
            else:
                print(f"   ⚠️  Below expected volume ({count} < 161)")
                
            # Check source diversity
            sources = set(s.get('source', 'Unknown') for s in stories)
            print(f"   Unique sources: {len(sources)} sources")
            print(f"   Sources: {list(sources)}")
            
        return success

    def test_refresh_endpoint(self):
        """Test POST /api/news/refresh"""
        success, response = self.run_test(
            "Trigger News Refresh",
            "POST",
            "news/refresh",
            200
        )
        if success and response:
            print(f"   Refresh message: {response.get('message', 'No message')}")
            print(f"   Story count: {response.get('story_count', 'No count')}")
        return success

def main():
    print("🚀 Starting News API Tests")
    print("=" * 50)
    
    tester = NewsAPITester()
    
    # Run all tests
    tests = [
        tester.test_basic_news_endpoint,
        tester.test_country_filter, 
        tester.test_priority_filter,
        tester.test_news_stats,
        tester.test_countries_endpoint,
        tester.test_refresh_endpoint,
    ]
    
    for test in tests:
        test()
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Summary: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        failed_tests = [r for r in tester.results if not r['success']]
        print(f"Failed tests: {[t['test'] for t in failed_tests]}")
        return 1

if __name__ == "__main__":
    sys.exit(main())