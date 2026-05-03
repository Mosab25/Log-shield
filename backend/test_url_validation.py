import re
from app.services.url_scanner_service import URLValidator

def test_chatgpt_url():
    """Test why chatgpt.com is flagged as suspicious"""
    
    url = "https://chatgpt.com"
    print(f"Testing URL: {url}")
    print("=" * 50)
    
    # Test the validation
    is_valid, error_message = URLValidator.validate_url(url)
    print(f"Valid: {is_valid}")
    print(f"Error: {error_message}")
    
    # Test suspicious patterns manually
    url_lower = url.lower()
    print(f"\nURL lower: {url_lower}")
    
    # Check TLDs
    suspicious_tlds = {
        ".tk", ".ml", ".ga", ".cf", ".top", ".click", ".download", ".loan",
        ".win", ".review", ".science", ".work", ".party", ".trade"
    }
    
    print(f"\nTLD check:")
    for tld in suspicious_tlds:
        if url_lower.endswith(tld):
            print(f"  ❌ Matches suspicious TLD: {tld}")
            break
    else:
        print(f"  ✅ No suspicious TLDs matched")
    
    # Check patterns
    suspicious_patterns = [
        r"[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}",
        r"bit\.ly",
        r"tinyurl\.com",
        r"short\.link",
        r"t\.co",
    ]
    
    print(f"\nPattern check:")
    for pattern in suspicious_patterns:
        if re.search(pattern, url_lower):
            print(f"  ❌ Matches pattern: {pattern}")
        else:
            print(f"  ✅ No match: {pattern}")

if __name__ == "__main__":
    test_chatgpt_url()
