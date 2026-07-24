export function LogoMark({ width = 22, height = 22, className }) {
  return (
    <img
      src="/favicon.svg"
      width={width}
      height={height}
      alt="WLEDashboard Logo"
      aria-hidden="true"
      className={className}
      style={{ display: 'block' }}
    />
  )
}
