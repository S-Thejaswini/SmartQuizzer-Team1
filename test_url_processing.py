#!/usr/bin/env python3
"""
Test script to verify URL processing functionality.
"""

def test_dependencies():
    """Test if required dependencies are available."""
    try:
        import requests
        import bs4
        print("✅ All dependencies are available!")
        return True
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("Please run: pip install requests beautifulsoup4")
        return False

def test_url_processing():
    """Test URL processing with a simple example."""
    if not test_dependencies():
        return False
    
    try:
        from app import process_url
        
        # Test with a simple URL
        test_url = "https://httpbin.org/html"
        print(f"Testing URL processing with: {test_url}")
        
        result = process_url(test_url)
        
        if result.startswith("Error:"):
            print(f"❌ URL processing failed: {result}")
            return False
        else:
            print(f"✅ URL processing successful! Extracted {len(result)} characters")
            print(f"Preview: {result[:200]}...")
            return True
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing SmartQuizzer URL Processing")
    print("=" * 40)
    
    if test_url_processing():
        print("\n🎉 URL processing is working correctly!")
    else:
        print("\n⚠️  URL processing needs attention.")
        print("Make sure to install dependencies: pip install requests beautifulsoup4")
