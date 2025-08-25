#!/bin/bash

# Pre-build gates script for Gamma Timetable Extension
# This script runs basic quality checks before builds

set -e

echo "🚪 Running pre-build gates..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this from the project root."
    exit 1
fi

# Basic file structure check
if [ ! -d "packages" ]; then
    echo "❌ Error: packages directory not found"
    exit 1
fi

echo "✅ Pre-build gates passed"