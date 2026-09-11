type DigitalHoodMarkProps = {
  className?: string
  imageClassName?: string
  label?: string
}

export default function DigitalHoodMark({
  className = 'h-10 w-10',
  imageClassName = '',
  label = 'DigitalHood',
}: DigitalHoodMarkProps) {
  return (
    <span className={`dh-brand-mark ${className}`}>
      <img
        src="/logo.jpg"
        alt={label}
        className={`dh-brand-mark-image ${imageClassName}`}
      />
    </span>
  )
}
