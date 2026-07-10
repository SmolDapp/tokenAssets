import {toast} from '@components/hooks/use-toast';

// Fetches a CDN asset and triggers a real download (the CDN allows cross-origin fetch). On failure
// we surface a toast rather than window.open(url): the app is hosted on the same origin the SVG
// logo is served from, so navigating to a raw logo.svg would render a stored SVG as a top-level
// same-origin document — the one path that could execute a malicious-but-CI-passing SVG's script.
export async function downloadLogo(url: string, filename: string): Promise<void> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error('Failed to fetch logo');
		}
		const blob = await response.blob();
		const objectURL = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = objectURL;
		anchor.download = filename;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(objectURL);
	} catch {
		toast({title: 'Could not download the logo — try again.', variant: 'destructive'});
	}
}
