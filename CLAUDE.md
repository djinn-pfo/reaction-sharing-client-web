# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an iOS app project built with SwiftUI, targeting iOS development. The project follows standard Xcode project structure with a main app target and associated test targets.

## Project Structure

- `lolupReactionTestApp/` - Main app source code
  - `lolupReactionTestAppApp.swift` - App entry point (@main)
  - `ContentView.swift` - Main UI view
  - `Assets.xcassets/` - App assets and resources
- `lolupReactionTestAppTests/` - Unit tests using Swift Testing framework
- `lolupReactionTestAppUITests/` - UI tests using XCTest framework
- `lolupReactionTestApp.xcodeproj/` - Xcode project file
- `lolupReactionTestApp.xcworkspace/` - Xcode workspace (preferred for opening)

## Development Commands

### Building and Running
- Open project: `open lolupReactionTestApp.xcworkspace` (use workspace, not xcodeproj)
- Build from command line: `xcodebuild -workspace lolupReactionTestApp.xcworkspace -scheme lolupReactionTestApp build`
- Clean build: `xcodebuild -workspace lolupReactionTestApp.xcworkspace -scheme lolupReactionTestApp clean`

### Testing
- Run unit tests: `xcodebuild test -workspace lolupReactionTestApp.xcworkspace -scheme lolupReactionTestApp -destination 'platform=iOS Simulator,name=iPhone 15'`
- Run UI tests: `xcodebuild test -workspace lolupReactionTestApp.xcworkspace -scheme lolupReactionTestAppUITests -destination 'platform=iOS Simulator,name=iPhone 15'`

## Architecture

The app uses SwiftUI as the UI framework with the following key components:

- **App Structure**: Standard SwiftUI app lifecycle with `@main` entry point
- **Testing Strategy**:
  - Unit tests use Swift Testing framework (modern approach with `@Test` macro)
  - UI tests use XCTest framework with XCUIApplication for app automation
- **Target Structure**: Separate targets for main app, unit tests, and UI tests

## Development Notes

- This project uses the newer Swift Testing framework for unit tests rather than XCTest
- UI tests still use XCTest framework as it's the standard for UI automation
- The project is set up as a workspace, so always open `.xcworkspace` files rather than `.xcodeproj`
- When running tests from command line, specify iOS Simulator destination for proper execution