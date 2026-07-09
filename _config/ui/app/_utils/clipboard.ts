import {toast} from '@components/hooks/use-toast';

export async function copyToClipboard(text: string, toastTitle: string): Promise<void> {
	// writeText rejects in insecure contexts, when the permission is denied, or in some Safari flows.
	// Surface a toast rather than leaving the click as a silent unhandled rejection.
	try {
		await navigator.clipboard.writeText(text);
		toast({title: toastTitle});
	} catch {
		toast({title: 'Could not copy to clipboard', variant: 'destructive'});
	}
}
