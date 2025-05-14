export default function StatsCard ({
  title,
  value,
  change,
  trend
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
}) {
  return (
    <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
      <div className='flex justify-between items-start'>
        <div>
          <p className='text-sm font-medium text-gray-500'>{title}</p>
          <p className='text-2xl font-bold text-gray-800 mt-1'>{value}</p>
        </div>
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            trend === 'up'
              ? 'bg-green-100 text-green-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {change}
        </div>
      </div>
    </div>
  )
}
