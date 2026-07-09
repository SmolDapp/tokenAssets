import {toast} from '@components/hooks/use-toast';

export async function copyToClipboard(text: string, toastTitle: string): Promise<void> {
	await navigator.clipboard.writeText(text);
	toast({title: toastTitle});
}
