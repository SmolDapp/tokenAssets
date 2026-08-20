'use client';

import {ChainSelector} from '@components/ChainSelector';
import {cn} from '@components/lib/utils';
import {SubmitResult} from '@components/Submit/SubmitResult';
import {Button} from '@components/ui/button';
import {Input} from '@components/ui/input';
import {useTokens} from '@hooks/useTokens';
import ArrowDown from '@icons/arrow-down.svg';
import {DEFAULT_CHAIN} from '@utils/constants';
import type {TTokenInfo} from '@utils/infoJson';
import {canFetchOnchain, fetchOnchainToken} from '@utils/onchainToken';
import {fetchTokenPrefill} from '@utils/tokenPrefill';
import {
	isValidAddress,
	parseTags,
	type TErasableField,
	type TSubmissionInput,
	type TValidationError,
	type TValidationScope,
	toFolderAddress,
	validateSubmission,
	validateTags,
	validateTokenMeta
} from '@utils/tokenSubmission';
import {useRouter} from 'next/navigation';
import {signIn} from 'next-auth/react';
import type {ReactElement, ReactNode} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';

type TMetaStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';
type TPrefillStatus = 'idle' | 'loading' | 'ready' | 'error';
// Set from a route answer that contradicts the local token list, and cleared as soon as the address or
// chain changes.
type TForcedMode = 'edit' | 'create' | null;

// What survives the GitHub sign-in redirect, stashed in sessionStorage just before signIn().
type TStash = {
	chainID: string;
	address: string;
	svgText: string;
	svgFileName: string;
	name: string;
	symbol: string;
	decimals: string;
	description: string;
	website: string;
	tagsRaw: string;
};

const ERASABLE_FIELDS: TErasableField[] = ['website', 'description', 'tags'];

const inputClassName = 'border border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-white/40';
const STASH_KEY = 'token-submit-stash';

// Identifies the token whose values are in the form. Keyed on the folder the submission would write to,
// like every other "same token" decision here, so re-pasting an address in a different case is not
// mistaken for a different token.
function prefillKey(chainID: string, address: string): string {
	return `${chainID}/${toFolderAddress(address)}`;
}

const labelClassName = 'block font-medium font-mono text-white/50 text-xs uppercase tracking-[0.1em]';

// `htmlFor` associates the label with its control for assistive tech. Omitted for the logo field,
// whose child is itself a <label> (nesting labels would be invalid), so it stays a plain <span>.
function Field({
	label,
	hint,
	htmlFor,
	children
}: {
	label: string;
	hint?: string;
	htmlFor?: string;
	children: ReactNode;
}): ReactElement {
	return (
		<div className={'space-y-1.5'}>
			{htmlFor ? (
				<label
					htmlFor={htmlFor}
					className={labelClassName}>
					{label}
				</label>
			) : (
				<span className={labelClassName}>{label}</span>
			)}
			{children}
			{hint && <span className={'block font-mono text-white/35 text-xxs leading-relaxed'}>{hint}</span>}
		</div>
	);
}

