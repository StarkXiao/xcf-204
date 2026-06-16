interface BadgeProps {
  children: React.ReactNode;
  color?: 'purple' | 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}

const Badge = ({ children, color = 'gray' }: BadgeProps) => {
  const colors = {
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    green: 'bg-green-500/20 text-green-300 border-green-500/30',
    red: 'bg-red-500/20 text-red-300 border-red-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

export default Badge;
