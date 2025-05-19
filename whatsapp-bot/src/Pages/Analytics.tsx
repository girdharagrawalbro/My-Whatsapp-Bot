import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const Analytics = () => {
  // Dummy data for charts
  const monthlyData = [
    { name: 'Jan', messages: 400, replies: 380, avgTime: 2.4 },
    { name: 'Feb', messages: 300, replies: 290, avgTime: 2.1 },
    { name: 'Mar', messages: 500, replies: 480, avgTime: 1.9 },
    { name: 'Apr', messages: 280, replies: 270, avgTime: 2.2 },
    { name: 'May', messages: 590, replies: 570, avgTime: 1.8 },
    { name: 'Jun', messages: 390, replies: 380, avgTime: 1.7 },
  ];

  const dailyData = [
    { name: 'Mon', messages: 40, replies: 38 },
    { name: 'Tue', messages: 30, replies: 29 },
    { name: 'Wed', messages: 50, replies: 48 },
    { name: 'Thu', messages: 28, replies: 27 },
    { name: 'Fri', messages: 59, replies: 57 },
    { name: 'Sat', messages: 39, replies: 38 },
    { name: 'Sun', messages: 25, replies: 24 },
  ];

  const aiPerformanceData = [
    { name: 'Successful', value: 85 },
    { name: 'Failed', value: 15 },
  ];

  const COLORS = ['#4F46E5', '#EF4444'];

  // Stats for cards
  const stats = [
    { title: 'Total Messages', value: '2,459', change: '+12%', trend: 'up' },
    { title: 'Today\'s Messages', value: '87', change: '+5%', trend: 'up' },
    { title: 'AI Replies', value: '2,380', change: '+8%', trend: 'up' },
    { title: 'Avg Response Time', value: '1.9s', change: '-0.3s', trend: 'down' },
  ];

  return (
    <div className="flex bg-gray-50">
      <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  stat.trend === 'up' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Performance Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 flex flex-col justify-center items-center">
              <div className="text-center mb-4">
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-4xl font-bold text-indigo-600 mt-1">85%</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={aiPerformanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {aiPerformanceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500 mb-4">Monthly Performance</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgTime" stroke="#8884d8" name="Avg Response Time (s)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Message Analytics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Message Analytics</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="messages" fill="#4F46E5" name="Total Messages" />
                <Bar dataKey="replies" fill="#10B981" name="AI Replies" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Activity</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="messages" fill="#4F46E5" name="Messages" />
                <Bar dataKey="replies" fill="#10B981" name="Replies" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
