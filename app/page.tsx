import PhotoReportUploader from "./components/PhotoReportUploader";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Snap-to-Report
              </h1>
            </div>
            
            {/* Navigation Links */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <PhotoReportUploader />
      </main>
    </div>
  );
}