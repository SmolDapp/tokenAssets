'use client';

// Inspired by react-hot-toast library

import type {TToastActionElement, TToastProps} from '@components/ui/toast';
import {type ReactNode, useEffect, useState} from 'react';

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type TToasterToast = TToastProps & {
	id: string;
	title?: ReactNode;
	description?: ReactNode;
	action?: TToastActionElement;
};

const actionTypes = {
	ADD_TOAST: 'ADD_TOAST',
	UPDATE_TOAST: 'UPDATE_TOAST',
	DISMISS_TOAST: 'DISMISS_TOAST',
	REMOVE_TOAST: 'REMOVE_TOAST'
} as const;

let count = 0;

function genId(): string {
	count = (count + 1) % Number.MAX_SAFE_INTEGER;
	return count.toString();
}

type TActionType = typeof actionTypes;

type TAction =
	| {
			type: TActionType['ADD_TOAST'];
			toast: TToasterToast;
	  }
	| {
			type: TActionType['UPDATE_TOAST'];
			toast: Partial<TToasterToast>;
	  }
	| {
			type: TActionType['DISMISS_TOAST'];
			toastId?: TToasterToast['id'];
	  }
	| {
			type: TActionType['REMOVE_TOAST'];
			toastId?: TToasterToast['id'];
	  };

type TState = {
	toasts: TToasterToast[];
};

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string): void => {
	if (toastTimeouts.has(toastId)) {
		return;
	}

	const timeout = setTimeout(() => {
		toastTimeouts.delete(toastId);
		dispatch({
			type: 'REMOVE_TOAST',
			toastId: toastId
		});
	}, TOAST_REMOVE_DELAY);

	toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: TState, action: TAction): TState => {
	switch (action.type) {
		case 'ADD_TOAST':
			return {
				...state,
				toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT)
			};

		case 'UPDATE_TOAST':
			return {
				...state,
				toasts: state.toasts.map(t => (t.id === action.toast.id ? {...t, ...action.toast} : t))
			};

		case 'DISMISS_TOAST': {
			const {toastId} = action;

			// ! Side effects ! - This could be extracted into a dismissToast() action,
			// but I'll keep it here for simplicity
			if (toastId) {
				addToRemoveQueue(toastId);
			} else {
				for (const toast of state.toasts) {
					addToRemoveQueue(toast.id);
				}
			}

			return {
				...state,
				toasts: state.toasts.map(t =>
					t.id === toastId || toastId === undefined
						? {
								...t,
								open: false
							}
						: t
				)
			};
		}
		case 'REMOVE_TOAST':
			if (action.toastId === undefined) {
				return {
					...state,
					toasts: []
				};
			}
			return {
				...state,
				toasts: state.toasts.filter(t => t.id !== action.toastId)
			};
	}
};

const listeners: ((state: TState) => void)[] = [];

let memoryState: TState = {toasts: []};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function dispatch(action: TAction) {
	memoryState = reducer(memoryState, action);
	for (const listener of listeners) {
		listener(memoryState);
	}
}

type TToast = Omit<TToasterToast, 'id'>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function toast({...props}: TToast) {
	const id = genId();

	const update = (props: TToasterToast): void =>
		dispatch({
			type: 'UPDATE_TOAST',
			toast: {...props, id}
		});
	const dismiss = (): void => dispatch({type: 'DISMISS_TOAST', toastId: id});

	dispatch({
		type: 'ADD_TOAST',
		toast: {
			...props,
			id,
			open: true,
			onOpenChange: (open: boolean) => {
				if (!open) {
					dismiss();
				}
			}
		}
	});

	return {
		id: id,
		dismiss,
		update
	};
}

function useToast() {
	const [state, setState] = useState<TState>(memoryState);

	// biome-ignore lint/correctness/useExhaustiveDependencies: state is required to trigger the re-render
	useEffect(() => {
		listeners.push(setState);
		return () => {
			const index = listeners.indexOf(setState);
			if (index > -1) {
				listeners.splice(index, 1);
			}
		};
	}, [state]);

	return {
		...state,
		toast,
		dismiss: (toastId?: string) => dispatch({type: 'DISMISS_TOAST', toastId})
	};
}

export {toast, useToast};
