export default function Skeleton({ width, height, circle, radius, style, className = '', ...props }) {
  return (
    <span
      className={`skeleton ${circle ? 'skeleton-circle' : ''} ${className}`}
      style={{
        width: width || (circle ? '1em' : '100%'),
        height: height || (circle ? '1em' : '1em'),
        borderRadius: circle ? '50%' : radius || '6px',
        ...style,
      }}
      {...props}
    />
  );
}
