#!/usr/bin/env python3
"""
Installation script for SmartQuizzer dependencies.
Run this script to install all required packages for URL processing.
"""

import subprocess
import sys

def install_package(package):
    """Install a package using pip."""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ Successfully installed {package}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install {package}: {e}")
        return False

def main():
    """Install all required dependencies."""
    print("🚀 Installing SmartQuizzer dependencies...")
    print("=" * 50)
    
    packages = [
        "requests",
        "beautifulsoup4",
        "PyMuPDF"
    ]
    
    success_count = 0
    for package in packages:
        if install_package(package):
            success_count += 1
    
    print("=" * 50)
    if success_count == len(packages):
        print("🎉 All dependencies installed successfully!")
        print("You can now use URL processing in SmartQuizzer.")
    else:
        print(f"⚠️  {success_count}/{len(packages)} packages installed successfully.")
        print("Some features may not work properly.")
    
    print("\nTo test URL processing, try uploading a URL like:")
    print("- https://en.wikipedia.org/wiki/Artificial_intelligence")
    print("- https://www.example.com")

if __name__ == "__main__":
    main()
