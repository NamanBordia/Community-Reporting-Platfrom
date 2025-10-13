#!/usr/bin/env python3
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from setup_db import setup_database

if __name__ == "__main__":
    print("Setting up database...")
    setup_database()
    print("Done!") 