#!/usr/bin/env python3
"""
Basic smoke-test script for the Author Studio Pro API backend.
Run with: python test_api.py
"""
import requests
import json
import sys
import os

BASE = "http://localhost:8000"

def test(name, fn):
    try:
        result = fn()
        print(f"  ✅ {name}: {result}")
    except Exception as e:
        print(f"  ❌ {name}: {e}")

print("\n🔍 Author Studio Pro API — Smoke Tests")
print("=" * 50)

# Health
print("\n[Health]")
test("GET /api/health", lambda: requests.get(f"{BASE}/api/health", timeout=3).json()["status"])

# Templates
print("\n[Templates]")
test("GET /api/templates", lambda: f"{len(requests.get(f'{BASE}/api/templates', timeout=3).json())} templates")

# Genres
print("\n[Genres]")
test("GET /api/genres", lambda: f"{len(requests.get(f'{BASE}/api/genres', timeout=3).json())} genres")

# Market
print("\n[Market]")
for genre_id in ["literary", "thriller", "fantasy"]:
    test(f"GET /api/market/{genre_id}", lambda g=genre_id: requests.get(f"{BASE}/api/market/{g}", timeout=3).json()["name"])

print("\n" + "=" * 50)
print("Smoke tests complete. Run 'uvicorn main:app --reload' in the backend folder first.\n")