export function SubmitForm({
	signedIn,
	initialChainID,
	initialAddress
}: {
	signedIn: boolean;
	initialChainID?: string;
	initialAddress?: string;
}): ReactElement {
	const router = useRouter();
	const [chainID, setChainID] = useState(initialChainID || DEFAULT_CHAIN.id);
	const [address, setAddress] = useState(initialAddress || '');
	const [svgText, setSvgText] = useState('');
	const [svgFileName, setSvgFileName] = useState('');
	const [svgError, setSvgError] = useState('');
	const [name, setName] = useState('');
	const [symbol, setSymbol] = useState('');
	const [decimals, setDecimals] = useState('');
	const [description, setDescription] = useState('');
	const [website, setWebsite] = useState('');
	const [tagsRaw, setTagsRaw] = useState('');
	const [metaStatus, setMetaStatus] = useState<TMetaStatus>('idle');
	const [retryNonce, setRetryNonce] = useState(0);
	const [showOptional, setShowOptional] = useState(false);
	const [errors, setErrors] = useState<TValidationError[]>([]);
	const [submitError, setSubmitError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [prURL, setPrURL] = useState<string | null>(null);
	const [baseInfo, setBaseInfo] = useState<TTokenInfo | null>(null);
	const [baseSvgText, setBaseSvgText] = useState('');
	const [prefillStatus, setPrefillStatus] = useState<TPrefillStatus>('idle');
	const [prefillNonce, setPrefillNonce] = useState(0);
	const [confirmErasure, setConfirmErasure] = useState(false);
	const [forcedMode, setForcedMode] = useState<TForcedMode>(null);
	// `<chainID>/<address>` of the token whose values are already in the form, so the prefill applies
	// once and never overwrites what the user typed.
	const appliedPrefillKeyRef = useRef('');

	// Cross-checked against the same per-chain token list the browse pages use, so a submission
	// for an address already in the CDN is caught before the user fills out the rest of the form.
	// Matched on the folder the submission would write to, not on a lowercased address: a Solana
	// address typed in a different case resolves to a different folder and is genuinely new.
	const {findByFolderAddress, isLoading: isTokenListLoading, hasError: hasTokenListError} = useTokens(chainID);
	const existingToken = useMemo(() => {
		if (!isValidAddress(chainID, address)) {
			return undefined;
		}
		return findByFolderAddress(address.trim());
	}, [findByFolderAddress, chainID, address]);

	// The token list starts empty and fills in asynchronously, so "no match" is only meaningful once it
	// has loaded. Without this the form flickers through the add state on a token that does exist.
	//
	// That list is a build-time snapshot while the route resolves existence against GitHub live, so the
	// two can disagree — a token merged since the last index refresh, or a folder deleted from main. The
	// route's answer wins: it sets `forcedMode` and the form switches instead of dead-ending on a status
	// the user has no way to act on.
	let isEditing = Boolean(existingToken) && !isTokenListLoading && !hasTokenListError;
	if (forcedMode === 'edit') {
		isEditing = true;
	}
	if (forcedMode === 'create') {
		isEditing = false;
	}
	// name/symbol/decimals are carried over from the base file untouched, so they are neither shown
	// nor re-validated. That also keeps the tokens whose symbol or name predates the current rules
	// editable instead of permanently stuck.
	const metaLocked = isEditing && baseInfo !== null;

	// Fields that hold a value on disk and would be written away by this submission. An edit replaces
	// the whole file, so removing them is legitimate — but it has to be confirmed rather than happen as
	// a side effect of a collapsed accordion.
	const erasures = useMemo(() => {
		if (!isEditing || !baseInfo) {
			return [];
		}
		return ERASABLE_FIELDS.filter(field => {
			if (field === 'website') {
				return Boolean(baseInfo.website) && !website.trim();
			}
			if (field === 'description') {
				return Boolean(baseInfo.description) && !description.trim();
			}
			return Boolean(baseInfo.tags?.length) && parseTags(tagsRaw).length === 0;
		});
	}, [isEditing, baseInfo, website, description, tagsRaw]);

	const svgDataURL = useMemo(() => {
		if (!svgText) {
			return null;
		}
		return `data:image/svg+xml,${encodeURIComponent(svgText)}`;
	}, [svgText]);

	// Read the token's current metadata and logo as soon as the address resolves to something already on
	// the CDN, and fill the form with them: an edit rewrites the whole file, so the form has to start
	// from what is on disk or submitting would wipe every field the user did not retype. A 404 on
	// info.json is a normal answer (some folders have logos only); anything else must surface as an error,
	// because an empty form standing in for a failed read looks exactly like a deliberate erasure.
	// biome-ignore lint/correctness/useExhaustiveDependencies: prefillNonce is an intentional re-run trigger for the Retry button, not read inside the effect.
	useEffect(() => {
		// A mode forced by the route is authoritative and does not wait on the local list. Otherwise
		// "not in the list" only means something once the list has actually loaded — bailing out while it
		// is in flight is also what lets values restored from the sign-in stash survive the mount.
		if (forcedMode !== 'edit') {
			if (isTokenListLoading || hasTokenListError) {
				return;
			}
			if (!existingToken) {
				appliedPrefillKeyRef.current = '';
				setBaseInfo(null);
				setBaseSvgText('');
				setPrefillStatus('idle');
				setConfirmErasure(false);
				return;
			}
		}
		let cancelled = false;
		setPrefillStatus('loading');
		fetchTokenPrefill(chainID, address.trim())
			.then(prefill => {
				if (cancelled) {
					return;
				}
				setBaseInfo(prefill.info);
				setBaseSvgText(prefill.svgText);
				setPrefillStatus('ready');
				// Applied once per token: re-running on every render would fight the user's typing, and
				// the sign-in restore claims this key first so it is not overwritten either.
				const key = prefillKey(chainID, address);
				if (appliedPrefillKeyRef.current === key) {
					return;
				}
				appliedPrefillKeyRef.current = key;
				setWebsite(prefill.info?.website || '');
				setDescription(prefill.info?.description || '');
				setTagsRaw((prefill.info?.tags || []).join(', '));
				setSvgText(prefill.svgText);
				setSvgError('');
				setErrors([]);
				// Belongs to the token that was just left, not to this one: going straight from one
				// existing token to another would otherwise carry a ticked confirmation across.
				setConfirmErasure(false);
				let fileName = '';
				if (prefill.svgText) {
					fileName = 'Current logo';
				}
				setSvgFileName(fileName);
				// Description and tags sit behind a collapsed accordion; leaving it shut would hide the
				// very values this submission is about to rewrite.
				if (prefill.info?.description || prefill.info?.tags?.length) {
					setShowOptional(true);
				}
			})
			.catch(() => {
				if (cancelled) {
					return;
				}
				setPrefillStatus('error');
			});
		return () => {
			cancelled = true;
		};
	}, [existingToken, isTokenListLoading, hasTokenListError, forcedMode, chainID, address, prefillNonce]);

	// A forced mode belongs to one address on one chain. Editing either invalidates it, so the form goes
	// back to trusting the local token list.
	// biome-ignore lint/correctness/useExhaustiveDependencies: clearing on address/chain change is the point; forcedMode is written here, not read.
	useEffect(() => {
		setForcedMode(null);
	}, [chainID, address]);

	// Auto-read name/symbol/decimals whenever the address or chain changes. Debounced and race-safe:
	// a newer address/chain cancels the in-flight result so stale metadata never lands.
	// biome-ignore lint/correctness/useExhaustiveDependencies: retryNonce is an intentional re-run trigger for the Retry button, not read inside the effect.
	useEffect(() => {
		if (!isValidAddress(chainID, address)) {
			setName('');
			setSymbol('');
			setDecimals('');
			setMetaStatus('idle');
			return;
		}
		if (!canFetchOnchain(chainID)) {
			// No browser-reachable RPC for this chain: the metadata fields become manual inputs,
			// so leave whatever is typed (or stash-restored after the OAuth redirect) untouched.
			setMetaStatus('unsupported');
			return;
		}
		setName('');
		setSymbol('');
		setDecimals('');
		let cancelled = false;
		setMetaStatus('loading');
		const timer = setTimeout(() => {
			fetchOnchainToken(chainID, address.trim())
				.then(token => {
					if (cancelled) {
						return;
					}
					setName(token.name);
					setSymbol(token.symbol);
					setDecimals(String(token.decimals));
					setMetaStatus('ready');
				})
				.catch(() => {
					if (cancelled) {
						return;
					}
					setMetaStatus('error');
				});
		}, 500);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
		// retryNonce lets the Retry button re-run the fetch without changing the address/chain.
	}, [address, chainID, retryNonce]);

	// Paste a logo anywhere on the page (⌘/Ctrl+V): an SVG file or SVG markup text is accepted; a raster
	// image (e.g. from "Copy Image") is rejected with a hint, since the logo must be a vector SVG.
	useEffect(() => {
		const onPaste = (event: ClipboardEvent): void => {
			const data = event.clipboardData;
			if (!data) {
				return;
			}
			const items = Array.from(data.items);
			const files = Array.from(data.files);

			let svgFile: File | null = null;
			const svgItem = items.find(item => item.kind === 'file' && item.type === 'image/svg+xml');
			if (svgItem) {
				svgFile = svgItem.getAsFile();
			}
			if (!svgFile) {
				svgFile =
					files.find(file => file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) ||
					null;
			}
			if (svgFile) {
				event.preventDefault();
				const file = svgFile;
				void file.text().then(text => {
					setSvgText(text);
					setSvgFileName(file.name || 'pasted.svg');
					setSvgError('');
				});
				return;
			}

			const active = document.activeElement;
			const inField = active !== null && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
			const text = data.getData('text/plain');
			if (!inField && text.includes('<svg')) {
				event.preventDefault();
				setSvgText(text);
				setSvgFileName('pasted.svg');
				setSvgError('');
				return;
			}

			// Only treat a raster paste as a rejected logo drop when the user is NOT typing in a
			// field — otherwise pasting text into an input while the clipboard also carries an
			// image (common) would be swallowed and mislabelled as a bad logo.
			if (inField) {
				return;
			}
			const hasRaster =
				items.some(item => item.kind === 'file' && item.type.startsWith('image/')) ||
				files.some(file => file.type.startsWith('image/'));
			if (hasRaster) {
				event.preventDefault();
				setSvgError(
					'That is a raster image — the logo must be a vector SVG. Paste the SVG code, or upload an .svg file.'
				);
			}
		};
		document.addEventListener('paste', onPaste);
		return () => {
			document.removeEventListener('paste', onPaste);
		};
	}, []);

	// Restore the form after returning from the GitHub sign-in redirect (stashed just before signIn).
	useEffect(() => {
		const raw = sessionStorage.getItem(STASH_KEY);
		if (!raw) {
			return;
		}
		sessionStorage.removeItem(STASH_KEY);
		try {
			const stash = JSON.parse(raw) as Partial<TStash>;
			setChainID(stash.chainID || DEFAULT_CHAIN.id);
			setAddress(stash.address || '');
			setSvgText(stash.svgText || '');
			setSvgFileName(stash.svgFileName || '');
			setName(stash.name || '');
			setSymbol(stash.symbol || '');
			setDecimals(stash.decimals || '');
			setDescription(stash.description || '');
			setWebsite(stash.website || '');
			setTagsRaw(stash.tagsRaw || '');
			// Claim the prefill key for the token being restored. Without this the prefill resolves a
			// moment later on a fresh mount, finds an unclaimed ref, and overwrites everything the user
			// typed before being sent to GitHub — silently, and the submission then has nothing to change.
			if (stash.address) {
				appliedPrefillKeyRef.current = prefillKey(stash.chainID || DEFAULT_CHAIN.id, stash.address);
			}
		} catch {
			// ignore a corrupt stash
		}
	}, []);

	async function handleFile(file: File | undefined): Promise<void> {
		if (!file) {
			return;
		}
		// `accept` only filters the native picker dialog, not drag-and-drop — so re-check the type here,
		// matching the paste handler, to reject a non-SVG instead of setting garbage as the logo.
		const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
		if (!isSvg) {
			setSvgError('That is not an SVG — the logo must be a vector .svg file.');
			return;
		}
		const text = await file.text();
		setSvgText(text);
		setSvgFileName(file.name);
		setSvgError('');
	}

	function currentInput(): TSubmissionInput {
		return {chainID, address, svgText, name, symbol, decimals, description, website};
	}

	function stashForm(): void {
		// name/symbol/decimals are included for manual-entry chains (no RPC): on supported chains
		// the on-chain fetch simply overwrites them after the restore.
		sessionStorage.setItem(
			STASH_KEY,
			JSON.stringify({
				chainID,
				address,
				svgText,
				svgFileName,
				name,
				symbol,
				decimals,
				description,
				website,
				tagsRaw
			})
		);
	}

	async function handleSubmit(): Promise<void> {
		// An unchanged logo is never re-sent: rewriting an identical SVG would also re-rasterize both
		// PNGs, putting three no-op files in the diff. Compared on the trimmed form because that is what
		// the server writes, so a stored file differing only by trailing whitespace still counts as equal.
		let svgToSend = svgText;
		if (isEditing && svgText.trim() === baseSvgText.trim()) {
			svgToSend = '';
		}
		const input: TSubmissionInput = {...currentInput(), svgText: svgToSend};
		const scope: TValidationScope = {
			requireLogo: !isEditing,
			requireWebsite: !isEditing,
			requireMeta: !metaLocked
		};
		const validationErrors = [...validateSubmission(input, scope), ...validateTags(parseTags(tagsRaw))];
		setErrors(validationErrors);
		if (validationErrors.length > 0) {
			return;
		}
		if (!signedIn) {
			stashForm();
			void signIn('github', {callbackUrl: '/submit'});
			return;
		}
		setIsSubmitting(true);
		setSubmitError('');
		try {
			const response = await fetch('/api/submit', {
				method: 'POST',
				headers: {'content-type': 'application/json'},
				body: JSON.stringify({
					chainID,
					address: address.trim(),
					svg: svgToSend,
					name,
					symbol,
					decimals,
					description,
					website,
					tags: tagsRaw,
					// Absent for a new token, which keeps the add-only contract — and its 409 — intact.
					isEdit: isEditing
				})
			});
			const data = (await response.json()) as {error?: string; prUrl?: string};
			if (!response.ok) {
				// The route resolves existence against the live repo; the local token list is a snapshot.
				// When they disagree, switch the form to what the route says instead of leaving the user
				// on a status they cannot act on. The prefill then reloads for the new mode.
				if (response.status === 409 && !isEditing) {
					setForcedMode('edit');
					setSubmitError(
						'This token is already on the CDN — switched to editing it. Review and submit again.'
					);
					return;
				}
				if (response.status === 404 && isEditing) {
					setForcedMode('create');
					setSubmitError(
						'This token is not on the CDN yet — switched to adding it. Review and submit again.'
					);
					return;
				}
				setSubmitError(data.error || 'Submission failed — please try again.');
				return;
			}
			setPrURL(data.prUrl || null);
			resetForm();
		} catch {
			setSubmitError('Network error — please try again.');
		} finally {
			setIsSubmitting(false);
		}
	}

	// chainID is intentionally kept: submitting several tokens on the same chain in a row is the
	// common case, so the selector stays on whatever was picked for the previous submission.
	function resetForm(): void {
		setAddress('');
		setSvgText('');
		setSvgFileName('');
		setSvgError('');
		setName('');
		setSymbol('');
		setDecimals('');
		setDescription('');
		setWebsite('');
		setTagsRaw('');
		setMetaStatus('idle');
		setShowOptional(false);
		setErrors([]);
		setSubmitError('');
		setBaseInfo(null);
		setBaseSvgText('');
		setPrefillStatus('idle');
		setConfirmErasure(false);
		setForcedMode(null);
	}

	// name/symbol/decimals must pass the same checks the submission does, whether they were typed
	// (RPC-less chains) or read on-chain — a contract can return a name >60 chars or a symbol with
	// spaces, which would otherwise fail validation against fields that were never shown.
	const metaFieldsValid = validateTokenMeta(name, symbol, decimals).length === 0;
	// Show the editable metadata fields when the chain has no RPC, OR when an on-chain read
	// succeeded but returned values that don't pass validation (pre-filled, so the user can fix).
	// Never in an edit that has a base file to carry those three fields over from.
	const showManualFields =
		!metaLocked && (metaStatus === 'unsupported' || (metaStatus === 'ready' && !metaFieldsValid));
	const metaReady = metaLocked || ((metaStatus === 'ready' || metaStatus === 'unsupported') && metaFieldsValid);
	const needsErasureConfirm = erasures.length > 0 && !confirmErasure;

	// The submit button is the single status surface (fixed size → no layout shift):
	// disabled until everything is present, a spinner while reading the chain or opening the PR.
	// An edit needs no project link (the vast majority of tokens on disk have none) but does need the
	// logo the prefill loaded, so that submitting never blanks it.
	let canSubmit = metaReady && svgText.length > 0 && website.trim().length > 0;
	if (isEditing) {
		canSubmit = metaReady && prefillStatus === 'ready' && !needsErasureConfirm && svgText.length > 0;
	}
	// Without the list there is no way to tell an addition from an edit, and guessing "addition" would
	// send the user into a 409 with nothing to act on. `hasError` is sticky per chain, so a reload is the
	// way out — say so rather than failing at submit time.
	if (hasTokenListError && forcedMode === null) {
		canSubmit = false;
	}
	const isBusy = isSubmitting || metaStatus === 'loading';

	let submitContent: ReactNode = 'Open pull request →';
	if (isBusy) {
		submitContent = (
			<span className={'size-4 animate-spin rounded-full border-2 border-primary border-t-transparent'}>
				<span className={'sr-only'}>{isSubmitting ? 'Submitting…' : 'Reading token metadata…'}</span>
			</span>
		);
	} else if (hasTokenListError && forcedMode === null) {
		submitContent = 'Token list unavailable — reload';
	} else if (isEditing && prefillStatus === 'error') {
		submitContent = 'Could not read this token';
	} else if (isEditing && prefillStatus !== 'ready') {
		submitContent = 'Reading current details…';
	} else if (isEditing && needsErasureConfirm) {
		submitContent = 'Confirm the removal';
	} else if (isEditing && !svgText) {
		submitContent = 'Add a logo';
	} else if (isEditing && !signedIn) {
		submitContent = 'Sign in with GitHub →';
	} else if (isEditing) {
		submitContent = 'Update this token →';
	} else if (metaStatus === 'error') {
		submitContent = 'Token not readable';
	} else if (showManualFields && !metaFieldsValid) {
		submitContent = 'Fill in the token details';
	} else if (metaReady && !svgText) {
		submitContent = 'Add a logo';
	} else if (metaReady && !website.trim()) {
		submitContent = 'Add a project link';
	} else if (!signedIn) {
		submitContent = 'Sign in with GitHub →';
	}

	return (
		<>
			<div
				className={
					'min-w-0 space-y-4 rounded-sm border border-white/15 bg-white/[0.04] p-5 md:p-6 lg:col-span-6'
				}>
				<Field
					label={'Chain'}
					htmlFor={'submit-chain'}>
					<ChainSelector
						id={'submit-chain'}
						value={chainID}
						onChange={setChainID}
						onAddNetwork={networkID => router.push(`/submit/network/${networkID}`)}
						fullWidth
					/>
				</Field>

				<Field
					label={'Contract address'}
					htmlFor={'submit-address'}>
					<Input
						id={'submit-address'}
						value={address}
						onChange={event => setAddress(event.target.value)}
						placeholder={'0x…'}
						spellCheck={false}
						className={inputClassName}
					/>
				</Field>

				{isEditing && (
					<div className={'space-y-1.5 rounded-sm border border-white/20 bg-white/5 p-4'}>
						<p className={'font-mono text-white/70 text-xs leading-relaxed'}>
							{'This token is already on the CDN, you are editing it.'}
						</p>
						{prefillStatus === 'loading' && (
							<p className={'font-mono text-white/40 text-xxs'}>{'Reading its current details…'}</p>
						)}
						{prefillStatus === 'error' && (
							<div
								role={'alert'}
								className={'flex items-center justify-between gap-2'}>
								<p className={'font-mono text-error text-xxs leading-relaxed'}>
									{'Could not read its current details — editing is disabled until it loads.'}
								</p>
								<button
									type={'button'}
									onClick={() => setPrefillNonce(nonce => nonce + 1)}
									className={
										'shrink-0 font-mono text-white/70 text-xxs underline underline-offset-4 hover:text-white'
									}>
									{'Retry'}
								</button>
							</div>
						)}
					</div>
				)}

				{metaStatus === 'error' && !metaLocked && (
					<div
						className={
							'flex items-center justify-between gap-2 rounded-sm border border-error/40 bg-error/10 p-3'
						}>
						<p className={'font-mono text-error text-xs'}>
							{'Could not read this token on-chain (the RPC may be busy).'}
						</p>
						<button
							type={'button'}
							onClick={() => setRetryNonce(nonce => nonce + 1)}
							className={
								'shrink-0 rounded-sm border border-white/25 px-2 py-1 font-mono text-white text-xxs uppercase tracking-[0.1em] transition-colors hover:bg-white/10'
							}>
							{'Retry'}
						</button>
					</div>
				)}

				{showManualFields && (
					<div className={'space-y-4'}>
						<p className={'font-mono text-white/50 text-xxs leading-relaxed'}>
							{metaStatus === 'unsupported'
								? 'This chain has no public RPC we can read from — fill in the token metadata manually.'
								: 'The on-chain metadata needs a fix — adjust the token details below.'}
						</p>
						<div className={'grid grid-cols-2 gap-4'}>
							<Field
								label={'Name'}
								htmlFor={'submit-name'}>
								<Input
									id={'submit-name'}
									value={name}
									onChange={event => setName(event.target.value)}
									placeholder={'Token name'}
									className={inputClassName}
								/>
							</Field>
							<Field
								label={'Symbol'}
								htmlFor={'submit-symbol'}>
								<Input
									id={'submit-symbol'}
									value={symbol}
									onChange={event => setSymbol(event.target.value)}
									placeholder={'TKN'}
									className={inputClassName}
								/>
							</Field>
						</div>
						<Field
							label={'Decimals'}
							htmlFor={'submit-decimals'}>
							<Input
								id={'submit-decimals'}
								value={decimals}
								onChange={event => setDecimals(event.target.value)}
								placeholder={'18'}
								inputMode={'numeric'}
								className={inputClassName}
							/>
						</Field>
					</div>
				)}

				<Field label={'Logo (SVG)'}>
					<div className={'space-y-2'}>
						<label
							onDragOver={event => event.preventDefault()}
							onDrop={event => {
								event.preventDefault();
								handleFile(event.dataTransfer.files?.[0]);
							}}
							className={cn(
								'flex h-24 cursor-pointer items-center justify-center gap-3 rounded-sm',
								'border border-white/20 border-dashed bg-white/5 transition-colors hover:border-white/40'
							)}>
							{svgDataURL && (
								// biome-ignore lint/performance/noImgElement: local data-URI preview of the uploaded SVG; next/image can't optimize a data URL.
								<img
									src={svgDataURL}
									alt={`${svgFileName} preview`}
									className={'size-12 shrink-0 rounded-full bg-white object-contain p-1.5'}
								/>
							)}
							<div className={'flex flex-col items-center gap-1'}>
								<span className={'font-mono text-white text-xs'}>
									{svgFileName || 'Drop, paste, or click to browse'}
								</span>
								<span className={'font-mono text-white/40 text-xxs uppercase tracking-[0.1em]'}>
									{svgDataURL ? 'Click to replace' : 'SVG only'}
								</span>
							</div>
							<input
								type={'file'}
								accept={'.svg,image/svg+xml'}
								onChange={event => handleFile(event.target.files?.[0])}
								className={'sr-only'}
							/>
						</label>
						{svgError && <p className={'font-mono text-error text-xs'}>{svgError}</p>}
					</div>
				</Field>

				<Field
					label={'Project link'}
					htmlFor={'submit-website'}
					hint={'Link to the project site or docs that reference this token.'}>
					<Input
						id={'submit-website'}
						value={website}
						onChange={event => setWebsite(event.target.value)}
						placeholder={'https://…'}
						spellCheck={false}
						className={inputClassName}
					/>
				</Field>

				<div className={'space-y-4'}>
					<button
						type={'button'}
						onClick={() => setShowOptional(value => !value)}
						className={cn(
							'flex w-full items-center justify-between rounded-sm px-4 py-3',
							'border border-white/15 transition-colors hover:border-white/30'
						)}>
						<span className={'font-medium font-mono text-white/50 text-xs uppercase tracking-[0.1em]'}>
							{'Optional details'}
						</span>
						<ArrowDown
							className={cn('size-4 text-white/50 transition-transform', showOptional && 'rotate-180')}
						/>
					</button>

					{showOptional && (
						<div className={'space-y-5'}>
							<Field
								label={'Description'}
								htmlFor={'submit-description'}>
								<textarea
									id={'submit-description'}
									value={description}
									onChange={event => setDescription(event.target.value)}
									rows={3}
									placeholder={'A short description of the token.'}
									className={cn(
										'w-full rounded-sm px-3 py-2 font-mono text-sm outline-none placeholder:text-white/30',
										inputClassName
									)}
								/>
							</Field>
							<Field
								label={'Tags'}
								htmlFor={'submit-tags'}
								hint={'Comma-separated'}>
								<Input
									id={'submit-tags'}
									value={tagsRaw}
									onChange={event => setTagsRaw(event.target.value)}
									placeholder={'stablecoin, defi'}
									className={inputClassName}
								/>
							</Field>
						</div>
					)}
				</div>

				{erasures.length > 0 && (
					<div className={'space-y-2 rounded-sm border border-white/25 bg-white/5 p-3'}>
						<p className={'font-mono text-white/70 text-xs leading-relaxed'}>
							{`This submission removes ${erasures.join(', ')} from the token.`}
						</p>
						<label className={'flex cursor-pointer items-center gap-2'}>
							<input
								type={'checkbox'}
								checked={confirmErasure}
								onChange={() => setConfirmErasure(value => !value)}
								className={'size-3.5 rounded-sm border-white/30 bg-white/5 text-white'}
							/>
							<span className={'font-mono text-white/50 text-xxs uppercase tracking-[0.1em]'}>
								{'Remove them'}
							</span>
						</label>
					</div>
				)}

				{errors.length > 0 && (
					<div
						role={'alert'}
						className={'space-y-1 rounded-sm border border-error/40 bg-error/10 p-3'}>
						{errors.map(error => (
							<p
								key={`${error.field}-${error.message}`}
								className={'font-mono text-error text-xs'}>
								{`• ${error.message}`}
							</p>
						))}
					</div>
				)}

				{submitError && (
					<p
						role={'alert'}
						className={'font-mono text-error text-xs'}>
						{submitError}
					</p>
				)}

				<Button
					type={'button'}
					variant={'primary'}
					size={'lg'}
					disabled={!canSubmit || isBusy}
					onClick={handleSubmit}
					className={'w-full'}>
					{submitContent}
				</Button>
			</div>

			<SubmitResult
				prURL={prURL}
				onClose={() => setPrURL(null)}
			/>
		</>
	);
}
