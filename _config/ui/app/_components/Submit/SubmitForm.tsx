'use client';

import {ChainLogo} from '@components/ChainLogo';
import {SubmitResult} from '@components/Submit/SubmitResult';
import {cn} from '@components/lib/utils';
import {Button} from '@components/ui/button';
import {Input} from '@components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@components/ui/select';
import {useTokens} from '@hooks/useTokens';
import ArrowDown from '@icons/arrow-down.svg';
import {CHAINS, DEFAULT_CHAIN} from '@utils/constants';
import {canFetchOnchain, fetchOnchainToken} from '@utils/onchainToken';
import {type TSubmissionInput, type TValidationError, isValidAddress, validateSubmission} from '@utils/tokenSubmission';
import {signIn} from 'next-auth/react';
import {useEffect, useMemo, useState} from 'react';

import type {ReactElement, ReactNode} from 'react';

type TMetaStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

const inputClassName = 'border border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-white/40';
const STASH_KEY = 'token-submit-stash';

function Field({label, hint, children}: {label: string; hint?: string; children: ReactNode}): ReactElement {
	return (
		<div className={'space-y-1.5'}>
			<span className={'block font-medium font-mono text-white/50 text-xs uppercase tracking-[0.1em]'}>
				{label}
			</span>
			{children}
			{hint && <span className={'block font-mono text-white/35 text-xxs leading-relaxed'}>{hint}</span>}
		</div>
	);
}

export function SubmitForm({signedIn}: {signedIn: boolean}): ReactElement {
	const [chainID, setChainID] = useState(DEFAULT_CHAIN.id);
	const [address, setAddress] = useState('');
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
	const [showOptional, setShowOptional] = useState(false);
	const [errors, setErrors] = useState<TValidationError[]>([]);
	const [submitError, setSubmitError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [prURL, setPrURL] = useState<string | null>(null);

	const selectedChain = useMemo(() => {
		return CHAINS.find(chain => chain.id === chainID) || DEFAULT_CHAIN;
	}, [chainID]);

	// Cross-checked against the same per-chain token list the browse pages use, so a submission
	// for an address already in the CDN is caught before the user fills out the rest of the form.
	const {findToken} = useTokens(chainID);
	const existingToken = useMemo(() => {
		if (!isValidAddress(chainID, address)) {
			return undefined;
		}
		return findToken(address.trim());
	}, [findToken, chainID, address]);

	const svgDataURL = useMemo(() => {
		if (!svgText) {
			return null;
		}
		return `data:image/svg+xml,${encodeURIComponent(svgText)}`;
	}, [svgText]);

	// Auto-read name/symbol/decimals whenever the address or chain changes. Debounced and race-safe:
	// a newer address/chain cancels the in-flight result so stale metadata never lands.
	useEffect(() => {
		setName('');
		setSymbol('');
		setDecimals('');
		if (!isValidAddress(chainID, address)) {
			setMetaStatus('idle');
			return;
		}
		if (!canFetchOnchain(chainID)) {
			setMetaStatus('unsupported');
			return;
		}
		let cancelled = false;
		setMetaStatus('loading');
		const timer = setTimeout(() => {
			fetchOnchainToken(chainID, address)
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
	}, [address, chainID]);

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
			const stash = JSON.parse(raw) as Record<string, string>;
			setChainID(stash.chainID || DEFAULT_CHAIN.id);
			setAddress(stash.address || '');
			setSvgText(stash.svgText || '');
			setSvgFileName(stash.svgFileName || '');
			setDescription(stash.description || '');
			setWebsite(stash.website || '');
			setTagsRaw(stash.tagsRaw || '');
		} catch {
			// ignore a corrupt stash
		}
	}, []);

	function handleChainChange(value: string): void {
		setChainID(value);
	}

	async function handleFile(file: File | undefined): Promise<void> {
		if (!file) {
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
		sessionStorage.setItem(
			STASH_KEY,
			JSON.stringify({chainID, address, svgText, svgFileName, description, website, tagsRaw})
		);
	}

	async function handleSubmit(): Promise<void> {
		const validationErrors = validateSubmission(currentInput());
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
					address,
					svg: svgText,
					name,
					symbol,
					decimals,
					description,
					website,
					tags: tagsRaw
				})
			});
			const data = (await response.json()) as {error?: string; prUrl?: string};
			if (!response.ok) {
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

	function resetForm(): void {
		setChainID(DEFAULT_CHAIN.id);
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
	}

	// The submit button is the single status surface (fixed size → no layout shift):
	// disabled until everything is present, a spinner while reading the chain or opening the PR.
	const canSubmit = metaStatus === 'ready' && !existingToken && svgText.length > 0 && website.trim().length > 0;
	const isBusy = isSubmitting || metaStatus === 'loading';

	let submitContent: ReactNode = 'Open pull request →';
	if (isBusy) {
		submitContent = (
			<span className={'size-4 animate-spin rounded-full border-2 border-primary border-t-transparent'} />
		);
	} else if (metaStatus === 'error') {
		submitContent = 'Token not readable';
	} else if (metaStatus === 'unsupported') {
		submitContent = 'Chain not supported';
	} else if (metaStatus === 'ready' && existingToken) {
		submitContent = 'Token already exists';
	} else if (metaStatus === 'ready' && !svgText) {
		submitContent = 'Add a logo';
	} else if (metaStatus === 'ready' && !website.trim()) {
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
				<Field label={'Chain'}>
					<Select value={chainID} onValueChange={handleChainChange}>
						<SelectTrigger className={cn('h-10 rounded-sm text-white', inputClassName)}>
							<SelectValue>
								<span className={'flex items-center gap-2'}>
									<ChainLogo id={selectedChain.id} />
									<span className={'font-mono text-sm'}>{selectedChain.name}</span>
								</span>
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{CHAINS.map(chain => (
								<SelectItem key={chain.id} value={chain.id}>
									<span className={'flex items-center gap-2'}>
										<ChainLogo id={chain.id} />
										{chain.name}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field label={'Contract address'}>
					<Input
						value={address}
						onChange={event => setAddress(event.target.value)}
						placeholder={'0x…'}
						spellCheck={false}
						className={inputClassName}
					/>
				</Field>

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
								className={'hidden'}
							/>
						</label>
						{svgError && <p className={'font-mono text-error text-xs'}>{svgError}</p>}
					</div>
				</Field>

				<Field
					label={'Project link'}
					hint={'Link to the project site or docs that reference this token.'}>
					<Input
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
							<Field label={'Description'}>
								<textarea
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
							<Field label={'Tags'} hint={'Comma-separated'}>
								<Input
									value={tagsRaw}
									onChange={event => setTagsRaw(event.target.value)}
									placeholder={'stablecoin, defi'}
									className={inputClassName}
								/>
							</Field>
						</div>
					)}
				</div>

				{errors.length > 0 && (
					<div className={'space-y-1 rounded-sm border border-error/40 bg-error/10 p-3'}>
						{errors.map(error => (
							<p key={`${error.field}-${error.message}`} className={'font-mono text-error text-xs'}>
								{`• ${error.message}`}
							</p>
						))}
					</div>
				)}

				{submitError && <p className={'font-mono text-error text-xs'}>{submitError}</p>}

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

			<SubmitResult prURL={prURL} onClose={() => setPrURL(null)} />
		</>
	);
}
