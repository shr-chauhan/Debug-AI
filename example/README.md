# Example Express App

Simple test app to demonstrate the error ingestion SDK.

## Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

**Quick version:**
1. Build the SDK: `cd ../sdks/node && npm install && npm run build`
2. Install dependencies: `npm install`
3. Run: `npm start`
4. Test: Visit `http://localhost:3000/test-error`

The app has one endpoint `/test-error` that triggers an error, which will be captured by the SDK and sent to your backend.

