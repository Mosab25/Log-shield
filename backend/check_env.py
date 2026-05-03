import os
from dotenv import load_dotenv

def check_env_setup():
    """Check if .env file exists and has VirusTotal API key"""
    
    # Load environment variables
    load_dotenv()
    
    print("🔍 التحقق من إعدادات URL Scanner...")
    print("=" * 50)
    
    # Check if .env file exists
    env_exists = os.path.exists('.env')
    print(f"📁 ملف .env موجود: {'✅ نعم' if env_exists else '❌ لا'}")
    
    if env_exists:
        # Check key environment variables
        vt_key = os.getenv('VIRUSTOTAL_API_KEY')
        provider = os.getenv('URL_REPUTATION_PROVIDER')
        
        print(f"🔑 VirusTotal API Key: {'✅ موجود' if vt_key else '❌ غير موجود'}")
        print(f"🏢 Provider: {'✅ ' + provider if provider else '❌ غير موجود'}")
        
        if vt_key:
            print(f"🔤 API Key length: {len(vt_key)} characters")
            print(f"🔤 API Key starts with: {vt_key[:8]}...")
        
        # Check other important settings
        cache_ttl = os.getenv('URL_SCAN_CACHE_TTL_HOURS')
        rate_limit = os.getenv('URL_SCAN_RATE_LIMIT_PER_MINUTE')
        
        print(f"⏰ Cache TTL: {cache_ttl or 'غير محدد'} ساعات")
        print(f"🚦 Rate Limit: {rate_limit or 'غير محدد'} requests/دقيقة")
        
        # Overall status
        print("\n" + "=" * 50)
        if vt_key and provider:
            print("🎉 URL Scanner جاهز للعمل!")
            print("🔄 أعد تشغيل الباك إند لتطبيق الإعدادات")
        else:
            print("⚠️  URL Scanner غير جاهز - يلزم تكوين API Key")
    else:
        print("❌ أنشئ ملف .env في مجلد الباك إند")
        print("💡 انسخ المحتوى من env_setup.txt إلى .env")

if __name__ == "__main__":
    check_env_setup()
