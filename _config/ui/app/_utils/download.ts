// Fetches a CDN asset and triggers a real download (the CDN allows cross-origin fetch).
// Falls back to opening the URL if the fetch is blocked.
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
		window.open(url, '_blank');
	}
}
