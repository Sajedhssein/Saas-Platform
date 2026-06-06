/**
 * LoadingSpinner Component
 * Full-screen loading indicator shown during app initialization
 */
export const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-flex items-center justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-indigo-600 rounded-full animate-spin" />
            <div className="absolute inset-2 bg-white rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-linear-to-r from-blue-600 to-indigo-600 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
        <p className="mt-6 text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
};
