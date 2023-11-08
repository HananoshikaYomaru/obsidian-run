#!/bin/bash

# Set the default update type
UPDATE_TYPE="patch"

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
    -m | --minor)
        UPDATE_TYPE="minor"
        shift
        ;;
    -M | --major)
        UPDATE_TYPE="major"
        shift
        ;;
    *)
        echo "Unknown option: $key"
        exit 1
        ;;
    esac
done

# Get the version number from manifest.json
MANIFEST_VERSION=$(jq -r '.version' manifest.json)

# Get the version number from package.json
PACKAGE_VERSION=$(node -p -e "require('./package.json').version")

# Ensure the version from package.json matches the version in manifest.json
if [ "$PACKAGE_VERSION" != "$MANIFEST_VERSION" ]; then
    echo "Version mismatch between package.json and manifest.json"
    exit 1
fi

# Increment the version based on the specified update type
if [ "$UPDATE_TYPE" = "minor" ]; then
    NEW_VERSION=$(semver $PACKAGE_VERSION -i minor)
elif [ "$UPDATE_TYPE" = "major" ]; then
    NEW_VERSION=$(semver $PACKAGE_VERSION -i major)
else
    NEW_VERSION=$(semver $PACKAGE_VERSION -i patch)
fi

echo "Current version: $PACKAGE_VERSION"
echo "New version: $NEW_VERSION"

# Update the version in package.json
jq --arg version "$NEW_VERSION" '.version = $version' package.json >tmp.json && mv tmp.json package.json
echo "Changed package.json version to $NEW_VERSION"

# Print the updated version of manifest.json using 'bun'
bun run version
echo "Updated version of manifest using bun. The current version of manifest.json is $(jq -r '.version' manifest.json)"

# Create a git commit and tag
git add . && git commit -m "release: $NEW_VERSION"
git tag -a "$NEW_VERSION" -m "release: $NEW_VERSION"
echo "Created tag $NEW_VERSION"

# Push the commit and tag to the remote repository
git push origin "$NEW_VERSION"
echo "Pushed tag $NEW_VERSION to the origin branch $NEW_VERSION"
git push
echo "Pushed to the origin master branch"
