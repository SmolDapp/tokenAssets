'use server';

import {cookies} from 'next/headers';

export async function setCookieView(view: string): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.set('view', view);
}
