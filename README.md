# WatchDash

A real-time monitoring dashboard for Home Assistant connectivity logs built with Next.js, Firebase, and shadcn/ui.

## Features

- **Authentication System**: Secure login required to access the dashboard
- **Real-time Data**: Live updates from Firebase Firestore
- **Device Management**: View and monitor connected devices 
- **System Metrics**: CPU and memory usage tracking with charts
- **Connectivity Logs**: Historical device and entity information
- **Notifications**: Real-time alerts for important system events

## Tech Stack

- **Next.js**: React framework for the frontend
- **Firebase**: Authentication and Firestore database
- **shadcn/ui**: Component library for the UI
- **Tremor**: Charting library for data visualization
- **TypeScript**: For type safety and better developer experience

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or pnpm
- Firebase project with Firestore enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://your-repository-url/watchdash.git
   cd watchdash
   ```

2. Install dependencies:
   ```bash
   npm install
   # or with pnpm
   pnpm install
   ```

3. Set up Firebase configuration:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or with pnpm
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Firebase Data Structure

The dashboard expects a Firestore collection named `connectivity_logs` with documents containing HomeAssistant snapshots. Each document should follow the type structure defined in `src/types/connectivity.ts`.

## License

MIT
