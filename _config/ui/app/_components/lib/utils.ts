import {type ClassValue, clsx} from 'clsx';
import {extendTailwindMerge} from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			'font-size': ['text-xxs']
		}
	}
});

export function cn(...inputs: ClassValue[]): string {
	return customTwMerge(clsx(inputs));
}
