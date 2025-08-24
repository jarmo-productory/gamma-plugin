#!/bin/bash
# Path Constants - Absolute paths for project consistency
# Usage: source scripts/path-constants.sh

export PROJECT_ROOT="/Users/jarmotuisk/Projects/gamma-plugin"
export WEB_PACKAGE_ROOT="$PROJECT_ROOT/packages/web"
export EXTENSION_PACKAGE_ROOT="$PROJECT_ROOT/packages/extension"
export BACKUP_ROOT="$PROJECT_ROOT/backup"

# Function to validate we're in the correct directory
validate_working_directory() {
    if [ "$PWD" != "$PROJECT_ROOT" ]; then
        echo "❌ ERROR: Must run from project root: $PROJECT_ROOT"
        echo "   Current directory: $PWD"
        echo "   Run: cd $PROJECT_ROOT"
        return 1
    fi
    return 0
}

# Function to change to web package directory safely
cd_to_web_package() {
    cd "$WEB_PACKAGE_ROOT" || {
        echo "❌ ERROR: Could not change to web package directory: $WEB_PACKAGE_ROOT"
        return 1
    }
    echo "✅ Working in web package: $WEB_PACKAGE_ROOT"
}

# Function to return to project root
cd_to_project_root() {
    cd "$PROJECT_ROOT" || {
        echo "❌ ERROR: Could not change to project root: $PROJECT_ROOT"
        return 1
    }
    echo "✅ Working in project root: $PROJECT_ROOT"
}