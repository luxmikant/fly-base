/**
 * Simple Analytics Dashboard for Testing
 */

export function AnalyticsDashboardSimple() {
  return (
    <div className="p-6 bg-white text-black">
      <h1 className="text-3xl font-bold mb-4">Analytics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-100 p-4 rounded">
          <h3 className="font-semibold">Total Surveys</h3>
          <p className="text-2xl font-bold">1,247</p>
        </div>
        <div className="bg-green-100 p-4 rounded">
          <h3 className="font-semibold">Flight Time</h3>
          <p className="text-2xl font-bold">342.7h</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold">Efficiency</h3>
          <p className="text-2xl font-bold">87.4%</p>
        </div>
        <div className="bg-purple-100 p-4 rounded">
          <h3 className="font-semibold">Cost per Survey</h3>
          <p className="text-2xl font-bold">$285</p>
        </div>
      </div>
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Status</h2>
        <p>✅ Analytics dashboard is working!</p>
        <p>✅ Navigation integration successful</p>
        <p>✅ Component rendering properly</p>
      </div>
    </div>
  );
}