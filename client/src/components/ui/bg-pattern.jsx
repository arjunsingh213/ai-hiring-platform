import React from 'react';
import { cn } from '@/lib/utils';

const maskClasses = {
	'fade-edges': '[mask-image:radial-gradient(ellipse_at_center,var(--background),transparent)]',
	'fade-center': '[mask-image:radial-gradient(ellipse_at_center,transparent,var(--background))]',
	'fade-top': '[mask-image:linear-gradient(to_bottom,transparent,var(--background))]',
	'fade-bottom': '[mask-image:linear-gradient(to_bottom,var(--background),transparent)]',
	'fade-left': '[mask-image:linear-gradient(to_right,transparent,var(--background))]',
	'fade-right': '[mask-image:linear-gradient(to_right,var(--background),transparent)]',
	'fade-x': '[mask-image:linear-gradient(to_right,transparent,var(--background),transparent)]',
	'fade-y': '[mask-image:linear-gradient(to_bottom,transparent,var(--background),transparent)]',
	none: '',
};

function geBgImage(variant, fill, size) {
	switch (variant) {
		case 'dots':
			return `radial-gradient(${fill} 1px, transparent 1px)`;
		case 'grid':
			return `linear-gradient(to right, ${fill} 1px, transparent 1px), linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
		case 'diagonal-stripes':
			return `repeating-linear-gradient(45deg, ${fill}, ${fill} 1px, transparent 1px, transparent ${size}px)`;
		case 'horizontal-lines':
			return `linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
		case 'vertical-lines':
			return `linear-gradient(to right, ${fill} 1px, transparent 1px)`;
		case 'checkerboard':
			return `linear-gradient(45deg, ${fill} 25%, transparent 25%), linear-gradient(-45deg, ${fill} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fill} 75%), linear-gradient(-45deg, transparent 75%, ${fill} 75%)`;
		default:
			return undefined;
	}
}

const BGPattern = ({
	variant = 'grid',
	mask = 'none',
	size = 24,
	fill = '#252525',
	className,
	style,
	...props
}) => {
	const bgSize = `${size}px ${size}px`;
	const backgroundImage = geBgImage(variant, fill, size);

	return (
		<div
			className={cn('absolute inset-0 z-[-10] w-full h-full', maskClasses[mask], className)}
			style={{
				backgroundImage,
				backgroundSize: bgSize,
				...style,
			}}
			{...props}
		/>
	);
};

BGPattern.displayName = 'BGPattern';
export { BGPattern };
