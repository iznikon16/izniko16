import Image, { type ImageProps } from 'next/image';

type SafeImageProps = Omit<ImageProps, 'height' | 'width'> & {
  height?: number;
  width?: number;
};

/** Next Image wrapper for administrator-configured catalog image origins. */
export function SafeImage({ alt, height = 600, src, unoptimized, width = 600, ...props }: SafeImageProps) {
  const bypassOptimizer = unoptimized ?? (typeof src === 'string' && /^https?:\/\//i.test(src));
  return <Image {...props} alt={alt} height={height} src={src} unoptimized={bypassOptimizer} width={width} />;
}
