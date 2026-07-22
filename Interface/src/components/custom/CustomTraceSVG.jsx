import { DASH_MAP } from '../../constants/constants';

export function CustomTraceSvg({
  color = 'black', dash = 'solid', width = 32, height = 8,
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1="0"
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={DASH_MAP[dash] || ''}
      />
    </svg>
  );
}
